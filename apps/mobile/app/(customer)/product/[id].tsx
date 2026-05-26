import { View, Text, FlatList, ScrollView, Dimensions, useWindowDimensions, Pressable, Share, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useCallback, useRef } from "react";
import { Image } from "expo-image";
import { Button } from "@/components/ui/Button";
import { useProduct } from "@/lib/hooks/use-products";
import { useAddToCart } from "@/lib/hooks/use-cart";
import { Icon } from "@/components/ui/Icon";
import Toast from "@/lib/toast-polyfill";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);
  const addToCartMutation = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const onImageScroll = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveImageIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#004CFF" />
      </View>
    );
  }
  if (!product) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-5">
        <Text className="text-body-md text-muted-foreground font-body text-center">Product not found</Text>
      </View>
    );
  }

  const handleAddToCart = () => {
    if (!product) return;
    addToCartMutation.mutate({ productId: product.id, quantity });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/(customer)/cart");
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pb-40" showsVerticalScrollIndicator={false}>
        {/* ===== IMAGE GALLERY ===== */}
        <View className="relative">
          <FlatList
            ref={flatListRef}
            data={product.images.length > 0 ? product.images : [""]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
            onViewableItemsChanged={onImageScroll}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH }} className="h-[320px] bg-muted">
                <Image 
                  source={{ uri: item }} 
                  style={{ width: '100%', height: '100%' }} 
                  contentFit="cover" 
                  transition={200}
                />
              </View>
            )}
          />

          {/* Back Button */}
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="absolute top-12 left-4 w-10 h-10 rounded-full bg-card/90 items-center justify-center shadow-md"
            onPress={() => router.back()}
          >
            <Icon name="arrow-left" size={18} color="#1e293b" />
          </Pressable>

          {/* Share & Favorite */}
          <View className="absolute top-12 right-4 flex-row gap-2">
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="w-10 h-10 rounded-full bg-card/90 items-center justify-center shadow-md" onPress={() => Share.share({ message: `Check out ${product.name} on Bexiemart! Only GHS ${product.price.toFixed(2)}` })}>
              <Icon name="share-2" size={18} color="#1e293b" />
            </Pressable>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="w-10 h-10 rounded-full bg-card/90 items-center justify-center shadow-md"
              onPress={() => setIsFavorited(!isFavorited)}
            >
              <Icon name="heart" size={18} color={isFavorited ? "#ef4444" : "#1e293b"} />
            </Pressable>
          </View>

          {/* Discount Badge */}
          {product.discount > 0 && (
            <View className="absolute top-44 left-4 bg-rose-500 px-3 py-1.5 rounded-full">
              <Text className="text-body-sm font-bold text-white font-body">-{product.discount}% OFF</Text>
            </View>
          )}

          {/* Dot Indicators */}
          {product.images.length > 1 && (
            <View className="absolute bottom-4 w-full flex-row justify-center gap-1.5">
              {product.images.map((_: any, i: any) => (
                <View key={i} className={`h-2 rounded-full ${i === activeImageIndex ? "w-6 bg-brand-600" : "w-2 bg-card/60"}`} />
              ))}
            </View>
          )}
        </View>

        {/* ===== PRODUCT INFO ===== */}
        <View className="px-5 pt-6">
          {/* Name & Price */}
          <Text className="text-display-sm font-heading font-bold text-foreground leading-tight">
            {product.name}
          </Text>

          <View className="flex-row items-center gap-3 mt-3">
            <Text className="text-heading-lg font-bold text-brand-600 font-heading">
              GHS {product.price.toFixed(2)}
            </Text>
            {product.oldPrice > product.price && (
              <Text className="text-body-md text-muted-foreground font-body line-through">
                GHS {product.oldPrice.toFixed(2)}
              </Text>
            )}
            {product.discount > 0 && (
              <View className="bg-rose-50 px-2 py-0.5 rounded-lg">
                <Text className="text-caption font-bold text-rose-600 font-body">Save GHS {(product.oldPrice - product.price).toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Rating & Stock */}
          <View className="flex-row items-center gap-4 mt-3">
            <View className="flex-row items-center gap-1.5">
              <View className="flex-row gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon key={star} name="star" size={14} color={star <= Math.round(product.rating) ? "#f59e0b" : "#e2e8f0"} />
                ))}
              </View>
              <Text className="text-body-sm font-bold text-muted-foreground font-body">{product.rating}</Text>
              <Text className="text-body-sm text-muted-foreground font-body">({product.reviewCount} reviews)</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
              <Text className={`text-body-sm font-semibold font-body ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {product.stock > 0 ? `In Stock (${product.stock} left)` : "Out of Stock"}
              </Text>
            </View>
          </View>
        </View>

        {/* ===== DESCRIPTION ===== */}
        <View className="px-5 mt-6">
          <Text className="text-heading-sm font-heading font-bold text-foreground mb-3">
            Description
          </Text>
          <Text className="text-body-md text-muted-foreground font-body leading-relaxed" numberOfLines={showFullDesc ? undefined : 4}>
            {product.description}
          </Text>
          {product.description.length > 200 && (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mt-2" onPress={() => setShowFullDesc(!showFullDesc)}>
              <View className="flex-row items-center gap-1">
                <Text className="text-body-sm font-bold text-brand-600 font-body">
                  {showFullDesc ? "Show less" : "Read more"}
                </Text>
                <Icon name={showFullDesc ? "chevron-up" : "chevron-down"} size={14} color="#004CFF" />
              </View>
            </Pressable>
          )}
        </View>

        {/* ===== SELLER INFO ===== */}
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mx-5 mt-6 bg-card rounded-[24px] p-5 border border-border" onPress={() => router.push({ pathname: "/(customer)/chat", params: { contact: product.seller.name, role: "Seller" } })}>
          <Text className="text-caption text-muted-foreground font-body uppercase tracking-wider mb-3 font-bold">Sold by</Text>
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-muted items-center justify-center">
              <Icon name="store" size={22} color="#004CFF" />
            </View>
            <View className="flex-1">
              <Text className="text-body-md font-bold text-foreground font-body">{product.seller.name}</Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                <Icon name="star" size={11} color="#f59e0b" />
                <Text className="text-caption text-muted-foreground font-body">{product.seller.rating}  {product.seller.products} products</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
                className="w-10 h-10 rounded-full bg-background items-center justify-center border border-border"
                onPress={() => router.push({ pathname: "/(customer)/chat", params: { contact: product.seller.name, role: "Seller" } })}
              >
                <Icon name="message-circle" size={18} color="#475569" />
              </Pressable>
            </View>
          </View>
        </Pressable>

        {/* ===== DELIVERY OPTIONS ===== */}
        <View className="px-5 mt-6">
          <Text className="text-heading-sm font-heading font-bold text-foreground mb-3">
            Delivery Options
          </Text>
          <View className="gap-0">
            {product.deliveryOptions.map((option: any, index: number) => (
              <View key={index} className="flex-row items-center gap-4 bg-card rounded-[24px] p-5 border border-border mb-3">
                <View className="w-10 h-10 rounded-full bg-background items-center justify-center">
                  <Icon name={option.icon} size={18} color="#475569" />
                </View>
                <View className="flex-1">
                  <Text className="text-body-md font-bold text-foreground font-body">{option.type}</Text>
                  <Text className="text-body-sm text-muted-foreground font-body">{option.duration}</Text>
                </View>
                <Text className="text-body-md font-bold text-brand-600 font-heading">
                  {option.fee === 0 ? "FREE" : `GHS ${option.fee.toFixed(2)}`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== REVIEWS ===== */}
        <View className="px-5 mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-heading-sm font-heading font-bold text-foreground">
              Reviews ({product.reviewCount})
            </Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} onPress={() => Toast.show({ type: "info", text1: "All Reviews", text2: "Full reviews page coming soon." })}>
              <Text className="text-body-sm font-bold text-brand-600 font-body">See All</Text>
            </Pressable>
          </View>

          <View className="gap-0">
            {product.reviews.slice(0, 3).map((review: any) => (
              <View key={review.id} className="bg-card rounded-[24px] p-5 border border-border mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-brand-100 items-center justify-center">
                      <Text className="text-body-sm font-bold text-brand-600 font-heading">
                        {review.user.charAt(0)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-body-sm font-bold text-foreground font-body">{review.user}</Text>
                      <View className="flex-row gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon key={star} name="star" size={10} color={star <= review.rating ? "#f59e0b" : "#e2e8f0"} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text className="text-caption text-muted-foreground font-body">{review.date}</Text>
                </View>
                <Text className="text-body-sm text-muted-foreground font-body leading-relaxed">{review.comment}</Text>
              </View>
            ))}
          </View>
          
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
            className="w-full bg-brand-50 py-4 rounded-full items-center justify-center mt-2 border border-brand-100 flex-row gap-2"
            onPress={() => router.push("/(customer)/review-modal")}
          >
            <Icon name="edit-3" size={16} color="#004CFF" />
            <Text className="text-body-sm font-bold text-brand-600 font-body">Write a Review</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ===== STICKY BOTTOM BAR ===== */}
      <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-4 pt-3 pb-8 shadow-2xl">
        <View className="flex-row items-center gap-3">
          {/* Quantity Selector */}
          <View className="flex-row items-center bg-background rounded-full border border-border">
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="w-11 h-11 items-center justify-center"
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Icon name="minus" size={18} color={quantity <= 1 ? "#cbd5e1" : "#475569"} />
            </Pressable>
            <Text className="text-body-md font-bold text-foreground font-body w-8 text-center">{quantity}</Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="w-11 h-11 items-center justify-center"
              onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
            >
              <Icon name="plus" size={18} color={quantity >= product.stock ? "#cbd5e1" : "#475569"} />
            </Pressable>
          </View>

          {/* Add to Cart */}
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className={`flex-1 h-[52px] rounded-full items-center justify-center active:scale-[0.98] ${
              addedToCart ? "bg-emerald-500" : "bg-brand-600"
            }`}
            onPress={handleAddToCart}
            disabled={addedToCart}
          >
            <View className="flex-row items-center gap-2">
              <Icon name={addedToCart ? "check-circle" : "shopping-bag"} size={18} color="#fff" />
              <Text className="text-body-md font-bold text-white font-body">
                {addedToCart ? "Added to Cart" : "Add to Cart"}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Buy Now */}
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className="mt-2 h-[46px] rounded-full items-center justify-center bg-accent-600 active:scale-[0.98]"
          onPress={handleBuyNow}
        >
          <View className="flex-row items-center gap-2">
            <Icon name="zap" size={16} color="#fff" />
            <Text className="text-body-md font-bold text-white font-body">Buy Now  GHS {(product.price * quantity).toFixed(2)}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
