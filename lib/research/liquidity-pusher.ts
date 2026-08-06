// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Helper to report a liquidity spot into the in-memory store
 * (and optionally POST to a remote `/api/partners/liquidity` endpoint).
 */

import { addLiquiditySpot, type LiquiditySpot } from './liquidity-store.ts';

export type PushLiquidityInput = {
  partnerId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  maxStakeUsd: number;
  currency?: string;
  source?: LiquiditySpot['source'];
  note?: string;
  marketId?: string; // brand-ok — opaque research/wire id
  /** When set, also POST to this base URL (e.g. http://127.0.0.1:8790). */
  remoteBaseUrl?: string;
  apiToken?: string;
};

export type PushLiquidityResult = {
  ok: boolean;
  spot?: LiquiditySpot;
  remoteOk?: boolean;
  error?: string;
};

export async function pushLiquiditySpot(input: PushLiquidityInput): Promise<PushLiquidityResult> {
  try {
    const spot = addLiquiditySpot({
      partnerId: input.partnerId,
      sport: input.sport,
      league: input.league,
      marketType: input.marketType,
      maxStakeUsd: input.maxStakeUsd,
      currency: input.currency ?? 'USD',
      source: input.source ?? 'research',
      note: input.note,
      marketId: input.marketId,
    });

    if (!input.remoteBaseUrl) {
      return { ok: true, spot };
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const token =
      input.apiToken ?? Bun.env.PARTNER_API_TOKEN ?? Bun.env.OPERATOR_RESEARCH_API_KEY ?? '';
    if (token) headers.authorization = `Bearer ${token}`;

    const resp = await fetch(new URL('/api/partners/liquidity', input.remoteBaseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        partnerId: input.partnerId,
        sport: input.sport,
        league: input.league,
        marketType: input.marketType,
        maxStakeUsd: input.maxStakeUsd,
        currency: input.currency ?? 'USD',
        source: input.source ?? 'research',
        note: input.note,
        marketId: input.marketId,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    return {
      ok: true,
      spot,
      remoteOk: resp.ok,
      error: resp.ok ? undefined : `remote HTTP ${resp.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
