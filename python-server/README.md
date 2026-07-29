# QuickVoice Python translation server

This FastAPI service implements the same `POST /translate` contract already used
by the QuickVoice mobile app. It runs
`facebook/nllb-200-distilled-600M` locally and supports English and Japanese.
Translation text is not sent to an external translation API.

It also exposes self-hosted English and Japanese speech through Kokoro-82M.

## Run locally

```sh
cd python-server
/opt/homebrew/bin/python3.12 -m venv .venv312
source .venv312/bin/activate
python -m pip install -r requirements.kokoro.txt
python -m unidic download
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

## Kokoro TTS

Kokoro requires Python 3.10–3.12. To run translation and TTS together locally:

```sh
/opt/homebrew/bin/python3.12 -m venv .venv312
.venv312/bin/python -m pip install -r requirements.kokoro.txt
.venv312/bin/python -m unidic download
.venv312/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Docker is also supported:

```sh
docker build -t quickvoice-ai .
docker run --rm -p 8000:8000 \
  -v quickvoice-huggingface:/root/.cache/huggingface \
  quickvoice-ai
```

The first request downloads Kokoro-82M and the selected English `af_heart` or
Japanese `jf_alpha` voice into `tts/kokoro_models`.

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
