import { View, Text, ScrollView, Alert, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/lib/hooks/use-cart";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Image } from "expo-image";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import Toast from "@/lib/toast-polyfill";

interface CartItemData {
  id: string;
  productId: string;
  vendorId: string;
  vendorName: string;
  price: number;
  quantity: number;
  stock: number;
  imageUrl?: string;
  name: string;
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cartData, isPending, isError, refetch } = useCart();
  const updateCartMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();

  const items = cartData?.items ?? [];
  const itemCount = items.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity, 0);

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const deliveryFee = items.length > 0 ? 5.00 : 0;
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const total = subtotal + deliveryFee - discount;

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      Toast.show({ type: "error", text1: "Enter Code", text2: "Please enter a coupon code." });
      return;
    }
    if (couponCode.toUpperCase() === "BEXIE10") {
      setCouponApplied(true);
      Toast.show({ type: "success", text1: "Applied", text2: "10% discount applied!" });
    } else {
      Toast.show({ type: "error", text1: "Invalid", text2: "Coupon code not recognized." });
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponCode("");
  };

  const handleRemoveItem = (productId: string, name: string) => {
    const cartItem = items.find((i: CartItemData) => i.productId === productId);
    Alert.alert("Remove Item", `Remove "${name}" from cart?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
        if (cartItem) removeFromCartMutation.mutate({ itemId: cartItem.id, productId });
        Toast.show({ type: "info", text1: "Item Removed", text2: `${name} was removed.` });
      } },
    ]);
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    router.push("/(customer)/checkout");
  };

  if (isPending) {
    return <LoadingState message="Loading cart..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load your cart." onRetry={refetch} />;
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-6 pt-4 pb-2">
          <Text className="text-[28px] font-heading font-black text-foreground tracking-tight">Cart</Text>
        </View>
        <EmptyState 
          title="Your cart is empty" 
          description="Looks like you haven't added anything to your cart yet." 
          iconName="shopping-cart"
          actionLabel="Start Shopping"
          onAction={() => router.push("/(customer)/(shop)")}
        />
      </View>
    );
  }

  type GroupedVendor = { vendorId: string; vendor: string; items: CartItemData[] };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-72"
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Vendor Grouping */}
        {Object.values(
          items.reduce((acc: Record<string, GroupedVendor>, item: CartItemData) => {
            if (!acc[item.vendorId]) {
              acc[item.vendorId] = { vendorId: item.vendorId, vendor: item.vendorName, items: [] };
            }
            acc[item.vendorId].items.push(item);
            return acc;
          }, {}) as Record<string, GroupedVendor>
        ).map((group: GroupedVendor, gIdx: number) => (
          <View key={gIdx} className="mb-6">
            {/* Vendor Header */}
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View className="flex-row items-center gap-2">
                <View className="w-[22px] h-[22px] rounded-[6px] bg-brand-600 items-center justify-center">
                  <Icon name="check" size={14} color="#fff" />
                </View>
                <Icon name="store" size={16} color="#475569" />
                <Text className="text-[16px] font-heading font-bold text-foreground">{group.vendor}</Text>
              </View>
              {group.vendorId && (
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => router.push(`/(customer)/store/${group.vendorId}`)}>
                  <Text className="text-[12px] font-bold text-brand-600">Visit Store</Text>
                </Pressable>
              )}
            </View>

            {/* Items */}
            {group.items.map((item: CartItemData, idx: number) => (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                key={item.productId}
                className="flex-row bg-card rounded-[24px] p-4 border border-border gap-3 mb-3 shadow-[0_4px_10px_rgba(0,0,0,0.02)]"
                onPress={() => router.push(`/(customer)/product/${item.productId}`)}
              >
                <View className="flex-row items-center mr-1">
                  <View className="w-[22px] h-[22px] rounded-[6px] bg-brand-600 items-center justify-center">
                    <Icon name="check" size={14} color="#fff" />
                  </View>
                </View>

                <View className="w-[84px] h-[84px] rounded-[16px] bg-background items-center justify-center overflow-hidden border border-border">
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Icon name="image" size={24} color="#cbd5e1" />
                  )}
                </View>

                <View className="flex-1 justify-between py-0.5">
                  <View className="flex-row justify-between items-start">
                    <Text className="text-[15px] font-semibold text-foreground font-body flex-1 pr-2" numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center -mt-1 -mr-1"
                      onPress={() => handleRemoveItem(item.productId, item.name)}
                    >
                      <Icon name="trash-2" size={15} color="#f43f5e" />
                    </Pressable>
                  </View>

                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-1 mr-2">
                      <Text 
                        className="text-[16px] font-black text-brand-600 font-heading" 
                        numberOfLines={1} 
                        adjustsFontSizeToFit
                      >
                        GHS {item.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </Text>
                      {item.stock <= 5 && (
                        <Text className="text-[10px] text-amber-600 font-body mt-0.5">
                          Only {item.stock} left
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center bg-background rounded-full border border-border">
                      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        className="w-8 h-8 items-center justify-center"
                        onPress={() => updateCartMutation.mutate({ itemId: item.id, productId: item.productId, quantity: item.quantity - 1 })}
                        disabled={item.quantity <= 1}
                      >
                        <Icon name="minus" size={14} color={item.quantity <= 1 ? "#cbd5e1" : "#475569"} />
                      </Pressable>
                      <Text className="text-[14px] font-bold text-foreground font-body w-6 text-center">
                        {item.quantity}
                      </Text>
                      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        className="w-8 h-8 items-center justify-center"
                        onPress={() => updateCartMutation.mutate({ itemId: item.id, productId: item.productId, quantity: item.quantity + 1 })}
                        disabled={item.quantity >= item.stock}
                      >
                        <Icon name="plus" size={14} color={item.quantity >= item.stock ? "#cbd5e1" : "#475569"} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Bottom Checkout Bar */}
      <View className="absolute bottom-0 left-0 right-0">
        <BlurView intensity={90} tint="light" className="px-5 py-5 rounded-t-[32px] border-t border-border/50 shadow-2xl bg-white/80">
          {/* Coupon Section */}
          {!couponApplied ? (
            <View className="flex-row gap-2 mb-4">
                <View className="flex-1 flex-row items-center gap-2 bg-background rounded-full px-4 h-11 border border-border">
                  <Icon name="ticket-percent" size={16} color="#94a3b8" />
                  <TextInput
                    className="flex-1 font-body text-[14px] text-foreground"
                    placeholder="Enter coupon code"
                    placeholderTextColor="#94a3b8"
                    value={couponCode}
                    onChangeText={setCouponCode}
                  />
                </View>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="bg-brand-600 rounded-full px-5 h-11 items-center justify-center active:scale-95"
                onPress={handleApplyCoupon}
              >
                <Text className="text-[14px] font-bold text-white font-body">Apply</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center justify-between bg-emerald-50 rounded-[16px] px-5 py-4 mb-5 border border-emerald-100">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center">
                  <Icon name="ticket-percent" size={16} color="#fff" />
                </View>
                <View>
                  <Text className="text-[14px] font-bold text-emerald-700 font-body">CAMPUS10 applied</Text>
                  <Text className="text-[12px] text-emerald-600 font-body">10% off your order</Text>
                </View>
              </View>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={handleRemoveCoupon}>
                <Text className="text-[14px] font-bold text-rose-600 font-body">Remove</Text>
              </Pressable>
            </View>
          )}

          {/* Price Breakdown */}
          <View className="gap-2 mb-5">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-muted-foreground font-body">Subtotal ({itemCount} items)</Text>
              <Text className="text-[14px] font-semibold text-foreground font-body" numberOfLines={1} adjustsFontSizeToFit>GHS {subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-muted-foreground font-body">Delivery fee</Text>
              <Text className="text-[14px] font-medium text-muted-foreground font-body">Calculated at checkout</Text>
            </View>
            {couponApplied && (
              <View className="flex-row justify-between">
                <Text className="text-[14px] text-emerald-600 font-body">Discount (10%)</Text>
                <Text className="text-[14px] font-semibold text-emerald-600 font-body">- GHS {discount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
              </View>
            )}
            <View className="flex-row justify-between pt-3 border-t border-border/50">
              <Text className="text-[18px] font-bold text-foreground font-heading">Total</Text>
              <View className="flex-1 items-end pl-4">
                <Text className="text-[24px] font-bold text-brand-600 font-heading" numberOfLines={1} adjustsFontSizeToFit>GHS {total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
              </View>
            </View>
          </View>

          <Pressable 
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            onPress={handleCheckout}
            className="w-full h-14 bg-brand-600 rounded-full flex-row items-center justify-between px-6 active:scale-[0.98]"
          >
            <Text className="text-[16px] font-bold text-white font-heading">Proceed to Checkout</Text>
            <Text className="text-[16px] font-black text-white font-heading" numberOfLines={1} adjustsFontSizeToFit>
              GHS {total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </Text>
          </Pressable>
        </BlurView>
      </View>
    </View>
  );
}
