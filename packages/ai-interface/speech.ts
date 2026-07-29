/** Framework-neutral contract for converting speech audio into text. */
export type AudioEncoding = 'pcm16' | 'wav' | 'aac' | 'opus';

export interface AudioChunk {
  data: ArrayBuffer;
  encoding: AudioEncoding;
  sampleRateHz: number;
  channels: 1 | 2;
  sequenceNumber?: number;
}

export interface SpeechRecognitionOptions {
  language: string;
  enablePartialResults?: boolean;
  enablePunctuation?: boolean;
}

export interface SpeechTranscript {
  text: string;
  language: string;
  isFinal: boolean;
  confidence?: number;
  startedAtMs?: number;
  endedAtMs?: number;
}

export interface SpeechEngine {
  readonly id: string;
  readonly mode: 'offline' | 'online';
  isLanguageAvailable(language: string): Promise<boolean>;
  transcribe(
    audio: AudioChunk,
    options: SpeechRecognitionOptions,
  ): Promise<SpeechTranscript>;
}
