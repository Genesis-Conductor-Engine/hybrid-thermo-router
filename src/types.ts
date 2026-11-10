export type RouteMode = 'PREFER_ON_DEVICE' | 'ONLY_ON_DEVICE' | 'ONLY_IN_CLOUD';
export type Source = 'ON_DEVICE' | 'IN_CLOUD' | 'UNKNOWN';
export type Power = 'battery' | 'plugged' | 'unknown';
export interface Context { online: boolean; power: Power; private: boolean; }
export interface RequestInput { prompt: string; image?: { data: string; mimeType: string }; }
export interface RouteDecision { mode: RouteMode; reason: string; blocked: boolean; }
export interface AdapterResult { text: string; source: Source; }
export interface InferenceAdapter { run(input: RequestInput, route: RouteDecision): Promise<AdapterResult>; }
export interface Estimate { clientWh: number; energyMethod: string; providerUsd: number | null; costMethod: string; }
export interface Trace { id: string; timestamp: string; execution: 'MOCK' | 'FIREBASE'; requestedMode: RouteMode; inferenceSource: Source; latencyMs: number; routingReason: string; status: 'success' | 'blocked' | 'error'; estimate: Estimate | null; error?: string; }
