import { apiClient } from "./client";

export interface CardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface CardUpdateData {
  expiryMonth?: string;
  expiryYear?: string;
  isDefault?: boolean;
}

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
  addCard: (data: CardData) => apiClient.post("/wallet/cards", data),
  verifyAndSaveCard: (data: { reference: string }) => apiClient.post("/wallet/cards/verify-save", data),
  updateCard: (id: string, data: CardUpdateData) => apiClient.put(`/wallet/cards/${id}`, data),
  deleteCard: (id: string) => apiClient.delete(`/wallet/cards/${id}`),
  setDefaultCard: (id: string) => apiClient.post(`/wallet/cards/${id}/default`),

  // Bank Accounts
  getBankAccounts: () => apiClient.get("/wallet/bank-accounts"),
  linkBankAccount: (data: { bankCode: string; accountNumber: string; accountName: string; bankName?: string }) =>
    apiClient.post("/wallet/bank-accounts", data),
  deleteBankAccount: (id: string) => apiClient.delete(`/wallet/bank-accounts/${id}`),
  resolveAccount: (bankCode: string, accountNumber: string) =>
    apiClient.get(`/wallet/resolve-account?bankCode=${bankCode}&accountNumber=${accountNumber}`),

  // Mobile Money Accounts
  getMomoAccounts: () => apiClient.get("/wallet/momo-accounts"),
  linkMomoAccount: (data: { provider: string; phoneNumber: string; accountName: string }) =>
    apiClient.post("/wallet/momo-accounts", data),
  deleteMomoAccount: (id: string) => apiClient.delete(`/wallet/momo-accounts/${id}`),
};
