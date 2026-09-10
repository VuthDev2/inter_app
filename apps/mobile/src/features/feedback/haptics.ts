import { useMemo } from "react";
import { Vibration } from "react-native";
import * as Haptics from "expo-haptics";

import { usePreferences } from "../preferences/context";

/**
 * Touch feedback for the moments that matter in a conversation.
 *
 * The "Haptic Feedback" switch existed on both the web and the phone and did
 * nothing on either: the web has no vibration worth the name, and on the phone
 * the preference was stored and never read. It belongs here, so this is where
 * it lives now — the web switch is gone.
 *
 * Deliberately sparse. A buzz on every word would be unusable during a
 * 30-minute recording, so it fires only where the phone is likely to be in a
 * pocket or face-down and you cannot see the screen: starting and stopping the
 * microphone, a finished turn arriving, and something going wrong.
 *
 * Falls back to the plain vibration motor if the Taptic engine is unavailable
 * (older devices, Android, or a build made before expo-haptics was added), and
 * to nothing at all if that fails too. Feedback is a nicety; it must never be
 * the reason a session throws.
 */

type Effect = "tap" | "turn" | "error";

async function fire(effect: Effect) {
  try {
    if (effect === "tap") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (effect === "turn") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch {
    try {
      Vibration.vibrate(effect === "error" ? [0, 60, 60, 60] : 25);
    } catch {
      // No vibration hardware, or permission denied on Android.
    }
  }
}

export function useHaptics() {
  const { haptics_enabled: enabled } = usePreferences();
  return useMemo(
    () => ({
      /** Microphone started or stopped — the one you feel through a pocket. */
      tap: () => { if (enabled) void fire("tap"); },
      /** A turn was translated and added to the conversation. */
      turn: () => { if (enabled) void fire("turn"); },
      /** Something failed; you may not be looking at the screen. */
      error: () => { if (enabled) void fire("error"); },
    }),
    [enabled],
  );
}
