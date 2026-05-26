import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { useState, useEffect } from "react";
import { useUpdateCard, useCards, WALLET_KEYS } from "@/lib/hooks/use-wallet";
import { getCardColors } from "@/lib/utils/wallet";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

export default function EditCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const insets = useSafeAreaInsets();
  
  const { data: cards, isLoading: cardsLoading } = useCards();
  const updateCard = useUpdateCard();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  // To display but not edit
  const [cardType, setCardType] = useState("CARD");
  const [last4, setLast4] = useState("");

  useEffect(() => {
    if (cards && cards.length > 0) {
      const card = cards.find(c => c.id === id);
      if (card) {
        setName(card.cardholderName || "");
        setExpiry(`${card.expiryMonth}/${card.expiryYear.slice(-2)}`);
        setIsDefault(card.isDefault || false);
        setCardType(card.type || "CARD");
        setLast4(card.last4 || "");
      }
    }
  }, [cards, id]);

  const handleSave = () => {
    if (!name || expiry.length < 5) {
      Alert.alert("Error", "Please fill out all fields correctly.");
      return;
    }

    const [expiryMonth, expiryYearRaw] = expiry.split("/");
    const expiryYear = expiryYearRaw.length === 2 ? "20" + expiryYearRaw : expiryYearRaw;

    updateCard.mutate({
      id,
      data: {
        cardholderName: name,
        expiryMonth,
        expiryYear,
        isDefault
      }
    }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: WALLET_KEYS.cards });
        router.back();
      },
      onError: (err: any) => {
        const serverMessage = err.response?.data?.message;
        const msg = Array.isArray(serverMessage) ? serverMessage.join(", ") : serverMessage;
        Alert.alert("Error", msg || err?.message || "Failed to update card");
      }
    });
  };

  if (cardsLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50" 
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-gray-50 z-10">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-gray-200">
          <Icon name="arrow-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Edit Card</Text>
        <View className="w-10 h-10" />
      </View>
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Dynamic Card Preview */}
        <View className="px-5 mb-8 mt-2">
          <View style={{ height: 200, width: "100%", elevation: 15, shadowColor: "#4f2ae8", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
            <LinearGradient
              colors={getCardColors(id, cardType)}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: 24, padding: 24, justifyContent: 'space-between', overflow: 'hidden' }}
            >
              {/* Abstract decorative elements */}
              <View className="absolute top-[-50px] right-[-30px] w-[150px] h-[150px] rounded-full bg-white/5" />
              <View className="absolute bottom-[-80px] left-[-20px] w-[200px] h-[200px] rounded-full bg-white/5" />
              
              <View className="flex-row justify-between items-start">
                <Icon name="credit-card" size={28} color="rgba(255,255,255,0.8)" />
                <View className="flex-row items-center">
                  {cardType === 'VISA' && (
                    <View style={{ transform: [{ rotate: '90deg' }], marginRight: 8 }}>
                      <Icon name="wifi" size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                  <Text className="text-white text-[22px] font-black italic tracking-widest">{cardType}</Text>
                </View>
              </View>

              <View>
                <Text className="text-white/80 text-[20px] font-mono tracking-[0.15em] mb-4">
                  •••• •••• •••• {last4}
                </Text>
                
                <View className="flex-row justify-between items-end">
                  <View>
                    <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Cardholder Name</Text>
                    <Text className="text-white text-[15px] font-bold tracking-wide" numberOfLines={1}>
                      {name ? name.toUpperCase() : "YOUR NAME"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Expiry</Text>
                    <Text className="text-white text-[14px] font-bold tracking-wide">{expiry || "MM/YY"}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View className="px-5">
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            <View className="mb-5">
              <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Cardholder Name</Text>
              <View className="bg-gray-50 flex-row items-center rounded-2xl px-4 border border-gray-200">
                <Icon name="user" size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-gray-900 font-medium"
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Card Number (Cannot be edited)</Text>
              <View className="bg-gray-100 flex-row items-center rounded-2xl px-4 border border-gray-200">
                <Icon name="credit-card" size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-gray-400 font-medium font-mono"
                  value={`•••• •••• •••• ${last4}`}
                  editable={false}
                />
              </View>
            </View>

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Expiry Date</Text>
                <View className="bg-gray-50 flex-row items-center rounded-2xl px-4 border border-gray-200">
                  <Icon name="calendar" size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-gray-900 font-medium font-mono"
                    placeholder="MM/YY"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={5}
                    value={expiry}
                    onChangeText={(text) => {
                      if (text.length === 2 && !text.includes('/') && expiry.length === 1) {
                        setExpiry(text + "/");
                      } else {
                        setExpiry(text);
                      }
                    }}
                  />
                </View>
              </View>
            </View>

            <Pressable 
              onPress={() => setIsDefault(!isDefault)} 
              className="flex-row items-center mb-6 pl-1"
            >
              <View className={`w-6 h-6 rounded-md items-center justify-center border mr-3 ${isDefault ? 'bg-brand-600 border-brand-600' : 'border-gray-300 bg-gray-50'}`}>
                {isDefault && <Icon name="check" size={14} color="#fff" />}
              </View>
              <Text className="text-gray-700 font-medium">Set as default card</Text>
            </Pressable>

            <Pressable 
              onPress={handleSave}
              disabled={updateCard.isPending}
              className={`w-full rounded-2xl py-4 flex-row justify-center items-center ${updateCard.isPending ? 'bg-brand-400' : 'bg-brand-600'}`}
              style={{ shadowColor: "#4f2ae8", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
            >
              {updateCard.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="save" size={18} color="#fff" />
                  <Text className="text-white font-bold text-base ml-2 tracking-wide">Save Changes</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
