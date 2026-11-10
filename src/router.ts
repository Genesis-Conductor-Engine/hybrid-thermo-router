import type { Context, RequestInput, RouteDecision } from './types';
export const SHORT_PROMPT_CHARS = 1200;
export const MAX_PROMPT_CHARS = 24000;
export function chooseRoute(input: RequestInput, ctx: Context): RouteDecision {
  const long = input.prompt.length > SHORT_PROMPT_CHARS;
  const restricted = ctx.private || !ctx.online || ctx.power === 'battery';
  const reason = ctx.private ? 'Private: cloud fallback forbidden' : !ctx.online ? 'Offline: local only' : ctx.power === 'battery' ? 'Battery policy: local only (not a measured energy optimization)' : '';
  if (!input.prompt.trim() || input.prompt.length > MAX_PROMPT_CHARS) return { mode: 'ONLY_ON_DEVICE', reason: 'Enter 1–24000 characters of nonempty text', blocked: true };
  if (restricted) return { mode: 'ONLY_ON_DEVICE', reason: reason + (long || input.image ? '; long/image task blocked; shorten or remove image' : ''), blocked: Boolean(long || input.image) };
  if (long || input.image) return { mode: 'ONLY_IN_CLOUD', reason: long ? 'Long prompt: explicit cloud escalation' : 'Image task: explicit cloud escalation', blocked: false };
  return { mode: 'PREFER_ON_DEVICE', reason: 'Short public text: prefer Nano; SDK may fall back to cloud', blocked: false };
}
