import type { InferenceAdapter, RequestInput, RouteDecision } from './types';
export class MockAdapter implements InferenceAdapter {
  constructor(private deviceAvailable: boolean) {}
  async run(input: RequestInput, route: RouteDecision) {
    if (route.blocked) throw new Error(route.reason);
    if (route.mode === 'ONLY_ON_DEVICE' && !this.deviceAvailable) throw new Error('MOCK: local model unavailable. No cloud fallback attempted.');
    const source = route.mode === 'ONLY_IN_CLOUD' || !this.deviceAvailable ? 'IN_CLOUD' as const : 'ON_DEVICE' as const;
    return { source, text: `MOCK FIXTURE — no model ran and no data was transmitted.\n\nSimulated ${source} route for ${input.prompt.length} text characters${input.image ? ' and 1 image' : ''}.\n\nThis deterministic fixture tests routing and trace display only. Use Firebase mode to obtain real inference.` };
  }
}
