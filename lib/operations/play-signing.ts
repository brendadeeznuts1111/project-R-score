// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.sh/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.sh/docs/runtime/sqlite — bun:sqlite Database
/**
 * Play signing and distribution.
 *
 * Every play from an expert is HMAC-signed (sha256) before distribution.
 * The signature links the play to the expert, sport, event, selection, odds,
 * and recommended stake — a downstream node can verify it came from the
 * registered expert and wasn't tampered with in transit.
 */

import { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';

export interface PlayInput {
  expertId: string; // brand-ok — opaque UUID from bun.randomUUIDv7
  sport: string;
  market: string;
  event: string;
  selection: string;
  odds: number;
  stakeRecommended: number;
  confidence?: number;
}

export interface PlayRecord {
  id: string; // brand-ok — opaque UUID
  expertId: string; // brand-ok — opaque UUID
  sport: string;
  market: string;
  event: string;
  selection: string;
  odds: number;
  stakeRecommended: number;
  confidence: number;
  signedHash: string;
  sentAt: string;
}

export class PlaySigner {
  private secret: string;

  constructor() {
    this.secret = Bun.env.PLAY_SIGNING_SECRET || 'operations-dev-secret';
  }

  /** Produce an HMAC signature for a play payload. */
  sign(play: PlayInput): string {
    const payload = [
      play.expertId,
      play.sport,
      play.market,
      play.event,
      play.selection,
      String(play.odds),
      String(play.stakeRecommended),
    ].join(':');
    const hasher = new Bun.CryptoHasher('sha256', this.secret);
    hasher.update(payload);
    return hasher.digest('hex');
  }

  /** Verify a play's signature matches the expected payload. */
  verify(play: PlayInput, signature: string): boolean {
    return this.sign(play) === signature;
  }

  /** Persist a play and distribute it to all active nodes following its expert. */
  async publish(play: PlayInput, db: Database): Promise<PlayRecord> {
    const id = randomUUIDv7();
    const signedHash = this.sign(play);
    const sentAt = new Date().toISOString();
    const confidence = play.confidence ?? 0;

    db.run(
      `
      INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at)
      VALUES ($id, $eid, $sport, $market, $event, $sel, $odds, $stake, $conf, $hash, $sent)
    `,
      {
        $id: id,
        $eid: play.expertId,
        $sport: play.sport,
        $market: play.market,
        $event: play.event,
        $sel: play.selection,
        $odds: play.odds,
        $stake: play.stakeRecommended,
        $conf: confidence,
        $hash: signedHash,
        $sent: sentAt,
      }
    );

    // Fan out to all active tree nodes following this expert
    const recipients = db
      .query('SELECT id FROM tree_nodes WHERE expert_id = $eid AND active = 1')
      .all({ $eid: play.expertId }) as { id: string /* brand-ok */ }[];

    const now = new Date().toISOString();
    for (const { id: nodeId } of recipients) {
      db.run(
        `
        INSERT OR IGNORE INTO play_distribution (play_id, node_id, channel, received_at)
        VALUES ($pid, $nid, 'telegram', $now)
      `,
        { $pid: id, $nid: nodeId, $now: now }
      );
    }

    return { id, ...play, confidence, signedHash, sentAt };
  }
}
