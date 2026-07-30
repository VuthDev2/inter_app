export type SpeechLanguage = "auto" | "en-ja" | "en-US" | "ja-JP";

export type SpeechResult = {
  transcript: string;
  /**
   * The spoken language, from the platform's own detection where available
   * (Android 14+) and otherwise from the transcript's script. Absent when the
   * transcript carries no signal either way (digits, punctuation), so the
   * caller can keep the locale recognition was started with.
   */
  language?: "en" | "ja";
};

export type SpeechRecognitionError = {
  code: string;
  message: string;
};

export type SpeechResultListener = (result: SpeechResult) => void;
export type SpeechErrorListener = (error: SpeechRecognitionError) => void;
export type SpeechSubscription = { remove: () => void };

export interface SpeechServiceInterface {
  startListening(language: SpeechLanguage, expectedLanguage?: "en" | "ja"): Promise<void>;
  stopListening(): Promise<void>;
  onPartialResult(listener: SpeechResultListener): SpeechSubscription;
  onFinalResult(listener: SpeechResultListener): SpeechSubscription;
  onError(listener: SpeechErrorListener): SpeechSubscription;
}
