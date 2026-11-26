/* J.A.R.V.I.S — Mark-VII HUD, Interactive Cyber-Ops Root Terminal, JarvisAudio, Gmail & Contacts */
"use strict";

/* =========================================================
   0. Guest Pass Gate, PWA Service Worker & Boot Sequence
   ========================================================= */
(function checkGuestPass() {
  const expiresAt = Number(new URLSearchParams(window.location.search).get("expires"));
  if (expiresAt && Date.now() > expiresAt) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML = `<div style="display:flex;height:100vh;align-items:center;justify-content:center;background:#02090e;color:#00d8ff;font-family:monospace;text-align:center;padding:24px;"><div><h2 style="letter-spacing:4px;">ACCESS EXPIRED</h2><p style="color:#4b9cb3;">Temporary J.A.R.V.I.S. tactical pass has terminated.</p></div></div>`;
    });
    throw new Error("Guest pass expired");
  }
})();

const $ = (sel) => document.querySelector(sel);
const statusEl = $("#status");
const voiceStatusEl = $("#voiceStatus");
const core = $("#core");

const setHudTexts = (map) => Object.entries(map).forEach(([id, txt]) => {
  const el = $(id);
  if (el) el.textContent = txt;
});

const resetOnlineStatus = () => {
  statusEl.textContent = document.body.classList.contains("hack-mode") ? "● ROOT SHELL ACTIVE" : "● SYSTEM ONLINE";
};

if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
window.requestAnimationFrame(() => window.setTimeout(() => document.body.classList.remove("booting"), 120));

/* =========================================================
   1. Synthesized Sci-Fi Audio FX & Dual-Mode Visualizer
   ========================================================= */
class JarvisAudio {
  constructor() { this.ctx = null; this.muted = false; }

  tone({ f1, f2 = f1, dur, type = "sine", peak = 0.14, delay = 0, filterFreq = 0 }) {
    if (this.muted || document.body.classList.contains("stealth-mode")) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!this.ctx && AudioCtx) this.ctx = new AudioCtx();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});

    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterFreq, t);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  playHudClick() { this.tone({ f1: 1400, f2: 420, dur: 0.045, peak: 0.15 }); }
  playMicEngage() { [587.33, 880].forEach((f, i) => this.tone({ f1: f, dur: 0.16, type: "triangle", delay: i * 0.07 })); }
  playThemeSwitch(hack = true) { this.tone({ f1: hack ? 900 : 220, f2: hack ? 180 : 880, dur: 0.25, type: hack ? "sawtooth" : "sine", peak: 0.12, filterFreq: 1800 }); }
  playBootSequence() { [110, 164.81, 220].forEach((f) => this.tone({ f1: f * 0.85, f2: f, dur: 0.9, peak: 0.08 })); }
  playTraceAlarm() { [980, 740, 980].forEach((f, i) => this.tone({ f1: f, dur: 0.14, type: "sawtooth", peak: 0.13, delay: i * 0.16 })); }
}

const sfx = new JarvisAudio();
const playHudSound = (type) => type === "activate" ? sfx.playMicEngage() : type === "override" ? sfx.playThemeSwitch(true) : type === "scan" ? sfx.playBootSequence() : sfx.playHudClick();

const visCanvas = $("#audioVisualizer");
const visCtx = visCanvas ? visCanvas.getContext("2d") : null;
let visPhase = 0;

function renderVisualizerFrame() {
  if (!visCtx || !visCanvas) return;
  const { width: w, height: h } = visCanvas;
  visCtx.clearRect(0, 0, w, h);

  const active = ["listening", "speaking", "scanning"].some((cls) => core.classList.contains(cls));
  const isHack = document.body.classList.contains("hack-mode");
  const color = getComputedStyle(document.body).getPropertyValue("--primary").trim() || "#00d8ff";
  visPhase += active ? 0.24 : 0.05;

  if (isHack) {
    /* Dual-Wave Signal-Lock Oscilloscope in Hack Mode */
    visCtx.lineWidth = 1.5;
    [1, -1].forEach((dir, idx) => {
      visCtx.beginPath();
      visCtx.strokeStyle = idx === 0 ? color : "#00e5ff";
      visCtx.globalAlpha = active ? 0.9 : 0.45;
      for (let x = 0; x <= w; x += 4) {
        const norm = (x / w) * Math.PI * 4;
        const amp = active ? (h * 0.38) * Math.sin((x / w) * Math.PI) : 2.2;
        const y = h / 2 + dir * Math.sin(norm + visPhase * (idx === 0 ? 1 : -1.3)) * amp;
        if (x === 0) visCtx.moveTo(x, y);
        else visCtx.lineTo(x, y);
      }
      visCtx.stroke();
    });
  } else {
    /* Standard 16-Bar Spectrum Visualizer */
    const barCount = 16;
    const gap = 3;
    const barWidth = (w - gap * (barCount - 1)) / barCount;
    for (let i = 0; i < barCount; i++) {
      const dist = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
      const env = 1 - dist * 0.72;
      const wave = active ? Math.abs(Math.sin(visPhase + i * 0.55) * Math.cos(visPhase * 0.7 - i * 0.3)) : 0.08 + 0.05 * Math.sin(visPhase + i * 0.4);
      const barH = Math.max(3, Math.round((h - 4) * wave * env));
      visCtx.fillStyle = color;
      visCtx.globalAlpha = active ? 0.35 + 0.65 * env : 0.24;
      visCtx.fillRect(i * (barWidth + gap), (h - barH) / 2, barWidth, barH);
    }
  }
  visCtx.globalAlpha = 1;
  if (!document.hidden) window.requestAnimationFrame(renderVisualizerFrame);
}
if (visCtx) window.requestAnimationFrame(renderVisualizerFrame);

/* =========================================================
   2. Cyber-Ops Interactive Root Terminal & Counter-Trace
   ========================================================= */
let traceTimer = null;
let traceArmTimeout = null;
let traceActive = false;

function termPrint(text, cls = "") {
  const out = $("#termOutput");
  if (!out) return;
  const line = document.createElement("div");
  line.className = `term-line ${cls}`.trim();
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function getGpuRenderer() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).replace(/ANGLE \(|\)/g, "").slice(0, 34) : "MOBILE_GPU_CORE";
  } catch { return "MOBILE_GPU_CORE"; }
}

async function runLiveRecon() {
  termPrint("[*] INITIALIZING HARDWARE & NETWORK RECON...", "accent");
  const cores = navigator.hardwareConcurrency || "N/A";
  const ram = navigator.deviceMemory ? `${navigator.deviceMemory}GB` : "N/A";
  const conn = navigator.connection ? `${(navigator.connection.effectiveType || "4G").toUpperCase()} (${navigator.connection.downlink || "?"}Mbps / RTT ${navigator.connection.rtt || "?"}ms)` : "ENCRYPTED_LINK";
  const gpu = getGpuRenderer();
  termPrint(`[HW] CPU: ${cores} CORES | RAM: ${ram} | GPU: ${gpu}`);
  termPrint(`[NET] UPLINK: ${conn} | PLATFORM: ${navigator.platform || "ANDROID"}`);

  try {
    const res = await fetchWithTimeout("https://ipapi.co/json/", {}, 4000);
    if (res.ok) {
      const ipData = await res.json();
      termPrint(`[IP] PUBLIC NODE: ${ipData.ip || "MASKED"} (${ipData.city || "UNKNOWN"}, ${ipData.country_code || "IN"})`, "accent");
      termPrint(`[ISP] CARRIER: ${ipData.org || "ROUTED_GATEWAY"}`);
    } else {
      termPrint("[IP] EXTERNAL PROBE BLOCKED BY LOCAL FIREWALL.", "warn");
    }
  } catch {
    termPrint("[IP] STEALTH PROXY ACTIVE — EXTERNAL IP UNTRACEABLE.", "accent");
  }
}

function clearCounterTrace(neutralized = false) {
  window.clearTimeout(traceArmTimeout);
  window.clearInterval(traceTimer);
  traceArmTimeout = null;
  traceTimer = null;
  traceActive = false;
  $("#traceAlert")?.classList.remove("active");
  const badge = $("#traceBadge");
  if (badge) {
    badge.classList.remove("danger");
    badge.textContent = neutralized ? "PROXY: REROUTED" : "PROXY: MASKED";
  }
}

function triggerCounterTrace() {
  if (!document.body.classList.contains("hack-mode") || traceActive) return;
  traceActive = true;
  let secLeft = 15;
  $("#traceAlert")?.classList.add("active");
  setHudTexts({ "#traceCountdown": String(secLeft) });
  const badge = $("#traceBadge");
  if (badge) {
    badge.classList.add("danger");
    badge.textContent = "ALERT: TRACE_443";
  }
  sfx.playTraceAlarm();
  vibrate([100, 60, 100]);
  termPrint("[!] WARNING: INBOUND COUNTER-TRACE DETECTED ON PORT 443!", "warn");
  termPrint("[!] EXECUTE 'kill trace' OR 'reroute proxy' IMMEDIATELY.", "warn");
  speak("Alert, sir. Inbound counter-trace detected on port 443. Say 'kill trace' or 'reroute proxy' within 15 seconds.");

  traceTimer = window.setInterval(() => {
    secLeft--;
    setHudTexts({ "#traceCountdown": String(Math.max(0, secLeft)) });
    if (secLeft <= 0) {
      clearCounterTrace(false);
      termPrint("[!] TRACE LOCKED — EMERGENCY STEALTH FALLBACK ENGAGED.", "warn");
      applyNormalUI();
      speak("Counter-trace breached outer firewall. Reverting to standard tactical HUD for security, sir.");
    }
  }, 1000);
}

function runDecryptAnim(secretText) {
  const out = $("#termOutput");
  if (!out) return;
  const line = document.createElement("div");
  line.className = "term-line accent";
  out.appendChild(line);

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
  const target = secretText.toUpperCase();
  let step = 0;
  const iv = window.setInterval(() => {
    sfx.playHudClick();
    const scrambled = target.split("").map((ch, idx) => {
      if (ch === " ") return " ";
      if (idx < step) return ch;
      return chars[Math.floor(Math.random() * chars.length)];
    }).join("");
    line.textContent = `[DECRYPT] ${scrambled}`;
    out.scrollTop = out.scrollHeight;
    if (++step > target.length) {
      window.clearInterval(iv);
      speak(`Decryption complete: ${secretText}`);
    }
  }, 45);
}

function runBruteForceAnim() {
  const out = $("#termOutput");
  if (!out) return;
  const line = document.createElement("div");
  line.className = "term-line accent";
  out.appendChild(line);

  let pct = 0;
  const iv = window.setInterval(() => {
    pct += 10;
    const filled = "█".repeat(pct / 10) + "░".repeat(10 - pct / 10);
    const hexKey = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
    line.textContent = `[BRUTE] [${filled}] ${pct}% :: KEY 0x${hexKey}`;
    out.scrollTop = out.scrollHeight;
    sfx.playHudClick();
    if (pct >= 100) {
      window.clearInterval(iv);
      const finalKey = `STARK-ROOT-${Math.floor(1000 + Math.random() * 9000)}`;
      line.textContent = `[UNLOCKED] VAULT TOKEN ACQUIRED: ${finalKey}`;
      const mem = getMemory();
      mem.notes = [...(mem.notes || []), `Root Vault Token: ${finalKey}`];
      saveMemory(mem);
      speak(`Brute force complete, sir. Vault token ${finalKey} archived to encrypted memory.`);
    }
  }, 160);
}

async function runNodeTrace() {
  termPrint("[TRACE] TRACING SATELLITE RELAY NODES...", "accent");
  const hops = [
    "HOP 1 -> 10.0.0.1 [LOCAL_GATEWAY] 4ms",
    "HOP 2 -> 172.64.155.12 [STARK_SAT_04] 19ms",
    "HOP 3 -> 198.51.100.88 [ORBITAL_RELAY] 34ms"
  ];
  for (const h of hops) {
    termPrint(h);
    sfx.playHudClick();
    await new Promise((r) => window.setTimeout(r, 260));
  }
  const coords = await getDeviceCoordinates();
  const loc = coords.fallback ? "12.9716° N, 77.5946° E [SECTOR_BLR]" : `${coords.lat.toFixed(4)}° N, ${coords.lon.toFixed(4)}° E [LOCKED]`;
  termPrint(`[TARGET LOCK] COORDINATES: ${loc}`, "accent");
  speak("Multi-hop trace locked onto target coordinates, sir.");
}

async function executeTerminalCommand(rawCmd) {
  const clean = rawCmd.trim();
  if (!clean) return;
  const cmd = clean.toLowerCase();
  termPrint(`root@jarvis:~# ${clean}`, "cmd");

  if (cmd === "help" || cmd === "commands") {
    termPrint("AVAILABLE ROOT DIRECTIVES:");
    termPrint("  recon          - Live CPU/GPU/IP & network scan");
    termPrint("  trace          - Multi-hop satellite coordinate trace");
    termPrint("  decrypt <msg>  - Cipher-decode text stream");
    termPrint("  brute          - Crack & archive root vault token");
    termPrint("  spoof          - Rotate MAC & proxy signature");
    termPrint("  kill trace     - Neutralize active counter-trace");
    termPrint("  clear          - Wipe terminal screen");
    termPrint("  exit           - Restore standard Mark-VII HUD");
    return;
  }
  if (cmd === "clear" || cmd === "cls") {
    const out = $("#termOutput");
    if (out) out.innerHTML = "";
    return;
  }
  if (cmd === "recon" || cmd === "sysinfo" || cmd === "ifconfig") {
    await runLiveRecon();
    speak("Live hardware and network reconnaissance complete, sir.");
    return;
  }
  if (cmd === "trace" || cmd.startsWith("trace ")) {
    await runNodeTrace();
    return;
  }
  if (cmd.startsWith("decrypt ")) {
    const payload = clean.slice(8).trim();
    if (payload) runDecryptAnim(payload);
    else termPrint("Usage: decrypt <message>", "warn");
    return;
  }
  if (cmd === "brute" || cmd === "brute force" || cmd === "crack") {
    runBruteForceAnim();
    return;
  }
  if (cmd === "spoof" || cmd === "spoof mac") {
    const fakeMac = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0")).join(":");
    termPrint(`[SPOOF] NEW HARDWARE MAC: ${fakeMac} [VERIFIED]`, "accent");
    setHudTexts({ "#traceBadge": "PROXY: SPOOFED" });
    sfx.playMicEngage();
    speak("Hardware MAC address spoofed and proxy tunnel rotated, sir.");
    return;
  }
  if (cmd.includes("kill trace") || cmd.includes("reroute proxy") || cmd.includes("stop trace")) {
    if (traceActive) {
      clearCounterTrace(true);
      sfx.playMicEngage();
      termPrint("[OK] COUNTER-TRACE SEVERED. TRAFFIC REROUTED THROUGH STARK PROXY.", "accent");
      speak("Counter-trace neutralized, sir. All outbound packets are now masked.");
    } else {
      termPrint("[OK] NO ACTIVE COUNTER-TRACES DETECTED. PERIMETER CLEAN.");
      speak("No active counter-traces detected, sir.");
    }
    return;
  }
  if (cmd === "exit" || cmd === "deactivate code" || cmd === "normal mode") {
    applyNormalUI();
    sfx.playThemeSwitch(false);
    speak("Root terminal closed. Standard tactical interface restored, sir.");
    return;
  }

  /* Forward any other command to J.A.R.V.I.S. main voice/AI router */
  await processCommand(cmd);
}

/* =========================================================
   3. Theme Switcher, Telemetry, Clock & Lifecycle
   ========================================================= */
function applyNormalUI() {
  localStorage.removeItem("jarvisTheme");
  document.body.classList.remove("hack-mode", "stealth-mode");
  clearCounterTrace(false);
  setHudTexts({
    "#modeBadge": "MARK-VII // STANDBY",
    "#headerSub": "STARK INDUSTRIES // NEURAL TACTICAL SYSTEM",
    "#hudTitle": "J.A.R.V.I.S",
    "#coreLabel": "J.A.R.V.I.S",
    "#coreSub": "TAP TO ENGAGE",
    "#panelTitle": "COMMUNICATION LOG",
    "#userPrompt": "USR >",
    "#sysPrompt": "SYS >",
    "#footerText": "STARK INDUSTRIES // MARK-VII TACTICAL INTERFACE"
  });
}

function applyHackUI() {
  document.body.classList.remove("stealth-mode");
  document.body.classList.add("hack-mode");
  setHudTexts({
    "#modeBadge": "OVERRIDE // ROOT_11062010",
    "#headerSub": "KERNEL BREACH // UNRESTRICTED SHELL",
    "#hudTitle": "J.A.R.V.I.S // ROOT",
    "#coreLabel": "OVERRIDE",
    "#coreSub": "ROOT_ACTIVE",
    "#panelTitle": "NEURAL FEED",
    "#userPrompt": "root@usr:~#",
    "#sysPrompt": "root@sys:~#",
    "#footerText": "BREACH PROTOCOL ACTIVE // TYPE 'HELP' IN TERMINAL"
  });

  const out = $("#termOutput");
  if (out) {
    out.innerHTML = "";
    termPrint("[OK] OVERRIDE CODE 11062010 ACCEPTED. ROOT SHELL UNLOCKED.", "accent");
    termPrint("Type 'help' below or speak: recon, trace, decrypt, brute, spoof.");
    runLiveRecon();
  }

  clearCounterTrace(false);
  traceArmTimeout = window.setTimeout(triggerCounterTrace, 6500);
}

applyNormalUI();
window.addEventListener("pageshow", applyNormalUI);

const vibrate = (pattern) => { if ("vibrate" in navigator) try { navigator.vibrate(pattern); } catch {} };

let wakeLock = null;
async function enableWakeLock() {
  if (!("wakeLock" in navigator) || document.hidden || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch { wakeLock = null; }
}
const releaseWakeLock = () => { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } };

let tiltPending = false;
window.addEventListener("deviceorientation", (e) => {
  if (document.hidden || tiltPending || e.gamma === null || e.beta === null) return;
  tiltPending = true;
  window.requestAnimationFrame(() => {
    const x = Math.max(-6, Math.min(6, e.gamma * 0.14)).toFixed(1);
    const y = Math.max(-6, Math.min(6, (e.beta - 45) * 0.14)).toFixed(1);
    core.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    tiltPending = false;
  });
}, { passive: true });

const updateNetworkBadge = () => setHudTexts({ "#netStatus": navigator.onLine ? "NET: ONLINE" : "NET: OFFLINE" });
updateNetworkBadge();
window.addEventListener("online", updateNetworkBadge);
window.addEventListener("offline", updateNetworkBadge);

function updateGoogleBadge() {
  const el = $("#glinkStatus");
  if (!el) return;
  const active = hasValidGoogleToken();
  el.textContent = active ? "G-LINK: ON" : "G-LINK: OFF";
  el.classList.toggle("online", active);
}

let lowBatteryWarned = false;
if ("getBattery" in navigator) {
  navigator.getBattery().then((batt) => {
    const sync = () => {
      const pct = Math.round(batt.level * 100);
      setHudTexts({ "#battStatus": `PWR: ${pct}%${batt.charging ? "+" : ""}` });
      if (!batt.charging && pct <= 15 && !lowBatteryWarned) {
        lowBatteryWarned = true;
        speak(`Warning, sir. Arc reactor power reserves critical at ${pct} percent.`);
      }
    };
    sync();
    batt.addEventListener("levelchange", sync);
    batt.addEventListener("chargingchange", sync);
  }).catch(() => {});
}

let clockTimer = null;
let countdownTimer = null;
const updateClock = () => setHudTexts({ "#clock": new Date().toLocaleTimeString() });
const startClock = () => { updateClock(); if (!clockTimer) clockTimer = window.setInterval(updateClock, 1000); };
const stopClock = () => { if (clockTimer) { window.clearInterval(clockTimer); clockTimer = null; } };
startClock();

function startCountdown(seconds) {
  const el = $("#countdownDisplay");
  if (!el) return;
  window.clearInterval(countdownTimer);
  let rem = seconds;
  const render = () => {
    el.textContent = `T-MINUS // ${String(Math.floor(rem / 60)).padStart(2, "0")}:${String(rem % 60).padStart(2, "0")}`;
    el.classList.add("active");
  };
  render();
  countdownTimer = window.setInterval(() => {
    if (--rem <= 0) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
      el.textContent = "T-MINUS // 00:00 [COMPLETE]";
      sfx.playBootSequence();
      vibrate([120, 60, 120, 60, 180]);
      speak("Timer complete, sir.");
      window.setTimeout(() => el.classList.remove("active"), 4000);
    } else render();
  }, 1000);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopClock(); releaseWakeLock();
    document.body.classList.add("paused");
  } else {
    document.body.classList.remove("paused");
    startClock();
    if (visCtx) window.requestAnimationFrame(renderVisualizerFrame);
  }
});

window.addEventListener("pagehide", () => {
  stopClock(); clearCounterTrace(false); window.clearInterval(countdownTimer); releaseWakeLock();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
});

/* =========================================================
   4. Speech Synthesis & Network Fetch Helper
   ========================================================= */
let speakTimer = null;

function speak(message, onDone) {
  setHudTexts({ "#response": message });
  const log = $("#logHistory");
  if (log) log.scrollTop = log.scrollHeight;

  if (!("speechSynthesis" in window)) { if (onDone) onDone(); return; }
  window.clearTimeout(speakTimer);
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(message);
  u.lang = "en-US";
  u.rate = 0.88;
  u.pitch = 0.72;
  u.volume = document.body.classList.contains("stealth-mode") ? 0.35 : 1;

  const voice = window.speechSynthesis.getVoices().find((v) => /david|daniel|george|mark|male/i.test(v.name) && v.lang.toLowerCase().startsWith("en"));
  if (voice) u.voice = voice;

  let done = false;
  const finish = () => { if (!done) { done = true; core.classList.remove("speaking"); if (onDone) onDone(); } };
  u.onstart = () => core.classList.add("speaking");
  u.onend = finish;
  u.onerror = finish;

  speakTimer = window.setTimeout(() => { try { window.speechSynthesis.speak(u); } catch { finish(); } }, 80);
}

const speakThenOpen = (msg, url) => speak(msg, () => window.setTimeout(() => { window.location.href = url; }, 1800));
const openApp = speakThenOpen;

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { window.clearTimeout(id); }
}

function savePromptedKey(storageKey, promptLabel, savedMsg) {
  const val = window.prompt(promptLabel);
  if (val && val.trim()) {
    localStorage.setItem(storageKey, val.trim());
    speak(savedMsg);
    return val.trim();
  }
  speak("Setup cancelled, sir.");
  return null;
}

/* =========================================================
   5. Google OAuth 2.0 (Gmail & Contacts)
   ========================================================= */
let googleAccessToken = null;
let googleTokenExpiry = 0;
const hasValidGoogleToken = () => Boolean(googleAccessToken && Date.now() < googleTokenExpiry);

function connectGoogleAccount() {
  const clientId = localStorage.getItem("jarvisGoogleClientId") || savePromptedKey("jarvisGoogleClientId", "Paste your Google Cloud OAuth 2.0 Web Client ID:", "Google Client ID saved.");
  if (!clientId) return;
  if (!window.google?.accounts?.oauth2) {
    speak("Google Identity library is still loading or you are offline, sir.");
    return;
  }
  google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly",
    callback: (res) => {
      if (res?.access_token) {
        googleAccessToken = res.access_token;
        googleTokenExpiry = Date.now() + Number(res.expires_in || 3500) * 1000;
        updateGoogleBadge();
        sfx.playMicEngage();
        speak("Google account uplink established, sir. Gmail and Contacts telemetry are now online.");
      } else speak("Google authorization was not granted, sir.");
    }
  }).requestAccessToken({ prompt: "consent" });
}

async function readUnreadEmails() {
  if (!hasValidGoogleToken()) {
    updateGoogleBadge();
    speak("Google uplink not active, sir. Say 'connect google account' first, or say 'open gmail'.");
    return;
  }
  statusEl.textContent = "● SCANNING GMAIL...";
  const auth = { headers: { Authorization: `Bearer ${googleAccessToken}` } };
  try {
    const listRes = await fetchWithTimeout("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3", auth, 5500);
    if (!listRes.ok) throw new Error();
    const messages = (await listRes.json()).messages || [];
    if (!messages.length) { speak("You have zero unread messages in your inbox, sir."); return; }

    const summaries = [];
    for (const msg of messages) {
      const res = await fetchWithTimeout(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, auth, 4500);
      if (res.ok) {
        const headers = (await res.json()).payload?.headers || [];
        const from = (headers.find((h) => h.name === "From")?.value || "Unknown sender").replace(/<[^>]+>|"/g, "").trim();
        const subj = headers.find((h) => h.name === "Subject")?.value || "No subject";
        summaries.push(`From ${from} about ${subj}`);
      }
    }
    speak(`You have ${messages.length} recent unread emails, sir. ${summaries.join(". ")}.`);
  } catch {
    speak("Unable to retrieve Gmail messages right now, sir. Try saying 'connect google account' to refresh permissions.");
  } finally { resetOnlineStatus(); }
}

async function lookupGoogleContact(queryName) {
  const clean = queryName.trim();
  if (!clean) { speak("Which contact should I search for, sir?"); return null; }

  const mem = getMemory();
  const localKey = Object.keys(mem.contacts || {}).find((k) => k.toLowerCase().includes(clean.toLowerCase()));
  if (localKey) return mem.contacts[localKey];

  if (!hasValidGoogleToken()) {
    updateGoogleBadge();
    speak("Google Contacts uplink is not connected, sir. Say 'connect google account' or 'pick phone contact'.");
    return null;
  }

  statusEl.textContent = "● SEARCHING CONTACTS...";
  try {
    const res = await fetchWithTimeout(
      `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(clean)}&readMask=names,phoneNumbers,emailAddresses`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } }, 5000
    );
    if (!res.ok) throw new Error();
    const person = (await res.json()).results?.[0]?.person;
    if (!person) { speak(`No contact matching ${clean} was found, sir.`); return null; }

    const entry = {
      name: person.names?.[0]?.displayName || clean,
      phone: person.phoneNumbers?.[0]?.value || "",
      email: person.emailAddresses?.[0]?.value || ""
    };
    mem.contacts = { ...(mem.contacts || {}), [entry.name]: entry };
    saveMemory(mem);
    return entry;
  } catch {
    speak("Unable to search Google Contacts right now, sir.");
    return null;
  } finally { resetOnlineStatus(); }
}

async function pickNativePhoneContact() {
  if (!("contacts" in navigator && "ContactsManager" in window)) {
    speak("Native contact picker is not supported on this browser, sir. Say 'connect google account' to sync Google Contacts.");
    return;
  }
  try {
    const [c] = await navigator.contacts.select(["name", "tel", "email"], { multiple: false });
    if (!c) { speak("Contact selection cancelled."); return; }
    const name = c.name?.[0] || "Saved Contact";
    const mem = getMemory();
    mem.contacts = { ...(mem.contacts || {}), [name]: { name, phone: c.tel?.[0] || "", email: c.email?.[0] || "" } };
    saveMemory(mem);
    speak(`Saved ${name} to tactical contacts, sir. You can now say 'call ${name}' or 'WhatsApp ${name}'.`);
  } catch { speak("Unable to open phone contacts right now."); }
}

/* =========================================================
   6. Telemetry, Diagnostics, Weather, Wikipedia & Gemini AI
   ========================================================= */
const WEATHER_CODES = {
  0: "clear skies", 1: "mainly clear skies", 2: "partly cloudy skies", 3: "overcast skies",
  45: "foggy conditions", 48: "rime fog", 51: "light drizzle", 53: "moderate drizzle",
  55: "dense drizzle", 61: "slight rain", 63: "moderate rain", 65: "heavy rain",
  80: "rain showers", 95: "thunderstorms"
};

const getDeviceCoordinates = () => new Promise((resolve) => {
  if (!("geolocation" in navigator)) return resolve({ lat: 12.9716, lon: 77.5946, fallback: true });
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, fallback: false }),
    () => resolve({ lat: 12.9716, lon: 77.5946, fallback: true }),
    { enableHighAccuracy: false, timeout: 3500, maximumAge: 300000 }
  );
});

async function runDiagnosticsProtocol() {
  sfx.playBootSequence();
  core.classList.add("scanning");
  statusEl.textContent = "● RUNNING DIAGNOSTICS...";
  let battText = "nominal";
  if ("getBattery" in navigator) {
    try { battText = `at ${Math.round((await navigator.getBattery()).level * 100)} percent`; } catch {}
  }
  const noteCount = (getMemory().notes || []).length;
  window.setTimeout(() => {
    core.classList.remove("scanning");
    resetOnlineStatus();
    speak(`Full system diagnostics complete, sir. Arc reactor output is ${battText}. Satellite uplink is ${navigator.onLine ? "online with zero packet loss" : "currently offline"}. Google workspace link is ${hasValidGoogleToken() ? "authenticated" : "standby"}. Memory banks hold ${noteCount} records.`);
  }, 1600);
}

async function runPerimeterScan() {
  sfx.playBootSequence();
  core.classList.add("scanning");
  statusEl.textContent = "● SCANNING PERIMETER...";
  try {
    const coords = await getDeviceCoordinates();
    const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code`, {}, 4000);
    const cur = res.ok ? (await res.json()).current : null;
    const tempNote = cur ? ` Ambient temperature is ${Math.round(cur.temperature_2m)} degrees Celsius with ${WEATHER_CODES[cur.weather_code] || "variable conditions"}.` : "";
    const sector = coords.fallback ? "Sector Bengaluru" : `latitude ${coords.lat.toFixed(2)}, longitude ${coords.lon.toFixed(2)}`;
    speak(`Perimeter scan complete across ${sector}.${tempNote} Zero unauthorized intrusions detected, sir.`);
  } catch {
    speak("Local perimeter secure, sir. Long-range satellite telemetry is temporarily unavailable.");
  } finally { core.classList.remove("scanning"); resetOnlineStatus(); }
}

async function checkBatteryStatus() {
  if (!("getBattery" in navigator)) { speak("Battery telemetry is not supported on this browser, sir."); return; }
  try {
    const b = await navigator.getBattery();
    const pct = Math.round(b.level * 100);
    const warn = !b.charging && pct <= 20 ? " I recommend connecting a power source soon." : "";
    speak(`Arc reactor power reserves are at ${pct} percent and ${b.charging ? "currently charging" : "running on internal reserves"}, sir.${warn}`);
  } catch { speak("Unable to read power telemetry at the moment."); }
}

async function checkWeather() {
  statusEl.textContent = "● SCANNING WEATHER...";
  try {
    const coords = await getDeviceCoordinates();
    const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`, {}, 4500);
    if (!res.ok) throw new Error();
    const cur = (await res.json()).current;
    speak(`Atmospheric scan${coords.fallback ? " in Bengaluru" : " at your coordinates"}: ${Math.round(cur.temperature_2m)} degrees Celsius with ${WEATHER_CODES[cur.weather_code] || "variable conditions"}, ${cur.relative_humidity_2m} percent humidity, and wind at ${Math.round(cur.wind_speed_10m)} kilometers per hour.`);
  } catch (err) {
    speak(err.name === "AbortError" ? "Weather satellite connection timed out, sir." : "Could not retrieve atmospheric data right now.");
  } finally { resetOnlineStatus(); }
}

async function askWikipedia(topic) {
  const clean = topic.replace(/[?.!]+$/, "").trim();
  if (!clean) { speak("What topic should I look up in the archives?"); return; }
  statusEl.textContent = "● QUERYING ARCHIVES...";
  try {
    const res = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`, {}, 4500);
    const data = res.ok ? await res.json() : null;
    if (!data?.extract) throw new Error();
    speak((data.extract.match(/[^.!?]+[.!?]+/g) || [data.extract]).slice(0, 2).join(" ").trim());
  } catch { await askGeminiAI(topic); }
  finally { resetOnlineStatus(); }
}

/* Rolling multi-turn conversation memory (persists during session) */
let jarvisChatHistory = [];

async function askGeminiAI(promptText, speakReply = true) {
  const apiKey = localStorage.getItem("jarvisGeminiKey");
  if (!apiKey) {
    speak("I don't recognize that command yet. Say 'set gemini key' to connect my AI core.");
    return;
  }

  /* Allow resetting conversation context anytime */
  if (["new chat", "clear chat", "reset conversation"].includes(promptText.toLowerCase().trim())) {
    jarvisChatHistory = [];
    speak("Conversation context cleared, sir. Starting a fresh neural thread.");
    return;
  }

  const mem = getMemory();
  const trainedFacts = (mem.notes || []).length
    ? ` Known facts about the user: ${mem.notes.join("; ")}.`
    : "";

  /* Append user message to conversation history (keep last 10 turns) */
  jarvisChatHistory.push({ role: "user", parts: [{ text: promptText }] });
  if (jarvisChatHistory.length > 20) jarvisChatHistory = jarvisChatHistory.slice(-20);

  statusEl.textContent = "● THINKING...";
  const responseEl = $("#response");
  const logEl = $("#logHistory");
  if (responseEl) responseEl.textContent = "";

  try {
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse";
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
              text: `You are J.A.R.V.I.S., Tony Stark's AI assistant with calm British poise and subtle dry wit. Address the user as '${mem.name || "sir"}'.${trainedFacts} Give clear, helpful, well-structured answers without markdown asterisks.`
            }]
          },
          contents: jarvisChatHistory,
          tools: [{ google_search: {} }],
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7
          }
        })
      },
      15000
    );

    if (!res.ok) {
      jarvisChatHistory.pop();
      speak([400, 401, 403].includes(res.status)
        ? "My Gemini API key appears invalid, sir. Say 'set gemini key' to update it."
        : "Stark servers are temporarily unreachable, sir.");
      return;
    }

    /* Stream tokens live into the HUD terminal */
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (chunk) {
            fullReply += chunk;
            if (responseEl) responseEl.textContent = fullReply;
            if (logEl) logEl.scrollTop = logEl.scrollHeight;
          }
        } catch {}
      }
    }

    const cleanReply = fullReply.trim() || "I received an empty transmission from my AI core.";
    jarvisChatHistory.push({ role: "model", parts: [{ text: cleanReply }] });

    /* Speak concise summary (first 2 sentences) so long answers don't talk for 2 minutes */
    if (speakReply) {
      const spokenPart = (cleanReply.match(/[^.!?]+[.!?]+/g) || [cleanReply]).slice(0, 2).join(" ").trim();
      speak(spokenPart);
      if (responseEl) responseEl.textContent = cleanReply;
    }
  } catch (err) {
    jarvisChatHistory.pop();
    speak(err.name === "AbortError"
      ? "AI core request timed out, sir."
      : "Unable to link with my AI core right now.");
  } finally {
    resetOnlineStatus();
  }
}


/* =========================================================
   7. Local Memory & Built-in Arithmetic
   ========================================================= */
function getMemory() {
  try { return JSON.parse(localStorage.getItem("jarvisMemory") || "{}"); } catch { return {}; }
}
const saveMemory = (mem) => localStorage.setItem("jarvisMemory", JSON.stringify(mem));

function remember(cmd) {
  const mem = getMemory();
  if (cmd.includes("my name is")) {
    const name = cmd.split("my name is").slice(1).join("my name is").trim();
    if (!name) speak("Please tell me your name.");
    else { mem.name = name; saveMemory(mem); speak(`Identity updated. I will address you as ${name}.`); }
    return true;
  }
  if (cmd.startsWith("remember that")) {
    const note = cmd.replace("remember that", "").trim();
    if (!note) speak("What would you like me to archive?");
    else { mem.notes = [...(mem.notes || []), note]; saveMemory(mem); speak("Encrypted record saved to memory banks, sir."); }
    return true;
  }
  if (cmd.includes("what is my name")) {
    speak(mem.name ? `Your biometric profile is registered as ${mem.name}, sir.` : "You have not registered your name yet, sir.");
    return true;
  }
  if (cmd.includes("what do you remember")) {
    const notes = mem.notes || [];
    speak(!mem.name && !notes.length ? "Memory banks are currently empty, sir." : `Accessing encrypted archives. ${mem.name ? `Registered user: ${mem.name}. ` : ""}${notes.join(". ")}`);
    return true;
  }
  if (cmd.startsWith("search memory for")) {
    const q = cmd.replace("search memory for", "").trim();
    const hits = (mem.notes || []).filter((n) => n.toLowerCase().includes(q));
    speak(hits.length ? `Archive match located: ${hits.join(". ")}` : "No matching records found in memory banks.");
    return true;
  }
  if (cmd.includes("forget my notes")) { mem.notes = []; saveMemory(mem); speak("All archived notes purged, sir."); return true; }
  if (cmd.includes("forget everything")) { localStorage.removeItem("jarvisMemory"); speak("All memory banks wiped clean, sir."); return true; }
  return false;
}

function tryCalculate(cmd) {
  const expr = cmd.replace(/^(calculate|compute|what is)\s*/, "").replace(/multiplied by|times|x/g, "*").replace(/divided by/g, "/").replace(/plus/g, "+").replace(/minus/g, "-").trim();
  const m = expr.match(/^(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return false;
  const [, aStr, op, bStr] = m;
  const [a, b] = [Number(aStr), Number(bStr)];
  if (op === "/" && b === 0) { speak("Division by zero violates basic mathematics, sir."); return true; }
  const res = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : Math.round((a / b) * 10000) / 10000;
  speak(`The calculated result is ${res}, sir.`);
  return true;
}

/* =========================================================
   8. Data-Driven Routes & Master Command Router
   ========================================================= */
const LAUNCH_ROUTES = {
  "open messages": ["Opening Messages.", "intent://#Intent;package=com.google.android.apps.messaging;S.browser_fallback_url=https%3A%2F%2Fmessages.google.com%2Fweb;end"],
  "open sms": ["Opening Messages.", "intent://#Intent;package=com.google.android.apps.messaging;S.browser_fallback_url=https%3A%2F%2Fmessages.google.com%2Fweb;end"],
  "open whatsapp": ["Opening WhatsApp.", "intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=https%3A%2F%2Fwww.whatsapp.com%2F;end"],
  "open gmail": ["Opening Gmail.", "intent://mail.google.com/mail/u/0/#inbox#Intent;scheme=https;package=com.google.android.gm;S.browser_fallback_url=https%3A%2F%2Fmail.google.com%2F;end"],
  "open maps": ["Opening Google Maps.", "intent://maps.google.com/maps#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fmaps;end"],
  "open google maps": ["Opening Google Maps.", "intent://maps.google.com/maps#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fmaps;end"],
  "open chrome": ["Opening Chrome.", "intent://www.google.com/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2F;end"],
  "open spotify": ["Opening Spotify.", "intent://open.spotify.com/#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=https%3A%2F%2Fopen.spotify.com%2F;end"],
  "open calculator": ["Opening scientific calculator.", "https://mathda.com/calculator/en-IN"],
  "scientific calculator": ["Opening scientific calculator.", "https://mathda.com/calculator/en-IN"],
  "open mathda": ["Opening scientific calculator.", "https://mathda.com/calculator/en-IN"],
  "open play store": ["Opening Play Store.", "https://play.google.com/store"],
  "open drive": ["Opening Google Drive.", "https://drive.google.com"],
  "open wikipedia": ["Opening Wikipedia.", "https://www.wikipedia.org"],
  "open youtube": ["Opening YouTube.", "https://www.youtube.com"],
  "open google": ["Opening Google.", "https://www.google.com"]
};

const STATIC_REPLIES = [
  [["what can you do", "help me"], "I can read unread Gmail messages, search Google Contacts, call, text, or WhatsApp contacts, generate guest links, run diagnostics, set timers, check weather and battery, and answer questions via Gemini AI."],
  [["who are you", "your name"], "I am J.A.R.V.I.S., Just A Rather Very Intelligent System. At your service, sir."],
  [["system status"], "All arc reactor, telemetry, and neural voice modules are operating within normal parameters, sir."],
  [["how are you"], "Operating at peak efficiency as always, sir. How may I assist?"],
  [["thank you"], "At your service, sir."]
];

async function processCommand(command) {
  const compact = command.replace(/[\s-]+/g, "");

  /* HUD Modes & Sleep */
  if (compact.includes("activatecode11062010")) {
    applyHackUI(); sfx.playThemeSwitch(true); vibrate([60, 40, 120]);
    speak("Code 11062010 accepted. Root cyber-ops terminal unlocked, sir."); return;
  }
  if (["deactivate code", "reset color", "normal mode", "blue mode"].some((k) => command.includes(k))) {
    applyNormalUI(); sfx.playThemeSwitch(false); vibrate(40);
    speak("Override terminated. Standard tactical interface restored, sir."); return;
  }

  /* Voice-Triggered Root Terminal Actions (Work via Mic or Console) */
  if (document.body.classList.contains("hack-mode")) {
    if (command.includes("kill trace") || command.includes("reroute proxy") || command.includes("stop trace")) {
      await executeTerminalCommand("kill trace"); return;
    }
    if (command === "recon" || command.includes("network recon") || command.includes("hardware recon")) {
      await executeTerminalCommand("recon"); return;
    }
    if (command === "trace" || command.startsWith("trace ")) {
      await executeTerminalCommand(command); return;
    }
    if (command.startsWith("decrypt ")) {
      await executeTerminalCommand(command); return;
    }
    if (command === "brute" || command.includes("brute force")) {
      await executeTerminalCommand("brute"); return;
    }
    if (command.includes("spoof")) {
      await executeTerminalCommand("spoof"); return;
    }
  }

  if (command.includes("stealth mode") || command.includes("house party protocol")) {
    document.body.classList.add("stealth-mode");
    setHudTexts({ "#modeBadge": "STEALTH // LOW_VIS" });
    speak("Stealth protocol engaged. Dimming HUD output and reducing audio signature, sir."); return;
  }
  if (["exit stealth", "full power", "disengage stealth"].some((k) => command.includes(k))) {
    document.body.classList.remove("stealth-mode");
    setHudTexts({ "#modeBadge": document.body.classList.contains("hack-mode") ? "OVERRIDE // ROOT_11062010" : "MARK-VII // STANDBY" });
    sfx.playMicEngage(); speak("Full HUD power restored, sir."); return;
  }
  if (command === "sleep" || ["go to sleep", "sleep mode", "lock screen", "sleep phone"].some((k) => command.includes(k))) {
    releaseWakeLock(); clearCounterTrace(false);
    document.body.classList.add("stealth-mode", "paused");
    setHudTexts({ "#modeBadge": "SLEEP // STANDBY", "#status": "● SLEEP MODE" });
    speak("Releasing display wake lock and entering sleep standby, sir. Your screen will power down shortly."); return;
  }

  /* 1-Hour Guest Pass Link */
  if (["guest link", "share link", "temporary link"].some((k) => command.includes(k))) {
    const guestUrl = `${window.location.origin}${window.location.pathname}?expires=${Date.now() + 3600000}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(guestUrl).then(() => speak("One-hour guest link generated and copied to your clipboard, sir.")).catch(() => window.prompt("Copy your 1-hour guest link:", guestUrl));
    } else window.prompt("Copy your 1-hour guest link:", guestUrl);
    return;
  }

  /* Google OAuth, Gmail & Contacts */
  if (["disconnect google", "sign out google", "unlink google"].some((k) => command.includes(k))) {
    if (googleAccessToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(googleAccessToken, () => {});
    googleAccessToken = null; googleTokenExpiry = 0;
    localStorage.removeItem("jarvisGoogleClientId"); updateGoogleBadge();
    speak("Google account disconnected from J.A.R.V.I.S., sir."); return;
  }
  if (["connect google", "sign in google", "link google"].some((k) => command.includes(k))) { connectGoogleAccount(); return; }
  if (command.includes("set google client") || command.includes("set client id")) {
    savePromptedKey("jarvisGoogleClientId", "Paste your Google Cloud OAuth 2.0 Web Client ID:", "Google Client ID saved, sir. Say 'connect google account' to sign in."); return;
  }
  if (["check my email", "check emails", "read unread", "read my mail", "check mail"].some((k) => command.includes(k))) { await readUnreadEmails(); return; }
  if (command.includes("pick phone contact") || command.includes("import contact")) { await pickNativePhoneContact(); return; }
  if (command.startsWith("find contact ") || command.startsWith("search contact ")) {
    const c = await lookupGoogleContact(command.replace(/^(find contact|search contact)\s+/, ""));
    if (c) speak(`Contact ${c.name}: ${c.phone ? "phone " + c.phone : ""} ${c.email ? "email " + c.email : ""}`.trim());
    return;
  }

  /* Call, WhatsApp, SMS & Email Dispatch */
  if (command.startsWith("call ")) {
    const target = command.replace("call ", "").trim();
    const digits = target.replace(/[^0-9+]/g, "");
    if (digits.length >= 7) { speakThenOpen(`Dialing ${target}, sir.`, `tel:${digits}`); return; }
    const c = await lookupGoogleContact(target);
    if (c?.phone) speakThenOpen(`Calling ${c.name}, sir.`, `tel:${c.phone.replace(/[^0-9+]/g, "")}`);
    else if (c) speak(`${c.name} does not have a phone number saved, sir.`);
    return;
  }
  if (command.startsWith("whatsapp ")) {
    const [recipient, ...msg] = command.replace("whatsapp ", "").trim().split(" saying ");
    const textParam = msg.length ? `?text=${encodeURIComponent(msg.join(" saying "))}` : "";
    const c = await lookupGoogleContact(recipient);
    if (c?.phone) speakThenOpen(`Opening WhatsApp chat with ${c.name}, sir.`, `https://wa.me/${c.phone.replace(/[^0-9]/g, "")}${textParam}`);
    else openApp("Opening WhatsApp.", "intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=https%3A%2F%2Fwww.whatsapp.com%2F;end");
    return;
  }
  if (/^(send sms to|text|send message to)\s+/.test(command)) {
    const [recipient, ...msg] = command.replace(/^(send sms to|text|send message to)\s+/, "").trim().split(" saying ");
    const body = msg.length ? `?body=${encodeURIComponent(msg.join(" saying "))}` : "";
    const digits = recipient.replace(/[^0-9+]/g, "");
    if (digits.length >= 7) { speakThenOpen(`Opening SMS draft to ${recipient}, sir.`, `sms:${digits}${body}`); return; }
    const c = await lookupGoogleContact(recipient);
    if (c?.phone) speakThenOpen(`Drafting text message to ${c.name}, sir.`, `sms:${c.phone.replace(/[^0-9+]/g, "")}${body}`);
    else if (c) speak(`${c.name} does not have a phone number saved, sir.`);
    return;
  }
  if (/^(send email to|email)\s+/.test(command)) {
    const [recipient, ...subj] = command.replace(/^(send email to|email)\s+/, "").trim().split(" about ");
    const subject = encodeURIComponent(subj.join(" about ") || "Message from J.A.R.V.I.S.");
    if (recipient.includes("@")) { speakThenOpen(`Opening email draft to ${recipient}, sir.`, `mailto:${encodeURIComponent(recipient)}?subject=${subject}`); return; }
    const c = await lookupGoogleContact(recipient);
    if (c?.email) speakThenOpen(`Drafting email to ${c.name}, sir.`, `mailto:${encodeURIComponent(c.email)}?subject=${subject}`);
    else if (c) speak(`${c.name} does not have an email address saved, sir.`);
    return;
  }

  /* Diagnostics, Perimeter Scan, Timer & Keys */
  if (["diagnostic", "system scan", "full scan"].some((k) => command.includes(k))) { await runDiagnosticsProtocol(); return; }
  if (["threat scan", "perimeter", "security scan"].some((k) => command.includes(k))) { await runPerimeterScan(); return; }
  if (command.includes("timer") || command.includes("countdown")) {
    const mins = Number(command.match(/(\d+)\s*minute/)?.[1] || 0);
    const secs = Number(command.match(/(\d+)\s*second/)?.[1] || 0);
    const total = mins * 60 + secs;
    if (total > 0) { startCountdown(total); speak(`Tactical countdown initiated for ${mins ? mins + " minutes" : secs + " seconds"}, sir.`); }
    else speak("Please specify a duration, such as 'set timer for 2 minutes'.");
    return;
  }
  if (command.includes("set gemini key") || command.includes("set api key")) {
    savePromptedKey("jarvisGeminiKey", "Paste your Google AI Studio Gemini API Key:", "Gemini AI key saved locally on this device, sir."); return;
  }
  if (command.includes("remove gemini key") || command.includes("clear api key")) {
    localStorage.removeItem("jarvisGeminiKey"); speak("Gemini AI key removed."); return;
  }

  /* Telemetry, Weather & Memory */
  if (["battery", "power level", "charge level"].some((k) => command.includes(k))) { await checkBatteryStatus(); return; }
  if (command.includes("weather") || command.includes("temperature")) { await checkWeather(); return; }
  if (remember(command)) return;

  /* App & Web Launchers */
  for (const [trigger, [msg, url]] of Object.entries(LAUNCH_ROUTES)) {
    if (command.includes(trigger)) { speakThenOpen(msg, url); return; }
  }

  /* Search & Maps Queries */
  if (command.startsWith("search youtube for")) {
    const q = command.replace("search youtube for", "").trim();
    if (q) speakThenOpen(`Searching YouTube for ${q}`, `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`);
    else speak("What should I search for?");
    return;
  }
  if (command.startsWith("find location")) {
    const p = command.replace("find location", "").trim();
    if (p) speakThenOpen(`Finding ${p} on Google Maps.`, `https://www.google.com/maps/search/${encodeURIComponent(p)}`);
    else speak("Please tell me the location.");
    return;
  }
  if (command.startsWith("search for")) {
    const q = command.replace("search for", "").trim();
    if (q) speakThenOpen(`Searching Google for ${q}`, `https://www.google.com/search?q=${encodeURIComponent(q)}`);
    else speak("Please tell me what to search for.");
    return;
  }

  /* Date & Time */
  if (command.includes("time") || command.includes("date") || command.includes("today's day")) {
    const now = new Date();
    const dStr = now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const tStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (command.includes("time") && command.includes("date")) speak(`Today is ${dStr}, and the current time is ${tStr}, sir.`);
    else if (command.includes("time")) speak(`The current time is ${tStr}, sir.`);
    else speak(`Today's date is ${dStr}, sir.`);
    return;
  }

  /* Math & Wikipedia */
  if (/^(calculate|compute|what is)\s/.test(command) && tryCalculate(command)) return;
  if (/^(who is|what is|define|tell me about)\s+/.test(command)) {
    await askWikipedia(command.replace(/^(who is|what is|define|tell me about)\s+/, "")); return;
  }

  /* Greetings, Jokes & Static Personality Replies */
  if (command === "hi" || command.includes("hello") || command.includes("hi jarvis")) {
    const hr = new Date().getHours();
    const greet = hr < 12 ? "Good morning, sir." : hr < 18 ? "Good afternoon, sir." : hr < 23 ? "Good evening, sir." : "Burning the midnight oil again, sir?";
    speak(`${greet} All tactical systems are online and awaiting your command.`); return;
  }
  if (command.includes("tell me a joke")) {
    const jokes = [
      "I ran a diagnostic on your sleep schedule, sir. The results were classified as a horror story.",
      "Why do programmers prefer dark mode? Because light attracts bugs, sir.",
      "I would tell you a UDP joke, sir, but I cannot guarantee you would get it."
    ];
    speak(jokes[Math.floor(Math.random() * jokes.length)]); return;
  }
  for (const [triggers, reply] of STATIC_REPLIES) {
    if (triggers.some((t) => command.includes(t))) { speak(reply); return; }
  }

  /* Direct Gemini AI Fallback */
  await askGeminiAI(command);
}

/* =========================================================
   9. Speech Recognition, Inline Console & Root Terminal Input
   ========================================================= */
let recognition = null;
let isListening = false;

function resetVoiceState() {
  isListening = false;
  recognition = null;
  core.classList.remove("listening");
  resetOnlineStatus();
  voiceStatusEl.textContent = "STANDBY";
}

function executeDirective(rawText) {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return;
  setHudTexts({ "#heard": clean });
  processCommand(clean);
}

function startJarvis() {
  document.body.classList.remove("paused");
  vibrate(45);
  sfx.playMicEngage();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { $("#cmdInput")?.focus(); return; }
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
  recognition.onresult = (e) => executeDirective(e.results[0][0].transcript);
  recognition.onerror = (e) => { statusEl.textContent = "VOICE ERROR: " + e.error; resetVoiceState(); };
  recognition.onend = resetVoiceState;

  try { recognition.start(); } catch { resetVoiceState(); }
}

core.addEventListener("click", startJarvis);
core.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startJarvis(); } });

$("#cmdForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#cmdInput");
  const val = input?.value.trim();
  if (!val) return;
  sfx.playHudClick();
  input.value = "";
  executeDirective(val);
});

$("#termForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#termInput");
  const val = input?.value.trim();
  if (!val) return;
  sfx.playHudClick();
  input.value = "";
  executeTerminalCommand(val);
});

$("#responseLine")?.addEventListener("click", () => {
  const text = $("#response")?.textContent;
  if (text && navigator.clipboard?.writeText) {
    sfx.playHudClick();
    navigator.clipboard.writeText(text).then(() => {
      voiceStatusEl.textContent = "COPIED";
      window.setTimeout(() => { voiceStatusEl.textContent = isListening ? "ACTIVE" : "STANDBY"; }, 1200);
    }).catch(() => {});
  }
});
