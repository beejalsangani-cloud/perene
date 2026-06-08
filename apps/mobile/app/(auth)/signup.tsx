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

// Basic email/password signup scaffold. The full onboarding flow (post-signup
// profile creation, marketing opt-in, the style quiz) lands in a later phase;
// this proves the auth round-trip works end to end.
export default function SignupScreen() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { first_name: firstName.trim() } },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // When email confirmation is on, there's no session yet — tell the user to
    // check their inbox. When it's off, the AuthProvider redirects automatically.
    if (!data.session) setDone(true);
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream px-8">
        <Text className="font-display text-3xl text-forest">Check your inbox</Text>
        <Text className="mt-3 text-center text-sm font-sans text-forest/60">
          We sent a confirmation link to {email.trim()}. Tap it, then come back
          and log in.
        </Text>
        <Link href="/(auth)/login" className="mt-8 text-sm font-sans-semibold text-forest underline">
          Back to login
        </Link>
      </SafeAreaView>
    );
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
            Create account
          </Text>
          <Text className="mt-2 font-display text-3xl text-forest">
            Start your closet
          </Text>

          <View className="mt-8 gap-4">
            <View>
              <Text className="mb-1.5 text-xs font-sans-semibold uppercase tracking-wider text-forest/70">
                First name
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Beejal"
                placeholderTextColor="rgba(42,61,46,0.3)"
                className="rounded-xl border-2 border-forest/15 bg-white px-4 py-3 text-sm text-forest"
              />
            </View>
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
                autoComplete="password-new"
                placeholder="At least 6 characters"
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
                {loading ? "Creating…" : "Sign Up  →"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm font-sans text-forest/60">
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" className="text-sm font-sans-semibold text-forest underline">
              Log in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
