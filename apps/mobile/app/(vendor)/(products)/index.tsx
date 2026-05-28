import { View, Text, FlatList, Pressable, Modal, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVendorProducts } from "@/lib/hooks/use-vendor";
import { useVendorServices } from "@/lib/hooks/use-vendor-services";
import { useFoodItems } from "@/lib/hooks/use-food";
import { ProductCard } from "@/components/ui/ProductCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";

const PRODUCT_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "out_of_stock", label: "Out of Stock" },
  { id: "draft", label: "Drafts" },
];

const SERVICE_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "draft", label: "Drafts" },
];

const FOOD_FILTERS = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "sold_out", label: "Sold Out" },
  { id: "draft", label: "Drafts" },
];

export default function ListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"products" | "food" | "services">("products");
  const [filter, setFilter] = useState("all");
  const [isAddModalVisible, setAddModalVisible] = useState(false);

  // When switching tabs, reset filter
  const handleTabSwitch = (tab: "products" | "food" | "services") => {
    setActiveTab(tab);
    setFilter("all");
  };

  const { data: products = [], isLoading: productsLoading } = useVendorProducts();
  const { data: services = [], isLoading: servicesLoading } = useVendorServices();
  const { data: food = [], isLoading: foodLoading } = useFoodItems({});

  const activeFilters = activeTab === "products" ? PRODUCT_FILTERS : activeTab === "food" ? FOOD_FILTERS : SERVICE_FILTERS;
  const activeData = activeTab === "products" ? products : activeTab === "food" ? food : services;
  const isLoading = activeTab === "products" ? productsLoading : activeTab === "food" ? foodLoading : servicesLoading;

  const filteredItems = activeData.filter((item: any) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  return (
    <View className="flex-1 bg-background">
      
      {/* Header & Search */}
      <View 
        className="bg-card px-5 pt-4 pb-2 border-b border-border"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <Text className="text-[28px] font-heading font-black text-foreground mb-6">
          My Listings
        </Text>
        
        {/* Segmented Control */}
        <View className="flex-row bg-muted p-1 rounded-xl mb-4">
          <Pressable 
            onPress={() => handleTabSwitch("products")}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${activeTab === "products" ? "bg-card border border-border" : ""}`}
          >
            <Text className={`text-[13px] font-bold ${activeTab === "products" ? "text-foreground" : "text-muted-foreground"}`}>Products</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleTabSwitch("food")}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${activeTab === "food" ? "bg-card border border-border" : ""}`}
          >
            <Text className={`text-[13px] font-bold ${activeTab === "food" ? "text-foreground" : "text-muted-foreground"}`}>Food</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleTabSwitch("services")}
            className={`flex-1 py-2 items-center justify-center rounded-lg ${activeTab === "services" ? "bg-card border border-border" : ""}`}
          >
            <Text className={`text-[13px] font-bold ${activeTab === "services" ? "text-foreground" : "text-muted-foreground"}`}>Services</Text>
          </Pressable>
        </View>

        <SearchBar placeholder={`Search your ${activeTab}...`} />
        
        {/* Filters */}
        <View className="mt-4 pb-2">
          <FlatList
            data={activeFilters}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                onPress={() => setFilter(item.id)}
                className={`px-4 py-2 rounded-full border ${
                  filter === item.id 
                    ? "bg-foreground border-surface-900" 
                    : "bg-card border-border"
                }`}
              >
                <Text 
                  className={`text-[13px] font-bold ${
                    filter === item.id ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#004CFF" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View className="flex-1 justify-center px-5">
          <EmptyState
            iconName={activeTab === "products" ? "package" : activeTab === "food" ? "coffee" : "briefcase"}
            title={`No ${activeTab} found`}
            description={filter === "all" ? `You haven't added any ${activeTab} yet.` : `You have no ${filter.replace("_", " ")} ${activeTab}.`}
            actionLabel={`Add ${activeTab === "products" ? "Product" : activeTab === "food" ? "Food Item" : "Service"}`}
            onAction={() => setAddModalVisible(true)}
          />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: any) => {
            const subtitle = activeTab === "products" 
              ? `${item.stock} in stock • ${item.category}`
              : activeTab === "food"
              ? `${item.prepTime} • ${item.category}`
              : `${item.duration} • ${item.category}`;

            return (
              <ProductCard
                id={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.images?.[0]?.url}
                subtitle={subtitle}
                variant="horizontal"
                onPress={() => router.push(`/(vendor)/(products)/${item.id}`)}
              />
            );
          }}
        />
      )}

      {/* Flat FAB */}
      <View className="absolute bottom-6 right-6">
        <Pressable 
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          className="w-14 h-14 bg-brand-600 rounded-full items-center justify-center border-4 border-brand-100"
          onPress={() => setAddModalVisible(true)}
        >
          <Icon name="plus" size={24} color="#ffffff" />
        </Pressable>
      </View>

      {/* Add Action Sheet Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable 
            className="absolute inset-0" 
            onPress={() => setAddModalVisible(false)} 
          />
          <View className="bg-card rounded-t-[32px] p-6 pb-12">
            <View className="w-12 h-1.5 bg-accent rounded-full self-center mb-6" />
            <Text className="text-[20px] font-heading font-bold text-foreground mb-6">Create New Listing</Text>
            
            <View className="gap-3">
              <Pressable 
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center p-4 bg-background border border-border rounded-[20px]"
                onPress={() => {
                  setAddModalVisible(false);
                  router.push("/(vendor)/(products)/add-product");
                }}
              >
                <View className="w-12 h-12 bg-card rounded-full items-center justify-center border border-border">
                  <Icon name="package" size={24} color="#0f172a" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-bold text-foreground mb-0.5">Physical Product</Text>
                  <Text className="text-[13px] font-body text-muted-foreground">Items that require shipping or delivery</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center p-4 bg-background border border-border rounded-[20px]"
                onPress={() => {
                  setAddModalVisible(false);
                  router.push("/(vendor)/(products)/add-food");
                }}
              >
                <View className="w-12 h-12 bg-card rounded-full items-center justify-center border border-border">
                  <Icon name="coffee" size={24} color="#0f172a" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-bold text-foreground mb-0.5">Food Item</Text>
                  <Text className="text-[13px] font-body text-muted-foreground">Restaurant meals, snacks, or beverages</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center p-4 bg-background border border-border rounded-[20px]"
                onPress={() => {
                  setAddModalVisible(false);
                  router.push("/(vendor)/(products)/add-service");
                }}
              >
                <View className="w-12 h-12 bg-card rounded-full items-center justify-center border border-border">
                  <Icon name="briefcase" size={24} color="#0f172a" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-bold text-foreground mb-0.5">Service</Text>
                  <Text className="text-[13px] font-body text-muted-foreground">Bookable appointments or freelance work</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}