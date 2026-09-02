"""Access control for a QuickVoice server exposed beyond one machine.

Three separate jobs live here, kept out of main.py so the request handlers stay
readable:

* short-lived signed tokens, so the browser never holds the master key
* a per-client rate limit, because one GPU serves every listener
* the response headers a browser needs to be told to distrust everything else

None of it activates until QUICKVOICE_API_KEY is set, so local development is
untouched.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import threading
import time

# Tokens are deliberately short-lived: one leaking out of a browser tab, a
# screenshot or a shared link stops working within the hour rather than
# granting somebody the GPU forever.
TOKEN_TTL_SECONDS = int(os.getenv("QUICKVOICE_TOKEN_TTL_SECONDS", "3600"))


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def mint_token(secret: str, ttl_seconds: int = TOKEN_TTL_SECONDS) -> tuple[str, int]:
    """Issue a token that proves the holder knew the master key, until it expires.

    Returns (token, unix_expiry). The token carries its own expiry and a random
    id, and is signed with the master key -- there is no server-side session to
    keep, which means it survives a restart and costs no memory.
    """
    expires_at = int(time.time()) + max(60, ttl_seconds)
    payload = f"{expires_at}.{_b64(secrets.token_bytes(9))}"
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest()
    return f"{payload}.{_b64(signature)}", expires_at


def verify_token(secret: str, token: str) -> bool:
    """True only for a token this server signed and that has not expired."""
    try:
        expires_raw, nonce, signature = token.split(".", 2)
        expected = hmac.new(
            secret.encode(), f"{expires_raw}.{nonce}".encode(), hashlib.sha256
        ).digest()
        # compare_digest, not ==, so a wrong signature cannot be discovered one
        # byte at a time by timing the failures.
        if not hmac.compare_digest(_unb64(signature), expected):
            return False
        return int(expires_raw) > int(time.time())
    except Exception:
        return False


class RateLimiter:
    """A token bucket per client.

    The point is not to be fair, it is to stop one caller monopolising the only
    Whisper worker. Bursts are allowed because real speech is bursty; sustained
    hammering is not.
    """

    def __init__(self, per_minute: int, burst: int) -> None:
        self.rate = per_minute / 60.0
        self.burst = float(burst)
        self._buckets: dict[str, tuple[float, float]] = {}
        self._lock = threading.Lock()

    def allow(self, client: str) -> bool:
        now = time.monotonic()
        with self._lock:
            tokens, last = self._buckets.get(client, (self.burst, now))
            tokens = min(self.burst, tokens + (now - last) * self.rate)
            if tokens < 1.0:
                self._buckets[client] = (tokens, now)
                return False
            self._buckets[client] = (tokens - 1.0, now)
            # Drop idle callers so a long uptime cannot grow this without bound.
            if len(self._buckets) > 4096:
                cutoff = now - 3600
                for key, (_, seen) in list(self._buckets.items()):
                    if seen < cutoff:
                        self._buckets.pop(key, None)
            return True


# Sent on every response. The server returns JSON and audio, never HTML, so it
# can afford to forbid essentially everything.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), interest-cohort=()",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    # Only meaningful over TLS, which is how this is reached once it is shared.
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}
