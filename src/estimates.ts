import type { Estimate, RequestInput, Source } from './types';
export function estimate(input: RequestInput, output: string, source: Source, latencyMs: number, rates: { input: number | null; output: number | null }): Estimate | null {
  if (source === 'UNKNOWN') return null;
  const watts = source === 'ON_DEVICE' ? 10 : 2;
  const clientWh = watts * latencyMs / 1000 / 3600;
  const tokensIn = Math.ceil(input.prompt.length / 4), tokensOut = Math.ceil(output.length / 4);
  const providerUsd = source === 'ON_DEVICE' ? 0 : input.image || rates.input === null || rates.output === null ? null : (tokensIn * rates.input + tokensOut * rates.output) / 1e6;
  return { clientWh, energyMethod: `ESTIMATE: ${watts} W assumed client power × wall seconds / 3600. Uncalibrated; includes waiting; excludes server, network infrastructure, model download and embodied energy.`, providerUsd, costMethod: source === 'ON_DEVICE' ? 'Provider inference fee $0; excludes electricity/hardware.' : input.image ? 'Unknown: image token costs not modeled.' : providerUsd === null ? 'Unknown: verified model pricing has not been configured.' : 'ESTIMATE: ceil(text characters / 4) × configured USD per million tokens; excludes hidden/reasoning tokens, images, cache, tier/quota effects. Not a bill.' };
}
