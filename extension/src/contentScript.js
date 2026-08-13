chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "QV_GET_SELECTION") {
    sendResponse({ text: window.getSelection()?.toString().trim() || "" });
    return false;
  }
  if (message?.type === "QV_SHOW_TRANSLATION") {
    showTranslation(message.original, message.translated);
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

function showTranslation(original, translated) {
  document.getElementById("quickvoice-translation-popover")?.remove();

  const popover = document.createElement("div");
  popover.id = "quickvoice-translation-popover";
  popover.style.cssText = [
    "position:fixed",
    "right:18px",
    "bottom:18px",
    "z-index:2147483647",
    "width:min(360px,calc(100vw - 36px))",
    "background:#ffffff",
    "color:#172033",
    "border:1px solid #dce3ee",
    "border-radius:8px",
    "box-shadow:0 14px 34px rgba(15,23,42,.24)",
    "font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "padding:12px"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "QuickVoice Translation";
  title.style.cssText = "font-size:13px;font-weight:700;margin-bottom:8px;color:#315fbd;";

  const source = document.createElement("div");
  source.textContent = original || "";
  source.style.cssText = "font-size:12px;color:#6b7280;line-height:1.4;margin-bottom:8px;max-height:70px;overflow:auto;";

  const result = document.createElement("div");
  result.textContent = translated || "";
  result.style.cssText = "font-size:14px;line-height:1.45;white-space:pre-wrap;";

  const close = document.createElement("button");
  close.textContent = "Close";
  close.style.cssText = "margin-top:10px;border:0;border-radius:7px;background:#315fbd;color:white;min-height:32px;padding:6px 10px;cursor:pointer;";
  close.addEventListener("click", () => popover.remove());

  popover.append(title, source, result, close);
  document.documentElement.appendChild(popover);
}
