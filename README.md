# Hybrid Thermo Router

#BuildHybridAI 2026 entry by Igor Holt. A web workspace that keeps short or private prompts on-device with Gemini Nano when it is available, and sends long text or images to a cloud Gemini model through Firebase AI Logic. A live trace shows the requested mode, the actual `inferenceSource`, wall latency, and uncalibrated energy and cost estimates.

Private repository: [Genesis-Conductor-Engine/hybrid-thermo-router](https://github.com/Genesis-Conductor-Engine/hybrid-thermo-router). The repo stays private until Igor approves making it public. This is not a submitted or production-deployed app.

## Run without Firebase

```sh
npm ci
npm run dev
```

Open the local Vite URL. Default **MOCK** uses deterministic fixtures, not an AI model, and makes no Firebase or model requests. Try short text; untick “Mock Nano available” to simulate cloud fallback; enable Private to see fail-closed behavior; load the long example to see cloud escalation. Every simulated source and output is labeled. Network and power simulation controls are labeled separately from detected state.

## Build and tests

```sh
npm run build
npm test
npm run test:browser
```

Built and tested with Node 24.22.1, npm 11.21.1, Vite 8.3.7, TypeScript 7.0.2, and Firebase 13.2.0. Use a supported Node version (Node 22.12+ or 24 recommended). Ten unit tests and two local Chrome browser tests cover routing, App Check env selection, mock fixtures, and a true network-offline reload of the built app. Browser tests use installed Chrome at `/usr/bin/google-chrome` in `playwright.config.ts`; adjust that path on other systems. They start and stop a localhost preview server automatically.

For built offline mock testing: `npm run preview`, visit once online, wait for service-worker installation, reload once to take control, disconnect the network, then reload again. The public app assets are precached locally. No Firebase configuration, credentials, or model is required. First-ever offline visits cannot download an uncached app. `npm run dev` is not the offline-cache test target.

## Real Firebase mode

Follow `../firebase_setup.md`. The Firebase project `hybrid-thermo-router` is on the Spark plan with the Gemini Developer API. Copy `.env.example` to ignored `.env.local` and set the public Firebase web config plus a reCAPTCHA site key.

App Check defaults to **reCAPTCHA Enterprise** (`VITE_APP_CHECK_PROVIDER=enterprise`). Set `v3` to use `ReCaptchaV3Provider` instead. Put the public site key in `VITE_RECAPTCHA_SITE_KEY`; `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is still accepted as a fallback. Never add a service-account key, a direct Gemini secret, or an App Check debug token to `VITE_*` variables. `firebase.config.example.json` is a placeholder shape, not connected config.

For local development, set `VITE_APP_CHECK_DEBUG=true` and run `npm run dev`. The adapter enables the debug provider **only in Vite development mode**. A registered debug token may be supplied at dev-server start from the gitignored file `.appcheck-debug-token` or from the non-`VITE_` environment variable `APP_CHECK_DEBUG_TOKEN_FILE`. Production builds do not read that file and ignore the debug setting. Do not commit, display, or ship a debug token. Public Hosting should use real attestation.

With valid configuration, select **Firebase**, then click **Prepare Nano** from a user gesture. Chrome desktop 139+, the required flag and hardware, and a completed model download are needed for local inference. `initializeDeviceModel()` was added in Firebase JS 12.14.0; this app pins 13.2.0. The cloud model defaults to **`gemini-3.5-flash-lite`**, the official hybrid web default for the Gemini Developer API as of 10 November 2026; confirm current project availability and quota before relying on it.

Every real generation is `generateContent()` via `firebase/ai`. The app never directly generates with Chrome's `LanguageModel` or calls another model provider. `PREFER_ON_DEVICE` permits SDK cloud fallback for short public prompts; Private, battery, or offline forces `ONLY_ON_DEVICE`. Long (>1,200 characters) or JPEG/PNG image tasks use `ONLY_IN_CLOUD` only when policy permits; otherwise they are blocked. File cap: 4 MiB. Character thresholds are not exact token limits. Power detection may be unavailable and is displayed as unknown. Network and power are checked before dispatch; no ongoing guarantee is made after a request has already started.

The trace displays the actual SDK source, normalized to `ON_DEVICE` / `IN_CLOUD` (SDK values `on_device` / `in_cloud`), not an assumed source from the requested mode. Failure or missing source is `UNKNOWN`; errors do not silently become mock results. Local-only forbids sending prompt contents to the cloud; App Check or SDK metadata can still use the network. Offline real inference additionally needs a preloaded Nano model and validated runtime session behavior.

Headless Chrome in this development environment has verified a real `ONLY_IN_CLOUD` response and a real `PREFER_ON_DEVICE` fallback to `IN_CLOUD` through Firebase AI Logic with App Check. On-device Nano was not available here (local initialization failed). A real `ON_DEVICE` result still needs to be captured on Chrome 139+ with Gemini Nano.

## Estimates — not efficiency measurements

- Energy: assumed **10 W local / 2 W client cloud-waiting × wall seconds / 3,600 = Wh**. Uncalibrated illustrative client-only assumptions; includes waiting and excludes server energy, network infrastructure, model downloads, and embodied energy. No energy-saving, carbon, or battery-efficiency claim is supported.
- Provider cost: text characters/4 rounded up × configured verified USD per million tokens. Blank rates mean **unknown**, not zero. Images, hidden tokens, quotas, and pricing tiers are not modeled. Local provider inference fee is $0, not zero operating cost.
- Mock latency measures fixture execution only; its source and energy figures are hypothetical, not inference evidence.

No raw prompts, images, or answers are written to persistent storage or trace exports. The trace is memory-only (last 30), with safe text output and sanitized errors. The service worker caches public static assets only, not requests or responses.

## Files and readiness

`src/router.ts`: pure policy. `firebase-adapter.ts`: lazy real SDK adapter and App Check (Enterprise or v3). `mock.ts`: fixture adapter. `estimates.ts`: explicit estimation method. `main.ts`: workspace, routing explanation, and trace UI. `firebase.json` targets `dist` for a future approved Hosting deployment and contains no project binding.

A hosted judge URL, production App Check enforcement evidence, a public repository, the demo video publication, and Devpost submission each still need Igor's explicit approval. Official Rules expected 11 November 2026 at 12:00 PM ET (America/New_York) must be reviewed before relying on current competition research. The 10 November 2026 scaffold is pre-existing work and should be disclosed when describing work completed during the competition.

Do not deploy, publish, contact anyone, or submit without the relevant explicit approval. Target packet: 18 November 2026, 5:00 PM ET (America/New_York); 19–23 November buffer. See `../build_plan.md` for milestones and the demo and Devpost outlines.

License: Apache-2.0 (`LICENSE`), copyright 2026 Igor Holt. Working copyright attribution is not a claim that Igor personally authored every line.
