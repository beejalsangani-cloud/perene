import { Redirect } from "expo-router";

// Entry point. The auth gate in app/_layout.tsx redirects to (auth)/login if
// there's no session; otherwise this lands the user in the tab navigator.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
