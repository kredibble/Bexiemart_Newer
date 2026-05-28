import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import { CouponsService } from "./coupons.service";
import { ValidateCouponDto } from "./dto/validate-coupon.dto";
import { AuthGuard } from "../../guards/auth.guard";
import { Throttle } from "@nestjs/throttler";

@Controller("coupons")
@ApiTags("Coupons")
@UseGuards(AuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @ApiOperation({ summary: "Validate a coupon code" })
  @ApiBody({ type: ValidateCouponDto })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("validate")
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto.code, dto.orderAmount);
  }
}
