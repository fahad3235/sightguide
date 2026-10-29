# SightGuide demo video script — 3 minutes maximum

Record from the actual built application. Every pre-recorded or simulated frame is visibly marked DEMO. Do not edit a fake result to look like a live API response.

## 0:00–0:15 — The problem

Show the app name and the assistive-only warning. Say: “SightGuide explores how multimodal AI can turn selected camera frames into concise obstacle awareness, without overwhelming the user with constant narration.” Do not claim it replaces a cane or guarantees safe walking.

## 0:15–0:40 — The real system architecture

Show the interface and point to: rear camera / sampled frame, Muse Spark scene interpretation, SAM 3.1 box and pixel mask, stable local track ID, deterministic risk policy and direction lock. Only claim live API integration if an actual API response is shown. Otherwise state that this segment uses Demo Mode and explain what is simulated.

## 0:40–1:30 — The key scenario sequence

1. Low-risk side obstacle appears: show the visual risk list, voice remains silent.
2. A tracked obstacle appears closer: show the same stable track ID and a coarse band change.
3. Demonstrate one short English instruction.
4. Introduce a higher-priority candidate: show a justified conservative override.
5. Show that one noisy frame does not flip the spoken direction.

Use a split view so judges can see both the source frame/mask and the spoken output. Display status and sampling timing honestly.

## 1:30–2:15 — Why this is more than object detection

Explain in plain language: local identity association across independent camera samples, risk ordering instead of reading every detected object, coarse distance bands not fake exact range, a direction lock that suppresses contradictory chatter, model-output validation and conservative fallback, clear separation of real API output and demo simulation. If any feature is not actually implemented and tested, do not claim it in narration.

## 2:15–2:40 — Robustness and transparency

Show Demo Mode working with no API key, or demonstrate the missing-key fallback. Show a controlled API failure state if available. Show Distance unknown or an uncertain scene handled honestly. Avoid staging an unsafe physical test.

## 2:40–3:00 — Close

Keep the safety warning visible for at least three seconds. Show the actual repository or README and close with: “SightGuide — live video to guide, assistive only. A prototype for clearer obstacle awareness, not a safety guarantee.”

## Recording checklist

Record in a clean browser profile without exposing account information. Do not show environment files, keys, secrets, private dashboards, or personal notifications. Ensure demo frames and simulated results have a persistent DEMO label. Enable captions or add a readable narration transcript. Use a readable viewport and avoid tiny screen text. Keep the final published video at or below three minutes. Use only video, audio, code, and media you have permission to publish.
