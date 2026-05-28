import { View, Text, FlatList, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { Image } from "expo-image";
import { Icon } from "@/components/ui/Icon";
import { useCartStore } from "@/lib/stores/cart-store";
import { useWishlist, useToggleWishlist } from "@/lib/hooks/use-wishlist";
import Toast from "@/lib/toast-polyfill";

export default function FavoritesScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const insets = useSafeAreaInsets();
  const { data: favorites = [], isLoading, refetch } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const removeFavorite = (id: string) => {
    toggleWishlist.mutate(id);
  };

  const handleAddToCart = (product: any) => {
    addItem({
      id: Date.now().toString(),
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
    setAddedItems((prev) => { const n = new Set(prev); n.add(product.id); return n; });
    setTimeout(() => {
      setAddedItems((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
    }, 2000);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#004CFF" />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <EmptyState
          iconName="heart"
          title="No collections yet"
          description="Save products you love by tapping the heart icon. They will appear here for quick access."
          actionLabel="Browse Products"
          onAction={() => router.push("/(customer)/(shop)")}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center mb-2">
        <View>
          <Text className="text-display-sm font-heading font-bold text-foreground">Collections</Text>
          <Text className="text-body-sm text-muted-foreground font-body mt-0.5">
            {favorites.length} saved item{favorites.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 items-center justify-center"
          onPress={() => Toast.show({ type: "info", text1: "Coming Soon", text2: "Collection folders are not yet available." })}
        >
          <Icon name="folder-plus" size={18} color="#004CFF" />
        </Pressable>
      </View>

      {/* Collection Folders Mock */}
      <View className="px-5 mb-4 flex-row gap-3">
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="bg-foreground px-4 py-2 rounded-full" onPress={() => Toast.show({ type: "info", text1: "All Items", text2: "Showing all saved items." })}>
          <Text className="text-[13px] font-bold text-white">All Items</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="bg-card border border-border px-4 py-2 rounded-full" onPress={() => Toast.show({ type: "info", text1: "Wishlist", text2: "Collection filtering coming soon." })}>
          <Text className="text-[13px] font-bold text-muted-foreground">Wishlist (2)</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="bg-card border border-border px-4 py-2 rounded-full" onPress={() => Toast.show({ type: "info", text1: "Tech Setup", text2: "Collection filtering coming soon." })}>
          <Text className="text-[13px] font-bold text-muted-foreground">Tech Setup (3)</Text>
        </Pressable>
      </View>

      <FlatList
        data={favorites as any[]}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 14 }}
        columnWrapperStyle={{ gap: 14 }}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#004CFF" />}
        renderItem={({ item }: { item: any }) => {
          const wasAdded = addedItems.has(item.id);
          return (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-1 bg-card rounded-[24px] overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-border pb-3"
              
              onPress={() => router.push(`/(customer)/product/${item.id}`)}
            >
              <View className="w-full aspect-[4/5] bg-muted items-center justify-center relative overflow-hidden">
                {item.image ? (
                  <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Icon name="image" size={32} color="#cbd5e1" />
                )}
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/90 items-center justify-center shadow-sm"
                  onPress={() => removeFavorite(item.id)}
                >
                  <Icon name="heart" size={15} color="#ef4444" />
                </Pressable>
              </View>
              <View className="p-3">
                <Text className="text-caption text-brand-600 font-bold font-body uppercase tracking-wide">
                  {item.vendor}
                </Text>
                <Text className="text-body-sm font-semibold text-foreground font-body mt-1" numberOfLines={2}>
                  {item.name}
                </Text>
                <View className="flex-row items-center justify-between mt-3">
                  <View>
                    <Text className="text-heading-sm font-bold text-brand-600 font-heading">
                      GHS {item.price.toFixed(2)}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Icon name="star" size={10} color="#f59e0b" />
                      <Text className="text-[10px] text-muted-foreground font-body">{item.rating}</Text>
                    </View>
                  </View>
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className={`w-9 h-9 rounded-full ${wasAdded ? "bg-emerald-500" : "bg-brand-600"} items-center justify-center active:scale-95`}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Icon name={wasAdded ? "check-circle" : "plus"} size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
