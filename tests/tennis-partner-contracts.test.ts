// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildPartnerContractsFromLive,
  buildPartnerContractsFromOfflineJoin,
  mergeFactoryDeskHints,
  TENNIS_PARTNER_CONTRACTS_KIND,
  TENNIS_PARTNER_CONTRACTS_PATH,
} from '../lib/tennis/partner-contracts.ts';

describe('tennis partner-contracts', () => {
  test('builds live capacity + finance without secrets', () => {
    const artifact = buildPartnerContractsFromLive({
      generatedAt: '2026-08-05T00:00:00.000Z',
      capacity: {
        ok: true,
        report: {
          verticals: [
            {
              executionVerticalKey: 'hardrock',
              outs: [
                {
                  outId: 'out-ASH-1',
                  partnerCode: 'ASH',
                  callSign: 'ASH-001',
                  status: 'active',
                  bookId: 'book-hard-rock-florida',
                  secretsConfigured: false,
                  perBetMaxCents: 50_000,
                },
              ],
            },
          ],
        },
      },
      finance: {
        ok: true,
        reports: [
          {
            partnerCode: 'ASH',
            callSign: 'ASH-001',
            phase: 'partner.phase.operator_ready',
            colorHex: '#c530ac',
            ledger: { rowCount: 0, balanceDeltaCents: 0 },
            capacity: { activeOuts: 1, totalPerBetMaxCents: 50_000 },
          },
        ],
      },
    });

    expect(artifact.kind).toBe(TENNIS_PARTNER_CONTRACTS_KIND);
    expect(artifact.path).toBe(TENNIS_PARTNER_CONTRACTS_PATH);
    expect(artifact.source).toBe('live');
    expect(artifact.partners).toHaveLength(1);
    expect(artifact.partners[0]?.partnerCode).toBe('ASH');
    expect(artifact.partners[0]?.phase).toBe('partner.phase.operator_ready');
    expect(artifact.partners[0]?.activeOuts).toBe(1);
    expect(artifact.partners[0]?.partnersHref).toContain('#partner/ASH');
    expect(artifact.partners[0]?.telegramAccountingHref).toContain('telegram/accounting');
    expect(JSON.stringify(artifact)).not.toMatch(/Bearer|password|PARTNER_API_TOKEN/i);
    expect(artifact.summary.operatorReady).toBe(1);
  });

  test('offline join uses partners-ops + handshake', () => {
    const artifact = buildPartnerContractsFromOfflineJoin({
      generatedAt: '2026-08-05T00:00:00.000Z',
      partnersOps: {
        partners: [
          {
            code: 'BIL',
            callSign: 'BIL-001',
            phase: 'operator_ready',
            outs: [{ id: 'out-BIL-1', status: 'ready', book: 'book-x' }],
            accounting: { fundStatus: 'ready', incompleteOuts: 0, ledger: [] },
          },
        ],
      },
      handshake: {
        partners: [{ partnerCode: 'BIL', handshakeOk: true }],
      },
    });
    expect(artifact.source).toBe('offline-join');
    expect(artifact.partners[0]?.partnerCode).toBe('BIL');
    expect(artifact.partners[0]?.handshakeOk).toBe(true);
    expect(artifact.partners[0]?.fundStatus).toBe('ready');
    expect(artifact.summary.handshakeOk).toBe(1);
  });

  test('mergeFactoryDeskHints enriches live rows', () => {
    const live = buildPartnerContractsFromLive({
      capacity: {
        report: {
          verticals: [
            {
              outs: [
                {
                  outId: 'out-ASH-1',
                  partnerCode: 'ASH',
                  callSign: 'ASH-001',
                  status: 'active',
                },
              ],
            },
          ],
        },
      },
      finance: { reports: [] },
    });
    const offline = buildPartnerContractsFromOfflineJoin({
      partnersOps: {
        partners: [
          {
            code: 'ASH',
            callSign: 'ASH-001',
            phase: 'operator_ready',
            outs: [],
            accounting: { fundStatus: 'ready', incompleteOuts: 1 },
          },
        ],
      },
      handshake: { partners: [{ partnerCode: 'ASH', handshakeOk: false }] },
    });
    const merged = mergeFactoryDeskHints(live, offline);
    expect(merged.partners[0]?.fundStatus).toBe('ready');
    expect(merged.partners[0]?.handshakeOk).toBe(false);
    expect(merged.partners[0]?.incompleteOuts).toBe(1);
  });

  test('portal tennis board loads partner-contracts bake', async () => {
    const [portal, controller] = await Promise.all([
      Bun.file('public/portal/tennis/index.html').text(),
      Bun.file('public/portal/components/tennis-desk.js').text(),
    ]);
    expect(portal).toContain('/registry/tennis/partner-contracts.json');
    expect(portal).toContain(
      '<script type="module" src="/portal/components/tennis-desk.js"></script>'
    );
    expect(controller).toContain('/registry/tennis/partner-contracts.json');
    expect(controller).toContain('loadPartnerContracts');
    expect(controller).toContain('Books as of');
    expect(controller).toContain('offline-join');
    expect(controller).toContain('tone-chip');
  });

  test('contract shape required by CODE chips / board table', () => {
    const artifact = buildPartnerContractsFromLive({
      generatedAt: '2026-08-05T00:00:00.000Z',
      capacity: {
        report: {
          verticals: [
            {
              executionVerticalKey: 'hardrock',
              outs: [
                {
                  outId: 'out-ASH-1',
                  partnerCode: 'ASH',
                  callSign: 'ASH-001',
                  status: 'active',
                  bookId: 'book-hard-rock-florida',
                  secretsConfigured: false,
                  perBetMaxCents: 50_000,
                },
              ],
            },
          ],
        },
      },
      finance: {
        reports: [
          {
            partnerCode: 'ASH',
            callSign: 'ASH-001',
            phase: 'partner.phase.operator_ready',
            capacity: { activeOuts: 1, totalPerBetMaxCents: 50_000 },
          },
        ],
      },
    });
    const row = artifact.partners[0]!;
    for (const key of [
      'partnerCode',
      'callSign',
      'activeOuts',
      'totalOuts',
      'partnersHref',
      'accountingHref',
      'telegramAccountingHref',
    ] as const) {
      expect(row[key] != null && String(row[key]).length > 0).toBe(true);
    }
    expect(row.partnersHref).toMatch(/#partner\/ASH$/);
    expect(row.telegramAccountingHref).toContain('telegram/accounting');
    expect(artifact.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

});