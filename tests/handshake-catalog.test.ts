import { describe, expect, test } from 'bun:test';
import {
  buildHandshakeCatalog,
  HANDSHAKE_JSONL_ACTIONS,
  HANDSHAKE_LANE_CATALOG,
  HANDSHAKE_READINESS_PHASES,
  HANDSHAKE_VERIFY_CHECK_IDS,
} from '../lib/telegram/handshake-catalog.ts';

describe('handshake-catalog', () => {
  test('builds v1 catalog with expected sections', () => {
    const c = buildHandshakeCatalog();
    expect(c.schema).toBe('factorywager.telegram-handshake-catalog.v1');
    expect(c.jsonlActions).toEqual([...HANDSHAKE_JSONL_ACTIONS]);
    expect(c.readinessPhases).toEqual([...HANDSHAKE_READINESS_PHASES]);
    expect(c.lanes.length).toBe(HANDSHAKE_LANE_CATALOG.length);
    expect(c.verifyChecks).toEqual([...HANDSHAKE_VERIFY_CHECK_IDS]);
    expect(c.docs.runbook).toContain('partner-package-group-handshake.md');
  });

  test('lane ids are unique', () => {
    const ids = HANDSHAKE_LANE_CATALOG.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
