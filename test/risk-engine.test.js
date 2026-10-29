import test from "node:test";
import assert from "node:assert/strict";
import { rankTracks, fallbackGuidance } from "../public/modules/risk-engine.js";
const track = (over) => ({ category: "fixed_obstacle", position: "side", distanceBand: "Far", motion: "stable", ...over });

test("high-priority moving hazard ahead outranks a low-risk side object", () => {
  const ranked = rankTracks([
    track({ category: "fixed_obstacle", position: "side", distanceBand: "Far" }),
    track({ category: "vehicle", position: "center", distanceBand: "Very close", motion: "approaching" }),
  ]);
  assert.equal(ranked[0].category, "vehicle");
  assert.equal(ranked[0].riskLevel, "High");
});
test("a potential drop ahead is not buried beneath a far side object", () => {
  const ranked = rankTracks([
    track({ category: "fixed_obstacle", position: "side", distanceBand: "Far" }),
    track({ category: "drop", position: "center", distanceBand: "Close" }),
  ]);
  assert.equal(ranked[0].category, "drop");
});
test("unknown distance remains Distance unknown", () => {
  const ranked = rankTracks([track({ distanceBand: "Distance unknown" })]);
  assert.equal(ranked[0].distanceBand, "Distance unknown");
});
test("uncertain evidence cannot trigger an unsupported left/right command", () => {
  const g = fallbackGuidance(track({ category: "vehicle" }));
  assert.ok(!/\bleft\b|\bright\b/.test(g.toLowerCase()));
  assert.ok(g.split(/\s+/).length <= 7);
});
test("low risk does not trigger speech (risk level is Low)", () => {
  const ranked = rankTracks([track({ category: "puddle", position: "side", distanceBand: "Far", motion: "stable" })]);
  assert.equal(ranked[0].riskLevel, "Low");
});
test("empty detections do not crash or claim the path is safe", () => {
  assert.deepEqual(rankTracks([]), []);
  assert.equal(fallbackGuidance(null), null);
});
