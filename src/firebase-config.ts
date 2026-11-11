type ViteEnv = {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_RECAPTCHA_SITE_KEY?: string;
  VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?: string;
  VITE_APP_CHECK_PROVIDER?: string;
};

const viteEnv: ViteEnv = ((import.meta as ImportMeta & { env?: ViteEnv }).env) ?? {};

export const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || '',
  appId: viteEnv.VITE_FIREBASE_APP_ID || '',
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || ''
};

export type AppCheckProviderKind = 'v3' | 'enterprise';

/** Prefer VITE_RECAPTCHA_SITE_KEY; keep VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as a fallback. */
export function resolveRecaptchaSiteKey(env: {
  VITE_RECAPTCHA_SITE_KEY?: string;
  VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?: string;
}): string {
  return (env.VITE_RECAPTCHA_SITE_KEY || env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '').trim();
}

/** VITE_APP_CHECK_PROVIDER=enterprise|v3; default is enterprise. Any other value is treated as enterprise. */
export function resolveAppCheckProvider(env: { VITE_APP_CHECK_PROVIDER?: string }): AppCheckProviderKind {
  return env.VITE_APP_CHECK_PROVIDER === 'v3' ? 'v3' : 'enterprise';
}

export const recaptchaSiteKey = resolveRecaptchaSiteKey(viteEnv);
export const appCheckProviderKind = resolveAppCheckProvider(viteEnv);

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && recaptchaSiteKey
);
