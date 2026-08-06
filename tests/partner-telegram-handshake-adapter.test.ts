import { describe, expect, test } from 'bun:test';
import { parseTelegramHandshakeArtifact } from '../packages/partners/src/index.ts';

const NOW = '2026-08-06T18:00:00.000Z';
function artifact(): any {
  return {
    schema: 'factorywager.telegram-handshake.v1',
    generatedAt: NOW,
    rows: [
      {
        partnerCode: 'ASH',
        callSign: 'ASH-001',
        phase: 'operator_ready',
        handshakeOk: true,
        dmSeatStatus: 'linked (shared DM)',
        gapCount: 0,
        topGap: null,
        nextSteps: ['ready for welcome DM + bot commands'],
        inviteLink: 'https://t.me/secret-invite',
        membershipCell: '2·OK',
      },
    ],
  };
}

describe('Telegram partner handshake adapter', () => {
  test('projects readiness while dropping invite and presentation-only fields', () => {
    const [row] = parseTelegramHandshakeArtifact(artifact());
    expect(row).toMatchObject({
      partnerCode: 'ASH',
      phase: 'operator_ready',
      handshakeOk: true,
      dmLinkage: 'linked',
      membershipDetailExposed: false,
      configuredTopicsExposed: false,
    });
    expect(row).not.toHaveProperty('inviteLink');
    expect(row).not.toHaveProperty('membershipCell');
  });

  test('rejects duplicate partners and unknown phase values', () => {
    const duplicate = artifact();
    duplicate.rows.push(structuredClone(duplicate.rows[0]));
    expect(() => parseTelegramHandshakeArtifact(duplicate)).toThrow('duplicate PartnerCode');
    const phase = artifact();
    phase.rows[0].phase = 'ready-ish';
    expect(() => parseTelegramHandshakeArtifact(phase)).toThrow('supported handshake phase');
  });
});
