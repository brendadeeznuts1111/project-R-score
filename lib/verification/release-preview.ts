/**
 * Release proof UI rows — omit install-platform duplicates from release card preview.
 *
 * Install-platform probes are embedded in release-features.json for verify-bun-release
 * but have their own dashboard panel; preview should not double-list them.
 */
import type { VerificationResult } from './types.ts';

export function releasePreviewRows(
  results: ReadonlyArray<Pick<VerificationResult, 'name'>> | undefined
): VerificationResult[] {
  return (results || []).filter(
    r => !String(r.name || '').startsWith('install platform:')
  ) as VerificationResult[];
}
