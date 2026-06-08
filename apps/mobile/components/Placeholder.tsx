import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Brand-styled "coming soon" scaffold for tabs not yet built out. Each phase
// replaces these with the real screen.
export function Placeholder({
  title,
  subtitle,
  icon = "sparkles-outline",
}: {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-10">
        <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-lime/25">
          <Ionicons name={icon} size={28} color="#2A3D2E" />
        </View>
        <Text className="font-display text-3xl text-forest">{title}</Text>
        <Text className="mt-2 text-center text-sm font-sans text-forest/55">
          {subtitle}
        </Text>
      </View>
    </SafeAreaView>
  );
}
