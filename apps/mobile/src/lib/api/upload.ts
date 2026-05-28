import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

const getToken = async () => {
  if (isWeb) return localStorage.getItem("bexiemart_token");
  return await SecureStore.getItemAsync("bexiemart_token");
};

import { ENV } from "../../config";

const API_URL = ENV.API_URL;

export const uploadApi = {
  uploadFile: async (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append("file", file as any);

    const token = await getToken();
    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<{ url: string; filename: string }>;
  },
};
