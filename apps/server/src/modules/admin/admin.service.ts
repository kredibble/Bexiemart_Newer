import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateConfigDto } from "./dto/update-config.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Users ─────────────────────────────────────────────────────────────────────

  async listUsers(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { vendorProfile: true },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: true,
        payments: true,
        wallet: true,
        vendorProfile: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateUserRole(id: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  // ─── Vendors ───────────────────────────────────────────────────────────────────

  async listVendors(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      this.prisma.vendorProfile.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          _count: { select: { products: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.vendorProfile.count()
    ]);

    const vendorIds = vendors.map(v => v.id);

    const allOrderItems = await this.prisma.orderItem.findMany({
      where: { product: { vendorId: { in: vendorIds } } },
      select: { orderId: true, product: { select: { vendorId: true } }, order: { select: { status: true } } },
    });

    const orderStatsByVendor = vendorIds.reduce((acc, id) => {
      acc[id] = { totalOrders: new Set(), pendingOrders: 0 };
      return acc;
    }, {} as Record<string, { totalOrders: Set<string>; pendingOrders: number }>);

    allOrderItems.forEach(item => {
      const vid = item.product?.vendorId;
      if (!vid || !orderStatsByVendor[vid]) return;
      orderStatsByVendor[vid].totalOrders.add(item.orderId);
      if (item.order?.status === "pending") {
        orderStatsByVendor[vid].pendingOrders++;
      }
    });

    const data = vendors.map((v) => {
      const stats = orderStatsByVendor[v.id];
      return {
        ...v,
        _count: undefined,
        productCount: v._count.products,
        orderStats: { totalOrders: stats.totalOrders.size, pendingOrders: stats.pendingOrders },
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveVendor(id: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return this.prisma.vendorProfile.update({ where: { id }, data: { isActive: true } });
  }

  async suspendVendor(id: string) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return this.prisma.vendorProfile.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Platform Config ───────────────────────────────────────────────────────────

  async getConfig() {
    const config = await this.prisma.platformConfig.findFirst();
    if (!config) throw new NotFoundException("Platform config not found");
    return config;
  }

  async updateConfig(data: UpdateConfigDto) {
    const existing = await this.prisma.platformConfig.findFirst();
    if (existing) {
      return this.prisma.platformConfig.update({ where: { id: existing.id }, data });
    }
    return this.prisma.platformConfig.create({ data });
  }

  // ─── Orders Oversight ──────────────────────────────────────────────────────────

  async listOrders(status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
        payment: true,
        shippingAddress: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async updateOrderStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }
}
