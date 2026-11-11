import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function offlineShell(): Plugin {
  return { name: 'offline-shell', generateBundle(_, bundle) {
    const paths = ['/', ...Object.keys(bundle).map(key => '/' + key)];
    const cache = 'hybrid-thermo-' + Date.now();
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(paths)};
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('hybrid-thermo-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !ASSETS.includes(url.pathname)) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(url.pathname, { ignoreVary: true }).then(hit => hit || fetch(e.request))));
});` });
  }};
}

/** Dev-only: read a registered App Check debug token from a gitignored file. Never used in build. */
function readDevAppCheckDebugToken(): string | undefined {
  const candidates = [
    process.env.APP_CHECK_DEBUG_TOKEN_FILE,
    resolve(import.meta.dirname, '.appcheck-debug-token')
  ].filter((value): value is string => Boolean(value));
  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue;
      const token = readFileSync(file, 'utf8').trim();
      if (token) return token;
    } catch {
      // Unreadable file: fall back to a generated debug token in the browser.
    }
  }
  return undefined;
}

export default defineConfig(({ command }) => {
  const devToken = command === 'serve' ? readDevAppCheckDebugToken() : undefined;
  return {
    define: {
      __APP_CHECK_DEBUG_TOKEN__: devToken ? JSON.stringify(devToken) : 'undefined'
    },
    plugins: [offlineShell()],
    build: { target: 'es2022' }
  };
});
