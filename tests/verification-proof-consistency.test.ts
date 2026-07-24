// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  auditBySubsystemTotals,
  auditInstallPlatformEmbed,
  auditProofConsistency,
} from '../lib/verification/proof-consistency.ts';
import type { VerificationResult } from '../lib/verification/types.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('lib/verification/proof-consistency', () => {
  test('install-platform embed rows match canonical install-platform.json', async () => {
    const releasePath = joinPath(ROOT, 'public/registry/release-features.json');
    const platformPath = joinPath(ROOT, 'public/registry/install-platform.json');
    if (!(await Bun.file(releasePath).exists()) || !(await Bun.file(platformPath).exists())) {
      return;
    }
    const release = await Bun.file(releasePath).json();
    const installPlatform = await Bun.file(platformPath).json();
    const row = auditInstallPlatformEmbed(release, installPlatform);
    expect(row.ok).toBe(true);
  });

  test('release-features bySubsystem matches row counts', async () => {
    const path = joinPath(ROOT, 'public/registry/release-features.json');
    if (!(await Bun.file(path).exists())) return;
    const proof = await Bun.file(path).json();
    const row = auditBySubsystemTotals(proof, 'release-features');
    expect(row.ok).toBe(true);
  });

  test('auditProofConsistency passes on saved repo proofs', async () => {
    const releasePath = joinPath(ROOT, 'public/registry/release-features.json');
    if (!(await Bun.file(releasePath).exists())) return;
    const release = await Bun.file(releasePath).json();
    const installPlatform = (await Bun.file(
      joinPath(ROOT, 'public/registry/install-platform.json')
    ).json()) as { results?: VerificationResult[]; summary?: unknown };
    const installEnv = (await Bun.file(
      joinPath(ROOT, 'public/registry/install-env-proof.json')
    ).json()) as { results?: VerificationResult[]; summary?: unknown };
    const runtimeNits = (await Bun.file(
      joinPath(ROOT, 'public/registry/bun-runtime-nits-proof.json')
    ).json()) as { results?: VerificationResult[]; summary?: unknown };

    const rows = auditProofConsistency({
      release,
      installPlatform,
      installEnv,
      runtimeNits,
    });
    expect(rows.every(r => r.ok)).toBe(true);
  });

  test('detects pass mismatch on embed row', () => {
    const release = {
      results: [
        {
          name: 'install platform: bun-binary-resolved',
          passed: false,
          subsystem: 'package-manager',
        },
      ],
    };
    const platform = {
      results: [
        {
          name: 'install platform: bun-binary-resolved',
          passed: true,
          subsystem: 'package-manager',
        },
      ],
    };
    const row = auditInstallPlatformEmbed(release, platform);
    expect(row.ok).toBe(false);
    expect(row.notes.some(n => n.includes('pass'))).toBe(true);
  });
});
