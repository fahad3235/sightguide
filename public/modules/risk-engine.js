// Deterministic risk prioritisation. Muse Spark may propose, but this
// local policy is the gate. Scores are for ordering only, never shown
// as an accuracy or confidence percentage.
export const BANDS = ["Very close", "Close", "Far", "Distance unknown"];
const BAND_SCORE = { "Very close": 40, "Close": 25, "Far": 10, "Distance unknown": 0 };
const CATEGORY_SCORE = {
  vehicle: 15, person: 15, drop: 12, stairs: 12, drain: 12,
  furniture: 8, fixed_obstacle: 5, branch: 8, puddle: 2, unknown: 0,
};
const MOTION_SCORE = { approaching: 20, stable: 5, "moving away": 0, unknown: 0 };
export function riskScore(track) {
  let score = 0;
  if (track.position === "center" || track.inPath) score += 40;
  else if (track.position === "side") score += 10;
  score += BAND_SCORE[track.distanceBand] ?? 0;
  score += MOTION_SCORE[track.motion] ?? 0;
  score += CATEGORY_SCORE[track.category] ?? 0;
  return score;
}
export function riskLevel(score) {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}
export function rankTracks(tracks) {
  return tracks
    .map((t) => ({ ...t, riskScore: riskScore(t), riskLevel: riskLevel(riskScore(t)) }))
    .sort((a, b) => b.riskScore - a.riskScore);
}
// Conservative fallback guidance. No left/right instruction is ever
// produced here, because no side-clearance check is implemented.
export function fallbackGuidance(track) {
  if (!track) return null;
  if (track.category === "vehicle") return "Vehicle ahead. Stop and seek assistance.";
  if (track.category === "drop" || track.category === "stairs" || track.category === "drain") {
    return "Possible drop ahead. Pause and seek assistance.";
  }
  if (track.distanceBand === "Very close") return "Obstacle very close. Stop and seek assistance.";
  return "Obstacle ahead. Pause and assess.";
}
