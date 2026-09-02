import asyncio
import websockets
import base64

async def test_ws():
    uri = "ws://127.0.0.1:8000/ws/live"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket!")
            
            # Send config
            await websocket.send_json({"type": "config", "sourceLang": "en", "targetLang": "ja"})
            response = await websocket.recv()
            print("Received:", response)
            
            # Send dummy audio
            dummy_pcm = b"\x00" * 3200
            await websocket.send_json({"type": "audio", "data": base64.b64encode(dummy_pcm).decode("utf-8")})
            
            response2 = await websocket.recv()
            print("Received audio response:", response2)
    except Exception as e:
        print("Error:", e)

asyncio.run(test_ws())
