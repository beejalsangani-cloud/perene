import { Pressable, Text, View } from "react-native";

// ── Quiz chip ─────────────────────────────────────────────────────────────────────
export default function QuizChip({
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

