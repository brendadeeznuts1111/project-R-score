// lib/har-analyzer/fragment-analyzer.ts — Fragment classification engine
// Pure functions, no external dependencies.

import type { FragmentAnalysis, FragmentBehavior, FragmentContent, FragmentType } from './types';

// ─── Behavior presets ────────────────────────────────────────────────

const BEHAVIOR: Record<FragmentType, FragmentBehavior> = {
  empty: { triggersScroll: false, requiresJS: false, seoFriendly: false, shareable: false },
  anchor: { triggersScroll: true, requiresJS: false, seoFriendly: true, shareable: true },
  hashbang: { triggersScroll: false, requiresJS: true, seoFriendly: false, shareable: false },
  route: { triggersScroll: false, requiresJS: true, seoFriendly: false, shareable: true },
  state: { triggersScroll: false, requiresJS: true, seoFriendly: false, shareable: false },
  media: { triggersScroll: false, requiresJS: false, seoFriendly: false, shareable: true },
  query: { triggersScroll: false, requiresJS: true, seoFriendly: false, shareable: false },
  unknown: { triggersScroll: false, requiresJS: false, seoFriendly: false, shareable: false },
};

// ─── Detection helpers ───────────────────────────────────────────────

function safeDecode(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/** Parse `key=value&key2=value2` into a record */
function parseKVPairs(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of str.split('&')) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) {
      result[safeDecode(pair)] = '';
    } else {
      result[safeDecode(pair.slice(0, eqIdx))] = safeDecode(pair.slice(eqIdx + 1));
    }
  }
  return result;
}

/** Parse media time value (supports seconds or mm:ss) → total seconds */
function parseMediaTime(raw: string): { value: number; formatted: string } {
  const parts = raw.split(':').map(Number);
  // Guard against non-numeric input (e.g. "t=abc" → [NaN])
  if (parts.some(isNaN)) return { value: 0, formatted: '0' };
  let value: number;
  if (parts.length === 2) {
    value = parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    value = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    value = parts[0] || 0;
  }
  value = Math.floor(value);
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  const formatted = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}`;
  return { value, formatted };
}

/** Check if string looks like key=value pairs */
function isKVString(str: string): boolean {
  return /^[^=&]+=[^&]*(&[^=&]+=[^&]*)*$/.test(str);
}

// ─── Classification ──────────────────────────────────────────────────

function classify(raw: string): { type: FragmentType; content: FragmentContent } {
  // empty
  if (!raw || raw.length === 0) {
    return { type: 'empty', content: {} };
  }

  // hashbang: starts with !
  if (raw.startsWith('!')) {
    const path = raw.slice(1); // strip leading !
    return {
      type: 'hashbang',
      content: { route: { path, params: {}, query: {} } },
    };
  }

  // media: starts with t=
  if (raw.startsWith('t=')) {
    const timeStr = raw.slice(2);
    const { value, formatted } = parseMediaTime(timeStr);
    return {
      type: 'media',
      content: { media: { type: 't', value, formatted } },
    };
  }

  // query: starts with ?
  if (raw.startsWith('?')) {
    const kvStr = raw.slice(1);
    return {
      type: 'query',
      content: { state: parseKVPairs(kvStr) },
    };
  }

  // route: contains / segments
  if (raw.includes('/')) {
    const qIdx = raw.indexOf('?');
    const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
    const query = qIdx === -1 ? {} : parseKVPairs(raw.slice(qIdx + 1));
    // Extract named params like :id from path segments (common in SPA routes)
    const params: Record<string, string> = {};
    return {
      type: 'route',
      content: { route: { path: path.startsWith('/') ? path : `/${path}`, params, query } },
    };
  }

  // state: contains key=value pairs
  if (isKVString(raw)) {
    return {
      type: 'state',
      content: { state: parseKVPairs(raw) },
    };
  }

  // anchor: plain identifier (no slashes, no special leading chars)
  if (/^[\w-]+$/.test(raw)) {
    return {
      type: 'anchor',
      content: { anchor: raw },
    };
  }

  // unknown
  return { type: 'unknown', content: {} };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Analyze a URL fragment string.
 * @param fragment - The raw fragment (without leading `#`). Pass empty string or undefined for no fragment.
 */
export function analyzeFragment(fragment?: string): FragmentAnalysis {
  const raw = fragment ?? '';
  const { type, content } = classify(raw);
  return {
    type,
    raw,
    content,
    behavior: BEHAVIOR[type],
  };
}
