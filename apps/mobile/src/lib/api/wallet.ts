import { apiClient } from "./client";

export const walletApi = {
  getWallet: () => apiClient.get("/wallet"),
  getTransactions: (page = 1) => apiClient.get(`/wallet/transactions?page=${page}`),
  initializeTopUp: (amount: number, channel: string) => apiClient.post("/wallet/topup/initialize", { amount, channel }),
  verifyTopUp: (reference: string) => apiClient.get(`/wallet/topup/verify/${reference}`),
  transfer: (recipientEmail: string, amount: number, pin: string) => apiClient.post("/wallet/transfer", { recipientEmail, amount, pin }),
  setPin: (pin: string) => apiClient.post("/wallet/pin", { pin }),
  changePin: (currentPin: string, newPin: string) => apiClient.post("/wallet/pin/change", { currentPin, newPin }),
  verifyPin: (pin: string) => apiClient.post("/wallet/pin/verify", { pin }),
  resetPinFailures: () => apiClient.post("/wallet/pin/reset"),
  getPinStatus: () => apiClient.get("/wallet/pin/status"),
  getCards: () => apiClient.get("/wallet/cards"),
  addCard: (data: any) => apiClient.post("/wallet/cards", data),
  updateCard: (id: string, data: any) => apiClient.put(`/wallet/cards/${id}`, data),
  deleteCard: (id: string) => apiClient.delete(`/wallet/cards/${id}`),
  setDefaultCard: (id: string) => apiClient.post(`/wallet/cards/${id}/default`),
};
