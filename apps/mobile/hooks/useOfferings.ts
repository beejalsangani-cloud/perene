import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import Purchases, { type PurchasesOffering } from "react-native-purchases";
import { isPurchasesConfigured } from "~/lib/revenuecat";

// Fetches the current offering (the "standard" offering marked Current in the
// RevenueCat dashboard) and surfaces its monthly + annual packages for the
// paywall. Returns null packages gracefully if the offering isn't configured.
export function useOfferings() {
  const query = useQuery({
    queryKey: ["offerings"],
    enabled: Platform.OS === "ios" && isPurchasesConfigured(),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<PurchasesOffering | null> => {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    },
  });

  return {
    ...query,
    offering: query.data ?? null,
    monthly: query.data?.monthly ?? null,
    annual: query.data?.annual ?? null,
  };
}
