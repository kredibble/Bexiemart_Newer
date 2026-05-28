import { BackButton } from "@/components/ui/BackButton";
import { View, Text, TextInput, ScrollView, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProducts } from "@/lib/hooks/use-products";

const RECENT_SEARCHES = ["Wireless Earbuds", "Sneakers size 42", "Hoodie navy", "Gaming Mouse"];
const TRENDING_TAGS = ["Campus Merch", "Food Delivery", "Textbooks", "Laptops", "Groceries"];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);
  const [activeSort, setActiveSort] = useState(0);
  const { data: productsData, isPending, isError, refetch } = useProducts({ search: query || undefined });
  const results = productsData?.data ?? [];

  if (isError) {
    return (
      <View className="flex-1 bg-card">
        <View className="px-5 pb-4 pt-16 flex-row gap-3 items-center">
          <BackButton />
          <Text className="text-[20px] font-heading font-black text-foreground">Search</Text>
        </View>
        <ErrorState message="Failed to load search results." onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-card">
      {/* Search Header */}
      <View 
        className="px-5 pb-4 bg-card border-b border-border flex-row gap-3 items-center"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <BackButton />
        
        <View className="flex-1 flex-row items-center bg-background h-[48px] rounded-[16px] px-4 border border-border focus:border-brand-500">
          <Icon name="search" size={18} color="#64748b" />
          <TextInput
            className="flex-1 ml-2 text-[15px] font-body text-foreground h-full"
            placeholder="Search Bexiemart..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => setQuery("")}>
              <Icon name="x-circle" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>

        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
          className={`w-12 h-[48px] rounded-[16px] items-center justify-center ${showFilters ? 'bg-brand-50 border border-brand-100' : 'bg-background border border-border'}`}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Icon name="sliders" size={20} color={showFilters ? "#004CFF" : "#0f172a"} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {query.length === 0 ? (
          <View className="p-5">
            {/* Recent Searches */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-[16px] font-heading font-bold text-foreground">Recent Searches</Text>
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => setRecentSearches([])}>
                  <Text className="text-[13px] font-bold text-muted-foreground">Clear</Text>
                </Pressable>
              </View>
              <View className="gap-0">
                {recentSearches.map((item, idx) => (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} key={idx} className="flex-row items-center py-3 border-b border-border" onPress={() => setQuery(item)}>
                    <Icon name="clock" size={16} color="#94a3b8" />
                    <Text className="ml-3 text-[15px] font-body text-muted-foreground flex-1">{item}</Text>
                    <Icon name="arrow-up-left" size={16} color="#cbd5e1" />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Trending Tags */}
            <View>
              <Text className="text-[16px] font-heading font-bold text-foreground mb-4">Trending Now</Text>
              <View className="flex-row flex-wrap gap-2">
                {TRENDING_TAGS.map((tag, idx) => (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} key={idx} className="px-4 py-2 bg-brand-50 rounded-full border border-brand-100" onPress={() => setQuery(tag)}>
                    <Text className="text-[13px] font-bold text-brand-600 font-body">{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View className="p-5">
            <Text className="text-[14px] font-bold text-muted-foreground font-heading mb-4 px-1">
              {isPending ? "Searching..." : `${results.length} Results for "${query}"`}
            </Text>
            
            {isPending && results.length === 0 ? (
              <View className="py-10">
                <LoadingState message="Finding the best products for you..." />
              </View>
            ) : results.length === 0 ? (
              <View className="py-10">
                <EmptyState 
                  title="No results found" 
                  description={`We couldn't find any products matching "${query}".`}
                  iconName="search"
                  fullScreen={false}
                />
              </View>
            ) : (
            <View className="gap-4">
              {results.map((item: any) => (
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                  key={item.id}
                  className="flex-row items-center bg-card rounded-[24px] p-4 border border-border shadow-[0_10px_20px_rgba(0,0,0,0.03)]"
                  onPress={() => router.push(`/(customer)/product/${item.id}` as any)}
                >
                  <View className="w-20 h-20 rounded-[16px] bg-muted items-center justify-center overflow-hidden">
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Icon name="image" size={24} color="#cbd5e1" />
                    )}
                  </View>
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-caption text-brand-600 font-bold uppercase tracking-wide mb-1">{item.vendor}</Text>
                    <Text className="text-[16px] font-bold text-foreground font-heading mb-1">{item.name}</Text>
                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-[15px] font-black text-foreground">GHS {item.price.toFixed(2)}</Text>
                      <View className="flex-row items-center gap-1">
                        <Icon name="star" size={12} color="#f59e0b" />
                        <Text className="text-[12px] font-bold text-muted-foreground">{item.rating}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Dynamic Filter Bottom Sheet (Mocked absolute overlay for now) */}
      {showFilters && (
        <View className="absolute inset-0 bg-black/40 justify-end z-50">
          <View className="bg-card rounded-t-[32px] p-6 shadow-2xl" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[20px] font-heading font-black text-foreground">Filter & Sort</Text>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => setShowFilters(false)} className="w-8 h-8 rounded-full bg-muted items-center justify-center">
                <Icon name="x" size={16} color="#0f172a" />
              </Pressable>
            </View>

            <Text className="text-[14px] font-bold text-foreground font-heading mb-3">Price Range (GHS)</Text>
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 bg-background h-12 rounded-[16px] px-4 justify-center border border-border"><Text className="text-muted-foreground">Min: 0</Text></View>
              <View className="flex-1 bg-background h-12 rounded-[16px] px-4 justify-center border border-border"><Text className="text-muted-foreground">Max: 1000+</Text></View>
            </View>

            <Text className="text-[14px] font-bold text-foreground font-heading mb-3">Sort By</Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {['Recommended', 'Price: Low to High', 'Price: High to Low', 'Top Rated'].map((sort, idx) => (
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} key={idx} 
                  className={`px-4 py-2 rounded-full border ${idx === activeSort ? 'bg-foreground border-surface-900' : 'bg-card border-border'}`}
                  onPress={() => setActiveSort(idx)}
                >
                  <Text className={`text-[13px] font-bold ${idx === activeSort ? 'text-white' : 'text-muted-foreground'}`}>{sort}</Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row gap-3">
              <Button title="Reset" variant="outline" size="lg" className="flex-1 rounded-full" onPress={() => setShowFilters(false)} />
              <Button title="Apply Filters" size="lg" className="flex-1 rounded-full" onPress={() => setShowFilters(false)} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
