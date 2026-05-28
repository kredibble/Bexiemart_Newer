import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/lib/hooks/use-notifications";

export default function VendorNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const notifList = notifications ?? [];

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View 
        className="px-5 pb-4 bg-card border-b border-border flex-row items-center justify-between"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <View className="flex-row items-center">
          <BackButton className="mr-3" />
          <Text className="text-[20px] font-heading font-black text-foreground">
            Notifications
          </Text>
        </View>
        <Pressable onPress={() => markAllRead.mutate()}>
          <Text className="text-[13px] font-bold text-brand-600">Mark all as read</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#004CFF" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={notifList.length === 0 ? { flexGrow: 1, justifyContent: "center" } : undefined}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {notifList.length === 0 ? (
            <EmptyState
              iconName="bell"
              title="No notifications"
              description="You're all caught up! New notifications will appear here."
            />
          ) : (
            notifList.map((notif: any) => (
              <Pressable 
                key={notif.id}
                onPress={() => { if (notif.unread) markRead.mutate(notif.id); }}
                className={`flex-row items-start p-4 bg-card border border-border rounded-[16px] mb-3 ${notif.unread ? 'bg-brand-50/30' : ''}`}
              >
                <View 
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: notif.bg }}
                >
                  <Icon name={notif.icon} size={20} color={notif.color} />
                </View>
                <View className="flex-1 pr-2">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className={`text-[15px] ${notif.unread ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                      {notif.title}
                    </Text>
                  </View>
                  <Text className={`text-[13px] leading-relaxed mb-1 ${notif.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notif.desc}
                  </Text>
                  <Text className="text-[12px] text-muted-foreground">{notif.time}</Text>
                </View>
                {notif.unread && (
                  <View className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1.5" />
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
