import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { useAuth } from "~/context/AuthContext";
import { hasActiveEntitlement, isPurchasesConfigured } from "~/lib/revenuecat";
import { CUSTOMER_INFO_KEY } from "~/context/SubscriptionProvider";

// Reads + caches the RevenueCat CustomerInfo. SubscriptionProvider pushes live
// updates (login, renewals, expirations) into this same cache key, so the value
// is usually warm before this query ever runs; the query backs it up with an
// explicit fetch and exposes the derived subscription flag.
export function useCustomerInfo() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: CUSTOMER_INFO_KEY,
    enabled: !!user && Platform.OS === "ios" && isPurchasesConfigured(),
    staleTime: 5 * 60_000,
    queryFn: (): Promise<CustomerInfo> => Purchases.getCustomerInfo(),
  });

  return {
    ...query,
    customerInfo: query.data ?? null,
    isSubscribed: hasActiveEntitlement(query.data),
  };
}
