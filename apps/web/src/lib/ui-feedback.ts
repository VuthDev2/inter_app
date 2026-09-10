/** Sound cues and background alerts for the live screen.
 *
 * "Sound effects" and "Session alerts" were switches that stored a value and
 * nothing read them. These are the readers. Both are deliberately quiet: a cue
 * is a short synthesised tone rather than an audio file (no assets to ship, no
 * download before the first one can play), and an alert is only raised when the
 * tab is in the background — a notification about something you are looking at
 * is just noise.
 */

const SETTINGS_KEY = "app_settings";

function setting(name: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")?.[name];
    return typeof value === "boolean" ? value : fallback;
  } catch {
    return fallback;
  }
}

export const soundEffectsOn = () => setting("soundEffects", true);
export const sessionAlertsOn = () => setting("sessionAlerts", true);
export const compactViewOn = () => setting("compactView", false);

export type Cue = "start" | "stop" | "turn" | "error";

// Two-tone shapes, low volume, ~150ms. Long enough to notice, short enough to
// sit under someone talking.
const CUES: Record<Cue, { hz: number[]; gain: number }> = {
  start: { hz: [660, 880], gain: 0.05 },
  stop: { hz: [880, 550], gain: 0.05 },
  turn: { hz: [780], gain: 0.035 },
  error: { hz: [400, 300], gain: 0.06 },
};

let context: AudioContext | null = null;

export function playCue(cue: Cue) {
  if (!soundEffectsOn() || typeof window === "undefined") return;
  try {
    // Created on first use: a context made before any interaction starts
    // suspended, and browsers log a warning about it on every page load.
    context ||= new AudioContext();
    void context.resume();
    const { hz, gain } = CUES[cue];
    hz.forEach((frequency, index) => {
      const at = context!.currentTime + index * 0.08;
      const oscillator = context!.createOscillator();
      const volume = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      // Fade out rather than stopping dead, which clicks.
      volume.gain.setValueAtTime(gain, at);
      volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
      oscillator.connect(volume).connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.13);
    });
  } catch {
    // No audio output, or the context was blocked. Never worth an error.
  }
}

/** Ask once, when the switch is turned on, so the prompt has a reason. */
export async function requestAlertPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Raised only when the tab is not the one being looked at. */
export function alertInBackground(title: string, body: string) {
  if (!sessionAlertsOn() || typeof document === "undefined") return;
  if (!document.hidden) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/logo-d.png" });
  } catch {
    // Some browsers refuse constructor notifications outside a service worker.
  }
}
