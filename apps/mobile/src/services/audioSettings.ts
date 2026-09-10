/**
 * The two Audio & Video preferences, mirrored out of the preferences context so
 * the plain service modules can read them.
 *
 * TTSService and WhisperSpeechService are singletons, not components, so they
 * cannot use a hook. PreferencesProvider pushes the values down here whenever
 * they change (the same arrangement `setCloudSyncEnabled` uses in storage.ts).
 *
 * The website's third control -- picking a specific microphone -- has no mobile
 * equivalent and is deliberately absent. iOS chooses the input itself (built-in
 * mic, headset, or Bluetooth as they are connected) and expo-audio exposes no
 * way to override it, so a picker here could only ever be decoration.
 */

/** Loudspeaker, or the earpiece at the top of the phone for private listening. */
export type SpeakerOutput = "speaker" | "earpiece";

let speakerOutput: SpeakerOutput = "speaker";
let noiseCancellation = true;

export function setDeviceAudioSettings(next: {
  speaker_output: SpeakerOutput;
  noise_cancellation: boolean;
}): void {
  speakerOutput = next.speaker_output;
  noiseCancellation = next.noise_cancellation;
}

/** iOS honours this only while the session allows recording (`.playAndRecord`),
 *  which is why the playback path opts into recording when it is true. */
export function routeThroughEarpiece(): boolean {
  return speakerOutput === "earpiece";
}

export function noiseCancellationOn(): boolean {
  return noiseCancellation;
}
