import { describe, expect, test } from 'bun:test';
import {
  evaluateAuditPolicy,
  parseAuditExceptions,
  parseAuditReport,
  type AuditAdvisory,
  type AuditException,
} from '../scripts/security-audit';

const advisory: AuditAdvisory = {
  package: 'example',
  advisory: 'GHSA-aaaa-bbbb-cccc',
  title: 'Example advisory',
  severity: 'high',
};

const exception: AuditException = {
  package: 'example',
  advisory: 'GHSA-aaaa-bbbb-cccc',
  owner: 'runtime-tooling',
  expires: '2026-08-28',
  scope: 'Test scope',
  rationale: 'Test rationale',
};

describe('security audit policy', () => {
  test('accepts an exact, unexpired exception', () => {
    const result = evaluateAuditPolicy([advisory], [exception], new Date('2026-07-28T00:00:00Z'));
    expect(result).toEqual({ accepted: [advisory], unknown: [], expired: [], stale: [] });
  });

  test('fails unknown, expired, and stale exceptions', () => {
    const expired = { ...exception, expires: '2026-07-01' };
    const result = evaluateAuditPolicy(
      [{ ...advisory, advisory: 'GHSA-dddd-eeee-ffff' }],
      [expired],
      new Date('2026-07-28T00:00:00Z')
    );
    expect(result.accepted).toEqual([]);
    expect(result.unknown).toHaveLength(1);
    expect(result.expired).toEqual([expired]);
    expect(result.stale).toEqual([expired]);
  });

  test('rejects malformed exception and audit wire data', () => {
    expect(() => parseAuditExceptions({})).toThrow('schemaVersion 1');
    expect(() => parseAuditReport({ example: [{}] })).toThrow('url must be a non-empty string');
  });
});
