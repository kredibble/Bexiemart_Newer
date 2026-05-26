import type { Transaction, TransactionType } from "@/lib/stores/wallet-store";

export function getTransactionIcon(type: TransactionType | string): string {
  switch (type) {
    case "DEPOSIT": return "arrow-down-left";
    case "WITHDRAWAL": return "arrow-up-right";
    case "ORDER_PAYMENT": return "shopping-bag";
    case "TRANSFER_RECEIVED": return "arrow-down-left";
    case "FEE": return "info";
    default: return "file-text";
  }
}

const PREMIUM_GRADIENTS = [
  ["#1a202c", "#2d3748"], // Midnight Navy
  ["#b91c1c", "#f87171"], // Crimson Red
  ["#075985", "#38bdf8"], // Ocean Blue
  ["#4f2ae8", "#3013a5"], // Deep Purple
  ["#064e3b", "#34d399"], // Emerald Green
  ["#78350f", "#fbbf24"], // Amber Gold
  ["#831843", "#f472b6"], // Rose Pink
  ["#374151", "#9ca3af"], // Slate Gray
] as const;

export function getCardColors(id?: string, type?: string): readonly [string, string, ...string[]] {
  if (!id) {
    // Fallback for Add Screen preview where ID doesn't exist yet
    const t = type?.toLowerCase() || "";
    if (t.includes("visa")) return PREMIUM_GRADIENTS[0];
    if (t.includes("master")) return PREMIUM_GRADIENTS[1];
    if (t.includes("amex")) return PREMIUM_GRADIENTS[2];
    return PREMIUM_GRADIENTS[3];
  }

  // Hash the ID to consistently pick the same unique color for a given card
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PREMIUM_GRADIENTS.length;
  return PREMIUM_GRADIENTS[index];
}

export function getTransactionColors(type: TransactionType | string) {
  switch (type) {
    case "DEPOSIT": case "TRANSFER_RECEIVED":
      return { bg: "#d1fae5", icon: "#059669", text: "text-emerald-600" };
    case "WITHDRAWAL": case "FEE":
      return { bg: "#fee2e2", icon: "#dc2626", text: "text-rose-600" };
    default:
      return { bg: "#f1f5f9", icon: "#64748b", text: "text-muted-foreground" };
  }
}

export function getAmountPrefix(type: TransactionType | string): string {
  switch (type) {
    case "DEPOSIT": case "TRANSFER_RECEIVED": return "+";
    default: return "-";
  }
}

export function isPositiveTransaction(type: TransactionType | string): boolean {
  return type === "DEPOSIT" || type === "TRANSFER_RECEIVED";
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
