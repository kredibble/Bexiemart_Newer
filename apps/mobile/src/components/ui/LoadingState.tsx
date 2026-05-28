import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { Icon } from "@/components/ui/Icon";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading...", fullScreen = true }: LoadingStateProps) {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View className={`items-center justify-center ${fullScreen ? "flex-1 bg-background" : "p-8"}`}>
      <View className="items-center justify-center relative">
        {/* Soft Background Glow/Spinner */}
        <Animated.View 
          className="absolute w-24 h-24 rounded-full border-[3px] border-brand-100 border-t-brand-600 opacity-20"
          style={{ transform: [{ rotate: spin }] }}
        />
        
        <Animated.View 
          className="absolute w-20 h-20 rounded-full border-[2px] border-brand-200 border-b-brand-500 opacity-40"
          style={{ transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["360deg", "0deg"] }) }] }}
        />
        
        {/* Pulsing Core */}
        <Animated.View
          className="w-16 h-16 bg-brand-50 rounded-full items-center justify-center"
          style={{ transform: [{ scale: pulseAnim }] }}
        >
          <Icon name="shopping-bag" size={28} color="#004CFF" />
        </Animated.View>
      </View>
      
      {message && (
        <Animated.Text 
          className="text-body-md font-body text-muted-foreground mt-8 text-center"
          style={{ opacity: pulseAnim.interpolate({ inputRange: [0.8, 1.1], outputRange: [0.5, 1] }) }}
        >
          {message}
        </Animated.Text>
      )}
    </View>
  );
}
