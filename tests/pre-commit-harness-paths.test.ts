import { describe, expect, test } from 'bun:test';
import {
  isAuditSsotPath as isAuditSsotPathFromEntrypoint,
  isDoctorBunfigPath as isDoctorBunfigPathFromEntrypoint,
  isGlossaryVerifyPath as isGlossaryVerifyPathFromEntrypoint,
} from '../scripts/pre-commit-harness.ts';
import {
  isAuditSsotPath,
  isDoctorBunfigPath,
  isGlossaryVerifyPath,
} from '../scripts/precommit/staged-paths.ts';

describe('pre-commit harness path classifiers', () => {
  test('keeps the entrypoint compatibility exports aligned with focused classifiers', () => {
    const auditPath = 'tools/audit-findings/example.json';
    const bunfigPath = 'config/machine.bunfig.toml.template';
    const glossaryPath = 'public/portal/account/index.html';

    expect(isAuditSsotPathFromEntrypoint(auditPath)).toBe(isAuditSsotPath(auditPath));
    expect(isDoctorBunfigPathFromEntrypoint(bunfigPath)).toBe(isDoctorBunfigPath(bunfigPath));
    expect(isGlossaryVerifyPathFromEntrypoint(glossaryPath)).toBe(
      isGlossaryVerifyPath(glossaryPath)
    );
  });

  test('normalizes leading relative prefixes at the classifier boundary', () => {
    expect(isAuditSsotPath('./tools/audit-catalog.ts')).toBe(true);
    expect(isDoctorBunfigPath('./bunfig.toml')).toBe(true);
    expect(isGlossaryVerifyPath('./public/portal/partners/index.html')).toBe(true);
  });
});
