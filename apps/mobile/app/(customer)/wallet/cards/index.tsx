import { View, Text, Pressable, ActivityIndicator, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { useCards, useDeleteCard, useSetDefaultCard } from "@/lib/hooks/use-wallet";
import { getCardColors } from "@/lib/utils/wallet";
import { LinearGradient } from "expo-linear-gradient";

export default function CardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cards, isLoading } = useCards();
  const deleteCard = useDeleteCard();
  const setDefault = useSetDefaultCard();

  const handleDelete = (id: string) => {
    Alert.alert(
      "Remove Card",
      "Are you sure you want to remove this card?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => deleteCard.mutate(id) 
        }
      ]
    );
  };



  return (
    <View className="flex-1 bg-[#F9FAFB]" style={{ paddingTop: insets.top }}>
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-[#F9FAFB] border-b border-gray-100 z-10">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-gray-200">
          <Icon name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">My Cards</Text>
        <View className="w-10 h-10" />
      </View>
      
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={cards || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-24">
              <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-6 shadow-sm border border-blue-100">
                <Icon name="credit-card" size={32} color="#3B82F6" />
              </View>
              <Text className="text-gray-900 font-bold text-xl">No cards added</Text>
              <Text className="text-gray-500 text-center mt-3 max-w-[240px] leading-relaxed">
                Add a debit or credit card to fund your wallet instantly and securely.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-8">
              {/* Card Face */}
              <View 
                className="rounded-3xl overflow-hidden shadow-lg border border-white/10"
                style={{
                  shadowColor: getCardColors(item.type)[0],
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 10,
                }}
              >
                <LinearGradient
                  colors={getCardColors(item.id, item.type) as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 220, position: 'relative' }}
                >
                  {/* Decorative Elements */}
                  <View className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5" />
                  <View className="absolute -left-12 -bottom-12 w-32 h-32 rounded-full bg-white/5" />

                  {/* Content Wrapper */}
                  <View className="flex-1 p-6 justify-between z-10">
                    {/* Top Row: Chip & Logo */}
                    <View className="flex-row justify-between items-start">
                      <View className="flex-row items-center">
                        <View className="w-11 h-8 bg-yellow-200/90 rounded-md mr-3 border border-yellow-400/50 items-center justify-center overflow-hidden">
                          {/* Fake Chip lines */}
                          <View className="w-full h-full border border-yellow-600/30 absolute rounded-md scale-90" />
                          <View className="w-full h-[1px] bg-yellow-600/30 absolute top-1/2" />
                          <View className="h-full w-[1px] bg-yellow-600/30 absolute left-1/3" />
                          <View className="h-full w-[1px] bg-yellow-600/30 absolute right-1/3" />
                        </View>
                        <Icon name="wifi" size={20} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: '90deg' }] }} />
                      </View>
                      <Text className="text-white font-extrabold text-2xl tracking-wider italic shadow-sm">
                        {item.type.toUpperCase()}
                      </Text>
                    </View>

                    {/* Middle Row: Number */}
                    <View className="mt-4">
                      <Text className="text-white/70 text-[10px] uppercase tracking-[2px] mb-1 font-medium">Card Number</Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-white font-bold text-lg tracking-[4px] mr-2">••••</Text>
                        <Text className="text-white font-bold text-lg tracking-[4px] mr-2">••••</Text>
                        <Text className="text-white font-bold text-lg tracking-[4px] mr-2">••••</Text>
                        <Text className="text-white font-mono text-xl tracking-[2px] font-bold shadow-sm mt-0.5">
                          {item.last4}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Name & Expiry */}
                    <View className="flex-row justify-between items-end mt-4">
                      <View className="flex-1 pr-4">
                        <Text className="text-white/70 text-[10px] uppercase tracking-[2px] mb-1 font-medium">Cardholder Name</Text>
                        <Text className="text-white font-bold text-[15px] tracking-widest uppercase shadow-sm" numberOfLines={1}>
                          {item.cardholderName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white/70 text-[10px] uppercase tracking-[2px] mb-1 font-medium">Valid Thru</Text>
                        <Text className="text-white font-bold text-[15px] tracking-widest shadow-sm">
                          {item.expiryMonth}/{item.expiryYear}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
              
              {/* Action Bar Below Card */}
              <View className="flex-row justify-between items-center mt-4 px-2">
                <View className="flex-row items-center">
                  {item.isDefault ? (
                    <View className="bg-green-100/80 px-4 py-2 rounded-full flex-row items-center border border-green-200">
                      <Icon name="check-circle" size={14} color="#15803D" />
                      <Text className="text-green-800 text-xs font-bold ml-1.5 tracking-wide">Primary Card</Text>
                    </View>
                  ) : (
                    <Pressable 
                      onPress={() => setDefault.mutate(item.id)}
                      className="bg-gray-100 px-4 py-2 rounded-full active:bg-gray-200 border border-gray-200"
                    >
                      <Text className="text-gray-700 text-xs font-bold tracking-wide">Set as Primary</Text>
                    </Pressable>
                  )}
                </View>
                
                <View className="flex-row items-center gap-2">
                  <Pressable 
                    onPress={() => router.push(`/(customer)/wallet/cards/edit/${item.id}`)}
                    className="p-2.5 rounded-full bg-blue-50 active:bg-blue-100 border border-blue-100"
                  >
                    <Icon name="edit-2" size={18} color="#2563EB" />
                  </Pressable>

                  <Pressable 
                    onPress={() => handleDelete(item.id)}
                    className="p-2.5 rounded-full bg-red-50 active:bg-red-100 border border-red-100"
                  >
                    <Icon name="trash-2" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Floating Add Button */}
      <LinearGradient 
        colors={["transparent", "rgba(249, 250, 251, 0.8)", "#F9FAFB"]}
        locations={[0, 0.4, 1]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 40 }}
      >
        <Pressable 
          onPress={() => router.push("/(customer)/wallet/cards/add")}
          style={({ pressed }) => [
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-[#2563EB] w-full rounded-2xl py-4 flex-row items-center justify-center shadow-lg shadow-blue-500/30"
        >
          <Icon name="plus" size={22} color="#fff" />
          <Text className="text-white font-bold text-lg ml-2 tracking-wide">Add New Card</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
