import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { routeThroughEarpiece } from "../../../../services/audioSettings";
import { File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

import { synthesizeSpeechViaApi } from "../../../../services/api";

export type TTSLanguage = "en" | "ja";

const LOCALES: Record<TTSLanguage, string> = { en: "en-US", ja: "ja-JP" };

class QuickVoiceTTSService {
  private player: AudioPlayer | null = null;
  private audioFile: File | null = null;
  private requestId = 0;
  private voiceCache = new Map<TTSLanguage, string | undefined>();

  async speak(text: string, language: TTSLanguage, speed = 1): Promise<void> {
    const requestId = ++this.requestId;
    await this.preparePlaybackAudioMode();

    try {
      const audio = await synthesizeSpeechViaApi(text, language, speed);
      if (requestId !== this.requestId) return;

      this.releaseCurrentAudio();

      const file = new File(
        Paths.cache,
        `quickvoice-tts-${Date.now()}-${language}.wav`,
      );
      file.write(audio);

      const player = createAudioPlayer(file.uri);
      this.audioFile = file;
      this.player = player;
      await new Promise<void>((resolve) => {
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(fallbackTimer);
          subscription.remove();
          resolve();
        };
        const subscription = player.addListener("playbackStatusUpdate", (status) => {
          if (status.didJustFinish) finish();
        });
        const fallbackTimer = setTimeout(finish, 20_000);
        player.play();
      });
      if (requestId === this.requestId) this.releaseCurrentAudio();
      await this.restoreRecordingAudioMode();
      return;
    } catch {
      // Fall back to the system voice when the local TTS server is unavailable.
      await this.restoreRecordingAudioMode();
    }

    // The system voice is the fallback on *both* platforms. Restricting it to
    // iOS left Android completely silent whenever the Python TTS server was
    // unreachable, which is also the state every Android build starts in.
    this.releaseCurrentAudio();
    const { voice, listed } = await this.getBestVoice(language);
    if (requestId !== this.requestId) return;

    if (Platform.OS === "android" && listed && !voice) {
      // Android ships without Japanese voice data on many devices, and
      // Speech.speak then reads the text with the default locale's voice
      // instead of reporting anything, which sounds like gibberish.
      throw new Error(
        `No ${language === "ja" ? "Japanese" : "English"} voice is installed on this device. ` +
          "Add it under Settings → System → Languages & input → Text-to-speech output.",
      );
    }

    await new Promise<void>((resolve) => {
      Speech.speak(text, {
        // Android builds a java.util.Locale straight from this string, and
        // `Locale("ja-JP")` is not a valid locale there — it silently falls
        // back to the device language. The bare language code is.
        language: Platform.OS === "android" ? language : LOCALES[language],
        onDone: resolve,
        onError: () => resolve(),
        onStopped: resolve,
        pitch: 1,
        rate: speed,
        // iOS-only: keeps expo-speech on its own audio session instead of the
        // one the recognizer left configured for measurement.
        useApplicationAudioSession: false,
        voice,
      });
    });
    // The fallback voice takes the session too, so the microphone has to be
    // handed back on this path as well.
    await this.restoreRecordingAudioMode();
  }

  stop(): void {
    this.requestId += 1;
    this.releaseCurrentAudio();
  }

  /**
   * Give the microphone back.
   *
   * preparePlaybackAudioMode takes the session with `allowsRecording: false`,
   * and nothing handed it back afterwards. The recogniser does set its own
   * category when it next starts, but expo-audio still held the session in a
   * playback shape, so recording continued -- capturing near-silence. On a real
   * device that showed up as turn after turn of several hundred KB of audio
   * that Whisper transcribed as nothing: the first sentence of a session worked
   * and everything after the first spoken translation came back empty.
   */
  private async restoreRecordingAudioMode(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        interruptionMode: "duckOthers",
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: routeThroughEarpiece(),
      });
    } catch {
      // Leave it to the recogniser's own category call rather than failing the
      // turn over an audio-mode change.
    }
  }

  /**
   * expo-speech-recognition leaves the iOS session on `.playAndRecord` with
   * mode `.measurement`, which strips signal processing and plays back at a
   * barely audible level. Switching to a playback-shaped mode before speaking
   * restores normal volume, and `playsInSilentMode` keeps translations audible
   * with the ring/silent switch flipped (iOS) or the ringer silenced (Android).
   */
  private async preparePlaybackAudioMode(): Promise<void> {
    // Re-applied on every utterance, not cached: the recognizer reconfigures
    // the session each time it starts, so a mode set once is gone by the
    // second turn of a conversation.
    // Earpiece routing is a `.playAndRecord` feature on iOS: with
    // `allowsRecording: false` the session becomes plain playback, which always
    // goes to the loudspeaker and would silently ignore the setting. So the
    // earpiece choice keeps recording allowed; the loudspeaker default keeps
    // the playback-shaped session that fixed the quiet-translations bug above.
    const earpiece = routeThroughEarpiece();
    try {
      await setAudioModeAsync({
        allowsRecording: earpiece,
        interruptionMode: "duckOthers",
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: earpiece,
      });
    } catch {
      // A device that rejects the mode change still plays through the
      // session the recognizer configured; don't block speech over it.
    }
  }

  private releaseCurrentAudio(): void {
    void Speech.stop();

    if (this.player) {
      this.player.pause();
      this.player.remove();
      this.player = null;
    }
    if (this.audioFile?.exists) {
      this.audioFile.delete();
    }
    this.audioFile = null;
  }

  /**
   * `listed` distinguishes "this device has no voice for that language" from
   * "the voice list could not be read", so only the former is reported as a
   * missing-voice error instead of letting the platform pick.
   */
  private async getBestVoice(
    language: TTSLanguage,
  ): Promise<{ voice: string | undefined; listed: boolean }> {
    if (this.voiceCache.has(language)) {
      return { voice: this.voiceCache.get(language), listed: true };
    }

    const locale = LOCALES[language];
    const languagePrefix = `${language}-`;
    let voices: Speech.Voice[];
    try {
      voices = await Speech.getAvailableVoicesAsync();
    } catch {
      return { voice: undefined, listed: false };
    }

    const candidates = voices
      .filter((voice) => voice.language === locale || voice.language.startsWith(languagePrefix))
      .sort((left, right) => {
        const leftExact = left.language === locale ? 1 : 0;
        const rightExact = right.language === locale ? 1 : 0;
        const qualityRank = (voice: (typeof voices)[number]) => {
          const identifier = voice.identifier.toLowerCase();
          if (identifier.includes("premium")) return 2;
          if (
            identifier.includes("enhanced") ||
            voice.quality === Speech.VoiceQuality.Enhanced
          ) return 1;
          return 0;
        };
        return qualityRank(right) - qualityRank(left) || rightExact - leftExact;
      });

    const identifier = candidates[0]?.identifier;
    this.voiceCache.set(language, identifier);
    return { voice: identifier, listed: true };
  }
}

export default new QuickVoiceTTSService();
