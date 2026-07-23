// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// Seed the platforms catalog with stable slug ids (joinable to sb_accounts.book / positions.book).
import { Database } from 'bun:sqlite';
import { initSchema } from '../lib/operations/schema.ts';
import { platformSlug } from '../lib/operations/platform-coverage.ts';

type SeedRow = {
  id: string; // brand-ok — platforms.id slug
  name: string;
  category: string;
  sub: string;
  url: string;
  api?: boolean;
  launch?: string;
};

const PLATFORMS: SeedRow[] = [
  // Sportsbooks (ids align with sb_accounts.book where applicable)
  {
    id: 'draftkings',
    name: 'DraftKings',
    category: 'sportsbook',
    sub: 'regulated_us',
    url: 'https://draftkings.com',
    api: true,
    launch: '2018-08-01',
  },
  {
    id: 'fanduel',
    name: 'FanDuel',
    category: 'sportsbook',
    sub: 'regulated_us',
    url: 'https://fanduel.com',
    api: true,
    launch: '2018-08-01',
  },
  {
    id: 'betmgm',
    name: 'BetMGM',
    category: 'sportsbook',
    sub: 'regulated_us',
    url: 'https://betmgm.com',
    launch: '2019-01-01',
  },
  {
    id: 'caesars',
    name: 'Caesars',
    category: 'sportsbook',
    sub: 'regulated_us',
    url: 'https://caesars.com',
    launch: '2020-01-01',
  },
  {
    id: 'hardrock',
    name: 'Hard Rock Bet',
    category: 'sportsbook',
    sub: 'tribal',
    url: 'https://hardrock.bet',
    launch: '2022-01-01',
  },
  {
    id: 'pointsbet',
    name: 'PointsBet',
    category: 'sportsbook',
    sub: 'australian',
    url: 'https://pointsbet.com',
  },
  {
    id: 'betrivers',
    name: 'BetRivers',
    category: 'sportsbook',
    sub: 'rush_street',
    url: 'https://betrivers.com',
  },
  {
    id: 'espnbet',
    name: 'ESPN Bet',
    category: 'sportsbook',
    sub: 'penn',
    url: 'https://espnbet.com',
  },
  {
    id: 'bet365',
    name: 'bet365',
    category: 'sportsbook',
    sub: 'european',
    url: 'https://bet365.com',
  },
  {
    id: 'betway',
    name: 'Betway',
    category: 'sportsbook',
    sub: 'european',
    url: 'https://betway.com',
  },
  // Exchanges
  {
    id: 'betfair',
    name: 'Betfair',
    category: 'exchange',
    sub: 'european',
    url: 'https://betfair.com',
    api: true,
  },
  {
    id: 'smarkets',
    name: 'Smarkets',
    category: 'exchange',
    sub: 'uk',
    url: 'https://smarkets.com',
  },
  {
    id: 'matchbook',
    name: 'Matchbook',
    category: 'exchange',
    sub: 'uk',
    url: 'https://matchbook.com',
  },
  {
    id: 'prophet',
    name: 'Prophet Exchange',
    category: 'exchange',
    sub: 'us',
    url: 'https://prophet.bet',
  },
  {
    id: 'sporttrade',
    name: 'Sporttrade',
    category: 'exchange',
    sub: 'us',
    url: 'https://sporttrade.com',
  },
  {
    id: 'kalshi',
    name: 'Kalshi',
    category: 'exchange',
    sub: 'cftc_exchange',
    url: 'https://kalshi.com',
    api: true,
    launch: '2020-07-01',
  },
  // DFS
  {
    id: 'prizepicks',
    name: 'PrizePicks',
    category: 'dfs',
    sub: 'pickem',
    url: 'https://prizepicks.com',
  },
  {
    id: 'underdog',
    name: 'Underdog Fantasy',
    category: 'dfs',
    sub: 'pickem',
    url: 'https://underdogfantasy.com',
  },
  { id: 'sleeper', name: 'Sleeper', category: 'dfs', sub: 'pickem', url: 'https://sleeper.com' },
  { id: 'dabble', name: 'Dabble', category: 'dfs', sub: 'social', url: 'https://dabble.com' },
  // Crypto sportsbooks
  {
    id: 'stake',
    name: 'Stake',
    category: 'crypto_sportsbook',
    sub: 'crypto',
    url: 'https://stake.com',
  },
  {
    id: 'bovada',
    name: 'Bovada',
    category: 'crypto_sportsbook',
    sub: 'crypto',
    url: 'https://bovada.lv',
  },
  {
    id: 'betonline',
    name: 'BetOnline',
    category: 'crypto_sportsbook',
    sub: 'crypto',
    url: 'https://betonline.ag',
  },
  {
    id: 'cloudbet',
    name: 'Cloudbet',
    category: 'crypto_sportsbook',
    sub: 'crypto',
    url: 'https://cloudbet.com',
  },
  {
    id: 'thunderpick',
    name: 'Thunderpick',
    category: 'crypto_sportsbook',
    sub: 'esports',
    url: 'https://thunderpick.io',
  },
  // P2P
  { id: 'novig', name: 'Novig', category: 'p2p', sub: 'marketplace', url: 'https://novig.com' },
  { id: 'fliff', name: 'Fliff', category: 'p2p', sub: 'social', url: 'https://fliff.com' },
  { id: 'rebet', name: 'ReBet', category: 'p2p', sub: 'social', url: 'https://rebet.com' },
  // Sandbox (automated_test provisioning only)
  {
    id: 'sandbox-book',
    name: 'Sandbox Book',
    category: 'sportsbook',
    sub: 'sandbox',
    url: 'https://sandbox.factory-wager.com',
    launch: '2024-01-01',
  },
];

const dbPath = Bun.env.OPS_DB_PATH || 'data/operations.db';
const db = new Database(dbPath, { create: true });
initSchema(db);

const insert = db.prepare(`
  INSERT INTO platforms (
    id, name, category, sub_category, url, active, status, api_available,
    launch_date, created_at, updated_at
  ) VALUES (
    $id, $name, $cat, $sub, $url, 1, 'active', $api, $launch, $now, $now
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    sub_category = excluded.sub_category,
    url = excluded.url,
    api_available = excluded.api_available,
    launch_date = COALESCE(platforms.launch_date, excluded.launch_date),
    status = COALESCE(platforms.status, 'active'),
    updated_at = excluded.updated_at
`);

const now = new Date().toISOString();
let count = 0;
for (const p of PLATFORMS) {
  const id = p.id || platformSlug(p.name);
  insert.run({
    $id: id,
    $name: p.name,
    $cat: p.category,
    $sub: p.sub,
    $url: p.url,
    $api: p.api ? 1 : 0,
    $launch: p.launch ?? null,
    $now: now,
  });
  count++;
}

console.log(`Seeded/updated ${count} platforms → ${dbPath}`);

// Seed demo partner + accounts if tree is empty
const partners = db
  .query("SELECT id FROM tree_nodes WHERE type = 'partner' AND active = 1")
  .all() as { id: string }[]; // brand-ok — tree_nodes.id

if (partners.length === 0) {
  const pid = Bun.randomUUIDv7();
  db.run(
    `INSERT INTO tree_nodes (id, type, name, telegram_id, rail_preference, active, status, created_at)
     VALUES ($id, 'partner', $name, $tg, 'wire', 1, 'partner', $now)`,
    { $id: pid, $name: 'Partner X', $tg: 'demo-tg-1', $now: now }
  );

  const platforms = db.query('SELECT id, category FROM platforms ORDER BY name').all() as {
    id: string; // brand-ok — platforms.id slug
    category: string;
  }[];
  let acctCount = 0;
  for (const p of platforms.slice(0, 8)) {
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, opened_at, created_at)
       VALUES ($id, $pid, $partner, $ident, $bal, 'active', $opened, $now)`,
      {
        $id: Bun.randomUUIDv7(),
        $pid: p.id,
        $partner: pid,
        $ident: `${p.category}-user-${acctCount}`,
        $bal: Math.floor(Math.random() * 50000) / 100,
        $opened: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
        $now: now,
      }
    );
    acctCount++;
  }
  db.run(
    `INSERT INTO partner_platform_accounts
       (id, platform_id, partner_id, account_identifier, balance, status, opened_at, created_at)
     VALUES ($id, $pid, $partner, $ident, $bal, 'limited', $opened, $now)`,
    {
      $id: Bun.randomUUIDv7(),
      $pid: platforms[0]!.id,
      $partner: pid,
      $ident: 'limited-user-1',
      $bal: 42.5,
      $opened: new Date(Date.now() - 45 * 86400000).toISOString(),
      $now: now,
    }
  );
  console.log(`Seeded 1 partner + ${acctCount + 1} accounts`);
}

db.close();
