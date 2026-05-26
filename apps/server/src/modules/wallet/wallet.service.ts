import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0, currency: "GHS", status: "ACTIVE" },
        include: { user: true },
      });
    }

    return wallet;
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.getWallet(userId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async initializeTopUp(userId: string, amount: number, channel: string) {
    const wallet = await this.getWallet(userId);
    const reference = "tu_" + Date.now();

    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: "TOPUP",
        status: "PENDING",
        amount,
        netAmount: amount,
        reference,
        description: `Top up via ${channel}`,
      },
    });

    return { authorizationUrl: "https://checkout.mockpay.com/" + reference, reference };
  }

  async verifyTopUp(userId: string, reference: string) {
    const wallet = await this.getWallet(userId);

    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) throw new NotFoundException("Transaction not found");
    if (transaction.walletId !== wallet.id) throw new BadRequestException("Unauthorized access to transaction");

    if (transaction.status === "COMPLETED") {
      return { balance: wallet.balance };
    }

    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "COMPLETED" },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: transaction.amount } },
      }),
    ]);

    const updatedWallet = await this.prisma.wallet.findUnique({ where: { id: wallet.id } });
    return { balance: updatedWallet?.balance };
  }

  async transfer(userId: string, recipientEmail: string, amount: number) {
    const senderWallet = await this.getWallet(userId);

    if (Number(senderWallet.balance) < amount) {
      throw new BadRequestException("Insufficient balance");
    }

    const recipientUser = await this.prisma.user.findUnique({
      where: { email: recipientEmail },
    });

    if (!recipientUser) throw new NotFoundException("Recipient user not found");

    const recipientWallet = await this.getWallet(recipientUser.id);
    const reference = "tf_" + Date.now();

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: senderWallet.id,
          counterpartyWalletId: recipientWallet.id,
          type: "TRANSFER_SENT",
          status: "COMPLETED",
          amount,
          netAmount: amount,
          reference: reference + "_out",
          description: `Transfer to ${recipientUser.name}`,
        },
      }),
      this.prisma.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: recipientWallet.id,
          counterpartyWalletId: senderWallet.id,
          type: "TRANSFER_RECEIVED",
          status: "COMPLETED",
          amount,
          netAmount: amount,
          reference: reference + "_in",
          description: `Transfer from ${senderWallet.user?.name || "User"}`,
        },
      }),
    ]);

    const updatedSenderWallet = await this.prisma.wallet.findUnique({ where: { id: senderWallet.id } });
    return { reference, newBalance: updatedSenderWallet?.balance };
  }

  async setPin(userId: string, pin: string) {
    const wallet = await this.getWallet(userId);
    const pinHash = await bcrypt.hash(pin, 10);
    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pinHash, pinFailures: 0, pinLockedUntil: null },
    });
  }

  async verifyPin(userId: string, pin: string) {
    const wallet = await this.getWallet(userId);
    if (!wallet.pinHash) throw new BadRequestException("PIN not set");

    if (wallet.pinLockedUntil && new Date() < wallet.pinLockedUntil) {
      const remaining = Math.ceil((wallet.pinLockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`PIN locked. Try again in ${remaining} minute(s)`);
    }

    const isValid = await bcrypt.compare(pin, wallet.pinHash);
    if (!isValid) {
      const failures = wallet.pinFailures + 1;
      const update: any = { pinFailures: failures };
      if (failures >= 5) {
        update.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await this.prisma.wallet.update({ where: { id: wallet.id }, data: update });
      const remaining = 5 - failures;
      if (remaining <= 0) throw new ForbiddenException("PIN locked for 30 minutes");
      throw new BadRequestException(`Invalid PIN. ${remaining} attempt(s) remaining`);
    }

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pinFailures: 0, pinLockedUntil: null },
    });
    return { valid: true };
  }

  async changePin(userId: string, currentPin: string, newPin: string) {
    await this.verifyPin(userId, currentPin);
    return this.setPin(userId, newPin);
  }

  async resetPinFailures(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pinFailures: 0, pinLockedUntil: null },
    });
  }

  async getPinStatus(userId: string) {
    const wallet = await this.getWallet(userId);
    const isLocked = wallet.pinLockedUntil ? new Date() < wallet.pinLockedUntil : false;
    return {
      hasPin: !!wallet.pinHash,
      isLocked,
      failuresRemaining: Math.max(0, 5 - wallet.pinFailures),
    };
  }
  async getCards(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.card.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
  }

  async addCard(userId: string, data: any) {
    const wallet = await this.getWallet(userId);
    
    const existingCount = await this.prisma.card.count({ where: { walletId: wallet.id } });
    const isDefault = existingCount === 0 ? true : !!data.isDefault;

    if (isDefault && existingCount > 0) {
      await this.prisma.card.updateMany({
        where: { walletId: wallet.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.card.create({
      data: {
        walletId: wallet.id,
        type: data.type,
        cardholderName: data.cardholderName,
        last4: data.last4,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        isDefault,
      },
    });
  }

  async updateCard(userId: string, cardId: string, data: any) {
    const wallet = await this.getWallet(userId);
    
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.walletId !== wallet.id) {
      throw new NotFoundException("Card not found");
    }

    if (data.isDefault) {
      await this.prisma.card.updateMany({
        where: { walletId: wallet.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.card.update({
      where: { id: cardId },
      data,
    });
  }

  async deleteCard(userId: string, cardId: string) {
    const wallet = await this.getWallet(userId);
    
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.walletId !== wallet.id) {
      throw new NotFoundException("Card not found");
    }

    await this.prisma.card.delete({ where: { id: cardId } });
    return { success: true };
  }

  async setDefaultCard(userId: string, cardId: string) {
    const wallet = await this.getWallet(userId);
    
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card || card.walletId !== wallet.id) {
      throw new NotFoundException("Card not found");
    }

    await this.prisma.$transaction([
      this.prisma.card.updateMany({
        where: { walletId: wallet.id },
        data: { isDefault: false },
      }),
      this.prisma.card.update({
        where: { id: cardId },
        data: { isDefault: true },
      })
    ]);

    return { success: true };
  }
}
