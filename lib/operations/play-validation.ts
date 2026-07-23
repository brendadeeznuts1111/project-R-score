// @see https://bun.com/docs/runtime/sqlite
/**
 * Expert play guardrails — rate limits, stake caps, duplicate detection.
 */
import type { Database } from 'bun:sqlite';
import type { PlayInput } from './play-signing.ts';

export const PLAY_GUARDRAILS = {
  maxPlaysPerHour: 5,
  stakeByEdge: [
    { minEdge: 0.8, maxStake: 500_000 },
    { minEdge: 0.6, maxStake: 200_000 },
    { minEdge: 0, maxStake: 100_000 },
  ],
  duplicateWindowHours: 24,
} as const;

export type PlayValidation = { valid: true } | { valid: false; reason: string };

export function maxStakeForEdge(edgeScore: number): number {
  for (const tier of PLAY_GUARDRAILS.stakeByEdge) {
    if (edgeScore >= tier.minEdge) return tier.maxStake;
  }
  return PLAY_GUARDRAILS.stakeByEdge.at(-1)!.maxStake;
}

export function validatePlay(db: Database, play: PlayInput): PlayValidation {
  const expert = db
    .query('SELECT edge_score, active FROM experts WHERE id = $eid')
    .get({ $eid: play.expertId }) as { edge_score: number; active: number } | null;

  if (!expert) return { valid: false, reason: 'Expert not found' };
  if (!expert.active) return { valid: false, reason: 'Expert is inactive' };

  const recent = db
    .query(
      `SELECT COUNT(*) as c FROM plays
       WHERE expert_id = $eid AND sent_at > datetime('now', '-1 hour')`
    )
    .get({ $eid: play.expertId }) as { c: number };
  if (recent.c >= PLAY_GUARDRAILS.maxPlaysPerHour) {
    return { valid: false, reason: 'Rate limit exceeded (5 plays/hour)' };
  }

  const maxStake = maxStakeForEdge(expert.edge_score);
  if (play.stakeRecommended > maxStake) {
    return {
      valid: false,
      reason: `Stake $${play.stakeRecommended} exceeds $${maxStake} limit for edge ${expert.edge_score}`,
    };
  }

  const duplicate = db
    .query(
      `SELECT id FROM plays
       WHERE expert_id = $eid AND event = $ev AND selection = $sel
         AND sent_at > datetime('now', '-${PLAY_GUARDRAILS.duplicateWindowHours} hours')
       LIMIT 1`
    )
    .get({
      $eid: play.expertId,
      $ev: play.event,
      $sel: play.selection,
    }) as { id: string } | null;

  if (duplicate) {
    return { valid: false, reason: 'Duplicate play within 24h' };
  }

  return { valid: true };
}
