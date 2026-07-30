# QuickVoice AI Agent Rules

## Working method

1. Read `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, and `FEATURES.md` before changing behavior.
2. Inspect the relevant implementation and configuration; do not rely on older documentation alone.
3. Keep changes narrowly scoped and preserve unrelated user work in the working tree.
4. Prefer existing services, hooks, providers, storage helpers, and translation keys over parallel implementations.
5. Document assumptions when device, network, model, or Supabase behavior cannot be verified locally.

## Coding rules

- Use TypeScript for mobile code and preserve existing strict typing.
- Keep screens focused on presentation; put speech, API, persistence, authentication, and preferences in their existing service/provider layers.
- Never hardcode authenticated application UI text. Add matching keys to both `src/locales/en.json` and `src/locales/ja.json`, then use `t("key")`.
- Keep user-generated transcript and recording content unchanged; localization applies to interface text.
- Preserve accessibility labels, safe areas, reduced-motion behavior, dark mode, and large-text behavior.
- Reuse `LanguageCode`, storage types, and AI contracts instead of defining incompatible duplicates.
- Do not commit secrets, model binaries, generated audio, caches, build artifacts, or developer-specific addresses.
- Keep API errors stable enough for the UI to localize; avoid exposing secrets or raw internal exceptions.

## Architecture rules

- Keep UI locale separate from source/target interpretation languages.
- Keep welcome, onboarding, sign-in, sign-up, OTP, and password-recovery UI English-only unless product requirements explicitly change.
- Preserve explicit English/Japanese speech-language selection and native partial transcript updates.
- Translate only stable/final phrases after the configured silence boundary; do not send every partial token to translation or TTS.
- Keep NLLB, Whisper, and TTS instances reusable. Never reload a model per request.
- Keep local-first persistence and best-effort cloud sync.
- All user cloud data must remain protected by Supabase authentication and RLS.
- Keep Node backend concerns and local FastAPI inference concerns separate. Mobile uses distinct base URLs for each.
- Shared packages must remain platform-neutral.

## Do not change without explicit approval

- Existing UI design, navigation order, tab behavior, or onboarding sequence
- Supported interpretation languages or translation-model language logic
- Model/provider selection, fallback policy, or model licensing assumptions
- API contracts, ports, database schema, RLS policies, bundle identifiers, or native permissions
- Authentication security controls, rate limits, OTP expiry, or token validation
- Local data deletion behavior

Never silently route voice or transcript data to an external provider when the configured local flow fails.

## Testing requirements

For mobile changes:

```sh
npm run typecheck
```

Also validate affected flows on both iOS and Android when native audio, permissions, keyboard behavior, icons, safe areas, or platform configuration changes.

For localization changes:

- Parse both locale JSON files.
- Verify identical key sets.
- Check both languages in the authenticated app.
- Confirm unauthenticated screens remain English.

For backend or AI changes:

- Start the affected service and check `/health`.
- Exercise changed API success, validation, authentication, and failure paths.
- For speech work, test English and Japanese, partial text, silence completion, and empty/noisy audio.
- For translation/TTS work, test both directions and confirm models remain loaded across requests.

There is no repository-wide automated test suite yet. Do not claim behavioral verification based only on type-checking.

