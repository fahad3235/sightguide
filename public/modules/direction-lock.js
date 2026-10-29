// Anti-confusion direction lock / hysteresis. Unit-tested separately.
// Rules: lock to track ID; a new direction needs 2 consecutive samples,
// unless a clearly higher-priority hazard overrides; repeat only on
// top-risk change, material band change, higher-priority override,
// or 5 seconds with the same high risk.
export class DirectionLock {
  constructor() { this.reset(); }
  reset() {
    this.locked = null; // { text, trackId, riskLevel, riskScore, band, spokenAtMs }
    this.pending = null; // { text, trackId, count, riskScore }
    this.missingFrames = 0;
  }
  decide(candidate, nowMs) {
    // candidate: { text, trackId, riskLevel, riskScore, band } or null
    if (!candidate) {
      this.missingFrames += 1;
      if (this.missingFrames >= 2) this.reset();
      return { text: null, shouldSpeak: false, reason: "no-high-risk" };
    }
    this.missingFrames = 0;
    if (!this.locked) {
      this.locked = { ...candidate, spokenAtMs: nowMs };
      return { text: candidate.text, shouldSpeak: true, reason: "first" };
    }
    if (candidate.text === this.locked.text && candidate.trackId === this.locked.trackId) {
      const bandChanged = candidate.band !== this.locked.band;
      const fiveSeconds = nowMs - this.locked.spokenAtMs >= 5000;
      if (bandChanged || fiveSeconds) {
        this.locked = { ...candidate, spokenAtMs: nowMs };
        return { text: candidate.text, shouldSpeak: true, reason: bandChanged ? "band-change" : "five-second-repeat" };
      }
      return { text: this.locked.text, shouldSpeak: false, reason: "held" };
    }
    // Higher-priority emergency override: High risk, score clearly above locked.
    if (candidate.riskLevel === "High" && candidate.riskScore > this.locked.riskScore + 20) {
      this.locked = { ...candidate, spokenAtMs: nowMs };
      this.pending = null;
      return { text: candidate.text, shouldSpeak: true, reason: "higher-priority-override" };
    }
    if (this.pending && this.pending.text === candidate.text && this.pending.trackId === candidate.trackId) {
      this.pending.count += 1;
    } else {
      this.pending = { ...candidate, count: 1 };
    }
    if (this.pending.count >= 2) {
      this.locked = { ...candidate, spokenAtMs: nowMs };
      this.pending = null;
      return { text: candidate.text, shouldSpeak: true, reason: "persisted-2-frames" };
    }
    return { text: this.locked.text, shouldSpeak: false, reason: "pending-hold" };
  }
}
