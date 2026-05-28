import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OnboardVendorDto } from "./dto/onboard-vendor.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVendorProfile(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Vendor profile not found");
    return profile;
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    if (!profile) throw new NotFoundException("Vendor profile not found");
    return profile;
  }

  async onboard(userId: string, data: OnboardVendorDto) {
    const existing = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException("Vendor profile not found. Please register as a vendor first.");

    const slugExists = await this.prisma.vendorProfile.findUnique({ where: { slug: data.slug } });
    if (slugExists && slugExists.userId !== userId) throw new Error("Shop URL is already taken");

    return this.prisma.vendorProfile.update({
      where: { userId },
      data: { shopName: data.shopName, slug: data.slug, description: data.description, logo: data.logo, banner: data.banner, address: data.address, city: data.city, state: data.state, phone: data.phone },
    });
  }

  async getStats(userId: string) {
    const profile = await this.getVendorProfile(userId);

    const [totalProducts, orders] = await Promise.all([
      this.prisma.product.count({ where: { vendorId: profile.id, isDeleted: false } }),
      this.prisma.orderItem.findMany({
        where: { product: { vendorId: profile.id } },
        select: { orderId: true, order: { select: { status: true, userId: true } } },
      }),
    ]);

    const totalOrders = new Set(orders.map((o) => o.orderId)).size;
    const pendingOrders = orders.filter((o) => o.order.status === "pending").length;
    const totalCustomers = new Set(orders.map((o) => o.order.userId).filter(Boolean)).size;

    return {
      totalProducts,
      totalOrders,
      totalEarnings: Number(profile.totalEarnings),
      pendingOrders,
      totalCustomers,
    };
  }

  async getProducts(userId: string, page: number = 1, limit: number = 20) {
    const profile = await this.getVendorProfile(userId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { vendorId: profile.id, isDeleted: false },
        skip,
        take: limit,
        include: {
          images: { orderBy: { order: "asc" } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where: { vendorId: profile.id, isDeleted: false } })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createProduct(userId: string, data: CreateProductDto) {
    const profile = await this.getVendorProfile(userId);

    let categoryId = data.categoryId;
    if (!categoryId && data.category) {
      let category = await this.prisma.category.findFirst({
        where: { name: { equals: data.category, mode: "insensitive" } },
      });
      if (!category) {
        category = await this.prisma.category.create({
          data: {
            name: data.category,
            slug: data.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
        });
      }
      categoryId = category.id;
    }

    if (!categoryId) {
      throw new Error("Category is required");
    }

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();

    return this.prisma.product.create({
      data: {
        name: data.name,
        slug: slug,
        description: data.description,
        price: data.price,
        stock: data.stock ?? 0,
        categoryId: categoryId,
        vendorId: profile.id,
        images: data.images ? { create: data.images } : undefined,
      },
      include: { images: { orderBy: { order: "asc" } } },
    });
  }

  async updateProduct(userId: string, id: string, data: UpdateProductDto) {
    const profile = await this.getVendorProfile(userId);

    const product = await this.prisma.product.findFirst({
      where: { id, vendorId: profile.id, isDeleted: false },
    });
    if (!product) throw new NotFoundException("Product not found");

    let categoryId = data.categoryId;
    if (!categoryId && data.category) {
      let category = await this.prisma.category.findFirst({
        where: { name: { equals: data.category, mode: "insensitive" } },
      });
      if (!category) {
        category = await this.prisma.category.create({
          data: {
            name: data.category,
            slug: data.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
        });
      }
      categoryId = category.id;
    }

    const { category, images, ...rest } = data as any;
    const updateData: any = { ...rest };
    delete updateData.categoryId; // remove to use connect instead
    if (categoryId) updateData.category = { connect: { id: categoryId } };

    return this.prisma.product.update({ where: { id }, data: updateData });
  }

  async deleteProduct(userId: string, id: string) {
    const profile = await this.getVendorProfile(userId);

    const product = await this.prisma.product.findFirst({
      where: { id, vendorId: profile.id, isDeleted: false },
    });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.product.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });

    return { success: true };
  }

  async getOrders(userId: string, page: number = 1, limit: number = 20) {
    const profile = await this.getVendorProfile(userId);

    // To paginate correctly by orders, we need to find distinct orders first
    const skip = (page - 1) * limit;
    
    // Get unique order IDs for this vendor
    const distinctOrderItems = await this.prisma.orderItem.findMany({
      where: { product: { vendorId: profile.id } },
      select: { orderId: true },
      distinct: ['orderId'],
      orderBy: { order: { createdAt: "desc" } },
      skip,
      take: limit,
    });
    
    const totalOrderItems = await this.prisma.orderItem.findMany({
      where: { product: { vendorId: profile.id } },
      select: { orderId: true },
      distinct: ['orderId'],
    });
    const total = totalOrderItems.length;

    const orderIds = distinctOrderItems.map(oi => oi.orderId);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId: { in: orderIds }, product: { vendorId: profile.id } },
      include: {
        order: {
          include: {
            shippingAddress: true,
            items: {
              where: { product: { vendorId: profile.id } },
            },
          },
        },
        product: { select: { id: true, name: true, images: { take: 1, orderBy: { order: "asc" } } } },
      },
      orderBy: { order: { createdAt: "desc" } },
    });

    const orderMap = new Map<string, Record<string, any>>();
    for (const oi of orderItems) {
      if (!orderMap.has(oi.orderId)) {
        orderMap.set(oi.orderId, {
          id: oi.order.id,
          orderNumber: oi.order.orderNumber,
          status: oi.order.status,
          total: oi.order.total,
          createdAt: oi.order.createdAt,
          shippingAddress: oi.order.shippingAddress,
          items: [],
        });
      }
      orderMap.get(oi.orderId)!.items.push({
        id: oi.id,
        productId: oi.productId,
        productName: oi.productName,
        quantity: oi.quantity,
        price: oi.price,
        total: oi.total,
        imageUrl: oi.product?.images?.[0]?.url ?? oi.imageUrl,
      });
    }

    const data = Array.from(orderMap.values());
    // Since orderItems has an implicit sort, maintain order based on distinctOrderItems
    const sortedData = distinctOrderItems.map(doi => data.find(d => d.id === doi.orderId)).filter(Boolean);

    return { data: sortedData, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrder(userId: string, id: string) {
    const profile = await this.getVendorProfile(userId);

    const order = await this.prisma.order.findFirst({
      where: { id, items: { some: { product: { vendorId: profile.id } } } },
      include: {
        items: {
          where: { product: { vendorId: profile.id } },
          include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } },
        },
        shippingAddress: true,
      },
    });

    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async updateOrderStatus(userId: string, id: string, status: string) {
    const profile = await this.getVendorProfile(userId);

    const order = await this.prisma.order.findFirst({
      where: { id, items: { some: { product: { vendorId: profile.id } } } },
    });
    if (!order) throw new NotFoundException("Order not found");

    return this.prisma.order.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getEarnings(userId: string) {
    const profile = await this.getVendorProfile(userId);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    const transactions = await this.prisma.transaction.findMany({
      where: {
        wallet: { user: { vendorProfile: { id: profile.id } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    thisWeek.setHours(0, 0, 0, 0);

    const todayRevenue = transactions
      .filter((t) => t.type === "EARNINGS" && t.createdAt >= today)
      .reduce((s, t) => s + Number(t.amount), 0);

    const thisWeekRevenue = transactions
      .filter((t) => t.type === "EARNINGS" && t.createdAt >= thisWeek)
      .reduce((s, t) => s + Number(t.amount), 0);

    const formattedTransactions = transactions.map((t) => ({
      id: t.reference || t.id,
      type: t.type === "WITHDRAWAL" ? "withdrawal" : "order",
      title: t.description || (t.type === "WITHDRAWAL" ? "Bank Transfer" : "Order Payment"),
      date: t.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      amount: t.type === "WITHDRAWAL" ? -Number(t.amount) : Number(t.amount),
      status: t.status.toLowerCase(),
    }));

    return {
      availableBalance: wallet ? Number(wallet.balance) : 0,
      pendingClearance: Number(profile.pendingPayout),
      todayRevenue,
      thisWeekRevenue,
      recentTransactions: formattedTransactions.slice(0, 10),
    };
  }

  async getTransactions(userId: string) {
    const profile = await this.getVendorProfile(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        wallet: { user: { vendorProfile: { id: profile.id } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return transactions.map((t) => ({
      id: t.reference || t.id,
      type: t.type === "WITHDRAWAL" ? "withdrawal" : "order",
      title: t.description || (t.type === "WITHDRAWAL" ? "Bank Transfer" : "Order Payment"),
      date: t.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      amount: t.type === "WITHDRAWAL" ? -Number(t.amount) : Number(t.amount),
      status: t.status.toLowerCase(),
    }));
  }

  async getAnalytics(userId: string) {
    const profile = await this.getVendorProfile(userId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentTransactions, topProducts, recentOrderItems] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          wallet: { user: { vendorProfile: { id: profile.id } } },
          type: "EARNINGS",
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { vendorId: profile.id }, order: { createdAt: { gte: thirtyDaysAgo } } },
        include: { product: { select: { id: true, name: true, price: true, images: { take: 1, orderBy: { order: "asc" } } } } },
      }),
      this.prisma.orderItem.findMany({
        where: { product: { vendorId: profile.id }, order: { createdAt: { gte: thirtyDaysAgo } } },
        select: { orderId: true },
      }),
    ]);

    const totalOrdersRecent = new Set(recentOrderItems.map((i) => i.orderId)).size;

    const revenue30Days = recentTransactions.reduce((s, t) => s + Number(t.amount), 0);

    const productSales = new Map<string, { id: string; name: string; imageUrl: string | null; sales: number; revenue: number }>();
    for (const oi of topProducts) {
      if (!productSales.has(oi.productId)) {
        productSales.set(oi.productId, { id: oi.productId, name: oi.productName, imageUrl: oi.product?.images?.[0]?.url ?? null, sales: 0, revenue: 0 });
      }
      const p = productSales.get(oi.productId)!;
      p.sales += oi.quantity;
      p.revenue += Number(oi.total);
    }

    return {
      revenue30Days: Math.round(revenue30Days * 100) / 100,
      orders30Days: totalOrdersRecent,
      topProducts: Array.from(productSales.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      revenueTimeline: recentTransactions.reduce((acc: { date: string; amount: number }[], t) => {
        const date = t.createdAt.toISOString().split("T")[0];
        const existing = acc.find((a) => a.date === date);
        if (existing) existing.amount += Number(t.amount);
        else acc.push({ date, amount: Number(t.amount) });
        return acc;
      }, [] as { date: string; amount: number }[]),
    };
  }

  async withdrawEarnings(userId: string, amount: number, destination: string) {
    const profile = await this.getVendorProfile(userId);
    if (Number(profile.pendingPayout) < amount) {
      throw new Error("Insufficient pending payout");
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException("Wallet not found");

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "COMPLETED",
          amount,
          fee: 0,
          netAmount: amount,
          currency: wallet.currency,
          reference: `WD-${profile.id}-${Date.now()}`,
          description: `Withdrawal to ${destination}`,
          metadata: { destination },
        },
      }),
      this.prisma.vendorProfile.update({
        where: { id: profile.id },
        data: { pendingPayout: { decrement: amount } },
      }),
    ]);

    return { success: true, reference: `WD-${Date.now()}` };
  }

  async updateShop(userId: string, data: UpdateShopDto) {
    const profile = await this.getVendorProfile(userId);

    return this.prisma.vendorProfile.update({
      where: { id: profile.id },
      data,
    });
  }
}
