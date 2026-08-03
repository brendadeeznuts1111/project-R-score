// migrate-seat-partners-to-profiles.test.ts — unified-profile seed from the
// seat-capital-desk bake (ready-outs only, slug bookKeys, no chatIds).

import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  migrateSeatPartnersToProfiles,
  profileFromSeatRow,
  slugifyBookKey,
} from '../tools/migrate-seat-partners-to-profiles';
import { parsePartnerProfileToml } from '../lib/partner-profile/parse';
import { createTestWorkspace } from './harness.ts';

describe('slugifyBookKey', () => {
  test('stable BOOK_KEY_RE-safe slugs', () => {
    expect(slugifyBookKey('Hard Rock Florida')).toBe('hard-rock-florida');
    expect(slugifyBookKey('parlay21.com')).toBe('parlay21-com');
    expect(slugifyBookKey('Orange777')).toBe('orange777');
  });

  test('unslugifiable names throw', () => {
    expect(() => slugifyBookKey('!!!')).toThrow(/cannot derive bookKey/);
  });
});

describe('profileFromSeatRow', () => {
  test('ready out → book with account/funding/limits', () => {
    const { code, callSign, profile, skipped } = profileFromSeatRow({
      partnerCode: 'SPEN',
      callSign: 'SPEN-001',
      fundStatus: 'ready',
      outs: [
        {
          book: 'parlay21.com',
          username: 'vc2013',
          depositMethod: 'Venmo',
          sendTo: '@spen.newpartner',
          maxBet: '500',
          freeplayPct: '25%',
          status: 'ready',
        },
      ],
    });
    expect({ code, callSign }).toEqual({ code: 'SPEN', callSign: 'SPEN-001' });
    expect(skipped).toEqual([]);
    expect(profile.lifecycle).toEqual({ status: 'active', phase: 'operator_ready' });
    expect(profile.accounting).toEqual({ fundStatus: 'ready' });
    const book = (profile.books as Record<string, unknown>)['parlay21-com'] as Record<
      string,
      unknown
    >;
    expect(book.type).toBe('pph');
    expect(book.status).toBe('ready');
    expect(book.account).toEqual({
      username: 'vc2013',
      vaultKey: 'partner:SPEN:parlay21-com',
    });
    expect(book.funding).toEqual({
      method: 'deposit.method.venmo',
      rail: 'Venmo',
      target: '@spen.newpartner',
    });
    expect(book.limits).toEqual({ maxBet: 500, freeRollPct: 25 });
  });

  test('deferred / placeholder outs skipped and reported', () => {
    const { profile, skipped } = profileFromSeatRow({
      partnerCode: 'NOV',
      callSign: 'NOV-001',
      outs: [
        { book: 'SouthFL PPH Desk', username: '—', status: 'deferred' },
        { book: 'Hard Rock Florida', username: 'nov1.staging', status: 'ready' },
      ],
    });
    expect(skipped).toEqual(['SouthFL PPH Desk (deferred)']);
    expect(Object.keys(profile.books as Record<string, unknown>)).toEqual(['hard-rock-florida']);
  });

  test('no ready outs → identity-only profile, phase incomplete', () => {
    const { profile, skipped } = profileFromSeatRow({
      partnerCode: 'ZZZ',
      callSign: 'ZZZ-001',
      outs: [{ book: 'TBD', username: '—', status: 'deferred' }],
    });
    expect(skipped.length).toBe(1);
    expect(profile.books).toBeUndefined();
    expect(profile.lifecycle).toEqual({ status: 'active', phase: 'incomplete' });
  });
});

describe('migrateSeatPartnersToProfiles', () => {
  test('dry-run writes nothing; real run writes valid profiles', async () => {
    await using workspace = await createTestWorkspace('migrate-seat-');
    const seatDir = resolve(workspace.root, 'public/registry');
    await Bun.write(
      resolve(seatDir, 'seat-capital-desk.json'),
      JSON.stringify({
        rows: [
          {
            partnerCode: 'ASH',
            callSign: 'ASH-001',
            fundStatus: 'ready',
            outs: [
              { book: 'Hard Rock Florida', username: 'ash1.staging', status: 'ready' },
              { book: 'Hard Rock Florida', username: '—', status: 'deferred' },
            ],
          },
        ],
      })
    );

    const dry = await migrateSeatPartnersToProfiles(workspace.root, true);
    expect(dry.written).toEqual([]);
    expect(await Bun.file(resolve(workspace.root, 'config/partner-profiles/ASH.toml')).exists()).toBe(
      false
    );

    const real = await migrateSeatPartnersToProfiles(workspace.root, false);
    expect(real.written).toEqual(['ASH.toml']);
    expect(real.skipped).toEqual({ ASH: ['Hard Rock Florida (deferred)'] });

    const text = await Bun.file(
      resolve(workspace.root, 'config/partner-profiles/ASH.toml')
    ).text();
    const profile = parsePartnerProfileToml(text, 'ASH'); // throws on invalid
    expect(profile.identity.code).toBe('ASH');
    expect(Object.keys(profile.books ?? {})).toEqual(['hard-rock-florida']);
  });

  test('merges into an existing profile (idempotent upsert)', async () => {
    await using workspace = await createTestWorkspace('migrate-seat-');
    const seatDir = resolve(workspace.root, 'public/registry');
    await Bun.write(
      resolve(seatDir, 'seat-capital-desk.json'),
      JSON.stringify({
        rows: [
          {
            partnerCode: 'ASH',
            callSign: 'ASH-001',
            outs: [{ book: 'Hard Rock Florida', username: 'ash1.staging', status: 'ready' }],
          },
        ],
      })
    );
    await Bun.write(
      resolve(workspace.root, 'config/partner-profiles/ASH.toml'),
      `[identity]\ncode = "ASH"\ncallSign = "ASH-001"\n`
    );
    await migrateSeatPartnersToProfiles(workspace.root, false);
    const text = await Bun.file(
      resolve(workspace.root, 'config/partner-profiles/ASH.toml')
    ).text();
    const profile = parsePartnerProfileToml(text, 'ASH');
    expect(Object.keys(profile.books ?? {})).toEqual(['hard-rock-florida']);
  });
});

void 0;
