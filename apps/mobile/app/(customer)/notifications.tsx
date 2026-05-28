import { BackButton } from "@/components/ui/BackButton";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/lib/hooks/use-notifications";

const typeIcons: Record<string, { icon: string; color: string; bg: string }> = {
  order: { icon: "shopping-bag", color: "#004CFF", bg: "#e0e7ff" },
  payment: { icon: "banknote", color: "#059669", bg: "#d1fae5" },
  shipping: { icon: "truck", color: "#d97706", bg: "#fef3c7" },
  promotion: { icon: "percent", color: "#db2777", bg: "#fce7f3" },
  system: { icon: "info", color: "#64748b", bg: "#f1f5f9" },
  review: { icon: "star", color: "#f59e0b", bg: "#ffedd5" },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = (notifications as any[]).filter((n: any) => !n.read).length;

  const markAsRead = (id: string) => {
    markRead.mutate(id);
  };

  const markAllAsRead = () => {
    markAllRead.mutate();
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View 
        className="px-5 pb-3 flex-row items-center justify-between"
        style={{ paddingTop: Math.max(insets.top, 20) + 12 }}
      >
        <View className="flex-row items-center gap-3">
          <BackButton />
          <View>
            <Text className="text-display-sm font-heading font-bold text-foreground">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text className="text-caption text-brand-600 font-bold font-body">
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="px-4 py-2 rounded-full bg-brand-50 border border-brand-100"
            onPress={markAllAsRead}
          >
            <Text className="text-body-sm font-bold text-brand-600 font-body">Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          iconName="bell"
          title="No notifications"
          description="You're all caught up! New notifications will appear here."
        />
      ) : (
        <FlatList
          data={notifications as any[]}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#004CFF" />}
          renderItem={({ item }: { item: any }) => {
            const typeData = typeIcons[item.type] || typeIcons.system;
            return (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className={`flex-row gap-4 p-5 rounded-[24px] border mb-3 ${
                  item.read ? "bg-card border-border" : "bg-brand-50/40 border-brand-100"
                }`}
                
                onPress={() => markAsRead(item.id)}
              >
                <View className={`relative`}>
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: typeData.bg }}>
                    <Icon name={typeData.icon} size={22} color={typeData.color} />
                  </View>
                  {!item.read && (
                    <View className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-600 border-2 border-card" />
                  )}
                </View>

                <View className="flex-1">
                  <Text className={`text-body-sm font-body ${item.read ? "text-muted-foreground font-semibold" : "text-foreground font-bold"}`}>
                    {item.title}
                  </Text>
                  <Text className="text-body-sm text-muted-foreground font-body mt-1 leading-relaxed" numberOfLines={3}>
                    {item.message}
                  </Text>
                  <Text className="text-caption text-muted-foreground font-body mt-2">
                    {item.date}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
