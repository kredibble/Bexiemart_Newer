import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWallet, useTransactions, useCards } from "@/lib/hooks/use-wallet";
import { useWalletStore } from "@/lib/stores/wallet-store";
import {
  getTransactionIcon,
  getTransactionColors,
  getAmountPrefix,
  formatDate,
  getCardColors,
} from "@/lib/utils/wallet";

const QUICK_ACTIONS = [
  { id: "topup", label: "Top Up", icon: "plus", color: "#004CFF", route: "/(customer)/wallet/topup" },
  { id: "send", label: "Send", icon: "send", color: "#7c3aed", route: "/(customer)/wallet/transfer" },
  { id: "cards", label: "Cards", icon: "credit-card", color: "#e11d48", route: "/(customer)/wallet/cards" },
  { id: "request", label: "Request", icon: "arrow-down-left", color: "#059669", route: "/(customer)/wallet/request" },
];

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: walletData, refetch: refetchWallet } = useWallet();
  const { data: txnData, refetch: refetchTxns } = useTransactions();
  const { data: cards, refetch: refetchCards } = useCards();
  const { bexieCoins } = useWalletStore();

  const balance = walletData?.balance ?? 0;
  const currency = walletData?.currency ?? "GHS";
  const transactions = txnData?.data ?? [];
  const defaultCard = cards?.find((c: any) => c.isDefault) || cards?.[0];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchTxns(), refetchCards()]);
    setRefreshing(false);
  }, [refetchWallet, refetchTxns, refetchCards]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
         <View className="px-5 pt-4">
          <View className="mb-8 mt-2 items-center" style={{ height: (cards?.length ?? 0) >= 2 ? 260 : (cards?.length ?? 0) === 1 ? 246 : 220, width: "100%", position: "relative" }}>
            {/* Layer 1: Back-most strip — only show when 2+ cards */}
            {(cards?.length ?? 0) >= 2 && (
              <LinearGradient
                colors={getCardColors(cards[1]?.id, cards[1]?.type) as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ position: "absolute", top: 0, left: "8%", width: "84%", height: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderLeftWidth: 1, borderRightWidth: 1, opacity: 0.7 }}
              />
            )}

            {/* Layer 2: Middle Card — only show when 1+ cards */}
            {(cards?.length ?? 0) >= 1 ? (
              <Pressable 
                onPress={() => router.push("/(customer)/wallet/cards")}
                className="absolute z-10"
                style={{ top: (cards?.length ?? 0) >= 2 ? 14 : 0, left: "4%", width: "92%", height: 130, zIndex: 10, elevation: 10 }}
              >
                <LinearGradient
                  colors={getCardColors(cards[0]?.id, cards[0]?.type) as any}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ 
                    flex: 1,
                    borderTopLeftRadius: 24, borderTopRightRadius: 24, 
                    paddingTop: 18, paddingHorizontal: 22, 
                    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.4)",
                    borderLeftWidth: 1, borderRightWidth: 1
                  }}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-4">
                      <Text className="text-white text-[15px] font-bold tracking-wide" numberOfLines={1}>{cards[0]?.cardholderName}</Text>
                      <Text className="text-white/80 text-[13px] mt-1.5 font-mono tracking-[0.15em]">
                        •••• •••• •••• {cards[0]?.last4}
                      </Text>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center justify-end">
                        <View style={{ transform: [{ rotate: '90deg' }], marginRight: 8, marginTop: 4 }}>
                          <Icon name="wifi" size={16} color="rgba(255,255,255,0.7)" />
                        </View>
                        <Text className="text-white text-[24px] font-black italic tracking-widest">{cards[0]?.type?.toUpperCase() || 'CARD'}</Text>
                      </View>
                      <Text className="text-white/60 text-[9px] mt-0.5 font-bold uppercase tracking-widest">Valid {cards[0]?.expiryMonth}/{cards[0]?.expiryYear?.slice(-2)}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : null}

            {/* Layer 3: Front Pocket (Balance) */}
            <View
              className="z-20"
              style={{
                position: "absolute", top: (cards?.length ?? 0) >= 2 ? 82 : (cards?.length ?? 0) === 1 ? 68 : 42, left: 0, width: "100%", height: 178,
                zIndex: 20, shadowColor: "#2d1b73", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 15
              }}
            >
              <LinearGradient
                colors={["#4f2ae8", "#3013a5"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ 
                  flex: 1, borderRadius: 28, paddingTop: 26, paddingHorizontal: 26, overflow: "hidden",
                  borderTopWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" 
                }}
              >
                {/* Abstract Pattern inside the card */}
                <View className="absolute top-[-50px] right-[-30px] w-[150px] h-[150px] rounded-full bg-white/5" />
                <View className="absolute bottom-[-80px] left-[-20px] w-[200px] h-[200px] rounded-full bg-white/5" />
                
                <View className="mb-6">
                  <Text className="text-white/70 text-[12px] font-bold uppercase tracking-widest mb-1">Total Balance</Text>
                  <View className="flex-row items-baseline">
                    <Text className="text-white text-[44px] font-black tracking-tight" style={{ letterSpacing: -1 }}>
                      {showBalance ? Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "••••••"}
                    </Text>
                    <Text className="text-white/80 text-[18px] font-bold ml-2">{currency}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center absolute bottom-7 left-6 right-6">
                  <Pressable 
                    onPress={() => router.push("/(customer)/wallet/link-account")}
                    className="bg-white/20 px-6 py-3.5 rounded-full flex-row items-center border border-white/10"
                  >
                    <Icon name="link" size={18} color="#fff" />
                    <Text className="text-white font-bold ml-2 tracking-wide">Link Account</Text>
                  </Pressable>
                  
                  <View className="flex-row gap-3">
                    <Pressable 
                      className="bg-white/15 w-[48px] h-[48px] rounded-full items-center justify-center border border-white/10"
                      onPress={onRefresh}
                    >
                      <Icon name="refresh-cw" size={18} color="#fff" />
                    </Pressable>
                    <Pressable 
                      className="bg-white/15 w-[48px] h-[48px] rounded-full items-center justify-center border border-white/10"
                      onPress={() => setShowBalance(!showBalance)}
                    >
                      <Icon name={showBalance ? "eye-off" : "eye"} size={18} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 32, paddingHorizontal: 8 }}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                onPress={() => router.push(action.route as any)}
                style={{ alignItems: "center" }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                    backgroundColor: action.color,
                  }}
                >
                  <Icon name={action.icon} size={24} color="#ffffff" />
                </View>
                <Text className="text-body-sm font-bold text-foreground font-body">{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push("/(customer)/wallet/rewards")}
            className="mb-8"
          >
            <View className="rounded-[24px] shadow-sm overflow-hidden">
              <LinearGradient
                colors={["#f59e0b", "#d97706"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 20, position: "relative" }}
              >
                <View className="absolute right-[-20px] top-[-20px] opacity-10">
                  <Icon name="award" size={120} color="#fff" />
                </View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[14px] font-heading font-bold text-white/90 uppercase tracking-wider">Gold Tier</Text>
                  <View className="bg-card/20 px-3 py-1 rounded-full">
                    <Text className="text-[12px] font-bold text-white">How to earn</Text>
                  </View>
                </View>
                <Text className="text-[28px] font-black text-white font-heading mb-1">{bexieCoins.toLocaleString()}</Text>
                <Text className="text-[14px] text-white/80 font-medium font-body">BexieCoins Available</Text>
              </LinearGradient>
            </View>
          </Pressable>
        </View>

        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[18px] font-heading font-bold text-foreground">
              Recent Activity
            </Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => router.push("/(customer)/wallet/transactions")}>
              <Text className="text-[14px] font-bold text-brand-600 font-body">
                View All
              </Text>
            </Pressable>
          </View>

          {transactions.length === 0 ? (
            <View className="bg-card p-6 rounded-[24px] border border-border">
              <EmptyState
                iconName="file-text"
                title="No transactions yet"
                description="Your activity will appear here after your first transaction"
              />
            </View>
          ) : (
            <View className="bg-card rounded-[24px] border border-border overflow-hidden">
              {transactions.slice(0, 5).map((tx: any, index: number) => {
                const colors = getTransactionColors(tx.type);
                const prefix = getAmountPrefix(tx.type);
                const isPositive = prefix === "+";
                const isLast = index === Math.min(transactions.length, 5) - 1;

                return (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    key={tx.id}
                    className={`flex-row items-center p-4 ${!isLast ? "border-b border-border" : ""}`}
                    onPress={() => router.push(`/(customer)/wallet/transaction/${tx.id}`)}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.bg }}>
                      <Icon name={getTransactionIcon(tx.type)} size={18} color={colors.icon} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-foreground font-body" numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text className="text-[12px] text-muted-foreground font-body mt-0.5">
                        {formatDate(tx.createdAt ?? tx.date)}
                      </Text>
                    </View>
                    <Text className={`text-[15px] font-bold font-heading ${isPositive ? "text-emerald-600" : "text-foreground"}`}>
                      {prefix} {currency} {Number(tx.amount || tx.netAmount).toFixed(2)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
