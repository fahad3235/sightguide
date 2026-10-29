// Stable local tracking across independent sampled images.
// A track ID is a local association, NOT a native SAM video ID, unless
// native SAM video tracking is explicitly used and documented as such.
// Association: category compatibility + box IoU + centroid displacement + time.
// Ambiguous matches get a new ID. Tracks expire after 3 missing samples.
export function boxIoU(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}
export function centroid(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
export function motionTrend(prev, curr) {
  if (!prev || !curr) return "unknown";
  if (prev.observations < 1) return "unknown";
  const prevArea = prev.box.width * prev.box.height;
  const currArea = curr.box.width * curr.box.height;
  if (prevArea <= 0) return "unknown";
  const ratio = currArea / prevArea;
  if (ratio >= 1.15) return "approaching";
  if (ratio <= 0.85) return "moving away";
  return "stable";
}
export class Tracker {
  constructor({ expiryMissing = 3 } = {}) {
    this.tracks = new Map();
    this.nextId = 1;
    this.expiryMissing = expiryMissing;
  }
  reset() {
    this.tracks.clear();
    this.nextId = 1;
  }
  update(detections, nowMs) {
    // detections: [{ category, label, box, distanceBand, uncertain }]
    const usedTrackIds = new Set();
    const results = [];
    for (const det of detections) {
      let best = null;
      let bestScore = 0;
      for (const track of this.tracks.values()) {
        if (usedTrackIds.has(track.trackId)) continue;
        if (track.category !== det.category) continue;
        const iou = boxIoU(track.box, det.box);
        const c1 = centroid(track.box);
        const c2 = centroid(det.box);
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        // Score: IoU is strongest, then closeness. Ambiguity threshold below.
        const score = iou * 0.7 + Math.max(0, 1 - dist) * 0.3;
        if (score > bestScore) { bestScore = score; best = track; }
      }
      if (best && bestScore >= 0.35) {
        const prev = { box: best.box, observations: best.observations };
        const trend = motionTrend(prev, { box: det.box });
        best.box = det.box;
        best.position = det.position;
        best.inPath = det.position === "center";
        best.label = det.label;
        best.distanceBand = det.distanceBand;
        best.uncertain = Boolean(det.uncertain);
        best.lastSeenMs = nowMs;
        best.observations += 1;
        best.missing = 0;
        best.motion = best.observations >= 2 ? trend : "unknown";
        usedTrackIds.add(best.trackId);
        results.push(best);
      } else {
        const trackId = "T-" + String(this.nextId).padStart(3, "0");
        this.nextId += 1;
        const track = {
          trackId, category: det.category, label: det.label, box: det.box,
          position: det.position, inPath: det.position === "center",
          distanceBand: det.distanceBand, uncertain: Boolean(det.uncertain),
          firstSeenMs: nowMs, lastSeenMs: nowMs, observations: 1,
          missing: 0, motion: "unknown",
        };
        this.tracks.set(trackId, track);
        usedTrackIds.add(trackId);
        results.push(track);
      }
    }
    // Age unmatched tracks, expire after expiryMissing missing samples.
    for (const [id, track] of [...this.tracks.entries()]) {
      if (!usedTrackIds.has(id)) {
        track.missing += 1;
        if (track.missing > this.expiryMissing) this.tracks.delete(id);
      }
    }
    return results;
  }
  all() { return [...this.tracks.values()]; }
}
