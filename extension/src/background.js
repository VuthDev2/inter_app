importScripts("config.js");

const cfg = globalThis.QUICKVOICE_CONFIG;

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
    const translated = await translate(info.selectionText, "en", "km");
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
    translate(message.text, message.source || "en", message.target || "km")
      .then((translated) => sendResponse({ ok: true, translated }))
      .catch((err) => sendResponse({ ok: false, error: err.message || "Translation failed" }));
    return true;
  }
  return false;
});

async function authHeaders() {
  const { quickvoiceSession } = await chrome.storage.local.get("quickvoiceSession");
  const headers = { "Content-Type": "application/json" };
  if (quickvoiceSession?.accessToken) {
    headers.Authorization = `Bearer ${quickvoiceSession.accessToken}`;
  }
  return headers;
}

async function translate(text, source, target) {
  const res = await fetch(`${cfg.apiBaseUrl}/translate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ text, source, target })
  });
  const data = await res.json();
  if (res.status === 401) throw new Error("Sign in to QuickVoice first.");
  if (!res.ok || !data.text) throw new Error(data.error || "Translation failed");
  return data.text;
}
