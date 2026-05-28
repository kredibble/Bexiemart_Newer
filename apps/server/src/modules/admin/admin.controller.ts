import { Controller, Get, Patch, Put, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import { AuthGuard } from "../../guards/auth.guard";
import { AdminGuard } from "../../guards/admin.guard";
import { AdminService } from "./admin.service";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { UpdateConfigDto } from "./dto/update-config.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Users ─────────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List all users" })
  @Get("users")
  listUsers(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.adminService.listUsers(Number(page) || 1, Number(limit) || 20);
  }

  @ApiOperation({ summary: "Get user by ID" })
  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return this.adminService.getUser(id);
  }

  @ApiOperation({ summary: "Update user role" })
  @ApiBody({ type: UpdateRoleDto })
  @Patch("users/:id/role")
  updateUserRole(@Param("id") id: string, @Body() body: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, body.role);
  }

  // ─── Vendors ───────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List all vendors" })
  @Get("vendors")
  listVendors(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.adminService.listVendors(Number(page) || 1, Number(limit) || 20);
  }

  @ApiOperation({ summary: "Approve a vendor" })
  @Patch("vendors/:id/approve")
  approveVendor(@Param("id") id: string) {
    return this.adminService.approveVendor(id);
  }

  @ApiOperation({ summary: "Suspend a vendor" })
  @Patch("vendors/:id/suspend")
  suspendVendor(@Param("id") id: string) {
    return this.adminService.suspendVendor(id);
  }

  // ─── Platform Config ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: "Get platform config" })
  @Get("config")
  getConfig() {
    return this.adminService.getConfig();
  }

  @ApiOperation({ summary: "Update platform config" })
  @ApiBody({ type: UpdateConfigDto })
  @Put("config")
  updateConfig(@Body() body: UpdateConfigDto) {
    return this.adminService.updateConfig(body);
  }

  // ─── Orders Oversight ──────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List orders" })
  @Get("orders")
  listOrders(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminService.listOrders(status, Number(page) || 1, Number(limit) || 20);
  }

  @ApiOperation({ summary: "Get order by ID" })
  @Get("orders/:id")
  getOrder(@Param("id") id: string) {
    return this.adminService.getOrder(id);
  }

  @ApiOperation({ summary: "Update order status" })
  @ApiBody({ type: UpdateOrderStatusDto })
  @Patch("orders/:id/status")
  updateOrderStatus(@Param("id") id: string, @Body() body: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, body.status);
  }
}
