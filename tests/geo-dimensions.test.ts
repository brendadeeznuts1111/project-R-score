// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Granular geo columns: state | age | location | zip — discrete, never packed.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import {
  ComplianceRepository,
  ensureStateRegulationSchema,
  seedStateRegulations,
  upsertPartnerGeoProfile,
  getPartnerGeoProfile,
  upsertPlayZipEnrichment,
  ScopedRepository,
} from '../lib/operations/state-regulation.ts';
import { asStateCode, asTreeNodeId, asZipCode } from '../lib/types/branded.ts';

function seedNode(db: ReturnType<typeof openOperationsDb>, id: string) { // brand-ok — test fixture node
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
     VALUES ($id, 'partner', NULL, NULL, $id, 1, 'active', $now)`,
    { $id: id, $now: now }
  );
  bindPartnerProfile(db, asTreeNodeId(id));
}

describe('geo dimensions (state | age | location | zip)', () => {
  let db: ReturnType<typeof openOperationsDb>;

  beforeEach(() => {
    db = openOperationsDb({ path: ':memory:' });
    ensureStateRegulationSchema(db);
    seedStateRegulations(db);
  });

  test('plays and partner_geo_profiles have four separate columns', () => {
    const playCols = new Set(
      (db.query('PRAGMA table_info(plays)').all() as { name: string }[]).map(c => c.name)
    );
    for (const c of ['state_code', 'age', 'location', 'zip_code']) {
      expect(playCols.has(c)).toBe(true);
    }

    const geoCols = new Set(
      (db.query('PRAGMA table_info(partner_geo_profiles)').all() as { name: string }[]).map(
        c => c.name
      )
    );
    expect(geoCols.has('state_code')).toBe(true);
    expect(geoCols.has('age')).toBe(true);
    expect(geoCols.has('location')).toBe(true);
    expect(geoCols.has('zip_code')).toBe(true);
    // No composite dump column
    expect(geoCols.has('geo') || geoCols.has('address')).toBe(false);
  });

  test('upsertPartnerGeoProfile stores discrete fields', () => {
    seedNode(db, 'geo-p1');
    upsertPartnerGeoProfile(db, 'geo-p1', {
      stateCode: 'MA',
      age: 27,
      location: 'Boston',
      zipCode: '02108',
    });
    const p = getPartnerGeoProfile(db, 'geo-p1');
    expect(p).not.toBeNull();
    expect(p!.stateCode).toBe('MA');
    expect(p!.age).toBe(27);
    expect(p!.location).toBe('Boston');
    expect(p!.zipCode).toBe('02108');

    const row = db
      .query(
        `SELECT state_code, age, location, zip_code FROM partner_geo_profiles WHERE node_id = 'geo-p1'`
      )
      .get() as {
      state_code: string;
      age: number;
      location: string;
      zip_code: string;
    };
    // Prove columns are independent — location does not contain zip
    expect(row.location).toBe('Boston');
    expect(row.location.includes('02108')).toBe(false);
    expect(row.zip_code).toBe('02108');
    expect(row.state_code).toBe('MA');
    expect(row.age).toBe(27);
  });

  test('rejects location that embeds a ZIP', () => {
    seedNode(db, 'geo-bad');
    expect(() =>
      upsertPartnerGeoProfile(db, 'geo-bad', {
        stateCode: 'MA',
        age: 30,
        location: 'Boston, MA 02108',
        zipCode: '02108',
      })
    ).toThrow(/must not contain a ZIP/);
  });

  test('min_age 21 blocks underage when age column set', () => {
    seedNode(db, 'geo-young');
    const repo = new ComplianceRepository(db);
    repo.upsertLicense('geo-young', 'MA');
    upsertPartnerGeoProfile(db, 'geo-young', {
      stateCode: 'MA',
      age: 19,
      location: 'Springfield',
      zipCode: '01103',
    });

    const blocked = repo.isBetAllowed({
      nodeId: 'geo-young',
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'straight',
    });
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.reason).toContain('Minimum age');

    upsertPartnerGeoProfile(db, 'geo-young', {
      stateCode: 'MA',
      age: 21,
      location: 'Springfield',
      zipCode: '01103',
    });
    const ok = repo.isBetAllowed({
      nodeId: 'geo-young',
      stateCode: 'MA',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 50,
      betType: 'straight',
    });
    expect(ok).toEqual({ allowed: true });
  });

  test('ScopedRepository isolates by zip without cross-zip leakage', () => {
    seedNode(db, 'geo-scope');
    const nid = asTreeNodeId('geo-scope');
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO play_zip_enrichment
         (play_id, node_id, state_code, age, location, zip_code, enriched_at)
       VALUES
         ('p1', $n, 'MA', 30, 'Boston', '02108', $t),
         ('p2', $n, 'MA', 30, 'Boston', '02139', $t)`,
      { $n: nid, $t: now }
    );

    const scope = new ScopedRepository(db, {
      nodeId: nid,
      state: asStateCode('MA'),
      zip: asZipCode('02108'),
    });
    const rows = scope.all<{ play_id: string; zip_code: string }>( // brand-ok — raw sqlite projection
      `SELECT play_id, zip_code FROM play_zip_enrichment`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.zip_code).toBe('02108');
  });

  test('play_zip_enrichment upsert keeps columns discrete', () => {
    seedNode(db, 'geo-enrich');
    upsertPlayZipEnrichment(db, 'play-1', 'geo-enrich', {
      stateCode: 'NJ',
      age: 35,
      location: 'Newark',
      zipCode: '07102',
    });
    const row = db
      .query(
        `SELECT state_code, age, location, zip_code FROM play_zip_enrichment
         WHERE play_id = 'play-1' AND node_id = 'geo-enrich'`
      )
      .get() as {
      state_code: string;
      age: number;
      location: string;
      zip_code: string;
    };
    expect(row).toEqual({
      state_code: 'NJ',
      age: 35,
      location: 'Newark',
      zip_code: '07102',
    });
  });

  test('violation log stores state, age, location, zip as separate columns', () => {
    seedNode(db, 'geo-viol');
    const repo = new ComplianceRepository(db);
    // no license → block
    repo.checkAndRecord({
      nodeId: 'geo-viol',
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 10,
      betType: 'straight',
      age: 18,
      location: 'Jersey City',
      zipCode: '07302',
    });
    const v = db
      .query(
        `SELECT state_code, age, location, zip_code, reason FROM regulatory_violations
         WHERE node_id = 'geo-viol'`
      )
      .get() as {
      state_code: string;
      age: number;
      location: string;
      zip_code: string;
      reason: string;
    };
    expect(v.state_code).toBe('NJ');
    expect(v.age).toBe(18);
    expect(v.location).toBe('Jersey City');
    expect(v.zip_code).toBe('07302');
    expect(v.reason).toContain('not licensed');
  });
});
