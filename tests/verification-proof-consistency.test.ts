// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  auditBySubsystemTotals,
  auditChannelMetaBake,
  auditChannelMetaPillarEmbed,
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

  test('channel-meta bake mirrors release-features rollup', async () => {
    const releasePath = joinPath(ROOT, 'public/registry/release-features.json');
    const bakePath = joinPath(ROOT, 'public/registry/channel-meta-bake.json');
    if (!(await Bun.file(releasePath).exists()) || !(await Bun.file(bakePath).exists())) {
      return;
    }
    const release = await Bun.file(releasePath).json();
    const bake = await Bun.file(bakePath).json();
    const row = auditChannelMetaBake(release, bake);
    expect(row.ok).toBe(true);
  });

  test('channel-meta pillar embeds match nits/bundler/networking proofs', async () => {
    const releasePath = joinPath(ROOT, 'public/registry/release-features.json');
    if (!(await Bun.file(releasePath).exists())) return;
    const release = await Bun.file(releasePath).json();
    const nits = await Bun.file(
      joinPath(ROOT, 'public/registry/bun-runtime-nits-proof.json')
    ).json();
    const bundler = await Bun.file(
      joinPath(ROOT, 'public/registry/bundler-loaders-proof.json')
    ).json();
    const networking = await Bun.file(
      joinPath(ROOT, 'public/registry/networking-channel-proof.json')
    ).json();
    expect(auditChannelMetaPillarEmbed(release, nits, 'runtime-nits:', 'nits').ok).toBe(true);
    expect(auditChannelMetaPillarEmbed(release, bundler, 'bundler:', 'bundler').ok).toBe(true);
    expect(
      auditChannelMetaPillarEmbed(release, networking, 'networking:', 'networking').ok
    ).toBe(true);
  });

  test('auditProofConsistency passes on saved repo proofs (incl. meta bake)', async () => {
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
    const bundlerLoaders = (await Bun.file(
      joinPath(ROOT, 'public/registry/bundler-loaders-proof.json')
    ).json()) as { results?: VerificationResult[]; summary?: unknown };
    const networkingChannel = (await Bun.file(
      joinPath(ROOT, 'public/registry/networking-channel-proof.json')
    ).json()) as { results?: VerificationResult[]; summary?: unknown };
    const bakeFile = Bun.file(joinPath(ROOT, 'public/registry/channel-meta-bake.json'));
    const channelMetaBake = (await bakeFile.exists()) ? await bakeFile.json() : null;

    const rows = auditProofConsistency({
      release,
      installPlatform,
      installEnv,
      runtimeNits,
      bundlerLoaders,
      networkingChannel,
      channelMetaBake,
    });
    if (!rows.every(r => r.ok)) {
      console.error(rows.filter(r => !r.ok));
    }
    expect(rows.every(r => r.ok)).toBe(true);
    expect(rows.some(r => r.id === 'channel-meta-bake')).toBe(true);
  });

  test('detects stale bake proofHash', () => {
    const row = auditChannelMetaBake(
      {
        proofHash: 'aaa',
        summary: { passed: 1, total: 1, status: 'pass', bySubsystem: {} },
      },
      {
        type: 'ChannelMetaBake',
        proofHash: 'bbb',
        passed: 1,
        total: 1,
        status: 'pass',
        bySubsystem: {},
      }
    );
    expect(row.ok).toBe(false);
    expect(row.notes.some(n => n.includes('stale'))).toBe(true);
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
