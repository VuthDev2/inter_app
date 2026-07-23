import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

import { synthesizeSpeechViaApi } from "../../../../services/api";

export type TTSLanguage = "en" | "ja";

class QuickVoiceTTSService {
  private player: AudioPlayer | null = null;
  private audioFile: File | null = null;
  private requestId = 0;

  async speak(text: string, language: TTSLanguage, speed = 1): Promise<void> {
    const requestId = ++this.requestId;
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
    player.play();
  }

  stop(): void {
    this.requestId += 1;
    this.releaseCurrentAudio();
  }

  private releaseCurrentAudio(): void {
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
}

export default new QuickVoiceTTSService();
