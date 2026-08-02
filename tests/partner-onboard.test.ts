// partner-onboard.test.ts — one-command partner onboarding (phase 3).
// Offline: in-memory ops DB + temp intake/profiles dirs + temp audit path.

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  bookKeyFromUrl,
  callSignFor,
  detectBookType,
  normalizePartnerCode,
  onboardPartner,
} from '../lib/partner-profile/onboard';
import { loadSeatIntake } from '../lib/telegram/seat-intake';
import { parsePartnerProfileToml } from '../lib/partner-profile/parse';

describe('normalize / derive / detect', () => {
  test('normalizePartnerCode uppercases + validates', () => {
    expect(normalizePartnerCode('johnny')).toBe('JOHNNY');
    expect(normalizePartnerCode('JOHNNY')).toBe('JOHNNY');
    expect(() => normalizePartnerCode('johnny-boy')).toThrow();
  });

  test('callSignFor derives CODE-001', () => {
    expect(callSignFor('JOHNNY')).toBe('JOHNNY-001');
  });

  test('bookKeyFromUrl strips rc/www subdomains', () => {
    expect(bookKeyFromUrl('https://rc.youwager.lv/')).toBe('youwager');
    expect(bookKeyFromUrl('https://sportsbook.fanduel.com/x')).toBe('fanduel');
    expect(bookKeyFromUrl('https://www.pinnacle.com')).toBe('pinnacle');
  });

  test('detectBookType: rc.* → pph, explicit wins', () => {
    expect(detectBookType('https://rc.youwager.lv')).toBe('pph');
    expect(detectBookType('https://sportsbook.fanduel.com')).toBe('offshore');
    expect(detectBookType('https://rc.youwager.lv', 'legal')).toBe('legal');
  });
});

describe('onboardPartner', () => {
  let intakeDir: string;
  let profilesDir: string;
  let auditPath: string;
  let dbPath: string;

  beforeEach(() => {
    intakeDir = mkdtempSync(join(tmpdir(), 'fw-intake-'));
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-profiles-'));
    auditPath = join(mkdtempSync(join(tmpdir(), 'fw-audit-')), 'partner-registration.log');
    // persistent file DB so idempotent reruns share the same tree_nodes
    dbPath = join(mkdtempSync(join(tmpdir(), 'fw-db-')), 'ops.db');
  });

  async function run(opts: Record<string, unknown> = {}) {
    return onboardPartner({
      code: 'johnny',
      url: 'https://rc.youwager.lv',
      username: 'youwager-user',
      password: 'hunter2',
      telegramUserId: '8013171035',
      skipForum: true,
      dbPath,
      intakeDir,
      profilesDir,
      auditPath,
      registryPath: join(mkdtempSync(join(tmpdir(), 'fw-reg-')), 'partner-profiles.json'),
      ...opts,
    } as never);
  }

  test('dry-run writes nothing', async () => {
    const { plan, nodeId, intakePath, profilePath } = await run({ dryRun: true });
    expect(plan.identity).toBe('create');
    expect(plan.type).toBe('pph');
    expect(plan.bookKey).toBe('youwager');
    expect(nodeId).toBeNull();
    expect(intakePath).toBeNull();
    expect(profilePath).toBeNull();
    expect(await Bun.file(auditPath).exists()).toBe(false);
  });

  test('real run: node + vault + intake + profile + audit; idempotent on rerun', async () => {
    const { plan, nodeId } = await run({});
    expect(plan.identity).toBe('create');
    expect(plan.callSign).toBe('JOHNNY-001');
    expect(nodeId).toBeTruthy();

    // intake: vaultKey present, no plaintext password
    const intake = await loadSeatIntake('JOHNNY-001', intakeDir);
    expect(intake?.outs[0]).toMatchObject({
      outId: 'JOHNNY-1',
      book: 'https://rc.youwager.lv',
      bookLogin: 'youwager-user',
      vaultKey: 'partner:JOHNNY:youwager',
    });
    expect((intake?.outs[0] as Record<string, unknown>).password).toBeUndefined();

    // profile: parses + validates
    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    const profile = parsePartnerProfileToml(text, 'JOHNNY');
    expect(profile.books?.youwager?.type).toBe('pph');
    expect(profile.books?.youwager?.account?.vaultKey).toBe('partner:JOHNNY:youwager');

    // audit line present
    const log = await Bun.file(auditPath).text();
    expect(log).toContain('"action":"partner:onboard"');
    expect(log).toContain('"code":"JOHNNY"');

    // idempotent rerun reuses the node
    const again = await run({});
    expect(again.plan.identity).toBe('reuse');
    expect(again.nodeId).toBe(nodeId);
  });

  test('missing required input fails fast', async () => {
    await expect(
      run({ url: undefined } as never)
    ).rejects.toThrow(/url and username are required/);
  });
});

void 0;
