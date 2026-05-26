import { Controller, Get, Post, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { AuthGuard } from "../../guards/auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
@ApiTags("Notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: "Get all notifications" })
  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.id);
  }

  @ApiOperation({ summary: "Get unread notification count" })
  @Get("unread-count")
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiParam({ name: "id", type: "string" })
  @Post(":id/read")
  markAsRead(@Req() req: any, @Param("id") id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @ApiOperation({ summary: "Mark all notifications as read" })
  @Post("read-all")
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
