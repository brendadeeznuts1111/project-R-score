import { describe, expect, test } from 'bun:test';
import {
  PARTNER_CONNECTOR_FRESHNESS_POLICY,
  evaluateConnectorFreshness,
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
});
