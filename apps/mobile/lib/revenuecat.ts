// RevenueCat (react-native-purchases) wiring for the Perene app. Mirrors the
// warn-if-missing-env pattern in lib/supabase.ts. The native SDK only transacts
// in a dev / EAS build — Expo Go gets preview mocks — so configure() is a no-op
// when the key is absent or off-iOS rather than crashing the app.
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, type CustomerInfo } from "react-native-purchases";

// RevenueCat entitlement that unlocks Perene membership. Created in the
// RevenueCat dashboard and attached to both subscription products. The app gates
// on this identifier, not on individual product IDs, so pricing can change
// server-side without an app update.
export const ENTITLEMENT_ID = "premium";

// iOS public SDK key (appl_…). Android isn't shipped yet, so iOS-only for now.
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

let configured = false;

// Console telemetry for the subscription lifecycle. Phase 4.5 logs to the
// console only; a real analytics sink can be added in one place here later.
export type PurchaseEvent =
  | "configure"
  | "login"
  | "logout"
  | "customer_info_updated"
  | "purchase_started"
  | "purchase_completed"
  | "purchase_cancelled"
  | "purchase_failed"
  | "restore_started"
  | "restore_completed"
  | "restore_failed";

export function logPurchaseEvent(event: PurchaseEvent, data?: unknown) {
  if (data !== undefined) {
    console.log(`[revenuecat] ${event}`, data);
  } else {
    console.log(`[revenuecat] ${event}`);
  }
}

// Configure the SDK once per launch (anonymously). The signed-in user is linked
// separately via Purchases.logIn in SubscriptionProvider, so identity follows
// Supabase auth without ever re-configuring.
export function configurePurchases() {
  if (configured) return;

  if (Platform.OS !== "ios") return; // Android key not configured yet.

  if (!IOS_API_KEY) {
    console.warn(
      "[revenuecat] Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY. " +
        "Copy apps/mobile/.env.example to .env.local and fill it in. " +
        "Subscriptions stay unavailable until it's set."
    );
    return;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  Purchases.configure({ apiKey: IOS_API_KEY });
  configured = true;
  logPurchaseEvent("configure");
}

export function isPurchasesConfigured() {
  return configured;
}

// True when the customer holds the active Perene membership entitlement.
export function hasActiveEntitlement(
  info: CustomerInfo | null | undefined
): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_ID];
}
