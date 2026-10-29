# SightGuide

SightGuide is a phone-first web app that turns selected rear-camera frames into one short spoken English obstacle instruction, for blind and low-vision users.

## Who it is for

Blind and low-vision people who may benefit from additional situational information, tested in a controlled, familiar, low-risk path with a sighted companion present.

## ASSISTIVE ONLY — NOT A SAFETY DEVICE

SightGuide is an experimental assistive prototype only. It is not a certified mobility aid, not a safety device, not an emergency service, and not a replacement for a white cane, guide dog, sighted companion, or mobility training. It must never imply that the path is safe merely because the model did not detect an obstacle. It has sampling and API delays and can miss hazards.

**Assistive only. Guidance has a 1–3 second delay for API processing. It is not an instant collision warning. Demo on a safe test path with a sighted companion. Do not use alone in traffic.**

## What is real today

- **CAMERA LIVE:** a real camera stream is active, when permission is granted.
- **ANALYSIS LIVE:** only after a real Meta API response has completed for a real sampled camera frame. This was **not** tested in this build, because no API key was available.
- **DEMO:** simulated, pre-recorded, deterministic staged frames. Demo Mode works without a key, without Meta access, and without camera permission, and is the complete showcase in this build.
- No live model result is claimed in this build. See `docs/TEST-REPORT.md`.

## Features

Sampled frames every 1.5 seconds, Muse Spark scene interpretation in Live Mode, SAM 3.1 segmentation in Live Mode, stable local tracking across samples, coarse distance bands, deterministic risk prioritisation, direction lock, conservative fallback guidance, English speech, and a reliable Demo Mode.

**Final merged build (this package):** combines the modular tested backend from the v2 ZIP, the richer standalone single-file UI, and the v2 master prompt. New/merged in this build: scenario picker (full walkthrough or Scenarios 1–4 individually), Step-sample control, speech-availability badge with installed en-US/en-GB voice selection, scene-summary line, hazard/distance/track/time meta grid, live telemetry (sequence, last sample/analysis, skipped, processing ms), and a fixed Live contract — the server now returns merged `hazards[]` (scene candidates + SAM boxes; candidates without a SAM box are list-only, never drawn as a fake mask), stale/out-of-session live responses are discarded, and `ANALYSIS LIVE` appears only after the first validated live result (never at camera start).

## Architecture

Camera → sample every 1.5 seconds → Muse Spark candidates → SAM one concept per request, max 2 per frame → local tracker (stable T-001 IDs) → risk engine → guidance validator → direction lock → one spoken instruction.

Modules: `public/modules/tracker.js`, `risk-engine.js`, `direction-lock.js`, `speech.js`, `mask-renderer.js`, `demo-engine.js` (in `public/demo/scenarios.js`). Server: `lib/config.js`, `meta-client.js`, `parse-model-output.js`, `validate-guidance.js`, `server.js`. See `docs/ARCHITECTURE.md`.

## Meta models

- Muse Spark: `muse-spark-1.3` (from `MUSE_SPARK_MODEL`, default in `.env.example`).
- SAM: `sam-3.1` (from `SAM_MODEL`).
- Base URL: `https://api.meta.ai/v1`, Bearer `MODEL_API_KEY` on the server only.
- Official docs to re-check before live use: https://dev.meta.ai/docs/overview, https://dev.meta.ai/docs/models, https://dev.meta.ai/docs/sam/overview, https://dev.meta.ai/docs/sam/segmenting, and the hackathon page https://dev.meta.ai/events/global-hackathon.
- These models do not guarantee safety. SAM uses one concept per request. Native SAM video tracking IDs are not assumed for independent still-image samples; local tracking is used instead.

## Run locally

Requires Node 20 or newer. No dependencies to install.

```bash
cd sightguide-v2
npm start
```

Then open http://localhost:3000/ on your phone (HTTPS or localhost is required for camera) or in a browser.

## Demo Mode without a key

1. Open the app.
2. Press **Start demo**.
3. Watch the staged walk: side obstacle (voice silent), fixed obstacle in path (band Far to Very close, same track ID), higher-priority vehicle override, uncertain scene with no high-risk claim.
4. Press **Pause analysis** to pause, **Reset demo** to restart, **Stop camera** to stop everything (Demo Mode has no camera to stop, but speech and timers stop).

## Live Mode configuration

1. Copy `.env.example` to `.env` and set `MODEL_API_KEY` (server only, never in frontend code).
2. Re-verify model IDs and request shapes in the current official Meta docs.
3. Run `npm start`.
4. Press **Start camera**, allow the rear camera, and watch the camera state become `CAMERA LIVE` and, only after a valid real model result, `ANALYSIS LIVE`.
5. If the key is missing, malformed, timed out, or rate-limited, the app shows `ANALYSIS ERROR` and offers Demo Mode. It never shows a demo result as live.

## Privacy

Only sampled frames are sent to the server, and only in Live Mode, for model inference. No video is stored, no frames are archived, no analytics or tracking scripts are included in the MVP. Sampled images sent to Meta in Live Mode are governed by the current provider terms; this app does not promise a provider retention policy.

## Anti-confusion and safety policy

Top-1 speech only. Direction lock: a new direction needs 2 consecutive samples, unless a clearly higher-priority hazard overrides. Repeat only on top-risk change, material band change, higher-priority override, or 5 seconds with the same high risk. No left/right instruction is produced, because no side-clearance check is implemented. Unknown distance stays `Distance unknown`. Stale results are marked `STALE RESULT`. No state claims the path is safe because nothing was detected; the correct state is “No high-risk obstacle detected in this sample”.

## Testing

```bash
npm test
```

Result in this build: **29 tests pass, 0 fail** (Node test runner, 2026-10-26). Browser checks are recorded in `docs/TEST-REPORT.md`. Live API tests are **BLOCKED** (no key), real-device camera and speech tests are **BLOCKED** (headless environment, no camera or voice), and are not claimed as passed.

## Limitations

Monocular distance estimates are coarse heuristics, not measurement. Occlusions, tilted cameras, changing light, weather, and model mistakes can cause missed or wrong hazards. API latency can exceed the safety wording; the app marks stale results rather than hiding delay. Browser speech availability varies by device. No safety certification and no blind-user validation has been completed. See `docs/SAFETY-AND-LIMITATIONS.md`.

## Demo video link

Not published yet.

## License and asset credits

No external assets are used in the MVP. Demo scenes are drawn in code. No license is claimed for Meta models; use is governed by Meta's terms.

## UI (design-board build)

The front end follows the supplied SightGuide design board screen-for-screen: Welcome, Camera Permission, Live, Navigation History, Settings, Demo Mode, Detection Overlay, AI Processing, About, and Safety, with a desktop side-panel layout on wide screens. Where the artwork showed exact metre distances or left/right movement instructions, the live app intentionally uses coarse distance bands and conservative validated guidance instead � see the master prompt safety rules. No screen is a mockup: every control is wired to the tracker, risk engine, direction lock, speech, or overlay renderer.
