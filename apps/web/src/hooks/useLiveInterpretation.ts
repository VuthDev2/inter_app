"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHUNK_DURATION = 1500;
const SAMPLE_RATE = 16000;
const INPUT_AUDIO_MIME = "audio/pcm;rate=16000";

export type InterpretationEntry = {
  id: string;
  original: string;
  translation: string;
};

function liveWsUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  return base.replace(/^http/, "ws") + "/ws/live";
}

function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const LANGUAGE_MAP: Record<string, string> = {
  "English (US)": "en",
  Japanese: "ja",
  Spanish: "es",
  French: "fr",
  German: "de",
  Mandarin: "zh",
  Korean: "ko",
};

export function useLiveInterpretation(
  sourceLangLabel: string,
  targetLangLabel: string
) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [liveTranslation, setLiveTranslation] = useState("");
  const [entries, setEntries] = useState<InterpretationEntry[]>([]);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isActiveRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const lastChunkTimeRef = useRef(0);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourceLangRef = useRef(sourceLangLabel);
  const targetLangRef = useRef(targetLangLabel);

  useEffect(() => {
    sourceLangRef.current = sourceLangLabel;
    targetLangRef.current = targetLangLabel;
  }, [sourceLangLabel, targetLangLabel]);

  useEffect(() => {
    isActiveRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      cleanupAudio();
      wsRef.current?.close();
    };
  }, []);

  function cleanupAudio() {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    try {
      processorRef.current?.disconnect();
    } catch {}
    try {
      sourceRef.current?.disconnect();
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    processorRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    audioBufferRef.current = [];
    setVolume(0);
  }

  const start = useCallback(async () => {
    setError(null);
    setEntries([]);
    setInterimText("");
    setLiveTranslation("");
    setVolume(0);
    audioBufferRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch {
      setError(
        "Microphone access denied. Please allow microphone permissions."
      );
      return;
    }
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    source.connect(analyser);

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    source.connect(processor);

    processor.onaudioprocess = (e) => {
      if (!isActiveRef.current) return;
      const input = e.inputBuffer.getChannelData(0);
      audioBufferRef.current.push(new Float32Array(input));

      const now = Date.now();
      if (now - lastChunkTimeRef.current >= CHUNK_DURATION) {
        const totalLen = audioBufferRef.current.reduce(
          (sum, arr) => sum + arr.length,
          0
        );
        if (totalLen === 0) return;
        const combined = new Float32Array(totalLen);
        let offset = 0;
        for (const arr of audioBufferRef.current) {
          combined.set(arr, offset);
          offset += arr.length;
        }
        audioBufferRef.current = [];
        lastChunkTimeRef.current = now;

        const pcm16 = float32ToPcm16(combined);
        const base64 = arrayBufferToBase64(pcm16);

        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "audio",
              data: base64,
              mime: INPUT_AUDIO_MIME,
            })
          );
        }
      }
    };

    const ws = new WebSocket(liveWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "config",
          sourceLang:
            LANGUAGE_MAP[sourceLangRef.current] || sourceLangRef.current,
          targetLang:
            LANGUAGE_MAP[targetLangRef.current] || targetLangRef.current,
        })
      );
      isActiveRef.current = true;
      setIsListening(true);
      lastChunkTimeRef.current = Date.now();
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
      } catch {}
    };

    ws.onerror = () => {
      setError("Connection to interpretation server failed.");
      setIsListening(false);
      isActiveRef.current = false;
    };

    ws.onclose = () => {
      if (isActiveRef.current) {
        setError("Connection lost.");
        setIsListening(false);
        isActiveRef.current = false;
      }
    };

    volumeIntervalRef.current = setInterval(() => {
      if (analyserRef.current && isActiveRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg =
          data.length > 0
            ? data.reduce((a, b) => a + b, 0) / data.length / 255
            : 0;
        setVolume(avg);
      }
    }, 200);
  }, []);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    cleanupAudio();
    wsRef.current?.close();
    wsRef.current = null;
    setIsListening(false);
  }, []);

  return {
    isListening,
    interimText,
    liveTranslation,
    entries,
    volume,
    error,
    start,
    stop,
  };
}
