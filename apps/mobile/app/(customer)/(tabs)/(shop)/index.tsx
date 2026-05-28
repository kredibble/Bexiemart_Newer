import { View, Text, FlatList, ActivityIndicator, TextInput, Modal, Pressable } from "react-native";
import { Image } from "expo-image";
import { useState, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProducts, useCategories } from "@/lib/hooks/use-products";
import { useAddToCart } from "@/lib/hooks/use-cart";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import Toast from "@/lib/toast-polyfill";

type SortOption = "popular" | "newest" | "price-low" | "price-high";

export default function ShopScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ category?: string }>();
  const insets = useSafeAreaInsets();
  const { data: productsData, isPending: isProductsLoading, isError: isProductsError, refetch: refetchProducts } = useProducts();
  const { data: categoriesData, isPending: isCategoriesLoading, isError: isCategoriesError, refetch: refetchCategories } = useCategories();
  const addToCartMutation = useAddToCart();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const products = productsData?.data ?? [];
  const categories = categoriesData ?? [];

  const [activeCategoryFilter, setActiveCategoryFilter] = useState(searchParams.category ?? "All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [showSortModal, setShowSortModal] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (activeCategoryFilter !== "All") {
      filtered = filtered.filter((p) => p.category === activeCategoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "price-low": filtered.sort((a, b) => a.price - b.price); break;
      case "price-high": filtered.sort((a, b) => b.price - a.price); break;
      case "newest": filtered.reverse(); break;
      default: break;
    }
    return filtered;
  }, [products, activeCategoryFilter, searchQuery, sortBy]);

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
    const added = !isFavorite(id);
    Toast.show({
      type: 'success',
      text1: added ? 'Added to Favorites' : 'Removed from Favorites',
    });
  };

  const handleAddToCart = (product: any) => {
    addToCartMutation.mutate({ productId: product.id, quantity: 1 });
    Toast.show({
      type: 'success',
      text1: 'Added to Cart',
      text2: `${product.name} added to your cart.`,
    });
  };

  const sortLabels: Record<SortOption, string> = {
    popular: "Most Popular",
    newest: "Newest First",
    "price-low": "Price: Low to High",
    "price-high": "Price: High to Low",
  };

  if (isProductsLoading || isCategoriesLoading) {
    return <LoadingState message="Loading shop..." />;
  }

  if (isProductsError || isCategoriesError) {
    return <ErrorState message="Failed to load products." onRetry={() => { refetchProducts(); refetchCategories(); }} />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center gap-2 bg-muted rounded-full px-4 h-11 border border-border">
            <Icon name="search" size={16} color="#94A3B8" />
            <TextInput
              className="flex-1 font-body text-body-sm text-foreground"
              placeholder="Search products..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => setSearchQuery("")} className="active:opacity-70">
                <Icon name="x" size={14} color="#94A3B8" />
              </Pressable>
            )}
          </View>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="w-11 h-11 rounded-full bg-card border border-border items-center justify-center active:opacity-70"
            onPress={() => setShowSortModal(true)}
          >
            <Icon name="sliders-horizontal" size={18} color="#475569" />
          </Pressable>
        </View>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          keyExtractor={(item) => item.id}
          className="mt-3"
          contentContainerStyle={{ gap: 10, paddingRight: 20 }}
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className={`px-4 py-2 rounded-full ${
                activeCategoryFilter === item.name ? "bg-brand-600" : "bg-card border border-border"
              }`}
              onPress={() => setActiveCategoryFilter(item.name)}
              
            >
              <Text
                className={`text-body-sm font-bold font-body ${
                  activeCategoryFilter === item.name ? "text-white" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <View className="px-5 pb-3 flex-row justify-between items-center">
        <Text className="text-caption text-muted-foreground font-body font-medium">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        </Text>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="flex-row items-center gap-1 active:opacity-70" onPress={() => setShowSortModal(true)}>
          <Text className="text-caption text-muted-foreground font-body">{sortLabels[sortBy]}</Text>
          <Icon name="chevron-down" size={10} color="#94A3B8" />
        </Pressable>
      </View>

      <FlatList
        data={filteredProducts}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 14 }}
        columnWrapperStyle={{ gap: 14 }}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState 
            title="No products found" 
            description="We couldn't find any products matching your search." 
            iconName="search"
            fullScreen={false}
          />
        }
        renderItem={({ item }) => {
          const isFav = isFavorite(item.id);
          const discount = item.oldPrice > item.price ? Math.round((1 - item.price / item.oldPrice) * 100) : 0;
            return (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-1 bg-card rounded-[24px] overflow-hidden border border-border pb-3"
                
                onPress={() => router.push(`/(customer)/product/${item.id}`)}
              >
                <View className="w-full aspect-[4/5] bg-muted items-center justify-center relative overflow-hidden">
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Icon name="image" size={32} color="#cbd5e1" />
                  )}
                  {discount > 0 && (
                    <View className="absolute top-2 left-2 bg-rose-500 px-2 py-0.5 rounded-lg">
                      <Text className="text-[10px] font-bold text-white font-body">-{discount}%</Text>
                    </View>
                  )}
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/90 items-center justify-center shadow-sm active:opacity-70"
                    onPress={() => handleToggleFavorite(item.id)}
                  >
                    <Icon name="heart" size={15} color={isFav ? "#ef4444" : "#64748b"} />
                  </Pressable>
                </View>
                <View className="p-3">
                  <Text className="text-caption text-brand-600 font-bold font-body uppercase tracking-wide" numberOfLines={1}>
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
                      {item.oldPrice > item.price && (
                        <Text className="text-caption text-muted-foreground font-body line-through">
                          GHS {item.oldPrice.toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      className="w-9 h-9 rounded-full bg-brand-600 items-center justify-center active:scale-95"
                      onPress={() => handleAddToCart(item)}
                    >
                      <Icon name="plus" size={16} color="#fff" />
                    </Pressable>
                  </View>
                  <View className="flex-row items-center gap-1 mt-2">
                    <Icon name="star" size={10} color="#f59e0b" />
                    <Text className="text-[10px] text-muted-foreground font-body">{item.rating}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="flex-1 bg-black/40 justify-end"  onPress={() => setShowSortModal(false)}>
          <View className="bg-card rounded-t-[32px] pt-6 pb-10 px-5" onStartShouldSetResponder={() => true}>
            <View className="w-10 h-1 bg-accent rounded-full self-center mb-6" />
            <Text className="text-heading-sm font-heading font-bold text-foreground mb-5">Sort Products</Text>
            {(Object.keys(sortLabels) as SortOption[]).map((key) => (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                key={key}
                className="flex-row items-center justify-between py-4 border-b border-border last:border-b-0 active:opacity-70"
                onPress={() => { setSortBy(key); setShowSortModal(false); }}
              >
                <Text className={`text-body-md font-body ${sortBy === key ? "text-brand-600 font-bold" : "text-muted-foreground"}`}>
                  {sortLabels[key]}
                </Text>
                {sortBy === key && <Icon name="check-circle" size={20} color="#004CFF" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
