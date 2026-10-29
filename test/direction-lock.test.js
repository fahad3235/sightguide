import test from "node:test";
import assert from "node:assert/strict";
import { DirectionLock } from "../public/modules/direction-lock.js";
const cand = (text, trackId, score, band = "Close") => ({ text, trackId, riskLevel: score >= 80 ? "High" : "Medium", riskScore: score, band });

test("repeated same observation does not speak repeatedly", () => {
  const l = new DirectionLock();
  assert.equal(l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85), 1000).shouldSpeak, true);
  assert.equal(l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85), 2500).shouldSpeak, false);
});
test("one noisy frame cannot flip direction", () => {
  const l = new DirectionLock();
  l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85), 1000);
  const r = l.decide(cand("Vehicle ahead. Stop and seek assistance.", "T-002", 70), 2500);
  assert.equal(r.shouldSpeak, false);
  assert.equal(r.text, "Obstacle ahead. Pause and assess.");
});
test("a candidate requires two consecutive samples unless a valid override applies", () => {
  const l = new DirectionLock();
  l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85), 1000);
  l.decide(cand("Vehicle ahead. Stop and seek assistance.", "T-002", 70), 2500);
  const r = l.decide(cand("Vehicle ahead. Stop and seek assistance.", "T-002", 70), 4000);
  assert.equal(r.shouldSpeak, true);
});
test("a higher-priority hazard can override under the documented condition", () => {
  const l = new DirectionLock();
  l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 60), 1000);
  const r = l.decide(cand("Vehicle ahead. Stop and seek assistance.", "T-002", 110), 2500);
  assert.equal(r.shouldSpeak, true);
});
test("same risk can repeat only for band change or five-second rule", () => {
  const l = new DirectionLock();
  l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85, "Close"), 1000);
  assert.equal(l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85, "Very close"), 2500).shouldSpeak, true);
});
test("stop cancels pending speech (reset clears lock and pending)", () => {
  const l = new DirectionLock();
  l.decide(cand("Obstacle ahead. Pause and assess.", "T-001", 85), 1000);
  l.decide(cand("Vehicle ahead. Stop and seek assistance.", "T-002", 70), 2500);
  l.reset();
  assert.equal(l.decide(cand("Vehicle ahead. Stop and seek assistance.", "T-002", 70), 4000).shouldSpeak, true);
});
