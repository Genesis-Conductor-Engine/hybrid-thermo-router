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
export default defineConfig({ plugins: [offlineShell()], build: { target: 'es2022' } });
