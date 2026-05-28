import { BackButton } from "@/components/ui/BackButton";
import { View, Text, FlatList, type ListRenderItemInfo, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTransactions } from "@/lib/hooks/use-wallet";
import { Transaction } from "@/lib/stores/wallet-store";
import {
  getTransactionIcon,
  getTransactionColors,
  getAmountPrefix,
  formatDateTime,
} from "@/lib/utils/wallet";

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useTransactions();
  const transactions = data?.transactions ?? data ?? [];
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  const filteredTransactions = transactions.filter((tx: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'IN') return tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_RECEIVED';
    if (filter === 'OUT') return tx.type === 'WITHDRAWAL' || tx.type === 'ORDER_PAYMENT' || tx.type === 'FEE';
    return true;
  });

  const renderTransaction = ({ item: tx }: ListRenderItemInfo<Transaction>) => {
    const colors = getTransactionColors(tx.type);
    const prefix = getAmountPrefix(tx.type);
    const isPositive = prefix === "+";

    return (
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        className="flex-row items-center p-5 bg-card border-b border-border active:bg-background"
        onPress={() => router.push(`/(customer)/wallet/transaction/${tx.id}`)}
      >
        <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.bg }}>
          <Icon name={getTransactionIcon(tx.type)} size={20} color={colors.icon} />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-body-sm font-bold text-foreground font-body" numberOfLines={1}>
            {tx.description}
          </Text>
          <Text className="text-caption text-muted-foreground font-body mt-0.5">
            {formatDateTime(tx.date)}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-body-md font-bold font-heading ${isPositive ? "text-emerald-600" : "text-foreground"}`}>
            {prefix} GHS {tx.amount.toFixed(2)}
          </Text>
          <Text className={`text-caption font-bold mt-1 ${tx.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-500'}`}>
            {tx.status}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="px-5 pb-4 bg-card border-b border-border"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <BackButton className="w-10 h-10 rounded-full bg-background items-center justify-center" color="#0f172a" />
            <Text className="text-[20px] font-heading font-black text-foreground">
              Transactions
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          {['ALL', 'IN', 'OUT'].map((f) => (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              key={f}
              onPress={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full border ${filter === f ? 'bg-foreground border-surface-900' : 'bg-card border-border'}`}
            >
              <Text className={`text-[14px] font-bold ${filter === f ? 'text-white' : 'text-muted-foreground'}`}>
                {f === 'ALL' ? 'All Activity' : f === 'IN' ? 'Money In' : 'Money Out'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#004CFF" />
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View className="flex-1 px-5 pt-8">
          <EmptyState
            iconName="file-text"
            title="No transactions found"
            description={filter === 'ALL' ? "Your activity will appear here." : `You have no ${filter === 'IN' ? 'incoming' : 'outgoing'} transactions.`}
          />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        />
      )}
    </View>
  );
}
