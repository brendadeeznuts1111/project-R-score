// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
/**
 * Partner domain URLPattern hash routing.
 *
 * Reconciliation with the portal framework:
 * - Page-level navigation exists (chrome-catalog hrefs, page-glossary surfaces)
 *   but no hash-based intra-page routing layer — this module is the first.
 * - Anchor concept ids resolve against PORTAL_SEMANTIC_CONCEPTS
 *   (semantic-vocabulary.ts); resolution is enforced by
 *   scripts/validate-partner-integration.ts.
 * - Colors resolve through lib/telegram/partner-ops-color-kernel.ts (never
 *   invented hexes).
 * - Domain ids are the SHIPPED Kalshi cores + Factory overlay ids. The
 *   proposed renames (accounting.deposit_received, …) and proposed-new ids
 *   (location.*, deposit.method.btc/eth/usdt/cash, out.status.zero_balance,
 *   accounting.credit_repaid/fee_deducted, telegram.bot) are NOT implemented
 *   and do not appear here.
 *
 * URLPattern hash patterns match the fragment WITHOUT the leading "#"
 * (per the URLPattern spec — see Kalshi-bot glossary `hash: "glossary\\::concept"`).
 */

import type { PortalSemanticConceptKey } from './semantic-vocabulary.ts';

const PARTNER_CODE_RE = /^[A-Z]{3,6}$/;
const OUT_ID_RE = /^out-[A-Z0-9-]+$/;
const BOOK_ID_RE = /^book-[a-z0-9-]+$/;
const TELEGRAM_TOPIC_RE = /^(general|ops|alerts|liquidity|accounting)$/;

export type PartnerRouteType = 'partners' | 'partner' | 'out' | 'accounting' | 'telegram' | 'book';

export type PartnerRoute =
  | { type: 'partners' }
  | { type: 'partner'; code: string } // brand-ok — partner CODE from partners-ops registry
  | { type: 'out'; code: string; outId: string } // brand-ok — out token from partners-ops registry
  | { type: 'accounting'; code: string } // brand-ok — partner CODE
  | { type: 'telegram'; code: string; topic: string } // topic slug — validated against TELEGRAM_TOPICS in partner-telegram.ts
  | { type: 'book'; bookId: string }; // brand-ok — book id from partners-ops registry

/** Constructor-time validation: invalid patterns throw on import (Bun URLPattern). */
const PARTNER_PATTERNS = {
  // Most-specific first: out / accounting / telegram before bare partner.
  out: new URLPattern({ hash: 'partner/:code/out/:outId' }),
  accounting: new URLPattern({ hash: 'partner/:code/accounting' }),
  telegram: new URLPattern({ hash: 'partner/:code/telegram/:topic' }),
  partner: new URLPattern({ hash: 'partner/:code' }),
  book: new URLPattern({ hash: 'book/:bookId' }),
  partners: new URLPattern({ hash: 'partners' }),
} as const;

function decode(value: string | undefined): string {
  try {
    return decodeURIComponent(value || '');
  } catch {
    return '';
  }
}

function normalizePartnerCode(value: string | undefined): string | null {
  const code = decode(value).trim().toUpperCase();
  return PARTNER_CODE_RE.test(code) ? code : null;
}

/**
 * Parse a location.hash value ("#partner/ASH") into a typed PartnerRoute.
 * Returns null for unparseable / non-partner hashes.
 */
export function parsePartnerHash(hash: string): PartnerRoute | null {
  const clean = hash.replace(/^#/, '');
  if (!clean) return null;

  const out = PARTNER_PATTERNS.out.exec({ hash: clean });
  if (out) {
    const code = normalizePartnerCode(out.hash.groups.code);
    const outId = decode(out.hash.groups.outId);
    if (code && OUT_ID_RE.test(outId) && outId.startsWith(`out-${code}-`)) {
      return { type: 'out', code, outId };
    }
  }

  const accounting = PARTNER_PATTERNS.accounting.exec({ hash: clean });
  if (accounting) {
    const code = normalizePartnerCode(accounting.hash.groups.code);
    if (code) return { type: 'accounting', code };
  }

  const telegram = PARTNER_PATTERNS.telegram.exec({ hash: clean });
  if (telegram) {
    const code = normalizePartnerCode(telegram.hash.groups.code);
    const topic = decode(telegram.hash.groups.topic).toLowerCase();
    if (code && TELEGRAM_TOPIC_RE.test(topic)) return { type: 'telegram', code, topic };
  }

  const partner = PARTNER_PATTERNS.partner.exec({ hash: clean });
  if (partner) {
    const code = normalizePartnerCode(partner.hash.groups.code);
    if (code) return { type: 'partner', code };
  }

  const book = PARTNER_PATTERNS.book.exec({ hash: clean });
  if (book) {
    const bookId = decode(book.hash.groups.bookId).toLowerCase();
    if (BOOK_ID_RE.test(bookId)) return { type: 'book', bookId };
  }

  const partners = PARTNER_PATTERNS.partners.exec({ hash: clean });
  if (partners) return { type: 'partners' };

  return null;
}

/** DOM mount id for a parsed route (hash → anchor). */
export function anchorDomId(route: PartnerRoute): string {
  switch (route.type) {
    case 'partners':
      return 'partner-panel';
    case 'partner':
      return `partner-detail-${route.code}`;
    case 'out':
      return `out-card-${route.outId}`;
    case 'accounting':
      return 'accounting-ledger';
    case 'telegram':
      return 'telegram-thread';
    case 'book':
      return `book-card-${route.bookId}`;
  }
}

/** Portal semantic concept that owns the anchor for a route. */
export function anchorConceptId(route: PartnerRoute): PortalSemanticConceptKey {
  switch (route.type) {
    case 'partners':
      return 'page.partners';
    case 'partner':
      return 'page.partners';
    case 'out':
      return 'section.partnersOuts';
    case 'accounting':
      return 'section.partnersAccounting';
    case 'telegram':
      return 'section.partnersTelegram';
    case 'book':
      return 'section.partnersBookDetail';
  }
}

/** Hash string that yields the given route (canonical deep-link form). */
export function partnerHash(route: PartnerRoute): string {
  switch (route.type) {
    case 'partners':
      return '#partners';
    case 'partner': {
      const code = normalizePartnerCode(route.code);
      return code ? `#partner/${code}` : '#partners';
    }
    case 'out':
      return parsePartnerHash(`#partner/${route.code}/out/${route.outId}`)
        ? `#partner/${normalizePartnerCode(route.code)}/out/${route.outId}`
        : '#partners';
    case 'accounting':
      return normalizePartnerCode(route.code)
        ? `#partner/${normalizePartnerCode(route.code)}/accounting`
        : '#partners';
    case 'telegram':
      return normalizePartnerCode(route.code) && TELEGRAM_TOPIC_RE.test(route.topic)
        ? `#partner/${normalizePartnerCode(route.code)}/telegram/${route.topic}`
        : '#partners';
    case 'book':
      return BOOK_ID_RE.test(route.bookId) ? `#book/${route.bookId}` : '#partners';
  }
}
