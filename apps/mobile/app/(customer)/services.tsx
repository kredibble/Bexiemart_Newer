import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Pressable, TextInput, FlatList, Dimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { useState, useCallback, useMemo } from "react";
import { useServices, useServiceBookings } from "@/lib/hooks/use-services";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORIES = [
  { id: "1", name: "Cleaning", icon: "wind", color: "#0ea5e9" },
  { id: "2", name: "Plumbing", icon: "tool", color: "#f59e0b" },
  { id: "3", name: "Electrical", icon: "zap", color: "#eab308" },
  { id: "4", name: "AC Repair", icon: "thermometer", color: "#3b82f6" },
  { id: "5", name: "Painting", icon: "edit-2", color: "#8b5cf6" },
  { id: "6", name: "Beauty", icon: "scissors", color: "#ec4899" },
];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PROMO_BANNERS = [
  { id: "1", title: "Expert Services", subtitle: "Verified professionals at your doorstep within 2 hours.", color: "bg-purple-600", iconColor: "rgba(255,255,255,0.1)", icon: "tool" },
  { id: "2", title: "Home Deep Clean", subtitle: "Get 20% off your first whole-house deep clean.", color: "bg-brand-600", iconColor: "rgba(255,255,255,0.1)", icon: "wind" },
];

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  
  const { data: servicesData, isPending, isError, refetch } = useServices(
    activeCategory ? { category: activeCategory } : searchQuery ? { search: searchQuery } : undefined
  );
  const { data: bookingsData } = useServiceBookings();
  const providers = servicesData?.services ?? [];
  const categories = servicesData?.categories ?? [];
  const activeBookings = bookingsData ?? [];

  const CATEGORIES = useMemo(() => 
    categories.map((cat: string, i: number) => ({
      id: String(i + 1), name: cat,
      icon: ["wind", "tool", "zap", "thermometer", "edit-2", "scissors"][i % 6],
      color: ["#0ea5e9", "#f59e0b", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899"][i % 6],
    })),
  [categories]);

  // Filter providers locally
  const filteredProviders = providers.filter((provider: any) => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (provider.category ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory ? provider.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActivePromoIndex(viewableItems[0].index ?? 0);
  }, []);

  if (isPending) {
    return <LoadingState message="Loading services..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load home services." onRetry={refetch} />;
  }

  return (
    <View className="flex-1 bg-background">
      <View 
        className="px-5 pb-4 bg-card border-b border-border"
        style={{ paddingTop: Math.max(insets.top, 20) + 12 }}
      >
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-3">
            <BackButton />
            <Text className="text-[20px] font-heading font-black text-foreground">
              Home Services
            </Text>
          </View>
        </View>

        <View className="flex-row items-center bg-background rounded-2xl px-4 py-3 border border-border">
          <Icon name="search" size={18} color="#64748b" />
          <TextInput 
            placeholder="What service do you need?"
            className="flex-1 ml-2 font-body text-[15px] text-foreground"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Icon name="x-circle" size={18} color="#cbd5e1" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Active Booking Banner */}
        {activeBookings.length > 0 && (
          <View className="px-5 mt-6">
            <View className="bg-brand-600 rounded-[20px] p-4 flex-row items-center justify-between shadow-sm border border-brand-700">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-card/20 rounded-full items-center justify-center">
                  <Icon name="calendar" size={20} color="#fff" />
                </View>
                <View>
                  <Text className="text-white font-bold font-heading text-[15px]">Upcoming Appointment</Text>
                  <Text className="text-white/80 font-body text-[12px] mt-0.5">
                    {activeBookings[0].providerName} • {activeBookings[0].time}
                  </Text>
                </View>
              </View>
              <View className="bg-card/20 px-3 py-1.5 rounded-full">
                <Text className="text-white font-bold text-[12px]">View</Text>
              </View>
            </View>
          </View>
        )}

        {/* Promotional Banner */}
        {!activeCategory && searchQuery === "" && (
          <View className="mb-8 mt-6">
            <FlatList
              data={PROMO_BANNERS}
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
                  <Pressable className={`w-full h-36 rounded-[24px] ${item.color} overflow-hidden p-5 justify-center relative`}>
                    <Text className="text-white font-heading font-black text-[22px] mb-1">{item.title}</Text>
                    <Text className="text-white/90 font-body text-[13px] w-2/3 mb-4">{item.subtitle}</Text>
                    <View className="bg-card px-4 py-2 rounded-full self-start">
                      <Text className={`text-[12px] font-bold ${item.color.replace('bg-', 'text-')}`}>Book Now</Text>
                    </View>
                    <Icon name={item.icon} size={100} color={item.iconColor} style={{ position: 'absolute', right: -20, bottom: -20 }} />
                  </Pressable>
                </View>
              )}
            />
            <View className="flex-row justify-center items-center mt-3 gap-1.5">
              {PROMO_BANNERS.map((_, i) => (
                <View key={i} className={`h-1.5 rounded-full ${i === activePromoIndex ? "w-4 bg-purple-600" : "w-1.5 bg-accent"}`} />
              ))}
            </View>
          </View>
        )}

        {/* Categories */}
        {searchQuery === "" && (
          <View className={`px-5 ${activeCategory ? 'mt-6 mb-6' : 'mb-10'}`}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[18px] font-heading font-bold text-foreground">Categories</Text>
              {activeCategory && (
                <Pressable onPress={() => setActiveCategory(null)}>
                  <Text className="text-brand-600 font-bold text-[13px]">Clear Filter</Text>
                </Pressable>
              )}
            </View>
            
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {CATEGORIES.map((item: any) => {
                const isActive = activeCategory === item.name;
                return (
                  <Pressable 
                    key={item.id} 
                    className="w-[30%] items-center"
                    onPress={() => setActiveCategory(isActive ? null : item.name)}
                  >
                    <View 
                      className={`w-16 h-16 rounded-[20px] items-center justify-center mb-2 ${isActive ? 'border border-brand-500' : ''}`} 
                      style={{ backgroundColor: isActive ? '#eff6ff' : item.color + '15' }}
                    >
                      <Icon name={item.icon} size={28} color={isActive ? '#3b82f6' : item.color} />
                    </View>
                    <Text className={`text-[12px] ${isActive ? 'font-black text-brand-700' : 'font-bold text-foreground'}`}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Providers List */}
        <View className="px-5 pb-10">
          <Text className="text-[18px] font-heading font-bold text-foreground mb-4">
            {searchQuery ? 'Search Results' : activeCategory ? `${activeCategory} Providers` : 'Top Rated Providers'}
          </Text>
          
          {filteredProviders.length === 0 ? (
            <View className="py-4">
              <EmptyState 
                title="No providers found" 
                description="Try adjusting your search or filters." 
                iconName="search"
                fullScreen={false}
              />
            </View>
          ) : (
            <View className="gap-4">
              {filteredProviders.map((provider: any) => (
                <Pressable 
                  key={provider.id} 
                  className="bg-card rounded-[24px] p-4 flex-row items-center border border-border"
                  onPress={() => router.push(`/(customer)/services/${provider.id}`)}
                >
                  <View className="w-20 h-20 bg-muted rounded-[16px] items-center justify-center mr-4 overflow-hidden">
                    <Icon name="user" size={32} color="#94a3b8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-foreground font-heading mb-0.5">{provider.vendor?.shopName ?? provider.name}</Text>
                    <Text className="text-[12px] text-muted-foreground font-body mb-2">{provider.name}</Text>
                    
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Icon name="star" size={12} color="#f59e0b" />
                        <Text className="text-[12px] font-bold text-muted-foreground ml-1">{Number(provider.rating).toFixed(1)}</Text>
                        <Text className="text-[12px] text-muted-foreground ml-1">({provider.ratingCount})</Text>
                      </View>
                      <Text className="text-[13px] font-bold text-brand-600">{provider.priceDisplay ?? `GHS ${Number(provider.price).toFixed(2)}`}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
