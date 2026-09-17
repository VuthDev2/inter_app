importScripts("config.js", "server.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quickvoice-translate-selection",
    title: "Translate selection with QuickVoice",
    contexts: ["selection"]
  });
});

chrome.action.onClicked?.addListener(async (tab) => {
  if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "quickvoice-translate-selection" || !info.selectionText || !tab?.id) return;
  try {
    const translated = await translate(info.selectionText, "en", "ja");
    await chrome.tabs.sendMessage(tab.id, {
      type: "QV_SHOW_TRANSLATION",
      original: info.selectionText,
      translated
    });
    chrome.runtime.sendMessage({
      type: "QV_SELECTION_TRANSLATED",
      original: info.selectionText,
      translated
    }).catch(() => {});
  } catch (err) {
    await chrome.tabs.sendMessage(tab.id, {
      type: "QV_SHOW_TRANSLATION",
      original: info.selectionText,
      translated: err.message || "Translation failed"
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "QV_TRANSLATE") {
    translate(message.text, message.source || "en", message.target || "ja")
      .then((translated) => sendResponse({ ok: true, translated }))
      .catch((err) => sendResponse({ ok: false, error: err.message || "Translation failed" }));
    return true;
  }
  return false;
});

async function translate(text, source, target) {
  // Address and credential both come from the website -- see src/server.js.
  const res = await QuickVoiceServer.apiFetch("/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source, target })
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("QuickVoice server rejected the token. Check the website address in the popup.");
  // The server names the languages it supports; pass that through rather than
  // flattening it to "Translation failed", which is what sent someone hunting
  // for a bug when the real answer was that the model is English<->Japanese.
  if (res.status === 422) throw new Error(data.detail || "That language pair is not supported.");
  if (!res.ok || !data.text) throw new Error(data.detail || data.error || "Translation failed");
  return data.text;
}
