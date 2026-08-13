<<<<<<< HEAD
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
=======
# QuickVoice Companion Chrome Extension

This extension connects Chrome to the local QuickVoice project.

## Features

- Open the QuickVoice web app at `http://localhost:3000`
- Open the Expo web app at `http://localhost:8083`
- Sign in or sign up with the same Supabase project
- Continue with Google by opening the web login page
- Open a Chrome side panel with translation and recording tools
- Translate selected webpage text from the right-click menu
- Record microphone audio and send it to the backend `/transcribe` endpoint

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:

   `C:\Users\thyt6\Documents\inter_app-git\extension`

The packaged clean copy is available at:

`C:\Users\thyt6\Documents\inter_app-git\extension-clean\quickvoice-companion`

The ZIP package is:

`C:\Users\thyt6\Documents\inter_app-git\QuickVoice-Companion-extension.zip`

## Before Using

Keep these running:

- Backend: `http://localhost:8000`
- Web: `http://localhost:3000`
- App: `http://localhost:8083`

The first time you record audio, Chrome will ask for microphone permission.

## Invalid Credentials

`Invalid credentials` means Supabase rejected that email/password pair. Use the password for the QuickVoice account itself. Gmail app passwords are only for the backend email sender and cannot log in. If the account was created with Google, use the web Google login or reset/create a password first.
>>>>>>> 0d91905 (extension update)
