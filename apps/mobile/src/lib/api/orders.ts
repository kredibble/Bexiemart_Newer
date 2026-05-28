import { apiClient } from "./client";

export interface Address {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface OrderCreateData {
  shippingAddress: Address;
  items?: OrderItem[];
}

export const ordersApi = {
  create: (data: OrderCreateData) =>
    apiClient.post("/orders", data),

  getAll: () => apiClient.get("/orders"),

  getOne: (id: string) => apiClient.get(`/orders/${id}`),

  cancel: (id: string) => apiClient.post(`/orders/${id}/cancel`),
};
