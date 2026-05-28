import React from "react";
import { View, Text, Pressable } from "react-native";
import { Icon } from "./Icon";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  iconName?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  iconName,
  actionLabel,
  onAction,
  fullScreen = true,
}: EmptyStateProps) {
  const finalIcon = icon || iconName || "inbox";
  return (
    <View className={`items-center justify-center ${fullScreen ? "flex-1 bg-background" : "p-8 py-12"}`}>
      <View className="h-24 w-24 rounded-full bg-primary/10 items-center justify-center mb-6">
        <Icon name={finalIcon as any} size={40} color="#004CFF" />
      </View>
      
      <Text className="text-2xl font-bold text-foreground mb-3 text-center">
        {title}
      </Text>
      
      <Text className="text-muted-foreground text-center mb-8 max-w-[80%] text-base leading-relaxed">
        {description}
      </Text>

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="bg-primary px-8 py-4 rounded-full active:opacity-80 min-w-[200px] items-center"
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}