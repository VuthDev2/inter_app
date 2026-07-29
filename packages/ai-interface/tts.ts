/** Framework-neutral contract for synthesizing speech from translated text. */
export interface VoiceDescriptor {
  id: string;
  language: string;
  name: string;
  quality?: 'compact' | 'standard' | 'premium';
}

export interface SpeechSynthesisRequest {
  text: string;
  language: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
}

export interface SynthesizedAudio {
  data: ArrayBuffer;
  mimeType: string;
  durationMs?: number;
}

export interface TTSEngine {
  readonly id: string;
  readonly mode: 'offline' | 'online';
  listVoices(language?: string): Promise<VoiceDescriptor[]>;
  synthesize(request: SpeechSynthesisRequest): Promise<SynthesizedAudio>;
}
