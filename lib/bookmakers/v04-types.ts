/**
 * Bookmakers catalog v0.4 — public vs ops split.
 *
 * Decisions (gap analysis → ship):
 * - id === slug (route primary key; no opaque UUID migration)
 * - regions stay { country, stateCode? } objects (board-compatible)
 * - color / webViewConfig / note stay public (non-sensitive)
 * - restBaseUrl / restProtocol / apiKeyEnv / envVars → ops only
 * - no balance / health on public Pages mirror
 *
 * @see docs/harness/tenants/bookmakers-registry.md
 */

export type BookFetcher = 'rest' | 'webview' | 'seat';
export type LifecycleMode = 'pre_match' | 'live' | 'exchange' | 'virtual';
export type LiquidityTier = 'high' | 'medium' | 'low' | 'illiquid' | 'unknown';

export type BookRegion = { country: string; stateCode?: string } | string;

export interface BookUrls {
  web: string | null;
  api: string | null;
  limitsPage: string | null;
  termsPage: string | null;
}

export interface BookLimits {
  minBetUsd: number | null;
  maxBetUsd: number | null;
  liquidityTier: LiquidityTier;
}

export interface BookContact {
  supportEmail: string | null;
  telegram: string | null;
  opsDesk: string | null;
}

/** Desk / agent payment rails (public-safe labels). */
export type PaymentMethod =
  | 'crypto'
  | 'credit_card'
  | 'debit_card'
  | 'bank_wire'
  | 'ach'
  | 'p2p'
  | 'cash'
  | 'seat'
  | string;

/** High-level provider lane for filters / partner details. */
export type ProviderType = 'crypto' | 'pph' | 'fiat' | 'hybrid' | 'unknown' | string;

/** Pages-safe public row (no secrets, no live balance/health). */
export interface PublicBookmakerV04 {
  id: string; // brand-ok — route slug; equals slug by design
  slug: string; // brand-ok — same as id (v0.4 mode A)
  label: string;
  skin?: string;
  brandGroup?: string;
  urls: BookUrls;
  fetcher: BookFetcher;
  lifecycle: LifecycleMode[];
  sports: string[];
  regions: BookRegion[];
  limits: BookLimits;
  /** e.g. ['crypto', 'credit_card', 'p2p'] — optional until catalog bake fills it */
  paymentMethods?: PaymentMethod[];
  /** 'crypto' | 'pph' | 'fiat' | 'hybrid' — optional until catalog bake fills it */
  providerType?: ProviderType;
  color?: string;
  webViewConfig?: Record<string, unknown>;
  note?: string;
}

/** Operator-private row (never bake into public/registry on Pages). */
export interface OpsBookmakerV04 {
  id: string; // brand-ok — matches public id/slug
  slug: string;
  restBaseUrl?: string;
  restProtocol?: string;
  apiKeyEnv?: string;
  envVars?: string[];
  balance?: { currency?: string; amount?: number | null; asOf?: string | null };
  health?: { status?: 'unknown' | 'ok' | 'degraded' | 'down'; checkedAt?: string | null };
  contact?: BookContact;
}

export interface PublicBookmakersBakeV04 {
  schemaVersion: 2;
  generatedAt: string;
  artifact: {
    name: string;
    version: string;
    checksum?: string;
    source: string;
  };
  bookmakers: Record<string, PublicBookmakerV04>;
  audit: { ok: boolean; issues: string[] };
  summary: {
    count: number;
    webview: number;
    rest: number;
    seat: number;
    sports: string[];
  };
}

export interface OpsBookmakersBakeV04 {
  schemaVersion: 2;
  generatedAt: string;
  artifact: { name: string; version: string; source: string };
  bookmakers: Record<string, OpsBookmakerV04>;
  note: string;
}

/** Curated branding / limits enrichments for known books (v0.3 → v0.4). */
export const BOOK_ENRICHMENT: Record<
  string,
  {
    skin?: string;
    brandGroup?: string;
    lifecycle?: LifecycleMode[];
    liquidityTier?: LiquidityTier;
    /** Desk-observed max stake (USD) when known from seat capital desk. */
    maxBetUsd?: number;
    minBetUsd?: number;
    contact?: BookContact;
  }
> = {
  pinnacle: {
    brandGroup: 'Pinnacle',
    lifecycle: ['pre_match', 'live'],
    liquidityTier: 'high',
  },
  caesars: {
    skin: 'Caesars Sportsbook',
    brandGroup: 'Caesars Entertainment',
    lifecycle: ['pre_match', 'live'],
    liquidityTier: 'medium',
  },
  fanduel: {
    skin: 'FanDuel Sportsbook',
    brandGroup: 'Flutter Entertainment',
    lifecycle: ['pre_match', 'live'],
    liquidityTier: 'medium',
  },
  draftkings: {
    skin: 'DraftKings Sportsbook',
    brandGroup: 'DraftKings',
    lifecycle: ['pre_match', 'live'],
    liquidityTier: 'medium',
  },
  betmgm: {
    skin: 'BetMGM',
    brandGroup: 'Entain / MGM',
    lifecycle: ['pre_match', 'live'],
    liquidityTier: 'medium',
  },
  'hard-rock-florida': {
    skin: 'HardRockBet Florida',
    brandGroup: 'Hard Rock International',
    lifecycle: ['pre_match'],
    liquidityTier: 'medium',
    // seat-capital-desk ready outs (ASH/NOV) · $500 max bet
    maxBetUsd: 500,
  },
  'parlay21-com': {
    skin: 'Parlay21',
    brandGroup: 'Parlay21',
    lifecycle: ['pre_match'],
    liquidityTier: 'low',
    maxBetUsd: 500,
  },
  'lonestarwagering-com': {
    skin: 'LoneStar Wagering',
    brandGroup: 'LoneStar',
    lifecycle: ['pre_match'],
    liquidityTier: 'low',
    maxBetUsd: 500,
  },
  'action92-com': {
    skin: 'Action92',
    brandGroup: 'Action92',
    lifecycle: ['pre_match'],
    liquidityTier: 'low',
    maxBetUsd: 500,
  },
  'betvegas23-com': {
    skin: 'BetVegas23',
    brandGroup: 'BetVegas23',
    lifecycle: ['pre_match'],
    liquidityTier: 'low',
    maxBetUsd: 500,
  },
};
