import os
from huggingface_hub import snapshot_download

def download_model(repo_id, local_dir):
    print(f"Downloading {repo_id} to {local_dir}...")
    os.makedirs(local_dir, exist_ok=True)
    try:
        snapshot_download(repo_id=repo_id, local_dir=local_dir)
        print(f"Successfully downloaded {repo_id}")
    except Exception as e:
        print(f"Error downloading {repo_id}: {e}")

if __name__ == "__main__":
    models_to_download = [
        ("openai/whisper-small", "./models/whisper-small"),
        ("facebook/nllb-200-distilled-600M", "./models/nllb-200-distilled-600M"),
        ("hexgrad/Kokoro-82M", "./models/Kokoro-82M"),
        ("Qwen/Qwen2.5-1.5B-Instruct", "./models/Qwen2.5-1.5B-Instruct")
    ]
    
    for repo_id, local_dir in models_to_download:
        download_model(repo_id, local_dir)
    
    print("All downloads finished (or skipped if already cached).")
