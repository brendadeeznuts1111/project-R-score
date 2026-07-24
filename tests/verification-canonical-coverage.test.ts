// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';
import {
  INSTALL_ASPECT_CANONICAL_KEYS,
  ensureVerificationResultsHaveCanonical,
  findCanonicalRefKey,
  reportCanonicalCoverageGaps,
  resolveCanonicalUrl,
  resolveInstallAspectCanonical,
} from '../lib/verification/canonical-coverage.ts';
import { INSTALL_PLATFORM_DOCS } from '../lib/docs/bun-install-platform-docs.ts';
import { INSTALL_LINKER_DOCS } from '../lib/docs/bun-install-linker-docs.ts';

describe('lib/verification/canonical-coverage', () => {
  test('INSTALL_ASPECT_CANONICAL_KEYS resolve to CANONICAL_REFS URLs', () => {
    expect(resolveInstallAspectCanonical('bun-binary-resolved').canonicalKey).toBe('Bun.which');
    expect(resolveInstallAspectCanonical('bun-binary-resolved').canonical).toBe(
      CANONICAL_REFS['Bun.which']
    );
    expect(resolveInstallAspectCanonical('runtime-flags').canonical).toBe(
      CANONICAL_REFS['bun install --cpu']
    );
    expect(resolveInstallAspectCanonical('runtime-flags').canonicalKey).toBe('bun install --cpu');
    expect(resolveInstallAspectCanonical('lockfile-stable').canonical).toBe(
      CANONICAL_REFS['platform-specific dependencies']
    );
    expect(resolveInstallAspectCanonical('machine-global-store').canonical).toBe(
      CANONICAL_REFS['global virtual store']
    );
  });

  test('install aspect keys align with doc SSOT URLs', () => {
    expect(resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS['bun-config-env-ssot'])).toContain(
      '#configuring-with-environment-variables'
    );
    expect(resolveInstallAspectCanonical('install-mechanism-notes-ssot').canonical).toContain(
      '#cache'
    );
    expect(resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS['runtime-flags'])).toBe(
      INSTALL_PLATFORM_DOCS.cpuAndOsFlags
    );
    expect(resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS['lockfile-stable'])).toBe(
      INSTALL_PLATFORM_DOCS.platformSpecificDependencies
    );
    expect(resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS['lockfile-config-version'])).toBe(
      INSTALL_LINKER_DOCS.isolatedInstalls
    );
    expect(resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS['machine-global-store'])).toBe(
      INSTALL_LINKER_DOCS.globalStore
    );
  });

  test('resolveInstallAspectCanonical attaches install-platform _links', () => {
    const row = resolveInstallAspectCanonical('profile-ssot');
    expect(row._links.report).toBe('/registry/install-platform.json');
    expect(row._links.source).toContain('verify-install-platform.ts');
    expect(row._links.docs).toBe(row.canonical);
  });

  test('ensureVerificationResultsHaveCanonical fails when canonical missing', () => {
    const report = ensureVerificationResultsHaveCanonical([
      { name: 'ok', canonical: CANONICAL_REFS['Bun.hash'] },
      { name: 'missing', canonical: undefined },
    ]);
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual(['missing']);
  });

  test('findCanonicalRefKey reverse-maps known URLs', () => {
    const key = findCanonicalRefKey(CANONICAL_REFS['bun install --cpu']!);
    expect(key).toBe('bun install --cpu');
  });

  test('reportCanonicalCoverageGaps returns false on missing refs', () => {
    const ok = reportCanonicalCoverageGaps(
      { ok: false, missing: ['x'], unknownUrls: [] },
      'test'
    );
    expect(ok).toBe(false);
  });
});
