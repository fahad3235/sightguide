// Draw a box + label overlay on the sampled frame canvas.
// The overlay matches the sampled frame and conforms to the hackathon UI design.
const BOX_COLORS = {
  person: "#ef4444",
  vehicle: "#ef4444",
  stairs: "#f59e0b",
  furniture: "#3b82f6",
  dishware: "#10b981",
  electronics: "#38bdf8",
  drain: "#f59e0b",
  drop: "#f59e0b",
  branch: "#f59e0b",
  fixed_obstacle: "#f59e0b",
  unknown: "#38bdf8"
};

const bgImages = {};
function getBgImage(src) {
  if (typeof Image === "undefined") return null;
  if (!bgImages[src]) {
    const img = new Image();
    img.src = src;
    bgImages[src] = img;
  }
  return bgImages[src];
}

// Preload the primary realistic street scene
const defaultStreetImg = getBgImage("assets/live_scene_pedestrian.jpg");
const stepsImg = getBgImage("assets/scenario_steps.jpg");

export function drawMaskOverlay(canvas, tracks, label, opts = {}) {
  const { showMasks = true, showIds = true, showLabels = true, opacity = 0.7 } = opts;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

  // Top pill badge (only shown when explicitly provided and no tracked objects to avoid visual collision)
  if (label && tracks.length === 0) {
    ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
    const badgeW = ctx.measureText(label).width + 18;
    ctx.fillStyle = "rgba(15, 31, 56, 0.85)";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(16, 16, badgeW, 22, 5) : ctx.fillRect(16, 16, badgeW, 22);
    ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(label, 25, 31);
  }

  // AR Safe Walking Corridor (Center Navigation Lane)
  const corridorTopW = w * 0.32;
  const corridorBottomW = w * 0.54;
  const topX1 = (w - corridorTopW) / 2;
  const topX2 = topX1 + corridorTopW;
  const botX1 = (w - corridorBottomW) / 2;
  const botX2 = botX1 + corridorBottomW;
  const corridorTopY = h * 0.40;
  const corridorBotY = h - 38;

  // Detect if any hazardous obstacle intersects the central corridor
  const hasCorridorHazard = tracks.some(t => {
    if (!t.box) return false;
    const boxMidX = t.box.x + t.box.width / 2;
    return boxMidX > 0.28 && boxMidX < 0.72 && (t.riskLevel === "High" || t.riskLevel === "Medium");
  });

  const laneStroke = hasCorridorHazard ? "rgba(239, 68, 68, 0.45)" : "rgba(34, 197, 94, 0.40)";
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = laneStroke;

  // Left Lane Boundary
  ctx.beginPath();
  ctx.moveTo(topX1, corridorTopY);
  ctx.lineTo(botX1, corridorBotY);
  ctx.stroke();

  // Right Lane Boundary
  ctx.beginPath();
  ctx.moveTo(topX2, corridorTopY);
  ctx.lineTo(botX2, corridorBotY);
  ctx.stroke();
  ctx.restore();

  // Dynamic AR scanning beam sweeping down the walking corridor in real-time
  const now = Date.now();
  const sweepProgress = (now % 2200) / 2200;
  const sweepY = corridorTopY + (corridorBotY - corridorTopY) * sweepProgress;
  const sweepW = corridorTopW + (corridorBottomW - corridorTopW) * sweepProgress;
  const sweepX = (w - sweepW) / 2;

  ctx.save();
  const sweepGrad = ctx.createLinearGradient(sweepX, sweepY - 3, sweepX, sweepY + 3);
  const beamColor = hasCorridorHazard ? "rgba(239, 68, 68, " : "rgba(56, 189, 248, ";
  sweepGrad.addColorStop(0, beamColor + "0)");
  sweepGrad.addColorStop(0.5, beamColor + "0.65)");
  sweepGrad.addColorStop(1, beamColor + "0)");
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(sweepX, sweepY - 2, sweepW, 4);
  ctx.restore();

  for (const t of tracks) {
    if (!t.box) continue;
    // Skip full-screen borders (when an AI model occasionally boxes the entire image frame)
    if (t.box.width >= 0.94 && t.box.height >= 0.94) continue;

    const color = BOX_COLORS[t.category] || "#38bdf8";
    const x = t.box.x * w, y = t.box.y * h, bw = t.box.width * w, bh = t.box.height * h;

    // Translucent mask fill
    if (showMasks) {
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity)) * 0.28;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, bw, bh);
      ctx.globalAlpha = 1;
    }

    // High-contrast bounding box stroke
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, bw, bh);

    // Sleek HUD corner accents
    const cornerLen = Math.min(16, Math.min(bw, bh) / 3);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y);
    ctx.moveTo(x + bw - cornerLen, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + cornerLen);
    ctx.moveTo(x, y + bh - cornerLen); ctx.lineTo(x, y + bh); ctx.lineTo(x + cornerLen, y + bh);
    ctx.moveTo(x + bw - cornerLen, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - cornerLen);
    ctx.stroke();

    // Clean pill badge for Label, Distance, and ID
    if (showLabels || showIds) {
      let rawTitle = (t.label || t.category || "Obstacle").trim();
      rawTitle = rawTitle.replace(/^obstacle$/i, "Object").replace(/T-\d+/g, "").trim();
      let categoryTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      if (categoryTitle.toLowerCase() === "fixed obstacle" || categoryTitle.toLowerCase() === "hazard") categoryTitle = "Obstacle";

      const idNum = t.trackId ? t.trackId.replace("T-", "").padStart(2, "0") : "01";
      const distStr = typeof t.distanceMeters === "number" && t.distanceMeters > 0 ? `${t.distanceMeters.toFixed(1)}m` : "";
      
      let text = "";
      if (distStr) text = `${categoryTitle} ${distStr} · #${idNum}`;
      else text = `${categoryTitle} · #${idNum}`;

      ctx.font = "bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
      const metrics = ctx.measureText(text);
      const tw = metrics.width + 16;
      const th = 22;
      
      // Safe padding from edges (16px) to avoid clipping on rounded phone screens
      const px = Math.max(16, Math.min(x, w - tw - 16));
      let py = y - 6;
      if (py < th + 10) {
        py = Math.min(h - 16, y + th + 6);
      }

      // Rounded pill badge background
      ctx.fillStyle = color;
      ctx.beginPath();
      const radius = 5;
      ctx.roundRect ? ctx.roundRect(px, py - th, tw, th, radius) : ctx.fillRect(px, py - th, tw, th);
      ctx.fill();

      // Pill text
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(text, px + 8, py - th / 2);
      ctx.textBaseline = "alphabetic";
    }
  }

  // Bottom tags on video/canvas view with safe padding away from rounded edges
  // Tag 1: Tracking count (bottom left)
  const countText = `Tracking: ${tracks.length} object${tracks.length === 1 ? "" : "s"}`;
  ctx.font = "bold 12px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  const countWidth = ctx.measureText(countText).width + 16;
  ctx.fillStyle = "rgba(11, 27, 51, 0.85)";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(16, h - 38, countWidth, 24, 6) : ctx.fillRect(16, h - 38, countWidth, 24);
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(countText, 24, h - 22);

  // Tag 2: Sampling speed (bottom right)
  const sampleText = "Sampling: 1.5s";
  const sampleWidth = ctx.measureText(sampleText).width + 16;
  const sampleX = w - sampleWidth - 16;
  ctx.fillStyle = "rgba(11, 27, 51, 0.85)";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(sampleX, h - 38, sampleWidth, 24, 6) : ctx.fillRect(sampleX, h - 38, sampleWidth, 24);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(sampleText, sampleX + 8, h - 22);
}

export function drawDemoScene(canvas, tracks, frameNo, scenarioId = "all") {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

  // Use realistic background photo if loaded, or polished vector scene
  let bg = defaultStreetImg;
  if (scenarioId === "steps" && stepsImg?.complete) bg = stepsImg;

  if (bg && bg.complete && bg.naturalWidth > 0) {
    ctx.drawImage(bg, 0, 0, w, h);
    // Subtle gradient overlay for contrast with UI tags
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(7, 24, 46, 0.15)");
    grad.addColorStop(0.7, "rgba(7, 24, 46, 0.05)");
    grad.addColorStop(1, "rgba(7, 24, 46, 0.45)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Vector fallback matching city pedestrian walkway
    ctx.fillStyle = "#c5dcfa";
    ctx.fillRect(0, 0, w, h * 0.42);

    // Modern glass high-rises
    ctx.fillStyle = "#64748b";
    ctx.fillRect(w * 0.02, h * 0.05, w * 0.22, h * 0.40);
    ctx.fillStyle = "#475569";
    ctx.fillRect(w * 0.76, h * 0.04, w * 0.22, h * 0.41);

    // Windows pattern
    ctx.fillStyle = "#93c5fd";
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(w * 0.05 + c * w * 0.05, h * 0.08 + r * h * 0.07, w * 0.035, h * 0.04);
        ctx.fillRect(w * 0.79 + c * w * 0.05, h * 0.07 + r * h * 0.07, w * 0.035, h * 0.04);
      }
    }

    // Green trees
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(w * 0.28, h * 0.26, 28, 0, Math.PI * 2);
    ctx.arc(w * 0.72, h * 0.24, 32, 0, Math.PI * 2);
    ctx.fill();

    // Paved promenade walkway
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(w * 0.38, h * 0.42);
    ctx.lineTo(w * 0.62, h * 0.42);
    ctx.lineTo(w * 0.92, h);
    ctx.lineTo(w * 0.08, h);
    ctx.closePath();
    ctx.fill();

    // Pavement pavers grid lines
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 6; i++) {
      const y = h * 0.42 + (h * 0.58 * i) / 7;
      ctx.beginPath();
      ctx.moveTo(w * (0.38 - i * 0.05), y);
      ctx.lineTo(w * (0.62 + i * 0.05), y);
      ctx.stroke();
    }
  }

  // Draw simulated tracked objects for Demo frame
  for (const t of tracks) {
    if (!t.box) continue;
    const x = t.box.x * w, y = t.box.y * h, bw = t.box.width * w, bh = t.box.height * h;
    const color = BOX_COLORS[t.category] || "#f59e0b";

    if (t.category === "person" && (!bg?.complete || bg === stepsImg)) {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(x + bw / 2, y + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x + bw * 0.2, y + 26, bw * 0.6, bh * 0.4);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x + bw * 0.25, y + 26 + bh * 0.4, bw * 0.22, bh * 0.5);
      ctx.fillRect(x + bw * 0.53, y + 26 + bh * 0.4, bw * 0.22, bh * 0.5);
    } else if (t.category === "fixed_obstacle" && (!bg?.complete || bg === stepsImg)) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x + bw / 2 - 4, y, 8, bh);
    }
  }
}

export function drawStandbyOverlay(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Subtle safe corridor guidelines
  const corridorTopW = w * 0.32;
  const corridorBottomW = w * 0.54;
  const topX1 = (w - corridorTopW) / 2;
  const topX2 = topX1 + corridorTopW;
  const botX1 = (w - corridorBottomW) / 2;
  const botX2 = botX1 + corridorBottomW;
  const corridorTopY = h * 0.40;
  const corridorBotY = h - 38;

  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";

  ctx.beginPath();
  ctx.moveTo(topX1, corridorTopY);
  ctx.lineTo(botX1, corridorBotY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(topX2, corridorTopY);
  ctx.lineTo(botX2, corridorBotY);
  ctx.stroke();

  // Standby Center Reticle with subtle pulse
  const cx = w / 2;
  const cy = h * 0.48;
  const pulse = Math.sin(Date.now() / 400) * 3;
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 28 + pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Reticle crosshair ticks
  ctx.beginPath();
  ctx.moveTo(cx - 36, cy); ctx.lineTo(cx - 20, cy);
  ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 36, cy);
  ctx.moveTo(cx, cy - 36); ctx.lineTo(cx, cy - 20);
  ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + 36);
  ctx.stroke();

  // Center standby pill
  ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  const statusTxt = "SightGuide Ready · Tap Start Live or Demo";
  const pillW = ctx.measureText(statusTxt).width + 20;
  ctx.fillStyle = "rgba(11, 27, 51, 0.85)";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect((w - pillW) / 2, cy + 42, pillW, 24, 6) : ctx.fillRect((w - pillW) / 2, cy + 42, pillW, 24);
  ctx.fill();
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(statusTxt, (w - pillW) / 2 + 10, cy + 58);

  ctx.restore();
}
