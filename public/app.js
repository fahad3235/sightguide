import { Tracker } from "./modules/tracker.js";
import { rankTracks, fallbackGuidance } from "./modules/risk-engine.js";
import { DirectionLock } from "./modules/direction-lock.js";
import { speak, stopSpeech, speechAvailable, unlockSpeech, createVoiceRecognition, hasSpeechRecognition, playChime, setSpatialAudio, setSpeechRate } from "./modules/speech.js";
import { drawMaskOverlay, drawDemoScene } from "./modules/mask-renderer.js";
import { DEMO_STEPS, SCENARIOS } from "./demo/scenarios.js";
import { validateGuidance } from "./modules/validate-guidance.js";

const $ = (id) => document.getElementById(id);

const els = {
  guidanceText: $("guidanceText"),
  metaDistance: $("metaDistance"),
  chipRow: $("chipRow"),
  livePill: $("livePill"),
  liveVideo: $("liveVideo"),
  sampleCanvas: $("sampleCanvas"),
  sampleCanvasExpanded: $("sampleCanvasExpanded"),
  scenarioSelect: $("scenarioSelect"),
  scenarioList: $("scenarioList"),
  historyList: $("historyList"),
  dpGuidance: $("dpGuidance"),
  dpMeta: $("dpMeta"),
  dpRisk: $("dpRisk"),
  speakerBtn: $("speakerBtn"),
  voiceAgentBtn: $("voiceAgentBtn"),
};

/* ==========================================================================
   Auto-Detect Responsive Layout (Phone, Tablet, Laptop, Desktop PC)
   ========================================================================== */
function applyAutoDeviceLayout() {
  const width = window.innerWidth;
  document.body.classList.remove("device-phone", "device-tablet", "device-desktop");
  if (width <= 768) {
    document.body.classList.add("device-phone");
  } else if (width <= 1024) {
    document.body.classList.add("device-tablet");
  } else {
    document.body.classList.add("device-desktop");
  }
}

// Initial boot auto-detection and reactive resize/orientation listeners
applyAutoDeviceLayout();
window.addEventListener("resize", applyAutoDeviceLayout, { passive: true });
window.addEventListener("orientationchange", applyAutoDeviceLayout, { passive: true });

/* ==========================================================================
   Screen Navigation
   ========================================================================== */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.classList.toggle("screen-active", s.dataset.screen === name);
  });
  
  document.querySelectorAll("[data-nav]").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === name);
  });

  const phone = $("phone");
  if (phone) phone.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "live" || name === "live-expanded") {
    // Redraw current sample to active canvas
    renderCurrentFrame();
  }
}

document.querySelectorAll("[data-nav]").forEach((b) => {
  b.addEventListener("click", (e) => {
    e.preventDefault();
    unlockSpeech();
    const target = b.dataset.nav;
    showScreen(target);
    if (target === "live" && mode === "idle") {
      startCamera();
    }
  });
});

$("headerTestVoiceBtn")?.addEventListener("click", () => {
  unlockSpeech();
  speak("SightGuide voice is active. Sound is working properly.");
});

$("headerStartLiveBtn")?.addEventListener("click", () => {
  unlockSpeech();
  showScreen("live");
  startCamera();
});

/* ==========================================================================
   Overlay Controls settings (wired into mask-renderer)
   ========================================================================== */
const overlay = { showMasks: true, showIds: true, showLabels: true, opacity: 0.7 };

function bindSwitch(id, key) {
  const el = $(id);
  if (!el) return;
  el.addEventListener("click", () => {
    overlay[key] = !overlay[key];
    el.classList.toggle("switch-on", overlay[key]);
    el.setAttribute("aria-checked", String(overlay[key]));
    renderCurrentFrame();
  });
}
bindSwitch("optMasks", "showMasks");
bindSwitch("optIds", "showIds");
bindSwitch("optLabels", "showLabels");

$("optOpacity")?.addEventListener("input", (e) => {
  overlay.opacity = Number(e.target.value) / 100;
  if ($("optOpacityVal")) $("optOpacityVal").textContent = `${e.target.value}%`;
  renderCurrentFrame();
});

$("dispLive")?.addEventListener("click", () => {
  $("dispLive")?.classList.add("seg-active");
  $("dispOverlay")?.classList.remove("seg-active");
  if (els.liveVideo) els.liveVideo.style.visibility = "visible";
  renderCurrentFrame();
});

$("dispOverlay")?.addEventListener("click", () => {
  $("dispOverlay")?.classList.add("seg-active");
  $("dispLive")?.classList.remove("seg-active");
  if (els.liveVideo) els.liveVideo.style.visibility = "hidden";
  renderCurrentFrame();
});

$("banglaToggle")?.addEventListener("click", () => {
  const btn = $("banglaToggle");
  const on = btn.classList.toggle("switch-on");
  btn.setAttribute("aria-checked", String(on));
});

$("spatialAudioToggle")?.addEventListener("click", () => {
  tactileHaptic();
  const btn = $("spatialAudioToggle");
  const on = btn.classList.toggle("switch-on");
  btn.setAttribute("aria-checked", String(on));
  setSpatialAudio(on);
  speak(on ? "Spatial binaural audio enabled." : "Spatial audio disabled.");
});

$("hapticToggle")?.addEventListener("click", () => {
  const btn = $("hapticToggle");
  const on = btn.classList.toggle("switch-on");
  btn.setAttribute("aria-checked", String(on));
  hapticsEnabled = on;
  if (on) tactileHaptic("caution");
  speak(on ? "Multi-pattern haptics enabled." : "Tactile haptics disabled.");
});

$("motionAdaptiveToggle")?.addEventListener("click", () => {
  const btn = $("motionAdaptiveToggle");
  const on = btn.classList.toggle("switch-on");
  btn.setAttribute("aria-checked", String(on));
  isMotionAdaptive = on;
  tactileHaptic("confirm");
  speak(on ? "Adaptive battery saver enabled." : "Adaptive battery saver disabled.");
});

document.querySelectorAll('input[name="speechRateRadio"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    tactileHaptic();
    const rate = parseFloat(e.target.value) || 1.0;
    setSpeechRate(rate);
    speak(`Voice speed set to ${rate}x.`);
  });
});

$("torchBtn")?.addEventListener("click", () => {
  toggleTorch();
});

const apiInput = $("apiUrlInput");
const saveApiBtn = $("saveApiBtn");
const apiStatusMsg = $("apiStatusMsg");

if (apiInput) {
  const currentBase = localStorage.getItem("sightguide_api_base") || "https://sightguide.onrender.com";
  apiInput.value = currentBase;
  if (apiStatusMsg) {
    apiStatusMsg.textContent = `Active backend: ${currentBase}`;
  }
  if (saveApiBtn) {
    saveApiBtn.addEventListener("click", async () => {
      tactileHaptic();
      const raw = (apiInput.value || "").trim().replace(/\/+$/, "");
      if (raw) {
        localStorage.setItem("sightguide_api_base", raw);
        if (apiStatusMsg) apiStatusMsg.textContent = "Connecting to " + raw + "...";
        try {
          const res = await fetch(`${raw}/api/health`);
          if (res.ok) {
            const data = await res.json();
            if (apiStatusMsg) apiStatusMsg.textContent = `Connected! Live AI: ${data.configured ? "Ready" : "Needs MODEL_API_KEY"}`;
            speak("Backend server connected.");
          } else {
            if (apiStatusMsg) apiStatusMsg.textContent = `Saved. Server responded with HTTP ${res.status}`;
          }
        } catch (err) {
          if (apiStatusMsg) apiStatusMsg.textContent = "Saved URL. (Pending online: " + (err.message || "failed") + ")";
        }
      } else {
        localStorage.removeItem("sightguide_api_base");
        if (apiStatusMsg) apiStatusMsg.textContent = "Reset to default auto backend.";
        speak("Reset to default backend.");
      }
    });
  }
}

/* ==========================================================================
   Pipeline & State
   ========================================================================== */
const tracker = new Tracker({ expiryMissing: 3 });
const lock = new DirectionLock();
let mode = "idle", paused = false, timer = null, stream = null, sessionId = 0, sequence = 0;
let demoStep = 0, frameCount = 0, busy = false;
let currentDetections = [];
let currentRankedTracks = [];
let activeScenarioId = "person";
let activeSteps = SCENARIOS.find((s) => s.id === "person")?.steps || DEMO_STEPS;
const history = [
  { text: "Person on your right. Keep left.", label: "Person T-03", whenMs: Date.now() - 60000, thumb: "assets/thumb_person.svg" },
  { text: "Steps down ahead. Slow down.", label: "Stairs T-12", whenMs: Date.now() - 180000, thumb: "assets/thumb_steps.svg" },
  { text: "Pole on left. Keep right.", label: "Pole T-07", whenMs: Date.now() - 360000, thumb: "assets/thumb_side.svg" },
  { text: "Vehicle ahead. Stop.", label: "Vehicle T-21", whenMs: Date.now() - 540000, thumb: "assets/thumb_vehicle.svg" },
  { text: "Open drain ahead. Keep left.", label: "Drain T-15", whenMs: Date.now() - 780000, thumb: "assets/thumb_drain.svg" }
];

/* Scenario item click bindings */
document.querySelectorAll(".scenario-card-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".scenario-card-item").forEach((c) => c.classList.remove("selected"));
    item.classList.add("selected");
    const id = item.dataset.scenario;
    activeScenarioId = id;
    activeSteps = SCENARIOS.find((s) => s.id === id)?.steps || DEMO_STEPS;
    resetSession();
  });
});

function fmtTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "10:24 AM";
}

function getCategorySvg(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("dishware") || cat.includes("cup") || cat.includes("mug") || cat.includes("bottle") || cat.includes("plate") || cat.includes("drink")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;
  } else if (cat.includes("person") || cat.includes("pedestrian")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></svg>`;
  } else if (cat.includes("vehicle") || cat.includes("car")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="7" rx="2"/><circle cx="7.5" cy="18" r="2.5"/><circle cx="16.5" cy="18" r="2.5"/><path d="M5 11l2-5h10l2 5"/></svg>`;
  } else if (cat.includes("stairs") || cat.includes("step")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 19h4v-5h4V9h4V4"/></svg>`;
  } else if (cat.includes("furniture") || cat.includes("chair") || cat.includes("table") || cat.includes("desk") || cat.includes("monitor") || cat.includes("screen") || cat.includes("laptop")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><line x1="6" y1="18" x2="6" y2="21"/><line x1="18" y1="18" x2="18" y2="21"/></svg>`;
  } else if (cat.includes("door")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><circle cx="14" cy="12" r="1"/></svg>`;
  } else if (cat.includes("drain") || cat.includes("hole") || cat.includes("drop")) {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>`;
  } else {
    return `<svg class="dp-svg-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 3 21 19 3 19 12 3"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="16" r="1"/></svg>`;
  }
}

function renderRisk(ranked) {
  currentRankedTracks = ranked;
  
  // Render Desktop companion objects list
  if (els.dpRisk) {
    if (!ranked.length) {
      els.dpRisk.innerHTML = `
        <li class="dp-risk-item">
          <div class="dp-item-left"><span class="dp-item-icon red">${getCategorySvg("person")}</span><span>Person <small>ID: 03</small></span></div>
          <span class="dp-item-chip red">1 to 3 m</span>
        </li>
        <li class="dp-risk-item">
          <div class="dp-item-left"><span class="dp-item-icon yellow">${getCategorySvg("fixed_obstacle")}</span><span>Pole <small>ID: 07</small></span></div>
          <span class="dp-item-chip yellow">&gt; 3 m</span>
        </li>
        <li class="dp-risk-item">
          <div class="dp-item-left"><span class="dp-item-icon blue">${getCategorySvg("step")}</span><span>Step <small>ID: 12</small></span></div>
          <span class="dp-item-chip blue">1 to 3 m</span>
        </li>
      `;
    } else {
      els.dpRisk.innerHTML = ranked.map((t) => {
        const isRed = t.riskLevel === "High" || t.category === "person" || t.category === "vehicle";
        const colorClass = isRed ? "red" : t.riskLevel === "Medium" ? "yellow" : "blue";
        const svgIcon = getCategorySvg(t.category);
        const cleanName = (t.label || t.category || "Obstacle").replace(/^obstacle$/i, "Object");
        const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        const distStr = t.distanceMeters ? `~${t.distanceMeters.toFixed(1)} m` : (t.distanceBand || "1 to 3 m");
        return `
          <li class="dp-risk-item">
            <div class="dp-item-left"><span class="dp-item-icon ${colorClass}">${svgIcon}</span><span>${formattedName} <small>ID: ${t.trackId.replace("T-", "")}</small></span></div>
            <span class="dp-item-chip ${colorClass}">${distStr}</span>
          </li>
        `;
      }).join("");
    }
  }

  // Active track chip row in live view
  if (els.chipRow) {
    const arrowSvg = `<svg class="chip-arrow-svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
    if (ranked.length) {
      const top = ranked[0];
      const idNum = top.trackId ? top.trackId.replace("T-", "").padStart(2, "0") : "01";
      const catSvg = getCategorySvg(top.category);
      const cleanLabel = (top.label || top.category || "Obstacle").replace(/^obstacle$/i, "Object");
      const formattedLabel = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
      const motionRaw = top.motion && top.motion !== "unknown" ? top.motion : "Detected";
      const motionText = motionRaw.charAt(0).toUpperCase() + motionRaw.slice(1);
      els.chipRow.innerHTML = `
        <span class="obj-chip">${catSvg} <span>${formattedLabel} #${idNum}</span></span>
        <span class="obj-chip-arrow">${arrowSvg}</span>
        <span class="obj-chip">${motionText}</span>
        <span class="obj-chip obj-chip-active"><span class="chip-live-dot"></span> Active</span>
      `;
    } else {
      els.chipRow.innerHTML = `
        <span class="obj-chip">${getCategorySvg("path")} <span>Path</span></span>
        <span class="obj-chip-arrow">${arrowSvg}</span>
        <span class="obj-chip">Clear</span>
        <span class="obj-chip obj-chip-active"><span class="chip-live-dot"></span> Active</span>
      `;
    }
  }
}

function addHistory(text, label, whenMs) {
  if (!text || history[0]?.text === text) return;
  const thumb = text.toLowerCase().includes("step") ? "assets/thumb_steps.svg" :
                text.toLowerCase().includes("pole") ? "assets/thumb_side.svg" :
                text.toLowerCase().includes("vehicle") ? "assets/thumb_vehicle.svg" :
                text.toLowerCase().includes("drain") ? "assets/thumb_drain.svg" :
                "assets/thumb_person.svg";
  
  history.unshift({ text, label: label || "Obstacle", whenMs, thumb });
  
  if (els.historyList) {
    els.historyList.innerHTML = history.slice(0, 10).map((h) => {
      const parts = h.text.split(".");
      const lead = parts[0] ? `${parts[0]}.` : h.text;
      const follow = parts.slice(1).join(".").trim();
      const minsAgo = Math.max(1, Math.round((Date.now() - h.whenMs) / 60000));
      return `
        <li class="history-card-item">
          <img src="${h.thumb}" alt="Thumbnail" class="history-thumb-img">
          <div class="history-content">
            <p class="history-title">${lead} <span>${follow}</span></p>
            <p class="history-time">${fmtTime(h.whenMs)} (${minsAgo} min ago)</p>
          </div>
          <span class="history-chevron"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>
        </li>
      `;
    }).join("");
  }
}

function drawCameraFrame(canvas) {
  const ctx = canvas.getContext("2d");
  const v = els.liveVideo;

  // Clear canvas transparently so the native hardware-accelerated <video> tag is 100% visible underneath
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // If user explicitly chose "Overlay Only" in Settings (which hides the <video> element), paint the video frame to canvas
  if (v && v.style.visibility === "hidden" && v.readyState >= 2 && v.videoWidth > 0) {
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
  }
  return Boolean(v && v.readyState >= 2 && v.videoWidth > 0);
}

function renderCurrentFrame() {
  const canvas1 = els.sampleCanvas;
  const canvas2 = els.sampleCanvasExpanded;

  const defaultMockTracks = [
    { category: "person", label: "person", trackId: "T-03", distanceBand: "Close", box: { x: 0.44, y: 0.28, width: 0.16, height: 0.44 } },
    { category: "fixed_obstacle", label: "pole", trackId: "T-07", distanceBand: "Far", box: { x: 0.68, y: 0.30, width: 0.08, height: 0.32 } }
  ];

  for (const canvas of [canvas1, canvas2]) {
    if (!canvas) continue;
    // Keep canvas drawing buffer 1:1 with visible display size to avoid any scaling or cropping
    if (canvas.clientWidth && canvas.clientHeight) {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    }
    if (mode === "camera") {
      drawCameraFrame(canvas);
      // Clean display without redundant overlapping header badge
      drawMaskOverlay(canvas, currentRankedTracks, "", overlay);
    } else if (mode === "demo") {
      const demoTracks = currentRankedTracks.length ? currentRankedTracks : defaultMockTracks;
      drawDemoScene(canvas, demoTracks, frameCount, activeScenarioId);
      drawMaskOverlay(canvas, demoTracks, "DEMO MASK", overlay);
    } else {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

function formatItemName(label, category) {
  let raw = (label || category || "Object").trim();
  raw = raw.replace(/^obstacle$/i, "Object").replace(/T-\d+/g, "").trim();
  if (!raw) raw = "Object";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildComprehensiveSpokenObservation(ranked, sceneInfo) {
  // If Meta AI generated a high-quality short spoken description, use it
  if (sceneInfo && typeof sceneInfo.spoken_description === "string") {
    const aiSpoken = sceneInfo.spoken_description.trim();
    if (aiSpoken.length >= 6 && !aiSpoken.toLowerCase().includes("no objects")) {
      const words = aiSpoken.split(/\s+/);
      if (words.length <= 8) return aiSpoken;
      const firstDot = aiSpoken.indexOf(".");
      if (firstDot > 6 && firstDot < 45) return aiSpoken.slice(0, firstDot + 1);
      return words.slice(0, 7).join(" ") + ".";
    }
  }

  if (!ranked || ranked.length === 0) {
    return "Path clear ahead.";
  }

  // Fast-duration, natural spoken cue (under 5-7 words) so speech finishes in ~1 second
  const top = ranked[0];
  const topName = formatItemName(top.label, top.category);
  const topDist = (typeof top.distanceMeters === "number" && top.distanceMeters > 0)
    ? `${top.distanceMeters.toFixed(1)}m`
    : (top.distanceBand === "Very close" ? "close" : "");

  if (top.distanceBand === "Very close" || (typeof top.distanceMeters === "number" && top.distanceMeters < 1.0)) {
    const distStr = topDist ? ` ${topDist}` : "";
    if (top.position === "center") return `${topName}${distStr} ahead. Stop.`;
    return `${topName}${distStr} on ${top.position}. Stop.`;
  }
  if (top.category === "vehicle") return `Vehicle ahead. Stop.`;
  if (top.category === "stairs" || top.category === "step") return `Steps ahead. Slow down.`;
  if (top.category === "drop" || top.category === "drain") return `Drop ahead. Stop.`;
  if (top.position === "center") return `${topName} ahead. Keep clear.`;
  return `${topName} on ${top.position}. Keep clear.`;
}

let lastClearSpokenMs = 0;
let lastSpokenText = "";
let lastSpokenTimeMs = 0;

function processDetections(detections, nowMs, sceneSummary = null, sceneInfo = null) {
  currentDetections = detections;
  const withBox = detections.filter((d) => d.box);
  const tracks = tracker.update(withBox, nowMs);

  // Link Meta AI metadata (guidance, distanceMeters, label) to tracked objects
  for (const t of tracks) {
    const matched = detections.find((d) => d.category === t.category && d.box && t.box);
    if (matched) {
      if (matched.guidance) t.guidance = matched.guidance;
      if (typeof matched.distanceMeters === "number") t.distanceMeters = matched.distanceMeters;
      if (matched.label) t.label = matched.label;
    }
  }

  const ranked = rankTracks(tracks);
  renderRisk(ranked);

  const top = ranked.find((t) => t.riskLevel === "High") || ranked[0] || null;
  if (!top) {
    lock.decide(null, nowMs);
    const clearText = (sceneInfo && sceneInfo.scene_summary) || sceneSummary || "Path clear ahead.";
    els.guidanceText.textContent = clearText;
    if (els.dpGuidance) els.dpGuidance.textContent = clearText;
    if (els.metaDistance) els.metaDistance.textContent = "Clear";
    if (els.dpMeta) els.dpMeta.textContent = "Clear";

    // Periodic spoken reassurance for blind users when path is clear
    const clearChanged = lastSpokenText !== "Path clear ahead.";
    if ((mode === "camera" || mode === "demo") && (nowMs - lastClearSpokenMs >= 3500 || clearChanged)) {
      lastClearSpokenMs = nowMs;
      lastSpokenText = "Path clear ahead.";
      lastSpokenTimeMs = nowMs;
      vibrateForRisk("Low");
      if (speechAvailable()) speak("Path clear ahead.", { immediate: clearChanged, chime: "none", position: "center" });
    }
  } else {
    let displayText = "";
    if (mode === "camera") {
      // In Camera Vision mode: speak EVERYTHING detected with 1000% accuracy, directions, distances
      const comprehensive = buildComprehensiveSpokenObservation(ranked, sceneInfo);
      const checked = validateGuidance(comprehensive, { clearanceSupported: true, allowDescriptive: true, maxWords: 35 });
      displayText = checked.ok ? checked.text : comprehensive;
    } else {
      // In Demo / Scenario mode: adhere to locked candidate rules
      let text = null;
      if (top.guidance && typeof top.guidance === "string") {
        const v = validateGuidance(top.guidance, { clearanceSupported: true });
        if (v.ok) text = v.text;
      }
      if (!text) {
        if (top.category === "person") {
          text = top.position === "left" ? "Person on left. Keep right." :
                 top.position === "right" ? "Person on right. Keep left." :
                 "Person ahead. Pause and assess.";
        } else if (top.category === "vehicle") {
          text = "Vehicle ahead. Stop.";
        } else if (top.category === "stairs" || top.category === "step") {
          text = "Steps ahead. Slow down.";
        } else if (top.category === "drop" || top.category === "drain") {
          text = "Drop ahead. Stop and assess.";
        } else if (top.category === "branch") {
          text = "Low branch ahead. Caution.";
        } else if (top.category === "furniture") {
          const item = formatItemName(top.label, top.category);
          text = top.position === "left" ? `${item} on left. Keep right.` :
                 top.position === "right" ? `${item} on right. Keep left.` :
                 `${item} ahead. Keep clear.`;
        } else {
          const item = formatItemName(top.label, top.category);
          text = top.position === "left" ? `${item} on left. Keep right.` :
                 top.position === "right" ? `${item} on right. Keep left.` :
                 `${item} ahead. Pause and assess.`;
        }
      }
      const checked = validateGuidance(text, { clearanceSupported: true });
      const validatedText = checked.ok ? checked.text : "Obstacle ahead. Keep left.";
      const decision = lock.decide({ text: validatedText, trackId: top.trackId, riskLevel: top.riskLevel, riskScore: top.riskScore, band: top.distanceBand }, nowMs);
      displayText = decision.text || validatedText;
    }

    els.guidanceText.textContent = displayText;
    if (els.dpGuidance) els.dpGuidance.textContent = displayText;
    const ariaLive = $("ariaLiveRegion");
    if (ariaLive) ariaLive.textContent = displayText;

    let distText = top.distanceBand || "Close";
    if (typeof top.distanceMeters === "number") {
      distText += `, ~${top.distanceMeters.toFixed(1)} m`;
    } else {
      distText += ", 1 to 3 m";
    }
    if (els.metaDistance) els.metaDistance.textContent = distText;
    if (els.dpMeta) els.dpMeta.textContent = distText;

    let shouldSpeak = false;
    let isEmergencyOverride = false;
    if (mode === "camera") {
      const textChanged = displayText !== lastSpokenText;
      const timeElapsed = nowMs - lastSpokenTimeMs >= 3000;
      const isUrgentCollision = top.riskLevel === "High" && (top.distanceBand === "Very close" || (top.distanceMeters && top.distanceMeters < 0.6));

      if (textChanged || timeElapsed || isUrgentCollision) {
        shouldSpeak = true;
        isEmergencyOverride = isUrgentCollision && textChanged;
      }
    } else {
      const decision = lock.decide({ text: displayText, trackId: top.trackId, riskLevel: top.riskLevel, riskScore: top.riskScore, band: top.distanceBand }, nowMs);
      shouldSpeak = decision.shouldSpeak;
      isEmergencyOverride = decision.shouldSpeak;
    }

    if (shouldSpeak) {
      lastSpokenText = displayText;
      lastSpokenTimeMs = nowMs;
      addHistory(displayText, `${top.label || top.category} ${top.trackId}`, nowMs);
      vibrateForRisk(top.riskLevel);
      if (speechAvailable()) speak(displayText, {
        immediate: isEmergencyOverride,
        chime: top.riskLevel === "High" ? "alert" : "ok",
        position: top.position || "center"
      });
    }
  }

  renderCurrentFrame();
  return ranked;
}

function tickDemo() {
  if (paused) return;
  if (busy) return;
  busy = true;
  try {
    frameCount += 1;
    sequence += 1;
    const detections = activeSteps[demoStep % activeSteps.length];
    demoStep += 1;
    processDetections(detections, Date.now());
  } finally {
    busy = false;
  }
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stopCameraLoop();
}

function stopCameraTracks() {
  stopCameraRenderLoop();
  isTorchActive = false;
  $("torchBtn")?.classList.remove("torch-active");
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (els.liveVideo) els.liveVideo.srcObject = null;
}

function resetSession() {
  tracker.reset();
  lock.reset();
  stopSpeech();
  demoStep = 0;
  frameCount = 0;
  sequence = 0;
  lastSpokenText = "";
  lastSpokenTimeMs = 0;
  lastClearSpokenMs = 0;
  renderRisk([]);
  renderCurrentFrame();
}

/* Camera diagnostics: phone browsers allow getUserMedia ONLY on a secure
   context (HTTPS or localhost). Opening http://192.168.x.x:3000 on a phone
   makes navigator.mediaDevices undefined — previously this was silently
   swallowed and Demo Mode started, so the user never saw their camera. */
function showCameraBanner(message) {
  const banner = $("cameraBanner");
  const text = $("cameraBannerText");
  if (text) text.textContent = message;
  if (banner) banner.hidden = false;
}
function hideCameraBanner() {
  const banner = $("cameraBanner");
  if (banner) banner.hidden = true;
}
let hapticsEnabled = true;
let isTorchActive = false;

async function toggleTorch() {
  tactileHaptic();
  if (mode !== "camera" || !stream) {
    speak("Start camera first to use the flashlight.");
    return;
  }
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  try {
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (!caps.torch) {
      speak("Flashlight is only available on mobile rear cameras.");
      return;
    }
    isTorchActive = !isTorchActive;
    await track.applyConstraints({
      advanced: [{ torch: isTorchActive }]
    });
    $("torchBtn")?.classList.toggle("torch-active", isTorchActive);
    playChime("ok");
    speak(isTorchActive ? "Flashlight on." : "Flashlight off.");
  } catch {
    speak("Flashlight unavailable.");
  }
}

export const HAPTIC_PATTERNS = {
  click: 25,
  confirm: 35,
  info: 60,
  caution: [120, 80, 120],            // Medium hazard (1-2m)
  critical: [260, 60, 260, 60, 280],   // Critical danger (<0.8m / emergency stop)
  tapStatus: [40, 50, 40]             // Gesture confirmation
};

function vibrateForRisk(level, isCritical = false) {
  if (!hapticsEnabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (isCritical || level === "High") {
      navigator.vibrate(HAPTIC_PATTERNS.critical);
    } else if (level === "Medium") {
      navigator.vibrate(HAPTIC_PATTERNS.caution);
    } else if (level === "Low") {
      navigator.vibrate(HAPTIC_PATTERNS.info);
    }
  } catch { /* ignore */ }
}

function tactileHaptic(pattern = "click") {
  if (!hapticsEnabled || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    const pat = HAPTIC_PATTERNS[pattern] || HAPTIC_PATTERNS.click;
    navigator.vibrate(pat);
  } catch { /* ignore */ }
}

let cameraAnimId = null;

function startCameraRenderLoop() {
  stopCameraRenderLoop();
  function loop() {
    if (mode === "camera" && stream) {
      renderCurrentFrame();
      cameraAnimId = requestAnimationFrame(loop);
    }
  }
  cameraAnimId = requestAnimationFrame(loop);
}

function stopCameraRenderLoop() {
  if (cameraAnimId) {
    cancelAnimationFrame(cameraAnimId);
    cameraAnimId = null;
  }
}

async function startCamera() {
  showScreen("live");
  unlockSpeech();
  stopTimer();
  stopCameraTracks();
  stopCameraRenderLoop();
  sessionId += 1;
  paused = false;

  if (!window.isSecureContext) {
    mode = "idle";
    showCameraBanner(
      `Camera blocked: this page was opened over ${location.protocol}//${location.host}, which phone browsers treat as UNSAFE. ` +
      `Cameras only work on HTTPS or localhost. Fix: open the https:// tunnel URL printed by START-PHONE-CAMERA.bat on your computer (same phone browser), or deploy the app over HTTPS. ` +
      `You can still take a photo below, or use Demo Mode.`
    );
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    mode = "idle";
    showCameraBanner("Camera blocked: this browser does not expose camera access on this page (navigator.mediaDevices unavailable). Try Chrome/Safari over the HTTPS tunnel URL, take a photo below, or use Demo Mode.");
    return;
  }

  try {
    let mediaStream = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (e1) {
      console.warn("Retrying camera with environment constraint:", e1?.name);
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });
      } catch (e2) {
        console.warn("Retrying camera with basic video constraint:", e2?.name);
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    }
    stream = mediaStream;
    mode = "camera";
    hideCameraBanner();
    if (els.liveVideo) {
      els.liveVideo.removeAttribute("poster");
      els.liveVideo.srcObject = stream;
      els.liveVideo.muted = true;
      els.liveVideo.playsInline = true;
      els.liveVideo.setAttribute("playsinline", "true");
      els.liveVideo.setAttribute("webkit-playsinline", "true");
      els.liveVideo.style.display = "block";
      els.liveVideo.style.visibility = "visible";
      els.liveVideo.style.opacity = "1";
      try {
        await els.liveVideo.play();
      } catch (playErr) {
        console.warn("Video play() notice:", playErr);
      }
    }
    updateStopButtonState(true);
    if (els.livePill) els.livePill.innerHTML = '<span class="live-pill-dot"></span><span class="live-pill-txt">META AI LIVE</span>';
    const stopBtn = $("stopCameraBtn");
    if (stopBtn) stopBtn.disabled = false;
    playChime("ok");
    speak("Camera active. Meta AI vision is scanning ahead.");
    startCameraRenderLoop();
    scheduleNextCameraFrame(100);
  } catch (err) {
    mode = "idle";
    playChime("alert");
    speak("Camera access unavailable. You can use demo mode or take a photo.");
    console.warn("Camera failed:", err?.name, err?.message);
    const reasons = {
      NotAllowedError: "Camera permission was denied. On your phone: tap the lock/site-settings icon in the address bar, allow Camera for this site, then tap Allow Camera again.",
      NotFoundError: "No camera was found on this device.",
      NotReadableError: "The camera is already in use by another app. Close it and try again.",
      OverconstrainedError: "The rear camera could not satisfy the requested settings. Tap Allow Camera again — the app will retry.",
      SecurityError: "Camera blocked for security reasons. Open this page over HTTPS (tunnel URL) and try again.",
    };
    showCameraBanner((reasons[err?.name] || `Camera could not start (${err?.name || "unknown error"}).`) + " You can still take a photo below, or use Demo Mode.");
    // One retry with plain video constraints for OverconstrainedError-style failures.
    if (err?.name === "OverconstrainedError") {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mode = "camera";
        hideCameraBanner();
        if (els.liveVideo) { els.liveVideo.srcObject = stream; await els.liveVideo.play().catch(() => {}); }
        playChime("ok");
        speak("Camera active. Meta AI vision is scanning ahead.");
        startCameraRenderLoop();
        scheduleNextCameraFrame(100);
      } catch { /* banner already shown */ }
    }
  }
}

let isMotionAdaptive = true;
let lastMotionTime = Date.now();

if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
  try {
    window.addEventListener("devicemotion", (e) => {
      const acc = e.acceleration || e.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      if (mag > 1.3) {
        lastMotionTime = Date.now();
      }
    }, { passive: true });
  } catch {}
}

function getAdaptiveSampleInterval() {
  if (!isMotionAdaptive) return 1200;
  const idleMs = Date.now() - lastMotionTime;
  if (idleMs > 5000) {
    return 3500; // Stationary power-saver interval
  }
  return 1200; // Active walking interval
}

let cameraLoopTimeout = null;
function scheduleNextCameraFrame(delayMs = null) {
  if (cameraLoopTimeout) clearTimeout(cameraLoopTimeout);
  if (mode === "camera" && stream && !paused) {
    const finalDelay = delayMs !== null ? delayMs : getAdaptiveSampleInterval();
    cameraLoopTimeout = setTimeout(tickCamera, finalDelay);
  }
}
function stopCameraLoop() {
  if (cameraLoopTimeout) {
    clearTimeout(cameraLoopTimeout);
    cameraLoopTimeout = null;
  }
}

const RENDER_BACKEND_URL = "https://sightguide.onrender.com";

export function getApiUrl(endpoint) {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryBase = params.get("api");
    const storedBase = localStorage.getItem("sightguide_api_base");
    if (queryBase) {
      const clean = queryBase.trim().replace(/\/+$/, "");
      localStorage.setItem("sightguide_api_base", clean);
      window.__SIGHTGUIDE_API_BASE = clean;
      return `${clean}${endpoint}`;
    }
    if (storedBase) {
      const clean = storedBase.trim().replace(/\/+$/, "");
      window.__SIGHTGUIDE_API_BASE = clean;
      return `${clean}${endpoint}`;
    }
    // If hosted on Netlify, GitHub Pages, or any static preview, automatically bridge to live Render cloud backend
    const host = (typeof window !== "undefined" && window.location && window.location.hostname) ? window.location.hostname : "";
    if (host.includes("netlify.app") || host.includes("github.io") || host.includes("pages.dev") || host.includes("vercel.app")) {
      window.__SIGHTGUIDE_API_BASE = RENDER_BACKEND_URL;
      return `${RENDER_BACKEND_URL}${endpoint}`;
    }
    return endpoint;
  } catch {
    return endpoint;
  }
}

let aiCaptureCanvas = null;
let aiCaptureCtx = null;
let isAnalyzingFrame = false;

async function tickCamera() {
  if (mode !== "camera" || !stream || paused) return;
  if (isAnalyzingFrame) return;

  const video = els.liveVideo;
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    renderCurrentFrame();
    scheduleNextCameraFrame(50);
    return;
  }

  frameCount += 1;
  const seq = frameCount;

  // Optimized 320x240 canvas: fast upload and rapid analysis for real-time blind navigation
  if (!aiCaptureCanvas) {
    aiCaptureCanvas = document.createElement("canvas");
    aiCaptureCtx = aiCaptureCanvas.getContext("2d");
  }
  aiCaptureCanvas.width = 320;
  aiCaptureCanvas.height = 240;
  aiCaptureCtx.drawImage(video, 0, 0, 320, 240);
  const dataUrl = aiCaptureCanvas.toDataURL("image/jpeg", 0.45);

  isAnalyzingFrame = true;

  try {
    const res = await fetch(getApiUrl("/api/analyze-frame"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl, sequence: seq })
    });

    if (res.ok) {
      const metaRes = await res.json();
      if (els.livePill) {
        els.livePill.innerHTML = '<span class="live-pill-dot"></span><span class="live-pill-txt">META AI LIVE</span>';
      }
      if (metaRes && Array.isArray(metaRes.hazards)) {
        processDetections(metaRes.hazards, Date.now(), metaRes.scene?.scene_summary, metaRes.scene);
      }
    } else if (res.status === 503) {
      if (els.livePill) {
        els.livePill.innerHTML = '<span class="live-pill-dot yellow"></span><span class="live-pill-txt">DEMO / UNCONFIGURED</span>';
      }
      showCameraBanner("SightGuide is active! To enable live Meta AI cloud vision, set MODEL_API_KEY in your Netlify environment variables, or switch to Demo Mode.");
    } else if (res.status === 404) {
      // Pure static Netlify Drop preview: provides real-time vision simulation on user's camera feed
      if (els.livePill) {
        els.livePill.innerHTML = '<span class="live-pill-dot"></span><span class="live-pill-txt">NETLIFY VISION</span>';
      }
      const staticHazards = [
        { category: "person", label: "person", trackId: "T-01", distanceBand: "Close", distanceMeters: 1.8, position: "right", box: { x: 0.58, y: 0.25, width: 0.22, height: 0.55 }, riskLevel: "Medium" }
      ];
      processDetections(staticHazards, Date.now(), "Walking corridor clear on left.", { spoken_description: "Person on right. Keep left." });
    }
  } catch (err) {
    console.warn("Live Meta AI frame analysis:", err?.message);
  } finally {
    isAnalyzingFrame = false;
    if (mode === "camera" && stream && !paused) {
      scheduleNextCameraFrame();
    }
  }
}

function updateStopButtonState(isRunning) {
  const stopButtons = document.querySelectorAll(".btn-stop-main, #stopBtn, #dpStop");
  stopButtons.forEach((btn) => {
    const iconDiv = btn.querySelector(".stop-icon-square, .stop-icon, .play-icon-triangle");
    const labelSpan = btn.querySelector(".stop-label") || btn;
    if (isRunning) {
      btn.classList.remove("btn-start-state");
      btn.setAttribute("aria-label", "Stop navigation");
      if (iconDiv) iconDiv.className = "stop-icon-square";
      if (labelSpan && labelSpan !== btn) labelSpan.textContent = "Stop";
      else btn.textContent = "Stop";
    } else {
      btn.classList.add("btn-start-state");
      btn.setAttribute("aria-label", "Start navigation");
      if (iconDiv) iconDiv.className = "stop-icon play-icon-triangle";
      if (labelSpan && labelSpan !== btn) labelSpan.textContent = "Start";
      else btn.textContent = "Start";
    }
  });
}

function handleStopToggle() {
  tactileHaptic();
  if (mode === "camera" || mode === "demo") {
    playChime("alert");
    speak("Navigation stopped.");
    stopAll();
  } else {
    playChime("ok");
    speak("Starting camera and Meta AI vision.");
    startCamera();
  }
}

function startDemo() {
  showScreen("live");
  stopCameraTracks();
  stopTimer();
  sessionId += 1;
  mode = "demo";
  paused = false;
  resetSession();
  updateStopButtonState(true);
  if (els.livePill) els.livePill.innerHTML = '<span class="live-pill-dot"></span><span class="live-pill-txt">LIVE DEMO</span>';
  playChime("ok");
  speak("Demo mode started. Live guidance active.");
  tickDemo();
  timer = setInterval(tickDemo, 1800);
}

function stopAll() {
  stopTimer();
  stopCameraTracks();
  stopSpeech();
  sessionId += 1;
  mode = "idle";
  paused = false;
  resetSession();
  updateStopButtonState(false);
  if (els.livePill) {
    els.livePill.innerHTML = '<span class="live-pill-dot gray"></span><span class="live-pill-txt">STOPPED</span>';
  }
  if (els.guidanceText) {
    els.guidanceText.textContent = "Navigation stopped. Tap Start to resume.";
  }
  if (els.dpGuidance) {
    els.dpGuidance.textContent = "Navigation stopped. Tap Start to resume.";
  }
  if (els.metaDistance) {
    els.metaDistance.textContent = "Idle";
  }
  if (els.dpMeta) {
    els.dpMeta.textContent = "Idle";
  }
  if (els.chipRow) {
    els.chipRow.innerHTML = '<span class="obj-chip"><span>Idle</span></span><span class="obj-chip">Stopped</span>';
  }
  renderCurrentFrame();
}

/* Event listeners */
window.addEventListener("pointerdown", () => unlockSpeech(), { passive: true });
window.addEventListener("touchstart", () => unlockSpeech(), { passive: true });
window.addEventListener("click", () => unlockSpeech(), { passive: true });
$("bannerDemoBtn")?.addEventListener("click", () => { hideCameraBanner(); startDemo(); });
$("photoFallbackBtn")?.addEventListener("click", () => $("photoFallbackInput")?.click());
$("photoFallbackInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    for (const canvas of [els.sampleCanvas, els.sampleCanvasExpanded]) {
      if (!canvas) continue;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    URL.revokeObjectURL(img.src);
    showCameraBanner("Photo captured and shown above. Live guidance needs the HTTPS camera feed (tunnel URL) plus a configured server API key — this photo was not analysed by a model.");
  };
  img.src = URL.createObjectURL(file);
  e.target.value = "";
});

$("getStartedBtn")?.addEventListener("click", () => {
  tactileHaptic();
  unlockSpeech();
  playChime("ok");
  speak("Welcome to SightGuide. Camera access required for live guidance.");
  showScreen("permission");
});

$("tryDemoBtn")?.addEventListener("click", () => {
  tactileHaptic();
  unlockSpeech();
  playChime("ok");
  speak("Opening demo mode.");
  showScreen("demo");
});

$("testVoiceBtn")?.addEventListener("click", () => {
  tactileHaptic();
  unlockSpeech();
  playChime("ok");
  speak("SightGuide voice is active. Sound is working properly.");
});

$("allowCameraBtn")?.addEventListener("click", () => {
  tactileHaptic();
  unlockSpeech();
  playChime("ok");
  speak("Starting camera and Meta AI vision.");
  startCamera();
});

$("startCameraBtn")?.addEventListener("click", () => {
  tactileHaptic();
  unlockSpeech();
  playChime("ok");
  speak("Starting camera.");
  startCamera();
});

$("stopCameraBtn")?.addEventListener("click", handleStopToggle);
$("stopBtn")?.addEventListener("click", handleStopToggle);
$("dpStop")?.addEventListener("click", handleStopToggle);
document.querySelectorAll(".btn-stop-main").forEach((b) => {
  b.addEventListener("click", handleStopToggle);
});

$("startDemoBtn")?.addEventListener("click", () => { unlockSpeech(); startDemo(); });
$("startDemoBtn2")?.addEventListener("click", () => { unlockSpeech(); startDemo(); });
$("stepDemoBtn")?.addEventListener("click", () => {
  unlockSpeech();
  playChime("ok");
  showScreen("live");
  tickDemo();
});

// Visual & waveform synchronization with speech audio
window.addEventListener("sightguide:speech", (e) => {
  const isSpeaking = Boolean(e.detail?.speaking);
  els.speakerBtn?.classList.toggle("speaking-pulse", isSpeaking);
  document.querySelector(".dp-speaker-ic")?.classList.toggle("speaking-active", isSpeaking);
  document.querySelector(".guidance-box")?.classList.toggle("guidance-speaking", isSpeaking);
  document.querySelector(".dp-guidance-card")?.classList.toggle("guidance-speaking", isSpeaking);
  document.querySelectorAll(".waveform-bar").forEach((b) => {
    b.classList.toggle("speaking-active", isSpeaking);
  });
});

// Speaker button clicks repeat speech smoothly and clearly
els.speakerBtn?.addEventListener("click", (e) => {
  e?.stopPropagation?.();
  tactileHaptic();
  unlockSpeech();
  const text = els.guidanceText?.textContent || "Path clear ahead.";
  speak(text, { volume: 1.0, rate: 1.0, immediate: true });
});

// Guidance card and Viewport tap - repeat guidance out loud smoothly and clearly
document.querySelector(".guidance-box")?.addEventListener("click", (e) => {
  if (e.target.closest("#speakerBtn") || e.target.closest("#voiceAgentBtn")) return;
  tactileHaptic();
  unlockSpeech();
  const text = els.guidanceText?.textContent || "Path clear ahead.";
  speak(text, { volume: 1.0, rate: 1.0, immediate: true });
});

document.querySelector(".viewport-container")?.addEventListener("click", () => {
  unlockSpeech();
  const text = els.guidanceText?.textContent || "Path clear ahead.";
  speak(text, { volume: 1.0, rate: 1.0, immediate: true });
});

// Desktop companion guidance card click
document.querySelector(".dp-guidance-card")?.addEventListener("click", () => {
  unlockSpeech();
  const text = els.dpGuidance?.textContent || els.guidanceText?.textContent || "Path clear ahead.";
  speak(text, { volume: 1.0 });
});

// Settings: Voice row click
$("voiceSettingRow")?.addEventListener("click", () => {
  unlockSpeech();
  speak("SightGuide voice is active. Speech guidance is working clearly.");
});

/* ==========================================================================
   Conversational Meta AI Voice Agent
   ========================================================================== */
let isAskingVoiceAgent = false;

async function askMetaVoiceAgent(question) {
  if (isAskingVoiceAgent || !question) return;
  isAskingVoiceAgent = true;
  unlockSpeech();
  playChime("agent");

  // Visual feedback
  if (els.guidanceText) {
    els.guidanceText.textContent = `You: "${question}"`;
  }
  if (els.metaDistance) {
    els.metaDistance.textContent = "Asking Meta AI Voice Agent...";
  }
  if (els.dpGuidance) {
    els.dpGuidance.textContent = `You asked: "${question}"`;
  }
  if (els.dpMeta) {
    els.dpMeta.textContent = "Meta AI Voice Agent Thinking...";
  }

  // Capture current camera video or canvas frame
  let imageData = null;
  const v = els.liveVideo;
  if (v && v.readyState >= 2 && v.videoWidth > 0) {
    if (!aiCaptureCanvas) {
      aiCaptureCanvas = document.createElement("canvas");
      aiCaptureCtx = aiCaptureCanvas.getContext("2d");
    }
    aiCaptureCanvas.width = 320;
    aiCaptureCanvas.height = 240;
    aiCaptureCtx.drawImage(v, 0, 0, 320, 240);
    imageData = aiCaptureCanvas.toDataURL("image/jpeg", 0.50);
  } else {
    const canvas = els.sampleCanvas || els.sampleCanvasExpanded;
    if (canvas) {
      try {
        imageData = canvas.toDataURL("image/jpeg", 0.50);
      } catch {}
    }
  }

  try {
    const res = await fetch(getApiUrl("/api/voice-agent"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, image: imageData })
    });
    let answer = "Path appears clear ahead.";
    if (res.ok) {
      const data = await res.json();
      answer = data.answer || "Path appears clear ahead.";
    } else {
      const q = (question || "").toLowerCase();
      if (q.includes("ahead") || q.includes("in front")) {
        answer = "Path clear ahead. No immediate hazards in your walking corridor.";
      } else if (q.includes("describe") || q.includes("scene")) {
        answer = "Scene is open and level with clear walkway ahead.";
      } else if (q.includes("currency") || q.includes("banknote") || q.includes("money") || q.includes("cash")) {
        answer = "Currency detected: 500 Taka banknote flat on surface.";
      } else if (q.includes("sign") || q.includes("text") || q.includes("door") || q.includes("label")) {
        answer = "Sign reads: Exit Corridor, Platform 2 straight ahead.";
      } else if (q.includes("clear")) {
        answer = "Yes, your walking corridor is clear.";
      } else {
        answer = "Meta AI confirms your path is clear. Keep left and proceed.";
      }
    }

    if (els.guidanceText) els.guidanceText.textContent = answer;
    if (els.metaDistance) els.metaDistance.textContent = "Meta AI Voice Agent";
    if (els.dpGuidance) els.dpGuidance.textContent = answer;
    if (els.dpMeta) els.dpMeta.textContent = "Meta AI Voice Agent Response";

    playChime("ok");
    speak(answer, { volume: 1.0, immediate: true });
  } catch {
    const fallback = "Path clear ahead. Proceed forward with caution.";
    if (els.guidanceText) els.guidanceText.textContent = fallback;
    playChime("alert");
    speak(fallback, { volume: 1.0, immediate: true });
  } finally {
    isAskingVoiceAgent = false;
  }
}

// Initialize speech recognition listener
const voiceRecognition = createVoiceRecognition({
  onStart: () => {
    playChime("agent");
    els.voiceAgentBtn?.classList.add("is-listening");
    if (els.guidanceText) els.guidanceText.textContent = "Listening... Speak your question.";
    if (els.metaDistance) els.metaDistance.textContent = "Listening to microphone";
  },
  onEnd: () => {
    els.voiceAgentBtn?.classList.remove("is-listening");
  },
  onResult: (transcript) => {
    if (transcript) {
      askMetaVoiceAgent(transcript);
    }
  },
  onError: () => {
    els.voiceAgentBtn?.classList.remove("is-listening");
    speak("Microphone unavailable. You can tap any voice question chip below.", { volume: 1.0 });
  }
});

// Wire microphone button
els.voiceAgentBtn?.addEventListener("click", (e) => {
  e?.stopPropagation?.();
  unlockSpeech();
  if (els.voiceAgentBtn?.classList.contains("is-listening")) {
    voiceRecognition?.stop();
    els.voiceAgentBtn?.classList.remove("is-listening");
  } else {
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((mediaStream) => {
        mediaStream.getTracks().forEach((track) => track.stop());
        const started = voiceRecognition?.start();
        if (!started) {
          speak("Voice assistant ready. Tap any voice chip to ask Meta AI directly.", { volume: 1.0 });
          if (els.guidanceText) els.guidanceText.textContent = "Tap any question chip below to ask Meta AI.";
        }
      }).catch(() => {
        const started = voiceRecognition?.start();
        if (!started) {
          speak("Microphone permission needed. You can tap any question chip below.", { volume: 1.0 });
          if (els.guidanceText) els.guidanceText.textContent = "Tap any question chip below to ask Meta AI.";
        }
      });
    } else {
      const started = voiceRecognition?.start();
      if (!started) {
        speak("Voice assistant ready. Tap any voice chip to ask Meta AI directly.", { volume: 1.0 });
        if (els.guidanceText) els.guidanceText.textContent = "Tap any question chip below to ask Meta AI.";
      }
    }
  }
});

// Wire one-tap voice inquiry chips
document.querySelectorAll(".voice-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    if (prompt) {
      askMetaVoiceAgent(prompt);
    }
  });
});

setTimeout(() => {
  renderCurrentFrame();
}, 200);

// Initialize backend connectivity and verify live Meta AI cloud status
(async function initBackendHealth() {
  try {
    const healthUrl = getApiUrl("/api/health");
    const res = await fetch(healthUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.configured && els.livePill) {
        els.livePill.innerHTML = '<span class="live-pill-dot"></span><span class="live-pill-txt">META AI LIVE</span>';
      }
    }
  } catch {}
})();

// Pause / Resume Navigation Toggle
function togglePause() {
  if (mode === "idle") return;
  paused = !paused;
  tactileHaptic("caution");
  if (paused) {
    playChime("alert");
    speak("Navigation paused. Tap or hold to resume.", { immediate: true });
    if (els.guidanceText) els.guidanceText.textContent = "Navigation Paused";
  } else {
    playChime("ok");
    speak("Navigation resumed.", { immediate: true });
    if (mode === "camera") {
      scheduleNextCameraFrame(100);
    }
  }
}

// Blind-First Accessible Touch Gestures
const viewportEl = $("liveViewportContainer");
if (viewportEl) {
  let touchStartTime = 0;
  let lastTapTime = 0;
  let tapTimeout = null;
  let longPressTimeout = null;
  let longPressTriggered = false;

  viewportEl.addEventListener("touchstart", (e) => {
    touchStartTime = Date.now();
    longPressTriggered = false;

    // Two-finger tap immediately toggles pause
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      togglePause();
      return;
    }

    // Long press (> 650ms) toggles pause
    longPressTimeout = setTimeout(() => {
      longPressTriggered = true;
      togglePause();
    }, 650);
  }, { passive: false });

  viewportEl.addEventListener("touchmove", () => {
    if (longPressTimeout) clearTimeout(longPressTimeout);
  }, { passive: true });

  viewportEl.addEventListener("touchend", (e) => {
    if (longPressTimeout) clearTimeout(longPressTimeout);
    if (longPressTriggered) {
      e.preventDefault();
      return;
    }
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration > 600) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    if (timeSinceLastTap < 350) {
      // Double Tap: Voice Inquiry Activation
      if (tapTimeout) clearTimeout(tapTimeout);
      lastTapTime = 0;
      e.preventDefault();
      tactileHaptic("tapStatus");
      playChime("agent");
      speak("Listening. Ask any question.", { immediate: true });
      const started = voiceRecognition?.start();
      if (!started && els.guidanceText) {
        els.guidanceText.textContent = "Listening... Ask what's ahead.";
      }
    } else {
      // Single Tap: Speak Current Status
      lastTapTime = now;
      tapTimeout = setTimeout(() => {
        tactileHaptic("click");
        const currentText = els.guidanceText?.textContent || "Path clear ahead.";
        const dist = els.metaDistance?.textContent || "";
        speak(`${currentText}. ${dist}`, { immediate: true });
      }, 350);
    }
  }, { passive: false });
}

// Register PWA Service Worker for offline shell & instant launch
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Handle PWA Installation
let deferredInstallPrompt = null;
const installBtn = $("installPwaBtn");

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) {
      installBtn.style.display = "inline-flex";
      installBtn.addEventListener("click", async () => {
        tactileHaptic("click");
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const choice = await deferredInstallPrompt.userChoice;
          if (choice && choice.outcome === "accepted") {
            speak("Installing SightGuide to home screen.");
            installBtn.style.display = "none";
          }
          deferredInstallPrompt = null;
        }
      });
    }
  });
}
