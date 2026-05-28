import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CustomerServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string, search?: string, page: number = 1, limit: number = 20) {
    const where: any = { isActive: true };

    if (category) where.category = category;

    if (search) where.name = { contains: search, mode: "insensitive" };

    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: { select: { shopName: true, slug: true, logo: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({ where })
    ]);

    const categories = await this.prisma.service.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return {
      data: services,
      categories: categories.map((c: any) => c.category),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, isActive: true },
      include: {
        vendor: {
          select: { shopName: true, slug: true, logo: true, description: true, phone: true },
        },
      },
    });

    if (!service) throw new NotFoundException("Service not found");

    return service;
  }

  async book(userId: string, serviceId: string, body: { message?: string; scheduledAt?: string }) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, isActive: true },
    });

    if (!service) throw new NotFoundException("Service not found");

    return this.prisma.serviceBooking.create({
      data: {
        serviceId,
        userId,
        message: body.message,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
    });
  }

  async findMyBookings(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.serviceBooking.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          service: {
            include: {
              vendor: { select: { shopName: true, slug: true, logo: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.serviceBooking.count({ where: { userId } })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== userId) throw new ForbiddenException("Not your booking");

    return this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  }
}
