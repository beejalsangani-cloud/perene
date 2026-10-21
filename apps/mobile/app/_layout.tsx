import "../global.css";
import { useEffect } from "react";
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
import { useProfile } from "~/hooks/useProfile";
import { isPurchasesConfigured } from "~/lib/revenuecat";
import { isProfileComplete } from "~/lib/styleQuiz";
import { Platform } from "react-native";
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
  const { customerInfo, isSubscribed, isError: customerInfoError } = useCustomerInfo();
  const profileQuery = useProfile();
  const segments = useSegments();
  const router = useRouter();

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

  // Hard paywall. Once subscription status is known (customerInfo loaded) and
  // the user has no active membership or trial, every screen routes to the
  // paywall. Two exceptions: the auth stack, and the Profile tab, which must
  // stay reachable so anyone can manage or delete their account (App Store
  // guideline 5.1.1(v)). If RevenueCat can't load, customerInfo stays null and
  // the app fails open rather than locking people out.
  useEffect(() => {
    if (initializing || !session || !customerInfo || isSubscribed) return;
    const [first, second] = segments as string[];
    if (first === "(auth)" || first === "paywall") return;
    if (first === "(tabs)" && second === "profile") return;
    router.push("/paywall");
  }, [initializing, session, customerInfo, isSubscribed, segments, router]);

  // Onboarding quiz, after the paywall (Paywall → Quiz → Closet). Waits until
  // subscription status is settled so a new user never sees the quiz first;
  // when RevenueCat isn't running (non-iOS, no key) or errors, it fails open
  // like the paywall does. Done = a style picked (isProfileComplete).
  useEffect(() => {
    if (initializing || !session) return;
    const purchasesLive = Platform.OS === "ios" && isPurchasesConfigured();
    if (purchasesLive && !customerInfo && !customerInfoError) return; // still loading
    if (customerInfo && !isSubscribed) return; // paywall comes first
    if (profileQuery.isLoading || profileQuery.isError) return;
    if (isProfileComplete(profileQuery.data)) return;
    const [first] = segments as string[];
    if (first === "(auth)" || first === "paywall" || first === "onboarding") return;
    router.replace("/onboarding");
  }, [
    initializing,
    session,
    customerInfo,
    customerInfoError,
    isSubscribed,
    profileQuery.isLoading,
    profileQuery.isError,
    profileQuery.data,
    segments,
    router,
  ]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="camera"
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="confirm-item" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="outfits/new"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="outfits/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
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
