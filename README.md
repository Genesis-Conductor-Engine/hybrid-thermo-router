# Hybrid Thermo Router

Provisional #BuildHybridAI technical scaffold for Igor Holt. Working repo name: **Genesis-Conductor-Engine/hybrid-thermo-router** (not created; owner/name/publication require Igor's approval). Alternative owner: `igor-holt`. The concept is not formally selected. This local folder is not a submitted or production-ready app.

## Run without Firebase

```sh
npm ci
npm run dev
```

Open the local Vite URL. Default **MOCK** uses deterministic fixtures, not an AI model, and makes no Firebase/model requests. Try short text; untick “Mock Nano available” to simulate cloud fallback; enable Private to see fail-closed behavior; load the long example to see cloud escalation. Every simulated source/output is labeled. Network and power simulation controls are labeled separately from detected state.

## Build and tests

```sh
npm run build
npm test
npm run test:browser
```

Built/tested with Node 24.22.1, npm 11.21.1, Vite 8.3.7, TypeScript 7.0.2, Firebase 13.2.0. Use a supported Node version (Node 22.12+ or 24 recommended). Eight unit tests and two local Chrome browser tests passed, including actual network-offline reload. Browser tests use installed Chrome at `/usr/bin/google-chrome` in `playwright.config.ts`; adjust that path on other systems. They start and stop a localhost preview server automatically. No real Firebase or Nano inference has been tested.

For built offline mock testing: `npm run preview`, visit once online, wait for service-worker installation, reload once to take control, disconnect the network, then reload again. The public app assets are precached locally. No Firebase configuration, credentials or model is required. First-ever offline visits cannot download an uncached app. `npm run dev` is not the offline-cache test target.

## Real Firebase mode (not yet configured)

Follow `../firebase_setup.md`. Copy `.env.example` to ignored `.env.local`; set public Firebase web config + reCAPTCHA Enterprise site key. Never add a service-account key, direct Gemini secret or App Check debug token to Vite env variables. `firebase.config.example.json` is a placeholder shape, not connected config.

Initialize the approved Firebase project through the AI Logic console workflow and enforce App Check. Use a private, per-browser debug token locally (`VITE_APP_CHECK_DEBUG=true` in development only); public production Hosting needs real attestation, not a public shared token. Debug tokens must not be committed, displayed in demo footage or shipped to users.

With valid configuration, select **Firebase**, then click **Prepare Nano** from a user gesture. Chrome desktop 139+, required flag/hardware and a completed model download are needed for local inference. The SDK method used was added in 12.14.0; 12.5.0 is only the historical source-reporting minimum. This scaffold pins 13.2.0 and explicitly sets `gemini-3.5-flash-lite` as fallback; verify project/provider availability and quota first.

Every real generation is `generateContent()` via `firebase/ai`. The app never directly generates with Chrome's `LanguageModel` or calls another model provider. `PREFER_ON_DEVICE` permits SDK cloud fallback for short public prompts; Private, battery or offline forces `ONLY_ON_DEVICE`. Long (>1,200 characters) or JPEG/PNG image tasks use `ONLY_IN_CLOUD` only when policy permits; otherwise they are blocked. File cap: 4 MiB. Character thresholds are not exact token limits. Power detection may be unavailable and is displayed as unknown. Network/power is checked before dispatch; no ongoing guarantee is made after a request has already started.

The trace displays actual SDK source normalized to `ON_DEVICE` / `IN_CLOUD` (SDK values `on_device` / `in_cloud`), not assumed source from requested mode. Failure/missing source is `UNKNOWN`; errors do not silently become mock results. Local-only forbids sending prompt contents to cloud; App Check/SDK metadata can still use network. Offline real inference additionally needs a preloaded Nano model and validated runtime/session behavior.

## Estimates — not efficiency measurements

- Energy: assumed **10 W local / 2 W client cloud-waiting × wall seconds / 3,600 = Wh**. Uncalibrated illustrative client-only assumptions; includes waiting and excludes server energy, network infrastructure, model downloads and embodied energy. No energy-saving, carbon or battery-efficiency claim is supported.
- Provider cost: text characters/4 rounded up × configured verified USD per million tokens. Blank rates mean **unknown**, not zero. Images/hidden tokens/quotas/pricing tiers are not modeled. Local provider inference fee is $0, not zero operating cost.
- Mock latency measures fixture execution only; its source and energy figures are hypothetical, not inference evidence.

No raw prompts/images/answers are written to persistent storage or trace exports. Trace is memory-only (last 30), with safe text output and sanitized errors. The service worker caches public static assets only, not requests or responses.

## Files and readiness

`src/router.ts`: pure policy; `firebase-adapter.ts`: lazy real SDK adapter and App Check; `mock.ts`: fixture adapter; `estimates.ts`: explicit estimation method; `main.ts`: workspace/trace UI. `firebase.json` targets `dist` for a future approved Hosting deployment and contains no project binding.

Real source paths, App Check enforcement, judge cold-start access, billing, Nano availability, deployment and legal eligibility still need verification. A mock demo cannot satisfy the Firebase runtime requirement. Official Rules expected November 11 at noon ET must be reviewed before relying on current competition research. This November 10 scaffold is pre-existing work and should be disclosed when describing work completed during the competition.

No GitHub repository, Firebase project or deployment has been created. Do not deploy, publish, contact anyone or submit from these instructions without the relevant explicit approval. Target packet: November 18, 2026, 5:00 PM ET; November 19–23 buffer. See `../build_plan.md` for milestones and the demo/Devpost outlines.

License: Apache-2.0 (`LICENSE`), copyright 2026 Igor Holt. Working copyright attribution is not a claim that Igor personally authored every scaffold line.
