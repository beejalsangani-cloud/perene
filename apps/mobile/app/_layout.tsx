import "../global.css";
import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "~/context/AuthContext";
import { SubscriptionProvider } from "~/context/SubscriptionProvider";
import { useCustomerInfo } from "~/hooks/useCustomerInfo";
import { usePushRegistration } from "~/hooks/usePushRegistration";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

// Drives the auth gate: signed-out users are pushed to the (auth) stack,
// signed-in users out of it. Runs after the AuthProvider has restored the
// persisted session (initializing === false).
function RootNavigator() {
  const { session, initializing } = useAuth();
  const { customerInfo, isSubscribed } = useCustomerInfo();
  const segments = useSegments();
  const router = useRouter();
  // Present the paywall at most once per launch so dismissing it sticks.
  const paywallShown = useRef(false);

  // Register for push once signed in (best-effort, no-op on simulator/denied).
  usePushRegistration();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, initializing, segments, router]);

  // First-launch paywall gate. Only fires once we have a definitive
  // subscription status (customerInfo loaded) and the user isn't subscribed.
  // Dismissible — no features are gated in this phase.
  useEffect(() => {
    if (initializing || !session) return;
    if (paywallShown.current || segments[0] === "(auth)" || segments[0] === "paywall") {
      return;
    }
    if (customerInfo && !isSubscribed) {
      paywallShown.current = true;
      router.push("/paywall");
    }
  }, [initializing, session, customerInfo, isSubscribed, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="camera"
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="confirm-item" options={{ presentation: "modal" }} />
      <Stack.Screen name="outfits/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen
        name="paywall"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
