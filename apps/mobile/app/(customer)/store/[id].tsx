import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProducts, useStoreProfile } from "@/lib/hooks/use-products";
import { useAddToCart } from "@/lib/hooks/use-cart";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import Toast from "@/lib/toast-polyfill";
import { BackButton } from "@/components/ui/BackButton";

export default function StoreProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  const { data: store, isPending: isStoreLoading, isError: isStoreError, error: storeError, refetch: refetchStore } = useStoreProfile(id!);
  const { data: productsData, isPending: isProductsLoading, isError: isProductsError, refetch: refetchProducts } = useProducts({ vendorId: id! });
  
  const addToCartMutation = useAddToCart();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const products = productsData?.data ?? [];

  const handleToggleFavorite = (productId: string) => {
    toggleFavorite(productId);
    const added = !isFavorite(productId);
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

  if (isStoreLoading || isProductsLoading) {
    return <LoadingState message="Loading store details..." />;
  }

  if (isStoreError || storeError || isProductsError) {
    return <ErrorState message="Failed to load the store. Please check your connection." onRetry={() => { refetchStore(); refetchProducts(); }} />;
  }

  if (!store) {
    return (
      <View className="flex-1 bg-background pt-12">
        <View className="px-6 pb-4">
          <BackButton />
        </View>
        <EmptyState 
          title="Store Not Found" 
          description="The store you are looking for does not exist or is currently unavailable."
          iconName="store"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="absolute z-10 top-12 left-5">
        <BackButton />
      </View>

      <FlatList
        data={products}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 14 }}
        columnWrapperStyle={{ gap: 14 }}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-6">
            {/* Premium Banner */}
            <View style={{ height: 224 }} className="w-full bg-brand-900 relative overflow-hidden">
              {store.banner ? (
                <Image source={{ uri: store.banner }} style={{ width: '100%', height: '100%', opacity: 0.8 }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center bg-brand-800">
                  <Icon name="store" size={64} color="#3b82f6" />
                </View>
              )}
            </View>

            {/* Profile Info Card */}
            <View className="px-5 -mt-16 relative z-10">
              <View className="bg-card rounded-3xl p-5 shadow-md border border-border">
                <View className="flex-row justify-between items-start">
                  <View className="w-20 h-20 rounded-2xl bg-background border-2 border-border overflow-hidden items-center justify-center -mt-10 shadow-sm">
                    {store.logo ? (
                      <Image source={{ uri: store.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Text className="text-heading-lg font-bold text-brand-600 font-heading">
                        {store.name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  
                  <Pressable
                    className="bg-brand-50 rounded-full px-5 py-2.5 flex-row items-center gap-2 border border-brand-100 active:opacity-70"
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => router.push(`/chat?vendorId=${store.id}`)}
                  >
                    <Icon name="message-circle" size={16} color="#004CFF" />
                    <Text className="text-brand-600 font-bold font-body text-body-sm">Contact Seller</Text>
                  </Pressable>
                </View>

                <View className="mt-3">
                  <Text className="text-heading-md font-bold font-heading text-foreground">
                    {store.name}
                  </Text>
                  
                  {store.city && store.state && (
                    <View className="flex-row items-center gap-1.5 mt-1.5">
                      <Icon name="map-pin" size={12} color="#64748b" />
                      <Text className="text-caption text-muted-foreground font-body">
                        {store.city}, {store.state}
                      </Text>
                    </View>
                  )}
                  
                  {store.description && (
                    <Text className="text-body-sm text-muted-foreground font-body mt-3 leading-relaxed">
                      {store.description}
                    </Text>
                  )}
                </View>

                {/* Stats Section */}
                <View className="flex-row items-center justify-between mt-6 bg-muted/50 rounded-2xl p-4 border border-border/50">
                  <View className="items-center flex-1">
                    <Text className="text-heading-sm font-bold text-foreground font-heading">{store.totalProducts}</Text>
                    <Text className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Products</Text>
                  </View>
                  <View className="w-[1px] h-8 bg-border" />
                  <View className="items-center flex-1">
                    <Text className="text-heading-sm font-bold text-foreground font-heading flex-row items-center gap-1">
                      {store.rating} <Icon name="star" size={12} color="#f59e0b" />
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Rating</Text>
                  </View>
                  <View className="w-[1px] h-8 bg-border" />
                  <View className="items-center flex-1">
                    <Text className="text-heading-sm font-bold text-foreground font-heading">{store.visits}</Text>
                    <Text className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-1">Store Visits</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="px-5 mt-8 mb-2 flex-row items-center justify-between">
              <Text className="text-heading-sm font-bold font-heading text-foreground">Store Collection</Text>
              <View className="bg-muted px-3 py-1 rounded-full">
                <Text className="text-caption font-bold text-muted-foreground font-body">{products.length} Items</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState 
            title="No products yet" 
            description="This store hasn't added any products." 
            iconName="package"
            fullScreen={false}
          />
        }
        renderItem={({ item }) => {
          const isFav = isFavorite(item.id);
          const discount = item.oldPrice > item.price ? Math.round((1 - item.price / item.oldPrice) * 100) : 0;
          return (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-1 bg-card rounded-[24px] overflow-hidden border border-border pb-3 mb-4"
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
    </View>
  );
}
