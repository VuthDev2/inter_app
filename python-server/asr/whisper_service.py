import os
import time
import zlib

import numpy
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path



def _is_repetitive(text: str) -> bool:
    """True when text loops, the signature of a hallucinated segment.

    Whisper falls into repeat loops on non-speech audio and emits the same
    clause over and over. Three independent checks, because no single one
    covers both scripts: a periodic-repeat scan (the only one that catches
    Japanese, which has no spaces to split on), a gzip ratio, and a repeated
    word count. Short strings are exempt throughout — "はいはい" is speech.
    """
    stripped = text.strip()
    if len(stripped) < 12:
        return False

    # A unit repeated back-to-back covering most of the text. Catches
    # "ご視聴ありがとうございました" x3, the most common Japanese hallucination.
    compact = re.sub(r"\s+", "", stripped)
    length = len(compact)
    for period in range(1, min(length // 2, 60) + 1):
        repeats = length // period
        if repeats < 2:
            continue
        if compact.startswith(compact[:period] * repeats) and (period * repeats) / length >= 0.8:
            return True

    payload = stripped.encode("utf-8")
    if len(stripped) >= 24 and len(payload) / max(len(zlib.compress(payload, 9)), 1) > 3.0:
        return True

    words = stripped.split()
    if len(words) >= 6 and len(set(words)) <= len(words) / 3:
        return True

    return False


# Distinctive Japanese words as an English ear (and an English decoder) would
# spell them. Deliberately excludes anything that collides with real English —
# "hai", "mate", "so" and friends would fire on ordinary English speech.
_JAPANESE_ENDINGS = ("desu", "desuka", "masu", "masuka", "deshita", "mashita")

# Ordinary English glue. Two or more of these means the sentence really is
# English, so the fuzzy ending check stands down.
_ENGLISH_FUNCTION_WORDS = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "am",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "them",
    "my", "his", "its", "our", "their",
    "to", "of", "in", "on", "at", "for", "with", "from", "by", "about",
    "and", "or", "but", "if", "that", "this", "these", "those",
    "do", "does", "did", "have", "has", "had", "can", "could", "would",
    "should", "will", "not", "what", "where", "when", "how", "why", "who",
})


_ROMAJI_CUES = frozenset({
    "arigato", "arigatou", "gozaimasu", "gozaimashita",
    "konnichiwa", "konichiwa", "konbanwa", "kombanwa",
    "ohayo", "ohayou", "oyasumi", "sayonara", "sayounara",
    "sumimasen", "gomennasai", "gomenasai",
    "onegai", "onegaishimasu", "kudasai", "douzo", "dozo",
    "hajimemashite", "yoroshiku", "itadakimasu", "gochisousama",
    "daijobu", "daijoubu", "genki", "watashi", "anata",
    "nihongo", "nihon", "eigo", "wakarimasen", "wakarimasu",
    "chotto", "matte", "sugoi", "oishii", "kawaii",
    "doko", "nani", "dare", "itsu", "ikura", "doushite", "nande",
    "benjo", "toire", "eki", "densha", "kuukou", "byouin",
    "moshi", "moshimoshi", "hontou", "honto", "tabun",
    "shitsurei", "otsukare", "otsukaresama", "ganbatte",
})


def _within_edits(a: str, b: str, limit: int) -> bool:
    """Levenshtein distance between a and b is at most `limit`."""
    if abs(len(a) - len(b)) > limit:
        return False
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (ca != cb),
            ))
        if min(current) > limit:
            return False
        previous = current
    return previous[-1] <= limit


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    language: str


class WhisperASRService:
    """Lazy multilingual ASR for short QuickVoice conversation turns."""

    def __init__(self) -> None:
        self.model_name = os.getenv("WHISPER_MODEL", "base")
        self.device = os.getenv("WHISPER_DEVICE", "cpu")
        self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        # Wider beam search costs latency but recovers short, quiet utterances
        # that greedy decoding (beam_size=1) drops or mangles.
        self.beam_size = int(os.getenv("WHISPER_BEAM_SIZE", "1"))
        # Below this EN/JA probability ratio the detection is treated as a
        # coin toss and the caller's expected language breaks the tie.
        self.ambiguity_ratio = float(os.getenv("WHISPER_AMBIGUITY_RATIO", "2.5"))
        # Above this much detected speech, the audio itself decides, full stop.
        self.max_prior_seconds = float(os.getenv("WHISPER_MAX_PRIOR_SECONDS", "1.5"))
        # Below these, the turn is discarded rather than reported as a guess.
        self.min_logprob = float(os.getenv("WHISPER_MIN_LOGPROB", "-0.85"))
        self.no_speech_prob_limit = float(os.getenv("WHISPER_NO_SPEECH_LIMIT", "0.6"))
        self.cpu_threads = int(os.getenv("WHISPER_CPU_THREADS", "4"))
        # "mlx" runs on the Apple GPU; "faster" is the portable CPU path.
        self.backend = os.getenv("WHISPER_BACKEND", "mlx").strip().lower()
        self.mlx_repo = os.getenv(
            "WHISPER_MLX_REPO", f"mlx-community/whisper-{self.model_name}-mlx"
        )
        self._mlx_model = None
        # faster-whisper's vad_filter already runs Silero VAD internally; the
        # mlx path has no such thing built in (see _strip_silence), so it
        # needs its own copy. Disable with WHISPER_VAD_ENABLED=0.
        self.vad_enabled = os.getenv("WHISPER_VAD_ENABLED", "1").strip().lower() not in {
            "0", "false", "no",
        }
        self.vad_speech_pad_ms = int(os.getenv("WHISPER_VAD_SPEECH_PAD_MS", "80"))
        self._vad_model = None
        # When set, every uploaded clip is kept on disk so a bad recognition
        # can be traced back to the audio that produced it.
        self.debug_audio_dir = os.getenv("WHISPER_DEBUG_AUDIO_DIR", "")
        self._model = None

    def transcribe(
        self,
        audio: bytes,
        suffix: str = ".m4a",
        language_hint: str = "en-ja",
        expected_language: str | None = None,
    ) -> TranscriptionResult:
        if not audio:
            return TranscriptionResult(text="", language="unknown")

        suffix = suffix if suffix.startswith(".") else f".{suffix}"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
            temp.write(audio)
            temp_path = Path(temp.name)

        if self.debug_audio_dir:
            try:
                debug_dir = Path(self.debug_audio_dir)
                debug_dir.mkdir(parents=True, exist_ok=True)
                stamp = time.strftime("%H%M%S") + f"-{int(time.time() * 1000) % 1000:03d}"
                (debug_dir / f"{stamp}{suffix}").write_bytes(audio)
            except Exception:
                pass

        try:
            forced = self._forced_language(language_hint)
            if forced is not None:
                result = self._transcribe_path(temp_path, forced)
            else:
                # One pass, not two. Asking the model to detect the language
                # separately re-runs the whole encoder (~234ms measured) just
                # to answer a question `transcribe` already answers for free
                # via all_language_probs.
                result = self._transcribe_path(temp_path, None, expected_language)

            # Very short Japanese greetings often get decoded by Whisper as
            # English romaji ("konnichiwa", "ohayo", etc.). When QuickVoice is
            # in EN/JA mode, retry those cues with the Japanese decoder so the
            # text appears in the Japanese box instead of the English side.
            if (
                language_hint.strip().lower() in {"auto", "en-ja"}
                and result.language == "en"
                and self._looks_like_japanese_romaji(result.text)
            ):
                japanese_result = self._transcribe_path(temp_path, "ja")
                if self._contains_japanese(japanese_result.text):
                    return japanese_result

            return result
        finally:
            temp_path.unlink(missing_ok=True)

    def _transcribe_path(
        self,
        audio_path: Path,
        language: str | None,
        expected_language: str | None = None,
    ) -> TranscriptionResult:
        if self.backend == "mlx":
            return self._transcribe_mlx(audio_path, language, expected_language)
        return self._transcribe_ct2(audio_path, language, expected_language)

    def _load_vad_model(self):
        if self._vad_model is None:
            from silero_vad import load_silero_vad

            self._vad_model = load_silero_vad()
        return self._vad_model

    def _strip_silence(self, audio: numpy.ndarray) -> numpy.ndarray:
        """Drop non-speech, the same job faster-whisper's vad_filter does for
        the CPU backend. Whisper hallucinates fluent text out of room tone;
        removing the room tone gives it nothing to hallucinate from."""
        try:
            from silero_vad import get_speech_timestamps

            model = self._load_vad_model()
            timestamps = get_speech_timestamps(
                audio,
                model,
                sampling_rate=16000,
                speech_pad_ms=self.vad_speech_pad_ms,
            )
        except Exception:
            # VAD is a filter, not a requirement — fall back to the raw clip
            # rather than failing the turn.
            return audio

        if not timestamps:
            return numpy.asarray([], dtype="float32")

        return numpy.concatenate(
            [audio[segment["start"]:segment["end"]] for segment in timestamps]
        )

    def _transcribe_mlx(
        self,
        audio_path: Path,
        language: str | None,
        expected_language: str | None = None,
    ) -> TranscriptionResult:
        """Apple GPU path. Measured 4.2x faster than the CPU backend (508ms ->
        121ms per clip) with identical transcripts."""
        import mlx_whisper
        from faster_whisper.audio import decode_audio

        # mlx-whisper shells out to ffmpeg to read files, which is not
        # installed here — hand it samples directly instead.
        audio = numpy.asarray(decode_audio(str(audio_path), sampling_rate=16000), dtype="float32")

        if self.vad_enabled:
            audio = self._strip_silence(audio)
            if audio.size == 0:
                return TranscriptionResult(text="", language="unknown")

        chosen = language
        probabilities: dict[str, float] = {}
        if chosen is None:
            probabilities = self._detect_mlx(audio)
            english = probabilities.get("en", 0.0)
            japanese = probabilities.get("ja", 0.0)
            chosen = "ja" if japanese > english else "en"

            stronger = max(japanese, english)
            weaker = max(min(japanese, english), 1e-9)
            if (stronger / weaker) < self.ambiguity_ratio and expected_language in {"en", "ja"}:
                chosen = expected_language

        result = mlx_whisper.transcribe(
            audio,
            path_or_hf_repo=self.mlx_repo,
            language=chosen,
            temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
            compression_ratio_threshold=2.4,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6,
            condition_on_previous_text=False,
        )

        # Same guards as the CPU path, in addition to the Silero VAD pass above.
        kept = []
        for segment in result.get("segments") or []:
            if (segment.get("no_speech_prob") or 0.0) > self.no_speech_prob_limit:
                continue
            if _is_repetitive((segment.get("text") or "").strip()):
                continue
            kept.append(segment)

        text = " ".join((segment.get("text") or "").strip() for segment in kept).strip()
        if _is_repetitive(text):
            text = ""
        if text and kept:
            confidence = sum(s.get("avg_logprob") or 0.0 for s in kept) / len(kept)
            if confidence < self.min_logprob:
                text = ""

        return TranscriptionResult(text=text, language=chosen or result.get("language") or "unknown")

    def _detect_mlx(self, audio) -> dict[str, float]:
        """EN/JA probabilities from one encoder pass (~60ms on GPU)."""
        try:
            from mlx_whisper.audio import N_SAMPLES, log_mel_spectrogram, pad_or_trim
            from mlx_whisper.decoding import detect_language
            from mlx_whisper.load_models import load_model

            if self._mlx_model is None:
                self._mlx_model = load_model(self.mlx_repo)
            mel = log_mel_spectrogram(audio, n_mels=self._mlx_model.dims.n_mels, padding=N_SAMPLES)
            segment = pad_or_trim(mel, 3000, axis=-2)
            _, probs = detect_language(self._mlx_model, segment)
            return dict(probs[0] if isinstance(probs, list) else probs)
        except Exception:
            return {}

    def _transcribe_ct2(
        self,
        audio_path: Path,
        language: str | None,
        expected_language: str | None = None,
    ) -> TranscriptionResult:
        model = self._load_model()
        segments, info = model.transcribe(
            str(audio_path),
            beam_size=self.beam_size,
            best_of=self.beam_size,
            # Strip non-speech before decoding. Whisper invents fluent text
            # when handed room tone or a clipped word — the classic symptom is
            # a confident, repetitive English sentence appearing out of a
            # Japanese utterance. Removing the non-speech gives it nothing to
            # hallucinate from.
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
            language=language,
            task="transcribe",
            # A LIST, not a single value. faster-whisper loops over these and
            # retries when a decode trips compression_ratio_threshold or
            # log_prob_threshold. With a bare 0.0 there is exactly one
            # iteration and nothing to fall back to, so the thresholds detect
            # a hallucination and then return it anyway. Only the first entry
            # runs on a healthy turn, so this costs nothing in the normal case.
            temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
            without_timestamps=True,
            condition_on_previous_text=False,
            # Repetition is the tell for a hallucinated segment: real speech
            # does not compress this well.
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6,
        )

        kept = []
        for segment in segments:
            # Whisper reports how confident it is that a segment is really
            # silence. A high value means invented text regardless of how
            # confidently it was decoded — hallucinations are often fluent and
            # score well, which is why this must not also require low logprob.
            no_speech = getattr(segment, "no_speech_prob", 0.0) or 0.0
            if no_speech > self.no_speech_prob_limit:
                continue
            if _is_repetitive(segment.text.strip()):
                continue
            kept.append(segment)

        text = " ".join(segment.text.strip() for segment in kept).strip()

        # Last line of defence, applied to the assembled text: a looping
        # hallucination ("I'm not going to be in the middle of the night",
        # repeated) compresses far better than any real utterance.
        if _is_repetitive(text):
            text = ""

        # Say nothing rather than guess.
        #
        # A confident decode of real speech scores around -0.1 to -0.5. The
        # turns that came back as nonsense ("Konni Chivak" for 便所です) scored
        # -1.07 — the model was not recognising, it was guessing between bad
        # options. Emitting that guess is worse than emitting nothing, because
        # the speaker has no idea they were misheard. Dropping it instead lets
        # the next window pick the phrase up cleanly.
        if text and kept:
            confidence = sum(
                getattr(segment, "avg_logprob", 0.0) or 0.0 for segment in kept
            ) / len(kept)
            if confidence < self.min_logprob:
                text = ""

        if language is not None:
            return TranscriptionResult(text=text, language=language)

        # QuickVoice is an English/Japanese interpreter, so the answer is one of
        # those two even when Whisper's own pick is something else — short
        # mobile clips get read as Thai or Korean surprisingly often.
        probabilities = dict(getattr(info, "all_language_probs", None) or [])
        english = probabilities.get("en", 0.0)
        japanese = probabilities.get("ja", 0.0)
        chosen = "ja" if japanese > english else "en"

        # NOTE: deliberately no gate on the absolute probability here. Whisper
        # spreads its language scores over all 99 languages, so a short clip
        # can be a confident 20x pick between English and Japanese while the
        # winner still only scores 0.28 — clean "こんばんは" does exactly that.
        # Confidence is judged from the decode instead, further down.

        # Only a genuine coin toss defers to whose turn it is.
        #
        # Two conditions, both required. The ratio catches acoustic ties
        # ("はい" vs "Hi" score 2.0x; anything clear is 20x-1000x). The
        # duration limit is the important one: a prior is a substitute for
        # evidence, and a full sentence has plenty of evidence. Without it, a
        # marginal reading of a long utterance could be overridden and then
        # *re-decoded in the wrong language*, which turns English speech into
        # invented Japanese text — far worse than the tie it was meant to fix.
        speech_seconds = getattr(info, "duration_after_vad", None) or getattr(info, "duration", 0.0)
        stronger = max(japanese, english)
        weaker = max(min(japanese, english), 1e-9)
        ambiguous = (stronger / weaker) < self.ambiguity_ratio
        too_short_to_judge = speech_seconds <= self.max_prior_seconds

        if ambiguous and too_short_to_judge and expected_language in {"en", "ja"}:
            chosen = expected_language

        detected = getattr(info, "language", None)
        if detected not in {"en", "ja"} or chosen != detected:
            # The text above was decoded under Whisper's own guess. If that
            # differed from the language we settled on, decode again with the
            # right one — this costs a second pass but only for the handful of
            # turns that are actually ambiguous or mis-detected.
            return self._transcribe_path(audio_path, chosen)

        return TranscriptionResult(text=text, language=chosen)

    def _contains_japanese(self, text: str) -> bool:
        return bool(re.search(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]", text))

    def _looks_like_japanese_romaji(self, text: str) -> bool:
        """True when English-decoded text is really Japanese heard phonetically.

        Whisper's English decoder renders Japanese speech as English-looking
        words — 便所です became "Bink your desk", こんにちは became "Konni
        Chivak". Exact matching is useless against that, so this works three
        ways: distinctive whole words, the grammatical endings that almost
        every Japanese sentence carries (です/ます), and a fuzzy comparison
        that tolerates the mangling.
        """
        normalized = re.sub(r"[^a-z\s]", " ", text.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        if not normalized:
            return False

        words = normalized.split()
        squashed = "".join(words)

        # です / ます endings are the strongest signal in the language: almost
        # every polite sentence ends in one, and English rarely produces them.
        for ending in _JAPANESE_ENDINGS:
            if squashed.endswith(ending):
                return True

        # The endings survive mangling too — 便所です came back as "Bink your
        # desk", and "desk" is a single edit from "desu". That is only safe to
        # act on when the sentence does not otherwise read as English: real
        # English full of function words ("I put it on the desk") must not be
        # dragged through the Japanese decoder.
        english_markers = sum(1 for word in words if word in _ENGLISH_FUNCTION_WORDS)
        if words and english_markers < 2:
            last = words[-1]
            if any(_within_edits(last, ending, 1) for ending in _JAPANESE_ENDINGS):
                return True

        if any(cue in normalized for cue in _ROMAJI_CUES):
            return True

        # Fuzzy pass. "konnichivak" is two edits from "konnichiwa"; "desk" is
        # one from "desu". Allowance scales with length so short English words
        # cannot accidentally match a long Japanese one.
        for candidate in words + [squashed]:
            if len(candidate) < 4:
                continue
            for cue in _ROMAJI_CUES:
                if abs(len(candidate) - len(cue)) > 3:
                    continue
                allowed = 1 if len(cue) <= 5 else 2
                if _within_edits(candidate, cue, allowed):
                    return True

        return False
    def _forced_language(self, language_hint: str) -> str | None:
        """An explicit single-language hint from the caller, or None for auto."""
        hint = language_hint.strip().lower()
        if hint in {"en", "english", "en-us"}:
            return "en"
        if hint in {"ja", "japanese", "ja-jp", "jp"}:
            return "ja"
        return None

    def _load_model(self):
        if self._model is not None:
            return self._model

        try:
            from faster_whisper import WhisperModel
        except Exception as error:
            raise RuntimeError(
                "faster-whisper is not installed. Install python-server requirements again."
            ) from error

        self._model = WhisperModel(
            self.model_name,
            device=self.device,
            compute_type=self.compute_type,
            # Measured on an 8-core Apple Silicon machine: 4 threads ~482ms per
            # clip, 8 threads ~902ms. More threads is not faster here — the
            # cores contend and throughput halves. Left configurable because
            # the sweet spot is machine-specific.
            cpu_threads=self.cpu_threads,
        )
        return self._model
