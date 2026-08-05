// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { buildPartnersAccountsPlane } from '../scripts/lib/partners-env-join.ts';

describe('partners-env-join', () => {
  test('joins partners-ops + handshake + vault-map into account rows', () => {
    const plane = buildPartnersAccountsPlane({
      generatedAt: '2026-08-05T00:00:00.000Z',
      vaultEntries: [
        {
          envKey: 'PARTNER_API_TOKEN',
          passRef: 'pass://factorywager/Partner API Token/password',
          inTemplate: false,
          runtimePresent: true,
        },
        {
          envKey: 'TELEGRAM_BOT_FACTORY',
          passRef: 'pass://factorywager/Telegram: Factory Bot/password',
          inTemplate: true,
          runtimePresent: false,
        },
      ],
      partnersOps: {
        partners: [
          {
            code: 'ash',
            callSign: 'ASH-001',
            phase: 'operator_ready',
            telegram: { chatId: '-1001' },
            tracking: {
              accounts: { total: 2, ready: 1, deferred: 1, blocked: 0 },
              communication: { chatLinked: true, ready: true },
            },
            outs: [
              {
                id: 'out-ASH-1',
                status: 'ready',
                credentials: { username: 'ash1.staging' },
                book: { slug: 'hard-rock-florida', name: 'Hard Rock Florida' },
              },
              {
                id: 'out-ASH-2',
                status: 'deferred',
                book: { slug: 'draftkings', name: 'DraftKings' },
              },
              {
                id: 'not-an-out',
                status: 'ready',
              },
            ],
          },
        ],
      },
      handshake: {
        partners: [{ partnerCode: 'ASH', handshakeOk: true, callSign: 'ASH-001' }],
      },
    });

    expect(plane.summary.partnerCount).toBe(1);
    expect(plane.summary.accountsTotal).toBe(2);
    expect(plane.summary.accountsReady).toBe(1);
    expect(plane.summary.outsTotal).toBe(2);
    expect(plane.summary.outsReady).toBe(1);
    expect(plane.summary.sharedEnvMissing).toBeGreaterThanOrEqual(1);

    const ash = plane.partners[0]!;
    expect(ash.partnerCode).toBe('ASH');
    expect(ash.handshakeOk).toBe(true);
    expect(ash.telegramChatLinked).toBe(true);
    expect(ash.accountHref).toContain('partner=ASH');
    expect(ash.outs).toHaveLength(2);
    expect(String(ash.outs[0]!.outId)).toBe('out-ASH-1');
    expect(ash.outs[0]!.usernameLabel).toBe('ash1.staging');

    const partnerApi = plane.sharedEnvBindings.find(b => b.envKey === 'PARTNER_API_TOKEN');
    expect(partnerApi?.inVaultMap).toBe(true);
    expect(partnerApi?.runtimePresent).toBe(true);
    expect(partnerApi?.role).toBe('partner-api');

    // no secret payloads (pass://…/password is a field path, not a value)
    expect(JSON.stringify(plane)).not.toMatch(/cfat_|pst_[A-Za-z0-9]/);
  });

  test('marks handshake/telegram gaps when sources missing', () => {
    const plane = buildPartnersAccountsPlane({
      vaultEntries: [],
      partnersOps: {
        partners: [
          {
            code: 'BIL',
            callSign: 'BIL-001',
            phase: 'designated',
            outs: [],
            tracking: { accounts: { total: 0, ready: 0 } },
          },
        ],
      },
      handshake: { partners: [] },
    });
    expect(plane.partners[0]!.handshakeOk).toBe(false);
    expect(plane.summary.partnersMissingHandshake).toBe(1);
    expect(plane.summary.partnersMissingTelegram).toBe(1);
  });
});
