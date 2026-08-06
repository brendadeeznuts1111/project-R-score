// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

/** Tier 1 = sharp, 2 = medium, 3 = recreational (default). */
export const BOOKMAKER_TIERS: Record<string, number> = {
  pinnacle: 1,
  'www.pinnacle.com': 1,
  smarkets: 1,
  'smarkets.com': 1,
  betfair: 1,
  'betfair.com': 1,
  bet365: 2,
  'bet365.com': 2,
  draftkings: 2,
  'sportsbook.draftkings.com': 2,
  fanduel: 2,
  'sportsbook.fanduel.com': 2,
  betmgm: 2,
  'sports.betmgm.com': 2,
  caesars: 2,
  'sportsbook.caesars.com': 2,
  hardrock: 3,
  'hardrock.bet': 3,
  stake: 3,
  'stake.com': 3,
  bovada: 3,
  'bovada.lv': 3,
  betonline: 3,
  'betonline.ag': 3,
  pointsbet: 3,
  'pointsbet.com': 3,
  betrivers: 3,
  'betrivers.com': 3,
  espnbet: 3,
  'espnbet.com': 3,
  prizepicks: 3,
  'prizepicks.com': 3,
  underdog: 3,
  'underdogfantasy.com': 3,
  cloudbet: 3,
  'cloudbet.com': 3,
  thunderpick: 3,
  'thunderpick.io': 3,
  betway: 2,
  'betway.com': 2,
};

export function applyBookmakerTiers(db: Database = openOddsDb()): number {
  ensureMatchingSchema(db);
  const books = db.query(`SELECT id, name, host, config FROM bookmakers`).all() as {
    id: number;
    name: string;
    host: string | null;
    config: string | null;
  }[];
  const update = db.query(`UPDATE bookmakers SET tier = ? WHERE id = ?`);
  let n = 0;
  for (const b of books) {
    let opId: string | null = null; // brand-ok — opaque research/wire id
    try {
      opId = b.config ? ((JSON.parse(b.config) as { id?: string }).id ?? null) : null; // brand-ok — opaque research/wire id
    } catch {
      opId = null;
    }
    const tier =
      (b.host && BOOKMAKER_TIERS[b.host]) ||
      (opId && BOOKMAKER_TIERS[opId]) ||
      BOOKMAKER_TIERS[b.name.toLowerCase()] ||
      3;
    update.run(tier, b.id);
    n++;
  }
  return n;
}
