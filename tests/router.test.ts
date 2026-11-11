import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseRoute, SHORT_PROMPT_CHARS } from '../src/router.ts';
import { MockAdapter } from '../src/mock.ts';
import { estimate } from '../src/estimates.ts';
import { resolveAppCheckProvider, resolveRecaptchaSiteKey } from '../src/firebase-config.ts';

const base = { online: true, private: false, power: 'plugged' as const };
const short = { prompt: 'Summarize these notes.' };
const long = { prompt: 'a'.repeat(SHORT_PROMPT_CHARS + 1) };

test('short public text prefers on-device with fallback allowed', () => assert.equal(chooseRoute(short, base).mode, 'PREFER_ON_DEVICE'));
test('privacy, battery and offline force local only', () => { for (const ctx of [{...base, private:true}, {...base, power:'battery' as const}, {...base, online:false}]) { const route=chooseRoute(short,ctx); assert.equal(route.mode,'ONLY_ON_DEVICE'); assert.equal(route.blocked,false); assert.equal(chooseRoute(long,ctx).blocked,true); } });
test('long text and image explicitly escalate only when allowed', () => { assert.equal(chooseRoute(long,base).mode,'ONLY_IN_CLOUD'); const image={...short,image:{data:'abc',mimeType:'image/png'}}; assert.equal(chooseRoute(image,base).mode,'ONLY_IN_CLOUD'); assert.equal(chooseRoute(image,{...base,private:true}).blocked,true); });
test('empty and oversized prompts block', () => { assert.equal(chooseRoute({prompt:' '},base).blocked,true); assert.equal(chooseRoute({prompt:'a'.repeat(24001)},base).blocked,true); });
test('mock local-only fails closed, never falls back', async () => { await assert.rejects(new MockAdapter(false).run(short,chooseRoute(short,{...base,private:true})), /No cloud fallback/); });
test('mock exercises both source paths with no credentials', async () => { assert.equal((await new MockAdapter(true).run(short,chooseRoute(short,base))).source,'ON_DEVICE'); assert.equal((await new MockAdapter(false).run(short,chooseRoute(short,base))).source,'IN_CLOUD'); assert.equal((await new MockAdapter(true).run(long,chooseRoute(long,base))).source,'IN_CLOUD'); });
test('all context combinations preserve no-cloud invariants', () => { for (const online of [true,false]) for (const privacy of [true,false]) for (const power of ['battery','plugged','unknown'] as const) for (const input of [short,long,{...short,image:{data:'x',mimeType:'image/png'}}]) { const route=chooseRoute(input,{online,private:privacy,power}); if (!online||privacy||power==='battery') assert.equal(route.mode,'ONLY_ON_DEVICE'); } });
test('energy assumption is explicit; unknown price is not zero', () => { const e=estimate(short,'out','IN_CLOUD',3600,{input:null,output:null})!; assert.equal(e.clientWh,0.002); assert.equal(e.providerUsd,null); assert.match(e.energyMethod,/Uncalibrated/); assert.equal(estimate(short,'out','UNKNOWN',1,{input:1,output:1}),null); });
test('App Check provider defaults to enterprise; v3 is opt-in', () => {
  assert.equal(resolveAppCheckProvider({}), 'enterprise');
  assert.equal(resolveAppCheckProvider({ VITE_APP_CHECK_PROVIDER: 'enterprise' }), 'enterprise');
  assert.equal(resolveAppCheckProvider({ VITE_APP_CHECK_PROVIDER: 'v3' }), 'v3');
  assert.equal(resolveAppCheckProvider({ VITE_APP_CHECK_PROVIDER: 'other' }), 'enterprise');
});
test('reCAPTCHA site key prefers VITE_RECAPTCHA_SITE_KEY and falls back to the Enterprise name', () => {
  assert.equal(resolveRecaptchaSiteKey({ VITE_RECAPTCHA_SITE_KEY: 'new-key', VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'legacy-key' }), 'new-key');
  assert.equal(resolveRecaptchaSiteKey({ VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'legacy-key' }), 'legacy-key');
  assert.equal(resolveRecaptchaSiteKey({}), '');
});
