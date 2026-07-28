/**
 * Unit tests for projectComplianceHealthArtifact freeze shape
 * (edge /api/health + serve-public artifacts.complianceBoard parity).
 * @see lib/monitoring/compliance-slice.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  COMPLIANCE_BOARD_PATH,
  COMPLIANCE_PORTAL_PATH,
  projectComplianceHealthArtifact,
} from '../lib/monitoring/compliance-slice.ts';

const emptyArtifact = {
  exists: false,
  ok: false,
  generated: null,
  enhancements: null,
  shadowMismatches: null,
  geoProfiles: null,
  hmac: false,
  path: COMPLIANCE_BOARD_PATH,
  portal: COMPLIANCE_PORTAL_PATH,
} as const;

describe('COMPLIANCE_* path constants', () => {
  test('board and portal paths are freeze-stable', () => {
    expect(COMPLIANCE_BOARD_PATH).toBe('/registry/compliance-board.json');
    expect(COMPLIANCE_PORTAL_PATH).toBe('/portal/compliance/');
  });
});

describe('projectComplianceHealthArtifact', () => {
  test('missing board → exists:false', () => {
    expect(projectComplianceHealthArtifact(null)).toEqual(emptyArtifact);
    expect(projectComplianceHealthArtifact(undefined)).toEqual(emptyArtifact);
    expect(projectComplianceHealthArtifact('not-an-object')).toEqual(emptyArtifact);
    expect(projectComplianceHealthArtifact(42)).toEqual(emptyArtifact);
  });

  test('schemaVersion !== 1 → exists:false', () => {
    expect(
      projectComplianceHealthArtifact({
        schemaVersion: 2,
        enhancements: { passed: 8, total: 8 },
        shadow: { summary: { mismatches: 0 } },
      })
    ).toEqual(emptyArtifact);

    expect(
      projectComplianceHealthArtifact({
        // no schemaVersion
        enhancements: { passed: 8, total: 8 },
        shadow: { summary: { mismatches: 0 } },
      })
    ).toEqual(emptyArtifact);

    expect(
      projectComplianceHealthArtifact({
        schemaVersion: 0,
        enhancements: { passed: 8, total: 8 },
      })
    ).toEqual(emptyArtifact);
  });

  test('pass board (8/8 enhancements, 0 mismatches) → exists:true, ok:true', () => {
    const art = projectComplianceHealthArtifact({
      schemaVersion: 1,
      generatedAt: '2026-07-24T05:00:00.000Z',
      enhancements: { passed: 8, total: 8 },
      shadow: { summary: { mismatches: 0, allow: 4, block: 4 } },
    });
    expect(art).toEqual({
      exists: true,
      ok: true,
      generated: '2026-07-24T05:00:00.000Z',
      enhancements: '8/8',
      shadowMismatches: 0,
      geoProfiles: null,
      hmac: false,
      path: COMPLIANCE_BOARD_PATH,
      portal: COMPLIANCE_PORTAL_PATH,
    });
    expect(art.path).toBe('/registry/compliance-board.json');
    expect(art.portal).toBe('/portal/compliance/');
  });

  test('enhancement fail → exists:true, ok:false', () => {
    const art = projectComplianceHealthArtifact({
      schemaVersion: 1,
      generatedAt: '2026-07-24T05:00:00.000Z',
      enhancements: { passed: 6, total: 8 },
      shadow: { summary: { mismatches: 0 } },
    });
    expect(art.exists).toBe(true);
    expect(art.ok).toBe(false);
    expect(art.enhancements).toBe('6/8');
    expect(art.shadowMismatches).toBe(0);
    expect(art.path).toBe(COMPLIANCE_BOARD_PATH);
    expect(art.portal).toBe(COMPLIANCE_PORTAL_PATH);
  });

  test('shadow mismatches → exists:true, ok:false', () => {
    const art = projectComplianceHealthArtifact({
      schemaVersion: 1,
      generatedAt: '2026-07-24T05:00:00.000Z',
      enhancements: { passed: 8, total: 8 },
      shadow: { summary: { mismatches: 2, allow: 3, block: 5 } },
    });
    expect(art.exists).toBe(true);
    expect(art.ok).toBe(false);
    expect(art.enhancements).toBe('8/8');
    expect(art.shadowMismatches).toBe(2);
    expect(art.path).toBe(COMPLIANCE_BOARD_PATH);
    expect(art.portal).toBe(COMPLIANCE_PORTAL_PATH);
  });

  test('empty object is not schema v1 → exists:false', () => {
    expect(projectComplianceHealthArtifact({})).toEqual(emptyArtifact);
  });
});
