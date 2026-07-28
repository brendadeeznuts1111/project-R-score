// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import { proveZipDayWindow } from '../lib/operations/prove-zip-day-window.ts';
import { ZipEnrichmentRepo } from '../lib/zip-enrichment-repo.ts';
import { Database } from 'bun:sqlite';

describe('proveZipDayWindow', () => {
  test('filters stale rows via enriched_at (90d)', () => {
    const proof = proveZipDayWindow({ days: 90, recentCount: 4, staleCount: 6 });
    expect(proof.ok).toBe(true);
    expect(proof.mode).toBe('enriched');
    expect(proof.totalPlays).toBe(10);
    expect(proof.inWindowPlays).toBe(4);
    expect(proof.clusters.length).toBeGreaterThan(0);
  });
});

describe('ZipEnrichmentRepo enriched_at window', () => {
  test('resolveDayWindowMode prefers enriched_at when no plays table', () => {
    const db = new Database(':memory:');
    db.run(`
      CREATE TABLE play_zip_enrichment (
        play_id TEXT, node_id TEXT, zip_prefix TEXT, enriched_at TEXT
      );
    `);
    const repo = new ZipEnrichmentRepo(db, {
      nodeId: 'n1',
      country: 'US',
      sport: 'soccer',
      market: 'match_winner',
      state: 'NJ',
    });
    expect(repo.resolveDayWindowMode(90)).toBe('enriched');
    expect(repo.resolveDayWindowMode(0)).toBe('none');
    db.close();
  });
});
