import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { useAuth } from "~/context/AuthContext";
import { hasActiveEntitlement, isPurchasesConfigured } from "~/lib/revenuecat";
import { CUSTOMER_INFO_KEY, useRevenueCatIdentity } from "~/context/SubscriptionProvider";

// Reads + caches the RevenueCat CustomerInfo. SubscriptionProvider pushes live
// updates (login, renewals, expirations) into this same cache key, so the value
// is usually warm before this query ever runs; the query backs it up with an
// explicit fetch and exposes the derived subscription flag.
export function useCustomerInfo() {
  const { user } = useAuth();
  // Ready once RevenueCat is logged in as this user. Before that, cached info
  // may be the anonymous launch identity's (no entitlements), which used to
  // flash the paywall at subscribers on every launch.
  const identifiedUserId = useRevenueCatIdentity();
  const ready = !!user && identifiedUserId === user.id;

  const query = useQuery({
    queryKey: CUSTOMER_INFO_KEY,
    enabled: ready && Platform.OS === "ios" && isPurchasesConfigured(),
    staleTime: 5 * 60_000,
    queryFn: (): Promise<CustomerInfo> => Purchases.getCustomerInfo(),
  });

  return {
    ...query,
    customerInfo: ready ? query.data ?? null : null,
    isSubscribed: ready && hasActiveEntitlement(query.data),
  };
}
