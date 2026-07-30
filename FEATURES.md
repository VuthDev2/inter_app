# QuickVoice Features

## Completed

- English welcome/onboarding experience with video assets
- Supabase email/password sign-in and persistent sessions
- Account creation through the Node backend
- Email OTP password recovery with rate limiting and expiring reset authorization
- Profile display-name management
- Email and password update screens
- Live English–Japanese interpreter with explicit language selection
- Streaming partial transcript display
- Silence-based phrase completion, translation, and optional TTS playback
- One-way and two-way conversation modes
- Recording categories, custom category names/icons, transcription, translation, and saving
- Local conversation, recording, and audio metadata persistence
- Best-effort Supabase sync and history loading
- Conversation and voice-record history views
- System/light/dark appearance and text-size preferences
- English/Japanese localization for authenticated application UI
- Persistent UI-language switch independent of interpretation language
- iOS and Android native projects, microphone permissions, and adaptive Android icon configuration
- FastAPI local Whisper, NLLB, and Kokoro endpoints
- Node health, authentication email, translation, transcription, and authenticated WebSocket endpoints
- Supabase schema with RLS for profiles, preferences, recordings, sessions, transcripts, and audio metadata

## In progress or partial

- Physical-device reliability depends on both local servers, LAN/USB routing, environment values, and model availability.
- History cloud loading is implemented, but synced live-session detail may lack utterances because the history query does not currently hydrate transcript rows.
- Extension history has UI structure but no active data source.
- Cloud backup/sync controls and account deletion are visible but marked unavailable.
- Error localization covers known UI states; arbitrary server/provider messages may still require stable error codes.
- The Node Gemini live WebSocket path exists, while the current mobile speech hook uses native streaming recognition plus FastAPI requests.
- TTS has local-server and device paths; deployment should standardize the intended production fallback policy.
- The web package is a scaffold without implemented application pages.

## Planned

- Production deployment and secure remote connectivity for the Node and AI services
- Complete cloud backup, restore, account deletion, and transcript hydration
- Web application implementation
- Offline language-package download, verification, activation, and update flow
- Production observability without logging private audio or transcript content
- Automated unit, integration, API, and mobile end-to-end tests
- Final model licensing, privacy, retention, and distribution review

