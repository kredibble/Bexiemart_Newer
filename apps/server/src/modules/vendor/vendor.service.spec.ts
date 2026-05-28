import { NotFoundException } from "@nestjs/common";
import { VendorService } from "./vendor.service";
import { OnboardVendorDto } from "./dto/onboard-vendor.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";

const mockPrisma = (): any => ({
  $queryRaw: jest.fn(),
  $transaction: jest.fn((cb: any) => cb(mockPrisma())),
  wallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  transaction: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn(), update: jest.fn() },
  product: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  cart: { findUnique: jest.fn(), create: jest.fn() },
  cartItem: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  orderItem: { findMany: jest.fn(), create: jest.fn() },
  shippingAddress: { create: jest.fn() },
  escrow: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
  vendorProfile: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
  referral: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  referredUser: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  conversation: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  conversationParticipant: { findMany: jest.fn(), updateMany: jest.fn() },
  message: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
  platformConfig: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  category: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
});

describe("VendorService", () => {
  let service: VendorService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(() => {
    prisma = mockPrisma();
    service = new VendorService(prisma as any);
  });

  describe("getProfile", () => {
    it("throws NotFoundException if vendor profile not found", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue(null);
      await expect(service.getProfile("u1")).rejects.toThrow(NotFoundException);
    });

    it("returns profile with user", async () => {
      const profile = {
        id: "vp1", userId: "u1", shopName: "My Shop",
        user: { id: "u1", name: "Alice", email: "alice@test.com", image: null },
      };
      prisma.vendorProfile.findUnique.mockResolvedValue(profile);
      const result = await service.getProfile("u1");
      expect(result).toEqual(profile);
    });
  });

  describe("onboard", () => {
    it("throws NotFoundException if no existing profile", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue(null);
      const dto = Object.assign(new OnboardVendorDto(), { shopName: "Shop", slug: "shop" });
      await expect(service.onboard("u1", dto)).rejects.toThrow(NotFoundException);
    });

    it("updates profile with shop details", async () => {
      const existing = { id: "vp1", userId: "u1" };
      prisma.vendorProfile.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);

      const dto = Object.assign(new OnboardVendorDto(), {
        shopName: "My Shop", slug: "my-shop", description: "desc",
      });
      const updated = { ...existing, ...dto };
      prisma.vendorProfile.update.mockResolvedValue(updated);

      const result = await service.onboard("u1", dto);
      expect(result).toEqual(updated);
      expect(prisma.vendorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          data: expect.objectContaining({ shopName: "My Shop", slug: "my-shop" }),
        })
      );
    });
  });

  describe("getStats", () => {
    it("returns totalProducts, totalOrders, pendingOrders, totalEarnings", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({
        id: "vp1", userId: "u1", totalEarnings: 5000,
      });
      prisma.product.count.mockResolvedValue(15);
      prisma.orderItem.findMany.mockResolvedValue([
        { orderId: "o1", order: { status: "pending" } },
        { orderId: "o1", order: { status: "pending" } },
        { orderId: "o2", order: { status: "delivered" } },
      ]);

      const result = await service.getStats("u1");
      expect(result).toEqual({
        totalProducts: 15,
        totalOrders: 2,
        pendingOrders: 2,
        totalEarnings: 5000,
      });
    });
  });

  describe("createProduct", () => {
    it("creates product with vendor profile id", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });

      const dto = Object.assign(new CreateProductDto(), {
        name: "Product", slug: "product", description: "desc", price: 100, stock: 10, categoryId: "cat1",
      });
      const created = { id: "p1", ...dto, vendorId: "vp1", images: [] };
      prisma.product.create.mockResolvedValue(created);

      const result = await service.createProduct("u1", dto);
      expect(result).toEqual(created);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vendorId: "vp1", name: "Product" }),
        })
      );
    });
  });

  describe("updateProduct", () => {
    it("throws NotFoundException if product not found", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });
      prisma.product.findFirst.mockResolvedValue(null);
      const dto = Object.assign(new UpdateProductDto(), { name: "Updated" });
      await expect(service.updateProduct("u1", "p1", dto)).rejects.toThrow(NotFoundException);
    });

    it("updates product fields", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });
      prisma.product.findFirst.mockResolvedValue({ id: "p1", name: "Old" });
      const updated = { id: "p1", name: "Updated", price: 150 };
      prisma.product.update.mockResolvedValue(updated);

      const dto = Object.assign(new UpdateProductDto(), { name: "Updated", price: 150 });
      const result = await service.updateProduct("u1", "p1", dto);
      expect(result).toEqual(updated);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "p1" } })
      );
    });
  });

  describe("deleteProduct", () => {
    it("throws NotFoundException if product not found", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.deleteProduct("u1", "p1")).rejects.toThrow(NotFoundException);
    });

    it("sets isDeleted and isActive", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });
      prisma.product.findFirst.mockResolvedValue({ id: "p1", vendorId: "vp1" });
      prisma.product.update.mockResolvedValue({ id: "p1", isDeleted: true, isActive: false });

      const result = await service.deleteProduct("u1", "p1");
      expect(result).toEqual({ success: true });
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: { isDeleted: true, isActive: false },
        })
      );
    });
  });

  describe("getOrders", () => {
    it("returns deduplicated orders with merged items", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });

      const sharedOrder = {
        id: "o1", orderNumber: "ORD-001", status: "pending", total: 200,
        createdAt: new Date("2025-01-01"),
        shippingAddress: { address: "123 St" },
        items: [],
      };
      const product1 = { id: "p1", name: "Product 1", images: [{ url: "img1.jpg", order: 1 }] };
      const product2 = { id: "p2", name: "Product 2", images: [{ url: "img2.jpg", order: 1 }] };

      const orderItems = [
        {
          id: "oi1", orderId: "o1", productId: "p1", productName: "Product 1",
          quantity: 2, price: 50, total: 100, imageUrl: "img1.jpg",
          product: product1,
          order: { ...sharedOrder, items: [] },
        },
        {
          id: "oi2", orderId: "o1", productId: "p2", productName: "Product 2",
          quantity: 1, price: 100, total: 100, imageUrl: "img2.jpg",
          product: product2,
          order: { ...sharedOrder, items: [] },
        },
      ];
      prisma.orderItem.findMany.mockResolvedValue(orderItems);

      const result = await service.getOrders("u1", 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.items).toHaveLength(2);
      expect(result.data[0]!.items[0].productName).toBe("Product 1");
      expect(result.data[0]!.items[1].productName).toBe("Product 2");
    });
  });

  describe("updateOrderStatus", () => {
    it("throws NotFoundException if order not found", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(service.updateOrderStatus("u1", "o1", "shipped")).rejects.toThrow(NotFoundException);
    });

    it("updates order status", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({ id: "vp1", userId: "u1" });
      prisma.order.findFirst.mockResolvedValue({ id: "o1", status: "pending" });
      prisma.order.update.mockResolvedValue({ id: "o1", status: "shipped" });

      const result = await service.updateOrderStatus("u1", "o1", "shipped");
      expect(result.status).toBe("shipped");
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "o1" }, data: { status: "shipped" } })
      );
    });
  });

  describe("getEarnings", () => {
    it("returns availableBalance, pendingClearance, todayRevenue, thisWeekRevenue, and recentTransactions", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({
        id: "vp1", userId: "u1", totalEarnings: 10000, pendingPayout: 2500,
      });
      prisma.wallet.findUnique.mockResolvedValue({
        id: "w1", userId: "u1", balance: 1500,
      });
      
      const today = new Date();
      prisma.transaction.findMany.mockResolvedValue([
        { type: "EARNINGS", status: "COMPLETED", amount: 500, createdAt: today, reference: "t1" },
        { type: "EARNINGS", status: "COMPLETED", amount: 1000, createdAt: today, reference: "t2" },
        { type: "WITHDRAWAL", status: "COMPLETED", amount: 3000, createdAt: new Date("2023-01-01"), reference: "t3" },
      ]);

      const result = await service.getEarnings("u1");
      expect(result.availableBalance).toBe(1500);
      expect(result.pendingClearance).toBe(2500);
      expect(result.todayRevenue).toBe(1500);
      expect(result.thisWeekRevenue).toBe(1500);
      expect(result.recentTransactions).toHaveLength(3);
      expect(result.recentTransactions[0].id).toBe("t1");
    });
  });

  describe("withdrawEarnings", () => {
    it("throws Error if insufficient pending payout", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({
        id: "vp1", userId: "u1", pendingPayout: 100,
      });
      await expect(service.withdrawEarnings("u1", 200, "bank")).rejects.toThrow("Insufficient pending payout");
    });

    it("creates withdrawal transaction via $transaction", async () => {
      prisma.vendorProfile.findUnique.mockResolvedValue({
        id: "vp1", userId: "u1", pendingPayout: 5000,
      });
      prisma.wallet.findUnique.mockResolvedValue({ id: "w1", userId: "u1", currency: "NGN" });
      prisma.wallet.update.mockResolvedValue({});
      prisma.transaction.create.mockResolvedValue({ id: "tx1" });
      prisma.vendorProfile.update.mockResolvedValue({});
      prisma.$transaction.mockImplementation((arg: any) => {
        if (Array.isArray(arg)) return Promise.resolve(arg);
        return arg(mockPrisma());
      });

      const result = await service.withdrawEarnings("u1", 2000, "bank-account");
      expect(result.success).toBe(true);
      expect(result.reference).toBeDefined();
      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "w1" },
          data: { balance: { decrement: 2000 } },
        })
      );
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: "WITHDRAWAL", amount: 2000 }),
        })
      );
    });
  });
});
