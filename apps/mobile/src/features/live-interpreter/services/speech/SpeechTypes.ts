export type SpeechLanguage = "auto" | "en-ja" | "en-US" | "ja-JP";

export type SpeechResult = {
  transcript: string;
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
  startListening(language: SpeechLanguage): Promise<void>;
  stopListening(): Promise<void>;
  onPartialResult(listener: SpeechResultListener): SpeechSubscription;
  onFinalResult(listener: SpeechResultListener): SpeechSubscription;
  onError(listener: SpeechErrorListener): SpeechSubscription;
}
