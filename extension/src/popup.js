const cfg = globalThis.QUICKVOICE_CONFIG;
const els = {
  backendStatus: document.getElementById("backendStatus"),
  authTitle: document.getElementById("authTitle"),
  openWeb: document.getElementById("openWeb"),
  openApp: document.getElementById("openApp"),
  openPanel: document.getElementById("openPanel"),
  sessionText: document.getElementById("sessionText"),
  signOutBtn: document.getElementById("signOutBtn"),
  authCard: document.getElementById("authCard"),
  signinTab: document.getElementById("signinTab"),
  signupTab: document.getElementById("signupTab"),
  nameWrap: document.getElementById("nameWrap"),
  displayName: document.getElementById("displayName"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  authSubmit: document.getElementById("authSubmit"),
  googleLogin: document.getElementById("googleLogin"),
  authStatus: document.getElementById("authStatus")
};

let mode = "signin";

function setStatus(node, message, kind = "") {
  node.textContent = message;
  node.className = `status ${kind}`.trim();
}

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  els.signinTab.classList.toggle("active", !signingUp);
  els.signupTab.classList.toggle("active", signingUp);
  els.nameWrap.classList.toggle("hidden", !signingUp);
  els.authTitle.textContent = signingUp ? "Create Account" : "Welcome Back!";
  els.authSubmit.textContent = signingUp ? "Create Account" : "Continue";
  els.password.autocomplete = signingUp ? "new-password" : "current-password";
  setStatus(els.authStatus, "");
}

async function getStoredSession() {
  const { quickvoiceSession } = await chrome.storage.local.get("quickvoiceSession");
  return quickvoiceSession || null;
}

async function saveSession(session) {
  await chrome.storage.local.set({ quickvoiceSession: session });
  await renderSession();
}

async function renderSession() {
  const session = await getStoredSession();
  const email = session?.user?.email;
  els.sessionText.textContent = email ? `Signed in as ${email}` : "Not signed in";
  els.signOutBtn.classList.toggle("hidden", !email);
}

async function checkBackend() {
  try {
    const res = await fetch(`${cfg.apiBaseUrl}/health`);
    const data = await res.json();
    if (res.ok && data.ok) {
      els.backendStatus.textContent = "Backend connected";
      els.backendStatus.style.color = "var(--ok)";
      return;
    }
    throw new Error("Backend health check failed");
  } catch {
    els.backendStatus.textContent = "Backend offline";
    els.backendStatus.style.color = "var(--danger)";
  }
}

async function signIn(email, password) {
  const url = `${cfg.supabaseUrl}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    const raw = data.error_description || data.msg || data.error || "Invalid login credentials";
    const invalid = raw.toLowerCase().includes("invalid login credentials");
    throw new Error(
      invalid
        ? "Invalid email or QuickVoice password. Gmail app passwords and Google-only accounts will not work here; reset your QuickVoice password if needed."
        : raw
    );
  }
  await saveSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    user: data.user
  });
}

async function signUp(email, password, displayName) {
  const res = await fetch(`${cfg.supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      data: { display_name: displayName || email.split("@")[0] }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.error || "Failed to create account");
  }
  if (data.access_token && data.refresh_token) {
    await saveSession({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      user: data.user
    });
    return true;
  }
  return false;
}

function encodeSessionHandoff(session) {
  if (!session?.accessToken || !session?.refreshToken) return "";
  return btoa(JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt
  }));
}

async function openWebPath(path = "") {
  const session = await getStoredSession();
  const handoff = encodeSessionHandoff(session);
  const hash = handoff ? `#quickvoice_session=${encodeURIComponent(handoff)}` : "";
  chrome.tabs.create({ url: `${cfg.webUrl}${path}${hash}` });
}

els.openWeb.addEventListener("click", () => openWebPath("/dashboard"));
els.openApp.addEventListener("click", () => chrome.tabs.create({ url: cfg.appUrl }));
els.openPanel.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
});
els.googleLogin.addEventListener("click", () => chrome.tabs.create({ url: `${cfg.webUrl}/login` }));
document.getElementById("forgotPassword").addEventListener("click", () => {
  chrome.tabs.create({ url: `${cfg.webUrl}/forgotpassword` });
});
els.signinTab.addEventListener("click", () => setMode("signin"));
els.signupTab.addEventListener("click", () => setMode("signup"));
els.signOutBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("quickvoiceSession");
  await renderSession();
});

els.authSubmit.addEventListener("click", async () => {
  const email = els.email.value.trim().toLowerCase();
  const password = els.password.value;
  const displayName = els.displayName.value.trim();

  if (!email || !password) {
    setStatus(els.authStatus, "Enter email and password.", "error");
    return;
  }
  if (mode === "signup" && !displayName) {
    setStatus(els.authStatus, "Enter your display name.", "error");
    return;
  }

  els.authSubmit.disabled = true;
  setStatus(els.authStatus, mode === "signup" ? "Creating account..." : "Signing in...");
  try {
    if (mode === "signup") {
      const signedIn = await signUp(email, password, displayName);
      setStatus(
        els.authStatus,
        signedIn ? "Account created and signed in." : "Account created. Check your email to confirm it.",
        "ok"
      );
    } else {
      await signIn(email, password);
      setStatus(els.authStatus, "Signed in.", "ok");
    }
  } catch (err) {
    setStatus(els.authStatus, err.message || "Authentication failed.", "error");
  } finally {
    els.authSubmit.disabled = false;
  }
});

checkBackend();
renderSession();
