import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, isConfigured } from "./lib/config.js";
import { analyzeFrame, askVoiceAgent, MetaApiError } from "./lib/meta-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const ttsCache = new Map();

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; let tooLarge = false; const chunks = [];
    // Drain oversized bodies instead of destroying the socket, so the
    // client receives a clean 413 instead of a connection reset.
    req.on("data", (c) => { size += c.length; if (size > limit) tooLarge = true; else chunks.push(c); });
    req.on("end", () => { if (tooLarge) reject(new Error("payload-too-large")); else resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}
export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        });
        return res.end();
      }
      const pathname = req.url ? req.url.split("?")[0] : "/";
      if (req.method === "GET" && pathname === "/api/health") {
        // Never return the key or secret environment contents.
        return sendJson(res, 200, { ok: true, version: "2.0.0", configured: isConfigured(), baseUrl: config.baseUrl, sparkModel: config.sparkModel, samModel: config.samModel });
      }
      if (req.method === "POST" && pathname === "/api/analyze-frame") {
        if (req.headers["content-type"] && !req.headers["content-type"].includes("application/json")) {
          return sendJson(res, 415, { error: "content-type must be application/json" });
        }
        const bodyText = await readBody(req, config.maxImageBytes + 10000);
        let body;
        try { body = JSON.parse(bodyText); } catch { return sendJson(res, 400, { error: "malformed JSON" }); }
        if (!body || typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
          return sendJson(res, 400, { error: "image data URL required" });
        }
        if (body.image.length > config.maxImageBytes) return sendJson(res, 413, { error: "image too large" });
        if (typeof body.sequence !== "number") return sendJson(res, 400, { error: "sequence number required" });
        const started = Date.now();
        const result = await analyzeFrame({ image: body.image, sequence: body.sequence });
        return sendJson(res, 200, { schemaVersion: 1, mode: "live", sequence: body.sequence, observedAt: new Date().toISOString(), processingMs: Date.now() - started, scene: result.scene, samResults: result.samResults, hazards: result.hazards || [], freshness: "fresh" });
      }
      if (req.method === "POST" && pathname === "/api/voice-agent") {
        if (req.headers["content-type"] && !req.headers["content-type"].includes("application/json")) {
          return sendJson(res, 415, { error: "content-type must be application/json" });
        }
        const bodyText = await readBody(req, config.maxImageBytes + 10000);
        let body;
        try { body = JSON.parse(bodyText); } catch { return sendJson(res, 400, { error: "malformed JSON" }); }
        if (!body || typeof body.question !== "string") {
          return sendJson(res, 400, { error: "question required" });
        }
        const result = await askVoiceAgent({ question: body.question, image: body.image || null });
        return sendJson(res, 200, { ok: true, answer: result.answer });
      }
      if (req.method === "GET" && pathname === "/api/tts") {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const text = (parsedUrl.searchParams.get("text") || "Path clear ahead.").trim().slice(0, 200);
        const cleanText = text.replace(/[\r\n\t]/g, " ");
        const lang = parsedUrl.searchParams.get("lang") || "en";
        const cacheKey = `${lang}:${cleanText.toLowerCase()}`;

        let audioBuffer = ttsCache.get(cacheKey);
        if (!audioBuffer) {
          const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
          try {
            const ttsRes = await fetch(ttsUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            });
            if (!ttsRes.ok) throw new Error("TTS upstream error");
            const ab = await ttsRes.arrayBuffer();
            audioBuffer = Buffer.from(ab);
            if (ttsCache.size > 200) ttsCache.clear();
            ttsCache.set(cacheKey, audioBuffer);
          } catch {
            return sendJson(res, 502, { error: "TTS service unavailable" });
          }
        }

        const total = audioBuffer.length;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10) || 0;
          const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
          const chunk = audioBuffer.subarray(start, end + 1);
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunk.length,
            "Content-Type": "audio/mpeg",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400"
          });
          return res.end(chunk);
        }

        res.writeHead(200, {
          "Content-Type": "audio/mpeg",
          "Content-Length": total,
          "Accept-Ranges": "bytes",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400"
        });
        return res.end(audioBuffer);
      }
      // Static files, public/ only, no directory traversal.
      let urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      const filePath = path.normalize(path.join(PUBLIC, urlPath));
      if (!filePath.startsWith(PUBLIC)) return sendJson(res, 403, { error: "forbidden" });
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(res, 404, { error: "not found" });
      const ext = path.extname(filePath);
      const data = await fs.promises.readFile(filePath);
      const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
      if ([".html", ".css", ".js", ".json"].includes(ext)) {
        headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        headers["Pragma"] = "no-cache";
        headers["Expires"] = "0";
      } else {
        headers["Cache-Control"] = "public, max-age=86400";
      }
      res.writeHead(200, headers);
      res.end(data);
    } catch (err) {
      if (err instanceof MetaApiError) return sendJson(res, err.status, { error: err.message });
      if (err.message === "payload-too-large") return sendJson(res, 413, { error: "payload too large" });
      // Safe, concise errors only: no stack traces, no secrets.
      return sendJson(res, 500, { error: "internal error" });
    }
  });
}
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Optional direct HTTPS: if certs/cert.pem + certs/key.pem exist (or
  // HTTPS_CERT / HTTPS_KEY env vars point to files), serve HTTPS so phone
  // browsers grant camera access. Phones must trust the cert, so the
  // recommended phone path is START-PHONE-CAMERA.bat (Cloudflare Tunnel,
  // publicly trusted HTTPS, no cert warnings).
  const certPath = process.env.HTTPS_CERT || path.join(__dirname, "certs", "cert.pem");
  const keyPath = process.env.HTTPS_KEY || path.join(__dirname, "certs", "key.pem");
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    import("node:https").then(({ createServer: createHttps }) => {
      // Rebuild with the same request handler by wrapping createServer's listener.
      const httpServer = createServer();
      const listener = httpServer.listeners("request")[0];
      createHttps({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, listener)
        .listen(config.port, () => console.log(`SightGuide HTTPS on https://localhost:${config.port} — live AI ${isConfigured() ? "configured" : "not configured, Demo mode only"}`));
    });
  } else {
    const host = process.env.HOST || "0.0.0.0";
    createServer().listen(config.port, host, () => {
      console.log(`SightGuide on http://${host}:${config.port} — live AI ${isConfigured() ? "configured" : "not configured, Demo mode only"}`);
      console.log("Phone camera note: phone browsers block cameras on http://<LAN-IP>. Use START-PHONE-CAMERA.bat for a trusted HTTPS URL.");
    });
  }
}

