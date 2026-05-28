import { Injectable, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { CreateCardDto, UpdateCardDto } from "./dto/card.dto";

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly paystackBaseUrl = "https://api.paystack.co";

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /* ─── Paystack Helpers ─── */

  private get paystackSecretKey(): string {
    return this.config.get<string>("PAYSTACK_SECRET_KEY", "");
  }

  private async paystackPost<T = any>(path: string, body: Record<string, any>): Promise<T> {
    const response = await fetch(`${this.paystackBaseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      this.logger.error(`Paystack POST ${path} failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.message || "Paystack request failed");
    }
    return data.data;
  }

  private async paystackGet<T = any>(path: string): Promise<T> {
    const response = await fetch(`${this.paystackBaseUrl}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.paystackSecretKey}` },
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      this.logger.error(`Paystack GET ${path} failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.message || "Paystack request failed");
    }
    return data.data;
  }

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
    const amountInPesewas = Math.round(amount * 100);
    const reference = "tu_" + wallet.id.substring(0, 8) + "_" + Date.now();

    const paystackRes = await this.paystackPost("/transaction/initialize", {
      email: wallet.user.email,
      amount: amountInPesewas,
      reference,
      callback_url: `${this.config.get("BETTER_AUTH_URL")}/payment/callback`,
      channels: channel ? [channel] : undefined,
      metadata: { userId, type: 'TOPUP' },
    });

    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: "TOPUP",
        status: "PENDING",
        amount,
        netAmount: amount,
        reference,
        description: `Wallet top up`,
      },
    });

    return { authorizationUrl: paystackRes.authorization_url, reference };
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

    const paystackRes = await this.paystackGet(`/transaction/verify/${reference}`);
    
    if (paystackRes.status !== "success") {
      if (paystackRes.status === "failed") {
         await this.prisma.transaction.update({
           where: { id: transaction.id },
           data: { status: "FAILED" },
         });
         throw new BadRequestException("Payment failed");
      }
      throw new BadRequestException("Payment not successful yet");
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

  async transfer(userId: string, recipientEmail: string, amount: number, pin: string) {
    const senderWallet = await this.getWallet(userId);
    await this.verifyPin(userId, pin);

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

  async verifyAndSaveCard(userId: string, reference: string, cardholderName: string, isDefault: boolean = false) {
    const wallet = await this.getWallet(userId);
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      throw new BadRequestException("Card verification failed");
    }

    const auth = data.data.authorization;
    if (!auth || !auth.authorization_code) {
      throw new BadRequestException("Card authorization code not found");
    }

    // 1 GHS is 100 pesewas
    const amountPaid = data.data.amount / 100;

    return this.prisma.$transaction(async (tx) => {
      // 1. Credit wallet with the charge amount
      if (amountPaid > 0) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amountPaid } },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "TOPUP",
            status: "COMPLETED",
            amount: amountPaid,
            netAmount: amountPaid,
            reference: `card_bind_${reference}`,
            description: "Card Validation Top-up",
          },
        });
      }

      // 2. Save card
      const newCard = await tx.card.create({
        data: {
          walletId: wallet.id,
          cardholderName,
          type: auth.card_type ? auth.card_type.toUpperCase() : "CARD",
          last4: auth.last4,
          expiryMonth: auth.exp_month,
          expiryYear: auth.exp_year,
          isDefault,
          authorizationCode: auth.authorization_code,
          bin: auth.bin,
          bank: auth.bank,
        },
      });
      return newCard;
    });
  }

  async getCards(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.card.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
  }

  async addCard(userId: string, data: CreateCardDto) {
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

  async updateCard(userId: string, cardId: string, data: UpdateCardDto) {
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

  /* ─── Bank Accounts ─── */

  async getBankAccounts(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.bankAccount.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
  }

  async resolveBankAccount(bankCode: string, accountNumber: string) {
    const result = await this.paystackGet(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    );
    return {
      accountNumber: result.account_number,
      accountName: result.account_name,
      bankId: result.bank_id,
    };
  }

  async linkBankAccount(userId: string, data: { bankCode: string; accountNumber: string; accountName: string; bankName?: string }) {
    const wallet = await this.getWallet(userId);

    // Check for duplicates
    const existing = await this.prisma.bankAccount.findFirst({
      where: { walletId: wallet.id, accountNumber: data.accountNumber, bankCode: data.bankCode },
    });
    if (existing) throw new BadRequestException("This bank account is already linked");

    // Create Paystack transfer recipient
    const recipient = await this.paystackPost("/transferrecipient", {
      type: "nuban",
      name: data.accountName,
      account_number: data.accountNumber,
      bank_code: data.bankCode,
      currency: "GHS",
    });

    const existingCount = await this.prisma.bankAccount.count({ where: { walletId: wallet.id } });

    return this.prisma.bankAccount.create({
      data: {
        walletId: wallet.id,
        bankName: data.bankName || recipient.details?.bank_name || "Bank",
        bankCode: data.bankCode,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        paystackRecipientCode: recipient.recipient_code,
        isDefault: existingCount === 0,
        isVerified: true,
      },
    });
  }

  async deleteBankAccount(userId: string, accountId: string) {
    const wallet = await this.getWallet(userId);
    const account = await this.prisma.bankAccount.findUnique({ where: { id: accountId } });
    if (!account || account.walletId !== wallet.id) throw new NotFoundException("Bank account not found");

    await this.prisma.bankAccount.delete({ where: { id: accountId } });
    return { success: true };
  }

  /* ─── Mobile Money Accounts ─── */

  async getMomoAccounts(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.momoAccount.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
    });
  }

  async linkMomoAccount(userId: string, data: { provider: string; phoneNumber: string; accountName: string; isDefault?: boolean }) {
    const wallet = await this.getWallet(userId);

    // Check for duplicates
    const existing = await this.prisma.momoAccount.findFirst({
      where: { walletId: wallet.id, phoneNumber: data.phoneNumber, provider: data.provider as any },
    });
    if (existing) throw new BadRequestException("This mobile money account is already linked");

    // Create Paystack transfer recipient for mobile money
    const recipient = await this.paystackPost("/transferrecipient", {
      type: "mobile_money",
      name: data.accountName,
      account_number: data.phoneNumber,
      bank_code: data.provider === "MTN" ? "MTN" : data.provider === "VODAFONE" ? "VOD" : "ATL",
      currency: "GHS",
    });

    const existingCount = await this.prisma.momoAccount.count({ where: { walletId: wallet.id } });

    return this.prisma.momoAccount.create({
      data: {
        walletId: wallet.id,
        provider: data.provider as any,
        phoneNumber: data.phoneNumber,
        accountName: data.accountName,
        isDefault: data.isDefault ?? (existingCount === 0),
        isVerified: true,
        paystackRecipientCode: recipient.recipient_code,
      },
    });
  }

  async deleteMomoAccount(userId: string, accountId: string) {
    const wallet = await this.getWallet(userId);
    const account = await this.prisma.momoAccount.findUnique({ where: { id: accountId } });
    if (!account || account.walletId !== wallet.id) throw new NotFoundException("Mobile money account not found");

    await this.prisma.momoAccount.delete({ where: { id: accountId } });
    return { success: true };
  }

  async withdraw(userId: string, amount: number, accountId: string, accountType: 'bank' | 'momo', pin: string) {
    const wallet = await this.getWallet(userId);
    await this.verifyPin(userId, pin);

    const platformConfig = await this.prisma.platformConfig.findFirst();
    const fee = platformConfig ? Number(platformConfig.withdrawalFeeFlat) : 2.0;

    const totalDeduction = amount + fee;

    if (Number(wallet.balance) < totalDeduction) {
      throw new BadRequestException(`Insufficient balance. You need ${totalDeduction} to cover the withdrawal and fee.`);
    }

    let recipientCode: string | null = null;
    let bankOrMomoName = "";

    if (accountType === 'bank') {
      const account = await this.prisma.bankAccount.findUnique({ where: { id: accountId } });
      if (!account || account.walletId !== wallet.id) throw new NotFoundException("Bank account not found");
      recipientCode = account.paystackRecipientCode;
      bankOrMomoName = account.bankName;
    } else {
      const account = await this.prisma.momoAccount.findUnique({ where: { id: accountId } });
      if (!account || account.walletId !== wallet.id) throw new NotFoundException("Mobile money account not found");
      recipientCode = account.paystackRecipientCode;
      bankOrMomoName = account.provider;
    }

    if (!recipientCode) {
      throw new BadRequestException("Recipient code not found for this account. Please re-link it.");
    }

    const reference = `wd_${wallet.id.substring(0, 8)}_${Date.now()}`;

    // Initiate transfer via Paystack
    const transferRes = await this.paystackPost("/transfer", {
      source: "balance",
      reason: "Bexiemart Withdrawal",
      amount: Math.round(amount * 100), // amount in pesewas
      recipient: recipientCode,
      reference,
    });

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: totalDeduction } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "PENDING",
          amount: totalDeduction,
          fee,
          netAmount: amount,
          reference,
          description: `Withdrawal to ${bankOrMomoName}`,
          providerRef: transferRes.transfer_code,
        },
      }),
    ]);

    const updatedWallet = await this.prisma.wallet.findUnique({ where: { id: wallet.id } });
    return { success: true, reference, newBalance: updatedWallet?.balance };
  }
}
