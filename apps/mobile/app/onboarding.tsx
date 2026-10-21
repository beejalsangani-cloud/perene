// Style quiz shown once to new members, right after the paywall (the gate in
// app/_layout.tsx sends anyone without a style profile here). One question per
// step; "My style" is required, the rest can be skipped. Saving goes through
// the same /api/profile route as the Profile tab, then lands on Home, whose
// empty state asks for the first closet items.
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { PALETTE_SWATCHES } from "@perene/shared";
import { useAuth } from "~/context/AuthContext";
import { useProfile } from "~/hooks/useProfile";
import { useUpdateProfile, type ProfileAnswers } from "~/hooks/useUpdateProfile";
import { EMPTY, FIELDS, fromProfile, toggleAnswer } from "~/lib/styleQuiz";
import QuizChip from "~/components/QuizChip";
import { success, tap } from "~/lib/haptics";

const REQUIRED = new Set<keyof ProfileAnswers>(["style_descriptors"]);

export default function Onboarding() {
  const router = useRouter();
  const { signOut } = useAuth();
  const profile = useProfile();
  const save = useUpdateProfile();

  const [answers, setAnswers] = useState<ProfileAnswers>(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Keep anything already answered (e.g. a partly filled web profile).
  useEffect(() => {
    if (profile.data) setAnswers(fromProfile(profile.data));
  }, [profile.data]);

  const field = FIELDS[step];
  const isLast = step === FIELDS.length - 1;
  const value = answers[field.id];
  const answered = Array.isArray(value) ? value.length > 0 : !!value;
  const required = REQUIRED.has(field.id);

  function next() {
    tap();
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setError(null);
    save.mutate(answers, {
      onSuccess: () => {
        success();
        router.replace("/(tabs)");
      },
      onError: () => setError("Couldn't save your answers. Check your connection and try again."),
    });
  }

  const ctaLabel = isLast ? "Finish" : answered ? "Next" : "Skip";

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      {/* Progress + sign out */}
      <View className="gap-3 px-6 pt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-sans-semibold uppercase tracking-widest text-gold">
            Your style profile · {step + 1} of {FIELDS.length}
          </Text>
          <Pressable onPress={signOut} hitSlop={8} className="active:opacity-60">
            <Text className="text-xs font-sans-medium text-forest/45">Sign out</Text>
          </Pressable>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-forest/10">
          <View
            className="h-full rounded-full bg-lime"
            style={{ width: `${((step + 1) / FIELDS.length) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 pt-8 pb-6 gap-6" showsVerticalScrollIndicator={false}>
        <View>
          <Text className="font-display text-3xl leading-tight text-forest">{field.question}</Text>
          <Text className="mt-2 text-sm font-sans text-forest/55">
            {field.kind === "single" ? "Pick one. " : "Pick all that apply. "}
            {required ? "Required." : field.hint}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {field.options.map((opt) => (
            <QuizChip
              key={opt}
              label={opt}
              selected={Array.isArray(value) ? value.includes(opt) : value === opt}
              swatch={field.kind === "palette" ? PALETTE_SWATCHES[opt] ?? "#CCC" : undefined}
              onPress={() => setAnswers((prev) => toggleAnswer(prev, field, opt))}
            />
          ))}
        </View>

        {isLast ? (
          <Text className="text-sm font-sans text-forest/55">
            Next up: add 5 pieces to your closet so Perene can start styling your days.
          </Text>
        ) : null}

        {error ? <Text className="text-sm font-sans-medium text-forest">{error}</Text> : null}
      </ScrollView>

      {/* Back / Next */}
      <View className="flex-row items-center gap-3 border-t border-forest/8 px-6 pb-2 pt-3">
        {step > 0 ? (
          <Pressable
            onPress={() => setStep((s) => s - 1)}
            disabled={save.isPending}
            className="rounded-xl border-2 border-forest/15 px-5 py-3.5 active:opacity-70"
          >
            <Text className="text-sm font-sans-semibold text-forest/70">Back</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={next}
          disabled={(required && !answered) || save.isPending}
          className={`flex-1 items-center rounded-xl py-3.5 ${
            (required && !answered) || save.isPending ? "bg-lime/50" : "bg-lime active:opacity-80"
          }`}
        >
          {save.isPending ? (
            <ActivityIndicator color="#2A3D2E" size="small" />
          ) : (
            <Text className="text-base font-sans-bold text-forest">{ctaLabel}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
