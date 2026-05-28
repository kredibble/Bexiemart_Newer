import { View, Text, ScrollView, FlatList, Pressable, RefreshControl, TextInput, Dimensions } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, SearchBar } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useProducts, useCategories } from "@/lib/hooks/use-products";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { Product, Category } from "@/lib/stores/product-store";
import { useRiderStore } from "@/lib/stores/rider-store";
import { useCountdown } from "@/hooks/useCountdown";

const FILTER_PILLS = [
  { id: "1", label: "Instant Delivery", icon: "clock", iconColor: "#10b981", bgColor: "#f0fdf4" },
  { id: "2", label: "Featured Meals", icon: "activity", iconColor: "#ef4444", bgColor: "#fef2f2" },
  { id: "3", label: "New Arrivals", icon: "star", iconColor: "#3b82f6", bgColor: "#eff6ff" },
];

const FEATURED_HIGHLIGHTS = [
  { id: "1", name: "Shopping", icon: "shopping-bag", bgColor: "#fce7f3", iconColor: "#ec4899", route: "/(customer)/(shop)" },
  { id: "2", name: "Food", icon: "coffee", bgColor: "#dcfce7", iconColor: "#22c55e", route: "/(customer)/food" },
  { id: "3", name: "Delivery", icon: "truck", bgColor: "#ffedd5", iconColor: "#f97316", route: "/(customer)/book-rider" },
  { id: "4", name: "Finance", icon: "dollar-sign", bgColor: "#dbeafe", iconColor: "#2563eb", route: "/(customer)/wallet" },
  { id: "5", name: "Reels", icon: "video", bgColor: "#fee2e2", iconColor: "#ef4444", route: "/(customer)/reels" },
  { id: "6", name: "Services", icon: "briefcase", bgColor: "#f3e8ff", iconColor: "#8b5cf6", route: "/(customer)/services" },
];

const SHOPS = [
  { id: "1", name: "Jean Collections", desc: "Bags, Shoes, Dresses", rating: 4.8, image: "" },
  { id: "2", name: "KFC Ghana", desc: "Burger, Chicken, Fries", rating: 4.8, image: "" },
];

const QUICK_ACTIONS = [
  { id: "1", label: "Order\nFood", icon: "coffee", bgColor: "#f8fafc", iconColor: "#ea580c", route: "/(customer)/(shop)" },
  { id: "2", label: "Shop\nProducts", icon: "shopping-bag", bgColor: "#f8fafc", iconColor: "#3b82f6", route: "/(customer)/(shop)" },
  { id: "3", label: "Book\nRider", icon: "navigation", bgColor: "#f8fafc", iconColor: "#16a34a", route: "/(customer)/book-rider" },
  { id: "4", label: "Track\nOrder", icon: "map-pin", bgColor: "#f8fafc", iconColor: "#9333ea", route: "/(customer)/track-order" },
  { id: "5", label: "Wallet", icon: "credit-card", bgColor: "#f8fafc", iconColor: "#ca8a04", route: "/(customer)/wallet" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const HERO_BANNERS = [
    { id: "1", title: "Holiday Deals Are Live!", subtitle: "Up to 50% off", bgImage: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop" },
    { id: "2", title: "Fresh Groceries", subtitle: "Delivered in 30 mins", bgImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop" },
    { id: "3", title: "New Fashion Drops", subtitle: "Shop latest trends", bgImage: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=800&auto=format&fit=crop" },
  ];

  const { data: productsData, isPending: isProductsLoading, isError: isProductsError, refetch: refetchProducts } = useProducts();
  const { data: categoriesData, isPending: isCategoriesLoading, isError: isCategoriesError, refetch: refetchCategories } = useCategories();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchCategories()]);
    setRefreshing(false);
  }, [refetchProducts, refetchCategories]);

  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const activeRide = useRiderStore((s) => s.activeRide);
  
  const allProducts = productsData?.data ?? [];
  const categories = categoriesData ?? [];
  const topProducts = allProducts.slice(0, 5);
  const newItems = allProducts.filter((p: Product) => p.tags?.includes("New")).slice(0, 5);
  const flashSale = allProducts.filter((p: Product) => p.oldPrice && p.oldPrice > p.price).slice(0, 6);
  const mostPopular = [...allProducts].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const justForYou = allProducts.slice(10, 14);

  // Target end of day for flash sale
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const { hours, minutes, seconds } = useCountdown(endOfDay);

  const goToShopWithCategory = (categoryName: string) => {
    router.push(`/(customer)/(shop)?category=${encodeURIComponent(categoryName)}`);
  };

  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0) setActiveHeroIndex(viewableItems[0].index ?? 0);
  }, []);

  if (isProductsLoading || isCategoriesLoading) {
    return <LoadingState message="Loading BexieMart..." />;
  }

  if (isProductsError || isCategoriesError) {
    return <ErrorState message="Failed to load store data." onRetry={onRefresh} />;
  }

  return (
    <View className="flex-1 bg-card">
      {/* ===== HEADER ===== */}
      <View 
        className="px-5 bg-card pb-3" 
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <View className="flex-row justify-between items-center mb-5">
          <Pressable 
            className="w-10 h-10 justify-center active:opacity-70"
            onPress={() => router.push("/(customer)/profile")}
          >
            <Icon name="menu" size={24} color="#0f172a" />
          </Pressable>
          
          <Text className="text-[20px] font-heading font-black text-foreground tracking-tight">
            Bexiemart
          </Text>
          
          <Pressable 
            className="w-10 h-10 items-end justify-center active:opacity-70"
            onPress={() => router.push("/(customer)/notifications")}
          >
            <Icon name="bell" size={22} color="#0f172a" />
          </Pressable>
        </View>

        <SearchBar 
          placeholder="Search products, stores..."
          showCamera={true}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-40"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#004CFF" />}
      >
        {/* ===== HERO BANNER ===== */}
        <View className="mt-4">
          <FlatList
            data={HERO_BANNERS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={Dimensions.get("window").width}
            snapToAlignment="center"
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={{ width: Dimensions.get("window").width, paddingHorizontal: 20 }}>
                <Pressable 
                  onPress={() => router.push("/(customer)/flash-sales")}
                  className="w-full h-[180px] rounded-[24px] overflow-hidden relative bg-slate-900 active:opacity-70"
                >
                  <Image source={{ uri: item.bgImage }} style={{ width: '100%', height: '100%', position: 'absolute' }} contentFit="cover" />
                  <View className="absolute inset-0 bg-black/50" />
                  
                  <View className="flex-1 p-5 justify-center">
                    <View className="bg-[#10b981] self-start px-2 py-1 rounded-[6px] mb-2">
                      <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                        Limited Offer
                      </Text>
                    </View>
                    
                    <Text className="text-white text-[24px] leading-[28px] font-heading font-black w-3/4 mb-1">
                      {item.title}
                    </Text>
                    
                    <Text className="text-white/90 text-body-sm font-body mb-4">
                      {item.subtitle}
                    </Text>
                    
                    <View className="bg-card self-start flex-row items-center rounded-full px-4 py-2">
                      <Text className="text-foreground font-bold text-caption mr-1">
                        Order Now
                      </Text>
                      <Icon name="arrow-right" size={14} color="#0f172a" />
                    </View>
                  </View>
                </Pressable>
              </View>
            )}
          />
          <View className="flex-row justify-center items-center mt-3 gap-1.5">
            {HERO_BANNERS.map((_, i) => (
              <View key={i} className={`h-1.5 rounded-full ${i === activeHeroIndex ? "w-4 bg-brand-600" : "w-1.5 bg-accent"}`} />
            ))}
          </View>
        </View>

        {/* ===== ACTIVE RIDE BANNER ===== */}
        {activeRide && (
          <View className="px-5 mt-6">
            <Pressable 
              className="bg-brand-600 rounded-[20px] p-4 flex-row items-center justify-between shadow-sm border border-brand-700"
              onPress={() => router.push("/(customer)/track-order")}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-card/20 rounded-full items-center justify-center">
                  <Icon name="map" size={20} color="#fff" />
                </View>
                <View>
                  <Text className="text-white font-bold font-heading text-[15px]">Delivery in progress</Text>
                  <Text className="text-white/80 font-body text-[12px] mt-0.5">{activeRide.status === 'searching' ? 'Locating your rider...' : activeRide.status === 'on_the_way' ? 'Your rider is arriving' : 'Rider is outside'}</Text>
                </View>
              </View>
              <View className="bg-card/20 px-3 py-1.5 rounded-full">
                <Text className="text-white font-bold text-[12px]">Track</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ===== FILTER PILLS ===== */}
        <FlatList
          data={FILTER_PILLS}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-6"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable 
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: item.bgColor })}
              onPress={() => router.push("/(customer)/(shop)")}
              className="flex-row items-center px-4 py-2.5 rounded-[16px]"
            >
              <Icon name={item.icon} size={14} color={item.iconColor} />
              <Text className="ml-2 font-semibold text-foreground text-[13px] font-body">
                {item.label}
              </Text>
            </Pressable>
          )}
        />

        {/* ===== FEATURED HIGHLIGHTS ===== */}
        <View className="px-5 mt-8">
          <Text className="text-[18px] font-heading font-bold text-foreground mb-5">
            Featured Highlights
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-5">
            {FEATURED_HIGHLIGHTS.map(item => (
              <Pressable 
                key={item.id} 
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                className="w-[30%] items-center active:opacity-70" 
                onPress={() => item.route !== "#" && router.push(item.route as any)}
              >
                <View className="w-full aspect-square rounded-[24px] items-center justify-center mb-2" style={{ backgroundColor: item.bgColor }}>
                  <Icon name={item.icon} size={32} color={item.iconColor} />
                </View>
                <Text className="text-[13px] font-bold text-foreground font-heading">{item.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ===== CATEGORIES ===== */}
        <View className="px-5 mt-10">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[18px] font-heading font-bold text-foreground">Categories</Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => router.push("/(customer)/(shop)")}>
              <Text className="text-[12px] font-bold text-muted-foreground">See All</Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {categories.slice(0, 6).map((cat: Category) => (
              <Pressable 
                key={cat.id} 
                className="w-[48%] active:opacity-70"
                onPress={() => goToShopWithCategory(cat.name)}
              >
                <View className="w-full aspect-square rounded-[16px] bg-background mb-2 overflow-hidden flex-row flex-wrap">
                  {[0, 1, 2, 3].map((idx) => (
                    <View key={idx} className={`w-1/2 h-1/2 border border-card items-center justify-center ${idx === 0 || idx === 3 ? "bg-muted" : "bg-accent"}`}>
                      {(cat as any).imageUrls?.[idx] ? (
                        <Image source={{ uri: (cat as any).imageUrls[idx] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        <Icon name="image" size={16} color="#cbd5e1" />
                      )}
                    </View>
                  ))}
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[12px] font-bold text-foreground w-2/3" numberOfLines={1}>{cat.name}</Text>
                  <View className="bg-brand-50 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-brand-600">{cat.count}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ===== TOP PRODUCTS ===== */}
        <View className="pl-5 mt-10">
          <View className="flex-row justify-between items-center mb-4 pr-5">
            <Text className="text-[18px] font-heading font-bold text-foreground">Top Products</Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => router.push("/(customer)/(shop)")}>
              <Text className="text-[12px] font-bold text-muted-foreground">See All</Text>
            </Pressable>
          </View>
          <FlatList
            data={topProducts}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={88} // 72px width + 16px gap
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable 
                className="items-center active:opacity-70"
                onPress={() => router.push(`/(customer)/product/${item.id}`)}
              >
                  <View className="w-[72px] h-[72px] rounded-full bg-muted mb-2 items-center justify-center border-2 border-card shadow-sm overflow-hidden">
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Icon name="image" size={24} color="#cbd5e1" />
                    )}
                  </View>
                <Text className="text-[10px] font-bold text-foreground" numberOfLines={1}>{item.name.substring(0, 10)}</Text>
              </Pressable>
            )}
          />
        </View>

        {/* ===== NEW ITEMS ===== */}
        {newItems.length > 0 && (
          <View className="pl-5 mt-10">
            <View className="flex-row justify-between items-center mb-4 pr-5">
              <Text className="text-[18px] font-heading font-bold text-foreground">New Items</Text>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                className="flex-row items-center gap-1 active:opacity-70"
                onPress={() => router.push("/(customer)/(shop)")}
              >
                <Text className="text-[12px] font-bold text-muted-foreground">See All</Text>
                <View className="w-5 h-5 rounded-full bg-foreground items-center justify-center">
                  <Icon name="arrow-right" size={12} color="#fff" />
                </View>
              </Pressable>
            </View>
            <FlatList
              data={newItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={156} // 140px width + 16px gap
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  className="w-[140px] active:opacity-70"
                  onPress={() => router.push(`/(customer)/product/${item.id}`)}
                >
                  <View className="w-full aspect-square rounded-[16px] bg-muted mb-2 items-center justify-center overflow-hidden">
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Icon name="image" size={32} color="#cbd5e1" />
                    )}
                  </View>
                  <Text className="text-[14px] font-bold text-foreground" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-[11px] text-muted-foreground font-body mb-1" numberOfLines={1}>{item.subtitle || item.category}</Text>
                  <Text className="text-[14px] font-bold text-foreground">GHS {item.price.toFixed(2)}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* ===== FLASH SALE ===== */}
        {flashSale.length > 0 && (
          <View className="px-5 mt-10">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[18px] font-heading font-bold text-foreground">Flash Sale</Text>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                className="flex-row items-center gap-1.5 active:opacity-70"
                onPress={() => router.push("/(customer)/flash-sales")}
              >
                <Icon name="clock" size={14} color="#0f172a" />
                <View className="bg-muted px-1.5 py-0.5 rounded"><Text className="text-[11px] font-bold text-rose-600">{hours}</Text></View>
                <View className="bg-muted px-1.5 py-0.5 rounded"><Text className="text-[11px] font-bold text-rose-600">{minutes}</Text></View>
                <View className="bg-muted px-1.5 py-0.5 rounded"><Text className="text-[11px] font-bold text-rose-600">{seconds}</Text></View>
                <Icon name="chevron-right" size={16} color="#0f172a" />
              </Pressable>
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {flashSale.map((item: Product) => {
                const discount = Math.round((1 - item.price / item.oldPrice) * 100);
                return (
                  <Pressable 
                    key={item.id} 
                    className="w-[31%] aspect-square rounded-[12px] bg-muted relative items-center justify-center active:opacity-70 overflow-hidden"
                    onPress={() => router.push(`/(customer)/product/${item.id}`)}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%', position: 'absolute' }} contentFit="cover" />
                    ) : (
                      <Icon name="image" size={24} color="#cbd5e1" />
                    )}
                    <View className="absolute top-1 right-1 bg-rose-500 px-1.5 py-0.5 rounded-sm">
                      <Text className="text-[9px] font-bold text-white">-{discount}%</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ===== MOST POPULAR ===== */}
        <View className="pl-5 mt-10">
          <View className="flex-row justify-between items-center mb-4 pr-5">
            <Text className="text-[18px] font-heading font-bold text-foreground">Most Popular</Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => router.push("/(customer)/(shop)")}>
              <Text className="text-[12px] font-bold text-muted-foreground">See All</Text>
            </Pressable>
          </View>
          <FlatList
            data={mostPopular}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={122} // 110px width + 12px gap
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable 
                className="w-[110px] active:opacity-70"
                onPress={() => router.push(`/(customer)/product/${item.id}`)}
              >
                <View className="w-full h-[150px] rounded-[16px] bg-muted mb-2 items-center justify-center overflow-hidden">
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Icon name="image" size={28} color="#cbd5e1" />
                  )}
                </View>
                <View className="flex-row justify-between items-center px-1">
                  <View className="flex-row items-center">
                    <Text className="text-[12px] font-bold text-foreground">GHS {item.price.toFixed(0)}</Text>
                    <Icon name="star" size={10} color="#f59e0b" style={{ marginLeft: 4 }} />
                  </View>
                  <Text className="text-[10px] text-muted-foreground">{item.rating}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        {/* ===== JUST FOR YOU ===== */}
        <View className="px-5 mt-10">
          <View className="flex-row items-center mb-4 gap-2">
            <Text className="text-[18px] font-heading font-bold text-foreground">Just For You</Text>
            <View className="bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100 flex-row items-center gap-1">
              <Icon name="zap" size={10} color="#004CFF" />
              <Text className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Personalized</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-5">
            {justForYou.map((item: Product) => (
              <Pressable 
                key={item.id} 
                className="w-[48%] active:opacity-70"
                onPress={() => router.push(`/(customer)/product/${item.id}`)}
              >
                <View className="w-full aspect-[4/5] rounded-[16px] bg-muted mb-2 items-center justify-center relative overflow-hidden">
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Icon name="image" size={32} color="#cbd5e1" />
                  )}
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/90 items-center justify-center shadow-sm" onPress={() => { toggleFavorite(item.id); }}>
                    <Icon name="heart" size={15} color={isFavorite(item.id) ? "#ef4444" : "#64748b"} />
                  </Pressable>
                </View>
                <Text className="text-[14px] font-bold text-foreground" numberOfLines={1}>{item.name}</Text>
                <Text className="text-[11px] text-muted-foreground font-body mb-1" numberOfLines={1}>{item.vendor}</Text>
                <Text className="text-[14px] font-bold text-foreground">GHS {item.price.toFixed(2)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ===== QUICK ACTIONS (Floating) ===== */}
      <View style={{ position: 'absolute', bottom: 24, left: 20, right: 20 }} pointerEvents="box-none">
        <View 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 32,
            padding: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {QUICK_ACTIONS.map(action => (
            <Pressable 
              key={action.id} 
              onPress={() => router.push(action.route as any)}
              style={{ alignItems: 'center', width: '18%' }}
            >
              <View 
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  backgroundColor: action.bgColor,
                }}
              >
                <Icon name={action.icon} size={22} color={action.iconColor} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a', textAlign: 'center', lineHeight: 12 }}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
