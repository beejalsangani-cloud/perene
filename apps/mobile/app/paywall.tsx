import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import { hasActiveEntitlement } from "~/lib/revenuecat";
import { useOfferings } from "~/hooks/useOfferings";
import { usePurchasePackage, PURCHASE_CANCELLED } from "~/hooks/usePurchasePackage";
import { useRestorePurchases } from "~/hooks/useRestorePurchases";
import { error as hapticError, success, tap } from "~/lib/haptics";

// Placeholder legal URLs — swap for the real hosted pages before App Store
// submission (Apple requires functional Terms of Use + Privacy Policy links).
const TERMS_URL = "https://myperene.com/terms";
const PRIVACY_URL = "https://myperene.com/privacy";

// Apple-required auto-renewable subscription disclosure.
const DISCLOSURE =
  "Payment will be charged to your Apple ID account at confirmation of purchase. " +
  "Your subscription automatically renews unless it is canceled at least 24 hours " +
  "before the end of the current period; your account is charged for renewal within " +
  "24 hours prior to the end of the period. Manage or cancel anytime in your App " +
  "Store account settings. Any unused portion of a free trial is forfeited when you " +
  "purchase a subscription.";

const BENEFITS = [
  "Daily outfit suggestions from your closet",
  "Unlimited closet items & Vision tagging",
  "Personalised Discover looks",
  "Save and revisit your favourite outfits",
] as const;

type PlanId = "monthly" | "annual";

export default function Paywall() {
  const router = useRouter();
  const { monthly, annual, isLoading, isError, refetch } = useOfferings();
  const purchase = usePurchasePackage();
  const restore = useRestorePurchases();

  const [selected, setSelected] = useState<PlanId>("monthly");
  const [notice, setNotice] = useState<string | null>(null);

  const hasTrial = !!monthly?.product.introPrice;
  const savingsPct =
    monthly && annual
      ? Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100)
      : null;

  const selectedPkg: PurchasesPackage | null =
    selected === "monthly" ? monthly : annual;

  const busy = purchase.isPending || restore.isPending;

  function handlePurchase() {
    if (!selectedPkg || busy) return;
    setNotice(null);
    purchase.mutate(selectedPkg, {
      onSuccess: (result) => {
        if (result !== PURCHASE_CANCELLED) {
          success();
          router.back();
        }
      },
      onError: () => {
        hapticError();
        setNotice("Something went wrong with your purchase. Please try again.");
      },
    });
  }

  function handleRestore() {
    if (busy) return;
    setNotice(null);
    restore.mutate(undefined, {
      onSuccess: (info) => {
        if (hasActiveEntitlement(info)) {
          success();
          router.back();
        } else setNotice("No active subscription found to restore.");
      },
      onError: () => setNotice("Couldn't restore purchases. Please try again."),
    });
  }

  const ctaLabel =
    selected === "monthly" && hasTrial ? "Start 7-day free trial" : "Subscribe";

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      {/* Close — dismissible: no feature gating in this phase */}
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
        >
          <Ionicons name="close" size={24} color="rgba(42,61,46,0.45)" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-6 gap-7" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View>
          <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-gold">
            Perene membership
          </Text>
          <Text className="mt-1 font-display-italic text-4xl leading-tight text-forest">
            Your stylist,{"\n"}every morning.
          </Text>
          <Text className="mt-3 text-sm font-sans text-forest/60">
            Unlock daily outfit suggestions tailored to your closet, the weather,
            and your taste.
          </Text>
        </View>

        {/* Benefits */}
        <View className="gap-3">
          {BENEFITS.map((b) => (
            <View key={b} className="flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={20} color="#C4E552" />
              <Text className="flex-1 text-sm font-sans-medium text-forest">{b}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#C4E552" />
          </View>
        ) : isError || (!monthly && !annual) ? (
          <View className="gap-3 rounded-2xl border border-forest/12 bg-white px-4 py-5">
            <Text className="text-sm font-sans-medium text-forest">
              We couldn&apos;t load subscription options right now.
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="self-start rounded-full bg-lime px-4 py-2 active:opacity-80"
            >
              <Text className="text-xs font-sans-bold text-forest">Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-3">
            {monthly ? (
              <PlanCard
                title="Monthly"
                price={monthly.product.priceString}
                unit="per month"
                subtitle={hasTrial ? "7 days free, then billed monthly" : "Billed monthly"}
                badge={hasTrial ? "7-DAY FREE TRIAL" : undefined}
                selected={selected === "monthly"}
                onPress={() => {
                  tap();
                  setSelected("monthly");
                }}
              />
            ) : null}
            {annual ? (
              <PlanCard
                title="Annual"
                price={annual.product.priceString}
                unit="per year"
                subtitle={
                  annual.product.pricePerMonthString
                    ? `${annual.product.pricePerMonthString}/mo, billed annually`
                    : "Billed annually"
                }
                badge={savingsPct && savingsPct > 0 ? `SAVE ${savingsPct}%` : undefined}
                selected={selected === "annual"}
                onPress={() => {
                  tap();
                  setSelected("annual");
                }}
              />
            ) : null}
          </View>
        )}

        {notice ? (
          <View className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
            <Text className="text-sm font-sans-medium text-forest">{notice}</Text>
          </View>
        ) : null}

        {/* CTA */}
        <Pressable
          onPress={handlePurchase}
          disabled={!selectedPkg || busy}
          className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${
            !selectedPkg || busy ? "bg-lime/50" : "bg-lime active:opacity-80"
          }`}
        >
          {purchase.isPending ? (
            <ActivityIndicator color="#2A3D2E" size="small" />
          ) : (
            <Text className="text-base font-sans-bold text-forest">{ctaLabel}</Text>
          )}
        </Pressable>

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          disabled={busy}
          className="items-center py-1 active:opacity-60"
        >
          <Text className="text-sm font-sans-semibold text-forest/70">
            {restore.isPending ? "Restoring…" : "Restore Purchases"}
          </Text>
        </Pressable>

        {/* Disclosure + legal */}
        <View className="gap-3">
          <Text className="text-[11px] leading-4 font-sans text-forest/40">
            {DISCLOSURE}
          </Text>
          <View className="flex-row justify-center gap-5">
            <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
              <Text className="text-[11px] font-sans-medium text-forest/55 underline">
                Terms of Service
              </Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
              <Text className="text-[11px] font-sans-medium text-forest/55 underline">
                Privacy Policy
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({
  title,
  price,
  unit,
  subtitle,
  badge,
  selected,
  onPress,
}: {
  title: string;
  price: string;
  unit: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border-2 p-4 ${
        selected ? "border-lime bg-lime/10" : "border-forest/12 bg-white active:border-forest/30"
      }`}
    >
      <View className="flex-row items-center gap-3">
        {/* Radio */}
        <View
          className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
            selected ? "border-forest bg-forest" : "border-forest/25"
          }`}
        >
          {selected ? <Ionicons name="checkmark" size={12} color="#C4E552" /> : null}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-sans-bold text-forest">{title}</Text>
            {badge ? (
              <View className="rounded-full bg-lime px-2 py-0.5">
                <Text className="text-[10px] font-sans-bold tracking-wide text-forest">
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-0.5 text-xs font-sans text-forest/55">{subtitle}</Text>
        </View>

        <View className="items-end">
          <Text className="font-display text-xl text-forest">{price}</Text>
          <Text className="text-[11px] font-sans text-forest/45">{unit}</Text>
        </View>
      </View>
    </Pressable>
  );
}
