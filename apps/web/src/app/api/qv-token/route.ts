import { NextResponse } from "next/server";

/**
 * Hand the browser a short-lived QuickVoice token.
 *
 * The master key stays in this server process. Previously the page carried
 * NEXT_PUBLIC_QUICKVOICE_API_KEY, which meant the key was in the JavaScript
 * bundle and permanent: anyone who opened devtools on the shared link had
 * unlimited access to the model server forever. A token expires on its own.
 */
export const dynamic = "force-dynamic";

// Reached server-to-server, so it uses the local port rather than the tunnel.
const AI_INTERNAL_URL = (
  process.env.QUICKVOICE_AI_INTERNAL_URL || "http://localhost:8000"
).replace(/\/$/, "");

/** Public address of the model server, read fresh on every request so a new
 *  tunnel only needs a restart, never a rebuild. */
function aiBaseUrl(): string {
  return (
    process.env.QUICKVOICE_AI_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_AI_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function POST() {
  const key = (process.env.QUICKVOICE_API_KEY || "").trim();
  if (!key) {
    // No key configured means the model server is unauthenticated too, which
    // is the normal local-development case. Say so plainly rather than 500.
    return NextResponse.json({ token: null, unauthenticated: true, aiBaseUrl: aiBaseUrl() });
  }

  try {
    const response = await fetch(`${AI_INTERNAL_URL}/auth/token`, {
      method: "POST",
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not obtain a QuickVoice token." },
        { status: 502 },
      );
    }
    const body = await response.json();
    return NextResponse.json(
      { token: body.token, expiresAt: body.expiresAt, aiBaseUrl: aiBaseUrl() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "QuickVoice server is unreachable." },
      { status: 502 },
    );
  }
}
