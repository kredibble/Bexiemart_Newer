import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConversations } from "@/lib/hooks/use-chat";

export default function VendorInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: conversations, isLoading, refetch, isRefetching } = useConversations();
  const conversationList = conversations ?? [];

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View 
        className="px-5 pb-4 bg-card border-b border-border flex-row items-center"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <BackButton className="mr-3" />
        <Text className="text-[20px] font-heading font-black text-foreground">
          Inbox
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#004CFF" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={conversationList.length === 0 ? { flexGrow: 1, justifyContent: "center" } : undefined}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {conversationList.length === 0 ? (
            <EmptyState
              iconName="message-square"
              title="No messages yet"
              description="When customers send you messages, they will appear here."
            />
          ) : (
            conversationList.map((chat: any, index: number) => (
              <Pressable 
                key={chat.id}
                onPress={() => router.push(`/(vendor)/inbox/${chat.id}`)}
                className={`flex-row items-center p-4 bg-card border border-border rounded-[16px] mb-3 ${chat.unread ? 'bg-brand-50/50 border-brand-100' : ''}`}
              >
                <View className="w-12 h-12 rounded-full bg-accent items-center justify-center mr-3 relative">
                  <Icon name="user" size={20} color="#64748b" />
                  {chat.unread && <View className="absolute top-0 right-0 w-3 h-3 rounded-full bg-rose-500 border-2 border-card" />}
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className={`text-[15px] font-bold ${chat.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {chat.customer}
                    </Text>
                    <Text className="text-[12px] text-muted-foreground">{chat.time}</Text>
                  </View>
                  <Text className={`text-[13px] ${chat.unread ? 'font-bold text-foreground' : 'text-muted-foreground'}`} numberOfLines={1}>
                    {chat.latestMessage}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
