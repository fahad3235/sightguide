import { config } from "../../lib/config.js";
import { analyzeFrame, MetaApiError } from "../../lib/meta-client.js";

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "malformed JSON" })
      };
    }

    if (!body || typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "image data URL required" })
      };
    }

    if (body.image.length > config.maxImageBytes) {
      return {
        statusCode: 413,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "image too large" })
      };
    }

    const started = Date.now();
    const seq = typeof body.sequence === "number" ? body.sequence : 1;
    const result = await analyzeFrame({ image: body.image, sequence: seq });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        schemaVersion: 1,
        mode: "live",
        sequence: seq,
        observedAt: new Date().toISOString(),
        processingMs: Date.now() - started,
        scene: result.scene,
        samResults: result.samResults,
        hazards: result.hazards || [],
        freshness: "fresh"
      })
    };
  } catch (err) {
    if (err instanceof MetaApiError) {
      return {
        statusCode: err.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: err.message })
      };
    }
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "internal error" })
    };
  }
}
