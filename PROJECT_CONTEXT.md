# QuickVoice Project Context

## Purpose

QuickVoice is a mobile-first English–Japanese voice interpretation application. It provides live speech transcription, sentence translation, translated speech playback, saved recordings, conversation history, authentication, and user preferences.

The repository is an npm-workspaces monorepo. The mobile app is active; the web app is currently only a Next.js package scaffold.

## Technology stack

- Mobile: Expo 57, React 19, React Native, TypeScript, React Navigation
- Native capabilities: Expo Audio, Speech Recognition, Speech, Video, File System
- Application backend: Node.js, Express, WebSocket, Supabase SDK, Nodemailer
- Local AI backend: Python, FastAPI, PyTorch, Transformers, faster-whisper/MLX Whisper, Kokoro
- Data and authentication: Supabase Auth, Postgres, Row Level Security
- Local persistence: AsyncStorage and device audio files
- UI localization: JSON dictionaries and an application `I18nProvider`

## Current architecture

- `apps/mobile`: iOS, Android, and Expo client. `App.tsx` owns authentication routing and the main tab shell.
- `backend`: Node service, normally port 8000, for account email flows, authenticated Gemini/MyMemory endpoints, and WebSocket live interpretation.
- `python-server`: local AI service, normally configured on port 8001, for Whisper transcription, NLLB translation, and Kokoro TTS.
- `supabase`: schema, RLS policies, triggers, and local Supabase configuration.
- `packages/ai-interface`: portable speech, translation, and TTS contracts.
- `packages/language-manager`: planned offline model-package contracts.
- `packages/shared`: small framework-neutral shared package.
- `apps/web`: reserved web client; no implemented pages at present.

The mobile app probes configured, Metro-host, localhost, and Android-emulator addresses, then caches the first server that answers `/health`. Node and AI server URLs are configured separately.

## Important decisions

- English and Japanese are the only active speech and translation languages.
- Source speech language is selected explicitly when accuracy matters; do not replace it with broad auto-detection.
- Partial speech results must update the UI while the user is speaking.
- A short silence ends a phrase; only a stable sentence is translated and spoken.
- AI models are loaded once and reused. NLLB is warmed in both directions at FastAPI startup.
- Live translation uses the configured QuickVoice AI server and surfaces failure instead of silently switching providers.
- Local saves happen before best-effort Supabase synchronization.
- Supabase RLS protects user-owned recordings, sessions, transcripts, audio metadata, and preferences.
- UI language and interpretation language are separate settings.
- Welcome, onboarding, and authentication screens remain English. Authenticated application UI supports English and Japanese.
- Dark/light appearance follows the system by default.
- Secrets belong in environment files or server configuration, never in source or client bundles.

## Supported languages

- Application UI: English (default) and Japanese after authentication
- Speech recognition: English and Japanese
- Translation: English ↔ Japanese
- TTS: English and Japanese

## AI models and services

- Translation: `facebook/nllb-200-distilled-600M`, loaded and cached by FastAPI
- Speech recognition: Whisper; portable `faster-whisper` path and optional Apple MLX path
- Local TTS: Kokoro-82M pipelines using `af_heart` for English and `jf_alpha` for Japanese
- Node online AI: `gemini-2.0-flash` for transcription/translation
- Node live WebSocket AI: `gemini-live-2.5-flash-preview`
- Translation fallback outside the strict live path: MyMemory
- Device fallback/playback support: Expo Speech and native speech-recognition APIs

Model licensing and deployment suitability must be reviewed before production use; the NLLB model is CC-BY-NC-4.0.

## Important configuration

- Root `package.json`: workspace scripts
- `apps/mobile/app.json`: Expo identity, permissions, icons, plugins, and platform settings
- `apps/mobile/.env.example`: mobile server and Supabase variables
- `apps/mobile/src/types/env.d.ts`: declared client environment variables
- `backend/src/config.js`: Node environment and service configuration
- `python-server/requirements*.txt`: AI runtime variants
- `python-server/Dockerfile`: containerized AI service
- `supabase/config.toml` and `supabase/migrations`: database configuration and schema
- Native projects: `apps/mobile/ios` and `apps/mobile/android`

