// Thin wrapper over expo-haptics. Every call is fire-and-forget and swallows
// errors so a device without a Taptic Engine (or a simulator) never throws.
// Semantic names keep call sites readable and consistent:
//   tap()     — light selection feedback (toggles, chips, shutter arm)
//   impact()  — a firmer confirmation (capture, primary tap)
//   success() — a completed positive action (saved, purchased)
//   warning() — a destructive / caution moment (delete confirmation)
//   error()   — a failed action
import * as Haptics from "expo-haptics";

export function tap() {
  Haptics.selectionAsync().catch(() => {});
}

export function impact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium
) {
  Haptics.impactAsync(style).catch(() => {});
}

export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function error() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
