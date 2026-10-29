import test from "node:test";
import assert from "node:assert/strict";
import { validateGuidance } from "../lib/validate-guidance.js";
import { parseSparkOutput, parseSamResult } from "../lib/parse-model-output.js";

test("text over seven words is rejected", () => {
  assert.equal(validateGuidance("This is a very long instruction with too many words here").ok, false);
});
test("disallowed left/right command is rejected without clearance", () => {
  assert.equal(validateGuidance("Pole on your right, keep left.").ok, false);
});
test("conservative fallback phrases pass", () => {
  for (const t of ["Obstacle ahead. Pause and assess.", "Vehicle ahead. Stop and seek assistance.", "Possible drop ahead. Pause and seek assistance."]) {
    assert.equal(validateGuidance(t).ok, true, t);
  }
});
test("safety guarantee words are rejected", () => {
  assert.equal(validateGuidance("Path is safe, keep walking.").ok, false);
});
test("valid SAM result is parsed and zero matches handled normally", () => {
  assert.deepEqual(parseSamResult({ matches: [] }).matches, []);
  assert.deepEqual(parseSamResult(null).matches, []);
});
test("malformed model JSON is rejected safely", () => {
  const r = parseSparkOutput("{not json");
  assert.equal(r.scene_uncertain, true);
  assert.deepEqual(r.candidates, []);
});
