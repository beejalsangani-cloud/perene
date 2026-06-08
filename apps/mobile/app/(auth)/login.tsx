import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { supabase } from "~/lib/supabase";

// Mirrors apps/web/app/login/page.js. On success the AuthProvider's
// onAuthStateChange fires, the root navigator sees a session, and redirects
// into the tabs — no manual navigation needed here.
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) setError(authError.message);
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-display-regular text-5xl text-forest">
            Perene
          </Text>

          <Text className="mt-10 text-xs font-sans-semibold uppercase tracking-[3px] text-gold">
            Sign in
          </Text>
          <Text className="mt-2 font-display text-3xl text-forest">
            Welcome back
          </Text>
          <Text className="mt-2 text-sm font-sans text-forest/60">
            Log in to your Perene account.
          </Text>

          <View className="mt-8 gap-4">
            <View>
              <Text className="mb-1.5 text-xs font-sans-semibold uppercase tracking-wider text-forest/70">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor="rgba(42,61,46,0.3)"
                className="rounded-xl border-2 border-forest/15 bg-white px-4 py-3 text-sm text-forest"
              />
            </View>

            <View>
              <Text className="mb-1.5 text-xs font-sans-semibold uppercase tracking-wider text-forest/70">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                placeholder="Your password"
                placeholderTextColor="rgba(42,61,46,0.3)"
                className="rounded-xl border-2 border-forest/15 bg-white px-4 py-3 text-sm text-forest"
              />
            </View>

            {error ? (
              <View className="flex-row items-center gap-2 rounded-xl border border-forest/15 bg-white px-4 py-3">
                <Text className="text-sm">⚠</Text>
                <Text className="flex-1 text-sm font-sans-medium text-forest">
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-2 items-center rounded-xl bg-lime py-4 active:opacity-80 disabled:opacity-60"
            >
              <Text className="text-sm font-sans-bold tracking-wide text-forest">
                {loading ? "Logging in…" : "Log In  →"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm font-sans text-forest/60">
              Don&apos;t have an account?{" "}
            </Text>
            <Link href="/(auth)/signup" className="text-sm font-sans-semibold text-forest underline">
              Sign up free
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
