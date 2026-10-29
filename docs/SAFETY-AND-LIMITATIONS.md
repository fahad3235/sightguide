# Safety and limitations

SightGuide is an experimental assistive prototype only. It is not a certified mobility aid, not a safety device, not an emergency service, and not a replacement for a white cane, guide dog, sighted companion, or mobility training.

## Safety rules in the product

- Assistive only warning is in the header, the safety panel, the README, and the demo script, with identical wording.
- Guidance has a 1–3 second delay for API processing in the safety text. If measured latency exceeds this, the app marks results STALE RESULT rather than hiding delay.
- No instant collision warning is claimed.
- Demo only on a safe test path with a sighted companion. Do not use alone in traffic, near stairs, platform edges, water, or other hazardous locations.
- No high-risk detection in a sample does not mean the path is safe. The app says “No high-risk obstacle detected in this sample”, never “Path clear” or “You are safe”.
- No left/right movement instruction is given, because no side-clearance check is implemented. Conservative fallbacks are used instead.
- Distance is a coarse visual band only: Very close, Close, Far, or Distance unknown. No exact distance, no accuracy percentage.
- Motion trend needs at least two observations and is a visual proxy, not true world-space velocity or a guaranteed collision course.

## Limitations

- Monocular camera frames cannot measure true distance or guarantee that an alternative corridor is safe.
- Occlusion, tilt, low light, weather, motion blur, and model mistakes can cause missed, wrong, or uncertain hazards.
- Model output is a candidate interpretation, not ground truth, and is validated by local rules before speech.
- Speech synthesis availability and voice quality vary by browser and device. If speech is unavailable, large on-screen text remains.
- Camera access requires HTTPS or localhost and a user gesture.
- Live Meta API integration was not tested in this build (no key available). See TEST-REPORT.md.
- No blind-user validation, field safety testing, or accessibility certification has been completed. Automated and manual browser checks do not equal user validation.
- Privacy: sampled frames sent to Meta in Live Mode are governed by Meta's current terms. This app stores no video, but cannot promise provider retention.
