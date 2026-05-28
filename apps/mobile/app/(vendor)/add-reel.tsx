import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useProductStore } from "@/lib/stores/product-store";
import { usePopupStore } from "@/lib/stores/popup-store";
import { useCreateReel } from "@/lib/hooks/use-vendor-reels";

export default function AddReelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const createReel = useCreateReel();
  const products = useProductStore((s) => s.products);
  const showPopup = usePopupStore((s) => s.showPopup);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);
  const [isProductModalVisible, setProductModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Since we simulate video, we'll pick a random high-res image
  const handleUploadOption = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadModalVisible(false);
      // Dummy high-res vertical image to simulate video thumbnail/content
      setVideoUrl("https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=1000&auto=format&fit=crop");
    }, 1500);
  };

  const handlePublish = () => {
    if (!videoUrl) {
      showPopup({ type: "error", title: "Missing Video", message: "Please upload a video to continue." });
      return;
    }
    if (!selectedProductId) {
      showPopup({ type: "error", title: "Product Required", message: "Tag a product to make this reel shoppable." });
      return;
    }

    const linkedProduct = products.find(p => p.id === selectedProductId);
    if (!linkedProduct) return;

    setIsPublishing(true);

    const payload = {
      videoUrl,
      description: description || "Check out this amazing product! 🛍️✨",
      productId: linkedProduct.id,
      productName: linkedProduct.name,
      productPrice: linkedProduct.price,
    };

    createReel.mutate(payload, {
      onSuccess: () => {
        setIsPublishing(false);
        showPopup({ 
          type: "success", 
          title: "Reel Published!", 
          message: "Your reel is now live for all customers to watch." 
        });
        router.back();
      },
      onError: () => {
        setIsPublishing(false);
      },
    });
  };

  const linkedProduct = products.find(p => p.id === selectedProductId);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-surface-50"
    >
      {/* Header */}
      <View 
        className="px-5 pb-4 bg-white/80 backdrop-blur-xl border-b border-surface-100 flex-row justify-between items-center z-10 absolute top-0 left-0 right-0"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <BackButton className="bg-surface-100" />
        <Text className="text-[18px] font-heading font-black text-surface-900 tracking-tight">
          New Reel
        </Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerClassName="px-5 pb-32"
        style={{ marginTop: (insets.top || 12) + 64 }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Video Upload Section */}
        <View className="mb-8 mt-2">
          <Pressable 
            style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => setUploadModalVisible(true)}
            className="w-full aspect-[9/16] bg-surface-900 rounded-[32px] overflow-hidden items-center justify-center relative shadow-lg shadow-black/10"
          >
            {videoUrl ? (
              <>
                <Image source={{ uri: videoUrl }} style={{ width: '100%', height: '100%', opacity: 0.9 }} contentFit="cover" />
                <View className="absolute inset-0 items-center justify-center bg-black/20">
                  <View className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl items-center justify-center border border-white/30">
                    <Icon name="play" size={24} color="#fff" style={{ marginLeft: 4 }} />
                  </View>
                </View>
                <View className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full flex-row items-center border border-white/10">
                  <Icon name="camera" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="text-white font-bold text-[12px]">Replace</Text>
                </View>
              </>
            ) : (
              <View className="items-center justify-center p-6 w-full h-full border-[3px] border-dashed border-surface-700/50 rounded-[32px] m-1">
                <View className="w-20 h-20 rounded-full bg-brand-600/20 items-center justify-center mb-5">
                  <Icon name="video" size={32} color="#38bdf8" />
                </View>
                <Text className="text-[20px] font-heading font-black text-white mb-2 tracking-tight">Upload Video</Text>
                <Text className="text-[14px] text-surface-400 text-center font-body px-8">High quality vertical videos (9:16) perform best.</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Details Section */}
        <View className="bg-white rounded-[24px] border border-surface-100 p-1 mb-6 shadow-sm shadow-surface-200/50">
          <TextInput
            className="p-5 font-body text-[16px] text-surface-900 min-h-[120px]"
            placeholder="Write a catchy caption... #trending #fashion"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Link Product Section */}
        <Text className="text-[14px] font-bold text-surface-500 mb-3 ml-2 uppercase tracking-wider">Shoppable Link</Text>
        <Pressable 
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className={`flex-row items-center p-4 rounded-[24px] border ${linkedProduct ? 'bg-brand-50 border-brand-200' : 'bg-white border-surface-200 border-dashed'}`}
          onPress={() => setProductModalVisible(true)}
        >
          {linkedProduct ? (
            <>
              <View className="w-14 h-14 bg-white rounded-[16px] items-center justify-center border border-brand-100 shadow-sm shadow-brand-200">
                <Icon name="shopping-bag" size={24} color="#004CFF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[16px] font-bold text-surface-900 mb-1 tracking-tight" numberOfLines={1}>{linkedProduct.name}</Text>
                <Text className="text-[14px] text-brand-600 font-bold">GHS {linkedProduct.price.toFixed(2)}</Text>
              </View>
              <View className="w-8 h-8 bg-brand-100 rounded-full items-center justify-center">
                <Icon name="edit-2" size={14} color="#004CFF" />
              </View>
            </>
          ) : (
            <>
              <View className="w-14 h-14 bg-surface-100 rounded-[16px] items-center justify-center">
                <Icon name="tag" size={24} color="#64748b" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[16px] font-bold text-surface-900 mb-0.5 tracking-tight">Tag a Product</Text>
                <Text className="text-[13px] text-surface-500 font-body">Allow customers to buy while watching</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#94a3b8" />
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Floating Sticky Publish Button */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-surface-100 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <Button
          title={videoUrl ? "Publish Reel" : "Select Video to Publish"}
          size="lg"
          loading={isPublishing}
          disabled={!videoUrl || isPublishing}
          onPress={handlePublish}
          className="w-full shadow-lg shadow-brand-600/20"
        />
      </View>

      {/* Upload Action Sheet */}
      <Modal
        visible={isUploadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isUploading && setUploadModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable 
            className="absolute inset-0" 
            onPress={() => !isUploading && setUploadModalVisible(false)} 
          />
          <View className="bg-white rounded-t-[32px] p-6" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
            <View className="w-12 h-1.5 bg-surface-200 rounded-full self-center mb-8" />
            
            {isUploading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="large" color="#004CFF" />
                <Text className="mt-6 text-[18px] font-heading font-bold text-surface-900 tracking-tight">Processing video...</Text>
                <Text className="mt-2 text-[14px] text-surface-500 text-center px-10">Optimizing for the best playback experience on mobile devices.</Text>
              </View>
            ) : (
              <>
                <Text className="text-[24px] font-heading font-black text-surface-900 mb-6 tracking-tight">Select Source</Text>
                <View className="gap-4">
                  <Pressable 
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className="flex-row items-center p-5 bg-surface-50 border border-surface-100 rounded-[24px]"
                    onPress={handleUploadOption}
                  >
                    <View className="w-14 h-14 bg-white rounded-full items-center justify-center shadow-sm shadow-surface-200">
                      <Icon name="camera" size={24} color="#0f172a" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-[16px] font-bold text-surface-900 mb-1 tracking-tight">Record Video</Text>
                      <Text className="text-[13px] font-body text-surface-500">Use camera to capture content</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="#cbd5e1" />
                  </Pressable>

                  <Pressable 
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className="flex-row items-center p-5 bg-brand-50 border border-brand-100 rounded-[24px]"
                    onPress={handleUploadOption}
                  >
                    <View className="w-14 h-14 bg-brand-600 rounded-full items-center justify-center shadow-md shadow-brand-600/30">
                      <Icon name="image" size={24} color="#fff" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-[16px] font-bold text-brand-900 mb-1 tracking-tight">Choose from Gallery</Text>
                      <Text className="text-[13px] font-body text-brand-700">Select an existing video</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="#004CFF" />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={isProductModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProductModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[32px] h-[80%]" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
            <View className="p-6 pb-4 border-b border-surface-100 flex-row items-center justify-between">
              <Text className="text-[20px] font-heading font-black text-surface-900 tracking-tight">Tag Product</Text>
              <Pressable 
                onPress={() => setProductModalVisible(false)}
                className="w-10 h-10 rounded-full bg-surface-100 items-center justify-center"
              >
                <Icon name="x" size={20} color="#0f172a" />
              </Pressable>
            </View>
            
            <View className="p-5 border-b border-surface-100">
              <View className="flex-row items-center bg-surface-100 rounded-full px-4 h-12">
                <Icon name="search" size={20} color="#64748b" />
                <TextInput 
                  placeholder="Search your products..."
                  className="flex-1 ml-3 font-body text-[15px] text-surface-900"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
              {products.map(product => (
                <Pressable
                  key={product.id}
                  onPress={() => {
                    setSelectedProductId(product.id);
                    setProductModalVisible(false);
                  }}
                  className={`flex-row items-center p-4 mb-3 rounded-[20px] border ${selectedProductId === product.id ? 'bg-brand-50 border-brand-200' : 'bg-surface-50 border-surface-100'}`}
                >
                  <View className="w-16 h-16 bg-surface-200 rounded-[12px] items-center justify-center">
                    <Icon name="package" size={24} color="#94a3b8" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-[16px] font-bold text-surface-900 mb-1 tracking-tight" numberOfLines={1}>{product.name}</Text>
                    <Text className="text-[13px] text-surface-500 font-body mb-1">{product.category}</Text>
                    <Text className="text-[14px] text-brand-600 font-bold">GHS {product.price.toFixed(2)}</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full items-center justify-center border-2 ${selectedProductId === product.id ? 'bg-brand-600 border-brand-600' : 'bg-transparent border-surface-300'}`}>
                    {selectedProductId === product.id && <Icon name="check" size={12} color="#fff" />}
                  </View>
                </Pressable>
              ))}
              <View className="h-10" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </KeyboardAvoidingView>
  );
}
