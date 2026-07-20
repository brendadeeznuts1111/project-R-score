/**
 * Ground BOUNDARY_POLICY against docs/WIRE_BOUNDARY.md and path helpers.
 */
import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import {
  BOUNDARY_POLICY,
  isBoundaryFilename,
  isBoundaryFunctionName,
  DECODE_CALLEE_NAMES,
} from '../config/eslint/plugin-harness/boundary.ts';

describe('wire boundary policy', () => {
  test('human SSOT doc exists', () => {
    expect(existsSync(BOUNDARY_POLICY.doc)).toBe(true);
  });

  test('doc path is the canonical wire boundary page', () => {
    expect(BOUNDARY_POLICY.doc).toBe('docs/WIRE_BOUNDARY.md');
  });

  test('path allowlist covers brand forge and r2 credentials', () => {
    expect(isBoundaryFilename('/repo/lib/types/branded/session.ts')).toBe(true);
    expect(isBoundaryFilename('/repo/lib/security/r2-credentials.ts')).toBe(true);
    expect(isBoundaryFilename('/repo/packages/foo/src/boundary/parse.ts')).toBe(true);
    expect(isBoundaryFilename('/repo/lib/r2/r2-storage-enhanced.ts')).toBe(false);
  });

  test('function name allowlist covers parse/decode/is owners', () => {
    expect(isBoundaryFunctionName('parseSessionId')).toBe(true);
    expect(isBoundaryFunctionName('decodeUnknownBody')).toBe(true);
    expect(isBoundaryFunctionName('isUserId')).toBe(true);
    expect(isBoundaryFunctionName('parseBrandId')).toBe(true);
    expect(isBoundaryFunctionName('uploadPackageDocs')).toBe(false);
    expect(isBoundaryFunctionName('handle')).toBe(false);
  });

  test('decode callees match documented ban list', () => {
    expect(DECODE_CALLEE_NAMES.has('decodeUnknownSync')).toBe(true);
    expect(DECODE_CALLEE_NAMES.has('decodeUnknown')).toBe(true);
    expect(BOUNDARY_POLICY.decodeCallees).toContain('decodeUnknownSync');
  });

  test('eslint rule ids are stable', () => {
    expect(BOUNDARY_POLICY.eslintRules.decode).toBe(
      'harness/no-decode-unknown-outside-boundary'
    );
    expect(BOUNDARY_POLICY.eslintRules.unknownParam).toBe(
      'harness/no-unknown-function-param'
    );
  });
});
