import { useMutation, useQueryClient } from "@tanstack/react-query";
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from "react-native-purchases";
import { logPurchaseEvent } from "~/lib/revenuecat";
import { CUSTOMER_INFO_KEY } from "~/context/SubscriptionProvider";

// Sentinel resolved (not thrown) when the user backs out of the App Store sheet,
// so the paywall treats a cancel as a no-op rather than flashing an error.
export const PURCHASE_CANCELLED = "PURCHASE_CANCELLED" as const;

export function isCancelledError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    (error as PurchasesError).code ===
      PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

// Purchases a package and, on success, seeds the customerInfo cache so the gate
// + profile reflect the new subscription immediately.
export function usePurchasePackage() {
  const queryClient = useQueryClient();

  return useMutation<
    CustomerInfo | typeof PURCHASE_CANCELLED,
    unknown,
    PurchasesPackage
  >({
    mutationFn: async (pkg) => {
      logPurchaseEvent("purchase_started", { package: pkg.identifier });
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return customerInfo;
      } catch (e) {
        if (isCancelledError(e)) {
          logPurchaseEvent("purchase_cancelled", { package: pkg.identifier });
          return PURCHASE_CANCELLED;
        }
        logPurchaseEvent("purchase_failed", {
          package: pkg.identifier,
          message: (e as PurchasesError)?.message,
        });
        throw e;
      }
    },
    onSuccess: (result, pkg) => {
      if (result === PURCHASE_CANCELLED) return;
      logPurchaseEvent("purchase_completed", { package: pkg.identifier });
      queryClient.setQueryData(CUSTOMER_INFO_KEY, result);
    },
  });
}
