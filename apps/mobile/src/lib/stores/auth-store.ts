import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

const storage = {
  getItem: async (key: string) => {
    if (isWeb) return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (isWeb) localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (isWeb) localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  }
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, token) => {
    await storage.setItem("bexiemart_token", token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => {
    set({ user });
  },

  logout: async () => {
    await storage.removeItem("bexiemart_token");
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: async () => {
    try {
      const token = await storage.getItem("bexiemart_token");
      if (token) {
        set({ token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
