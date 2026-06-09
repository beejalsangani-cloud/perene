// A tiny module-level hand-off for the confirm-item modal. Route params can't
// cleanly carry a base64 image or a season array, so the camera / library /
// closet-edit entry points stash their intent here and the confirm screen reads
// it on mount. Module singletons survive expo-router's screen remounts.
import type { WardrobeItem } from "./wardrobe";

export type PendingCapture =
  | { mode: "create"; uri: string; width?: number }
  | { mode: "edit"; item: WardrobeItem };

let pending: PendingCapture | null = null;

export function setPendingCapture(next: PendingCapture) {
  pending = next;
}

// Read-and-clear: the confirm screen consumes it once so a stale capture can't
// leak into the next session.
export function takePendingCapture(): PendingCapture | null {
  const current = pending;
  pending = null;
  return current;
}
