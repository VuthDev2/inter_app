# QuickVoice AI architecture

## Purpose

This structure prepares QuickVoice for interchangeable offline and online AI engines without selecting, downloading, or shipping models yet. The React Native app and Next.js website should depend on shared contracts, not directly on a model vendor or platform API.

The interpretation pipeline is:

```text
Microphone -> Speech Engine -> transcript -> Translation Engine
           -> translated text -> TTS Engine -> speaker
```

Partial transcripts may move through the pipeline for a responsive live preview. Only stable or final segments should normally be spoken, preventing TTS from repeatedly reading corrected text.

## Speech Engine: voice to text

The Speech Engine receives encoded audio chunks and produces partial or final transcripts. It is responsible for audio format validation, recognition, punctuation, language selection or detection, timestamps, and confidence metadata.

Offline mobile implementations can eventually load speech assets from an installed language package. Online implementations can stream audio to a server provider. Both implement the shared `SpeechEngine` contract in `packages/ai-interface/speech.ts`.

## Translation Engine: text to text

The Translation Engine translates a transcript from a source language into a target language. It can optionally use recent transcript segments as conversational context while keeping each result independently identifiable.

An offline implementation will use a compatible local language-pair model. The website normally uses an authenticated server endpoint so model credentials and provider secrets never reach the browser. Both implement `TranslationEngine` from `packages/ai-interface/translation.ts`.

## TTS Engine: text to voice

The TTS Engine converts translated text into playable audio. It exposes available voices and accepts language, voice, speed, and pitch preferences. Playback queues, interruption, and audio-session behavior belong to the application or platform adapter rather than the engine contract.

Mobile can use an installed offline voice or native system voice. The website can request synthesized audio from the server. Both conform to `TTSEngine` in `packages/ai-interface/tts.ts`.

## Offline language package system

A language package is a versioned, signed or checksummed manifest plus the assets needed for one or more capabilities: speech recognition, translation, and TTS. A future catalog service should publish manifests containing package ID, language, version, byte size, checksum, capabilities, and minimum compatible app version.

The language manager separates two responsibilities:

- `LanguageDownloadManager` queues, pauses, resumes, cancels, and reports download progress.
- `LanguagePackageManager` discovers, verifies, lists, activates, updates, and removes installed packages.

Packages should download to a temporary location, verify their checksum and compatibility, and then be moved atomically into application-controlled storage. Interrupted or invalid downloads must never replace the active package. Model files should not be committed to this repository.

## Mobile offline flow

1. The user chooses source and target languages.
2. The package manager checks that speech, translation, and TTS capabilities are installed.
3. Missing assets are offered for download while the device is online.
4. Native audio capture supplies chunks to the offline Speech Engine.
5. Final transcript segments pass to the offline Translation Engine.
6. Translated segments pass to the offline TTS Engine and the native playback queue.
7. Transcripts and preferences are stored according to the app's privacy settings.

When an offline capability is unavailable, product policy may offer the online flow after explicit user consent. Network fallback must not be silent because voice and transcript data may leave the device.

## Website online flow

1. The browser requests microphone permission and captures audio.
2. The Next.js client streams audio to a protected server endpoint.
3. The server authenticates the request, applies limits, and invokes an online Speech Engine.
4. Transcript segments are translated by the server Translation Engine.
5. The server TTS Engine returns synthesized audio or a stream for browser playback.
6. The client displays live source and translated text while managing playback order.

Provider keys remain on the server. Transport must be encrypted, temporary audio should be deleted promptly, and logs must avoid raw audio or transcript content unless the user has explicitly opted in.

## Shared and platform-specific boundaries

Shared code includes engine contracts, request and result types, language metadata, package manifests, download state, error categories, and orchestration rules that do not import React Native, iOS, Android, or browser APIs.

iOS-specific code owns `AVAudioSession`, microphone capture, speaker routing, background audio behavior, Apple speech or voice adapters, filesystem paths, secure storage, and native model runtime bindings.

Android-specific code owns `AudioRecord` or platform capture, audio focus, speaker and Bluetooth routing, Android speech or voice adapters, filesystem paths, Keystore integration, foreground services, and native model runtime bindings.

Website-specific code owns browser media APIs, AudioWorklets, browser playback, WebSocket or streaming transport, and the Next.js server adapters. The browser must not directly receive AI provider credentials.

## Directory responsibilities

- `ai/models/*` reserves locations for future model metadata and tooling, not model binaries.
- `ai/training/datasets` reserves future dataset documentation and preparation tooling. Private or licensed datasets must remain outside Git.
- `ai/deployment/mobile` will hold future native packaging and optimization configuration.
- `ai/deployment/server` will hold future server inference deployment configuration.
- `packages/ai-interface` contains portable AI engine contracts.
- `packages/language-manager` contains portable offline package lifecycle contracts.

No AI model, dataset, provider SDK, or runtime implementation is included at this stage.
