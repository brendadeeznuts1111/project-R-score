// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Play signing and distribution.
 *
 * Every play from an expert is HMAC-signed (sha256) before distribution.
 * Publish delegates to play-dispatcher for transactional fan-out + telegram outbox.
 */
import type { Database } from 'bun:sqlite';
import { publishAndDispatch, type PublishOpts } from './play-dispatcher.ts';

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

  verify(play: PlayInput, signature: string): boolean {
    return this.sign(play) === signature;
  }

  /** Persist, fan-out, and enqueue telegram notifications (transactional). */
  async publish(
    play: PlayInput,
    db: Database,
    opts?: PublishOpts
  ): Promise<PlayRecord & { enqueued?: number }> {
    const result = await publishAndDispatch(this, play, db, opts);
    const { enqueued: _enqueued, ...record } = result;
    return record;
  }
}
