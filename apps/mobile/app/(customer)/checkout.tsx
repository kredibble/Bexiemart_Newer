import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { useCart } from "@/lib/hooks/use-cart";
import { useCreateOrder } from "@/lib/hooks/use-orders";
import { useAddresses } from "@/lib/hooks/use-addresses";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import Toast from "@/lib/toast-polyfill";
import type { Href } from "expo-router";

type DeliveryMethod = "standard" | "express";
type PaymentMethod = "card" | "momo" | "wallet";

interface CartItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: addresses } = useAddresses();
  const createOrder = useCreateOrder();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [instructions, setInstructions] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [useBexieCoins, setUseBexieCoins] = useState(false);
  
  const { balance, bexieCoins } = useWalletStore();

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum: number, i: CartItemData) => sum + i.price * i.quantity, 0);
  const deliveryFee = deliveryMethod === "express" ? 12.00 : 5.00;
  const discount = useBexieCoins ? 10.00 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  if (cartLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <Text className="text-body-md text-muted-foreground font-body">Loading cart...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-card items-center justify-center gap-4 px-8">
        <View className="w-24 h-24 rounded-full bg-muted items-center justify-center">
          <Icon name="shopping-bag" size={36} color="#94a3b8" />
        </View>
        <Text className="text-display-sm font-heading font-bold text-foreground text-center">Nothing to checkout</Text>
        <Text className="text-body-md text-muted-foreground font-body text-center">Your cart is empty. Add items first.</Text>
        <Button title="Go to Shop" size="lg" onPress={() => router.replace("/(customer)/(shop)")} />
      </View>
    );
  }

  const handlePlaceOrder = () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      Toast.show({ type: "error", text1: "Missing Info", text2: "Please fill in all delivery details." });
      return;
    }
    if (phone.trim().length < 10) {
      Toast.show({ type: "error", text1: "Invalid Phone", text2: "Enter a valid phone number." });
      return;
    }
    if (paymentMethod === "wallet" && balance < total) {
      Toast.show({ type: "error", text1: "Insufficient Funds", text2: "Your wallet balance is too low." });
      return;
    }

    createOrder.mutate({
      ...({
        shippingAddress: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          instructions: instructions.trim(),
        },
        paymentMethod,
        useBexieCoins,
        items: items.map((i: CartItemData) => ({ productId: i.productId, quantity: i.quantity })),
      } as any),
      deliveryMethod,
    }, {
      onSuccess: (order) => {
        router.push({
          pathname: "/(customer)/checkout-success",
          params: {
            orderId: order?.id ?? order?._id ?? "",
            paymentMethod,
            deliveryMethod,
            useBexieCoins: useBexieCoins ? "true" : "false",
          }
        });
      },
      onError: (err: any) => {
        Toast.show({ type: "error", text1: "Order Failed", text2: err?.message ?? "Something went wrong." });
      },
    });
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center gap-3">
        <BackButton />
        <Text className="text-display-sm font-heading font-bold text-foreground">
          Checkout
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8" keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>

      {/* Delivery Details */}
      <View className="px-5 mt-4">
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-7 h-7 rounded-full bg-brand-600 items-center justify-center">
            <Icon name="map-pin" size={14} color="#fff" />
          </View>
          <Text className="text-heading-sm font-heading font-bold text-foreground">
            Delivery Details
          </Text>
        </View>

        <View className="gap-4 bg-card rounded-[24px] p-5 border border-border">
          <Input label="Full name" placeholder="Kofi Mensah" value={name} onChangeText={setName} autoCapitalize="words" />
          <Input label="Phone number" placeholder="024 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" leftIcon={<Icon name="phone" size={16} color="#94A3B8" />} />
          <Input label="Delivery address" placeholder="Legon Hall, Room 12" value={address} onChangeText={setAddress} leftIcon={<Icon name="map-pin" size={16} color="#94A3B8" />} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input label="City" placeholder="Accra" value={city} onChangeText={setCity} />
            </View>
          </View>
          <Input label="Instructions (optional)" placeholder="Gate code, floor number..." value={instructions} onChangeText={setInstructions} />
        </View>
      </View>

      {/* Delivery Method */}
      <View className="px-5 mt-6">
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-7 h-7 rounded-full bg-accent-600 items-center justify-center">
            <Icon name="truck" size={14} color="#fff" />
          </View>
          <Text className="text-heading-sm font-heading font-bold text-foreground">
            Delivery Method
          </Text>
        </View>

        <View className="gap-3">
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`flex-row items-center gap-4 p-5 rounded-[24px] border ${
              deliveryMethod === "standard" ? "border-brand-600 bg-brand-50/30" : "border-border bg-card"
            }`}
            onPress={() => setDeliveryMethod("standard")}
          >
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${deliveryMethod === "standard" ? "border-brand-600" : "border-surface-300"}`}>
              {deliveryMethod === "standard" && <View className="w-3 h-3 rounded-full bg-brand-600" />}
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-bold text-foreground font-body">Standard Delivery</Text>
              <Text className="text-body-sm text-muted-foreground font-body mt-0.5">2-3 business days</Text>
            </View>
            <Text className="text-body-md font-bold text-brand-600 font-heading">GHS 5.00</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`flex-row items-center gap-4 p-5 rounded-[24px] border ${
              deliveryMethod === "express" ? "border-brand-600 bg-brand-50/30" : "border-border bg-card"
            }`}
            onPress={() => setDeliveryMethod("express")}
          >
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${deliveryMethod === "express" ? "border-brand-600" : "border-surface-300"}`}>
              {deliveryMethod === "express" && <View className="w-3 h-3 rounded-full bg-brand-600" />}
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-bold text-foreground font-body">Express Delivery</Text>
              <Text className="text-body-sm text-muted-foreground font-body mt-0.5">Same day delivery</Text>
            </View>
            <Text className="text-body-md font-bold text-brand-600 font-heading">GHS 12.00</Text>
          </Pressable>
        </View>
      </View>

      {/* Payment Method */}
      <View className="px-5 mt-6">
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-7 h-7 rounded-full bg-emerald-600 items-center justify-center">
            <Icon name="banknote" size={14} color="#fff" />
          </View>
          <Text className="text-heading-sm font-heading font-bold text-foreground">
            Payment Method
          </Text>
        </View>

        <View className="gap-3">
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`flex-row items-center gap-4 p-5 rounded-[24px] border ${
              paymentMethod === "card" ? "border-brand-600 bg-brand-50/30" : "border-border bg-card"
            }`}
            onPress={() => setPaymentMethod("card")}
          >
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${paymentMethod === "card" ? "border-brand-600" : "border-surface-300"}`}>
              {paymentMethod === "card" && <View className="w-3 h-3 rounded-full bg-brand-600" />}
            </View>
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
              <Icon name="credit-card" size={20} color="#004CFF" />
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-bold text-foreground font-body">Card Payment</Text>
              <Text className="text-body-sm text-muted-foreground font-body mt-0.5">Visa, Mastercard, Mobile Money</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`flex-row items-center gap-4 p-5 rounded-[24px] border ${
              paymentMethod === "momo" ? "border-brand-600 bg-brand-50/30" : "border-border bg-card"
            }`}
            onPress={() => setPaymentMethod("momo")}
          >
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${paymentMethod === "momo" ? "border-brand-600" : "border-surface-300"}`}>
              {paymentMethod === "momo" && <View className="w-3 h-3 rounded-full bg-brand-600" />}
            </View>
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
              <Icon name="phone" size={20} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-bold text-foreground font-body">Mobile Money</Text>
              <Text className="text-body-sm text-muted-foreground font-body mt-0.5">MTN, Vodafone, AirtelTigo</Text>
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`flex-row items-center gap-4 p-5 rounded-[24px] border ${
              paymentMethod === "wallet" ? "border-brand-600 bg-brand-50/30" : "border-border bg-card"
            }`}
            onPress={() => setPaymentMethod("wallet")}
          >
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${paymentMethod === "wallet" ? "border-brand-600" : "border-surface-300"}`}>
              {paymentMethod === "wallet" && <View className="w-3 h-3 rounded-full bg-brand-600" />}
            </View>
            <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
              <Icon name="wallet" size={20} color="#9333ea" />
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-bold text-foreground font-body">Wallet Balance</Text>
              <Text className="text-body-sm text-muted-foreground font-body mt-0.5">GHS {balance.toFixed(2)} available</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* BexieCoins */}
      <View className="px-5 mt-6">
        <View className="bg-amber-50 rounded-[24px] p-5 border border-amber-200 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center">
              <Icon name="award" size={20} color="#d97706" />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-amber-900 font-heading">Use BexieCoins</Text>
              <Text className="text-[13px] text-amber-700 font-body">Apply 1,000 coins for GHS 10 off</Text>
            </View>
          </View>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
            className={`w-12 h-6 rounded-full justify-center px-1 ${useBexieCoins ? 'bg-amber-500 items-end' : 'bg-accent items-start'}`}
            onPress={() => {
              if (!useBexieCoins && bexieCoins < 1000) {
                Toast.show({ type: "error", text1: "Not enough coins", text2: `You need 1000 coins. You have ${bexieCoins}.` });
                return;
              }
              setUseBexieCoins(!useBexieCoins);
            }}
          >
            <View className="w-4 h-4 bg-card rounded-full shadow-sm" />
          </Pressable>
        </View>
      </View>

      {/* Order Summary */}
      <View className="px-5 mt-6">
        <Text className="text-heading-sm font-heading font-bold text-foreground mb-4">
          Order Summary
        </Text>

        <View className="bg-card rounded-[24px] p-5 border border-border">
          {items.map((item: CartItemData) => (
            <View key={item.productId} className="flex-row justify-between py-2.5 border-b border-border last:border-b-0">
              <View className="flex-1 mr-3">
                <Text className="text-body-sm font-semibold text-foreground font-body" numberOfLines={1}>
                  {item.quantity}x {item.name}
                </Text>
              </View>
              <Text className="text-body-sm font-semibold text-foreground font-body">
                GHS {(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="border-t border-border mt-3 pt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-body-sm text-muted-foreground font-body">Subtotal</Text>
              <Text className="text-body-sm font-semibold text-muted-foreground font-body">GHS {subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-body-sm text-muted-foreground font-body">Delivery ({deliveryMethod})</Text>
              <Text className="text-body-sm font-semibold text-muted-foreground font-body">GHS {deliveryFee.toFixed(2)}</Text>
            </View>
            {useBexieCoins && (
              <View className="flex-row justify-between">
                <Text className="text-body-sm text-amber-500 font-body">BexieCoins Discount</Text>
                <Text className="text-body-sm font-semibold text-amber-600 font-body">-GHS {discount.toFixed(2)}</Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 border-t border-border">
              <Text className="text-body-lg font-bold text-foreground font-heading">Total</Text>
              <Text className="text-body-lg font-bold text-brand-600 font-heading">GHS {total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      </ScrollView>

      {/* Place Order Button — outside ScrollView */}
      <View className="px-5 py-4 bg-card border-t border-border" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button
          title={createOrder.isPending ? "Processing..." : `Pay GHS ${total.toFixed(2)}`}
          size="lg"
          onPress={handlePlaceOrder}
          disabled={createOrder.isPending}
          className="w-full rounded-full"
        />
        <Text className="text-caption text-muted-foreground font-body text-center mt-3">
          By placing this order, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}
