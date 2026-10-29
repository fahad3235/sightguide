// Browser speech synthesis and audio chime assistance.
export function speechAvailable() {
  return typeof window !== "undefined";
}

let audioCtx = null;
let currentBufferSource = null;
let currentAudioEl = null;

// Retain utterances in a Set to prevent Chromium V8 garbage collection mid-speech
if (typeof window !== "undefined") {
  window.__sightguideUtterances = window.__sightguideUtterances || new Set();
}

export function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

let spatialAudioEnabled = true;
let userSpeechRate = 1.0;

export function setSpatialAudio(enabled) {
  spatialAudioEnabled = Boolean(enabled);
}

export function setSpeechRate(rate) {
  if (typeof rate === "number" && rate >= 0.5 && rate <= 2.0) {
    userSpeechRate = rate;
  }
}

export function playChime(type = "ok", position = "center") {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Binaural spatial stereo panning for directional headphone / earbud audio
    let panner = null;
    if (spatialAudioEnabled && typeof ctx.createStereoPanner === "function") {
      try {
        panner = ctx.createStereoPanner();
        if (position === "left") panner.pan.setValueAtTime(-0.80, ctx.currentTime);
        else if (position === "right") panner.pan.setValueAtTime(0.80, ctx.currentTime);
        else panner.pan.setValueAtTime(0.0, ctx.currentTime);
      } catch {}
    }

    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      gain.connect(ctx.destination);
    }
    const now = ctx.currentTime;

    if (type === "alert") {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "agent") {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(780, now + 0.06);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);
      osc.start(now);
      osc.stop(now + 0.10);
    } else {
      osc.frequency.setValueAtTime(587, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {}
}

export function unlockSpeech() {
  if (typeof window === "undefined") return;

  // 1. Resume Web Audio Context if suspended
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  // 2. Resume SpeechSynthesis safely without empty utterance deadlocks
  if ("speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }

  // 3. Prime HTML5 Audio element on mobile touch gesture
  if (!currentAudioEl && typeof Audio !== "undefined") {
    try {
      currentAudioEl = new Audio();
      currentAudioEl.setAttribute("playsinline", "true");
      currentAudioEl.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      currentAudioEl.volume = 0.01;
      const p = currentAudioEl.play();
      if (p !== undefined) {
        p.then(() => {
          currentAudioEl.pause();
          currentAudioEl.volume = 1.0;
        }).catch(() => {});
      }
    } catch {}
  }
}

let cachedEnglishVoice = null;

export function getBestEnglishVoice() {
  if (cachedEnglishVoice) return cachedEnglishVoice;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  // Search specifically for English voices
  const enVoices = voices.filter(v => v.lang && (v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().startsWith("en-") || v.lang.toLowerCase().startsWith("en_")));
  if (!enVoices.length) return null;

  function scoreVoice(v) {
    const name = (v.name || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase();
    let score = 0;

    // Premium natural and neural online voices are the smoothest and most human-sounding
    if (name.includes("natural")) score += 100;
    if (name.includes("neural")) score += 95;
    if (name.includes("online")) score += 40;

    // Top tier realistic vendor voices
    if (name.includes("google") && (name.includes("us") || name.includes("english") || name.includes("uk"))) score += 75;
    if (name.includes("samantha") || name.includes("karen") || name.includes("daniel") || name.includes("moira") || name.includes("tessa")) score += 70;
    if (name.includes("jenny") || name.includes("aria") || name.includes("guy")) score += 65;
    if (name.includes("zira")) score += 30;

    // Penalize robotic / legacy synthetic voices
    if (name.includes("david") || name.includes("mark") || name.includes("hazel") || name.includes("george")) score -= 30;

    // US and UK standard accents
    if (lang === "en-us" || lang === "en_us") score += 20;
    else if (lang === "en-gb" || lang === "en_gb") score += 15;

    if (v.default) score += 5;
    return score;
  }

  const sorted = [...enVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  cachedEnglishVoice = sorted[0] || enVoices[0];
  return cachedEnglishVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedEnglishVoice = null;
    getBestEnglishVoice();
  };
}

let isSpeaking = false;
let currentSpokenText = "";
let pendingSpeech = null;

function emitSpeechEvent(speaking, text = "") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sightguide:speech", { detail: { speaking: Boolean(speaking), text } }));
  }
}

export function getTtsApiBase() {
  try {
    if (typeof window !== "undefined") {
      if (window.__SIGHTGUIDE_API_BASE) {
        return window.__SIGHTGUIDE_API_BASE.trim().replace(/\/+$/, "");
      }
      const stored = localStorage.getItem("sightguide_api_base");
      if (stored) return stored.trim().replace(/\/+$/, "");
      const host = (window.location && window.location.hostname) ? window.location.hostname : "";
      if (host.includes("github.io") || host.includes("netlify.app") || host.includes("pages.dev") || host.includes("vercel.app")) {
        return "https://sightguide.onrender.com";
      }
    }
  } catch {}
  return "";
}

async function playServerAudioTts(text, opts = {}) {
  const base = getTtsApiBase();
  const url = `${base}/api/tts?lang=en&text=${encodeURIComponent(text)}`;

  isSpeaking = true;
  currentSpokenText = text;

  function handleEnd() {
    isSpeaking = false;
    currentSpokenText = "";
    emitSpeechEvent(false);
    if (typeof opts.onEnd === "function") opts.onEnd();
    if (pendingSpeech) {
      const next = pendingSpeech;
      pendingSpeech = null;
      speak(next.text, next.opts);
    }
  }

  // Try HTML5 Audio element first (most reliable on Android & iOS mobile browsers)
  try {
    if (!currentAudioEl && typeof Audio !== "undefined") {
      currentAudioEl = new Audio();
      currentAudioEl.setAttribute("playsinline", "true");
    }
    if (currentAudioEl) {
      currentAudioEl.pause();
      currentAudioEl.currentTime = 0;
      currentAudioEl.src = url;
      currentAudioEl.volume = typeof opts.volume === "number" ? opts.volume : 1.0;
      const playPromise = currentAudioEl.play();
      if (playPromise !== undefined) {
        await playPromise;
        emitSpeechEvent(true, text);
        if (typeof opts.onStart === "function") opts.onStart();
        currentAudioEl.onended = () => {
          handleEnd();
        };
        return true;
      }
    }
  } catch {
    // HTML5 play blocked or delayed, fallback to Web Audio PCM
  }

  // Fallback: Web Audio Context decode
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      const res = await fetch(url);
      if (!res.ok) throw new Error("TTS fetch failed");
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      if (currentBufferSource) {
        try { currentBufferSource.stop(); } catch {}
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentBufferSource = source;

      source.onended = () => {
        if (currentBufferSource === source) currentBufferSource = null;
        handleEnd();
      };

      source.start(0);
      emitSpeechEvent(true, text);
      if (typeof opts.onStart === "function") opts.onStart();
      return true;
    } catch {
      isSpeaking = false;
      currentSpokenText = "";
      emitSpeechEvent(false);
      return false;
    }
  }

  isSpeaking = false;
  currentSpokenText = "";
  emitSpeechEvent(false);
  return false;
}

function executeSpeak(cleanText, opts = {}) {
  isSpeaking = true;
  currentSpokenText = cleanText;
  if (opts.chime && opts.chime !== "none") {
    playChime(opts.chime, opts.position || "center");
  }

  let nativeStarted = false;
  let fallbackTimer = null;

  // Safety watchdog: If native speech does not produce sound within 350ms,
  // seamlessly switch to audio so the phone ALWAYS speaks!
  fallbackTimer = setTimeout(() => {
    if (!nativeStarted && isSpeaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      playServerAudioTts(cleanText, opts);
    }
  }, 350);

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const u = new SpeechSynthesisUtterance(cleanText);
      const enVoice = getBestEnglishVoice();
      if (enVoice) {
        u.voice = enVoice;
        u.lang = enVoice.lang || "en-US";
      } else {
        u.lang = "en-US";
      }

      u.rate = typeof opts.rate === "number" ? opts.rate : userSpeechRate;
      u.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
      u.volume = typeof opts.volume === "number" ? opts.volume : 1.0;

      if (window.__sightguideUtterances) {
        window.__sightguideUtterances.add(u);
      }

      const wordCount = cleanText.split(/\s+/).length;
      const safetyTimeoutMs = Math.max(1800, Math.round((wordCount / 2.0) * 1000) + 1200);
      if (typeof window !== "undefined") {
        clearTimeout(window.__speechSafetyTimer);
        window.__speechSafetyTimer = setTimeout(() => {
          if (isSpeaking && currentSpokenText === cleanText) {
            isSpeaking = false;
            currentSpokenText = "";
            emitSpeechEvent(false);
          }
        }, safetyTimeoutMs);
      }

      u.onstart = () => {
        nativeStarted = true;
        isSpeaking = true;
        emitSpeechEvent(true, cleanText);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        if (typeof opts.onStart === "function") opts.onStart();
      };

      u.onend = () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        if (window.__speechSafetyTimer) clearTimeout(window.__speechSafetyTimer);
        if (window.__sightguideUtterances) window.__sightguideUtterances.delete(u);
        isSpeaking = false;
        currentSpokenText = "";
        emitSpeechEvent(false);
        if (typeof opts.onEnd === "function") opts.onEnd();
        if (pendingSpeech) {
          const next = pendingSpeech;
          pendingSpeech = null;
          speak(next.text, next.opts);
        }
      };

      u.onerror = (err) => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        if (window.__speechSafetyTimer) clearTimeout(window.__speechSafetyTimer);
        if (window.__sightguideUtterances) window.__sightguideUtterances.delete(u);
        isSpeaking = false;
        currentSpokenText = "";
        emitSpeechEvent(false);
        if (err?.error === "canceled" || err?.error === "interrupted") {
          return;
        }
        playServerAudioTts(cleanText, opts);
      };

      window.speechSynthesis.speak(u);
      return true;
    } catch {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      playServerAudioTts(cleanText, opts);
      return true;
    }
  } else {
    if (fallbackTimer) clearTimeout(fallbackTimer);
    playServerAudioTts(cleanText, opts);
    return true;
  }
}

export function speak(text, opts = {}) {
  if (!text || typeof text !== "string") return false;
  const cleanText = text.trim();
  if (!cleanText) return false;

  unlockSpeech();

  // If immediate flag is specified (e.g. stop command, emergency, or fresh new camera analysis):
  if (opts.immediate) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (currentBufferSource) {
      try { currentBufferSource.stop(); currentBufferSource = null; } catch {}
    }
    if (currentAudioEl) {
      try { currentAudioEl.pause(); currentAudioEl.currentTime = 0; } catch {}
    }
    isSpeaking = false;
    currentSpokenText = "";
    pendingSpeech = null;

    // Small 25ms delay allows mobile Android OS TTS service to cycle without swallowing utterance
    setTimeout(() => {
      executeSpeak(cleanText, opts);
    }, 25);
    return true;
  }

  if (isSpeaking) {
    if (cleanText === currentSpokenText || (pendingSpeech && cleanText === pendingSpeech.text)) {
      return true;
    }
    pendingSpeech = { text: cleanText, opts };
    return true;
  }

  return executeSpeak(cleanText, opts);
}

export function stopSpeech() {
  isSpeaking = false;
  currentSpokenText = "";
  pendingSpeech = null;
  emitSpeechEvent(false);

  if (currentBufferSource) {
    try { currentBufferSource.stop(); currentBufferSource = null; } catch {}
  }
  if (currentAudioEl) {
    try { currentAudioEl.pause(); currentAudioEl.currentTime = 0; } catch {}
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.__sightguideUtterances) window.__sightguideUtterances.clear();
    } catch {}
  }
}

export function hasSpeechRecognition() {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createVoiceRecognition({ onStart, onEnd, onResult, onError }) {
  if (!hasSpeechRecognition()) return null;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  try {
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      if (typeof onStart === "function") onStart();
    };
    rec.onend = () => {
      if (typeof onEnd === "function") onEnd();
    };
    rec.onerror = (e) => {
      if (typeof onError === "function") onError(e);
    };
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      if (transcript && typeof onResult === "function") {
        onResult(transcript);
      }
    };

    return {
      start: () => {
        try {
          rec.start();
          return true;
        } catch {
          return false;
        }
      },
      stop: () => {
        try {
          rec.stop();
        } catch {}
      }
    };
  } catch {
    return null;
  }
}
