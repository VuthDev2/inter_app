"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { quickVoiceWsUrl } from "@/lib/quickvoice-api";

// Requested rate. Browsers are free to ignore it — Safari in particular hands
// back the hardware rate (typically 48kHz) no matter what is asked for. Every
// timing below is derived from the rate the AudioContext *actually* runs at,
// read at runtime, because assuming 16kHz on a 48kHz context makes each block
// count as three times its real duration: a 420ms silence window becomes
// 140ms and starts cutting words in half, and the PCM then reaches Whisper
// labelled as 16kHz while holding 48kHz samples, which it hears three times
// too slow. That combination is what turned "finally" into "Get up, Pennies".
const REQUESTED_SAMPLE_RATE = 16000;

// 1024 frames is 64ms at 16kHz. The old 4096 (256ms) was too coarse to
// measure a 240ms trailing silence, so voice activity is judged on the
// smaller block and the audio is accumulated across blocks.
const BLOCK_SIZE = 1024;
/** Real duration of one block at whatever rate the context actually runs. */
function blockMsFor(sampleRate: number): number {
  return (BLOCK_SIZE / sampleRate) * 1000;
}

// ─── Voice activity detection ────────────────────────────────────────────────
// This mirrors the mobile WhisperSpeechService. The previous web implementation
// sliced the microphone into blind 900ms chunks and transcribed each one
// independently, which cuts words in half: a clean "Hello from QuickVoice"
// sample came back as "Hello from..." + "quick voice.". Whisper returns empty
// text for most mid-word fragments, so the UI simply showed nothing.
//
// Speech is judged as a *rise above the room*, never an absolute level, so a
// quiet room and a noisy cafe both work. On the web we read raw Float32
// samples, so the level is a true RMS in dBFS.
const SPEECH_MARGIN_DB = 9;
const RELEASE_MARGIN_DB = 5;
// The floor chases the room: quickly downward when it gets quieter, slowly
// upward as noise persists, so steady room noise cannot pin the gate open.
const FLOOR_FALL_RATE = 0.25;
const FLOOR_RISE_RATE = 0.02;
// A much lower bar, used only to decide whether a turn the gate *rejected* is
// still worth sending to Whisper.
const WORTH_SENDING_MARGIN_DB = 4;
const MIN_THRESHOLD_DB = -55;
const MAX_THRESHOLD_DB = -28;
// Clips shorter than this are not worth a round trip. Measured against real
// speech: "hello" is 446ms, "yes" 442ms, はい 287ms — at the old 600ms every
// one-word reply was discarded silently, with no transcript and no error.
// Whisper transcribes all of them correctly at this length, and the peak-dB
// gate below is what actually keeps room noise out.
const MIN_TURN_MS = 250;
// Silence after speech that ends the turn. A speaker pausing to think mid
// sentence can go quiet for 400-500ms, so this has to clear that comfortably
// or one sentence arrives as several fragments.
//
// There used to be a shorter exit (240ms) for utterances under 1.8s, on the
// theory that short replies finish when they stop. It cut people off midway:
// spokenMs measures speech *so far*, so the first word of a long sentence and
// a complete one-word reply are indistinguishable at that moment. Every
// sentence got cut at its first breath. One threshold, wide enough for both.
const TRAILING_SILENCE_MS = 700;
// Hard ceiling so a noisy room cannot record forever.
const MAX_UTTERANCE_MS = 12_000;
// Speech onset is detected one block *after* it starts, so keep a little
// audio from before the gate opened or every turn loses its first consonant.
const PRE_ROLL_MS = 300;
function preRollBlocksFor(sampleRate: number): number {
  return Math.ceil(PRE_ROLL_MS / blockMsFor(sampleRate));
}

export type InterpretationEntry = {
  id: string;
  original: string;
  translation: string;
};

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
  // A full 12s turn is ~384KB. Appending one character at a time is quadratic
  // in practice, so convert in blocks.
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function concatBlocks(blocks: Float32Array[]): Float32Array {
  let total = 0;
  for (const block of blocks) total += block.length;
  const combined = new Float32Array(total);
  let offset = 0;
  for (const block of blocks) {
    combined.set(block, offset);
    offset += block.length;
  }
  return combined;
}

function blockLevelDb(block: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < block.length; i++) sum += block[i] * block[i];
  const rms = Math.sqrt(sum / block.length);
  if (rms <= 1e-8) return -100;
  return 20 * Math.log10(rms);
}

const LANGUAGE_MAP: Record<string, string> = {
  "English (US)": "en",
  Japanese: "ja",
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
  /**
   * The browser's own recogniser, used purely to paint words on screen while
   * they are still being spoken. Whisper cannot do that — it is batch, so
   * nothing appears until the speaker stops, which left people repeating
   * themselves because they could not tell they had been heard. This preview
   * is never translated or stored: the WebSocket transcript still overwrites
   * it, so the language detection and accuracy come from Whisper as before.
   */
  const previewRef = useRef<any>(null);
  /** When the current turn's audio left the browser, for latency logging. */
  const sentAtRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  // Written every audio block, published to React on a slow interval.
  const volumeRef = useRef(0);
  const volumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice activity state.
  const preRollRef = useRef<Float32Array[]>([]);
  const utteranceRef = useRef<Float32Array[]>([]);
  const noiseFloorDbRef = useRef<number | null>(null);
  const inSpeechRef = useRef(false);
  const spokenMsRef = useRef(0);
  const silenceMsRef = useRef(0);
  const peakDbRef = useRef(-100);

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

  function resetVad() {
    preRollRef.current = [];
    utteranceRef.current = [];
    noiseFloorDbRef.current = null;
    inSpeechRef.current = false;
    spokenMsRef.current = 0;
    silenceMsRef.current = 0;
    peakDbRef.current = -100;
  }

  function cleanupAudio() {
    try {
      processorRef.current?.disconnect();
    } catch {}
    try {
      sourceRef.current?.disconnect();
    } catch {}
    try {
      silentGainRef.current?.disconnect();
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    processorRef.current = null;
    silentGainRef.current = null;
    sourceRef.current = null;
    audioCtxRef.current = null;
    if (volumeTimerRef.current) {
      clearInterval(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }
    resetVad();
    volumeRef.current = 0;
    setVolume(0);
  }

  /** Send one complete utterance. Whisper sees a whole phrase, never a slice. */
  function flushUtterance() {
    const blocks = utteranceRef.current;
    utteranceRef.current = [];
    const spokenMs = spokenMsRef.current;
    const peakDb = peakDbRef.current;
    const floorDb = noiseFloorDbRef.current ?? MIN_THRESHOLD_DB;

    inSpeechRef.current = false;
    spokenMsRef.current = 0;
    silenceMsRef.current = 0;
    peakDbRef.current = -100;

    if (blocks.length === 0) return;
    if (spokenMs < MIN_TURN_MS) return;
    // Whisper hallucinates on near-silence, so a turn that never rose
    // meaningfully above the room is dropped rather than transcribed.
    if (peakDb < floorDb + WORTH_SENDING_MARGIN_DB) return;

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    sentAtRef.current = performance.now();
    const pcm16 = float32ToPcm16(concatBlocks(blocks));
    // Tell the server the rate these samples are really at. Hard-coding 16000
    // here is what made Whisper replay Safari's 48kHz audio at a third speed.
    const rate = audioCtxRef.current?.sampleRate ?? REQUESTED_SAMPLE_RATE;
    ws.send(
      JSON.stringify({
        // Timing is measured from here — the moment the turn leaves the
        // browser — so the console shows browser-side delay separately from
        // server time. The server answers in ~0.4s; anything beyond that in
        // the number below was spent waiting for silence, not transcribing.
        type: "audio",
        data: arrayBufferToBase64(pcm16),
        mime: `audio/pcm;rate=${Math.round(rate)}`,
        sampleRate: Math.round(rate),
      })
    );
  }

  function processBlock(input: Float32Array) {
    const block = new Float32Array(input);
    const levelDb = blockLevelDb(block);

    // Track the room only while nobody is talking. At 48 kHz callbacks arrive
    // roughly three times as often as at 16 kHz; continuing to raise the floor
    // during speech therefore made Safari's gate chase the speaker's voice and
    // close before a complete word could be sent.
    if (noiseFloorDbRef.current === null) {
      noiseFloorDbRef.current = levelDb;
    } else if (!inSpeechRef.current) {
      const rate =
        levelDb < noiseFloorDbRef.current ? FLOOR_FALL_RATE : FLOOR_RISE_RATE;
      noiseFloorDbRef.current += (levelDb - noiseFloorDbRef.current) * rate;
    }
    const floorDb = noiseFloorDbRef.current;

    // processBlock runs every 64ms, so setting React state here re-rendered
    // the whole interpreter ~15x/second for the entire session. The level is
    // kept in a ref and published on an interval instead (see start()), which
    // costs nothing while nothing reads it and still supports a meter if one
    // is added later.
    volumeRef.current = Math.max(0, Math.min(1, (levelDb + 60) / 50));

    const openThreshold = Math.min(
      MAX_THRESHOLD_DB,
      Math.max(MIN_THRESHOLD_DB, floorDb + SPEECH_MARGIN_DB)
    );
    // Hysteresis: without a lower bar for *staying* in speech, the natural
    // dips between syllables end the turn mid-sentence.
    const closeThreshold = Math.min(
      MAX_THRESHOLD_DB,
      Math.max(MIN_THRESHOLD_DB, floorDb + RELEASE_MARGIN_DB)
    );

    if (!inSpeechRef.current) {
      preRollRef.current.push(block);
      if (
        preRollRef.current.length >
        preRollBlocksFor(audioCtxRef.current?.sampleRate ?? REQUESTED_SAMPLE_RATE)
      ) preRollRef.current.shift();

      if (levelDb >= openThreshold) {
        inSpeechRef.current = true;
        utteranceRef.current = [...preRollRef.current];
        preRollRef.current = [];
        spokenMsRef.current = 0;
        silenceMsRef.current = 0;
        peakDbRef.current = levelDb;
      }
      return;
    }

    utteranceRef.current.push(block);
    spokenMsRef.current += blockMsFor(audioCtxRef.current?.sampleRate ?? REQUESTED_SAMPLE_RATE);
    if (levelDb > peakDbRef.current) peakDbRef.current = levelDb;

    if (levelDb >= closeThreshold) {
      silenceMsRef.current = 0;
    } else {
      silenceMsRef.current += blockMsFor(audioCtxRef.current?.sampleRate ?? REQUESTED_SAMPLE_RATE);
      if (silenceMsRef.current >= TRAILING_SILENCE_MS) {
        flushUtterance();
        return;
      }
    }

    if (spokenMsRef.current >= MAX_UTTERANCE_MS) flushUtterance();
  }

  /** Start the on-screen preview. Failure is silent: it is an enhancement. */
  const startPreview = useCallback((sourceLang: string) => {
    try {
      const Recognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Recognition) return;
      const recognition = new Recognition();
      recognition.lang = sourceLang === "ja" ? "ja-JP" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          text += event.results[i][0].transcript;
        }
        text = text.trim();
        // Only ever fill an empty box. Once Whisper's confirmed text is on
        // screen, the preview must not overwrite it with a rougher guess.
        if (text) setInterimText((current) => (current ? current : text));
      };
      // The recogniser stops itself on silence; reopen while the session runs.
      recognition.onend = () => {
        if (previewRef.current === recognition) {
          try { recognition.start(); } catch { /* already restarting */ }
        }
      };
      recognition.onerror = () => { /* preview only; Whisper still runs */ };
      previewRef.current = recognition;
      recognition.start();
    } catch {
      previewRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    const recognition = previewRef.current;
    previewRef.current = null;
    if (recognition) {
      try { recognition.stop(); } catch { /* already stopped */ }
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    // Deliberately NOT clearing entries: a session is a conversation, and the
    // speaker stops and starts the mic inside one. Wiping here erased what was
    // said a minute ago every time the button was pressed. Use reset() when a
    // genuinely new session begins.
    setInterimText("");
    setLiveTranslation("");
    setVolume(0);
    resetVad();

    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        // getUserMedia is only exposed on secure origins. Opening the site
        // over http from another device silently removes the whole API.
        throw new DOMException("mediaDevices unavailable", "SecurityError");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: REQUESTED_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (reason) {
      const insecureOrigin =
        !window.isSecureContext || !navigator.mediaDevices?.getUserMedia;
      const permissionDenied =
        reason instanceof DOMException &&
        (reason.name === "NotAllowedError" || reason.name === "SecurityError");
      let sitePermission = "unknown";
      try {
        sitePermission = (await navigator.permissions.query({ name: "microphone" as PermissionName })).state;
      } catch {}
      const embeddedCodexBrowser = /ChatGPTBrowser|Codex/i.test(navigator.userAgent);
      if (insecureOrigin) {
        setError(
          `Browsers only allow the microphone on a secure origin. This page is on ${window.location.origin}. Open it as http://localhost:3000 on this computer, or serve the site over https.`
        );
      } else if (permissionDenied && (sitePermission === "granted" || embeddedCodexBrowser)) {
        setError(
          embeddedCodexBrowser
            ? "macOS is blocking the ChatGPT app microphone. Open System Settings → Privacy & Security → Microphone, enable ChatGPT, then fully quit and reopen ChatGPT. You can also open localhost:3000 in Safari or Chrome."
            : "Your browser allowed this site, but macOS is blocking the browser microphone. Enable your browser in System Settings → Privacy & Security → Microphone, then restart the browser."
        );
      } else if (permissionDenied) {
        setError("Microphone access is blocked for this site. Change the address-bar microphone permission to Allow, reload, and try again.");
      } else if (reason instanceof DOMException && reason.name === "NotFoundError") {
        setError("No microphone input was found. Connect or enable a microphone and try again.");
      } else if (reason instanceof DOMException && reason.name === "NotReadableError") {
        setError("The microphone is busy or unavailable. Close other audio apps, then try again.");
      } else {
        setError("QuickVoice could not open the microphone. Restart the browser and try again.");
      }
      console.error("[QuickVoice microphone]", reason);
      return;
    }
    streamRef.current = stream;
    // Mic permission is granted by this point, so the preview can open its own
    // recognition session without triggering a second prompt.
    startPreview(sourceLangRef.current);

    const audioCtx = new AudioContext({ sampleRate: REQUESTED_SAMPLE_RATE });
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioCtx.createScriptProcessor(BLOCK_SIZE, 1, 1);
    processorRef.current = processor;
    source.connect(processor);

    // ScriptProcessor callbacks are not guaranteed to run unless the node is
    // connected to the audio graph's destination. Route it through a muted
    // gain node so recording works without feeding the microphone to speakers.
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    silentGainRef.current = silentGain;
    processor.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (!isActiveRef.current) return;
      processBlock(e.inputBuffer.getChannelData(0));
    };

    // Publish the mic level ~7x/second instead of ~15x, and only when it has
    // actually moved enough to be visible, so an idle session re-renders
    // roughly never rather than continuously.
    volumeTimerRef.current = setInterval(() => {
      setVolume((previous) =>
        Math.abs(previous - volumeRef.current) > 0.05 ? volumeRef.current : previous
      );
    }, 150);

    // Awaited before the socket opens: the URL now carries a short-lived token
    // fetched from this site's server, so the key is never in the page.
    const ws = new WebSocket(await quickVoiceWsUrl());
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
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "transcript") {
          if (sentAtRef.current) {
            // eslint-disable-next-line no-console
            console.log(
              `[QuickVoice] transcript in ${Math.round(performance.now() - sentAtRef.current)}ms`,
            );
          }
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
        } else if (msg.type === "no_speech") {
          // The turn produced no text. Clear the previous turn's interim
          // line so the panel does not look stuck on stale output.
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
  }, []);

  const stop = useCallback(() => {
    // Do not throw away a turn the speaker just finished.
    if (inSpeechRef.current) flushUtterance();
    isActiveRef.current = false;
    stopPreview();
    cleanupAudio();
    wsRef.current?.close();
    wsRef.current = null;
    setIsListening(false);
  }, []);

  /** Clear the conversation. For starting a genuinely new session, not for
   *  resuming the microphone mid-conversation. */
  const reset = useCallback(() => {
    setEntries([]);
    setInterimText("");
    setLiveTranslation("");
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
    reset,
  };
}
