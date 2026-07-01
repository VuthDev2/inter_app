// Thin wrapper over the browser Web Speech API for continuous dictation.
// Only works in Chrome/Edge/Safari. Falls back gracefully otherwise.

type SpeechEvents = {
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
};

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
    length: number;
  }>;
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return getCtor() !== null;
}

const LOCALE: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
  ko: "ko-KR",
};

export function createRecognizer(lang: string, events: SpeechEvents) {
  const Ctor = getCtor();
  if (!Ctor) throw new Error("Speech recognition not supported in this browser");
  const rec = new Ctor();
  rec.lang = LOCALE[lang] ?? lang;
  rec.continuous = true;
  rec.interimResults = true;

  let stopped = false;

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = r[0].transcript;
      if (r.isFinal) {
        events.onFinal(t.trim());
      } else {
        interim += t;
      }
    }
    if (interim) events.onInterim(interim.trim());
  };
  rec.onerror = (e) => events.onError(e.error);
  rec.onend = () => {
    if (!stopped) {
      // auto-restart for continuous listening
      try {
        rec.start();
      } catch {
        events.onEnd();
      }
    } else {
      events.onEnd();
    }
  };

  return {
    start: () => rec.start(),
    stop: () => {
      stopped = true;
      rec.stop();
    },
  };
}
