// partner-profile-schema.test.ts — unified Partner Profile v0 schema + bake.
// Offline: schema validation, phase derivation, TOML parsing, bake shape.

import { describe, expect, test } from 'bun:test';
import { asPartnerTemplateId } from '../lib/types/branded';
import {
  derivePhase,
  isPartnerLifecycleStatus,
  parsePartnerLifecycleStatus,
  PARTNER_LIFECYCLE_STATUSES,
  validatePartnerProfile,
  type PartnerProfile,
} from '../lib/partner-profile/schema';
import { parsePartnerProfileToml } from '../lib/partner-profile/parse';
import { buildPartnerProfilesBake } from '../lib/partner-profile/bake';

const EXAMPLE_PATH = 'config/partner-profiles/.example.toml';

function baseProfile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meta: { templateId: asPartnerTemplateId('partner-active'), name: 'Test', version: '1.0.0', source: 'telegram' },
    identity: { code: 'YOU', callSign: 'YOU-001', status: 'onboarded' },
    lifecycle: { status: 'active', phase: 'operator_ready' },
    ...overrides,
  };
}

describe('validatePartnerProfile', () => {
  test('accepts a valid minimal profile', () => {
    const result = validatePartnerProfile(baseProfile());
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.profile.identity.code).toBe('YOU');
  });

  test('rejects a bad CODE', () => {
    const result = validatePartnerProfile(baseProfile({ identity: { code: 'you', callSign: 'YOU-001', status: 'x' } }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((i) => i.includes('identity.code'))).toBe(true);
  });

  test('rejects a callSign that does not derive from the code', () => {
    const result = validatePartnerProfile(
      baseProfile({ identity: { code: 'YOU', callSign: 'ASH-001', status: 'x' } })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((i) => i.includes('derive from code'))).toBe(true);
  });

  test('rejects an unknown lifecycle status', () => {
    const result = validatePartnerProfile(baseProfile({ lifecycle: { status: 'frozen', phase: 'paused' } }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((i) => i.includes('lifecycle.status'))).toBe(true);
  });

  test('rejects a plaintext password on a book account (vault-only invariant)', () => {
    const result = validatePartnerProfile(
      baseProfile({
        books: { youwager: { type: 'pph', account: { username: 'u', vaultKey: 'partner:YOU:youwager' }, password: 'hunter2' } },
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((i) => i.includes('vault-only'))).toBe(true);
  });

  test('rejects an unknown book type', () => {
    const result = validatePartnerProfile(baseProfile({ books: { youwager: { type: 'scrape' } } }));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((i) => i.includes('books.youwager.type'))).toBe(true);
  });
});

describe('PartnerLifecycleStatus runtime guards', () => {
  test('accepts all eight valid states', () => {
    for (const value of PARTNER_LIFECYCLE_STATUSES) {
      expect(isPartnerLifecycleStatus(value)).toBe(true);
      expect(parsePartnerLifecycleStatus(value)).toBe(value);
    }
  });

  test('rejects invalid strings', () => {
    for (const value of ['frozen', 'unknown', '', 'ACTIVE', 'graduated ']) {
      expect(isPartnerLifecycleStatus(value)).toBe(false);
      expect(() => parsePartnerLifecycleStatus(value)).toThrow(
        `Invalid PartnerLifecycleStatus: ${value}`,
      );
    }
  });

  test('rejects non-string values', () => {
    for (const value of [null, undefined, 42, {}, []]) {
      expect(isPartnerLifecycleStatus(value)).toBe(false);
      expect(() => parsePartnerLifecycleStatus(value)).toThrow('Invalid PartnerLifecycleStatus');
    }
  });
});

describe('derivePhase', () => {
  test('active + complete → operator_ready', () => {
    expect(derivePhase('active', { telegramLinked: true, hasBooks: true })).toBe('operator_ready');
  });
  test('active but incomplete → incomplete', () => {
    expect(derivePhase('active', { telegramLinked: false, hasBooks: true })).toBe('incomplete');
  });
  test('signup → onboarding', () => {
    expect(derivePhase('signup', { telegramLinked: false, hasBooks: false })).toBe('onboarding');
  });
  test('suspended → paused', () => {
    expect(derivePhase('suspended', { telegramLinked: true, hasBooks: true })).toBe('paused');
  });
});

describe('parsePartnerProfileToml', () => {
  test('parses + validates the committed example', async () => {
    const text = await Bun.file(EXAMPLE_PATH).text();
    const profile = parsePartnerProfileToml(text, 'YOU');
    expect(profile.identity.code).toBe('YOU');
    expect(profile.books?.youwager?.type).toBe('pph');
    expect(profile.books?.youwager?.account?.vaultKey).toBe('partner:YOU:youwager');
    expect(profile.rules?.sor?.maxSingleBet).toBe(500);
  });

  test('rejects a code mismatch (file name vs identity.code)', () => {
    const text = `[meta]\ntemplateId="t"\nname="x"\nversion="1.0.0"\nsource="telegram"\n[identity]\ncode="ASH"\ncallSign="ASH-001"\nstatus="x"\n[lifecycle]\nstatus="active"\nphase="operator_ready"\n`;
    expect(() => parsePartnerProfileToml(text, 'YOU')).toThrow(/does not match file code/);
  });
});

describe('bake', () => {
  test('buildPartnerProfilesBake summarizes lifecycle/phase', () => {
    const payload = buildPartnerProfilesBake({
      YOU: baseProfile(),
      ASH: baseProfile({ identity: { code: 'ASH', callSign: 'ASH-001', status: 'x' }, lifecycle: { status: 'signup', phase: 'onboarding' } }),
    }, 'fixed');
    expect(payload.summary.count).toBe(2);
    expect(payload.summary.byLifecycle.active).toBe(1);
    expect(payload.summary.byLifecycle.signup).toBe(1);
    expect(payload.summary.byPhase.operator_ready).toBe(1);
  });

  test('lifecycle enum covers the full v0 set', () => {
    expect(PARTNER_LIFECYCLE_STATUSES).toEqual([
      'signup', 'materialized', 'kyc_pending', 'active', 'cultivating', 'graduated', 'suspended', 'terminated',
    ]);
  });
});

// keep the type import referenced (test-d style)
void (null as unknown as PartnerProfile);
