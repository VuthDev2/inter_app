export async function translate(text, source, target) {
  if (!text?.trim() || source === target) return text;

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.trim());
  url.searchParams.set("langpair", `${source}|${target}`);

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return "";

    const data = await resp.json();
    const t = data?.responseData?.translatedText;
    if (t && !t.toUpperCase().includes("MYMEMORY WARNING")) return t;
  } catch {
    // fall through
  }

  return "";
}
