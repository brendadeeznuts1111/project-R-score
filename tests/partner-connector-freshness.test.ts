import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_FRESHNESS_POLICY,
  connectorSnapshotRefFromPayload,
  evaluateConnectorFreshness,
  extractConnectorObservedAt,
  resolveConnectorSnapshotMap,
  resolvePartnerDashboardBakeAsOf,
} from '../packages/partners/src/index.ts';

const AS_OF = '2026-08-06T12:00:00.000Z';
const INPUT_REF = '/registry/tennis/partner-contracts.json';

function observation(observedAt: string) {
  return { observedAt, inputRef: INPUT_REF, snapshotRef: 'sha256:fixture' };
}

describe('partner connector freshness', () => {
  test('derives fresh and stale status from current observation age', () => {
    const fresh = evaluateConnectorFreshness({
      asOf: AS_OF,
      expectedInputRef: INPUT_REF,
      required: false,
      current: observation('2026-08-06T11:55:00.000Z'),
    });
    expect(fresh).toMatchObject({
      disposition: 'use_current',
      snapshot: {
        dataStatus: 'ok',
        sourceMode: 'current',
        reasonCode: 'current_fresh',
        ageSeconds: 300,
      },
    });

    const stale = evaluateConnectorFreshness({
      asOf: AS_OF,
      expectedInputRef: INPUT_REF,
      required: false,
      current: observation('2026-08-06T11:54:59.000Z'),
    });
    expect(stale).toMatchObject({
      disposition: 'use_current',
      snapshot: {
        dataStatus: 'stale',
        sourceMode: 'current',
        reasonCode: 'current_stale',
        ageSeconds: 301,
      },
    });
  });

  test('labels last-known-good and enforces required versus optional age limits', () => {
    const requiredLkg = evaluateConnectorFreshness({
      asOf: AS_OF,
      expectedInputRef: INPUT_REF,
      required: true,
      lastKnownGood: observation('2026-08-06T11:55:01.000Z'),
    });
    expect(requiredLkg).toMatchObject({
      disposition: 'use_last_known_good',
      snapshot: {
        dataStatus: 'stale',
        sourceMode: 'last_known_good',
        reasonCode: 'last_known_good',
        ageSeconds: 299,
      },
    });

    expect(
      evaluateConnectorFreshness({
        asOf: AS_OF,
        expectedInputRef: INPUT_REF,
        required: true,
        lastKnownGood: observation('2026-08-06T11:54:59.000Z'),
      })
    ).toEqual({ disposition: 'fail_bake', reasonCode: 'required_source_expired' });

    const optionalExpired = evaluateConnectorFreshness({
      asOf: AS_OF,
      expectedInputRef: INPUT_REF,
      required: false,
      lastKnownGood: observation('2026-08-05T11:59:59.000Z'),
    });
    expect(optionalExpired).toEqual({
      disposition: 'mark_unavailable',
      snapshot: {
        dataStatus: 'unavailable',
        sourceMode: 'none',
        reasonCode: 'optional_source_unavailable',
        inputRef: INPUT_REF,
      },
    });

    expect(() =>
      evaluateConnectorFreshness({
        asOf: AS_OF,
        expectedInputRef: INPUT_REF,
        required: false,
        lastKnownGood: {
          observedAt: '2026-08-06T11:59:00.000Z',
          inputRef: INPUT_REF,
        },
      })
    ).toThrow('lastKnownGood.snapshotRef is required');
  });

  test('fails a missing required source and marks a missing optional source unavailable', () => {
    expect(
      evaluateConnectorFreshness({
        asOf: AS_OF,
        expectedInputRef: INPUT_REF,
        required: true,
      })
    ).toEqual({ disposition: 'fail_bake', reasonCode: 'required_source_unavailable' });
    expect(
      evaluateConnectorFreshness({
        asOf: AS_OF,
        expectedInputRef: INPUT_REF,
        required: false,
      })
    ).toMatchObject({ disposition: 'mark_unavailable', snapshot: { sourceMode: 'none' } });
  });

  test('pins the input ref and rejects observations beyond future clock skew', () => {
    expect(() =>
      evaluateConnectorFreshness({
        asOf: AS_OF,
        expectedInputRef: INPUT_REF,
        required: false,
        current: { observedAt: AS_OF, inputRef: '/registry/wrong.json' },
      })
    ).toThrow('inputRef must match');
    expect(() =>
      evaluateConnectorFreshness({
        asOf: AS_OF,
        expectedInputRef: INPUT_REF,
        required: false,
        current: observation('2026-08-06T12:00:31.000Z'),
      })
    ).toThrow('future clock skew');

    const tolerated = evaluateConnectorFreshness({
      asOf: AS_OF,
      expectedInputRef: INPUT_REF,
      required: false,
      current: observation('2026-08-06T12:00:30.000Z'),
    });
    expect(tolerated).toMatchObject({ snapshot: { ageSeconds: 0, dataStatus: 'ok' } });
    expect(PARTNER_CONNECTOR_FRESHNESS_POLICY.maxFutureSkewSeconds).toBe(30);
  });

  test('extracts observation clock and content-addressed snapshot refs', () => {
    expect(
      extractConnectorObservedAt({ generatedAt: '2026-08-06T12:00:00.000Z', rows: [] })
    ).toBe('2026-08-06T12:00:00.000Z');
    expect(extractConnectorObservedAt({ observedAt: '2026-08-06T11:00:00.000Z' })).toBe(
      '2026-08-06T11:00:00.000Z'
    );
    expect(() => extractConnectorObservedAt({ schema: 'x' })).toThrow('generatedAt or observedAt');
    const ref = connectorSnapshotRefFromPayload('{"a":1}');
    expect(ref.startsWith('sha256:')).toBe(true);
    expect(ref.length).toBe('sha256:'.length + 64);
    expect(connectorSnapshotRefFromPayload('{"a":1}')).toBe(ref);
  });

  test('resolveConnectorSnapshotMap fails required and labels optional LKG', () => {
    expect(() =>
      resolveConnectorSnapshotMap(AS_OF, {
        profiles: {
          expectedInputRef: 'config/partner-profiles/*.toml',
          required: true,
        },
      })
    ).toThrow(/fail_bake/);

    const map = resolveConnectorSnapshotMap(AS_OF, {
      profiles: {
        expectedInputRef: 'config/partner-profiles/*.toml',
        required: true,
        current: {
          observedAt: '2026-08-06T11:59:00.000Z',
          inputRef: 'config/partner-profiles/*.toml',
        },
      },
      telegram: {
        expectedInputRef: '/registry/telegram-handshake.json',
        required: false,
        lastKnownGood: {
          observedAt: '2026-08-06T11:50:00.000Z',
          inputRef: '/registry/telegram-handshake.json',
          snapshotRef: 'sha256:fixture',
        },
      },
    });
    expect(map.profiles.dataStatus).toBe('ok');
    expect(map.telegram).toMatchObject({
      dataStatus: 'stale',
      sourceMode: 'last_known_good',
      reasonCode: 'last_known_good',
    });
  });

  test('resolvePartnerDashboardBakeAsOf picks max-input or wall clock', () => {
    expect(
      resolvePartnerDashboardBakeAsOf('max-input', [
        '2026-08-05T00:00:00.000Z',
        '2026-08-06T12:00:00.000Z',
        '2026-08-04T00:00:00.000Z',
      ])
    ).toBe('2026-08-06T12:00:00.000Z');
    expect(
      resolvePartnerDashboardBakeAsOf('now', [], '2026-08-08T00:00:00.000Z')
    ).toBe('2026-08-08T00:00:00.000Z');
    expect(resolvePartnerDashboardBakeAsOf('2026-08-01T00:00:00.000Z', [])).toBe(
      '2026-08-01T00:00:00.000Z'
    );
  });
});
