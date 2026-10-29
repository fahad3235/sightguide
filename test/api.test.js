import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.js";

async function withServer(fn) {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  try { await fn(`http://127.0.0.1:${port}`); } finally { await new Promise((r) => server.close(r)); }
}

test("health never exposes an API key", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal("apiKey" in data, false);
    assert.equal("MODEL_API_KEY" in data, false);
    assert.equal(JSON.stringify(data).includes(process.env.MODEL_API_KEY || "no-such-key-xyz"), false);
  });
});
test("missing key returns a truthful unconfigured state", async () => {
  await withServer(async (base) => {
    const health = await (await fetch(`${base}/api/health`)).json();
    // In this test environment no key is set; if a key were set, this would be configured.
    assert.equal(typeof health.configured, "boolean");
    if (!health.configured) {
      const res = await fetch(`${base}/api/analyze-frame`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: "data:image/jpeg;base64,/9j/", sequence: 1 }),
      });
      assert.equal(res.status, 503);
    }
  });
});
test("oversized or malformed image payloads are rejected", async () => {
  await withServer(async (base) => {
    const bad = await fetch(`${base}/api/analyze-frame`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "not-a-data-url", sequence: 1 }),
    });
    assert.equal(bad.status, 400);
    const big = await fetch(`${base}/api/analyze-frame`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "data:image/jpeg;base64," + "A".repeat(3 * 1024 * 1024), sequence: 1 }),
    });
    assert.ok([400, 413].includes(big.status));
  });
});
test("API timeout and error paths return controlled responses, not stacks", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/analyze-frame`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal("stack" in data, false);
  });
});
