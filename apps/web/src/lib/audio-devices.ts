/** The microphone and speaker chosen in Settings.
 *
 * The pickers used to be two hard-coded strings ("MacBook Pro Microphone",
 * "AirPods Pro") that nothing read: whatever you picked, recording used the
 * system default. These read the real device list, and the ids are applied
 * when capturing and when playing a translation.
 *
 * Settings are stored by SettingsContext under one localStorage key. Playback
 * happens in a plain module function rather than a component, so it reads that
 * key directly instead of taking the value through six call sites.
 */

const SETTINGS_KEY = "app_settings";

export type AudioDevice = { deviceId: string; label: string };

function storedSettings(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

// Before these pickers listed real hardware they stored display names. Those
// values are still in people's browsers, and asking for a device called
// "External" fails outright, so they are read as "no choice made".
const LEGACY_LABELS = new Set(["Default", "External", "AirPods"]);

const deviceId = (value: unknown): string =>
  typeof value === "string" && value && !LEGACY_LABELS.has(value) ? value : "default";

/** "default" means: whatever the operating system is using. */
export function selectedMicId(): string {
  return deviceId(storedSettings().micInput);
}

export function selectedSpeakerId(): string {
  return deviceId(storedSettings().speakerOutput);
}

export function noiseCancellationOn(): boolean {
  const value = storedSettings().noiseCancellation;
  return value !== false;
}

/** Real devices of one kind. Labels stay empty until the user has granted
 *  microphone access once, so callers fall back to a numbered name. */
export async function listDevices(kind: MediaDeviceKind): Promise<AudioDevice[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === kind)
      .map((device, index) => ({
        deviceId: device.deviceId || "default",
        label: device.label || `${kind === "audioinput" ? "Microphone" : "Speaker"} ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

/** Send playback to the chosen speaker. Only Chromium-based browsers implement
 *  setSinkId; elsewhere the system default is used and nothing breaks. */
export async function routeToSelectedSpeaker(audio: HTMLAudioElement) {
  const id = selectedSpeakerId();
  if (id === "default") return;
  const element = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
  if (typeof element.setSinkId !== "function") return;
  try {
    await element.setSinkId(id);
  } catch {
    // Device gone or not permitted: default output still plays.
  }
}
