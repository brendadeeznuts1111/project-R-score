// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
/**
 * FanDuel HTML → LimitObservation[] (synthetic [data-fw-limit] contract).
 *
 * @see docs/WIRE_BOUNDARY.md
 * @see docs/harness/tenants/partner-limits.md
 */

import { asSportsbookId } from '../domain.ts';
import {
  parseFwLimitHtml,
  type FwLimitHtmlMode,
  type ParseFwLimitHtmlOptions,
} from '../fw-limit-html-parse.ts';
import type { LimitObservation } from '../limit-observation-wire.ts';

export const FANDUEL_HTML_SPORTSBOOK = asSportsbookId('fanduel');
export const FANDUEL_HTML_AGENT = 'fanduel-agent' as const;

export type FanDuelHtmlMode = FwLimitHtmlMode;

export type ParseFanDuelHtmlOptions = {
  observedAt: string;
  mode: FanDuelHtmlMode;
  referenceUrl?: string | null;
};

/**
 * Parse synthetic FanDuel limits HTML at the wire boundary.
 * Empty / malicious input → empty array (fail closed).
 */
export async function parseFanDuelHtml(
  html: string,
  options: ParseFanDuelHtmlOptions
): Promise<LimitObservation[]> {
  const shared: ParseFwLimitHtmlOptions = {
    sportsbook: FANDUEL_HTML_SPORTSBOOK,
    agent: FANDUEL_HTML_AGENT,
    observedAt: options.observedAt,
    mode: options.mode,
    referenceUrl: options.referenceUrl,
  };
  return parseFwLimitHtml(html, shared);
}
