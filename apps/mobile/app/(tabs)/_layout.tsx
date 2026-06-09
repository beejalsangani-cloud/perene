import { Pressable, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Five-tab shell with the lime "+" capture FAB floating above the bar — the
// hero camera flow. Tapping it opens the camera modal (app/camera.tsx).
export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2A3D2E",
        tabBarInactiveTintColor: "rgba(42,61,46,0.4)",
        tabBarStyle: {
          backgroundColor: "#F5F1E8",
          borderTopColor: "rgba(42,61,46,0.08)",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: "Closet",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>

      {/* Capture FAB — floats above the tab bar, opens the camera modal */}
      <Pressable
        onPress={() => router.push("/camera")}
        style={{ bottom: insets.bottom + 66 }}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-lime shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={30} color="#2A3D2E" />
      </Pressable>
    </View>
  );
}
