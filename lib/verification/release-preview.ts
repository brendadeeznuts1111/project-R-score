/**
 * Release proof UI rows — omit install-platform duplicates from release card preview.
 *
 * Install-platform probes are embedded in release-features.json for verify-bun-release
 * but have their own dashboard panel; preview should not double-list them.
 */
import type { VerificationResult, VerificationSubsystem } from './types.ts';
import { VERIFICATION_SUBSYSTEMS } from './subsystem.ts';

export function releasePreviewRows(
  results: ReadonlyArray<Pick<VerificationResult, 'name'>> | undefined
): VerificationResult[] {
  return (results || []).filter(
    r => !String(r.name || '').startsWith('install platform:')
  ) as VerificationResult[];
}

/**
 * Diverse preview: up to `limitPer` rows per subsystem (stable pillar order),
 * then fill remaining slots from leftover rows. Caps total at `maxTotal`.
 */
export function releasePreviewRowsBySubsystem(
  results: ReadonlyArray<VerificationResult> | undefined,
  limitPer = 3,
  maxTotal = 12
): VerificationResult[] {
  const filtered = releasePreviewRows(results) as VerificationResult[];
  const bySub = new Map<string, VerificationResult[]>();
  for (const r of filtered) {
    const key = r.subsystem ?? 'other';
    const bucket = bySub.get(key) ?? [];
    bucket.push(r);
    bySub.set(key, bucket);
  }

  const out: VerificationResult[] = [];
  const used = new Set<string>();
  const order: string[] = [
    ...VERIFICATION_SUBSYSTEMS,
    ...[...bySub.keys()].filter(k => !VERIFICATION_SUBSYSTEMS.includes(k as VerificationSubsystem)),
  ];

  for (const sub of order) {
    const bucket = bySub.get(sub) ?? [];
    for (const r of bucket.slice(0, limitPer)) {
      if (out.length >= maxTotal) return out;
      out.push(r);
      used.add(r.name);
    }
  }

  for (const r of filtered) {
    if (out.length >= maxTotal) break;
    if (used.has(r.name)) continue;
    out.push(r);
    used.add(r.name);
  }
  return out;
}
