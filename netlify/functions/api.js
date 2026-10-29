import { handler as healthHandler } from "./health.js";
import { handler as frameHandler } from "./analyze-frame.js";
import { handler as voiceHandler } from "./voice-agent.js";
import { handler as ttsHandler } from "./tts.js";

export async function handler(event, context) {
  const path = event.path || "";

  if (path.includes("/health")) {
    return healthHandler(event, context);
  }
  if (path.includes("/analyze-frame")) {
    return frameHandler(event, context);
  }
  if (path.includes("/voice-agent")) {
    return voiceHandler(event, context);
  }
  if (path.includes("/tts")) {
    return ttsHandler(event, context);
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "API route not found" })
  };
}
