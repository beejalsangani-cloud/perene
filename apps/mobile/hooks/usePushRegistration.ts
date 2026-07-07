// Registers the device for push once per signed-in session. Fire-and-forget:
// registerForPushNotifications handles permissions, simulator/misconfig, and
// network errors internally and never throws, so the UI is never affected. We
// key the "once" guard on the user id so switching accounts re-registers the
// token against the new user.
import { useEffect, useRef } from "react";
import { useAuth } from "~/context/AuthContext";
import { registerForPushNotifications } from "~/lib/push";

export function usePushRegistration() {
  const { session, initializing } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (initializing) return;
    const userId = session?.user?.id ?? null;
    if (!userId || registeredFor.current === userId) return;
    registeredFor.current = userId;
    void registerForPushNotifications();
  }, [session, initializing]);
}
