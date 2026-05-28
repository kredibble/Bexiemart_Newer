import { BackButton } from "@/components/ui/BackButton";
import { View, Text, FlatList, ScrollView, Pressable, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import Toast from "@/lib/toast-polyfill";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useOrders } from "@/lib/hooks/use-orders";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  processing: { label: "Processing", color: "#d97706", bg: "#fef3c7", icon: "loader" },
  shipped: { label: "Shipped", color: "#004CFF", bg: "#e0e7ff", icon: "truck" },
  delivered: { label: "Delivered", color: "#059669", bg: "#d1fae5", icon: "check-circle" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2", icon: "x-circle" }
};

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all"); // all, active, past
  const { data: orders = [], isPending, isError, refetch } = useOrders();

  const filteredOrders = (orders as any[]).filter((order: any) => {
    if (filter === "all") return true;
    if (filter === "active") return ["processing", "shipped"].includes(order.status);
    if (filter === "past") return ["delivered", "cancelled"].includes(order.status);
    return true;
  });

  if (isPending) {
    return <LoadingState message="Loading your orders..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load orders." onRetry={refetch} />;
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View 
        className="px-5 pb-4 bg-card border-b border-border"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <View className="flex-row items-center gap-3">
          <BackButton />
          <Text className="text-[20px] font-heading font-black text-foreground">
            Order History
          </Text>
        </View>

        {/* Filters */}
        <View className="flex-row mt-6 gap-3">
          {["all", "active", "past"].map((f) => (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              key={f}
              onPress={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-full border ${
                filter === f 
                  ? "bg-foreground border-surface-900" 
                  : "bg-card border-border"
              }`}
            >
              <Text 
                className={`text-[14px] font-bold capitalize ${
                  filter === f ? "text-white" : "text-muted-foreground"
                }`}
              >
                {f} Orders
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            iconName="package"
            title="No orders found"
            description="You don't have any orders matching this filter."
            actionLabel="Start Shopping"
            onAction={() => router.push("/(customer)/(shop)")}
          />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#004CFF" />}
          renderItem={({ item }) => {
            const status = statusConfig[item.status];
            
            return (
              <Pressable 
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                className="bg-card p-5 rounded-[24px] border border-border shadow-[0_10px_20px_rgba(0,0,0,0.03)] mb-4"
                onPress={() => {
                  if (item.status !== 'delivered' && item.status !== 'cancelled') {
                    router.push("/(customer)/track-order");
                  } else {
                    Toast.show({ type: "info", text1: "Reorder", text2: "Reorder functionality coming soon." });
                  }
                }}
              >
                {/* Order Header */}
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text className="text-[14px] font-heading font-bold text-foreground">
                      Order #{item.id}
                    </Text>
                    <Text className="text-body-sm font-body text-muted-foreground mt-0.5">
                      {item.date}
                    </Text>
                  </View>
                  <View 
                    className="flex-row items-center px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: status.bg }}
                  >
                    <Icon name={status.icon} size={12} color={status.color} />
                    <Text 
                      className="text-[12px] font-bold ml-1.5"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                {/* Items */}
                <View className="bg-background p-4 rounded-[16px] mb-4">
                  {item.items.map((cartItem: any, idx: number) => (
                    <View key={idx} className={`flex-row justify-between items-center ${idx !== item.items.length - 1 ? "mb-2" : ""}`}>
                      <Text className="text-[14px] font-body font-medium text-muted-foreground flex-1" numberOfLines={1}>
                        {cartItem.qty}x {cartItem.name}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Footer */}
                <View className="flex-row justify-between items-center pt-2">
                  <View>
                    <Text className="text-caption font-body text-muted-foreground mb-0.5">Total Amount</Text>
                    <Text className="text-[16px] font-heading font-black text-brand-600">
                      GHS {item.total.toFixed(2)}
                    </Text>
                  </View>
                  
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                    className="bg-brand-50 px-5 py-2.5 rounded-full"
                    onPress={() => {
                      if (item.status !== 'delivered' && item.status !== 'cancelled') {
                        router.push("/(customer)/track-order");
                      } else {
                        Toast.show({ type: "info", text1: "Reorder", text2: "Reorder functionality coming soon." });
                      }
                    }}
                  >
                    <Text className="text-[14px] font-bold text-brand-600">
                      {item.status === 'delivered' ? 'Reorder' : 'Track'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
