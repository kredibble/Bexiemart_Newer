import { WalletService } from "./wallet.service";
import { mockPrisma } from "../../prisma/prisma.mock";
import * as bcrypt from "bcryptjs";
import { BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";

describe("WalletService", () => {
  let service: WalletService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(() => {
    prisma = mockPrisma();
    service = new WalletService(prisma as any, { get: jest.fn() } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getWallet", () => {
    it("should return existing wallet", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 100, currency: "GHS", status: "ACTIVE", user: { id: "u1" } };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      const result = await service.getWallet("u1");
      expect(result).toEqual(wallet);
      expect(prisma.wallet.findUnique).toHaveBeenCalledWith({ where: { userId: "u1" }, include: { user: true } });
    });

    it("should create wallet if not found", async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);
      const newWallet = { id: "w2", userId: "u1", balance: 0, currency: "GHS", status: "ACTIVE", user: { id: "u1" } };
      prisma.wallet.create.mockResolvedValue(newWallet);
      const result = await service.getWallet("u1");
      expect(result).toEqual(newWallet);
      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: { userId: "u1", balance: 0, currency: "GHS", status: "ACTIVE" },
        include: { user: true },
      });
    });
  });

  describe("getTransactions", () => {
    it("should return paginated transactions", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 100, currency: "GHS", status: "ACTIVE" };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      const transactions = [{ id: "t1", amount: 50 }];
      prisma.transaction.findMany.mockResolvedValue(transactions);
      prisma.transaction.count.mockResolvedValue(1);
      const result = await service.getTransactions("u1", 1, 20);
      expect(result).toEqual({ data: transactions, total: 1, page: 1, pages: 1 });
    });
  });

  describe("verifyTopUp", () => {
    it("should throw NotFoundException if transaction not found", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 100 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      await expect(service.verifyTopUp("u1", "ref1")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if unauthorized", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 100 };
      const transaction = { id: "t1", walletId: "w2", status: "PENDING", amount: 50 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      prisma.transaction.findUnique.mockResolvedValue(transaction);
      await expect(service.verifyTopUp("u1", "ref1")).rejects.toThrow(BadRequestException);
    });

    it("should complete pending top-up via $transaction", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 100 };
      const transaction = { id: "t1", walletId: "w1", status: "PENDING", amount: 50 };
      prisma.wallet.findUnique
        .mockResolvedValueOnce(wallet)
        .mockResolvedValue({ ...wallet, balance: 150 });
      prisma.transaction.findUnique.mockResolvedValue(transaction);
      prisma.$transaction.mockImplementation((args: any) => Promise.all(args));
      prisma.transaction.update.mockResolvedValue({ ...transaction, status: "COMPLETED" });
      prisma.wallet.update.mockResolvedValue({ ...wallet, balance: 150 });
      const result = await service.verifyTopUp("u1", "ref1");
      expect(result).toEqual({ balance: 150 });
    });
  });

  describe("transfer", () => {
    it("should throw BadRequestException if insufficient balance", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 10, user: { name: "Sender" } };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      await expect(service.transfer("u1", "recip@test.com", 100, "1234")).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if recipient not found", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 200, user: { name: "Sender" } };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.transfer("u1", "missing@test.com", 100, "1234")).rejects.toThrow(NotFoundException);
    });

    it("should create sent+received transactions and update both wallets", async () => {
      const senderWallet = { id: "w1", userId: "u1", balance: 200, user: { name: "Sender" } };
      const recipientUser = { id: "u2", email: "recip@test.com", name: "Recipient" };
      const recipientWallet = { id: "w2", userId: "u2", balance: 50, user: { name: "Recipient" } };
      const updatedSender = { ...senderWallet, balance: 100 };

      prisma.wallet.findUnique
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet)
        .mockResolvedValueOnce(updatedSender);
      prisma.user.findUnique.mockResolvedValue(recipientUser);
      prisma.$transaction.mockImplementation((args: any) => Promise.all(args));

      jest.spyOn(service, "verifyPin").mockResolvedValue({ valid: true });
      const result = await service.transfer("u1", "recip@test.com", 100, "1234");
      expect(result).toHaveProperty("reference");
      expect(result.newBalance).toBe(100);
      expect(prisma.wallet.update).toHaveBeenCalledTimes(2);
      expect(prisma.transaction.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("setPin", () => {
    it("should hash pin with bcryptjs and update wallet", async () => {
      const wallet = { id: "w1", userId: "u1", balance: 100 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed" as never);
      const updated = { ...wallet, pinHash: "hashed", pinFailures: 0, pinLockedUntil: null };
      prisma.wallet.update.mockResolvedValue(updated);
      const result = await service.setPin("u1", "1234");
      expect(result).toEqual(updated);
    });
  });

  describe("verifyPin", () => {
    it("should throw BadRequestException if PIN not set", async () => {
      const wallet = { id: "w1", userId: "u1", pinHash: null };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      await expect(service.verifyPin("u1", "1234")).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException if locked", async () => {
      const future = new Date(Date.now() + 60000);
      const wallet = { id: "w1", userId: "u1", pinHash: "hash", pinLockedUntil: future, pinFailures: 5 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      await expect(service.verifyPin("u1", "1234")).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException on wrong PIN", async () => {
      const wallet = { id: "w1", userId: "u1", pinHash: "hash", pinLockedUntil: null, pinFailures: 2 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
      await expect(service.verifyPin("u1", "wrong")).rejects.toThrow(BadRequestException);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w1" },
        data: { pinFailures: 3 },
      });
    });

    it("should return valid on correct PIN", async () => {
      const wallet = { id: "w1", userId: "u1", pinHash: "hash", pinLockedUntil: null, pinFailures: 1 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
      prisma.wallet.update.mockResolvedValue({ ...wallet, pinFailures: 0, pinLockedUntil: null });
      const result = await service.verifyPin("u1", "correct");
      expect(result).toEqual({ valid: true });
    });

    it("should lock after 5 failures", async () => {
      const wallet = { id: "w1", userId: "u1", pinHash: "hash", pinLockedUntil: null, pinFailures: 4 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
      await expect(service.verifyPin("u1", "wrong")).rejects.toThrow(ForbiddenException);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w1" },
        data: expect.objectContaining({ pinFailures: 5, pinLockedUntil: expect.any(Date) }),
      });
    });
  });

  describe("getPinStatus", () => {
    it("should return isLocked, hasPin, failuresRemaining", async () => {
      const wallet = { id: "w1", userId: "u1", pinHash: "hash", pinLockedUntil: null, pinFailures: 2 };
      prisma.wallet.findUnique.mockResolvedValue(wallet);
      const result = await service.getPinStatus("u1");
      expect(result).toEqual({ hasPin: true, isLocked: false, failuresRemaining: 3 });
    });
  });
});
