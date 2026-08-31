import os
import io
import torch
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer, AutoModelForSeq2SeqLM

# Configurations
SAMPLE_RATE = 16000
SILERO_VAD_THRESHOLD = 0.5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

MODELS_DIR = "./models"
WHISPER_PATH = os.path.join(MODELS_DIR, "whisper-small")
QWEN_PATH = os.path.join(MODELS_DIR, "Qwen2.5-1.5B-Instruct")
NLLB_PATH = os.path.join(MODELS_DIR, "nllb-200-distilled-600M")

app = FastAPI()
models = {}

@app.on_event("startup")
def init_models():
    print("[INIT] Loading Silero VAD...")
    vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', force_reload=False, trust_repo=True)
    vad_model = vad_model.to(DEVICE)
    get_speech_timestamps = utils[0]
    
    print("[INIT] Loading Whisper ASR...")
    asr_pipeline = pipeline("automatic-speech-recognition", model=WHISPER_PATH, device_map="auto", torch_dtype=DTYPE)
    
    print("[INIT] Loading Qwen2.5 LLM...")
    qwen_tokenizer = AutoTokenizer.from_pretrained(QWEN_PATH)
    qwen_model = AutoModelForCausalLM.from_pretrained(QWEN_PATH, device_map="auto", torch_dtype=DTYPE)
    
    print("[INIT] Loading NLLB Translator...")
    nllb_tokenizer = AutoTokenizer.from_pretrained(NLLB_PATH)
    nllb_model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_PATH, device_map="auto", torch_dtype=DTYPE)
    nllb_pipeline = pipeline("translation", model=nllb_model, tokenizer=nllb_tokenizer, src_lang="eng_Latn", tgt_lang="jpn_Jpan", device_map="auto", torch_dtype=DTYPE)
    
    models['vad_model'] = vad_model
    models['get_speech_timestamps'] = get_speech_timestamps
    models['asr_pipeline'] = asr_pipeline
    models['qwen_tokenizer'] = qwen_tokenizer
    models['qwen_model'] = qwen_model
    models['nllb_pipeline'] = nllb_pipeline
    
    print("[INIT] All models loaded to VRAM.")

def correct_text(text):
    prompt = f"Correct the following ASR output for typos and punctuation. Only return the corrected text, nothing else.\nText: {text}\nCorrected text:"
    inputs = models['qwen_tokenizer'](prompt, return_tensors="pt").to(DEVICE)
    outputs = models['qwen_model'].generate(**inputs, max_new_tokens=128)
    response = models['qwen_tokenizer'].decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
    return response.strip()

def process_audio(audio_bytes):
    # We expect 16kHz Float32 PCM binary from the mobile app
    audio_np = np.frombuffer(audio_bytes, dtype=np.float32)
    audio_tensor = torch.tensor(audio_np, dtype=torch.float32)
    
    # [VAD]
    timestamps = models['get_speech_timestamps'](audio_tensor, models['vad_model'], sampling_rate=SAMPLE_RATE, threshold=SILERO_VAD_THRESHOLD)
    if not timestamps:
        return None
        
    print("\n[VAD] Speech detected!")
    
    # [ASR]
    result = models['asr_pipeline']({"sampling_rate": SAMPLE_RATE, "raw": audio_np})
    asr_text = result["text"].strip()
    if not asr_text:
        return None
    print(f"[ASR] {asr_text}")
    
    # [Corrected]
    corrected_text = correct_text(asr_text)
    print(f"[Corrected] {corrected_text}")
    
    # [Japanese]
    translation = models['nllb_pipeline'](corrected_text, max_length=128)[0]['translation_text']
    print(f"[Japanese] {translation}")
    
    return {
        "asr": asr_text,
        "corrected": corrected_text,
        "translation": translation
    }

@app.websocket("/ws/listen")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Client connected")
    try:
        while True:
            # Receive binary audio chunk
            audio_bytes = await websocket.receive_bytes()
            
            # Process it
            result = process_audio(audio_bytes)
            if result:
                # Send the JSON result back to mobile
                await websocket.send_json(result)
                
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
