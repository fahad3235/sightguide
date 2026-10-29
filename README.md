# SightGuide — Live AI Assistive Vision for the Visually Impaired

[![Meta Hackathon 2026](https://img.shields.io/badge/Meta%20Hackathon-2026-blue.svg)](https://dev.meta.ai/events/global-hackathon)
[![Tests Passing](https://img.shields.io/badge/Tests-29%2F29%20Passing-success.svg)](test/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Netlify Status](https://img.shields.io/badge/Netlify-Serverless%20Ready-00C7B7.svg)](https://www.netlify.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Built for the Meta Global AI Developer Hackathon 2026 — Track: Build for Your World**  
> **Author:** Ishan Ahmed Fahad (Daffodil International University, CIS, Bangladesh)

---

## 🌟 Overview

**SightGuide** is a phone-first assistive web application designed to help blind and visually impaired individuals perceive and navigate their physical surroundings. 

By capturing continuous rear-camera video samples, SightGuide leverages **Meta AI's Muse Spark** and **Segment Anything Model (SAM 3.1)** to detect immediate path obstacles, compute coarse monocular distance bands, prioritize safety hazards, and deliver concise, natural-voice audio instructions straight into the user's ears.

```
       [ Mobile Camera ]
              │ (Sampled every 1.5s)
              ▼
    [ SightGuide Web App ]
              │
              ├───► [ Meta AI Cloud Vision (Muse Spark + SAM 3.1) ]
              │       └─ Multi-concept obstacle detection & segmentation
              │
              ├───► [ Local Risk & Direction-Lock Engine ]
              │       └─ Coarse distance estimation (Very Close, 1-3m, >3m)
              │       └─ Anti-flapping direction consistency
              │
              └───► [ Synthesized Spoken Audio Output ]
                      └─ e.g. "Monitor 0.5 meters ahead. Stop."
```

---

## ⚠️ Important Safety Notice

> [!IMPORTANT]
> **ASSISTIVE PROTOTYPE ONLY — NOT A CERTIFIED MOBILITY DEVICE**  
> SightGuide is an experimental assistive tool designed to supplement, **never replace**, traditional mobility aids such as white canes, guide dogs, sighted companions, or formal O&M (Orientation and Mobility) training. 
> 
> Because cloud visual processing has inherent sampling and network latency (typically 1–3 seconds), guidance is **not** an instantaneous collision warning system. Users should always test in safe, controlled environments with a sighted companion present. SightGuide will never claim a pathway is completely safe merely because an obstacle was undetected.

---

## ✨ Key Features

1. **Real-Time Camera Guidance (Rear-Lens Priority):**
   - Direct browser access to the high-resolution rear camera with environment constraints.
   - Intelligent sampling (every 1.5 seconds) to minimize bandwidth and compute load while maintaining timely situational awareness.

2. **Meta AI Vision Integration:**
   - Powered by **Muse Spark** (`muse-spark-1.3`) for rapid scene understanding and candidate proposals.
   - **SAM 3.1** (`sam-3.1`) for zero-shot object contouring and spatial segmentation.
   - Local tracker assigning persistent temporal track IDs (e.g. `#001`, `#002`) to track dynamic vs. stationary obstacles.

3. **Spatial Risk & Direction-Lock Engine:**
   - Evaluates obstacle risk deterministically based on distance, trajectory, and urgency.
   - Implements **Direction Lock**: Prevents disorienting instructions by requiring consecutive consistent frames before switching directional prompts.
   - High-priority override: Immediate alert for sudden close-range hazards (<0.5m) or moving obstacles.

4. **Speech Synthesis & Low-Latency Audio:**
   - Natural spoken feedback formatted as single, actionable sentences (e.g., *"Step down ahead, keep right"*, *"Low branch close, stop"*).
   - Server-side and client-side fallback TTS engines ensure audio is heard reliably on any mobile browser (Safari iOS, Chrome Android).

5. **Deterministic Demo Mode (Zero Key Required):**
   - Includes 5 realistic pre-calibrated navigation scenarios (Steps, Low-hanging Branch, Open Drain, Side Pedestrian, Moving Vehicle).
   - Allows judges and users to test the full spatial audio, obstacle tracking, and guidance pipeline immediately without entering an API key.

---

## 🏗️ Architecture & Project Structure

```
SightGuide/
├── .github/
│   └── workflows/
│       └── pages.yml               # Automated GitHub Pages CI/CD workflow
├── docs/
│   ├── ARCHITECTURE.md             # Detailed engineering specifications
│   ├── DEMO-SCRIPT.md              # 3-minute video presentation script
│   ├── SAFETY-AND-LIMITATIONS.md   # Ethical AI and safety boundary disclosures
│   └── TEST-REPORT.md              # Comprehensive test audit log (29/29 passing)
├── lib/
│   ├── config.js                   # Runtime configuration and env management
│   ├── meta-client.js              # Meta AI API client (Muse Spark + SAM 3.1)
│   ├── parse-model-output.js       # JSON and contour parsing utilities
│   └── validate-guidance.js        # Strict schema verification & safety gates
├── netlify/
│   └── functions/                  # Netlify Serverless Functions
│       ├── analyze-frame.js        # Serverless Meta AI vision analysis
│       ├── api.js                  # Unified serverless API gateway
│       ├── health.js               # Service health status endpoint
│       ├── tts.js                  # Speech synthesis backend endpoint
│       └── voice-agent.js          # Interactive voice query processor
├── public/                         # Production frontend assets
│   ├── assets/                     # Crisp vector SVGs, icons, and diagrams
│   ├── demo/
│   │   └── scenarios.js            # Deterministic simulation scenarios
│   ├── modules/
│   │   ├── direction-lock.js       # Temporal stability engine
│   │   ├── mask-renderer.js        # Canvas overlay & bounding box visualizer
│   │   ├── risk-engine.js          # Hazard prioritizer
│   │   ├── speech.js               # Cross-platform Web Speech manager
│   │   ├── tracker.js              # Multi-frame bounding box tracker
│   │   └── validate-guidance.js    # Client-side verification
│   ├── app.js                      # Main application controller
│   ├── index.html                  # Accessible, responsive mobile UI
│   └── styles.css                  # Accessible high-contrast modern design
├── test/                           # Automated test suite (Node test runner)
│   ├── api.test.js
│   ├── direction-lock.test.js
│   ├── guidance-validation.test.js
│   ├── risk-engine.test.js
│   └── tracker.test.js
├── .gitignore                      # Strict privacy & secret filters
├── netlify.toml                    # Netlify production deployment configuration
├── package.json                    # Project metadata and test scripts
├── server.js                       # Express-free native Node.js HTTP/HTTPS server
└── START-PHONE-CAMERA.bat          # 1-click Windows launcher with Cloudflare Tunnel
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20.0 or higher
- Modern mobile browser (Chrome on Android, Safari on iOS) or Desktop browser with camera

### 1. Clone & Run
```bash
git clone https://github.com/fahad3235/SightGuide.git
cd SightGuide
npm start
```
Open **`http://localhost:3000`** in your browser to explore Demo Mode.

### 2. Connect Your Phone Camera (Cloudflare Tunnel)
Because mobile browsers enforce camera permissions only over HTTPS, you can use the included tunnel script:
```bash
# On Windows, run the one-click launcher:
START-PHONE-CAMERA.bat
```
This starts the local server and generates a secure public HTTPS URL (e.g. `https://xxxx.trycloudflare.com`) that you can open on your smartphone.

---

## 🌐 Deploy to Netlify

SightGuide is pre-configured for one-click deployment on Netlify using Netlify Serverless Functions:

1. **Connect GitHub to Netlify:**
   - Log in to [Netlify](https://app.netlify.com).
   - Click **Add new site** > **Import an existing project**.
   - Select **GitHub** and choose your repository: **`fahad3235/SightGuide`**.

2. **Configure Build Settings:**
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
   - Netlify will automatically detect `netlify.toml` and apply these settings.

3. **Set Environment Variables:**
   - Go to **Site configuration** > **Environment variables** > **Add a variable**.
   - Key: `MODEL_API_KEY`
   - Value: *(Your Meta AI API key)*
   - Scopes: Enable for Production, Deploy Previews, and Branch deploys.
   - Click **Create variable**.

4. **Deploy:**
   - Trigger a deploy or push to `main`. Netlify will host your web app and serverless endpoints globally.

---

## 🔒 Security & Privacy Guarantees

- **Zero Secret Leaks:** `.env` files are strictly excluded via `.gitignore`. API keys are accessed exclusively on the server or serverless backend (`process.env.MODEL_API_KEY`) and are **never** exposed to client browsers or committed to version control.
- **Privacy by Design:** Video streams are processed ephemerally in volatile memory. Camera frames are never stored, logged to disk, or used for surveillance.

---

## 🧪 Automated Testing

SightGuide includes comprehensive unit tests verifying the tracking algorithms, guidance validators, direction lock, and risk prioritization engines:

```bash
npm test
```

```text
✔ direction lock suppresses rapid oscillating commands (18ms)
✔ tracker maintains persistent ID across sequential frames (24ms)
✔ risk engine flags high-danger obstacle at 0.5m with immediate stop (15ms)
✔ guidance validator rejects ill-formed or unsafe output (19ms)
✔ health endpoint never exposes secret keys (22ms)

ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ todo 0
ℹ duration_ms 174
```

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details. Meta AI models (Muse Spark, SAM) are subject to Meta's developer terms of service.
