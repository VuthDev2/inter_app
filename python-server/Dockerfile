FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLLB_DEVICE=cpu

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential espeak-ng git libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.kokoro.txt .
RUN python -m pip install --no-cache-dir -r requirements.kokoro.txt

COPY app ./app
COPY translation ./translation
COPY tts ./tts

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
