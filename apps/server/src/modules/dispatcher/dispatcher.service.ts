import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DispatcherService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.dispatcherProfile.findUnique({
      where: { userId },
    });
    
    if (!profile) {
      throw new NotFoundException("Dispatcher profile not found");
    }
    return profile;
  }

  async createProfile(userId: string, data: any) {
    const existing = await this.prisma.dispatcherProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException("Profile already exists");
    }

    // Also update the user's role to dispatcher if it isn't already
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: "dispatcher" },
    });

    return this.prisma.dispatcherProfile.create({
      data: {
        userId,
        vehicleType: data.vehicleType || "bike",
        plateNumber: data.plateNumber || "UNKNOWN",
        drivingLicense: data.drivingLicense,
      },
    });
  }

  async updateStatus(userId: string, status: "ONLINE" | "OFFLINE") {
    const profile = await this.getProfile(userId);
    return this.prisma.dispatcherProfile.update({
      where: { id: profile.id },
      data: { status },
    });
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    const profile = await this.getProfile(userId);
    return this.prisma.dispatcherProfile.update({
      where: { id: profile.id },
      data: {
        lastLatitude: lat,
        lastLongitude: lng,
        lastLocationAt: new Date(),
      },
    });
  }

  async getAvailableTasks(userId: string, page: number = 1, limit: number = 20) {
    await this.getProfile(userId);
    
    // In a real app, we would filter by distance using PostGIS or Harvesine formula
    // For now, we return all pending ride requests
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      this.prisma.rideRequest.findMany({
        where: { status: "PENDING" },
        skip,
        take: limit,
        include: { customer: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.rideRequest.count({ where: { status: "PENDING" } })
    ]);

    return {
      data: { rides, deliveries: [] },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async acceptTask(userId: string, taskId: string, type: "ride" | "delivery") {
    const profile = await this.getProfile(userId);

    if (profile.status !== "ONLINE") {
      throw new BadRequestException("You must be ONLINE to accept tasks");
    }

    if (type === "ride") {
      // Check if already taken
      const ride = await this.prisma.rideRequest.findUnique({ where: { id: taskId } });
      if (!ride || ride.status !== "PENDING") {
        throw new BadRequestException("Ride is no longer available");
      }

      // Assign to dispatcher
      return this.prisma.rideRequest.update({
        where: { id: taskId },
        data: {
          dispatcherId: profile.id,
          status: "ACCEPTED"
        }
      });
    }

    throw new BadRequestException("Unsupported task type");
  }

  async updateTaskStatus(userId: string, taskId: string, status: string, type: "ride" | "delivery") {
    const profile = await this.getProfile(userId);

    if (type === "ride") {
      const ride = await this.prisma.rideRequest.findUnique({ where: { id: taskId } });
      if (!ride || ride.dispatcherId !== profile.id) {
        throw new BadRequestException("Invalid ride or unauthorized");
      }

      // If completing the ride, add earnings to Profile, Wallet, and log Transaction
      if (status === "COMPLETED") {
        let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
          wallet = await this.prisma.wallet.create({
            data: { userId, balance: 0, currency: "GHS" }
          });
        }

        await this.prisma.$transaction([
          this.prisma.dispatcherProfile.update({
            where: { id: profile.id },
            data: {
              totalEarnings: { increment: ride.price },
              pendingPayout: { increment: ride.price },
            }
          }),
          this.prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: ride.price } }
          }),
          this.prisma.transaction.create({
            data: {
              walletId: wallet.id,
              type: "EARNINGS",
              status: "COMPLETED",
              amount: ride.price,
              netAmount: ride.price,
              currency: "GHS",
              reference: `DSP-ERN-${ride.id}-${Date.now()}`,
              description: `Delivery Payout for Task ${ride.id.slice(-6)}`,
            }
          })
        ]);
      }

      return this.prisma.rideRequest.update({
        where: { id: taskId },
        data: { status }
      });
    }

    throw new BadRequestException("Unsupported task type");
  }

  async getMyTasks(userId: string, status: "active" | "completed", page: number = 1, limit: number = 20) {
    const profile = await this.getProfile(userId);
    
    let statuses: string[];
    if (status === "active") {
      statuses = ["ACCEPTED", "ARRIVED", "DELIVERING"];
    } else {
      statuses = ["COMPLETED", "CANCELLED"];
    }

    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      this.prisma.rideRequest.findMany({
        where: {
          dispatcherId: profile.id,
          status: { in: statuses }
        },
        skip,
        take: limit,
        include: { customer: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.rideRequest.count({
        where: {
          dispatcherId: profile.id,
          status: { in: statuses }
        }
      })
    ]);

    return {
      data: { rides, deliveries: [] },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // --- Earnings & Wallet ---

  async getEarnings(userId: string) {
    const profile = await this.getProfile(userId);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    const transactions = wallet ? await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }) : [];

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
      title: t.description || (t.type === "WITHDRAWAL" ? "Bank Transfer" : "Delivery Payout"),
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
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return [];

    const transactions = await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return transactions.map((t) => ({
      id: t.reference || t.id,
      type: t.type === "WITHDRAWAL" ? "withdrawal" : "order",
      title: t.description || (t.type === "WITHDRAWAL" ? "Bank Transfer" : "Delivery Payout"),
      date: t.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      amount: t.type === "WITHDRAWAL" ? -Number(t.amount) : Number(t.amount),
      status: t.status.toLowerCase(),
    }));
  }

  async getAnalytics(userId: string) {
    const profile = await this.getProfile(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [rides, wallet] = await Promise.all([
      this.prisma.rideRequest.findMany({
        where: {
          dispatcherId: profile.id,
          status: "COMPLETED",
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.wallet.findUnique({ where: { userId } })
    ]);

    const recentTransactions = wallet ? await this.prisma.transaction.findMany({
      where: {
        walletId: wallet.id,
        type: "EARNINGS",
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "asc" },
    }) : [];

    const revenue30Days = recentTransactions.reduce((s, t) => s + Number(t.amount), 0);

    return {
      revenue30Days: Math.round(revenue30Days * 100) / 100,
      trips30Days: rides.length,
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
    const profile = await this.getProfile(userId);
    if (Number(profile.pendingPayout) < amount) {
      throw new BadRequestException("Insufficient pending payout");
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
          reference: `DSP-WD-${profile.id}-${Date.now()}`,
          description: `Withdrawal to ${destination}`,
          metadata: { destination },
        },
      }),
      this.prisma.dispatcherProfile.update({
        where: { id: profile.id },
        data: { pendingPayout: { decrement: amount } },
      }),
    ]);

    return { success: true, reference: `WD-${Date.now()}` };
  }
}
