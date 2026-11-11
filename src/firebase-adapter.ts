import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from 'firebase/ai';
import { appCheckProviderKind, firebaseConfig, firebaseConfigured, recaptchaSiteKey } from './firebase-config';
import type { InferenceAdapter, RequestInput, RouteDecision, Source } from './types';

export class FirebaseAdapter implements InferenceAdapter {
  private models;
  private initialized = false;
  constructor() {
    if (!firebaseConfigured || !recaptchaSiteKey) throw new Error('Firebase config and reCAPTCHA site key are required. See README.');
    const app = initializeApp(firebaseConfig);
    // Debug tokens are dev-only and never hardcoded. A registered token may be
    // injected at Vite serve-time from a gitignored file; otherwise Firebase generates one.
    if (import.meta.env.DEV && import.meta.env.VITE_APP_CHECK_DEBUG === 'true') {
      const injected = typeof __APP_CHECK_DEBUG_TOKEN__ === 'string' && __APP_CHECK_DEBUG_TOKEN__
        ? __APP_CHECK_DEBUG_TOKEN__
        : true;
      (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = injected;
    }
    const provider = appCheckProviderKind === 'enterprise'
      ? new ReCaptchaEnterpriseProvider(recaptchaSiteKey)
      : new ReCaptchaV3Provider(recaptchaSiteKey);
    initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    // Default cloud model matches JS SDK v13+ and Gemini Developer API docs as of 2026-11-10.
    const inCloudParams = { model: import.meta.env.VITE_CLOUD_MODEL || 'gemini-3.5-flash-lite', generationConfig: { maxOutputTokens: 256 } };
    const onDeviceParams = {
      createOptions: {
        expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
        expectedOutputs: [{ type: 'text' as const, languages: ['en'] }]
      }
    };
    this.models = {
      PREFER_ON_DEVICE: getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams, onDeviceParams }),
      ONLY_ON_DEVICE: getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE, inCloudParams, onDeviceParams }),
      ONLY_IN_CLOUD: getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams })
    };
  }
  async prepare(onProgress: (value: number) => void) {
    const results = await Promise.allSettled([
      this.models.PREFER_ON_DEVICE.initializeDeviceModel(onProgress),
      this.models.ONLY_ON_DEVICE.initializeDeviceModel(onProgress)
    ]);
    this.initialized = true;
    if (results.some(r => r.status === 'rejected')) throw new Error('Local initialization unavailable. Public short prompts can still fall back via Firebase; local-only prompts will fail closed. Check Chrome 139+, flags, hardware and download.');
  }
  async run(input: RequestInput, route: RouteDecision) {
    if (route.blocked) throw new Error(route.reason);
    if (route.mode !== 'ONLY_IN_CLOUD' && !this.initialized) throw new Error('Click Prepare Nano first. No inference was attempted.');
    const model = this.models[route.mode];
    // Official hybrid get-started form: string prompt, or [prompt, inlineData part].
    const result = input.image
      ? await model.generateContent([input.prompt, { type: 'inlineData', inlineData: { data: input.image.data, mimeType: input.image.mimeType } }])
      : await model.generateContent(input.prompt);
    const raw = result.response.inferenceSource;
    const source: Source = raw === InferenceSource.ON_DEVICE ? 'ON_DEVICE' : raw === InferenceSource.IN_CLOUD ? 'IN_CLOUD' : 'UNKNOWN';
    if (route.mode === 'ONLY_ON_DEVICE' && source === 'IN_CLOUD') throw new Error('Unexpected cloud response: policy violation. Stop using this session.');
    return { source, text: result.response.text() };
  }
}
