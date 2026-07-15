import httpx


async def translate(text: str, source: str, target: str) -> str:
    if not text.strip() or source == target:
        return text

    try:
        url = "https://api.mymemory.translated.net/get"
        params = {"q": text.strip(), "langpair": f"{source}|{target}"}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            if resp.is_success:
                data = resp.json()
                t = data.get("responseData", {}).get("translatedText", "")
                if t and "MYMEMORY WARNING" not in t.upper():
                    return t
    except Exception:
        pass

    return ""
