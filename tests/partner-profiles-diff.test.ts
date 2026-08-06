// @see https://bun.com/docs/test — bun:test
// tests/partner-profiles-diff.test.ts — profile TOML diff + audit baseline.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';

import {
  diffPartnerProfiles,
  lastProfileAuditHash,
  listProfileAudit,
  loadProfileTomlEntries,
  openProfileAuditDb,
  profileFileHash,
  recordDiffAudit,
  recordProfileAudit,
} from '../lib/partner-profile/profiles-diff.ts';

import type { Database } from 'bun:sqlite';

const FIXTURE = '.tmp/profiles-diff-fixture';

async function writeProfile(code: string, body: string): Promise<string> {
  const path = `${FIXTURE}/${code}.toml`;
  const text = `meta.templateId = "partner-active"\nmeta.name = "Test"\nmeta.version = "1.0.0"\nmeta.source = "referral"\n\nidentity.code = "${code}"\nidentity.callSign = "${code}-001"\nidentity.status = "onboarded"\n\nlifecycle.status = "active"\nlifecycle.phase = "operator_ready"\n\n${body}`;
  await Bun.write(path, text);
  return text;
}

function removeProfile(code: string): void {
  rmSync(`${FIXTURE}/${code}.toml`, { force: true });
}

let db: Database;

beforeEach(() => {
  rmSync(FIXTURE, { recursive: true, force: true });
  db = openProfileAuditDb(':memory:');
});

afterEach(() => {
  db.close();
});

describe('profile hashing + TOML loading', () => {
  test('hash is stable and content-sensitive', () => {
    const a = profileFileHash('x');
    expect(profileFileHash('x')).toBe(a);
    expect(profileFileHash('y')).not.toBe(a);
  });

  test('loads only valid profile TOML files', async () => {
    await writeProfile('SPEN', '');
    await Bun.write(`${FIXTURE}/README.toml`, 'not a profile');
    const entries = await loadProfileTomlEntries(FIXTURE);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.code).toBe('SPEN');
  });
});

describe('diff semantics', () => {
  test('added / changed / removed / unchanged against the audit baseline', async () => {
    await writeProfile('SPEN', '');
    await writeProfile('ASH', '');
    let entries = await loadProfileTomlEntries(FIXTURE);

    // No baseline → both added.
    let diff = diffPartnerProfiles({ entries, db });
    expect(diff.added.sort()).toEqual(['ASH', 'SPEN']);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toBe(0);

    // Advance the baseline for both; both become unchanged.
    recordProfileAudit(db, 'ASH', 'baseline', entries.find(e => e.code === 'ASH')!.hash);
    recordProfileAudit(db, 'SPEN', 'baseline', entries.find(e => e.code === 'SPEN')!.hash);
    diff = diffPartnerProfiles({ entries, db });
    expect(diff.added).toEqual([]);
    expect(diff.unchanged).toBe(2);

    // Change SPEN's TOML → SPEN becomes changed (prevHash = old baseline).
    await writeProfile('SPEN', 'telegram.chatId = "12345"\n');
    entries = await loadProfileTomlEntries(FIXTURE);
    diff = diffPartnerProfiles({ entries, db });
    expect(diff.added).toEqual([]);
    expect(diff.changed.map(c => c.code)).toEqual(['SPEN']);
    expect(diff.changed[0]!.prevHash).not.toBeNull();
    expect(diff.changed[0]!.prevHash).not.toBe(diff.changed[0]!.hash);
    expect(diff.unchanged).toBe(1);

    // Remove ASH's file → ASH is removed (known from audit, no TOML).
    removeProfile('ASH');
    entries = await loadProfileTomlEntries(FIXTURE);
    diff = diffPartnerProfiles({ entries, db });
    expect(diff.removed).toEqual(['ASH']);
    expect(diff.added).toEqual([]);
    expect(diff.changed.map(c => c.code)).toEqual(['SPEN']);
  });

  test('recordDiffAudit advances the baseline so a re-diff is clean', async () => {
    await writeProfile('SPEN', '');
    let entries = await loadProfileTomlEntries(FIXTURE);
    const first = diffPartnerProfiles({ entries, db });
    expect(recordDiffAudit(db, first, entries)).toBe(1);

    entries = await loadProfileTomlEntries(FIXTURE);
    const second = diffPartnerProfiles({ entries, db });
    expect(second.added).toEqual([]);
    expect(second.changed).toEqual([]);
    expect(second.unchanged).toBe(1);

    const rows = listProfileAudit(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.action).toBe('add');
    expect(lastProfileAuditHash(db, 'SPEN')).toBe(entries[0]!.hash);
  });

  test('does not append duplicate removal audit rows', async () => {
    recordProfileAudit(db, 'ASH', 'baseline', 'present');
    const diff = diffPartnerProfiles({ entries: [], db });
    expect(diff.removed).toEqual(['ASH']);
    expect(recordDiffAudit(db, diff, [])).toBe(1);
    expect(recordDiffAudit(db, diff, [])).toBe(0);
    expect(listProfileAudit(db, 'ASH').map(row => row.action)).toEqual(['remove', 'baseline']);
  });

  test('audit rows are listed newest-first with code filter', async () => {
    await writeProfile('SPEN', '');
    const entries = await loadProfileTomlEntries(FIXTURE);
    recordDiffAudit(db, diffPartnerProfiles({ entries, db }), entries);
    recordProfileAudit(db, 'ASH', 'baseline', 'abc123');
    const all = listProfileAudit(db);
    expect(all).toHaveLength(2);
    const spen = listProfileAudit(db, 'SPEN');
    expect(spen).toHaveLength(1);
    expect(spen[0]!.partnerCode).toBe('SPEN');
  });
});
