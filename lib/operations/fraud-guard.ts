// @see https://bun.com/docs/runtime/sqlite
/**
 * Fraud signal detection for expert plays — event correlation and sport concentration.
 */
import type { Database } from 'bun:sqlite';
import type { PlayInput } from './play-signing.ts';
import type { PlayValidation } from './play-validation.ts';

export const FRAUD_GUARDRAILS = {
  /** Max plays on the same event within 24h before blocking. */
  maxSameEventPlays24h: 3,
  /** Max recent same-sport plays (24h lookback) before blocking. */
  sameSportWindow: 5,
} as const;

export type { PlayValidation };

/**
 * Detect fraud-ish concentration signals for an incoming play.
 * Does not insert; callers gate publish/dispatch on the result.
 */
export function detectFraudSignals(db: Database, play: PlayInput): PlayValidation {
  const sameEvent = db
    .query(
      `SELECT COUNT(*) as c FROM plays
       WHERE event = $ev
         AND sent_at > datetime('now', '-24 hours')`
    )
    .get({ $ev: play.event }) as { c: number };

  if (sameEvent.c >= FRAUD_GUARDRAILS.maxSameEventPlays24h) {
    return {
      valid: false,
      reason: `Event correlation: ${sameEvent.c} plays on "${play.event}" in 24h (max ${FRAUD_GUARDRAILS.maxSameEventPlays24h})`,
    };
  }

  const sameSport = db
    .query(
      `SELECT COUNT(*) as c FROM plays
       WHERE sport = $sport
         AND sent_at > datetime('now', '-24 hours')`
    )
    .get({ $sport: play.sport }) as { c: number };

  if (sameSport.c >= FRAUD_GUARDRAILS.sameSportWindow) {
    return {
      valid: false,
      reason: `Sport concentration: ${sameSport.c} recent ${play.sport} plays (max ${FRAUD_GUARDRAILS.sameSportWindow})`,
    };
  }

  return { valid: true };
}
