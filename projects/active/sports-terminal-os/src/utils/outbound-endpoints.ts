import {
  fetchWithPolicy,
  type OutboundExecutionOptions,
  type OutboundEndpointPolicy,
  type OutboundFetch,
} from '../../../../../lib/http/outbound-policy.ts';
import type { PredictionProvider } from './types';
import { h2Fetch } from './h2-fetch';

export const PREDICTION_PROVIDER_OUTBOUND_POLICIES = {
  kalshi: {
    name: 'prediction-kalshi',
    allowedOrigins: ['https://api.elections.kalshi.com'],
    allowedMethods: ['GET'],
    credentialMode: 'scoped',
    credentialHeaders: ['authorization'],
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 2_000_000,
    route: { mode: 'direct' },
    networkMode: 'online',
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: 'safe',
  },
  polymarket: {
    name: 'prediction-polymarket',
    allowedOrigins: ['https://clob.polymarket.com'],
    allowedMethods: ['GET'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 2_000_000,
    route: { mode: 'direct' },
    networkMode: 'online',
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: 'safe',
  },
  predictit: {
    name: 'prediction-predictit',
    allowedOrigins: ['https://www.predictit.org'],
    allowedMethods: ['GET'],
    credentialMode: 'forbid',
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 2_000_000,
    route: { mode: 'direct' },
    networkMode: 'online',
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: 'safe',
  },
  betfair: {
    name: 'prediction-betfair',
    allowedOrigins: ['https://api.betfair.com'],
    allowedMethods: ['POST'],
    credentialMode: 'scoped',
    credentialHeaders: ['x-application', 'x-authentication'],
    redirect: 'error',
    timeoutMs: 15_000,
    totalDeadlineMs: 15_000,
    responseByteLimit: 2_000_000,
    route: { mode: 'direct' },
    networkMode: 'online',
    ipAuthority: { mode: 'public-only', enforcement: 'resolve-before-connect' },
    replayClass: 'unsafe',
  },
} as const satisfies Record<PredictionProvider, OutboundEndpointPolicy>;

export function fetchPredictionProvider(
  provider: PredictionProvider,
  input: string | URL,
  init: RequestInit = {},
  fetcher: OutboundFetch = h2Fetch,
  options: OutboundExecutionOptions = {}
): Promise<Response> {
  return fetchWithPolicy(input, init, PREDICTION_PROVIDER_OUTBOUND_POLICIES[provider], fetcher, options);
}
