import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VendorCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getVendorId(userId: string) {
    const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Vendor profile not found");
    return profile.id;
  }

  async findAll(userId: string) {
    const vendorId = await this.getVendorId(userId);

    const orderItems = await this.prisma.orderItem.findMany({
      where: { product: { vendorId } },
      include: { order: { select: { userId: true, createdAt: true, total: true } } },
    });

    const userIds = Array.from(new Set(orderItems.map(oi => oi.order.userId)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true }
    });

    const customerMap = new Map<string, { id: string; name: string; email: string; image: string | null; totalSpend: number; orderCount: number; lastOrderDate: Date }>();
    
    for (const u of users) {
      customerMap.set(u.id, { ...u, totalSpend: 0, orderCount: 0, lastOrderDate: new Date(0) });
    }

    for (const oi of orderItems) {
      const uid = oi.order.userId;
      const c = customerMap.get(uid);
      if (c) {
        c.totalSpend += Number(oi.order.total);
        c.orderCount += 1;
        if (oi.order.createdAt > c.lastOrderDate) c.lastOrderDate = oi.order.createdAt;
      }
    }

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }

  async findOne(userId: string, customerId: string) {
    const vendorId = await this.getVendorId(userId);
    const user = await this.prisma.user.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true, image: true } });
    if (!user) throw new NotFoundException("Customer not found");

    const orders = await this.prisma.order.findMany({
      where: { userId: customerId, items: { some: { product: { vendorId } } } },
      include: { items: { where: { product: { vendorId } }, include: { product: { select: { name: true, images: { take: 1, orderBy: { order: "asc" } } } } } } },
      orderBy: { createdAt: "desc" },
    });

    return { ...user, orders };
  }
}
