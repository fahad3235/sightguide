# Test report — SightGuide v2.0, 2026-10-26

## Unit and API tests

- Environment: Node v24.22.1, Linux VM, no dependencies.
- Command: `npm test` (Node test runner, `node --test test/*.test.js`)
- Result: **29 tests pass, 0 fail** (tracker 7, risk 6, direction-lock 6, guidance-validation 6, API 4).
- Problems found and fixed during testing:
  1. Tracker did not preserve `position`, so centre hazards scored as side hazards and never reached High. Fix: tracker stores `position` and `inPath` on creation and on match. Re-tested: pole in path reaches High.
  2. Demo pole boxes moved 0.08 per sample, so the tracker correctly created new IDs instead of keeping one ID. Fix: demo boxes move about 0.04 per sample, so the same pole keeps T-001 across samples. Re-tested in browser.
  3. Oversized API payload destroyed the socket and caused a client connection reset instead of a clean 413. Fix: server drains oversized bodies and returns 413. Re-tested: 29/29 pass.
  4. Browser module import `../lib/validate-guidance.js` was outside the static root and returned 403. Fix: validation module lives in `public/modules/`, server lib re-exports it. Re-tested: all module URLs return 200.

## Browser tests (real headless Chrome)

- Environment: headless_shell-1187, served from `node server.js` on http://127.0.0.1:3000.
- 390px portrait: PASS — header, states, large guidance, camera panel, controls all readable, no horizontal overflow in screenshot.
- 320px portrait: screenshot taken, layout stacks, controls remain reachable. No overflow was observed in the screenshot width; Stop remains in the controls section below the media panels.
- Desktop: not screenshot-tested in this run; layout is a single centred column (max 720px) and is readable by construction. Marked as not fully verified below.
- Demo Mode: PASS — Start demo runs every 1.5 seconds, risk list shows pole T-001 Close Medium at frame 4, guidance becomes “Obstacle very close. Stop and seek assistance.” by frame 7, analysis state stays DEMO.
- Direction lock: PASS in unit tests and in browser — noisy frame and repeated frames did not flip the spoken direction in the demo sequence.
- Health endpoint: PASS — `GET /api/health` returns configured false, model IDs muse-spark-1.3 and sam-3.1, base https://api.meta.ai/v1, and no key.
- Static modules: PASS — `/app.js` and `/modules/validate-guidance.js` return 200.
- Console: no application exceptions were reported by the CDP test harness during the demo run.

## BLOCKED — not claimed as passed

- Live Meta API (Muse Spark + SAM 3.1): BLOCKED — no MODEL_API_KEY was available in this environment. Server returns 503 unconfigured, and the app shows ANALYSIS ERROR with a Demo fallback. Request shapes in `lib/meta-client.js` follow the documented starting points in the master prompt and must be re-verified against current official docs before use with a real key.
- Real-device rear camera: BLOCKED — headless environment has no camera. Camera code uses getUserMedia with facingMode ideal environment, permission-denied handling, and Stop ending tracks, but this was not tested on a real phone.
- Real-device English speech: BLOCKED — headless environment has no voice output to hear. Speech code uses browser speechSynthesis with en-US after a user tap, and falls back to large on-screen text, but actual voice quality was not heard.
- Desktop screenshot: not fully verified in this run (see above).
- Demo video recording and GitHub publication: not done. Links in README and app are marked “not published yet”.

## Known limitations

See `docs/SAFETY-AND-LIMITATIONS.md`. In short: coarse distance bands only, no left/right instructions, no safety claim, no blind-user validation, live API unverified.

## Final merged build re-verification (2026-10-27)

- Command: `npm test` on Node v24.19.0 (Windows) � **29 pass, 0 fail** after the merge.
- Server smoke (in-process): `GET /api/health` 200 (`configured:false`, no key exposed), `/`, `/app.js`, `/styles.css`, `/modules/tracker.js`, `/demo/scenarios.js` all 200; malformed analyze payload correctly 400.
- Browser (Review-pane preview of `public/index.html`): page loads, scenario picker populates (5 options), speech badge shows "Speech: available (en)", health-check failure without a server is handled gracefully with the no-key status message. Step-sample clicked 7 times: guidance progressed to "Obstacle very close. Stop and seek assistance." on demo frame 7 with DEMO labelling � PASS.
- Bug found and fixed in merge: prior client expected `data.hazards` that the server never returned, so Live mode could never show detections. Server/`lib/meta-client.js` now returns merged `hazards[]`; box-less candidates are list-only.
- Screenshot capture: BLOCKED (browser window not visible to the screenshot tool); accessibility-snapshot evidence used instead. Live Meta API, real-device camera, and heard speech remain BLOCKED as above.

## UI rebuild from supplied design board (2026-10-27)

- Rebuilt the front end to match the supplied SightGuide UI board: Welcome, Camera Permission, Live (dark), Navigation History, Settings, Demo Mode scenario list, Detection Overlay controls, AI Processing, About, Safety � plus the Desktop side-panel layout at >=1024px and the phone layout at mobile widths.
- All controls are wired, no dead buttons: overlay toggles/opacity feed `mask-renderer.js`, scenario list + picker select the same deterministic steps, History records spoken guidance this session, Settings radios/switches are functional or explicitly labelled not-enabled (Bangla).
- Deliberate safety deviations from the artwork (per master prompt, artwork text is NOT copied where unsafe): no exact "1-3 m" distances (coarse bands only), no "keep left/right" instructions (no clearance check exists � conservative fallbacks only), truthful DEMO/LIVE pills instead of a generic LIVE badge.
- Re-verified: `npm test` 29/29 pass; server smoke 200s; browser preview: Welcome -> Try Demo Mode -> scenario list renders -> Start Demo -> Live screen, DEMO pill, demo frame 4 with stable `pole ID: 001`. Only console error is the expected `/api/health` fetch in file-preview mode, handled gracefully.

## Phone camera fix (2026-10-27)

- Root cause 1: phone opened the app over `http://192.168.1.105:3000` (LAN HTTP). Phone browsers expose `navigator.mediaDevices` / `getUserMedia` ONLY on secure contexts (HTTPS or localhost), so camera access was impossible. The old catch block silently started Demo Mode, hiding the reason.
- Root cause 2: `renderCurrentFrame` always painted the staged demo scene on the canvas that covers the `<video>` element, so even a granted camera feed was hidden under the demo drawing.
- Fixes: camera-mode rendering now draws the real video frame (`drawCameraFrame`); `startCamera` pre-checks `isSecureContext` / `mediaDevices`, awaits `video.play()`, retries plain constraints on OverconstrainedError, and shows a specific banner per error name (denied / not found / in-use / security) instead of silent fallback. Banner offers "Take a photo instead" (`<input capture=environment>`, honestly labelled not model-analysed) and "Use Demo Mode". Pill now reads CAMERA LIVE only when a stream is actually running.
- Phone path: `START-PHONE-CAMERA.bat` starts the server + `cloudflared tunnel --url http://localhost:3000`. Verified 2026-10-27: tunnel issued a https://*.trycloudflare.com URL (publicly trusted, no cert warning). Optional direct HTTPS via `certs/cert.pem`+`certs/key.pem` also supported in `server.js`.
- Also applied from the polish prompt: `.status-bar` hidden and safe-area bottom padding added under `@media (max-width: 768px)`; haptic vibration (High `[100,50,100]`, Medium `80`) on spoken risk; silent speech-unlock utterance on first tap (Get Started / Allow Camera).
- Live Meta API note: env var in this codebase is `MODEL_API_KEY` (see `.env.example`), not `META_AI_API_KEY`; route is the documented Responses shape in `lib/meta-client.js`, still unverified without a key. Camera works regardless � analysis falls back truthfully.
- Re-verified: `npm test` 29/29 pass; server smoke 200s. Real-phone camera grant itself is BLOCKED from this environment (needs the user's phone on the tunnel URL) � the tunnel URL issuance was verified.
