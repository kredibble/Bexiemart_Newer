import { BackButton } from "@/components/ui/BackButton";
import { View, Text, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import Toast from "@/lib/toast-polyfill";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress } from "@/lib/hooks/use-addresses";
import type { Address } from "@/lib/stores/address-store";

export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: addressesData, isPending, isError, refetch } = useAddresses();
  const addresses = addressesData ?? [];
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'Home',
    name: '',
    address: '',
    city: '',
    phone: ''
  });

  const handleSetDefault = (id: string) => {
    setDefault.mutate(id, {
      onSuccess: () => {
        Toast.show({ type: "success", text1: "Default Address Set", text2: "Your default delivery address has been updated." });
      },
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'Home': return "home";
      case 'Office': return "briefcase";
      default: return "map-pin";
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ type: 'Home', name: '', address: '', city: '', phone: '' });
    setIsModalVisible(true);
  };

  const openEditModal = (address: Address) => {
    setEditingId(address.id);
    setFormData({
      type: address.type,
      name: address.name,
      address: address.address,
      city: address.city,
      phone: address.phone
    });
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.address || !formData.city || !formData.phone) {
      Toast.show({ type: "error", text1: "Missing Fields", text2: "Please fill out all fields." });
      return;
    }

    if (editingId) {
      updateAddress.mutate({ id: editingId, ...formData }, {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Address Updated", text2: "Your address has been saved." });
          setIsModalVisible(false);
        },
      });
    } else {
      createAddress.mutate({ ...formData, isDefault: false }, {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Address Added", text2: "Your new address has been added." });
          setIsModalVisible(false);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteAddress.mutate(id, {
      onSuccess: () => {
        Toast.show({ type: "info", text1: "Address Removed", text2: "The address has been deleted." });
      },
    });
  };

  if (isPending) {
    return <LoadingState message="Loading your addresses..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load your addresses." onRetry={refetch} />;
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View 
        className="px-5 pb-4 bg-card border-b border-border flex-row justify-between items-center"
        style={{ paddingTop: (insets.top || 12) + 12 }}
      >
        <View className="flex-row items-center gap-3">
          <BackButton />
          <Text className="text-[20px] font-heading font-black text-foreground">
            Delivery Addresses
          </Text>
        </View>
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
          className="w-10 h-10 rounded-full bg-brand-50 items-center justify-center border border-brand-100" 
          onPress={openAddModal}
        >
          <Icon name="plus" size={20} color="#004CFF" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5 pt-6 pb-10" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          {addresses.map((address: any) => (
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} 
              key={address.id} 
              className={`bg-card rounded-[24px] p-5 border shadow-[0_10px_20px_rgba(0,0,0,0.02)] ${address.isDefault ? 'border-brand-500 bg-brand-50/20' : 'border-border'}`}
              onPress={() => handleSetDefault(address.id)}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center gap-2">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${address.isDefault ? 'bg-brand-100' : 'bg-muted'}`}>
                    <Icon name={getIcon(address.type)} size={14} color={address.isDefault ? '#004CFF' : '#64748b'} />
                  </View>
                  <Text className="text-[14px] font-heading font-bold text-foreground uppercase tracking-wider">{address.type}</Text>
                </View>
                <View className="flex-row gap-2">
                  {address.isDefault && (
                    <View className="bg-brand-500 px-2 py-0.5 rounded-md justify-center">
                      <Text className="text-[10px] font-bold text-white uppercase tracking-wider">Default</Text>
                    </View>
                  )}
                  <Pressable onPress={() => handleDelete(address.id)} className="w-6 h-6 items-center justify-center bg-rose-50 rounded-full border border-rose-100">
                    <Icon name="trash-2" size={12} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
              
              <Text className="text-[16px] font-bold text-foreground font-body mb-1">{address.name}</Text>
              <Text className="text-[14px] text-muted-foreground font-body mb-0.5">{address.address}</Text>
              <Text className="text-[14px] text-muted-foreground font-body mb-3">{address.city}</Text>
              <Text className="text-[14px] font-medium text-foreground font-body mb-4">{address.phone}</Text>

              <View className="flex-row gap-3 pt-4 border-t border-border">
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center py-1" onPress={(e) => { e.stopPropagation(); openEditModal(address); }}>
                  <Text className="text-[13px] font-bold text-brand-600 font-heading">Edit</Text>
                </Pressable>
                {!address.isDefault && (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center py-1 border-l border-border" onPress={(e) => { e.stopPropagation(); handleSetDefault(address.id); }}>
                    <Text className="text-[13px] font-bold text-muted-foreground font-heading">Set Default</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          ))}
          {addresses.length === 0 && (
            <View className="py-10">
              <EmptyState 
                title="No addresses found" 
                description="Add your delivery address to proceed with checkout." 
                iconName="map-pin"
                fullScreen={false}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Address Form Modal */}
      {isModalVisible && (
        <View className="absolute inset-0 z-50 flex-1 justify-end bg-black/50" style={{ elevation: 100 }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            className="flex-1 justify-end"
          >
            <View className="bg-card rounded-t-[32px] p-6 pb-10" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-[20px] font-heading font-bold text-foreground">
                  {editingId ? "Edit Address" : "Add Address"}
                </Text>
                <Pressable onPress={() => setIsModalVisible(false)} className="w-8 h-8 rounded-full bg-muted items-center justify-center">
                  <Icon name="x" size={16} color="#64748b" />
                </Pressable>
              </View>

            <ScrollView className="mb-4" showsVerticalScrollIndicator={false}>
              {/* Type Selection */}
              <View className="flex-row gap-3 mb-4">
                {['Home', 'Office', 'Other'].map(type => (
                  <Pressable 
                    key={type}
                    onPress={() => setFormData({ ...formData, type })}
                    className={`flex-1 py-3 items-center rounded-xl border ${formData.type === type ? 'border-brand-500 bg-brand-50' : 'border-border bg-card'}`}
                  >
                    <Icon name={getIcon(type)} size={18} color={formData.type === type ? '#004CFF' : '#64748b'} />
                    <Text className={`text-[12px] mt-1 font-bold ${formData.type === type ? 'text-brand-700' : 'text-muted-foreground'}`}>{type}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Inputs */}
              <View className="gap-4">
                <View>
                  <Text className="text-[13px] font-bold text-muted-foreground mb-1.5 ml-1">Full Name</Text>
                  <TextInput 
                    className="bg-background border border-border rounded-2xl px-4 py-3.5 text-[15px] font-body text-foreground"
                    placeholder="Enter recipient's name"
                    value={formData.name}
                    onChangeText={(text) => setFormData({...formData, name: text})}
                  />
                </View>
                
                <View>
                  <Text className="text-[13px] font-bold text-muted-foreground mb-1.5 ml-1">Phone Number</Text>
                  <TextInput 
                    className="bg-background border border-border rounded-2xl px-4 py-3.5 text-[15px] font-body text-foreground"
                    placeholder="e.g., +233 24 123 4567"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                  />
                </View>

                <View>
                  <Text className="text-[13px] font-bold text-muted-foreground mb-1.5 ml-1">Street Address</Text>
                  <TextInput 
                    className="bg-background border border-border rounded-2xl px-4 py-3.5 text-[15px] font-body text-foreground"
                    placeholder="Enter street or building"
                    value={formData.address}
                    onChangeText={(text) => setFormData({...formData, address: text})}
                  />
                </View>

                <View>
                  <Text className="text-[13px] font-bold text-muted-foreground mb-1.5 ml-1">City / Region</Text>
                  <TextInput 
                    className="bg-background border border-border rounded-2xl px-4 py-3.5 text-[15px] font-body text-foreground"
                    placeholder="e.g., Accra"
                    value={formData.city}
                    onChangeText={(text) => setFormData({...formData, city: text})}
                  />
                </View>
              </View>
            </ScrollView>

            <Pressable 
              onPress={handleSave}
              className="bg-brand-600 py-4 rounded-full items-center mt-2"
            >
              <Text className="text-white font-bold text-[16px]">Save Address</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
      )}
    </View>
  );
}
