import {
  fetchWithPolicy,
  type OutboundEndpointPolicy,
  type OutboundFetch,
} from '../../../../../lib/http/outbound-policy.ts';
import type { PredictionProvider } from './types';
import { h2Fetch } from './h2-fetch';

export type FixedExternalProvider = 'kimi-risk' | 'pinnacle';

export const FIXED_EXTERNAL_OUTBOUND_POLICIES = {
  'kimi-risk': {
    name: 'kimi-risk-api',
    allowedOrigins: ['https://api.moonshot.cn'],
    allowedMethods: ['POST'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 20_000,
  },
  pinnacle: {
    name: 'pinnacle-odds-api',
    allowedOrigins: ['https://api.pinnacle.com'],
    allowedMethods: ['GET'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 15_000,
  },
} as const satisfies Record<FixedExternalProvider, OutboundEndpointPolicy>;

export function fetchFixedExternalProvider(
  provider: FixedExternalProvider,
  input: string | URL,
  init: RequestInit = {},
  fetcher: OutboundFetch = fetch
): Promise<Response> {
  return fetchWithPolicy(input, init, FIXED_EXTERNAL_OUTBOUND_POLICIES[provider], fetcher);
}

export const PREDICTION_PROVIDER_OUTBOUND_POLICIES = {
  kalshi: {
    name: 'prediction-kalshi',
    allowedOrigins: ['https://api.elections.kalshi.com'],
    allowedMethods: ['GET'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 15_000,
  },
  polymarket: {
    name: 'prediction-polymarket',
    allowedOrigins: ['https://clob.polymarket.com'],
    allowedMethods: ['GET'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 15_000,
  },
  predictit: {
    name: 'prediction-predictit',
    allowedOrigins: ['https://www.predictit.org'],
    allowedMethods: ['GET'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 15_000,
  },
  betfair: {
    name: 'prediction-betfair',
    allowedOrigins: ['https://api.betfair.com'],
    allowedMethods: ['POST'],
    credentialMode: 'scoped',
    credentialHeaders: ['x-application', 'x-authentication'],
    redirect: 'error',
    timeoutMs: 15_000,
  },
} as const satisfies Record<PredictionProvider, OutboundEndpointPolicy>;

export function fetchPredictionProvider(
  provider: PredictionProvider,
  input: string | URL,
  init: RequestInit = {},
  fetcher: OutboundFetch = h2Fetch
): Promise<Response> {
  return fetchWithPolicy(input, init, PREDICTION_PROVIDER_OUTBOUND_POLICIES[provider], fetcher);
}
