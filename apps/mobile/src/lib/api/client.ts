import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

import { ENV } from "../../config";

const API_URL = ENV.API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem("bexiemart_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import { useAuthStore } from "../stores/auth-store";

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Not just removing from storage, but updating app state to trigger redirect
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export { apiClient };

