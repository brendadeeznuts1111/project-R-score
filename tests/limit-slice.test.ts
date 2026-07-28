// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  loadLimitRaisesMonitoringSlice,
  projectLimitRaisesHealthArtifact,
  LIMIT_RAISES_BOARD_PATH,
  LIMIT_RAISES_PORTAL_PATH,
} from '../lib/monitoring/limit-slice.ts';

describe('limit-raises slice', () => {
  test('projectLimitRaisesHealthArtifact missing → exists:false', () => {
    const art = projectLimitRaisesHealthArtifact(null);
    expect(art.exists).toBe(false);
    expect(art.ok).toBe(false);
    expect(art.path).toBe(LIMIT_RAISES_BOARD_PATH);
    expect(art.portal).toBe(LIMIT_RAISES_PORTAL_PATH);
  });

  test('projectLimitRaisesHealthArtifact rejects non-v1 schema', () => {
    const art = projectLimitRaisesHealthArtifact({ schemaVersion: 2, byNode: {} });
    expect(art.exists).toBe(false);
  });

  test('projectLimitRaisesHealthArtifact counts byNode raises', () => {
    const art = projectLimitRaisesHealthArtifact({
      schemaVersion: 1,
      generatedAt: '2026-07-28T00:00:00.000Z',
      lookbackHours: 48,
      byNode: {
        'partner-a': {
          raises: [{ new_limit: 1500 }, { new_limit: 2000 }],
        },
        'partner-b': { raises: [{ new_limit: 900 }] },
      },
    });
    expect(art.exists).toBe(true);
    expect(art.ok).toBe(true);
    expect(art.partners).toBe(2);
    expect(art.raises).toBe(3);
    expect(art.lookbackHours).toBe(48);
    expect(art.generated).toBe('2026-07-28T00:00:00.000Z');
  });

  test('projectLimitRaisesHealthArtifact prefers top-level partners/raises counts', () => {
    const art = projectLimitRaisesHealthArtifact({
      schemaVersion: 1,
      partners: 9,
      raises: 11,
      byNode: { x: { raises: [] } },
    });
    expect(art.partners).toBe(9);
    expect(art.raises).toBe(11);
  });

  test('loadLimitRaisesMonitoringSlice reads baked artifact when present', async () => {
    const slice = await loadLimitRaisesMonitoringSlice();
    if (!slice) {
      // optional plane when bake absent in checkout
      expect(slice).toBeNull();
      return;
    }
    expect(slice.available).toBe(true);
    expect(slice.path).toBe(LIMIT_RAISES_BOARD_PATH);
    expect(slice.portal).toBe(LIMIT_RAISES_PORTAL_PATH);
    expect(typeof slice.ok).toBe('boolean');
  });
});
