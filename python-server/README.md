# QuickVoice Python translation server

This FastAPI service implements the same `POST /translate` contract already used
by the QuickVoice mobile app. It runs
`facebook/nllb-200-distilled-600M` locally and supports English and Japanese.
Translation text is not sent to an external translation API.

It also exposes self-hosted English and Japanese speech through MeloTTS.

## Run locally

```sh
cd python-server
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The first launch downloads roughly 2.5 GB of model files from Hugging Face.
The default device is CPU. Apple Silicon users can try
`NLLB_DEVICE=mps`, while CUDA servers can use `NLLB_DEVICE=cuda`.

Check the server:

```sh
curl http://127.0.0.1:8000/health
```

Translate text:

```sh
curl -X POST http://127.0.0.1:8000/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hello","source":"en-US","target":"ja-JP"}'
```

The mobile app can use this server through its existing
`EXPO_PUBLIC_API_BASE_URL`. For the iOS Simulator, use:

```sh
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For a physical phone, use the Mac's LAN IP instead of `127.0.0.1`.

## MeloTTS

MeloTTS is officially developed and tested with Python 3.9. Because its pinned
dependencies conflict with the host Python 3.13 NLLB environment, Docker is the
supported way to run translation and TTS together on this Mac:

```sh
docker build -t quickvoice-ai .
docker run --rm -p 8000:8000 \
  -v quickvoice-huggingface:/root/.cache/huggingface \
  quickvoice-ai
```

The first request for each voice downloads its checkpoint into `tts/english_model`
or `tts/japanese_model` inside the container.

Generate English WAV audio:

```sh
curl -X POST http://127.0.0.1:8000/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"Welcome to QuickVoice.","language":"en"}' \
  --output quickvoice-en.wav
```

Generate Japanese WAV audio:

```sh
curl -X POST http://127.0.0.1:8000/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"こんにちは。","language":"ja"}' \
  --output quickvoice-ja.wav
```

## Model notice

The NLLB model is published under CC-BY-NC-4.0 and its model card describes it
as a research model rather than a production or certified translation system.
