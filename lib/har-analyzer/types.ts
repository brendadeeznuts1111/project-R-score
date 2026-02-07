// lib/har-analyzer/types.ts — 4-layer HAR context type system
// Pure types, no runtime code.

import type { HAREntry } from './bun-serve-types';

// ─── Enums & Literal Types ───────────────────────────────────────────

export type FragmentType =
  | 'empty'
  | 'anchor'
  | 'route'
  | 'hashbang'
  | 'state'
  | 'media'
  | 'query'
  | 'unknown';

export type TTFBGrade = 'good' | 'needs-improvement' | 'poor';

export type SizeGrade = 'small' | 'medium' | 'large' | 'huge';

export type CacheType = 'memory' | 'disk' | 'cdn' | 'conditional' | 'miss';

export type DomainType = 'first-party' | 'third-party' | 'cdn' | 'tracker';

export type AssetGroup = 'critical' | 'important' | 'async' | 'deferred';

// ─── Layer 2: Parsed URL ─────────────────────────────────────────────

export interface FragmentBehavior {
  triggersScroll: boolean;
  requiresJS: boolean;
  seoFriendly: boolean;
  shareable: boolean;
}

/** Content payload varies by fragment type */
export interface FragmentContent {
  anchor?: string;
  route?: { path: string; params: Record<string, string>; query: Record<string, string> };
  state?: Record<string, string>;
  media?: { type: string; value: number; formatted: string };
}

export interface FragmentAnalysis {
  type: FragmentType;
  /** The raw fragment string (without leading #) */
  raw: string;
  content: FragmentContent;
  behavior: FragmentBehavior;
}

export interface ParsedURL {
  /** Full original URL */
  href: string;
  scheme: string;
  host: string;
  pathname: string;
  query: string;
  /** Fragment analysis (the part after #) */
  fragment: FragmentAnalysis;
  /** File extension extracted from pathname, e.g. ".js" */
  extension: string;
  /** Inferred MIME type from extension */
  mimeHint: string;
  /** origin (scheme + host) */
  origin: string;
  /** Cache key = origin + pathname + search (no fragment) */
  cacheKey: string;
  isDataURI: boolean;
  isBlob: boolean;
}

// ─── Layer 3: Derived Metrics ────────────────────────────────────────

export interface TimingBreakdown {
  blocked: number;
  dns: number;
  ssl: number;
  connect: number;
  send: number;
  wait: number;
  receive: number;
  total: number;
}

export interface DerivedMetrics {
  isSecure: boolean;
  isHTTP2: boolean;
  isHTTP3: boolean;
  compressionRatio: number;
  compressionType: string;
  cacheHit: boolean;
  cacheType: CacheType;
  ttfb: number;
  ttfbGrade: TTFBGrade;
  sizeGrade: SizeGrade;
  timingBreakdown: TimingBreakdown;
  priority: AssetGroup;
}

// ─── Layer 4: Relational Context ─────────────────────────────────────

export interface RelationalContext {
  /** Page URL this entry belongs to */
  page: string;
  /** Whether this request is same-origin as the page */
  sameOrigin: boolean;
  /** Chain of initiators leading to this request */
  initiatorChain: string[];
  /** Asset grouping classification */
  assetGroup: AssetGroup;
  /** Domain classification */
  domainType: DomainType;
}

// ─── Top-level HARContext (all 4 layers) ─────────────────────────────

export interface HARContext {
  /** Layer 1: Raw HAR entry data */
  raw: HAREntry;
  /** Layer 2: Parsed & classified URL */
  parsed: ParsedURL;
  /** Layer 3: Derived performance metrics */
  derived: DerivedMetrics;
  /** Layer 4: Relational context within the page */
  relational: RelationalContext;
}
