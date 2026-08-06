/**
 * Mock bet execution for agent-odds v1.07 trading desk.
 * In-memory only — no real money, no live book APIs.
 *
 * @see tools/agent-odds-dashboard-serve.ts
 */
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7

import type { EdgeId, EventId } from '../types/branded.ts';
import type { EdgeOpportunity } from './edge-engine.ts';

export type MockBetRequest = {
  edgeId: EdgeId;
  stake: number;
  bookmaker: string;
};

export type MockBetOrder = {
  orderId: string; // brand-ok — mock order id (not a domain brand yet)
  edgeId: EdgeId;
  bookmaker: string;
  stake: number;
  success: boolean;
  message: string;
  mock: true;
  createdAt: string;
  edge_type?: string;
  event_id?: EventId;
};

const LEDGER: MockBetOrder[] = [];
const MAX_LEDGER = 200;

/** Soft books that should not accept mock bets. */
export function bookmakerEligibleForMockBet(
  edge: EdgeOpportunity,
  bookmaker: string,
): boolean {
  const key = bookmaker.trim().toLowerCase();
  if (!key) return false;
  const idx = edge.bookmakers.findIndex(
    b => b.toLowerCase() === key || edge.bookmaker_ids.some(id => String(id).toLowerCase() === key),
  );
  if (idx < 0) {
    // allow match on bookmaker_ids only
    const idHit = edge.bookmaker_ids.some(
      id => String(id).toLowerCase() === key || String(id).toLowerCase().includes(key),
    );
    if (!idHit && !edge.bookmakers.some(b => b.toLowerCase().includes(key))) return false;
  }
  const tier =
    edge.liquidity_tiers[idx >= 0 ? idx : 0] ||
    edge.liquidity_tiers[0] ||
    'unknown';
  if (tier === 'illiquid') return false;
  return true;
}

/**
 * Place a simulated bet. ~80% success when eligible.
 * Always returns mock: true.
 */
export function placeMockBet(
  edge: EdgeOpportunity | undefined,
  req: MockBetRequest,
  opts?: { successRate?: number; now?: () => number },
): { ok: boolean; status: number; order: MockBetOrder | null; error?: string } {
  const stake = Number(req.stake);
  if (!Number.isFinite(stake) || stake <= 0) {
    return { ok: false, status: 400, order: null, error: 'stake must be a positive number' };
  }
  if (stake > 50_000) {
    return { ok: false, status: 400, order: null, error: 'stake exceeds mock desk cap ($50000)' };
  }
  if (!edge) {
    return { ok: false, status: 404, order: null, error: 'edge not found' };
  }
  if (!bookmakerEligibleForMockBet(edge, req.bookmaker)) {
    return {
      ok: false,
      status: 400,
      order: null,
      error: 'bookmaker not on edge or illiquid — mock desk rejects',
    };
  }

  const rate = opts?.successRate ?? 0.8;
  const success = Math.random() < rate;
  const orderId = `ord-${Bun.randomUUIDv7().slice(0, 12)}`;
  const order: MockBetOrder = {
    orderId: success ? orderId : '',
    edgeId: edge.id,
    bookmaker: req.bookmaker,
    stake,
    success,
    message: success
      ? `Mock bet placed · $${stake} on ${req.bookmaker} · not for production`
      : 'Mock bet failed (simulated market move / reject)',
    mock: true,
    createdAt: new Date(opts?.now?.() ?? Date.now()).toISOString(),
    edge_type: edge.type,
    event_id: edge.event_id,
  };
  LEDGER.unshift(order);
  if (LEDGER.length > MAX_LEDGER) LEDGER.length = MAX_LEDGER;
  return { ok: true, status: success ? 200 : 409, order };
}

export function listMockBets(limit = 50): MockBetOrder[] {
  return LEDGER.slice(0, Math.min(Math.max(limit, 1), 200));
}

/** Test helper — clear in-memory ledger. */
export function resetMockBetLedger(): void {
  LEDGER.length = 0;
}
