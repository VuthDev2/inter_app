# QuickVoice architecture

QuickVoice uses a small npm-workspaces monorepo:

- `apps/mobile` — Expo React Native application, including the iOS Xcode and Android projects.
- `apps/web` — Next.js and React website.
- `packages/shared` — framework-neutral types, constants, and utilities.
- `supabase` — database migrations and backend configuration.

Keep platform-specific UI inside its app. Put code in `packages/shared` only when both apps can use it without importing React Native or browser-only APIs.
