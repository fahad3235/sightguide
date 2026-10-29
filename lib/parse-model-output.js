// Parse and validate Muse Spark structured output with full resilience.
// Handles pure JSON, markdown fences (```json ... ```), conversational text wrapping,
// and partial recovery so valid hazard detections are never discarded.

function cleanJsonString(str) {
  if (typeof str !== "string") return "";
  let clean = str.trim();
  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  if (clean.includes("```")) {
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      clean = match[1].trim();
    } else {
      clean = clean.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }
  }
  // Extract outermost JSON object if there's surrounding text
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
  return clean;
}

function normalizeBox(box) {
  if (!box || typeof box !== "object") return null;
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width ?? box.w);
  const height = Number(box.height ?? box.h);
  if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height)) {
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
      width: Math.max(0.01, Math.min(1, width)),
      height: Math.max(0.01, Math.min(1, height)),
    };
  }
  return null;
}

export function parseSparkOutput(raw) {
  if (!raw) return { scene_uncertain: true, candidates: [], scene_summary: "", path_clear: true };
  let obj = null;

  if (typeof raw === "object") {
    obj = raw;
  } else {
    const cleaned = cleanJsonString(raw);
    try {
      obj = JSON.parse(cleaned);
    } catch {
      // If direct parse fails, try extracting summary via regex
      const summaryMatch = String(raw).match(/"scene_summary"\s*:\s*"([^"]+)"/);
      const summary = summaryMatch ? summaryMatch[1] : "";
      return { scene_summary: summary, scene_uncertain: !summary, candidates: [], path_clear: true };
    }
  }

  if (!obj || typeof obj !== "object") {
    return { scene_uncertain: true, candidates: [], scene_summary: "", path_clear: true };
  }

  const rawCandidates = Array.isArray(obj.candidates) ? obj.candidates :
                        Array.isArray(obj.items) ? obj.items :
                        Array.isArray(obj.objects) ? obj.objects :
                        Array.isArray(obj.hazards) ? obj.hazards : [];
  const candidates = rawCandidates
    .filter((c) => c && (typeof c.concept === "string" || typeof c.label === "string" || typeof c.name === "string" || typeof c.object === "string" || typeof c.item === "string" || typeof c.category === "string"))
    .map((c) => {
      const concept = String(c.concept || c.label || c.name || c.object || c.item || c.category || "obstacle").trim();
      const category = String(c.category || "fixed_obstacle").trim().toLowerCase();
      const position = String(c.position || c.pos || "center").trim().toLowerCase();
      const motion = String(c.motion || "unknown").trim().toLowerCase();
      const distanceBand = String(c.distance_band || c.distanceBand || "").trim();
      const distanceMeters = typeof c.distance_meters === "number" ? c.distance_meters : (typeof c.dist === "number" ? c.dist : null);
      const guidance = typeof c.guidance === "string" ? c.guidance.trim() : null;
      const box = normalizeBox(c.box);
      return {
        concept,
        category,
        position: position.includes("left") ? "left" : position.includes("right") ? "right" : "center",
        in_path: c.in_path === true || c.inPath === true || position === "center",
        motion: motion.includes("approach") ? "approaching" : motion.includes("away") ? "moving away" : (motion.includes("static") || motion.includes("stable")) ? "stable" : "unknown",
        distance_band: distanceBand,
        distance_meters: distanceMeters,
        guidance,
        uncertain: Boolean(c.uncertain),
        visual_evidence: typeof c.visual_evidence === "string" ? c.visual_evidence : "",
        box,
      };
    })
    .slice(0, 4);

  return {
    scene_summary: typeof obj.scene_summary === "string" ? obj.scene_summary : "",
    spoken_description: typeof obj.spoken_description === "string" ? obj.spoken_description.trim() : (typeof obj.speech === "string" ? obj.speech.trim() : (typeof obj.spoken_alert === "string" ? obj.spoken_alert.trim() : "")),
    path_clear: obj.path_clear !== false && candidates.length === 0,
    scene_uncertain: Boolean(obj.scene_uncertain),
    candidates,
  };
}

export function parseSamResult(raw) {
  if (!raw || typeof raw !== "object") return { matches: [] };
  if (Array.isArray(raw.matches)) return { matches: raw.matches };
  if (Array.isArray(raw.boxes)) return { matches: raw.boxes.map((b) => ({ box: normalizeBox(b) })) };
  return { matches: [] };
}
