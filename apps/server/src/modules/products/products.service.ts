import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryProductsDto, ProductSort } from "./dto/query-products.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: QueryProductsDto) {
    const where: any = { isActive: true, isDeleted: false };

    if (dto.vendorId) {
      where.vendorId = dto.vendorId;
    }

    if (dto.category && dto.category !== "All") {
      where.category = { name: dto.category };
    }

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: "insensitive" } },
        { vendor: { shopName: { contains: dto.search, mode: "insensitive" } } },
      ];
    }

    const orderBy: any[] = [];
    switch (dto.sort) {
      case ProductSort.PRICE_LOW:
        orderBy.push({ price: "asc" });
        break;
      case ProductSort.PRICE_HIGH:
        orderBy.push({ price: "desc" });
        break;
      case ProductSort.NEWEST:
        orderBy.push({ createdAt: "desc" });
        break;
      case ProductSort.POPULAR:
      default:
        orderBy.push({ reviews: { _count: "desc" } });
        orderBy.push({ createdAt: "desc" });
        break;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { order: "asc" }, take: 1 },
          category: true,
          vendor: { select: { id: true, shopName: true, logo: true } },
        },
        orderBy,
        skip: dto.skip,
        take: dto.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: Number(p.price),
        stock: p.stock,
        category: p.category.name,
        vendor: p.vendor?.shopName ?? null,
        vendorId: p.vendor?.id ?? null,
        image: p.images[0]?.url ?? null,
        isFeatured: p.isFeatured,
        rating: 0,
        reviewCount: 0,
        createdAt: p.createdAt,
      })),
      total,
      page: dto.page ?? 1,
      pages: Math.ceil(total / (dto.limit ?? 20)),
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, isActive: true, isDeleted: false },
      include: {
        images: { orderBy: { order: "asc" } },
        category: true,
        vendor: {
          select: {
            id: true,
            shopName: true,
            logo: true,
            description: true,
          },
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    if (!product) throw new NotFoundException("Product not found");

    const reviewStats = await this.prisma.review.aggregate({
      where: { productId: id },
      _avg: { rating: true },
      _count: true,
    });

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      category: product.category.name,
      deliveryOptions: product.deliveryOptions,
      seller: product.vendor
        ? {
            id: product.vendor.id,
            name: product.vendor.shopName,
            logo: product.vendor.logo,
            description: product.vendor.description,
          }
        : null,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
      })),
      rating: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
      reviewCount: reviewStats._count,
      reviews: product.reviews.map((r) => ({
        id: r.id,
        user: r.user.name,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt,
      })),
      createdAt: product.createdAt,
    };
  }

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      count: c._count.products,
    }));
  }

  async getStore(id: string) {
    const store = await this.prisma.vendorProfile.findUnique({
      where: { id, isActive: true },
    });

    if (!store) {
      throw new NotFoundException("Store not found");
    }

    try {
      await this.prisma.$executeRawUnsafe(`UPDATE "VendorProfile" SET "visits" = "visits" + 1 WHERE "id" = $1`, id);
    } catch(e) {
      console.error(`Failed to track visit for store ${id}:`, e);
    }

    const stats = await this.prisma.product.aggregate({
      where: { vendorId: id, isActive: true, isDeleted: false },
      _count: true,
    });

    return {
      id: store.id,
      name: store.shopName,
      slug: store.slug,
      description: store.description,
      logo: store.logo,
      banner: store.banner,
      address: store.address,
      city: store.city,
      state: store.state,
      phone: store.phone,
      totalProducts: stats._count,
      rating: 4.5,
      visits: (store as any).visits ? (store as any).visits + 1 : 1,
    };
  }
}
