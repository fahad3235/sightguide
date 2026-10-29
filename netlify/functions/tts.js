const ttsCache = new Map();

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Range",
        "Access-Control-Allow-Methods": "GET, OPTIONS"
      }
    };
  }

  const params = event.queryStringParameters || {};
  const text = (params.text || "Path clear ahead.").trim().slice(0, 200);
  const cleanText = text.replace(/[\r\n\t]/g, " ");
  const lang = params.lang || "en";
  const cacheKey = `${lang}:${cleanText.toLowerCase()}`;

  let base64Audio = ttsCache.get(cacheKey);

  if (!base64Audio) {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    try {
      const ttsRes = await fetch(ttsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (!ttsRes.ok) throw new Error("TTS upstream error");
      const arrayBuffer = await ttsRes.arrayBuffer();
      base64Audio = Buffer.from(arrayBuffer).toString("base64");
      if (ttsCache.size > 200) ttsCache.clear();
      ttsCache.set(cacheKey, base64Audio);
    } catch {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "TTS service unavailable" })
      };
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*"
    },
    body: base64Audio,
    isBase64Encoded: true
  };
}
