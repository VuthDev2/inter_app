const cfg = globalThis.QUICKVOICE_CONFIG;
const $ = (id) => document.getElementById(id);

const els = {
  openWeb: $("openWeb"),
  openApp: $("openApp"),
  openInterpreter: $("openInterpreter"),
  openRecorder: $("openRecorder"),
  openHistory: $("openHistory"),
  openSettings: $("openSettings"),
  readSelection: $("readSelection"),
  accountStatus: $("accountStatus"),
  sourceText: $("sourceText"),
  sourceLang: $("sourceLang"),
  targetLang: $("targetLang"),
  translateBtn: $("translateBtn"),
  translateStatus: $("translateStatus"),
  translationResult: $("translationResult"),
  recordBtn: $("recordBtn"),
  stopBtn: $("stopBtn"),
  speechLang: $("speechLang"),
  recordStatus: $("recordStatus"),
  transcriptionResult: $("transcriptionResult")
};

function setStatus(node, message, kind = "") {
  node.textContent = message;
  node.className = `status ${kind}`.trim();
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function renderAccount() {
  const { quickvoiceSession } = await chrome.storage.local.get("quickvoiceSession");
  const email = quickvoiceSession?.user?.email;
  setStatus(els.accountStatus, email ? `Signed in as ${email}` : "Not signed in");
}

async function useSelectedText() {
  const tab = await activeTab();
  if (!tab?.id) {
    setStatus(els.translateStatus, "No active tab found.", "error");
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "QV_GET_SELECTION" });
    if (response?.text) {
      els.sourceText.value = response.text;
      setStatus(els.translateStatus, "Selection loaded.", "ok");
      return;
    }
    setStatus(els.translateStatus, "No selected text on this page.", "error");
  } catch {
    setStatus(els.translateStatus, "Refresh the page, then select text again.", "error");
  }
}

async function translate(text, source, target) {
  const res = await QuickVoiceServer.apiFetch("/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source, target })
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("QuickVoice server rejected the token. Check the website address in the popup.");
  if (res.status === 422) throw new Error(data.detail || "That language pair is not supported.");
  if (!res.ok || !data.text) throw new Error(data.detail || data.error || "Translation failed");
  return data.text;
}

async function translateCurrentText() {
  const text = els.sourceText.value.trim();
  if (!text) {
    setStatus(els.translateStatus, "Add text or load a page selection first.", "error");
    return;
  }
  els.translateBtn.disabled = true;
  setStatus(els.translateStatus, "Translating...");
  try {
    const translated = await translate(text, els.sourceLang.value, els.targetLang.value);
    els.translationResult.textContent = translated;
    setStatus(els.translateStatus, "Done.", "ok");
  } catch (err) {
    setStatus(els.translateStatus, err.message || "Translation failed.", "error");
  } finally {
    els.translateBtn.disabled = false;
  }
}

function encodeSessionHandoff(session) {
  if (!session?.accessToken || !session?.refreshToken) return "";
  return btoa(JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt
  }));
}

async function openWebPath(path) {
  const { quickvoiceSession } = await chrome.storage.local.get("quickvoiceSession");
  const handoff = encodeSessionHandoff(quickvoiceSession);
  const hash = handoff ? `#quickvoice_session=${encodeURIComponent(handoff)}` : "";
  chrome.tabs.create({ url: `${cfg.webUrl}${path}${hash}` });
}

els.openWeb.addEventListener("click", () => openWebPath("/dashboard"));
els.openApp.addEventListener("click", () => chrome.tabs.create({ url: cfg.appUrl }));
els.openInterpreter.addEventListener("click", () => openWebPath("/interpreter"));
els.openRecorder.addEventListener("click", () => openWebPath("/prerecord"));
els.openHistory.addEventListener("click", () => openWebPath("/history"));
els.openSettings.addEventListener("click", () => openWebPath("/setting"));
els.readSelection.addEventListener("click", useSelectedText);
els.translateBtn.addEventListener("click", translateCurrentText);
els.recordBtn.addEventListener("click", () => {
  openWebPath("/prerecord");
  setStatus(els.recordStatus, "Opened QuickVoice web recorder. Allow microphone permission there.", "ok");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "QV_SELECTION_TRANSLATED") {
    els.sourceText.value = message.original || "";
    els.translationResult.textContent = message.translated || "";
    setStatus(els.translateStatus, "Translated selected text.", "ok");
  }
});

renderAccount();
