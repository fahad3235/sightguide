# Architecture

## Flow

```
Phone rear camera (getUserMedia, facingMode ideal environment)
  -> sample every 1.5 seconds, downsized JPEG around 640px, sequence + timestamp
  -> POST /api/analyze-frame (Live Mode only, server-only key)
  -> Muse Spark (muse-spark-1.3): up to 3 candidate hazards, JSON, uncertain allowed
  -> SAM (sam-3.1): one concept per request, max 2 concepts per frame
  -> Local tracker: stable T-001 IDs, IoU + centroid + category, expiry after 3 missing samples
  -> Risk engine: path + band + motion + category, High/Medium/Low, sorted
  -> Guidance validator: max 7 words, no left/right without clearance, no safety guarantees
  -> Direction lock: 2-frame persistence, higher-priority override, band/5-second repeat only
  -> One spoken English instruction via browser speech synthesis, or large on-screen text
```

## Demo Mode flow

Demo Mode uses the same tracker, risk engine, direction lock, speech, and mask renderer, but with deterministic staged detections from `public/demo/scenarios.js`. No network call to Meta is made. Every demo frame and mask is labelled DEMO / DEMO MASK.

## State labels

- CAMERA LIVE: real camera stream active.
- ANALYSIS LIVE: real Meta API result received and validated for a real sampled frame.
- DEMO: simulated or pre-recorded data.
- WAITING FOR CAMERA: permission not granted or camera off.
- ANALYSIS ERROR: real processing failed and has not recovered.
- STALE RESULT: last analysis older than 5 seconds.

## Modules

- `public/modules/tracker.js`: association, IoU, centroid, motion trend, expiry.
- `public/modules/risk-engine.js`: scoring, levels, sorting, conservative fallbacks.
- `public/modules/direction-lock.js`: lock, pending, override, repeat rules.
- `public/modules/speech.js`: browser speech synthesis, stop.
- `public/modules/mask-renderer.js`: box overlay on the sampled frame, demo scene drawing.
- `public/demo/scenarios.js`: deterministic demo steps.
- `lib/meta-client.js`: Meta API calls, timeouts, one concept per SAM request.
- `lib/parse-model-output.js`: Spark JSON validation, SAM result parsing, zero-match handling.
- `lib/validate-guidance.js`: spoken instruction validation.
- `lib/config.js`: environment variables, limits.
- `server.js`: static serving, health, analyze-frame, payload validation, safe errors.
