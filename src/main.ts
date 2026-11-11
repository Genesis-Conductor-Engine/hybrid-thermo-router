import './style.css';
import { chooseRoute } from './router';
import { MockAdapter } from './mock';
import { estimate } from './estimates';
import { firebaseConfigured } from './firebase-config';
import type { FirebaseAdapter } from './firebase-adapter';
import type { Context, Power, RequestInput, RouteDecision, Trace } from './types';

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
<div class="topbar"><span class="topbar-name">Hybrid Thermo Router</span><span id="mode-badge" class="badge">MOCK · NO AI RUNNING</span></div>
<header>
  <div class="hero">
    <p class="eyebrow">#BUILDHYBRIDAI · ENERGY-AWARE HYBRID ROUTING</p>
    <h1>Hybrid Thermo Router</h1>
    <p class="lead">Keep short or private work on this device with Gemini Nano. Escalate long text or images to a cloud Gemini model through Firebase AI Logic. Every request shows why it was routed, which source actually ran, wall latency, and uncalibrated energy and cost estimates — not measured savings.</p>
    <ul class="policy">
      <li><strong>Private, offline, or battery</strong> On-device only. Long or image tasks are blocked so the prompt is not sent to the cloud.</li>
      <li><strong>Short public text</strong> Prefer on-device Nano. Firebase may fall back to the cloud if the local model is unavailable.</li>
      <li><strong>Long text or an image</strong> Explicit cloud route, only when policy allows. All real inference goes through Firebase AI Logic.</li>
    </ul>
  </div>
</header>
<main>
  <section class="workspace" aria-labelledby="workspace-heading">
    <h2 id="workspace-heading">Request Workspace</h2>
    <div class="controls">
      <label>Execution
        <select id="execution">
          <option value="MOCK">Mock — deterministic fixture</option>
          <option value="FIREBASE" ${firebaseConfigured ? '' : 'disabled'}>Firebase — real inference${firebaseConfigured ? '' : ' (config needed)'}</option>
        </select>
      </label>
      <label>Power Policy
        <select id="power">
          <option value="auto">Auto (detect when supported)</option>
          <option value="plugged">Simulate plugged in</option>
          <option value="battery">Simulate on battery</option>
        </select>
      </label>
    </div>
    <p id="environment" class="meta"></p>
    <div class="checks">
      <label><input type="checkbox" id="private">Private — never send prompt to cloud</label>
      <label><input type="checkbox" id="offline">Simulate offline</label>
      <label id="mock-control"><input type="checkbox" id="device" checked>Mock Nano available</label>
    </div>
    <p class="notice">Short public prompts may fall back to cloud. Private, offline, or battery requests are local-only. Long/image tasks are blocked under those restrictions. Local-only does not mean the SDK makes no metadata or attestation network calls.</p>
    <div class="controls">
      <button type="button" id="prepare">Prepare Nano (Firebase mode)</button>
      <span id="preparation" role="status">Mock needs no model download.</span>
    </div>
    <form id="request-form">
      <label for="prompt">Single-turn Prompt</label>
      <textarea id="prompt" maxlength="24000" rows="7" placeholder="Summarize these field notes in 3 bullet points…">Summarize these field notes: inspect the sensor, replace the seal, and retest tomorrow.</textarea>
      <label for="image">Optional JPEG/PNG (max 4 MiB, cloud route)</label>
      <input type="file" id="image" accept="image/jpeg,image/png">
      <div id="route-preview" class="route" aria-live="polite">
        <p class="route-mode"></p>
        <p class="route-why"></p>
        <p class="route-means"></p>
      </div>
      <div class="actions">
        <button type="submit" id="run">Run Request</button>
        <button type="button" id="long-example" class="secondary">Load Long Example</button>
        <button type="button" id="short-example" class="secondary">Load Short Example</button>
      </div>
    </form>
    <p id="status" role="status" aria-live="polite">Ready in mock mode. No Firebase credentials required.</p>
    <h2>Output</h2>
    <pre id="output" aria-live="polite">Run a request to see a labeled fixture or a real Firebase response.</pre>
  </section>
  <aside aria-labelledby="trace-heading">
    <div class="trace-title">
      <h2 id="trace-heading">Live Request Trace</h2>
      <button id="export" class="secondary" type="button">Export Trace</button>
    </div>
    <p class="meta">Newest first · memory only · prompt and output omitted. Requested mode and actual source are listed separately.</p>
    <div id="traces"><p class="empty">No requests yet. Try short text, then disable mock Nano to exercise fallback.</p></div>
    <details>
      <summary>Estimate Method & Limits</summary>
      <p>Energy is an illustrative client-only estimate: assumed 10 W for local or 2 W for cloud-waiting × wall seconds / 3600 = Wh. These uncalibrated assumptions are not measured power, total AI energy, carbon, or proof of savings. Server energy is unknown.</p>
      <p>Text cost uses ceil(characters / 4) × configured USD per million tokens. Cloud pricing is unknown until verified rates are configured; image cost is not modeled. Local provider inference fee is $0, not zero total operating cost. Mock estimates are hypothetical.</p>
      <p>The 1,200-character routing threshold is a conservative product heuristic, not a model token limit. Battery-local routing is a requested policy, not evidence that local inference saves battery.</p>
    </details>
  </aside>
</main>
<footer>Apache-2.0 · solo entry by Igor Holt · all real inference through Firebase AI Logic · estimates are uncalibrated · no measured efficiency claims</footer>`;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const execution = el<HTMLSelectElement>('execution'), power = el<HTMLSelectElement>('power');
const prompt = el<HTMLTextAreaElement>('prompt'), image = el<HTMLInputElement>('image');
const privateBox = el<HTMLInputElement>('private'), offline = el<HTMLInputElement>('offline'), device = el<HTMLInputElement>('device');
const status = el<HTMLParagraphElement>('status');
let actualPower: Power = 'unknown';
let firebase: FirebaseAdapter | undefined;
const traces: Trace[] = [];
const context = (): Context => ({ online: navigator.onLine && !offline.checked, private: privateBox.checked, power: power.value === 'auto' ? actualPower : power.value as Power });

function routeExplanation(route: RouteDecision): string {
  if (route.blocked) return 'This request will not be sent. Shorten the text, remove the image, or relax a restriction.';
  if (route.mode === 'ONLY_ON_DEVICE') return 'On-device only. If Nano is unavailable, the request fails closed; the prompt is not sent to the cloud.';
  if (route.mode === 'ONLY_IN_CLOUD') return 'Explicit cloud route through Firebase AI Logic. The prompt leaves this device.';
  return 'Prefer on-device Nano. Firebase may fall back to the cloud if the local model is unavailable.';
}

function preview() {
  const ctx = context();
  const route = chooseRoute({ prompt: prompt.value, image: image.files?.length ? { data: '', mimeType: image.files[0].type } : undefined }, ctx);
  const box = el('route-preview');
  const mode = box.querySelector('.route-mode') as HTMLElement;
  const why = box.querySelector('.route-why') as HTMLElement;
  const means = box.querySelector('.route-means') as HTMLElement;
  mode.textContent = route.blocked ? `BLOCKED · ${route.mode}` : route.mode;
  mode.classList.toggle('blocked', route.blocked);
  why.textContent = route.reason;
  means.textContent = routeExplanation(route);
  el('environment').textContent = `Network: ${ctx.online ? 'online' : 'offline'} · Power: ${ctx.power}${power.value !== 'auto' ? ' (simulated)' : ''} · Device capability is confirmed only by a real SDK response.`;
}

[power, privateBox, offline, device, prompt, image].forEach(input => input.addEventListener('input', preview));
window.addEventListener('online', preview); window.addEventListener('offline', preview);
interface Battery { charging: boolean; addEventListener(name: string, cb: () => void): void; }
const nav = navigator as Navigator & { getBattery?: () => Promise<Battery> };
if (nav.getBattery) nav.getBattery().then(battery => {
  const update = () => { actualPower = battery.charging ? 'plugged' : 'battery'; preview(); };
  update(); battery.addEventListener('chargingchange', update);
}).catch(() => preview());
execution.addEventListener('change', async () => {
  const live = execution.value === 'FIREBASE';
  el('mode-badge').textContent = live ? 'FIREBASE · REAL REQUESTS' : 'MOCK · NO AI RUNNING';
  el('mock-control').hidden = live;
  if (live && !firebase) {
    try { const { FirebaseAdapter } = await import('./firebase-adapter'); firebase = new FirebaseAdapter(); status.textContent = 'Firebase ready. Prepare Nano from the button before short/local requests.'; }
    catch (error) { status.textContent = safeError(error); }
  } else status.textContent = live ? 'Firebase selected.' : 'Mock selected. No AI inference or network calls.';
});
el<HTMLButtonElement>('prepare').addEventListener('click', async () => {
  if (execution.value !== 'FIREBASE' || !firebase) { status.textContent = 'Select configured Firebase mode first. Mock needs no model.'; return; }
  const button = el<HTMLButtonElement>('prepare'); button.disabled = true;
  try {
    await firebase.prepare(value => { el('preparation').textContent = `Nano download/initialization: ${Math.round(value * 100)}%`; });
    el('preparation').textContent = 'Nano initialization complete. Actual source comes from each response.';
  } catch (error) { el('preparation').textContent = safeError(error); }
  finally { button.disabled = false; }
});
function safeError(error: unknown) {
  // Do not show raw provider messages, which can contain prompt fragments or URLs.
  if (error instanceof Error && (error.message.startsWith('MOCK:') || error.message.startsWith('Click Prepare') || error.message.startsWith('Local initialization') || error.message.startsWith('Unexpected cloud') || error.message.startsWith('Firebase config'))) return error.message;
  return 'Request failed. Check model readiness, connectivity, App Check, and quota. No automatic retry or mock substitution was made.';
}
async function readImage(): Promise<RequestInput['image']> {
  const file = image.files?.[0]; if (!file) return undefined;
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 4 * 1024 * 1024) throw new Error('Image validation failed');
  const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
  return { data, mimeType: file.type };
}
function rate(value: string | undefined): number | null { if (!value?.trim()) return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null; }
function drawTraces() {
  const target = el('traces'); target.replaceChildren();
  for (const trace of traces) {
    const sourceClass = trace.inferenceSource === 'ON_DEVICE' ? 'source-on-device' : trace.inferenceSource === 'IN_CLOUD' ? 'source-in-cloud' : 'source-unknown';
    const card = document.createElement('article');
    card.className = `trace ${sourceClass} status-${trace.status}`;
    const heading = document.createElement('h3');
    const pill = document.createElement('span');
    pill.className = 'source-pill';
    const sourceLabel = `${trace.execution === 'MOCK' ? 'MOCK SIMULATED ' : ''}${trace.inferenceSource}`;
    pill.textContent = sourceLabel;
    heading.append(pill, document.createTextNode(` · ${trace.status}`));
    card.append(heading);
    const lines = [
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(trace.timestamp)) + ' ET',
      `Requested: ${trace.requestedMode}`,
      `Actual source: ${sourceLabel}`,
      `Wall latency: ${trace.latencyMs.toFixed(1)} ms${trace.execution === 'MOCK' ? ' (fixture execution only)' : ''}`,
      `Routing decision: ${trace.routingReason}`
    ];
    if (trace.estimate) lines.push(`Client energy ESTIMATE: ${trace.estimate.clientWh.toExponential(2)} Wh`, `Provider cost ESTIMATE: ${trace.estimate.providerUsd === null ? 'unknown' : '$' + trace.estimate.providerUsd.toFixed(6)}`, trace.estimate.energyMethod, trace.estimate.costMethod);
    if (trace.error) lines.push(trace.error);
    for (const line of lines) { const row = document.createElement('p'); row.textContent = line; card.append(row); }
    target.append(card);
  }
}
el<HTMLFormElement>('request-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = el<HTMLButtonElement>('run'); button.disabled = true;
  // Freeze visible controls for a request; recheck live network/power before dispatch.
  const controls = [execution, power, privateBox, offline, device, prompt, image, el<HTMLButtonElement>('long-example'), el<HTMLButtonElement>('short-example')];
  controls.forEach(control => control.disabled = true);
  const start = performance.now(); let input: RequestInput = { prompt: prompt.value };
  let route = chooseRoute({ ...input, image: image.files?.length ? { data: '', mimeType: image.files[0].type } : undefined }, context());
  const trace: Trace = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), execution: execution.value as 'MOCK' | 'FIREBASE', requestedMode: route.mode, inferenceSource: 'UNKNOWN', latencyMs: 0, routingReason: route.reason, status: 'blocked', estimate: null };
  try {
    if (route.blocked) { el('output').textContent = 'Not sent: ' + route.reason; status.textContent = 'Policy blocked this request.'; return; }
    input.image = await readImage(); route = chooseRoute(input, context()); trace.requestedMode = route.mode; trace.routingReason = route.reason;
    if (route.blocked) { el('output').textContent = 'Not sent: ' + route.reason; status.textContent = 'Policy blocked this request.'; return; }
    trace.status = 'error'; status.textContent = `Running ${route.mode}… ${route.reason}`;
    const adapter = trace.execution === 'MOCK' ? new MockAdapter(device.checked) : firebase;
    if (!adapter) throw new Error('Firebase config unavailable');
    const result = await adapter.run(input, route); trace.latencyMs = performance.now() - start;
    trace.inferenceSource = result.source; trace.status = 'success';
    trace.estimate = estimate(input, result.text, result.source, trace.latencyMs, { input: rate(import.meta.env.VITE_INPUT_USD_PER_MILLION), output: rate(import.meta.env.VITE_OUTPUT_USD_PER_MILLION) });
    el('output').textContent = result.text;
    status.textContent = trace.execution === 'MOCK' ? 'Mock completed. Source and estimates are simulated; no model ran.' : `Firebase completed. SDK inferenceSource: ${result.source}.`;
  } catch (error) { trace.status = 'error'; trace.error = safeError(error); status.textContent = trace.error; el('output').textContent = trace.error; }
  finally { trace.latencyMs = performance.now() - start; traces.unshift(trace); traces.splice(30); drawTraces(); button.disabled = false; controls.forEach(control => control.disabled = false); preview(); }
});
el('long-example').addEventListener('click', () => { prompt.value = 'Summarize this maintenance log: ' + 'Sensor inspection passed. Seal replacement pending. Retest after calibration. '.repeat(24); preview(); });
el('short-example').addEventListener('click', () => { prompt.value = 'Summarize these notes: inspect sensor, replace seal, retest tomorrow.'; image.value = ''; preview(); });
el('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ note: 'No prompt/output included. MOCK records are simulated. Energy is an estimate, not measured.', traces }, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'hybrid-thermo-trace.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { status.textContent += ' Offline asset cache unavailable; keep this page open for offline testing.'; });
preview();
