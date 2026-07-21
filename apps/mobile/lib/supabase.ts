// Supabase client for React Native. Mirrors apps/web/lib/supabase.js but swaps
// the browser's implicit localStorage for AsyncStorage and disables URL-based
// session detection (there's no URL bar in a native app). AppState wiring keeps
// the access token refreshing only while the app is foregrounded.
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast, and legibly. Passing empty strings through to createClient makes
// supabase-js throw a bare "supabaseUrl is required" from inside a vendored
// module — in a release build that surfaces as an unattributable native crash
// with no hint that an env var is the cause. Naming the missing var here means
// the message lands in the crash report / TestFlight log verbatim.
//
// This is a build-configuration error, not a runtime condition: the values are
// inlined at bundle time, so if they're absent the binary is unshippable and
// there is nothing to degrade gracefully into. EAS does not upload .env.local
// (it's gitignored), so EAS builds read these from the EAS environment named by
// the build profile's `environment` key in eas.json — manage them with
// `eas env:list` / `eas env:create`, not by editing eas.json.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  throw new Error(
    `[supabase] Missing ${missing.join(" and ")} in this build. ` +
      "Locally: copy apps/mobile/.env.example to .env.local and fill it in. " +
      "For EAS builds: set it in the build profile's env block in eas.json. " +
      "The anon key must be the legacy eyJ... JWT, not an sb_publishable_ key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while foregrounded; pause in the background.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
