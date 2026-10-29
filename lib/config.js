import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq !== -1) {
        const key = trimmed.substring(0, eq).trim();
        const val = trimmed.substring(eq + 1).trim();
        if (!process.env[key] && val) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

export const config = {
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.META_API_BASE_URL || "https://api.meta.ai/v1",
  sparkModel: process.env.MUSE_SPARK_MODEL || "muse-spark-1.3",
  samModel: process.env.SAM_MODEL || "sam-3.1",
  apiKey: process.env.MODEL_API_KEY || "",
  maxImageBytes: 2 * 1024 * 1024,
  timeoutMs: 30000,
  maxSamConceptsPerFrame: 2,
};
export function isConfigured() { return Boolean(config.apiKey); }
