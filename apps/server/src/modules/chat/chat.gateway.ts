import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UnauthorizedException, Logger } from "@nestjs/common";
import { auth } from "../../auth/better-auth";
import { ChatService } from "./chat.service";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({ namespace: "/chat" })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private logger = new Logger("ChatGateway");
  
  // Track active socket IDs per user
  private userSockets = new Map<string, Set<string>>();
  
  // Rate limiting for messages
  private messageRateLimits = new Map<string, number[]>();

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        client.emit("error", "Missing authentication token");
        client.disconnect();
        return;
      }
      const headers = new Headers();
      headers.set("cookie", `better-auth.session_token=${token}`);
      const session = await auth.api.getSession({ headers });
      if (!session?.user) {
        client.emit("error", "Invalid session");
        client.disconnect();
        return;
      }
      const userId = session.user.id;
      client.userId = userId;
      client.join(`user:${userId}`);

      // Presence tracking
      let sockets = this.userSockets.get(userId);
      if (!sockets) {
        sockets = new Set();
        this.userSockets.set(userId, sockets);
      }
      sockets.add(client.id);

      if (sockets.size === 1) {
        // User just came online
        this.server.to(`presence:${userId}`).emit("presence_update", { userId, isOnline: true });
      }

    } catch {
      client.emit("error", "Authentication failed");
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
          // User went offline
          this.server.to(`presence:${client.userId}`).emit("presence_update", { userId: client.userId, isOnline: false });
        }
      }
    }
  }

  // Get current online status immediately (helpful for REST fallback too)
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  @SubscribeMessage("subscribe_presence")
  async handleSubscribePresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    if (!client.userId || !data.userIds) return;
    
    // Join a presence room for each user
    data.userIds.forEach(id => {
      client.join(`presence:${id}`);
      // Emit current status immediately to this client
      client.emit("presence_update", { userId: id, isOnline: this.isUserOnline(id) });
    });
  }

  @SubscribeMessage("unsubscribe_presence")
  async handleUnsubscribePresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    if (!client.userId || !data.userIds) return;
    data.userIds.forEach(id => {
      client.leave(`presence:${id}`);
    });
  }

  @SubscribeMessage("join_conversation")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage("leave_conversation")
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content?: string; type?: 'TEXT' | 'IMAGE'; mediaUrl?: string },
  ) {
    if (!client.userId) return;

    // Rate limiting: max 30 messages per minute per user
    const now = Date.now();
    const window = 60000;
    const limit = 30;
    let timestamps = this.messageRateLimits.get(client.userId) || [];
    timestamps = timestamps.filter(t => now - t < window);
    if (timestamps.length >= limit) {
      client.emit("error", "Rate limit exceeded. Please wait.");
      return;
    }
    timestamps.push(now);
    this.messageRateLimits.set(client.userId, timestamps);

    const message = await this.chatService.createMessage(
      data.conversationId,
      client.userId,
      data.content,
      data.type,
      data.mediaUrl
    );
    this.server.to(`conversation:${data.conversationId}`).emit("new_message", message);
    
    // Also emit to the participants personal rooms in case they aren't actively in the conversation screen
    // so their app can show a push notification or update the unread count
    const conv = await this.chatService.getConversation(data.conversationId, client.userId);
    conv.participants.forEach(p => {
      if (p.userId !== client.userId) {
        this.server.to(`user:${p.userId}`).emit("message_notification", {
          conversationId: data.conversationId,
          message
        });
      }
    });

    return message;
  }

  @SubscribeMessage("message_read")
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;
    await this.chatService.markAsRead(data.conversationId, client.userId);
    // Broadcast that this user has read the conversation up to now
    this.server.to(`conversation:${data.conversationId}`).emit("read_receipt", {
      conversationId: data.conversationId,
      userId: client.userId,
      readAt: new Date(),
    });
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!client.userId) return;
    client.to(`conversation:${data.conversationId}`).emit("typing", {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }
}
