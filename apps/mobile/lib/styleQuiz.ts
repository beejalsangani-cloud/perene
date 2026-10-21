// Style-quiz definition shared by the onboarding quiz (app/onboarding.tsx) and
// the Profile editor, so both always ask the same questions and save the same
// shape to user_profiles via /api/profile.
import type { StyleProfile } from "@perene/shared";
import type { ProfileAnswers } from "~/hooks/useUpdateProfile";

// ── Field config — ported from the web quiz STEPS (apps/web/app/quiz/page.js).
// Order leads with the brand-prominent fields (style, occasions, palette).
export type FieldKind = "single" | "multi" | "palette";
export interface FieldDef {
  id: keyof ProfileAnswers;
  /** Short label used on the Profile screen. */
  title: string;
  /** Full question used in the onboarding quiz. */
  question: string;
  kind: FieldKind;
  options: readonly string[];
  hint: string;
}

export const FIELDS: readonly FieldDef[] = [
  {
    id: "style_descriptors",
    title: "My style",
    question: "Which words describe your style?",
    kind: "multi",
    options: ["Classic", "Edgy", "Romantic", "Minimalist", "Bohemian", "Sporty", "Glamorous", "Casual"],
    hint: "Pick the words that sound like you.",
  },
  {
    id: "typical_events",
    title: "I dress for",
    question: "What do you usually dress for?",
    kind: "multi",
    options: ["Work", "Date nights", "Weekend brunches", "Parties", "Travel", "Workouts", "Errands"],
    hint: "What do you typically dress for?",
  },
  {
    id: "color_preferences",
    title: "My palette",
    question: "Which colors do you gravitate toward?",
    kind: "palette",
    options: ["Neutrals", "Pastels", "Earth tones", "Bold colors", "Black & white", "Pink", "Green", "Blue", "Other"],
    hint: "Colors you gravitate toward.",
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    question: "What's your day-to-day like?",
    kind: "multi",
    options: ["Office worker", "Creative professional", "Stay-at-home", "Student", "Entrepreneur", "Retired", "Other"],
    hint: "What's your day-to-day like?",
  },
  {
    id: "body_type",
    title: "Body type",
    question: "What's your body type?",
    kind: "single",
    options: ["Petite", "Tall", "Athletic", "Curvy", "Plus-size", "Straight / Rectangle"],
    hint: "Optional — helps tailor fit.",
  },
  {
    id: "gender",
    title: "How you identify",
    question: "How do you identify?",
    kind: "single",
    options: ["Woman", "Man", "Non-binary", "Prefer not to say"],
    hint: "Personalizes your recommendations.",
  },
  {
    id: "age_range",
    title: "Age range",
    question: "What's your age range?",
    kind: "single",
    options: ["18–24", "25–34", "35–44", "45–54", "55+"],
    hint: "We'll match styles to your life stage.",
  },
  {
    id: "budget_range",
    title: "Budget per item",
    question: "What do you usually spend per item?",
    kind: "single",
    options: ["Under $50", "$50–$150", "$150–$300", "$300+"],
    hint: "Tunes shopping suggestions to your price point.",
  },
] as const;

export const EMPTY: ProfileAnswers = {
  gender: null,
  age_range: null,
  body_type: null,
  style_descriptors: [],
  lifestyle: [],
  typical_events: [],
  budget_range: null,
  color_preferences: [],
};

export function fromProfile(p: StyleProfile | null | undefined): ProfileAnswers {
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

// Toggle one option: single-choice fields switch (tapping the current choice
// clears it); multi-choice fields add or remove the option.
export function toggleAnswer(prev: ProfileAnswers, field: FieldDef, value: string): ProfileAnswers {
  if (field.kind === "single") {
    return { ...prev, [field.id]: prev[field.id] === value ? null : value };
  }
  const list = (prev[field.id] as string[]) ?? [];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return { ...prev, [field.id]: next };
}

// The quiz counts as done once a style is picked — the onboarding quiz requires
// it, and it's the field outfit generation leans on most.
export function isProfileComplete(p: StyleProfile | null | undefined): boolean {
  return (p?.style_descriptors?.length ?? 0) > 0;
}
