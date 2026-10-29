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
let isRayBanMode = false;
let currentLanguage = "en";

if (typeof window !== "undefined") {
  try {
    isRayBanMode = localStorage.getItem("sightguide_rayban_mode") === "true";
    currentLanguage = localStorage.getItem("sightguide_lang") || "en";
  } catch {}
}

export function setSpatialAudio(enabled) {
  spatialAudioEnabled = Boolean(enabled);
}

export function setSpeechRate(rate) {
  if (typeof rate === "number" && rate >= 0.5 && rate <= 2.0) {
    userSpeechRate = rate;
  }
}

export function setRayBanMode(enabled) {
  isRayBanMode = Boolean(enabled);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sightguide_rayban_mode", isRayBanMode ? "true" : "false");
    } catch {}
  }
}

export function getRayBanMode() {
  return isRayBanMode;
}

export function setLanguage(lang) {
  currentLanguage = lang || "en";
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sightguide_lang", currentLanguage);
    } catch {}
  }
}

export function getLanguage() {
  return currentLanguage;
}

export function getLangBcp47(lang = currentLanguage) {
  switch (lang) {
    case "es": return "es-ES";
    case "bn": return "bn-BD";
    case "hi": return "hi-IN";
    case "fr": return "fr-FR";
    case "ar": return "ar-SA";
    default: return "en-US";
  }
}

export const TRANSLATIONS = {
  en: {
    ready: "SightGuide is ready. Tap Start Live or Demo Mode.",
    startingCamera: "Starting camera and Meta AI vision.",
    stopped: "Navigation stopped.",
    listening: "Listening. Ask any question.",
    pathClear: "Path clear ahead.",
    standby: "Standby",
    personRight: "Person on your right, keep left.",
    personLeft: "Person on your left, keep right.",
    stepsDown: "Steps down ahead. Slow down.",
    poleLeft: "Pole on left. Keep right.",
    poleRight: "Pole on right. Keep left.",
    vehicleAhead: "Vehicle ahead. Stop.",
    openDrain: "Open drain ahead. Keep left.",
    lowBranch: "Low branch ahead. Caution.",
    sideObstacle: "Side obstacle on left. Keep right.",
    movingPerson: "Moving person on right. Keep left.",
    raybanActive: "Meta Ray-Ban Smart Glasses mode activated. Spatial audio optimized for open-ear frames.",
    raybanOff: "Ray-Ban mode deactivated.",
    pocketModeOn: "Pocket display saver active. Audio navigation continues. Tap anywhere to wake screen.",
    pocketModeOff: "Screen awakened."
  },
  es: {
    ready: "SightGuide está listo. Toque Iniciar en Vivo o Modo Demo.",
    startingCamera: "Iniciando cámara y visión Meta AI.",
    stopped: "Navegación detenida.",
    listening: "Escuchando. Haga su pregunta.",
    pathClear: "Camino despejado hacia adelante.",
    standby: "En espera",
    personRight: "Persona a la derecha, manténgase a la izquierda.",
    personLeft: "Persona a la izquierda, manténgase a la derecha.",
    stepsDown: "Escalones hacia abajo adelante. Disminuya la velocidad.",
    poleLeft: "Poste a la izquierda. Manténgase a la derecha.",
    poleRight: "Poste a la derecha. Manténgase a la izquierda.",
    vehicleAhead: "Vehículo adelante. Deténgase.",
    openDrain: "Drenaje abierto adelante. Manténgase a la izquierda.",
    lowBranch: "Rama baja adelante. Precaución.",
    sideObstacle: "Obstáculo lateral a la izquierda. Manténgase a la derecha.",
    movingPerson: "Persona en movimiento a la derecha. Manténgase a la izquierda.",
    raybanActive: "Modo gafas inteligentes Ray-Ban Meta activado. Audio espacial optimizado para altavoces abiertos.",
    raybanOff: "Modo Ray-Ban desactivado.",
    pocketModeOn: "Ahorro de pantalla para bolsillo activado. Navegación por audio continúa. Toque para despertar.",
    pocketModeOff: "Pantalla reactivada."
  },
  bn: {
    ready: "সাইটগাইড প্রস্তুত। লাইভ শুরু বা ডেমো মোড চাপুন।",
    startingCamera: "ক্যামেরা এবং মেটা এআই ভিশন চালু হচ্ছে।",
    stopped: "ন্যাভিগেশন বন্ধ করা হয়েছে।",
    listening: "শুনছি। যেকোনো প্রশ্ন করুন।",
    pathClear: "সামনের পথ পরিষ্কার।",
    standby: "অপেক্ষারত",
    personRight: "ডানপাশে ব্যক্তি, বামে চলুন।",
    personLeft: "বামপাশে ব্যক্তি, ডানে চলুন।",
    stepsDown: "সামনে নিচের সিঁড়ি। ধীরে চলুন।",
    poleLeft: "বামে খুঁটি। ডানে চলুন।",
    poleRight: "ডানে খুঁটি। বামে চলুন।",
    vehicleAhead: "সামনে যানবাহন। থামুন।",
    openDrain: "সামনে খোলা ড্রেন। বামে চলুন।",
    lowBranch: "সামনে নিচু ডাল। সাবধান।",
    sideObstacle: "বামে পাশের বাধা। ডানে চলুন।",
    movingPerson: "ডানপাশে চলমান ব্যক্তি। বামে চলুন।",
    raybanActive: "মেটা রে-ব্যান স্মার্ট গ্লাস মোড সক্রিয়। ওপেন-ইয়ার স্পিকারের জন্য অডিও অপ্টিমাইজ করা হয়েছে।",
    raybanOff: "রে-ব্যান মোড বন্ধ করা হয়েছে।",
    pocketModeOn: "পকেট ডিসপ্লে সেভার সক্রিয়। অডিও নেভিগেশন চলছে। স্ক্রিন জাগাতে যেকোনো জায়গায় স্পর্শ করুন।",
    pocketModeOff: "স্ক্রিন চালু হয়েছে।"
  },
  hi: {
    ready: "साइटगाइड तैयार है। लाइव शुरू करें या डेमो मोड दबाएं।",
    startingCamera: "कैमरा और मेटा एआई दृष्टि शुरू हो रही है।",
    stopped: "नेविगेशन रोक दिया गया है।",
    listening: "सुन रहा हूँ। कोई भी प्रश्न पूछें।",
    pathClear: "आगे का रास्ता साफ है।",
    standby: "स्टैंडबाय",
    personRight: "दाहिनी ओर व्यक्ति है, बाईं ओर चलें।",
    personLeft: "बाईं ओर व्यक्ति है, दाहिनी ओर चलें।",
    stepsDown: "आगे सीढ़ियाँ हैं। गति धीमी करें।",
    poleLeft: "बाईं ओर खंभा है। दाईं ओर चलें।",
    poleRight: "दाहिनी ओर खंभा है। बाईं ओर चलें।",
    vehicleAhead: "आगे वाहन है। रुकें।",
    openDrain: "आगे खुला नाला है। बाईं ओर चलें।",
    lowBranch: "आगे नीची शाखा है। सावधानी।",
    sideObstacle: "बाईं ओर रुकावट है। दाईं ओर चलें।",
    movingPerson: "दाहिनी ओर चलता हुआ व्यक्ति है। बाईं ओर चलें।",
    raybanActive: "मेटा रे-बैन स्मार्ट ग्लास मोड सक्रिय। ओपन-इयर ऑडियो अनुकूलित।",
    raybanOff: "रे-बैन मोड निष्क्रिय।",
    pocketModeOn: "पॉकेट डिस्प्ले सेवर सक्रिय। ऑडियो नेविगेशन जारी है। स्क्रीन जगाने के लिए कहीं भी टैप करें।",
    pocketModeOff: "स्क्रीन सक्रिय हो गई।"
  },
  fr: {
    ready: "SightGuide est prêt. Touchez Démarrer ou Démo.",
    startingCamera: "Démarrage de la caméra et de la vision Meta AI.",
    stopped: "Navigation arrêtée.",
    listening: "À l'écoute. Posez votre question.",
    pathClear: "Voie libre devant vous.",
    standby: "En attente",
    personRight: "Personne sur votre droite, serrez à gauche.",
    personLeft: "Personne sur votre gauche, serrez à droite.",
    stepsDown: "Marches descendantes devant vous. Ralentissez.",
    poleLeft: "Poteau sur votre gauche. Serrez à droite.",
    poleRight: "Poteau sur votre droite. Serrez à gauche.",
    vehicleAhead: "Véhicule devant vous. Arrêt.",
    openDrain: "Égout ouvert devant. Serrez à gauche.",
    lowBranch: "Branche basse devant. Attention.",
    sideObstacle: "Obstacle latéral à gauche. Serrez à droite.",
    movingPerson: "Personne en mouvement à droite. Serrez à gauche.",
    raybanActive: "Mode lunettes intelligentes Ray-Ban Meta activé. Audio spatial optimisé pour haut-parleurs ouverts.",
    raybanOff: "Mode Ray-Ban désactivé.",
    pocketModeOn: "Économiseur d'écran de poche actif. La navigation audio continue. Touchez pour réveiller.",
    pocketModeOff: "Écran réactivé."
  },
  ar: {
    ready: "سايت جايد جاهز. اضغط لبدء التوجيه المباشر أو التجريبي.",
    startingCamera: "جارٍ تشغيل الكاميرا ورؤية ميتا بالذكاء الاصطناعي.",
    stopped: "تم إيقاف الملاحة.",
    listening: "أنا أستمع. تفضل بسؤالك.",
    pathClear: "الطريق سالك أمامك.",
    standby: "في وضع الاستعداد",
    personRight: "شخص على يمينك، الزم اليسار.",
    personLeft: "شخص على يسارك، الزم اليمين.",
    stepsDown: "درجات نزول للأمام. تمهل.",
    poleLeft: "عمود على يسارك. الزم اليمين.",
    poleRight: "عمود على يمينك. الزم اليسار.",
    vehicleAhead: "مركبة أمامك. توقف.",
    openDrain: "مجرى تصريف مفتوح أمامك. الزم اليسار.",
    lowBranch: "غصن منخفض أمامك. احترس.",
    sideObstacle: "عائق جانبي على اليسار. الزم اليمين.",
    movingPerson: "شخص متحرك على اليمين. الزم اليسار.",
    raybanActive: "تم تفعيل وضع نظارات راي بان ميتا الذكية. صوت مكاني مخصص للسماعات المفتوحة.",
    raybanOff: "تم إيقاف وضع راي بان.",
    pocketModeOn: "توفير بطارية الشاشة في الجيب مفعل. المس أي مكان لإيقاظ الشاشة.",
    pocketModeOff: "تمت إضاءة الشاشة."
  }
};

export function translateGuidance(text, targetLang = currentLanguage) {
  if (!text || targetLang === "en" || !TRANSLATIONS[targetLang]) return text;
  const dict = TRANSLATIONS[targetLang];
  const t = text.trim();
  const lower = t.toLowerCase();

  // 1. Direct match check
  for (const [key, enPhrase] of Object.entries(TRANSLATIONS.en)) {
    if (t === enPhrase || lower === enPhrase.toLowerCase()) {
      return dict[key] || text;
    }
  }

  // 2. Pattern and keyword heuristics
  if (lower.includes("person") && (lower.includes("right") || lower.includes("left"))) {
    return lower.includes("right") ? dict.personRight : dict.personLeft;
  }
  if (lower.includes("step") || lower.includes("stairs")) return dict.stepsDown;
  if (lower.includes("pole")) return lower.includes("left") ? dict.poleLeft : dict.poleRight;
  if (lower.includes("vehicle") || lower.includes("car")) return dict.vehicleAhead;
  if (lower.includes("drain") || lower.includes("hole") || lower.includes("drop")) return dict.openDrain;
  if (lower.includes("branch") || lower.includes("tree")) return dict.lowBranch;
  if (lower.includes("clear") || lower.includes("path")) return dict.pathClear;
  if (lower.includes("stopped")) return dict.stopped;
  if (lower.includes("starting")) return dict.startingCamera;
  if (lower.includes("ready")) return dict.ready;
  if (lower.includes("listening")) return dict.listening;

  return text;
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

    // Ray-Ban Meta Smart Glasses: High-clarity acoustic frequencies (cuts through open-ear temples)
    if (isRayBanMode) {
      if (type === "alert") {
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === "agent") {
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.setValueAtTime(1450, now + 0.06);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);
        osc.start(now);
        osc.stop(now + 0.10);
      } else {
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
      return;
    }

    // Standard Earphone / Phone Speaker Acoustic Profile
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

  // 2. Resume SpeechSynthesis safely and prime voices
  if ("speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Force Chromium/WebKit to load voices into cache on user gesture
      window.speechSynthesis.getVoices();
    } catch {}
  }

  // 3. Prime HTML5 Audio element on touch/pointer gesture
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
let cachedVoices = {};

export function getBestVoiceForLanguage(targetLang = "en") {
  if (cachedVoices[targetLang]) return cachedVoices[targetLang];
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  const prefix = targetLang.toLowerCase();
  const langVoices = voices.filter(v => v.lang && (v.lang.toLowerCase().startsWith(prefix) || v.lang.toLowerCase().replace("_", "-").startsWith(prefix)));
  if (!langVoices.length) {
    return targetLang === "en" ? null : getBestEnglishVoice();
  }

  function scoreVoice(v) {
    const name = (v.name || "").toLowerCase();
    let score = 0;
    if (name.includes("natural")) score += 100;
    if (name.includes("neural")) score += 95;
    if (name.includes("online")) score += 40;
    if (name.includes("google")) score += 75;
    if (v.default) score += 10;
    return score;
  }

  const sorted = [...langVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  cachedVoices[targetLang] = sorted[0] || langVoices[0];
  return cachedVoices[targetLang];
}

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
    cachedVoices = {};
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
  const lang = opts.lang || currentLanguage || "en";
  const localized = (lang !== "en" && !opts.skipTranslate) ? translateGuidance(text, lang) : text;
  const url = `${base}/api/tts?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(localized)}`;

  isSpeaking = true;
  currentSpokenText = localized;

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
        emitSpeechEvent(true, localized);
        if (typeof opts.onStart === "function") opts.onStart();
        currentAudioEl.onended = () => {
          handleEnd();
        };
        currentAudioEl.onerror = () => {
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
      emitSpeechEvent(true, localized);
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
  const lang = opts.lang || currentLanguage || "en";
  const localizedText = (lang !== "en" && !opts.skipTranslate) ? translateGuidance(cleanText, lang) : cleanText;

  isSpeaking = true;
  currentSpokenText = localizedText;
  if (opts.chime && opts.chime !== "none") {
    playChime(opts.chime, opts.position || "center");
  }

  let nativeStarted = false;
  let fallbackTimer = null;

  // Safety watchdog: If native speech does not produce sound within 1500ms and is NOT speaking,
  // seamlessly switch to audio so the user ALWAYS hears speech!
  fallbackTimer = setTimeout(() => {
    if (!nativeStarted && isSpeaking) {
      const isActuallySpeaking = typeof window !== "undefined" && "speechSynthesis" in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
      if (!isActuallySpeaking) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try { window.speechSynthesis.cancel(); } catch {}
        }
        playServerAudioTts(localizedText, { ...opts, skipTranslate: true, lang });
      }
    }
  }, 1500);

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const u = new SpeechSynthesisUtterance(localizedText);
      const voice = getBestVoiceForLanguage(lang);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang || getLangBcp47(lang);
      } else {
        u.lang = getLangBcp47(lang);
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
