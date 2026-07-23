import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system";

import { liveWsUrl } from "../services/api";
import type { LanguageCode } from "../constants/data";

const CHUNK_DURATION = 1.5; // seconds per audio chunk

// ─── Types ────────────────────────────────────────────────────────────────────

export type InterpretationEntry = {
  id: string;
  original: string;
  translation: string;
};

export type LiveInterpretationState = {
  isListening: boolean;
  interimText: string;
  liveTranslation: string;
  entries: InterpretationEntry[];
  volume: number;
  error: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp3: "audio/mp3",
  caf: "audio/x-caf",
  aac: "audio/aac",
};

function mimeFromUri(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "m4a";
  return MIME_MAP[ext] ?? "audio/mp4";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveInterpretation(
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
) {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [liveTranslation, setLiveTranslation] = useState("");
  const [entries, setEntries] = useState<InterpretationEntry[]>([]);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isActiveRef = useRef(false);
  const prevRecordingRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);

  useEffect(() => {
    isActiveRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
    targetLangRef.current = targetLang;
  }, [sourceLang, targetLang]);

  // ── Volume metering ──
  useEffect(() => {
    if (recorderState.metering != null && isActiveRef.current) {
      setVolume(recorderState.metering);
    }
  }, [recorderState.metering]);

  // ── When a chunk finishes → send audio via WS + start next chunk ──
  useEffect(() => {
    if (
      isActiveRef.current &&
      prevRecordingRef.current &&
      !recorderState.isRecording &&
      recorderState.url
    ) {
      const uri = recorderState.url;
      sendAudioChunk(uri).then(() => {
        if (isActiveRef.current) scheduleNextChunk();
      });
    }
    prevRecordingRef.current = recorderState.isRecording;
  }, [recorderState.isRecording, recorderState.url]);

  // ── Read audio file & send over WebSocket ──
  const sendAudioChunk = useCallback(async (uri: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      ws.send(
        JSON.stringify({
          type: "audio",
          data: base64,
          mime: mimeFromUri(uri),
        }),
      );
    } catch {
      // silently drop failed chunks
    }
  }, []);

  // ── Start next recording chunk ──
  const scheduleNextChunk = useCallback(async () => {
    if (!isActiveRef.current) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: CHUNK_DURATION });
    } catch {
      setError("Failed to start recording. Check microphone permissions.");
      setIsListening(false);
    }
  }, [recorder]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  // ── Controls ──

  const start = useCallback(async () => {
    setError(null);
    setEntries([]);
    setInterimText("");
    setLiveTranslation("");
    setVolume(0);

    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Microphone permission not granted.");
      return;
    }

    const url = await liveWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "config",
          sourceLang: sourceLangRef.current,
          targetLang: targetLangRef.current,
        }),
      );
      isActiveRef.current = true;
      setIsListening(true);
      scheduleNextChunk();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "transcript") {
          setInterimText(msg.text || "");
        } else if (msg.type === "translation") {
          setLiveTranslation(msg.text || "");
        } else if (msg.type === "utterance") {
          if (msg.original || msg.translation) {
            setEntries((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                original: msg.original || "",
                translation: msg.translation || "",
              },
            ]);
          }
          setInterimText("");
          setLiveTranslation("");
        } else if (msg.type === "error") {
          setError(msg.text);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setError("Connection to interpretation server failed.");
      setIsListening(false);
    };

    ws.onclose = () => {
      if (isActiveRef.current) {
        setError("Connection lost.");
        setIsListening(false);
      }
    };
  }, [scheduleNextChunk]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    recorder.stop().catch(() => {});
    wsRef.current?.close();
    wsRef.current = null;
    setIsListening(false);
    setVolume(0);
  }, [recorder]);

  return {
    isListening,
    interimText,
    liveTranslation,
    entries,
    volume,
    error,
    start,
    stop,
  } satisfies LiveInterpretationState & {
    start: () => Promise<void>;
    stop: () => void;
  };
}
