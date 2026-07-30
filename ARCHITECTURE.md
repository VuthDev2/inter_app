# QuickVoice Architecture

## Frontend

`apps/mobile` is the active client.

- `App.tsx`: provider composition, authenticated/unauthenticated routing, headers, and bottom tabs
- `src/screens`: onboarding, authentication, live interpreter, recording, history, settings, profile, and security screens
- `src/features/auth`: Supabase session and account-flow orchestration
- `src/features/preferences`: local preferences with selected Supabase synchronization
- `src/features/live-interpreter`: speech-recognition contracts, native streaming service, and TTS adapters
- `src/hooks/useLiveInterpretation.ts`: conversation state and speech-to-translation orchestration
- `src/services/api.ts`: server discovery, authenticated AI calls, caching, and fallbacks
- `src/services/storage.ts`: local-first recording/session storage and cloud synchronization
- `src/i18n` and `src/locales`: authenticated UI localization
- `src/theme` and `src/components`: shared presentation primitives

Supabase sessions and local data use the AsyncStorage-compatible `appStorage` adapter. Audio files remain device-local; database rows store metadata and transcripts.

## Backend

### Node service (`backend`, default port 8000)

- Express security middleware, CORS, JSON limits, and rate limiting
- `GET /health`
- `POST /api/signup`
- `POST /api/send-otp`
- `POST /api/verify-otp`
- `POST /api/reset-password`
- Authenticated `POST /transcribe`
- Authenticated `POST /translate`
- Authenticated `/ws/live` Gemini live interpretation
- Authenticated WebSocket room relay

The Node translation route tries Gemini, then MyMemory. OTP and reset authorization are currently held in process memory.

### Local AI service (`python-server`, typically port 8001)

- `GET /health`
- `POST /transcribe`: Whisper audio transcription
- `POST /translate`: NLLB English/Japanese translation
- `POST /tts`: Kokoro WAV synthesis

NLLB loads during FastAPI lifespan startup, warms both translation directions, serializes tokenizer/model inference, and caches repeated translations. Whisper and Kokoro load lazily and reuse model instances.

### Data platform (`supabase`)

Supabase provides authentication and Postgres tables for profiles, preferences, recordings, live sessions, transcripts, and audio metadata. RLS scopes user-owned data. Mobile writes locally first and treats cloud synchronization as best effort.

## Main data flow

```text
User speech
  -> native streaming recognition
  -> partial transcript rendered immediately
  -> short silence/final speech result
  -> FastAPI /translate (NLLB)
  -> translated text rendered
  -> FastAPI /tts or device TTS
  -> translated audio playback
  -> local session save
  -> optional Supabase sync
```

Recording mode uses the same speech/translation services but stores the result as a categorized recording. History reads local data first, then merges available cloud records.

Authentication uses Supabase directly for sessions and normal credential updates. Signup and recovery email flows go through the Node service.

## AI pipeline

1. Native speech recognition starts with an explicit English or Japanese locale.
2. Interim events update the transcript without triggering model requests.
3. A stable/final phrase is produced after silence.
4. The mobile API client sends one translation request and caches repeated text.
5. NLLB translates with a fixed source and target code.
6. If enabled, translated text is synthesized once and played.
7. The session stores original text, translated text, language direction, and timestamps.

The separate Node Gemini WebSocket pipeline accepts PCM audio and can emit partial transcript and translation events, but it is not the current mobile hook’s primary path.

## Configuration and runtime boundaries

- `EXPO_PUBLIC_API_BASE_URL`: Node authentication/backend service
- `EXPO_PUBLIC_AI_BASE_URL`: FastAPI AI service
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: mobile Supabase client
- Node-only secrets: Gemini, Supabase service role, and SMTP variables
- AI runtime variables: NLLB device plus Whisper backend/model/device/confidence settings

Physical devices cannot use the development computer’s loopback address unless port forwarding is configured. Use a reachable LAN/tunnel address or Android `adb reverse`.

