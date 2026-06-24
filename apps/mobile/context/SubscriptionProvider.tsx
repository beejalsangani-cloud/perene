// Side-effect provider that binds RevenueCat to Supabase auth. It configures the
// SDK once on mount, links/unlinks the RevenueCat identity as the user signs in
// and out, and forwards live customerInfo updates (renewals, expirations,
// dashboard-granted access) into the React Query cache so useCustomerInfo
// reflects them without a manual refetch. Renders children unchanged.
import { useEffect, type ReactNode } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { useAuth } from "~/context/AuthContext";
import {
  configurePurchases,
  isPurchasesConfigured,
  logPurchaseEvent,
} from "~/lib/revenuecat";

// Shared cache key for the customer's subscription state. The query in
// useCustomerInfo reads it; this provider and the purchase/restore mutations
// write to it.
export const CUSTOMER_INFO_KEY = ["customerInfo"] as const;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Configure once + subscribe to live customerInfo updates.
  useEffect(() => {
    configurePurchases();
    if (!isPurchasesConfigured()) return;

    const listener = (info: CustomerInfo) => {
      logPurchaseEvent("customer_info_updated", {
        active: Object.keys(info.entitlements.active),
      });
      queryClient.setQueryData(CUSTOMER_INFO_KEY, info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  // Keep the RevenueCat identity in lockstep with the Supabase session.
  useEffect(() => {
    if (Platform.OS !== "ios" || !isPurchasesConfigured()) return;

    if (user?.id) {
      Purchases.logIn(user.id)
        .then(({ customerInfo }) => {
          logPurchaseEvent("login", { appUserID: user.id });
          queryClient.setQueryData(CUSTOMER_INFO_KEY, customerInfo);
        })
        .catch((e) => console.warn("[revenuecat] logIn failed", e));
    } else {
      // logOut rejects for an already-anonymous user — safe to ignore.
      Purchases.logOut()
        .then(() => logPurchaseEvent("logout"))
        .catch(() => {});
      queryClient.removeQueries({ queryKey: CUSTOMER_INFO_KEY });
    }
  }, [user?.id, queryClient]);

  return <>{children}</>;
}
