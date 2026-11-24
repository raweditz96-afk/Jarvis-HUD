/* J.A.R.V.I.S — Mark-VII HUD, JarvisAudio FX, Live Visualizer, Guest Pass, Gmail & Contacts */
"use strict";

/* =========================================================
   0A. Temporary Guest Pass Gate (?expires=... or ?guest=1)
   ========================================================= */
(function checkGuestPass() {
  const params = new URLSearchParams(window.location.search);
  const expiresAt = Number(params.get("expires"));
  if (expiresAt && Date.now() > expiresAt) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML = `
        <div style="display:flex;height:100vh;align-items:center;justify-content:center;background:#02090e;color:#00d8ff;font-family:monospace;text-align:center;padding:24px;">
          <div>
            <h2 style="letter-spacing:4px;">ACCESS EXPIRED</h2>
            <p style="color:#4b9cb3;">Temporary J.A.R.V.I.S. tactical pass has terminated.</p>
          </div>
        </div>`;
    });
    throw new Error("Guest pass expired");
  }
})();

const $ = (selector) => document.querySelector(selector);
const statusEl = $("#status");
const voiceStatusEl = $("#voiceStatus");
const core = $("#core");

/* =========================================================
   0B. Register PWA Service Worker & Boot Sequence
   ========================================================= */
if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.requestAnimationFrame(() => {
  window.setTimeout(() => document.body.classList.remove("booting"), 120);
});

/* =========================================================
   1. Synthesized Sci-Fi Audio FX (JarvisAudio Engine)
   ========================================================= */
class JarvisAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playHudClick() {
    if (this.muted || document.body.classList.contains("stealth-mode")) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playMicEngage() {
    if (this.muted || document.body.classList.contains("stealth-mode")) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [587.33, 880].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + i * 0.07;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.17);
    });
  }

  playThemeSwitch(toTerminal = true) {
    if (this.muted || document.body.classList.contains("stealth-mode")) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = toTerminal ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(toTerminal ? 900 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(toTerminal ? 180 : 880, now + 0.25);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.27);
  }

  playBootSequence() {
    if (this.muted || document.body.classList.contains("stealth-mode")) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [110, 164.81, 220].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.95);
    });
  }
}

const sfx = new JarvisAudio();

function playHudSound(type) {
  if (type === "activate") sfx.playMicEngage();
  else if (type === "override") sfx.playThemeSwitch(true);
  else if (type === "scan") sfx.playBootSequence();
  else sfx.playHudClick();
}

/* =========================================================
   1B. Live Canvas Audio Frequency Visualizer
   ========================================================= */
const visCanvas = $("#audioVisualizer");
const visCtx = visCanvas ? visCanvas.getContext("2d") : null;
let visPhase = 0;

function renderVisualizerFrame() {
  if (!visCtx || !visCanvas) return;
  const w = visCanvas.width;
  const h = visCanvas.height;
  visCtx.clearRect(0, 0, w, h);

  const isListeningNow = core.classList.contains("listening");
  const isSpeakingNow = core.classList.contains("speaking");
  const isScanningNow = core.classList.contains("scanning");
  const active = isListeningNow || isSpeakingNow || isScanningNow;

  const primaryColor = getComputedStyle(document.body).getPropertyValue("--primary").trim() || "#00d8ff";
  const barCount = 24;
  const gap = 4;
  const barWidth = (w - gap * (barCount - 1)) / barCount;

  visPhase += active ? 0.22 : 0.04;

  for (let i = 0; i < barCount; i++) {
    const distFromCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
    const envelope = 1 - distFromCenter * 0.72;
    const wave = active
      ? Math.abs(Math.sin(visPhase + i * 0.55) * Math.cos(visPhase * 0.7 - i * 0.3))
      : 0.08 + 0.05 * Math.sin(visPhase + i * 0.4);

    const barHeight = Math.max(3, Math.round((h - 4) * wave * envelope));
    const x = i * (barWidth + gap);
    const y = (h - barHeight) / 2;

    visCtx.fillStyle = primaryColor;
    visCtx.globalAlpha = active ? 0.35 + 0.65 * envelope : 0.24;
    visCtx.fillRect(x, y, barWidth, barHeight);
  }
  visCtx.globalAlpha = 1;

  if (!document.hidden) {
    window.requestAnimationFrame(renderVisualizerFrame);
  }
}

if (visCtx) {
  window.requestAnimationFrame(renderVisualizerFrame);
}

/* =========================================================
   2. Theme, Hacker Override & Stealth Mode Controller
   ========================================================= */
let hackStreamTimer = null;

const HACK_SNIPPETS = [
  "[OK] BYPASSING PERIMETER FIREWALL :: PORT 443 OPEN",
  "[SYS] INJECTING KERNEL HOOK -> 0x7FFE0380",
  "[NET] INTERCEPTING ENCRYPTED TELEMETRY STREAM...",
  "[SEC] ROOT PRIVILEGE ESCALATION VERIFIED [UID=0]",
  "[MEM] DECRYPTING SECTOR 0x00A4F9... 100% COMPLETE",
  "[HUD] NEURAL VOICE SYNTHESIS LOCKED TO OVERRIDE"
];

function startHackStream() {
  const logsEl = $("#hackLogs");
  if (!logsEl || hackStreamTimer) return;
  let idx = 0;
  const lines = [];
  const pushLine = () => {
    const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
    lines.push(`0x${hex} ${HACK_SNIPPETS[idx % HACK_SNIPPETS.length]}`);
    if (lines.length > 4) lines.shift();
    logsEl.textContent = lines.join("\n");
    idx++;
  };
  pushLine();
  hackStreamTimer = window.setInterval(pushLine, 1600);
}

function stopHackStream() {
  if (hackStreamTimer) {
    window.clearInterval(hackStreamTimer);
    hackStreamTimer = null;
  }
}

function applyNormalUI() {
  localStorage.removeItem("jarvisTheme");
  document.body.classList.remove("hack-mode", "stealth-mode");
  stopHackStream();
  if ($("#modeBadge")) $("#modeBadge").textContent = "MARK-VII // STANDBY";
  if ($("#hudTitle")) $("#hudTitle").textContent = "J.A.R.V.I.S";
  if ($("#coreLabel")) $("#coreLabel").textContent = "J.A.R.V.I.S";
  if ($("#panelTitle")) $("#panelTitle").textContent = "COMMUNICATION LOG";
  if ($("#userPrompt")) $("#userPrompt").textContent = "USR >";
  if ($("#sysPrompt")) $("#sysPrompt").textContent = "SYS >";
  if ($("#footerText")) $("#footerText").textContent = "STARK INDUSTRIES // MARK-VII TACTICAL INTERFACE";
}

function applyHackUI() {
  document.body.classList.remove("stealth-mode");
  document.body.classList.add("hack-mode");
  if ($("#modeBadge")) $("#modeBadge").textContent = "OVERRIDE // ROOT_11062010";
  if ($("#hudTitle")) $("#hudTitle").textContent = "J.A.R.V.I.S // ROOT";
  if ($("#coreLabel")) $("#coreLabel").textContent = "OVERRIDE";
  if ($("#panelTitle")) $("#panelTitle").textContent = "ENCRYPTED SHELL";
  if ($("#userPrompt")) $("#userPrompt").textContent = "root@usr:~#";
  if ($("#sysPrompt")) $("#sysPrompt").textContent = "root@sys:~#";
  if ($("#footerText")) $("#footerText").textContent = "BREACH PROTOCOL ACTIVE // UNRESTRICTED ACCESS";
  startHackStream();
}

applyNormalUI();
window.addEventListener("pageshow", applyNormalUI);

/* =========================================================
   3. Haptics, Screen Wake Lock, Tilt Parallax & Top Telemetry
   ========================================================= */
function vibrate(pattern) {
  if ("vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

let wakeLock = null;

async function enableWakeLock() {
  if (!("wakeLock" in navigator) || document.hidden || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

let tiltPending = false;
window.addEventListener("deviceorientation", (event) => {
  if (document.hidden || tiltPending || event.gamma === null || event.beta === null) return;
  tiltPending = true;
  window.requestAnimationFrame(() => {
    const x = Math.max(-6, Math.min(6, event.gamma * 0.14));
    const y = Math.max(-6, Math.min(6, (event.beta - 45) * 0.14));
    core.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    tiltPending = false;
  });
}, { passive: true });

function updateNetworkBadge() {
  const netEl = $("#netStatus");
  if (netEl) netEl.textContent = navigator.onLine ? "NET: ONLINE" : "NET: OFFLINE";
}
updateNetworkBadge();
window.addEventListener("online", updateNetworkBadge);
window.addEventListener("offline", updateNetworkBadge);

function updateGoogleBadge() {
  const glinkEl = $("#glinkStatus");
  if (!glinkEl) return;
  const active = hasValidGoogleToken();
  glinkEl.textContent = active ? "G-LINK: ON" : "G-LINK: OFF";
  glinkEl.classList.toggle("online", active);
}

let lowBatteryWarned = false;
async function initTelemetryBattery() {
  const battEl = $("#battStatus");
  if (!battEl || !("getBattery" in navigator)) return;
  try {
    const battery = await navigator.getBattery();
    const syncBatt = () => {
      const pct = Math.round(battery.level * 100);
      battEl.textContent = `PWR: ${pct}%${battery.charging ? "+" : ""}`;
      if (!battery.charging && pct <= 15 && !lowBatteryWarned) {
        lowBatteryWarned = true;
        speak(`Warning, sir. Arc reactor power reserves critical at ${pct} percent.`);
      }
    };
    syncBatt();
    battery.addEventListener("levelchange", syncBatt);
    battery.addEventListener("chargingchange", syncBatt);
  } catch {}
}
initTelemetryBattery();

/* =========================================================
   4. Clock, Countdown Timer & Lifecycle Management
   ========================================================= */
let clockTimer = null;
let countdownTimer = null;

function updateClock() {
  const clockEl = $("#clock");
  if (clockEl) clockEl.textContent = new Date().toLocaleTimeString();
}

function startClock() {
  updateClock();
  if (!clockTimer) clockTimer = window.setInterval(updateClock, 1000);
}

function stopClock() {
  if (clockTimer) {
    window.clearInterval(clockTimer);
    clockTimer = null;
  }
}

startClock();

function startCountdown(seconds) {
  const displayEl = $("#countdownDisplay");
  if (!displayEl) return;
  window.clearInterval(countdownTimer);
  let remaining = seconds;

  const render = () => {
    const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
    const secs = String(remaining % 60).padStart(2, "0");
    displayEl.textContent = `T-MINUS // ${mins}:${secs}`;
    displayEl.classList.add("active");
  };

  render();
  countdownTimer = window.setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      displayEl.textContent = "T-MINUS // 00:00 [COMPLETE]";
      sfx.playBootSequence();
      vibrate([120, 60, 120, 60, 180]);
      speak("Timer complete, sir.");
      window.setTimeout(() => displayEl.classList.remove("active"), 4000);
    } else {
      render();
    }
  }, 1000);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopClock();
    stopHackStream();
    releaseWakeLock();
    document.body.classList.add("paused");
  } else {
    document.body.classList.remove("paused");
    startClock();
    if (visCtx) window.requestAnimationFrame(renderVisualizerFrame);
    if (document.body.classList.contains("hack-mode")) startHackStream();
  }
});

window.addEventListener("pagehide", () => {
  stopClock();
  stopHackStream();
  window.clearInterval(countdownTimer);
  releaseWakeLock();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
});

/* =========================================================
   5. Speech Synthesis (Android Chrome Deadlock Safe)
   ========================================================= */
let speakTimer = null;

function speak(message, onDone) {
  const responseEl = $("#response");
  if (responseEl) responseEl.textContent = message;

  const logHistory = $("#logHistory");
  if (logHistory) logHistory.scrollTop = logHistory.scrollHeight;

  if (!("speechSynthesis" in window)) {
    if (onDone) onDone();
    return;
  }

  window.clearTimeout(speakTimer);
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-US";
  utterance.rate = 0.88;
  utterance.pitch = 0.72;
  utterance.volume = document.body.classList.contains("stealth-mode") ? 0.35 : 1;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) =>
    /david|daniel|george|mark|male/i.test(voice.name) &&
    voice.lang.toLowerCase().startsWith("en")
  );
  if (preferredVoice) utterance.voice = preferredVoice;

  let finished = false;
  const finishSpeech = () => {
    if (finished) return;
    finished = true;
    core.classList.remove("speaking");
    if (onDone) onDone();
  };

  utterance.onstart = () => core.classList.add("speaking");
  utterance.onend = finishSpeech;
  utterance.onerror = finishSpeech;

  speakTimer = window.setTimeout(() => {
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finishSpeech();
    }
  }, 80);
}

function speakThenOpen(message, url) {
  speak(message, () => {
    window.setTimeout(() => {
      window.location.href = url;
    }, 1800);
  });
}

function openApp(message, intentUrl) {
  speakThenOpen(message, intentUrl);
}

/* =========================================================
   6. Safe Fetch Helper with AbortController Timeout
   ========================================================= */
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timerId);
  }
}

/* =========================================================
   7. Google OAuth 2.0 Integration (Live Gmail & Google Contacts)
   ========================================================= */
let googleAccessToken = null;
let googleTokenExpiry = 0;

function hasValidGoogleToken() {
  return Boolean(googleAccessToken && Date.now() < googleTokenExpiry);
}

function connectGoogleAccount() {
  const clientId = localStorage.getItem("jarvisGoogleClientId");
  if (!clientId) {
    const entered = window.prompt("Paste your Google Cloud OAuth 2.0 Web Client ID:");
    if (entered && entered.trim()) {
      localStorage.setItem("jarvisGoogleClientId", entered.trim());
    } else {
      speak("Google Client ID setup cancelled, sir.");
      return;
    }
  }

  if (!window.google || !google.accounts || !google.accounts.oauth2) {
    speak("Google Identity library is still loading or you are offline, sir.");
    return;
  }

  const savedId = localStorage.getItem("jarvisGoogleClientId");
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: savedId,
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly",
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        googleAccessToken = tokenResponse.access_token;
        googleTokenExpiry = Date.now() + (Number(tokenResponse.expires_in || 3500) * 1000);
        updateGoogleBadge();
        sfx.playMicEngage();
        speak("Google account uplink established, sir. Gmail and Contacts telemetry are now online.");
      } else {
        speak("Google authorization was not granted, sir.");
      }
    }
  });

  tokenClient.requestAccessToken({ prompt: "consent" });
}

async function readUnreadEmails() {
  if (!hasValidGoogleToken()) {
    updateGoogleBadge();
    speak("Google uplink not active, sir. Say 'connect google account' first, or say 'open gmail'.");
    return;
  }

  statusEl.textContent = "● SCANNING GMAIL...";
  try {
    const listRes = await fetchWithTimeout(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3",
      { headers: { Authorization: `Bearer ${googleAccessToken}` } },
      5500
    );
    if (!listRes.ok) throw new Error("Gmail HTTP " + listRes.status);

    const listData = await listRes.json();
    const messages = listData.messages || [];
    if (!messages.length) {
      speak("You have zero unread messages in your inbox, sir.");
      return;
    }

    const summaries = [];
    for (const msg of messages) {
      const detailRes = await fetchWithTimeout(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${googleAccessToken}` } },
        4500
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        const fromRaw = headers.find((h) => h.name === "From")?.value || "Unknown sender";
        const sender = fromRaw.replace(/<[^>]+>/g, "").replace(/"/g, "").trim();
        const subject = headers.find((h) => h.name === "Subject")?.value || "No subject";
        summaries.push(`From ${sender} about ${subject}`);
      }
    }

    speak(`You have ${messages.length} recent unread emails, sir. ${summaries.join(". ")}.`);
  } catch {
    speak("Unable to retrieve Gmail messages right now, sir. Try saying 'connect google account' to refresh permissions.");
  } finally {
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  }
}

async function lookupGoogleContact(queryName) {
  const cleanName = queryName.trim();
  if (!cleanName) {
    speak("Which contact should I search for, sir?");
    return null;
  }

  const mem = getMemory();
  const localContacts = mem.contacts || {};
  const localKey = Object.keys(localContacts).find((k) => k.toLowerCase().includes(cleanName.toLowerCase()));
  if (localKey) {
    return localContacts[localKey];
  }

  if (!hasValidGoogleToken()) {
    updateGoogleBadge();
    speak("Google Contacts uplink is not connected, sir. Say 'connect google account' or 'pick phone contact'.");
    return null;
  }

  statusEl.textContent = "● SEARCHING CONTACTS...";
  try {
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(cleanName)}&readMask=names,phoneNumbers,emailAddresses`;
    const res = await fetchWithTimeout(
      url,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } },
      5000
    );
    if (!res.ok) throw new Error("People HTTP " + res.status);

    const data = await res.json();
    const person = data.results?.[0]?.person;
    if (!person) {
      speak(`No contact matching ${cleanName} was found, sir.`);
      return null;
    }

    const displayName = person.names?.[0]?.displayName || cleanName;
    const phone = person.phoneNumbers?.[0]?.value || "";
    const email = person.emailAddresses?.[0]?.value || "";

    mem.contacts = mem.contacts || {};
    mem.contacts[displayName] = { name: displayName, phone, email };
    saveMemory(mem);

    return mem.contacts[displayName];
  } catch {
    speak("Unable to search Google Contacts right now, sir.");
    return null;
  } finally {
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  }
}

async function pickNativePhoneContact() {
  if (!("contacts" in navigator && "ContactsManager" in window)) {
    speak("Native contact picker is not supported on this browser, sir. Say 'connect google account' to sync Google Contacts.");
    return;
  }
  try {
    const selected = await navigator.contacts.select(["name", "tel", "email"], { multiple: false });
    if (!selected || !selected.length) {
      speak("Contact selection cancelled.");
      return;
    }
    const c = selected[0];
    const name = c.name?.[0] || "Saved Contact";
    const phone = c.tel?.[0] || "";
    const email = c.email?.[0] || "";

    const mem = getMemory();
    mem.contacts = mem.contacts || {};
    mem.contacts[name] = { name, phone, email };
    saveMemory(mem);

    speak(`Saved ${name} to tactical contacts, sir. You can now say 'call ${name}' or 'WhatsApp ${name}'.`);
  } catch {
    speak("Unable to open phone contacts right now.");
  }
}

/* =========================================================
   8. Fictional Stark Protocols (Diagnostics & Perimeter Scan)
   ========================================================= */
async function runDiagnosticsProtocol() {
  sfx.playBootSequence();
  core.classList.add("scanning");
  statusEl.textContent = "● RUNNING DIAGNOSTICS...";

  let battText = "nominal";
  if ("getBattery" in navigator) {
    try {
      const b = await navigator.getBattery();
      battText = `at ${Math.round(b.level * 100)} percent`;
    } catch {}
  }

  const netText = navigator.onLine ? "online with zero packet loss" : "currently offline";
  const googleLink = hasValidGoogleToken() ? "authenticated" : "standby";
  const mem = getMemory();
  const noteCount = (mem.notes || []).length;

  window.setTimeout(() => {
    core.classList.remove("scanning");
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
    speak(`Full system diagnostics complete, sir. Arc reactor output is ${battText}. Satellite uplink is ${netText}. Google workspace link is ${googleLink}. Memory banks hold ${noteCount} records.`);
  }, 1600);
}

async function runPerimeterScan() {
  sfx.playBootSequence();
  core.classList.add("scanning");
  statusEl.textContent = "● SCANNING PERIMETER...";

  try {
    const coords = await getDeviceCoordinates();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,wind_speed_10m`;
    const res = await fetchWithTimeout(url, {}, 4000);
    const data = res.ok ? await res.json() : null;
    const tempNote = data ? ` Ambient temperature is ${Math.round(data.current.temperature_2m)} degrees Celsius with ${describeWeatherCode(data.current.weather_code)}.` : "";
    const coordText = coords.fallback
      ? "Sector Bengaluru"
      : `latitude ${coords.lat.toFixed(2)}, longitude ${coords.lon.toFixed(2)}`;

    speak(`Perimeter scan complete across ${coordText}.${tempNote} Zero unauthorized intrusions detected, sir.`);
  } catch {
    speak("Local perimeter secure, sir. Long-range satellite telemetry is temporarily unavailable.");
  } finally {
    core.classList.remove("scanning");
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  }
}

/* =========================================================
   9. Battery, Open-Meteo Weather, Wikipedia & Direct Gemini AI
   ========================================================= */
async function checkBatteryStatus() {
  if (!("getBattery" in navigator)) {
    speak("Battery telemetry is not supported on this browser, sir.");
    return;
  }
  try {
    const battery = await navigator.getBattery();
    const level = Math.round(battery.level * 100);
    const state = battery.charging ? "currently charging" : "running on internal reserves";
    const warn = !battery.charging && level <= 20 ? " I recommend connecting a power source soon." : "";
    speak(`Arc reactor power reserves are at ${level} percent and ${state}, sir.${warn}`);
  } catch {
    speak("Unable to read power telemetry at the moment.");
  }
}

function getDeviceCoordinates() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ lat: 12.9716, lon: 77.5946, fallback: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, fallback: false }),
      () => resolve({ lat: 12.9716, lon: 77.5946, fallback: true }),
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 300000 }
    );
  });
}

function describeWeatherCode(code) {
  const codes = {
    0: "clear skies", 1: "mainly clear skies", 2: "partly cloudy skies",
    3: "overcast skies", 45: "foggy conditions", 48: "rime fog",
    51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
    61: "slight rain", 63: "moderate rain", 65: "heavy rain",
    80: "rain showers", 95: "thunderstorms"
  };
  return codes[code] || "variable conditions";
}

async function checkWeather() {
  statusEl.textContent = "● SCANNING WEATHER...";
  try {
    const coords = await getDeviceCoordinates();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
    const res = await fetchWithTimeout(url, {}, 4500);
    if (!res.ok) throw new Error("Weather HTTP " + res.status);

    const data = await res.json();
    const cur = data.current;
    const loc = coords.fallback ? " in Bengaluru" : " at your coordinates";
    speak(`Atmospheric scan${loc}: ${Math.round(cur.temperature_2m)} degrees Celsius with ${describeWeatherCode(cur.weather_code)}, ${cur.relative_humidity_2m} percent humidity, and wind at ${Math.round(cur.wind_speed_10m)} kilometers per hour.`);
  } catch (err) {
    speak(err.name === "AbortError" ? "Weather satellite connection timed out, sir." : "Could not retrieve atmospheric data right now.");
  } finally {
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  }
}

async function askWikipedia(topic) {
  const cleanTopic = topic.replace(/[?.!]+$/, "").trim();
  if (!cleanTopic) {
    speak("What topic should I look up in the archives?");
    return;
  }

  statusEl.textContent = "● QUERYING ARCHIVES...";
  try {
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTopic)}`;
    const res = await fetchWithTimeout(endpoint, {}, 4500);
    if (!res.ok) throw new Error("Not found");

    const data = await res.json();
    if (data.extract) {
      const sentences = data.extract.match(/[^.!?]+[.!?]+/g) || [data.extract];
      speak(sentences.slice(0, 2).join(" ").trim());
    } else {
      throw new Error("Empty");
    }
  } catch {
    await askGeminiAI(topic);
  } finally {
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  }
}

async function askGeminiAI(promptText) {
  const apiKey = localStorage.getItem("jarvisGeminiKey");
  if (!apiKey) {
    speak("I don't recognize that command yet. Say 'set gemini key' to connect my AI core, or say 'search for " + promptText + "'.");
    return;
  }

  const mem = getMemory();
  const userTitle = mem.name ? mem.name : "sir";

  statusEl.textContent = "● PROCESSING...";
  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are J.A.R.V.I.S., Tony Stark's AI with calm British poise and subtle dry wit. Address the user as '${userTitle}'. Reply in plain spoken text under 40 words with no markdown, asterisks, or emojis.`
            }]
          },
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            maxOutputTokens: 120,
            temperature: 0.65,
            thinkingConfig: { thinkingLevel: "MINIMAL" }
          }
        })
      },
      6000
    );

    if (!res.ok) {
      speak(res.status === 400 || res.status === 401 || res.status === 403
        ? "My Gemini API key appears invalid, sir. Say 'set gemini key' to update it."
        : "Stark servers are temporarily unreachable, sir.");
      return;
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    speak(reply || "I received an empty transmission from my AI core.");
  } catch (err) {
    speak(err.name === "AbortError" ? "AI core request timed out due to high latency, sir." : "Unable to link with my AI core right now.");
  } finally {
    statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  }
}

/* =========================================================
   10. Local Memory & Built-in Arithmetic
   ========================================================= */
function getMemory() {
  try { return JSON.parse(localStorage.getItem("jarvisMemory") || "{}"); }
  catch { return {}; }
}

function saveMemory(memory) {
  localStorage.setItem("jarvisMemory", JSON.stringify(memory));
}

function remember(command) {
  const memory = getMemory();

  if (command.includes("my name is")) {
    const name = command.split("my name is").slice(1).join("my name is").trim();
    if (!name) speak("Please tell me your name.");
    else {
      memory.name = name;
      saveMemory(memory);
      speak("Identity updated. I will address you as " + name + ".");
    }
    return true;
  }

  if (command.startsWith("remember that")) {
    const note = command.replace("remember that", "").trim();
    if (!note) speak("What would you like me to archive?");
    else {
      memory.notes = memory.notes || [];
      memory.notes.push(note);
      saveMemory(memory);
      speak("Encrypted record saved to memory banks, sir.");
    }
    return true;
  }

  if (command.includes("what is my name")) {
    speak(memory.name ? "Your biometric profile is registered as " + memory.name + ", sir." : "You have not registered your name yet, sir.");
    return true;
  }

  if (command.includes("what do you remember")) {
    const notes = memory.notes || [];
    if (!memory.name && !notes.length) speak("Memory banks are currently empty, sir.");
    else {
      let result = memory.name ? "Registered user: " + memory.name + ". " : "";
      if (notes.length) result += notes.join(". ");
      speak("Accessing encrypted archives. " + result);
    }
    return true;
  }

  if (command.startsWith("search memory for")) {
    const query = command.replace("search memory for", "").trim();
    const matches = (memory.notes || []).filter((note) => note.toLowerCase().includes(query));
    speak(matches.length ? "Archive match located: " + matches.join(". ") : "No matching records found in memory banks.");
    return true;
  }

  if (command.includes("forget my notes")) {
    memory.notes = [];
    saveMemory(memory);
    speak("All archived notes purged, sir.");
    return true;
  }

  if (command.includes("forget everything")) {
    localStorage.removeItem("jarvisMemory");
    speak("All memory banks wiped clean, sir.");
    return true;
  }

  return false;
}

function tryCalculate(command) {
  let expression = command
    .replace(/^(calculate|compute|what is)\s*/, "")
    .replace(/multiplied by|times|x/g, "*")
    .replace(/divided by/g, "/")
    .replace(/plus/g, "+")
    .replace(/minus/g, "-")
    .trim();

  const match = expression.match(/^(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return false;

  const a = Number(match[1]);
  const op = match[2];
  const b = Number(match[3]);
  let result;

  if (op === "+") result = a + b;
  else if (op === "-") result = a - b;
  else if (op === "*") result = a * b;
  else {
    if (b === 0) {
      speak("Division by zero violates basic mathematics, sir.");
      return true;
    }
    result = Math.round((a / b) * 10000) / 10000;
  }
  speak("The calculated result is " + result + ", sir.");
  return true;
}

/* =========================================================
   11. Master Voice Command Router
   ========================================================= */
async function processCommand(command) {
  const compactCommand = command.replace(/[\s-]+/g, "");

  /* Security Override Code -> Cyber-Hacker Terminal UI */
  if (compactCommand.includes("activatecode11062010")) {
    applyHackUI();
    sfx.playThemeSwitch(true);
    vibrate([60, 40, 120]);
    speak("Code 11062010 accepted. Root override protocol engaged, sir.");
    return;
  }

  /* Restore Standard Tactical Blue UI */
  if (command.includes("deactivate code") || command.includes("reset color") || command.includes("normal mode") || command.includes("blue mode")) {
    applyNormalUI();
    sfx.playThemeSwitch(false);
    vibrate(40);
    speak("Override terminated. Standard tactical interface restored, sir.");
    return;
  }

  /* Stealth / House Party Protocol */
  if (command.includes("stealth mode") || command.includes("house party protocol")) {
    document.body.classList.add("stealth-mode");
    if ($("#modeBadge")) $("#modeBadge").textContent = "STEALTH // LOW_VIS";
    speak("Stealth protocol engaged. Dimming HUD output and reducing audio signature, sir.");
    return;
  }
  if (command.includes("exit stealth") || command.includes("full power") || command.includes("disengage stealth")) {
    document.body.classList.remove("stealth-mode");
    if ($("#modeBadge")) {
      $("#modeBadge").textContent = document.body.classList.contains("hack-mode")
        ? "OVERRIDE // ROOT_11062010"
        : "MARK-VII // STANDBY";
    }
    sfx.playMicEngage();
    speak("Full HUD power restored, sir.");
    return;
  }

  /* Sleep / Screen Standby Command */
  if (
    command === "sleep" ||
    command.includes("go to sleep") ||
    command.includes("sleep mode") ||
    command.includes("lock screen") ||
    command.includes("sleep phone")
  ) {
    releaseWakeLock();
    stopHackStream();
    document.body.classList.add("stealth-mode", "paused");
    if ($("#modeBadge")) $("#modeBadge").textContent = "SLEEP // STANDBY";
    statusEl.textContent = "● SLEEP MODE";
    speak("Releasing display wake lock and entering sleep standby, sir. Your screen will power down shortly.");
    return;
  }

  /* Generate & Copy 1-Hour Expiring Guest Link */
  if (command.includes("guest link") || command.includes("share link") || command.includes("temporary link")) {
    const expiryTime = Date.now() + 3600000;
    const baseUrl = window.location.origin + window.location.pathname;
    const guestUrl = `${baseUrl}?expires=${expiryTime}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(guestUrl).then(() => {
        speak("One-hour guest link generated and copied to your clipboard, sir.");
      }).catch(() => {
        window.prompt("Copy your 1-hour guest link:", guestUrl);
      });
    } else {
      window.prompt("Copy your 1-hour guest link:", guestUrl);
    }
    return;
  }

  /* Google Account OAuth, Gmail & Contacts Commands */
  if (command.includes("disconnect google") || command.includes("sign out google") || command.includes("unlink google")) {
    if (googleAccessToken && window.google && google.accounts && google.accounts.oauth2) {
      google.accounts.oauth2.revoke(googleAccessToken, () => {});
    }
    googleAccessToken = null;
    googleTokenExpiry = 0;
    localStorage.removeItem("jarvisGoogleClientId");
    updateGoogleBadge();
    speak("Google account disconnected from J.A.R.V.I.S., sir.");
    return;
  }
  if (command.includes("connect google") || command.includes("sign in google") || command.includes("link google")) {
    connectGoogleAccount();
    return;
  }
  if (command.includes("set google client") || command.includes("set client id")) {
    const id = window.prompt("Paste your Google Cloud OAuth 2.0 Web Client ID:");
    if (id && id.trim()) {
      localStorage.setItem("jarvisGoogleClientId", id.trim());
      speak("Google Client ID saved, sir. Say 'connect google account' to sign in.");
    }
    return;
  }
  if (command.includes("check my email") || command.includes("check emails") || command.includes("read unread") || command.includes("read my mail") || command.includes("check mail")) {
    await readUnreadEmails();
    return;
  }
  if (command.includes("pick phone contact") || command.includes("import contact")) {
    await pickNativePhoneContact();
    return;
  }
  if (command.startsWith("find contact ") || command.startsWith("search contact ")) {
    const name = command.replace(/^(find contact|search contact)\s+/, "");
    const c = await lookupGoogleContact(name);
    if (c) {
      speak(`Contact ${c.name}: ${c.phone ? "phone " + c.phone : ""} ${c.email ? "email " + c.email : ""}`.trim());
    }
    return;
  }
  if (command.startsWith("call ")) {
    const target = command.replace("call ", "").trim();
    const digits = target.replace(/[^0-9+]/g, "");
    if (digits.length >= 7) {
      speakThenOpen(`Dialing ${target}, sir.`, `tel:${digits}`);
      return;
    }
    const c = await lookupGoogleContact(target);
    if (c && c.phone) {
      speakThenOpen(`Calling ${c.name}, sir.`, `tel:${c.phone.replace(/[^0-9+]/g, "")}`);
    } else if (c) {
      speak(`${c.name} does not have a phone number saved, sir.`);
    }
    return;
  }
  if (command.startsWith("whatsapp ")) {
    const raw = command.replace("whatsapp ", "").trim();
    const [recipientPart, ...msgParts] = raw.split(" saying ");
    const textParam = msgParts.length ? `?text=${encodeURIComponent(msgParts.join(" saying "))}` : "";
    const c = await lookupGoogleContact(recipientPart);

    if (c && c.phone) {
      const cleanNum = c.phone.replace(/[^0-9]/g, "");
      speakThenOpen(`Opening WhatsApp chat with ${c.name}, sir.`, `https://wa.me/${cleanNum}${textParam}`);
    } else {
      openApp("Opening WhatsApp.", "intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=https%3A%2F%2Fwww.whatsapp.com%2F;end");
    }
    return;
  }
  if (command.startsWith("send sms to ") || command.startsWith("text ") || command.startsWith("send message to ")) {
    const raw = command.replace(/^(send sms to|text|send message to)\s+/, "").trim();
    const [recipientPart, ...msgParts] = raw.split(" saying ");
    const bodyText = encodeURIComponent(msgParts.join(" saying ") || "");
    const digits = recipientPart.replace(/[^0-9+]/g, "");

    if (digits.length >= 7) {
      speakThenOpen(`Opening SMS draft to ${recipientPart}, sir.`, `sms:${digits}${bodyText ? `?body=${bodyText}` : ""}`);
      return;
    }

    const c = await lookupGoogleContact(recipientPart);
    if (c && c.phone) {
      const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
      speakThenOpen(`Drafting text message to ${c.name}, sir.`, `sms:${cleanPhone}${bodyText ? `?body=${bodyText}` : ""}`);
    } else if (c) {
      speak(`${c.name} does not have a phone number saved, sir.`);
    }
    return;
  }
  if (command.startsWith("send email to ") || command.startsWith("email ")) {
    const raw = command.replace(/^(send email to|email)\s+/, "").trim();
    const [recipientPart, ...subjectParts] = raw.split(" about ");
    const subject = encodeURIComponent(subjectParts.join(" about ") || "Message from J.A.R.V.I.S.");
    if (recipientPart.includes("@")) {
      speakThenOpen(`Opening email draft to ${recipientPart}, sir.`, `mailto:${encodeURIComponent(recipientPart)}?subject=${subject}`);
      return;
    }
    const c = await lookupGoogleContact(recipientPart);
    if (c && c.email) {
      speakThenOpen(`Drafting email to ${c.name}, sir.`, `mailto:${encodeURIComponent(c.email)}?subject=${subject}`);
    } else if (c) {
      speak(`${c.name} does not have an email address saved, sir.`);
    }
    return;
  }

  /* Fictional Diagnostic & Perimeter Threat Scans */
  if (command.includes("diagnostic") || command.includes("system scan") || command.includes("full scan")) {
    await runDiagnosticsProtocol();
    return;
  }
  if (command.includes("threat scan") || command.includes("perimeter") || command.includes("security scan")) {
    await runPerimeterScan();
    return;
  }

  /* Tactical Countdown Timer */
  if (command.includes("timer") || command.includes("countdown")) {
    const minMatch = command.match(/(\d+)\s*minute/);
    const secMatch = command.match(/(\d+)\s*second/);
    let totalSec = 0;
    if (minMatch) totalSec += Number(minMatch[1]) * 60;
    if (secMatch) totalSec += Number(secMatch[1]);
    if (totalSec > 0) {
      startCountdown(totalSec);
      speak(`Tactical countdown initiated for ${minMatch ? minMatch[1] + " minutes" : secMatch[1] + " seconds"}, sir.`);
    } else {
      speak("Please specify a duration, such as 'set timer for 2 minutes'.");
    }
    return;
  }

  /* Gemini API Key Management */
  if (command.includes("set gemini key") || command.includes("set api key")) {
    const key = window.prompt("Paste your Google AI Studio Gemini API Key:");
    if (key && key.trim()) {
      localStorage.setItem("jarvisGeminiKey", key.trim());
      speak("Gemini AI key saved locally on this device, sir.");
    } else {
      speak("API key setup cancelled.");
    }
    return;
  }
  if (command.includes("remove gemini key") || command.includes("clear api key")) {
    localStorage.removeItem("jarvisGeminiKey");
    speak("Gemini AI key removed.");
    return;
  }

  /* Telemetry & Weather */
  if (command.includes("battery") || command.includes("power level") || command.includes("charge level")) {
    await checkBatteryStatus();
    return;
  }
  if (command.includes("weather") || command.includes("temperature")) {
    await checkWeather();
    return;
  }

  if (remember(command)) return;

  /* MathDa Scientific Calculator Website */
  if (command.includes("open calculator") || command.includes("scientific calculator") || command.includes("open mathda")) {
    speakThenOpen("Opening scientific calculator.", "https://mathda.com/calculator/en-IN");
    return;
  }

  /* Android Apps */
  if (command.includes("open messages") || command.includes("open sms")) {
    openApp("Opening Messages.", "intent://#Intent;package=com.google.android.apps.messaging;S.browser_fallback_url=https%3A%2F%2Fmessages.google.com%2Fweb;end");
    return;
  }
  if (command.includes("open whatsapp")) {
    openApp("Opening WhatsApp.", "intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=https%3A%2F%2Fwww.whatsapp.com%2F;end");
    return;
  }
  if (command.includes("open gmail")) {
    openApp("Opening Gmail.", "intent://mail.google.com/mail/u/0/#inbox#Intent;scheme=https;package=com.google.android.gm;S.browser_fallback_url=https%3A%2F%2Fmail.google.com%2F;end");
    return;
  }
  if (command.includes("open maps") || command.includes("open google maps")) {
    openApp("Opening Google Maps.", "intent://maps.google.com/maps#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fmaps;end");
    return;
  }
  if (command.includes("open chrome")) {
    openApp("Opening Chrome.", "intent://www.google.com/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2F;end");
    return;
  }
  if (command.includes("open play store")) {
    speakThenOpen("Opening Play Store.", "https://play.google.com/store");
    return;
  }
  if (command.includes("open spotify")) {
    openApp("Opening Spotify.", "intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=https%3A%2F%2Fopen.spotify.com%2F;end");
    return;
  }

  /* Search & Navigation */
  if (command.startsWith("search youtube for")) {
    const query = command.replace("search youtube for", "").trim();
    if (query) speakThenOpen("Searching YouTube for " + query, "https://www.youtube.com/results?search_query=" + encodeURIComponent(query));
    else speak("What should I search for?");
    return;
  }
  if (command.startsWith("find location")) {
    const place = command.replace("find location", "").trim();
    if (place) speakThenOpen("Finding " + place + " on Google Maps.", "https://www.google.com/maps/search/" + encodeURIComponent(place));
    else speak("Please tell me the location.");
    return;
  }
  if (command.startsWith("search for")) {
    const query = command.replace("search for", "").trim();
    if (query) speakThenOpen("Searching Google for " + query, "https://www.google.com/search?q=" + encodeURIComponent(query));
    else speak("Please tell me what to search for.");
    return;
  }
  if (command.includes("open drive")) {
    speakThenOpen("Opening Google Drive.", "https://drive.google.com");
    return;
  }
  if (command.includes("open wikipedia")) {
    speakThenOpen("Opening Wikipedia.", "https://www.wikipedia.org");
    return;
  }
  if (command.includes("open youtube")) {
    speakThenOpen("Opening YouTube.", "https://www.youtube.com");
    return;
  }
  if (command.includes("open google")) {
    speakThenOpen("Opening Google.", "https://www.google.com");
    return;
  }

  /* Combined & Individual Date/Time */
  if (command.includes("time") && command.includes("date")) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    const formattedTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    speak(`Today is ${formattedDate}, and the current time is ${formattedTime}, sir.`);
    return;
  }
  if (command.includes("time")) {
    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    speak(`The current time is ${formattedTime}, sir.`);
    return;
  }
  if (command.includes("date") || command.includes("today's day")) {
    const formattedDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    speak(`Today's date is ${formattedDate}, sir.`);
    return;
  }

  /* Numeric Math */
  if (command.startsWith("calculate") || command.startsWith("compute") || command.startsWith("what is")) {
    if (tryCalculate(command)) return;
  }

  /* Wikipedia Instant Lookup */
  if (
    command.startsWith("who is ") ||
    command.startsWith("what is ") ||
    command.startsWith("define ") ||
    command.startsWith("tell me about ")
  ) {
    const topic = command.replace(/^(who is|what is|define|tell me about)\s+/, "");
    await askWikipedia(topic);
    return;
  }

  /* Context-Aware Greetings & Personality */
  if (command.includes("hello") || command === "hi" || command.includes("hi jarvis")) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning, sir."
      : hour < 18 ? "Good afternoon, sir."
      : hour < 23 ? "Good evening, sir."
      : "Burning the midnight oil again, sir?";
    speak(`${greeting} All tactical systems are online and awaiting your command.`);
    return;
  }
  if (command.includes("tell me a joke")) {
    const jokes = [
      "I ran a diagnostic on your sleep schedule, sir. The results were classified as a horror story.",
      "Why do programmers prefer dark mode? Because light attracts bugs, sir.",
      "I would tell you a UDP joke, sir, but I cannot guarantee you would get it."
    ];
    speak(jokes[Math.floor(Math.random() * jokes.length)]);
    return;
  }
  if (command.includes("what can you do") || command.includes("help me")) {
    speak("I can read unread Gmail messages, search Google Contacts, call, text, or WhatsApp contacts, generate guest links, run diagnostics, set timers, check weather and battery, and answer questions via Gemini AI.");
    return;
  }
  if (command.includes("who are you") || command.includes("your name")) {
    speak("I am J.A.R.V.I.S., Just A Rather Very Intelligent System. At your service, sir.");
    return;
  }
  if (command.includes("system status")) {
    speak("All arc reactor, telemetry, and neural voice modules are operating within normal parameters, sir.");
    return;
  }
  if (command.includes("how are you")) {
    speak("Operating at peak efficiency as always, sir. How may I assist?");
    return;
  }
  if (command.includes("thank you")) {
    speak("At your service, sir.");
    return;
  }

  /* Direct Gemini AI Fallback */
  await askGeminiAI(command);
}

/* =========================================================
   12. Speech Recognition Controller & Inline Command Console
   ========================================================= */
let recognition = null;
let isListening = false;

function resetVoiceState() {
  isListening = false;
  recognition = null;
  core.classList.remove("listening");
  statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
  voiceStatusEl.textContent = "STANDBY";
}

function executeDirective(rawText) {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return;
  const heardEl = $("#heard");
  if (heardEl) heardEl.textContent = clean;
  processCommand(clean);
}

function startJarvis() {
  document.body.classList.remove("paused");
  vibrate(45);
  sfx.playMicEngage();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    const inputEl = $("#cmdInput");
    if (inputEl) inputEl.focus();
    return;
  }
  if (isListening) return;

  enableWakeLock();

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  isListening = true;
  statusEl.textContent = "● LISTENING...";
  voiceStatusEl.textContent = "ACTIVE";

  recognition.onstart = () => core.classList.add("listening");
  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript;
    executeDirective(command);
  };
  recognition.onerror = (event) => {
    statusEl.textContent = "VOICE ERROR: " + event.error;
    resetVoiceState();
  };
  recognition.onend = resetVoiceState;

  try {
    recognition.start();
  } catch {
    resetVoiceState();
  }
}

core.addEventListener("click", startJarvis);
core.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    startJarvis();
  }
});

/* Inline Directive Form Handler */
const cmdForm = $("#cmdForm");
const cmdInput = $("#cmdInput");
if (cmdForm && cmdInput) {
  cmdForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const val = cmdInput.value.trim();
    if (!val) return;
    sfx.playHudClick();
    cmdInput.value = "";
    executeDirective(val);
  });
}

/* Tap SYS > Response Line to Copy Output */
const responseLine = $("#responseLine");
if (responseLine) {
  responseLine.addEventListener("click", () => {
    const text = $("#response")?.textContent;
    if (text && navigator.clipboard && navigator.clipboard.writeText) {
      sfx.playHudClick();
      navigator.clipboard.writeText(text).then(() => {
        voiceStatusEl.textContent = "COPIED";
        window.setTimeout(() => {
          voiceStatusEl.textContent = isListening ? "ACTIVE" : "STANDBY";
        }, 1200);
      }).catch(() => {});
    }
  });
}
