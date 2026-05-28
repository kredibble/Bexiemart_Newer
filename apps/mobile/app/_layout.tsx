import "../global.css";
import { Stack, useRouter, useRootNavigationState, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../src/lib/stores/auth-store";
import { LoadingSpinner } from "../src/components/ui/LoadingSpinner";
import { GlobalPopup } from "../src/components/ui/GlobalPopup";
import { ErrorBoundary } from "../src/components/ui/ErrorBoundary";
import { PaystackProvider } from 'react-native-paystack-webview';
import {
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
} from "@expo-google-fonts/raleway";
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fontsLoaded] = useFonts({
    Raleway_400Regular,
    Raleway_600SemiBold,
    Raleway_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    // Wait until the root layout has mounted completely
    if (!rootNavigationState?.key || !fontsLoaded || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    try {
      if (!isAuthenticated && !inAuthGroup) {
        // If the user isn't authenticated (e.g., token expired or manually logged out), kick them to auth
        router.replace("/(auth)/login");
      } else if (isAuthenticated && inAuthGroup) {
        // If the user is authenticated and is on the auth screen, redirect to home
        router.replace("/(customer)/(tabs)/(home)");
      }
    } catch (err) {
      console.warn("Navigation failed (likely due to ErrorBoundary removing Stack):", err);
    }
  }, [isLoading, isAuthenticated, rootNavigationState?.key, segments, fontsLoaded]);



  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaystackProvider publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder"}>
          <StatusBar style="dark" />
          <ErrorBoundary>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(vendor)" />
              <Stack.Screen name="(dispatcher)" />
            </Stack>
            {(!fontsLoaded || isLoading) && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                <LoadingSpinner fullScreen message="Loading BexieMart..." />
              </View>
            )}
            <GlobalPopup />
          </ErrorBoundary>
        </PaystackProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
