// Validate a proposed spoken instruction before speech.
// Rejects: >7 words (unless allowDescriptive), left/right without clearance, exact distance (unless allowDescriptive),
// safety guarantees, certainty claims. Returns { ok, text, reason }.
const BANNED = ["safe", "guaranteed", "guarantee", "clear path", "no danger", "centimetre", "centimeter", "metre", "meter", "%"];
export function validateGuidance(text, { clearanceSupported = false, maxWords = 7, allowDescriptive = false } = {}) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, text: null, reason: "empty" };
  const clean = text.trim();
  const words = clean.split(/\s+/);
  const limit = allowDescriptive ? (maxWords || 30) : 7;
  if (words.length > limit) return { ok: false, text: null, reason: "over-7-words" };
  const lower = clean.toLowerCase();
  if (!clearanceSupported && (/\bleft\b/.test(lower) || /\bright\b/.test(lower))) {
    return { ok: false, text: null, reason: "left-right-without-clearance" };
  }
  const checkBanned = allowDescriptive ? ["safe", "guaranteed", "guarantee", "no danger"] : BANNED;
  for (const w of checkBanned) {
    if (lower.includes(w)) return { ok: false, text: null, reason: `banned-word:${w}` };
  }
  return { ok: true, text: clean, reason: "ok" };
}
export const FALLBACKS = [
  "Obstacle ahead. Pause and assess.",
  "Vehicle ahead. Stop and seek assistance.",
  "Possible drop ahead. Pause and seek assistance.",
  "Scene unclear. Pause and seek assistance.",
  "Obstacle very close. Stop and seek assistance.",
];

