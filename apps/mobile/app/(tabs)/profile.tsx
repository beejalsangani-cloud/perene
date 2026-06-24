import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PALETTE_SWATCHES, type StyleProfile } from "@perene/shared";
import { useAuth } from "~/context/AuthContext";
import { useProfile } from "~/hooks/useProfile";
import { useUpdateProfile, type ProfileAnswers } from "~/hooks/useUpdateProfile";
import { useCustomerInfo } from "~/hooks/useCustomerInfo";
import { useRestorePurchases } from "~/hooks/useRestorePurchases";
import { ENTITLEMENT_ID, hasActiveEntitlement } from "~/lib/revenuecat";

// ── Field config — ported from the web quiz STEPS (apps/web/app/quiz/page.js).
// Order leads with the brand-prominent fields (style, occasions, palette).
type FieldKind = "single" | "multi" | "palette";
interface FieldDef {
  id: keyof ProfileAnswers;
  title: string;
  kind: FieldKind;
  options: readonly string[];
  hint: string;
}

const FIELDS: readonly FieldDef[] = [
  {
    id: "style_descriptors",
    title: "My style",
    kind: "multi",
    options: ["Classic", "Edgy", "Romantic", "Minimalist", "Bohemian", "Sporty", "Glamorous", "Casual"],
    hint: "Pick the words that sound like you.",
  },
  {
    id: "typical_events",
    title: "I dress for",
    kind: "multi",
    options: ["Work", "Date nights", "Weekend brunches", "Parties", "Travel", "Workouts", "Errands"],
    hint: "What do you typically dress for?",
  },
  {
    id: "color_preferences",
    title: "My palette",
    kind: "palette",
    options: ["Neutrals", "Pastels", "Earth tones", "Bold colors", "Black & white", "Pink", "Green", "Blue", "Other"],
    hint: "Colours you gravitate toward.",
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    kind: "multi",
    options: ["Office worker", "Creative professional", "Stay-at-home", "Student", "Entrepreneur", "Retired", "Other"],
    hint: "What's your day-to-day like?",
  },
  {
    id: "body_type",
    title: "Body type",
    kind: "single",
    options: ["Petite", "Tall", "Athletic", "Curvy", "Plus-size", "Straight / Rectangle"],
    hint: "Optional — helps tailor fit.",
  },
  {
    id: "gender",
    title: "How you identify",
    kind: "single",
    options: ["Woman", "Man", "Non-binary", "Prefer not to say"],
    hint: "Personalises your recommendations.",
  },
  {
    id: "age_range",
    title: "Age range",
    kind: "single",
    options: ["18–24", "25–34", "35–44", "45–54", "55+"],
    hint: "We'll match styles to your life stage.",
  },
  {
    id: "budget_range",
    title: "Budget per item",
    kind: "single",
    options: ["Under $50", "$50–$150", "$150–$300", "$300+"],
    hint: "Tunes shopping suggestions to your price point.",
  },
] as const;

const EMPTY: ProfileAnswers = {
  gender: null,
  age_range: null,
  body_type: null,
  style_descriptors: [],
  lifestyle: [],
  typical_events: [],
  budget_range: null,
  color_preferences: [],
};

function fromProfile(p: StyleProfile | null | undefined): ProfileAnswers {
  return {
    gender: p?.gender ?? null,
    age_range: p?.age_range ?? null,
    body_type: p?.body_type ?? null,
    style_descriptors: p?.style_descriptors ?? [],
    lifestyle: p?.lifestyle ?? [],
    typical_events: p?.typical_events ?? [],
    budget_range: p?.budget_range ?? null,
    color_preferences: p?.color_preferences ?? [],
  };
}

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({
  label,
  selected,
  swatch,
  onPress,
}: {
  label: string;
  selected: boolean;
  swatch?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-full border px-3.5 py-2 ${
        selected ? "border-lime bg-lime" : "border-forest/15 bg-white active:border-forest/35"
      }`}
    >
      {swatch ? (
        <View
          className="h-3.5 w-3.5 rounded-full border border-black/10"
          style={{ backgroundColor: swatch }}
        />
      ) : null}
      <Text
        className={`text-xs font-sans-semibold ${selected ? "text-forest" : "text-forest/65"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────
function Section({
  field,
  answers,
  onToggle,
}: {
  field: FieldDef;
  answers: ProfileAnswers;
  onToggle: (field: FieldDef, value: string) => void;
}) {
  const value = answers[field.id];
  const isEmpty = Array.isArray(value) ? value.length === 0 : !value;

  function selected(opt: string) {
    return Array.isArray(value) ? value.includes(opt) : value === opt;
  }

  return (
    <View className="gap-3">
      <View>
        <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
          {field.title}
        </Text>
        {isEmpty ? (
          <Text className="mt-1 text-xs font-sans italic text-gold">{field.hint}</Text>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {field.options.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={selected(opt)}
            swatch={field.kind === "palette" ? PALETTE_SWATCHES[opt] ?? "#CCC" : undefined}
            onPress={() => onToggle(field, opt)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Membership ───────────────────────────────────────────────────────────────
function MembershipSection() {
  const router = useRouter();
  const { customerInfo, isSubscribed } = useCustomerInfo();
  const restore = useRestorePurchases();
  const [notice, setNotice] = useState<string | null>(null);

  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];
  const renews = entitlement?.expirationDate
    ? new Date(entitlement.expirationDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  function handleRestore() {
    if (restore.isPending) return;
    setNotice(null);
    restore.mutate(undefined, {
      onSuccess: (info) =>
        setNotice(
          hasActiveEntitlement(info)
            ? "Membership restored."
            : "No active subscription found to restore."
        ),
      onError: () => setNotice("Couldn't restore purchases. Please try again."),
    });
  }

  return (
    <View className="gap-3">
      <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-forest/45">
        Membership
      </Text>

      <View className="gap-3 rounded-2xl border border-forest/12 bg-white p-4">
        <View className="flex-row items-center gap-3">
          <Ionicons
            name={isSubscribed ? "checkmark-circle" : "sparkles-outline"}
            size={22}
            color={isSubscribed ? "#2A3D2E" : "#C9A87C"}
          />
          <View className="flex-1">
            <Text className="text-sm font-sans-bold text-forest">
              {isSubscribed ? "Perene membership active" : "No active membership"}
            </Text>
            <Text className="mt-0.5 text-xs font-sans text-forest/55">
              {isSubscribed
                ? renews
                  ? entitlement?.willRenew
                    ? `Renews ${renews}`
                    : `Access until ${renews}`
                  : "Active"
                : "Unlock daily suggestions and more."}
            </Text>
          </View>
        </View>

        {!isSubscribed ? (
          <Pressable
            onPress={() => router.push("/paywall")}
            className="items-center rounded-xl bg-lime py-3 active:opacity-80"
          >
            <Text className="text-sm font-sans-bold text-forest">View plans</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleRestore}
          disabled={restore.isPending}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-forest/15 py-3 active:opacity-70"
        >
          {restore.isPending ? (
            <ActivityIndicator color="#2A3D2E" size="small" />
          ) : (
            <Text className="text-sm font-sans-semibold text-forest/70">
              Restore Purchases
            </Text>
          )}
        </Pressable>

        {notice ? (
          <Text className="text-xs font-sans-medium text-forest/60">{notice}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { signOut } = useAuth();
  const profileQuery = useProfile();
  const update = useUpdateProfile();

  const [draft, setDraft] = useState<ProfileAnswers>(EMPTY);
  const [justSaved, setJustSaved] = useState(false);
  const seeded = useRef(false);

  // Seed the editable draft from the loaded profile, once.
  useEffect(() => {
    if (seeded.current || profileQuery.isLoading) return;
    setDraft(fromProfile(profileQuery.data));
    seeded.current = true;
  }, [profileQuery.isLoading, profileQuery.data]);

  const original = useMemo(() => fromProfile(profileQuery.data), [profileQuery.data]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(original),
    [draft, original]
  );

  function toggle(field: FieldDef, value: string) {
    setJustSaved(false);
    setDraft((prev) => {
      if (field.kind === "single") {
        // Tapping the selected option again clears it (fields stay editable).
        return { ...prev, [field.id]: prev[field.id] === value ? null : value };
      }
      const list = (prev[field.id] as string[]) ?? [];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...prev, [field.id]: next };
    });
  }

  function handleSave() {
    update.mutate(draft, {
      onSuccess: () => {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
      },
    });
  }

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream" edges={["top"]}>
        <ActivityIndicator color="#C4E552" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <ScrollView contentContainerClassName="px-6 py-8 gap-7" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View>
          <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-gold">
            Your style
          </Text>
          <Text className="mt-1 font-display text-4xl leading-tight text-forest">
            Style Profile
          </Text>
          <Text className="mt-2 text-sm font-sans text-forest/55">
            Tune these and every suggestion sharpens.
          </Text>
        </View>

        {FIELDS.map((field) => (
          <Section key={field.id} field={field} answers={draft} onToggle={toggle} />
        ))}

        {update.isError ? (
          <View className="flex-row items-center gap-2 rounded-xl border border-forest/12 bg-white px-4 py-3">
            <Text>⚠</Text>
            <Text className="flex-1 text-sm font-sans-medium text-forest">
              Couldn&apos;t save your profile — please try again.
            </Text>
          </View>
        ) : null}

        <MembershipSection />

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border-2 border-forest/15 py-3 active:opacity-70"
        >
          <Ionicons name="log-out-outline" size={16} color="rgba(42,61,46,0.65)" />
          <Text className="text-sm font-sans-semibold text-forest/65">Sign out</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky save bar — appears when there are unsaved changes */}
      {(dirty || justSaved) && (
        <View className="border-t border-forest/8 bg-cream px-6 pb-6 pt-3">
          <Pressable
            onPress={handleSave}
            disabled={!dirty || update.isPending}
            className={`flex-row items-center justify-center gap-2 rounded-xl py-3.5 ${
              !dirty || update.isPending ? "bg-lime/50" : "bg-lime active:opacity-80"
            }`}
          >
            {update.isPending ? (
              <>
                <ActivityIndicator color="#2A3D2E" size="small" />
                <Text className="text-sm font-sans-bold text-forest">Saving…</Text>
              </>
            ) : justSaved ? (
              <>
                <Ionicons name="checkmark" size={16} color="#2A3D2E" />
                <Text className="text-sm font-sans-bold text-forest">Saved ✓</Text>
              </>
            ) : (
              <Text className="text-sm font-sans-bold text-forest">Save changes</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
