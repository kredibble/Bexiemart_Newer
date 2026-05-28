import React from "react";
import { View, Text, Pressable } from "react-native";
import { Icon } from "./Icon";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "We couldn't load this data. Please try again.", 
  onRetry,
  fullScreen = true 
}: ErrorStateProps) {
  return (
    <View className={`items-center justify-center ${fullScreen ? "flex-1 bg-background" : "p-8"}`}>
      <View className="h-24 w-24 rounded-full bg-destructive/10 items-center justify-center mb-6">
        <Icon name="alert-triangle" size={40} color="#ef4444" />
      </View>
      
      <Text className="text-xl font-bold text-foreground mb-2 text-center">
        {title}
      </Text>
      
      <Text className="text-muted-foreground text-center mb-8 max-w-[80%]">
        {message}
      </Text>

      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="bg-primary px-8 py-3 rounded-full flex-row items-center active:opacity-80"
          style={{ gap: 8 }}
        >
          <Icon name="refresh-cw" size={18} color="white" />
          <Text className="text-primary-foreground font-semibold text-base">
            Try Again
          </Text>
        </Pressable>
      )}
    </View>
  );
}
