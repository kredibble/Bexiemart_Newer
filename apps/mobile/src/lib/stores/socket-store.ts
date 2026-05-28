import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth-store';

import { ENV } from "../../config";

const SOCKET_URL = ENV.SOCKET_URL;

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, boolean>;
  offlineMessages: any[];
  connect: () => void;
  disconnect: () => void;
  subscribePresence: (userIds: string[]) => void;
  unsubscribePresence: (userIds: string[]) => void;
  enqueueMessage: (message: any) => void;
  flushOfflineMessages: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: {},
  offlineMessages: [],
  
  connect: () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    
    if (get().socket?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      get().flushOfflineMessages();
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('presence_update', (data: { userId: string; isOnline: boolean }) => {
      set((state) => ({
        onlineUsers: {
          ...state.onlineUsers,
          [data.userId]: data.isOnline,
        },
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, onlineUsers: {} });
    }
  },

  subscribePresence: (userIds: string[]) => {
    const { socket } = get();
    if (socket?.connected && userIds.length > 0) {
      socket.emit('subscribe_presence', { userIds });
    }
  },

  unsubscribePresence: (userIds: string[]) => {
    const { socket } = get();
    if (socket?.connected && userIds.length > 0) {
      socket.emit('unsubscribe_presence', { userIds });
    }
  },

  enqueueMessage: (message: any) => {
    set((state) => ({ offlineMessages: [...state.offlineMessages, message] }));
    const { isConnected } = get();
    if (isConnected) {
      get().flushOfflineMessages();
    }
  },

  flushOfflineMessages: () => {
    const { socket, offlineMessages } = get();
    if (socket?.connected && offlineMessages.length > 0) {
      offlineMessages.forEach((msg) => {
        socket.emit('send_message', msg);
      });
      set({ offlineMessages: [] });
    }
  },


}));
