// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildEdgeEnvStatus,
  buildEdgeEnvTable,
  isEnvStatusPayload,
} from '../lib/http/portal-env-edge.ts';

describe('lib/http/portal-env-edge', () => {
  test('buildEdgeEnvTable reflects ASSETS binding', () => {
    const withAssets = buildEdgeEnvTable({ hasAssets: true });
    const withoutAssets = buildEdgeEnvTable({ hasAssets: false });
    expect(withAssets.find(r => r.Key === 'ASSETS')?.Status).toBe('set');
    expect(withoutAssets.find(r => r.Key === 'ASSETS')?.Status).toBe('missing');
  });

  test('buildEdgeEnvStatus matches portal /api/env contract', () => {
    const body = buildEdgeEnvStatus({ hasAssets: true });
    expect(body.ok).toBe(true);
    expect(typeof body.checkedAt).toBe('string');
    expect(isEnvStatusPayload(body)).toBe(true);
    expect(Array.isArray(body.requiredMissingKeys)).toBe(true);
  });

  test('isEnvStatusPayload rejects incomplete payloads', () => {
    expect(isEnvStatusPayload(null)).toBe(false);
    expect(isEnvStatusPayload({ summary: {}, table: [] })).toBe(true);
    expect(isEnvStatusPayload({ summary: {} })).toBe(false);
  });
});
