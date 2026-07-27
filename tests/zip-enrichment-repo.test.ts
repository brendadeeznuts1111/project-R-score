// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { describe, test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { ScopedRepository, type Scope } from '../lib/repository.ts';
import { ZipEnrichmentRepo } from '../lib/zip-enrichment-repo.ts';

const scope: Scope = {
  nodeId: 'p-test',
  country: 'US',
  sport: 'soccer',
  market: 'match_winner',
  state: 'NJ',
};

describe('ZipEnrichmentRepo + ScopedRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run(`
      CREATE TABLE play_analysis (
        play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
        line_at_bet REAL, side TEXT, won INT, rlm_flag INT
      );
      CREATE TABLE market_snapshots (
        play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
        bookmaker TEXT, snapshot_type TEXT, relative_time_sec INT, snapshot_data TEXT
      );
      CREATE TABLE play_zip_enrichment (
        play_id TEXT, node_id TEXT, country_code TEXT, sport_id TEXT, market_id TEXT, state_code TEXT,
        zip_prefix TEXT
      );
    `);
    for (let i = 0; i < 6; i++) {
      const zip = i < 4 ? '084' : '070';
      const won = i % 2;
      db.run(
        `INSERT INTO play_analysis VALUES (?,?,?,?,?,?,?,?,?,?)`,
        `p${i}`,
        scope.nodeId,
        scope.country,
        scope.sport,
        scope.market,
        scope.state,
        2.0,
        'home',
        won,
        0
      );
      db.run(
        `INSERT INTO play_zip_enrichment VALUES (?,?,?,?,?,?,?)`,
        `p${i}`,
        scope.nodeId,
        scope.country,
        scope.sport,
        scope.market,
        scope.state,
        zip
      );
      db.run(
        `INSERT INTO market_snapshots VALUES (?,?,?,?,?,?,?,?,?,?)`,
        `p${i}`,
        scope.nodeId,
        scope.country,
        scope.sport,
        scope.market,
        scope.state,
        'pinnacle',
        'line',
        300,
        JSON.stringify({ line: 2.1 })
      );
    }
  });

  test('ScopedRepository.all injects multi-dimension scope', () => {
    const repo = new ScopedRepository(db, scope, 'play_analysis');
    const rows = repo.all(
      'SELECT play_id FROM play_analysis LIMIT 10'
    ) as Array<{ play_id: string }>; // brand-ok
    expect(rows.length).toBe(6);
    expect(() =>
      repo.all('SELECT * FROM play_analysis WHERE node_id = ?')
    ).toThrow(/Direct dimension filter/);
  });

  test('getClusterStats groups by zip_prefix', () => {
    const zipRepo = new ZipEnrichmentRepo(db, scope);
    const stats = zipRepo.getClusterStats(90);
    expect(stats.length).toBe(2);
    const z084 = stats.find(s => s.zip_prefix === '084');
    expect(z084?.total_plays).toBe(4);
    expect(z084?.win_rate).toBeGreaterThanOrEqual(0);
    expect(z084?.avg_clv).not.toBeNull();
  });
});
