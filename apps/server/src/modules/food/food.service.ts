import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FoodService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurants(category?: string, page: number = 1, limit: number = 20) {
    const where: any = {
      foodItems: { some: { isActive: true, isAvailable: true } },
    };

    if (category) {
      where.foodItems = {
        some: { isActive: true, isAvailable: true, category },
      };
    }

    const skip = (page - 1) * limit;

    const [vendors, total] = await Promise.all([
      this.prisma.vendorProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { foodItems: { where: { isActive: true, isAvailable: true } } } },
          foodItems: {
            where: { isActive: true, isAvailable: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      }),
      this.prisma.vendorProfile.count({ where })
    ]);

    const data = vendors.map((v) => ({
      id: v.id,
      shopName: v.shopName,
      slug: v.slug,
      logo: v.logo,
      description: v.description,
      city: v.city,
      state: v.state,
      rating: 0,
      foodCount: v._count.foodItems,
      minPrice: v.foodItems[0] ? Number(v.foodItems[0].price) : null,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRestaurant(id: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        foodItems: {
          where: { isActive: true, isAvailable: true },
          orderBy: { category: "asc" },
        },
        hours: true,
      },
    });

    if (!vendor) throw new NotFoundException("Restaurant not found");

    const grouped: any = {};
    for (const item of vendor.foodItems) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        prepTime: item.prepTime,
        category: item.category,
      });
    }

    return {
      id: vendor.id,
      shopName: vendor.shopName,
      slug: vendor.slug,
      logo: vendor.logo,
      banner: vendor.banner,
      description: vendor.description,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      hours: vendor.hours,
      categories: Object.keys(grouped),
      menu: grouped,
    };
  }

  async getFoodItems(category?: string, search?: string, page: number = 1, limit: number = 20) {
    const where: any = { isActive: true, isAvailable: true };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.foodItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: {
            select: { id: true, shopName: true, slug: true, logo: true, city: true },
          },
        },
        orderBy: { category: "asc" },
      }),
      this.prisma.foodItem.count({ where })
    ]);

    const data = items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      category: item.category,
      prepTime: item.prepTime,
      vendor: item.vendor,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async addToCart(userId: string, foodItemId: string, quantity: number, specialInstructions?: string) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id: foodItemId, isActive: true, isAvailable: true },
      include: { vendor: true },
    });

    if (!foodItem) throw new NotFoundException("Food item not found");

    let cart = await this.prisma.foodCart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (cart) {
      if (cart.vendorId !== foodItem.vendorId) {
        await this.prisma.foodCartItem.deleteMany({ where: { cartId: cart.id } });
        await this.prisma.foodCart.update({
          where: { id: cart.id },
          data: { vendorId: foodItem.vendorId },
        });
      }
    } else {
      cart = await this.prisma.foodCart.create({
        data: { userId, vendorId: foodItem.vendorId },
        include: { items: true },
      });
    }

    const existing = cart.items.find((i) => i.foodItemId === foodItemId);

    if (existing) {
      await this.prisma.foodCartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity, price: foodItem.price, specialInstructions },
      });
    } else {
      await this.prisma.foodCartItem.create({
        data: {
          cartId: cart.id,
          foodItemId,
          name: foodItem.name,
          price: foodItem.price,
          quantity,
          specialInstructions,
        },
      });
    }

    return this.getCart(userId);
  }

  async getCart(userId: string) {
    const cart = await this.prisma.foodCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { foodItem: { select: { imageUrl: true, prepTime: true } } },
        },
        vendor: { select: { id: true, shopName: true, logo: true } },
      },
    });

    if (!cart) {
      return { items: [], itemCount: 0, subtotal: 0 };
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      foodItemId: item.foodItemId,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      specialInstructions: item.specialInstructions,
      imageUrl: item.foodItem?.imageUrl ?? null,
      prepTime: item.foodItem?.prepTime ?? 0,
    }));

    return {
      vendor: cart.vendor,
      items,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
    };
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.prisma.foodCart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart) throw new NotFoundException("Cart not found");

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Cart item not found");

    if (quantity < 1) {
      await this.prisma.foodCartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.foodCartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    return this.getCart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    const cart = await this.prisma.foodCart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart) throw new NotFoundException("Cart not found");

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("Cart item not found");

    await this.prisma.foodCartItem.delete({ where: { id: itemId } });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.foodCart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException("Cart not found");

    await this.prisma.foodCartItem.deleteMany({ where: { cartId: cart.id } });

    return { success: true };
  }

  async checkout(userId: string) {
    const cart = await this.prisma.foodCart.findUnique({
      where: { userId },
      include: { items: true, vendor: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const subtotal = cart.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    const deliveryFee = 0;
    const total = subtotal + deliveryFee;
    const orderNumber = `FOOD-${Date.now()}-${Math.floor(Math.random() * 900) + 100}`;

    const order = await this.prisma.foodOrder.create({
      data: {
        orderNumber,
        userId,
        vendorId: cart.vendorId,
        status: "PENDING",
        subtotal,
        deliveryFee,
        total,
        items: {
          create: cart.items.map((item) => ({
            foodItemId: item.foodItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: Number(item.price) * item.quantity,
          })),
        },
      },
      include: { items: true, vendor: { select: { id: true, shopName: true, logo: true } } },
    });

    await this.prisma.foodCartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }

  async getOrders(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.foodOrder.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          items: true,
          vendor: { select: { id: true, shopName: true, logo: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.foodOrder.count({ where: { userId } })
    ]);

    const data = orders.map((o) => ({
      ...o,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.deliveryFee),
      total: Number(o.total),
      items: o.items.map((i) => ({
        ...i,
        price: Number(i.price),
        total: Number(i.total),
      })),
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.foodOrder.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        vendor: {
          select: { id: true, shopName: true, slug: true, logo: true, phone: true, address: true, city: true, state: true },
        },
      },
    });

    if (!order) throw new NotFoundException("Order not found");

    return {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((i) => ({
        ...i,
        price: Number(i.price),
        total: Number(i.total),
      })),
    };
  }
}
