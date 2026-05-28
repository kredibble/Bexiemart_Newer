import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Req, UseGuards, Query } from "@nestjs/common";
import { AuthGuard } from "../../guards/auth.guard";
import { VendorService } from "./vendor.service";
import { OnboardVendorDto } from "./dto/onboard-vendor.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { WithdrawEarningsDto } from "./dto/withdraw-earnings.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Vendor")
@ApiBearerAuth()
@Controller("vendor")
@UseGuards(AuthGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @ApiOperation({ summary: "Get vendor profile" })
  @Get("profile")
  getProfile(@Req() req: any) {
    return this.vendorService.getProfile(req.user.id);
  }

  @ApiOperation({ summary: "Complete vendor onboarding" })
  @Post("onboarding")
  onboard(@Req() req: any, @Body() body: OnboardVendorDto) {
    return this.vendorService.onboard(req.user.id, body);
  }

  @ApiOperation({ summary: "Get vendor stats" })
  @Get("stats")
  getStats(@Req() req: any) {
    return this.vendorService.getStats(req.user.id);
  }

  @ApiOperation({ summary: "List vendor products" })
  @Get("products")
  getProducts(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.vendorService.getProducts(req.user.id, Number(page) || 1, Number(limit) || 20);
  }

  @ApiOperation({ summary: "Create a product" })
  @Post("products")
  createProduct(@Req() req: any, @Body() body: CreateProductDto) {
    return this.vendorService.createProduct(req.user.id, body);
  }

  @ApiOperation({ summary: "Update a product" })
  @Put("products/:id")
  updateProduct(@Req() req: any, @Param("id") id: string, @Body() body: UpdateProductDto) {
    return this.vendorService.updateProduct(req.user.id, id, body);
  }

  @ApiOperation({ summary: "Delete a product" })
  @Delete("products/:id")
  deleteProduct(@Req() req: any, @Param("id") id: string) {
    return this.vendorService.deleteProduct(req.user.id, id);
  }

  @ApiOperation({ summary: "Get vendor orders" })
  @Get("orders")
  getOrders(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.vendorService.getOrders(req.user.id, Number(page) || 1, Number(limit) || 20);
  }

  @ApiOperation({ summary: "Get order details" })
  @Get("orders/:id")
  getOrder(@Req() req: any, @Param("id") id: string) {
    return this.vendorService.getOrder(req.user.id, id);
  }

  @ApiOperation({ summary: "Update order status" })
  @Patch("orders/:id/status")
  updateOrderStatus(@Req() req: any, @Param("id") id: string, @Body() body: UpdateOrderStatusDto) {
    return this.vendorService.updateOrderStatus(req.user.id, id, body.status);
  }

  @ApiOperation({ summary: "Get vendor earnings" })
  @Get("earnings")
  getEarnings(@Req() req: any) {
    return this.vendorService.getEarnings(req.user.id);
  }

  @ApiOperation({ summary: "Get vendor transactions" })
  @Get("earnings/transactions")
  getTransactions(@Req() req: any) {
    return this.vendorService.getTransactions(req.user.id);
  }

  @ApiOperation({ summary: "Get vendor analytics" })
  @Get("earnings/analytics")
  getAnalytics(@Req() req: any) {
    return this.vendorService.getAnalytics(req.user.id);
  }

  @ApiOperation({ summary: "Withdraw vendor earnings" })
  @Post("earnings/withdraw")
  withdraw(@Req() req: any, @Body() body: WithdrawEarningsDto) {
    return this.vendorService.withdrawEarnings(req.user.id, body.amount, body.destination);
  }

  @ApiOperation({ summary: "Update shop details" })
  @Patch("shop")
  updateShop(@Req() req: any, @Body() body: UpdateShopDto) {
    return this.vendorService.updateShop(req.user.id, body);
  }
}
