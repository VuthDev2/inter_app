# QuickVoice AI model — collected findings

Everything measured or decided about the three models, gathered from all
QuickVoice sessions. Written as input for a future training/fine-tuning
decision.

Every number here was measured on the development MacBook (16 GB, Apple
Silicon). Estimates are labelled. Nothing in this file is guessed.

---

## 1. What you asked the model to do

Requirements stated across sessions, in your words:

| Requirement | Session |
|---|---|
| Speech recognition + translate + speech, working on **both** iPhone and Android | Jul 28 |
| Conversation alternating **one by one Japanese and English** | Jul 28 |
| Japanese recognition **as strong as English** | Jul 30 |
| Behave like **Apple Translate / Google Translate conversation mode** | Jul 30 |
| **Free, open-source** — not a paid API like your teammate's Gemini key | Jul 30 |
| Eventually **on-device / offline** — user downloads the app, no connection to your Mac | Jul 30 |
| When unsure, **say nothing** rather than output a wrong guess | Jul 30 |
| Faster — target roughly 2x on transcript appearing | Jul 30 |

The "say nothing when unsure" requirement is implemented and is the single
most useful behavioural constraint discovered — see §6.

---

## 2. The three models in use

| Stage | Model | Licence | Disk | Memory |
|---|---|---|---|---|
| Recognition | `whisper-small` (MLX) | MIT | 459 MB | ~0.5 GB |
| Translation | `nllb-200-distilled-600M` | **cc-by-nc-4.0** | 4.6 GB | ~2.4 GB |
| Speech (TTS) | `Kokoro-82M` | apache-2.0 | 314 MB | ~0.3 GB |

Plus ~2–3 GB of PyTorch/MLX runtime. Total server footprint measured at
**~7 GB**, peak 7.6 GB.

### Licence blocker

**NLLB-200 is non-commercial.** Read directly from the model's licence
metadata: `cc-by-nc-4.0`. Free for research and internal use; may **not**
ship in a product that earns money. Whisper and Kokoro are both clear.

If QuickVoice is ever sold, translation must be replaced. Swapping engines
late is expensive, so this is a decision to make early.

---

## 3. Japanese is much weaker than English — measured

20-phrase suite (10 JA, 10 EN), character error rate, at two noise levels:

**Clean audio (45 dB SNR)**

| model | lang | CER | speed |
|---|---|---|---|
| base | JA | 3.3% | 472 ms |
| base | EN | 0.9% | 473 ms |
| small | JA | 1.0% | 1325 ms |
| small | EN | 0.0% | 1344 ms |

**Realistic audio (20 dB SNR — matches real recordings)**

| model | lang | CER | speed |
|---|---|---|---|
| **base** | **JA** | **13.3%** | 464 ms |
| base | EN | 0.4% | 469 ms |
| **small** | **JA** | **2.0%** | 1397 ms |
| small | EN | 0.0% | 1784 ms |

**English barely degrades with noise (0.9% → 0.4%). Japanese collapses
(3.3% → 13.3%) — 33x worse than English on the same audio.** `small` fixes
it: 13.3% → 2.0%, a 6.6x improvement.

Language ID was 10/10 for both models at both noise levels, so *detection*
is not the weakness — *transcription* is.

---

## 4. Audio quality dominates everything

SNR measured on real recordings captured from the phone, against what the
model produced:

| recording | SNR | result |
|---|---|---|
| clean reference | 44.7 dB | perfect |
| real `151247` | 29.2 dB | 「こんにちは」 correct |
| real `152400` | 22.4 dB | "Konni Chivak" wrong |
| real `151216` | 8.0 dB | garbage |
| real `152428` | 5.9 dB | hallucination loop |
| real `152414` | 7.3 dB | hallucination loop |

**Above ~25 dB it works; below ~10 dB it hallucinates.** Roughly half of
real turns arrived at 3–8 dB. This is a microphone/environment problem, not
a model problem, and **no amount of training fixes it.**

---

## 5. What training would and would not fix

Tested and ruled out:

- **`small` model** — fixes Japanese under noise (§3). Does *not* fix
  「はい」/"Hi".
- **`beam_size=5`** — no change on short Japanese.
- **`fugumt` (EN↔JA specialist, 61M)** — dramatically *worse* than NLLB.
  Produced degeneration loops: 便所はどこですか → "Which restorative room is
  the hotel porcelain stoker stove stoker stoker…". Speech-style input was
  worse than clean, exactly as predicted. **Do not use.**
- **Qwen 7B 4-bit local LLM** — will not run on this 16 GB machine. Two
  attempts, 10 minutes each, no output. Earlier claim that it "fits" was
  wrong; a 7B needs far more than its 2.6 GB weight file once KV cache and
  activations are counted.

**Fine-tuning would not help the observed failures.** They were: a VAD bug,
a wrong model swapped in mid-test, hallucination on low-SNR audio, and one
genuinely ambiguous word pair. None is a knowledge gap in the model.
Fine-tuning also does **not** make inference faster — a fine-tuned `base`
runs exactly as many operations as stock `base`.

---

## 6. 「はい」 vs "Hi" — the one unsolvable case

Whisper's EN/JA probabilities on short clips:

```
はい            en=0.4522  ja=0.2244   ratio   2.0x   ← coin toss
こんばんは      en=0.0133  ja=0.2771   ratio  20.8x
おはようございます en=0.0013  ja=0.9884   ratio 784x
English sentence en=0.9533 ja=0.0020   ratio 484x
```

「はい」 and "Hi" are acoustically identical. `avg_logprob` does not
discriminate (English actually scored *better*: −0.467 vs −0.824). No model
can separate them from 0.5 s of audio without context.

**Solution implemented:** the app supplies an `expected` language from
conversation flow, and the server uses it **only** when the probability
ratio is under 2.5x **and** speech is under 1.5 s. Confident detections
always override it. Verified: 「はい」+expected=ja → 「はい」; while
「こんばんは」 and full English sentences ignore a deliberately wrong
expectation.

---

## 7. Hallucination — cause and guards

Long looping output ("I'm not going to be in the middle of the night." ×14)
came from **20-second recordings of mostly noise**, caused by a VAD bug
where the noise floor was a running minimum, so steady room noise stayed
above the gate forever.

Guards now in place, all verified against the real recordings:

- `vad_filter=True` — strips non-speech before decoding. **Also 2x faster**
  (1178 → 495 ms/clip), because there is less audio to decode.
- `compression_ratio_threshold=2.4` plus a repetition check on assembled
  text.
- `no_speech_prob` filtering per segment.
- **Confidence gate**: `avg_logprob < −0.85` → emit nothing. Real speech
  scores −0.1 to −0.5; the "Konni Chivak" turn scored −1.07.

Note: `duration_after_vad` is **not** a usable noise signal — silero rated
pure noise as 52–100% "speech".

---

## 8. Performance findings

- **MLX (Apple GPU) vs CPU for Whisper**: 508 ms → 121 ms, **4.2x**, output
  identical. MLX is Apple-only and will not exist on a Linux server.
- **NLLB on MPS vs CPU**: ~1.0 s → ~0.37 s, **~3x** (Jul 28 session).
- **More CPU threads is worse**: 4 threads 482 ms, 8 threads 902 ms.
- **NLLB loads once** in the FastAPI lifespan, never per request.
- NLLB caps silently truncate: `max_length=160` input, `max_new_tokens=64`
  output, `num_beams=1` (greedy). Greedy errors seen: 特急列車 → 速列車,
  "keep the change" → 切替 (a switch, not money).

---

## 9. Platform ceiling

The Android test device (Samsung SCV39) is **SDK 29 / Android 10**.
OS-level language detection requires **API 34+**. On this device the
on-device recognizer is permanently locale-locked — a hardware/OS ceiling,
not fixable in software. This is why server-side Whisper was introduced.

---

## 10. If you still want to train something

Ranked by expected value:

1. **Don't — fix audio capture first.** The 25 dB/10 dB threshold in §4
   dominates every other variable.
2. **Use `small` instead of `base`** — already measured, 6.6x better
   Japanese, free, no training required.
3. **Replace NLLB** for the licence reason in §2, not for quality. Any
   replacement must be tested on *speech-style* input (no punctuation,
   lowercase, disfluent) — `fugumt` failed exactly there.
4. **Fine-tune only for domain vocabulary** — names, place names, jargon
   that appear repeatedly and are consistently wrong on *good* audio. That
   is the one failure class training genuinely addresses. `initial_prompt`
   is a far cheaper first attempt at the same problem.

Any training set should be built from **real recordings at real SNR**, not
clean studio audio, or it will teach the model the wrong distribution.
