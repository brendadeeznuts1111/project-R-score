/**
 * Live odds monitoring domain types.
 *
 * Interior shapes after the wire boundary — parsers produce these from JSON/HTML/TOML.
 */

import type { HostId } from '../../types/branded.ts';
import type { SportsbookId } from '../../types/branded.ts';

export type OddsSelection = {
  name: string;
  price: number;
  /** American odds when known; American can be derived from decimal. */
  american?: number;
};

export type OddsMarket = {
  id: string; // brand-ok — opaque market key from book/API
  name: string;
  selections: OddsSelection[];
};

export type OddsLimits = {
  maxBet: number | null;
  minBet: number | null;
  currency?: string;
};

export type OddsSnapshot = {
  host: HostId;
  sportsbookId: SportsbookId | null;
  timestamp: number;
  source: 'live' | 'fixture' | 'synthetic';
  markets: OddsMarket[];
  limits: OddsLimits;
  /** Opaque raw payload hash for quick identity checks. */
  contentHash?: string;
};

export type PriceChange = {
  marketId: string; // brand-ok
  selection: string;
  from: number;
  to: number;
  /** Relative change magnitude |to-from|/|from| when from ≠ 0. */
  rel: number;
};

export type DiffResult = {
  identical: boolean;
  marketsAdded: string[];
  marketsRemoved: string[];
  priceChanges: PriceChange[];
  limitChanges: { from: OddsLimits; to: OddsLimits } | null;
};

export type EdgeSignalType = 'line_move' | 'steam' | 'arbitrage' | 'suspicious' | 'new_market';

export type EdgeSignal = {
  type: EdgeSignalType;
  confidence: number;
  host: HostId;
  details: string;
  marketId?: string; // brand-ok
  selection?: string;
  observedAt: number;
};

export type OddsEndpoint = {
  host: HostId;
  sportsbookId?: SportsbookId | null;
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  /** Prefer fixture under fixtures/odds/<id>.json when live fails. */
  fixtureId?: string; // brand-ok — opaque research/wire id
};

export type MonitorTickResult = {
  host: HostId;
  ok: boolean;
  elapsedMs: number;
  identical: boolean;
  diff: DiffResult | null;
  patterns: EdgeSignal[];
  snapshot: OddsSnapshot | null;
  error?: string;
};
