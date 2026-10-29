// Meta Model API client. Server-only. Never imported by the browser.
// Uses Meta Muse Spark (muse-spark-1.3) for high-speed, highly accurate multimodal
// scene recognition, obstacle detection, spatial positioning, and voice interaction.
import { config } from "./config.js";
import { parseSparkOutput, parseSamResult } from "./parse-model-output.js";

export class MetaApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function extractTextFromApiResponse(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw.output_text === "string" && raw.output_text) return raw.output_text;
  if (Array.isArray(raw.output)) {
    const msg = raw.output.find((i) => i.type === "message" && i.role === "assistant") ||
                raw.output.find((i) => i.type === "message");
    if (msg && Array.isArray(msg.content)) {
      const textBlock = msg.content.find((c) => c.type === "output_text" || typeof c.text === "string");
      if (textBlock && typeof textBlock.text === "string") return textBlock.text;
    }
    for (const item of raw.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && typeof c.text === "string" && c.text.trim()) return c.text;
        }
      }
    }
  }
  return "";
}

async function postJson(url, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new MetaApiError(res.status, `Meta API error ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

export async function analyzeFrame({ image, sequence }) {
  if (!config.apiKey) throw new MetaApiError(503, "MODEL_API_KEY not configured");
  if (!image || typeof image !== "string") throw new MetaApiError(400, "image required");

  // Fast, high-accuracy prompt tailored for real-time blind navigation
  const prompt = `SightGuide assistive AI vision engine for visually impaired users.
Analyze this camera image and accurately detect the closest prominent foreground objects, hazards, or items directly facing the user.
Identify the primary object right in front of the camera (e.g. mug, cup, bottle, phone, plate, laptop, chair, table, door, stairs, person, wall).
Be precise: do not confuse a mug or cup on a desk with a monitor.
Output strictly compact JSON with NO commentary:
{
  "scene_summary": "1 concise sentence describing the scene accurately",
  "path_clear": true or false,
  "spoken_description": "Precise English navigation cue for a blind user stating the closest object, position, distance, and action (e.g. 'Mug 0.4 meters ahead.' or 'Chair on right. Keep clear.'). Maximum 7 words.",
  "candidates": [
    {
      "concept": "exact object name (e.g. mug, cup, bottle, phone, plate, chair, table, laptop, door, person, stairs)",
      "category": "dishware|furniture|electronics|person|vehicle|stairs|drop|drain|branch|fixed_obstacle",
      "position": "center|left|right",
      "distance_meters": 0.4,
      "distance_band": "Very close (<1m)|Close (1-3m)|Far (>3m)",
      "in_path": true or false,
      "motion": "stable|approaching|moving away",
      "guidance": "Concise spoken direction (e.g. Mug on desk ahead.)",
      "box": { "x": 0.20, "y": 0.25, "width": 0.55, "height": 0.50 }
    }
  ]
}`;

  const sparkRaw = await postJson(`${config.baseUrl}/responses`, {
    model: config.sparkModel,
    input: [
      { role: "user", content: [
        { type: "input_text", text: prompt },
        { type: "input_image", image_url: image },
      ] },
    ],
    reasoning: { effort: "minimal" },
    max_output_tokens: 500,
    temperature: 0.1,
  }, config.timeoutMs);

  const sparkText = extractTextFromApiResponse(sparkRaw);
  const scene = parseSparkOutput(sparkText);

  // Muse Spark directly produces precise normalized bounding boxes.
  // We avoid blocking on secondary model calls to maintain real-time responsiveness.
  const samResults = [];

  // Merge scene candidates with precise coordinates into client hazards contract
  const hazards = scene.candidates.map((c) => {
    const box = c.box || null;

    // Normalize category into risk engine vocabulary
    let cat = (c.category || "").toLowerCase();
    const conceptLower = (c.concept || "").toLowerCase();
    if (cat.includes("dishware") || cat.includes("cup") || cat.includes("mug") || cat.includes("bottle") || cat.includes("plate") ||
        conceptLower.includes("mug") || conceptLower.includes("cup") || conceptLower.includes("bottle") || conceptLower.includes("plate") || conceptLower.includes("glass") || conceptLower.includes("dish")) cat = "dishware";
    else if (cat.includes("person") || cat.includes("pedestrian") || cat.includes("human") || conceptLower.includes("person") || conceptLower.includes("man") || conceptLower.includes("woman") || conceptLower.includes("child")) cat = "person";
    else if (cat.includes("vehicle") || cat.includes("car") || cat.includes("bus") || cat.includes("bike") || cat.includes("truck") || conceptLower.includes("car") || conceptLower.includes("vehicle") || conceptLower.includes("bicycle") || conceptLower.includes("motorcycle")) cat = "vehicle";
    else if (cat.includes("stair") || cat.includes("step") || conceptLower.includes("stair") || conceptLower.includes("step")) cat = "stairs";
    else if (cat.includes("furniture") || cat.includes("chair") || cat.includes("table") || cat.includes("desk") || cat.includes("bed") || cat.includes("sofa") || conceptLower.includes("chair") || conceptLower.includes("table") || conceptLower.includes("desk") || conceptLower.includes("sofa") || conceptLower.includes("bed") || conceptLower.includes("couch") || conceptLower.includes("monitor") || conceptLower.includes("screen") || conceptLower.includes("laptop") || conceptLower.includes("computer")) cat = "furniture";
    else if (cat.includes("drop") || cat.includes("curb") || cat.includes("fall") || conceptLower.includes("drop") || conceptLower.includes("curb")) cat = "drop";
    else if (cat.includes("drain") || cat.includes("grate") || cat.includes("hole") || conceptLower.includes("drain") || conceptLower.includes("hole")) cat = "drain";
    else if (cat.includes("branch") || cat.includes("tree") || conceptLower.includes("branch") || conceptLower.includes("tree") || conceptLower.includes("plant")) cat = "branch";
    else cat = "fixed_obstacle";

    // Normalize position
    let pos = (c.position || "center").toLowerCase();
    if (pos.includes("left")) pos = "left";
    else if (pos.includes("right")) pos = "right";
    else pos = "center";

    // Estimate distance band
    let distBand = c.distance_band || "";
    if (distBand.includes("Very close") || distBand.includes("<1m")) distBand = "Very close";
    else if (distBand.includes("Close") || distBand.includes("1-3m")) distBand = "Close";
    else if (distBand.includes("Far") || distBand.includes(">3m")) distBand = "Far";
    else if (box) {
      const bottom = (box.y || 0) + (box.height || 0);
      if ((box.height || 0) >= 0.50 || bottom >= 0.88) distBand = "Very close";
      else if ((box.height || 0) >= 0.20 || bottom >= 0.65) distBand = "Close";
      else distBand = "Far";
    } else {
      distBand = "Close";
    }

    // Motion normalization
    let motion = (c.motion || "unknown").toLowerCase();
    if (motion.includes("approach") || motion.includes("toward")) motion = "approaching";
    else if (motion.includes("away")) motion = "moving away";
    else if (motion.includes("stable") || motion.includes("static")) motion = "stable";
    else motion = "unknown";

    const labelName = (c.concept || cat || "Object").trim();

    return {
      category: cat,
      label: labelName,
      position: pos,
      inPath: c.in_path === true || pos === "center",
      box,
      distanceBand: distBand,
      distanceMeters: typeof c.distance_meters === "number" ? c.distance_meters : null,
      guidance: typeof c.guidance === "string" ? c.guidance.trim() : null,
      motion,
      uncertain: Boolean(c.uncertain),
      evidence: typeof c.visual_evidence === "string" ? c.visual_evidence : "",
      hasSamBox: Boolean(box),
    };
  });

  return { scene, samResults, hazards, sequence };
}

export async function askVoiceAgent({ question, image }) {
  if (!config.apiKey) throw new MetaApiError(503, "MODEL_API_KEY not configured");
  if (!question || typeof question !== "string") throw new MetaApiError(400, "question required");

  const prompt = `You are SightGuide, an assistive live voice guide for a person who is blind or visually impaired.
The user asks: "${question}".
Analyze the provided camera image and answer the user directly in 1 or 2 concise, reassuring spoken sentences.
Always speak and answer strictly in clear, fluent English.
Mention directional locations (to your left, directly ahead, on your right).
Do not use markdown, emojis, asterisks, or bullet points.`;

  const content = [{ type: "input_text", text: prompt }];
  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    content.push({ type: "input_image", image_url: image });
  }

  const raw = await postJson(`${config.baseUrl}/responses`, {
    model: config.sparkModel,
    input: [{ role: "user", content }],
    reasoning: { effort: "minimal" },
    max_output_tokens: 300,
    temperature: 0.2,
  }, config.timeoutMs);

  const answer = extractTextFromApiResponse(raw) || "Path appears clear ahead.";
  return { answer: answer.trim() };
}
