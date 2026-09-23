"""Exercise the real websocket handler with deterministic ASR/translation doubles."""
import ast
import asyncio
import base64
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import threading
import time
import types
import unittest

class Disconnected(Exception):
    pass

class LiveFIFOTest(unittest.IsolatedAsyncioTestCase):
    async def test_recognition_continues_and_translation_drains_in_order(self):
        tree = ast.parse((Path(__file__).parents[1] / 'app/main.py').read_text())
        functions = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                     and n.name in {'live_interpretation', 'route_turn'}]
        for node in functions:
            node.decorator_list = []
        second_heard = threading.Event()
        translated = []
        class ASR:
            def transcribe_pcm16(self, pcm, *args):
                return types.SimpleNamespace(text='Hello' if pcm[0] == 1 else 'こんにちは',
                                             language='en' if pcm[0] == 1 else 'ja')
        def translate(text, source, target):
            if text == 'Hello':
                if not second_heard.wait(2):
                    raise AssertionError('Translation blocked recognition of the next turn')
            translated.append((text, source, target))
            return 'translated ' + text
        class Socket:
            def __init__(self):
                self.messages = iter([
                    {'type': 'config', 'sourceLang': 'en', 'targetLang': 'ja'},
                    *[{'type': 'audio', 'data': base64.b64encode(bytes([i])*4000).decode()}
                      for i in [1, 2, 1]], {'type': 'stop'}])
                self.sent = []
                self.stopped = asyncio.Event()
            async def accept(self): pass
            async def receive_json(self):
                try: return next(self.messages)
                except StopIteration:
                    await self.stopped.wait()
                    raise Disconnected()
            async def send_json(self, msg):
                self.sent.append(msg)
                if msg['type'] == 'transcript' and msg['turnId'] == 2: second_heard.set()
                if msg['type'] == 'stopped': self.stopped.set()
        with ThreadPoolExecutor(max_workers=1) as executor:
            scope = dict(asyncio=asyncio, base64=base64, time=time, WebSocket=object,
                         WebSocketDisconnect=Disconnected, API_KEY='', _asr_executor=executor,
                         asr_service=ASR(), correction_service=types.SimpleNamespace(correct=lambda t,l:t),
                         normalize_language=lambda l:l, run_protected_translation=translate,
                         traceback=__import__('traceback'))
            exec(compile(ast.Module(body=functions, type_ignores=[]), '<handler>', 'exec'), scope)
            socket = Socket()
            await asyncio.wait_for(scope['live_interpretation'](socket), 5)
        turns = [m for m in socket.sent if m['type'] == 'utterance']
        self.assertEqual([m['turnId'] for m in turns], [1,2,3])
        self.assertEqual([(m['sourceLang'],m['targetLang']) for m in turns], [('en','ja'),('ja','en'),('en','ja')])
        self.assertEqual(socket.sent[-1]['type'], 'stopped')
        self.assertEqual(len(translated), 3)
        self.assertLess(next(i for i,m in enumerate(socket.sent) if m['type']=='transcript' and m['turnId']==2),
                        next(i for i,m in enumerate(socket.sent) if m['type']=='utterance'))

if __name__ == '__main__': unittest.main()
