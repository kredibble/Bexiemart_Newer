import { Controller, Get, Post, Delete, Param, Body, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../guards/auth.guard";
import { CustomerServicesService } from "./customer-services.service";
import { BookServiceDto } from "./dto/book-service.dto";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";

@ApiTags("Customer Services")
@Controller("services")
@UseGuards(AuthGuard)
export class CustomerServicesController {
  constructor(private readonly service: CustomerServicesService) {}

  @Get()
  @ApiOperation({ summary: "List all services, optionally filtered by category or search" })
  findAll(
    @Query("category") category?: string, 
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.service.findAll(category, search, Number(page) || 1, Number(limit) || 20);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single service by ID" })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post(":id/book")
  @ApiOperation({ summary: "Book a service" })
  @ApiBody({ type: BookServiceDto })
  book(@Req() req: any, @Param("id") id: string, @Body() body: BookServiceDto) {
    return this.service.book(req.user.id, id, body);
  }

  @Get("bookings")
  @ApiOperation({ summary: "List current user's bookings" })
  findMyBookings(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.service.findMyBookings(req.user.id, Number(page) || 1, Number(limit) || 20);
  }

  @Delete("bookings/:id")
  @ApiOperation({ summary: "Cancel a booking by ID" })
  cancel(@Req() req: any, @Param("id") id: string) {
    return this.service.cancel(req.user.id, id);
  }
}
