import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Alert, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateProduct, useUpdateProduct } from "@/lib/hooks/use-vendor";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { uploadApi } from "@/lib/api/upload";

export default function AddProductScreen() {
  const router = useRouter();
  const { mode, id } = useLocalSearchParams();
  const isEdit = mode === "edit";

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const insets = useSafeAreaInsets();
  const [name, setName] = useState(isEdit ? "Wireless Earbuds Pro" : "");
  const [category, setCategory] = useState(isEdit ? "Electronics" : "");
  const [description, setDescription] = useState(isEdit ? "High-quality wireless earbuds with active noise cancellation." : "");
  const [price, setPrice] = useState(isEdit ? "124.99" : "");
  const [comparePrice, setComparePrice] = useState("");
  const [quantity, setQuantity] = useState(isEdit ? "45" : "");
  const [sku, setSku] = useState(isEdit ? "EB-001" : "");
  const [shippingRequired, setShippingRequired] = useState(true);
  
  const [localImages, setLocalImages] = useState<{ uri: string; type: string; name: string; url?: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const loading = createMutation.isPending || updateMutation.isPending || uploadingImages;

  const pickImage = async () => {
    if (localImages.length >= 5) {
      Alert.alert("Limit Reached", "You can only upload up to 5 images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - localImages.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || `product-${Date.now()}.jpg`
      }));
      setLocalImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setLocalImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (status: "active" | "draft") => {
    if (!name || !price) {
      Alert.alert("Required", "Name and price are required.");
      return;
    }

    try {
      setUploadingImages(true);
      const uploadedImages = [];
      for (const img of localImages) {
        if (img.url) {
          uploadedImages.push({ url: img.url });
        } else {
          const res = await uploadApi.uploadFile({ uri: img.uri, name: img.name, type: img.type });
          uploadedImages.push({ url: res.url });
        }
      }

      const formData = {
        name, category, description,
        price: parseFloat(price),
        stock: quantity ? parseInt(quantity, 10) : 0,
        images: uploadedImages,
      };

      if (isEdit) {
        updateMutation.mutate({ ...formData, id }, {
          onSuccess: () => { Alert.alert("Updated", "Product updated successfully!"); router.back(); },
          onError: () => Alert.alert("Error", "Failed to update product."),
          onSettled: () => setUploadingImages(false)
        });
      } else {
        createMutation.mutate(formData, {
          onSuccess: () => { Alert.alert("Published", "Product published successfully!"); router.back(); },
          onError: () => Alert.alert("Error", "Failed to create product."),
          onSettled: () => setUploadingImages(false)
        });
      }
    } catch (error) {
      setUploadingImages(false);
      Alert.alert("Error", "Failed to upload images. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Custom Header */}
      <View 
        className="px-5 pb-4 bg-card border-b border-border flex-row items-center"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <BackButton className="mr-3" />
        <Text className="text-[20px] font-heading font-black text-foreground">
          {isEdit ? "Edit Product" : "Add Product"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pb-12 pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

      {/* Image Upload Area */}
      {localImages.length > 0 ? (
        <View className="mb-8 flex-row flex-wrap gap-3">
          {localImages.map((img, idx) => (
            <View key={idx} className="w-[30%] aspect-square relative rounded-[16px] overflow-hidden border border-border">
              <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              <Pressable 
                onPress={() => removeImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full items-center justify-center"
              >
                <Icon name="x" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {localImages.length < 5 && (
            <Pressable 
              onPress={pickImage}
              className="w-[30%] aspect-square bg-muted rounded-[16px] items-center justify-center border-2 border-dashed border-border"
            >
              <Icon name="plus" size={24} color="#64748b" />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable 
          onPress={pickImage}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          className="w-full h-48 bg-muted rounded-[20px] items-center justify-center border-2 border-dashed border-border mb-8"
        >
          <View className="w-14 h-14 bg-card rounded-full items-center justify-center mb-3">
            <Icon name="camera" size={24} color="#64748b" />
          </View>
          <Text className="text-[14px] font-bold text-muted-foreground">Add Product Photos</Text>
          <Text className="text-[12px] text-muted-foreground mt-1">Upload up to 5 images</Text>
        </Pressable>
      )}

      <View className="gap-5">
        <View>
          <Text className="text-[16px] font-bold text-foreground mb-4">Basic Details</Text>
          <View className="gap-4">
            <Input
              label="Product Name"
              placeholder="e.g. Wireless Earbuds Pro"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Category"
              placeholder="e.g. Electronics"
              value={category}
              onChangeText={setCategory}
            />
            <Input
              label="Description"
              placeholder="Describe your product..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View className="h-px bg-accent my-2" />

        <View>
          <Text className="text-[16px] font-bold text-foreground mb-4">Pricing</Text>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Input
                label="Price (GHS)"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Compare at Price"
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={comparePrice}
                onChangeText={setComparePrice}
              />
            </View>
          </View>
        </View>

        <View className="h-px bg-accent my-2" />

        <View>
          <Text className="text-[16px] font-bold text-foreground mb-4">Inventory</Text>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Input
                label="Quantity in Stock"
                placeholder="0"
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
            <View className="flex-1">
              <Input
                label="SKU (Optional)"
                placeholder="e.g. EB-001"
                value={sku}
                onChangeText={setSku}
              />
            </View>
          </View>
        </View>

        <View className="h-px bg-accent my-2" />

        <View>
          <Text className="text-[16px] font-bold text-foreground mb-4">Shipping</Text>
          <Pressable 
            onPress={() => setShippingRequired(!shippingRequired)}
            className="flex-row items-center justify-between p-4 bg-card rounded-[16px] border border-border"
          >
            <View>
              <Text className="text-[15px] font-bold text-foreground">Physical Product</Text>
              <Text className="text-[13px] text-muted-foreground mt-1">This item requires shipping</Text>
            </View>
            <View className={`w-12 h-7 rounded-full p-1 ${shippingRequired ? 'bg-brand-600' : 'bg-accent'}`}>
              <View className={`w-5 h-5 rounded-full bg-card ${shippingRequired ? 'translate-x-5' : 'translate-x-0'}`} />
            </View>
          </Pressable>
        </View>

        <View className="mt-6 gap-3">
          <Button
            title={uploadingImages ? "Uploading Photos..." : (isEdit ? "Update Product" : "Publish Product")}
            size="lg"
            loading={loading}
            onPress={() => handleSubmit("active")}
            className="w-full"
          />
          <Pressable 
            onPress={() => handleSubmit("draft")}
            className="w-full py-4 items-center rounded-full border border-border bg-card"
            disabled={loading}
          >
            <Text className="text-[15px] font-bold text-muted-foreground">Save as Draft</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
    </View>
  );
}
