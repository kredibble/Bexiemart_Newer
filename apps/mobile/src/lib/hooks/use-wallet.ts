import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "../api/wallet";

export const WALLET_KEYS = {
  wallet: ["wallet"] as const,
  transactions: (page?: number) => ["transactions", page] as const,
  pinStatus: ["wallet", "pin", "status"] as const,
  cards: ["wallet", "cards"] as const,
};

export function useWallet() {
  return useQuery({
    queryKey: WALLET_KEYS.wallet,
    queryFn: () => walletApi.getWallet().then((r) => r.data),
  });
}

export function useTransactions(page: number = 1) {
  return useQuery({
    queryKey: WALLET_KEYS.transactions(page),
    queryFn: () => walletApi.getTransactions(page).then((r) => r.data),
  });
}

export function useTopUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ amount, channel }: { amount: number; channel: string }) =>
      walletApi.initializeTopUp(amount, channel).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.wallet });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, amount, pin }: { email: string; amount: number; pin: string }) =>
      walletApi.transfer(email, amount, pin).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.wallet });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function usePinStatus() {
  return useQuery({
    queryKey: WALLET_KEYS.pinStatus,
    queryFn: () => walletApi.getPinStatus().then((r) => r.data),
  });
}

export function useSetPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pin: string) => walletApi.setPin(pin).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.pinStatus }),
  });
}

export function useChangePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ currentPin, newPin }: { currentPin: string; newPin: string }) =>
      walletApi.changePin(currentPin, newPin).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.pinStatus }),
  });
}

export function useVerifyPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pin: string) => walletApi.verifyPin(pin).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.pinStatus }),
  });
}

export function useResetPinFailures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => walletApi.resetPinFailures().then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.pinStatus }),
  });
}

export function useCards() {
  return useQuery({
    queryKey: WALLET_KEYS.cards,
    queryFn: () => walletApi.getCards().then((r) => r.data),
  });
}

export function useAddCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => walletApi.addCard(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.cards }),
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => walletApi.updateCard(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.cards }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => walletApi.deleteCard(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.cards }),
  });
}

export function useSetDefaultCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => walletApi.setDefaultCard(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WALLET_KEYS.cards }),
  });
}
