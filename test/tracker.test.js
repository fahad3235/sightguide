import test from "node:test";
import assert from "node:assert/strict";
import { Tracker } from "../public/modules/tracker.js";
const box = (x, y, w, h) => ({ x, y, width: w, height: h });
const det = (category, b) => ({ category, label: category, box: b, distanceBand: "Close", uncertain: false });

test("same object in slightly shifted boxes retains ID", () => {
  const t = new Tracker();
  const a = t.update([det("fixed_obstacle", box(0.4, 0.4, 0.2, 0.3))], 1000);
  const b = t.update([det("fixed_obstacle", box(0.41, 0.41, 0.2, 0.3))], 2500);
  assert.equal(a[0].trackId, b[0].trackId);
  assert.equal(b[0].observations, 2);
});
test("two similar objects remain separate when association is clear", () => {
  const t = new Tracker();
  const r = t.update([det("fixed_obstacle", box(0.1, 0.4, 0.15, 0.3)), det("fixed_obstacle", box(0.7, 0.4, 0.15, 0.3))], 1000);
  assert.equal(new Set(r.map((x) => x.trackId)).size, 2);
});
test("new object receives a new ID", () => {
  const t = new Tracker();
  const a = t.update([det("fixed_obstacle", box(0.4, 0.4, 0.2, 0.3))], 1000);
  const b = t.update([det("vehicle", box(0.4, 0.4, 0.2, 0.3))], 2500);
  assert.notEqual(a[0].trackId, b[0].trackId);
});
test("missing object expires after the configured threshold", () => {
  const t = new Tracker({ expiryMissing: 3 });
  t.update([det("fixed_obstacle", box(0.4, 0.4, 0.2, 0.3))], 1000);
  for (let i = 0; i < 4; i++) t.update([], 2000 + i * 1500);
  assert.equal(t.all().length, 0);
});
test("ambiguous overlap does not silently reuse a stale ID", () => {
  const t = new Tracker();
  t.update([det("fixed_obstacle", box(0.4, 0.4, 0.2, 0.3))], 1000);
  const r = t.update([det("fixed_obstacle", box(0.9, 0.9, 0.05, 0.05))], 2500);
  assert.notEqual(r[0].trackId, "T-001");
});
test("category mismatch prevents an implausible match", () => {
  const t = new Tracker();
  const a = t.update([det("fixed_obstacle", box(0.4, 0.4, 0.2, 0.3))], 1000);
  const b = t.update([det("person", box(0.4, 0.4, 0.2, 0.3))], 2500);
  assert.notEqual(a[0].trackId, b[0].trackId);
});
test("motion trend requires at least two usable observations", () => {
  const t = new Tracker();
  const a = t.update([det("fixed_obstacle", box(0.4, 0.4, 0.2, 0.3))], 1000);
  assert.equal(a[0].motion, "unknown");
  const b = t.update([det("fixed_obstacle", box(0.38, 0.38, 0.28, 0.38))], 2500);
  assert.equal(b[0].motion, "approaching");
});
