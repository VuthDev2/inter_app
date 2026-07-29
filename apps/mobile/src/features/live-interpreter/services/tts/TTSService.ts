import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

import { synthesizeSpeechViaApi } from "../../../../services/api";

export type TTSLanguage = "en" | "ja";

class QuickVoiceTTSService {
  private player: AudioPlayer | null = null;
  private audioFile: File | null = null;
  private requestId = 0;
  private appleVoiceCache = new Map<TTSLanguage, string | undefined>();

  async speak(text: string, language: TTSLanguage, speed = 1): Promise<void> {
    const requestId = ++this.requestId;

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
      return;
    } catch {
      // Fall back to the system voice when the local TTS server is unavailable.
    }

    if (Platform.OS === "ios") {
      this.releaseCurrentAudio();
      const voice = await this.getBestAppleVoice(language);
      if (requestId !== this.requestId) return;

      await new Promise<void>((resolve) => {
        Speech.speak(text, {
          language: language === "ja" ? "ja-JP" : "en-US",
          onDone: resolve,
          onError: () => resolve(),
          onStopped: resolve,
          pitch: 1,
          rate: speed,
          useApplicationAudioSession: false,
          voice,
        });
      });
      return;
    }
  }

  stop(): void {
    this.requestId += 1;
    this.releaseCurrentAudio();
  }

  private releaseCurrentAudio(): void {
    if (Platform.OS === "ios") void Speech.stop();

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

  private async getBestAppleVoice(language: TTSLanguage): Promise<string | undefined> {
    if (this.appleVoiceCache.has(language)) {
      return this.appleVoiceCache.get(language);
    }

    const locale = language === "ja" ? "ja-JP" : "en-US";
    const languagePrefix = language === "ja" ? "ja-" : "en-";
    const voices = await Speech.getAvailableVoicesAsync();
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
    this.appleVoiceCache.set(language, identifier);
    return identifier;
  }
}

export default new QuickVoiceTTSService();
