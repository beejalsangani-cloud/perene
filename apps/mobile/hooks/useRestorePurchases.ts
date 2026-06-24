import { useMutation, useQueryClient } from "@tanstack/react-query";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { hasActiveEntitlement, logPurchaseEvent } from "~/lib/revenuecat";
import { CUSTOMER_INFO_KEY } from "~/context/SubscriptionProvider";

// Restores prior purchases (Apple requires this entry point) and refreshes the
// customerInfo cache. Used by both the paywall and the Style Profile settings.
export function useRestorePurchases() {
  const queryClient = useQueryClient();

  return useMutation<CustomerInfo, unknown, void>({
    mutationFn: async () => {
      logPurchaseEvent("restore_started");
      try {
        return await Purchases.restorePurchases();
      } catch (e) {
        logPurchaseEvent("restore_failed", { message: (e as Error)?.message });
        throw e;
      }
    },
    onSuccess: (info) => {
      logPurchaseEvent("restore_completed", { active: hasActiveEntitlement(info) });
      queryClient.setQueryData(CUSTOMER_INFO_KEY, info);
    },
  });
}
