import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createRecognizer, isSpeechRecognitionSupported } from "@/lib/speech";
import { translateUtterance } from "@/lib/translate.functions";
import { Mic, Pause, X } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const searchSchema = z.object({
  source: z.string().default("en"),
  target: z.string().default("ja"),
});

export const Route = createFileRoute("/local-session")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Kotoba — Face-to-Face" },
      { name: "description", content: "Face-to-face split screen interpretation." },
    ],
  }),
  component: LocalSessionPage,
});

const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "kh", label: "Khmer", flag: "🇰🇭" },
];

function getFlag(code: string) {
  return LANGS.find((l) => l.code === code)?.flag || "🌐";
}

function LocalSessionPage() {
  const router = useRouter();
  const search = Route.useSearch();
  
  // Bottom half (User A)
  const [langA, setLangA] = useState(search.source);
  // Top half (User B, rotated)
  const [langB, setLangB] = useState(search.target);

  const [activeMic, setActiveMic] = useState<"A" | "B" | null>(null);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  
  const recognizerRef = useRef<ReturnType<typeof createRecognizer> | null>(null);

  const handleStop = () => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setActiveMic(null);
  };

  const toggleMic = (side: "A" | "B") => {
    if (activeMic === side) {
      handleStop();
      return;
    }
    
    // Stop any existing
    handleStop();

    if (!isSpeechRecognitionSupported()) {
      toast.error("Speech recognition isn't supported here.");
      return;
    }

    const sourceLang = side === "A" ? langA : langB;
    const targetLang = side === "A" ? langB : langA;

    setInterimText("");
    setFinalText("");
    setTranslatedText("");
    setActiveMic(side);

    try {
      recognizerRef.current = createRecognizer(sourceLang, {
        onInterim: (text) => {
          setInterimText(text);
        },
        onFinal: async (text) => {
          setInterimText("");
          setFinalText(text);
          try {
            const { translation } = await translateUtterance({
              data: { text, sourceLang, targetLang },
            });
            setTranslatedText(translation);
          } catch (e) {
            setTranslatedText("[Translation failed]");
          }
        },
        onError: (m) => {
          if (m !== "no-speech" && m !== "aborted") toast.error(`Mic: ${m}`);
        },
        onEnd: () => {
          setActiveMic(null);
        },
      });
      recognizerRef.current.start();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start microphone");
      setActiveMic(null);
    }
  };

  useEffect(() => () => recognizerRef.current?.stop(), []);

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      
      {/* Top Half (Rotated 180deg) */}
      <div className="flex-1 border-b border-border bg-secondary/30 relative flex flex-col transform rotate-180">
        <div className="absolute top-4 left-4 z-10">
          <Select value={langB} onValueChange={setLangB} disabled={activeMic !== null}>
            <SelectTrigger className="bg-background/80 backdrop-blur border-border h-10 px-4 rounded-full shadow-sm w-auto">
               <span className="mr-2 text-lg">{getFlag(langB)}</span>
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center p-8 pb-24 text-center">
          {activeMic === "B" ? (
            <p className="text-2xl font-medium text-foreground opacity-70 animate-pulse">
              {interimText || "Listening..."}
            </p>
          ) : activeMic === "A" && translatedText ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="font-display text-4xl leading-tight font-semibold text-primary">
                {translatedText}
              </p>
            </div>
          ) : !activeMic && translatedText && finalText ? (
             <div className="opacity-50 transition-opacity">
              <p className="font-display text-2xl font-semibold mb-2">{translatedText}</p>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground opacity-50">Waiting for speech...</p>
          )}
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => toggleMic("B")}
            disabled={activeMic === "A"}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all active:scale-95 ${
              activeMic === "B"
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:grayscale"
            }`}
          >
            {activeMic === "B" ? <Pause className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
        </div>
      </div>

      {/* Bottom Half (Normal) */}
      <div className="flex-1 bg-background relative flex flex-col">
        {/* Close button for the whole session */}
        <button 
          onClick={() => router.navigate({ to: "/home" })}
          className="absolute top-4 right-4 z-20 p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute top-4 left-4 z-10">
          <Select value={langA} onValueChange={setLangA} disabled={activeMic !== null}>
            <SelectTrigger className="bg-secondary/50 backdrop-blur border-border h-10 px-4 rounded-full shadow-sm w-auto">
               <span className="mr-2 text-lg">{getFlag(langA)}</span>
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center p-8 pb-24 text-center">
          {activeMic === "A" ? (
            <p className="text-2xl font-medium text-foreground opacity-70 animate-pulse">
              {interimText || "Listening..."}
            </p>
          ) : activeMic === "B" && translatedText ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="font-display text-4xl leading-tight font-semibold text-primary">
                {translatedText}
              </p>
            </div>
          ) : !activeMic && translatedText && finalText ? (
            <div className="opacity-50 transition-opacity">
              <p className="font-display text-2xl font-semibold mb-2">{translatedText}</p>
            </div>
          ) : (
            <p className="text-xl text-muted-foreground opacity-50">Waiting for speech...</p>
          )}
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => toggleMic("A")}
            disabled={activeMic === "B"}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all active:scale-95 ${
              activeMic === "A"
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:grayscale"
            }`}
          >
            {activeMic === "A" ? <Pause className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
        </div>
      </div>
      
    </div>
  );
}
