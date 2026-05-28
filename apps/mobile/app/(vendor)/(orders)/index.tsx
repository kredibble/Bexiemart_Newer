import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useVendorOrders } from "@/lib/hooks/use-vendor";
import { EmptyState } from "@/components/ui/EmptyState";

const FILTERS = ["New", "Processing", "Ready", "Completed", "Cancelled"];

export default function OrdersManagerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("New");

  const { data: orders = [], isLoading, refetch } = useVendorOrders();
  const filteredOrders = orders.filter((o: any) => o.status === activeFilter);
  const counts: Record<string, number> = {};
  orders.forEach((o: any) => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-700";
      case "Processing": return "bg-amber-100 text-amber-700";
      case "Ready": return "bg-indigo-100 text-indigo-700";
      case "Completed": return "bg-green-100 text-green-700";
      case "Cancelled": return "bg-rose-100 text-rose-700";
      default: return "bg-accent text-muted-foreground";
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 bg-card border-b border-border">
        <Text className="text-[28px] font-heading font-black text-foreground">
          Orders
        </Text>
      </View>

      {/* Filters */}
      <View className="bg-card border-b border-border">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-5 py-3"
          contentContainerClassName="gap-2 pr-10"
        >
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter;
            const count = counts[filter] || 0;
            
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`flex-row items-center px-4 py-2 rounded-full border ${isActive ? 'bg-foreground border-surface-900' : 'bg-card border-border'}`}
              >
                <Text className={`text-[13px] font-bold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                  {filter}
                </Text>
                {count > 0 && (
                  <View className={`ml-2 px-1.5 py-0.5 rounded-full ${isActive ? 'bg-card/20' : 'bg-muted'}`}>
                    <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pb-24 pt-6 gap-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#004CFF" />
          </View>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            iconName="package"
            title={`No ${activeFilter.toLowerCase()} orders`}
            description="When you get an order, it will appear here."
          />
        ) : (
          filteredOrders.map((order: any) => {
            const statusClasses = getStatusColor(order.status).split(' ');
            const bgClass = statusClasses[0];
            const textClass = statusClasses[1];

            return (
              <Pressable
                key={order.id}
                onPress={() => router.push(`/(vendor)/(orders)/${order.id}`)}
                className="bg-card rounded-[20px] border border-border overflow-hidden"
              >
                <View className="p-5 border-b border-border flex-row justify-between items-start">
                  <View>
                    <Text className="text-[16px] font-bold text-foreground mb-1">{order.id}</Text>
                    <Text className="text-[13px] text-muted-foreground">{order.time}</Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full ${bgClass}`}>
                    <Text className={`text-[11px] font-bold ${textClass}`}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View className="px-5 py-4 flex-row justify-between items-center bg-background/50">
                  <View>
                    <Text className="text-[14px] font-bold text-foreground">{order.customer}</Text>
                    <Text className="text-[13px] text-muted-foreground">{order.items} {order.items === 1 ? 'item' : 'items'}</Text>
                  </View>
                  <Text className="text-[16px] font-black text-brand-600">GHS {order.total.toFixed(2)}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}