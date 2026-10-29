import { config, isConfigured } from "../../lib/config.js";

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      ok: true,
      version: "2.0.0",
      configured: isConfigured(),
      baseUrl: config.baseUrl,
      sparkModel: config.sparkModel,
      samModel: config.samModel
    })
  };
}
