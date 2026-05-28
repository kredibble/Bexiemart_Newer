import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private generateOrderNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BEX-${ts}-${rand}`;
  }

  async create(userId: string, dto: CreateOrderDto) {
    let cartItems: any[] = [];
    let cart: any = null;

    if (dto.items && dto.items.length > 0) {
      cartItems = dto.items;
    } else {
      cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException("Cart is empty");
      }
      cartItems = cart.items;
    }

    for (const item of cartItems) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      if (!product.isActive || product.isDeleted) {
        throw new BadRequestException(`Product "${product.name}" is no longer available`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${product.name}"`);
      }
    }

    const subtotal = cartItems.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0,
    );
    const shippingFee = subtotal >= 5000 ? 0 : 500;
    const tax = Math.round(subtotal * 0.075 * 100) / 100;
    const total = subtotal + shippingFee + tax;
    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const shippingAddr = await tx.shippingAddress.create({
        data: {
          userId,
          ...dto.shippingAddress,
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          shippingFee,
          tax,
          total,
          shippingAddressId: shippingAddr.id,
          items: {
            create: cartItems.map((item: any) => ({
              productId: item.productId,
              productName: item.productName ?? "",
              productSlug: item.productSlug ?? "",
              price: item.price,
              quantity: item.quantity,
              total: Number(item.price) * item.quantity,
              imageUrl: item.imageUrl,
            })),
          },
        },
        include: { items: true, shippingAddress: true },
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (!dto.items && cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return order;
    });

    return order;
  }

  async findAll(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          items: true,
          shippingAddress: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where: { userId } })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: { include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } } },
        shippingAddress: true,
        payment: true,
      },
    });

    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
}
