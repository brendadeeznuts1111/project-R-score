// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import {
  auditBySubsystemTotals,
  auditChannelMetaBake,
  auditChannelMetaPillarEmbed,
  auditDocsCoverageReferenceParity,
  auditDocsCoverageDocIndexParity,
  auditInstallPlatformEmbed,
  auditProofConsistency,
  auditRegistryClientInstallEnvParity,
  auditCloudflareTokenScopeSsot,
  auditWellKnownMcpCatalogParity,
  auditCloudflarePreflightAggregate,
  auditCloudflarePreflightTokenScope,
  auditTaxonomyContractRegistry,
} from '../lib/verification/proof-consistency.ts';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';
import { CLOUDFLARE_TOKEN_PERMISSIONS } from '../config/r2-env.ts';
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

  test('registry-client bySubsystem matches row counts', async () => {
    const path = joinPath(ROOT, 'public/registry/registry-client-proof.json');
    if (!(await Bun.file(path).exists())) return;
    const proof = await Bun.file(path).json();
    const row = auditBySubsystemTotals(proof, 'registry-client');
    expect(row.ok).toBe(true);
  });

  test('docs-coverage reference counts match committed feeds reference section', async () => {
    const dcPath = joinPath(ROOT, 'public/registry/docs-coverage-proof.json');
    const feedsPath = joinPath(ROOT, 'tools/bun-docs-feeds.json');
    const legacyPath = joinPath(ROOT, 'tools/reference-index.json');
    if (!(await Bun.file(dcPath).exists())) return;

    let referenceIndex: { count?: number; moduleCount?: number } | null = null;
    if (await Bun.file(feedsPath).exists()) {
      const feeds = (await Bun.file(feedsPath).json()) as { reference?: { count?: number; moduleCount?: number } };
      referenceIndex = feeds.reference ?? null;
    } else if (await Bun.file(legacyPath).exists()) {
      referenceIndex = await Bun.file(legacyPath).json();
    }
    if (!referenceIndex) return;

    const docsCoverage = await Bun.file(dcPath).json();
    const row = auditDocsCoverageReferenceParity(docsCoverage, referenceIndex);
    expect(row.ok).toBe(true);
  });

  test('registry-client and install-env registry rows align when both pass', async () => {
    const rcPath = joinPath(ROOT, 'public/registry/registry-client-proof.json');
    const iePath = joinPath(ROOT, 'public/registry/install-env-proof.json');
    if (!(await Bun.file(rcPath).exists()) || !(await Bun.file(iePath).exists())) return;
    const registryClient = await Bun.file(rcPath).json();
    const installEnv = await Bun.file(iePath).json();
    const row = auditRegistryClientInstallEnvParity(registryClient, installEnv);
    expect(row.ok).toBe(true);
  });

  test('taxonomy contract registry count matches SSOT', () => {
    const row = auditTaxonomyContractRegistry(
      PROOF_TAXONOMY_CONTRACT_COUNT,
      PROOF_TAXONOMY_CONTRACT_COUNT
    );
    expect(row.ok).toBe(true);
  });

  test('cloudflare preflight aggregate ok matches all steps', async () => {
    const path = joinPath(ROOT, 'public/registry/cloudflare-pages-preflight.json');
    if (!(await Bun.file(path).exists())) return;
    const preflight = await Bun.file(path).json();
    const row = auditCloudflarePreflightAggregate(preflight);
    expect(row.ok).toBe(true);
  });

  test('cloudflare preflight token-static aligns with token scope proof', async () => {
    const preflightPath = joinPath(ROOT, 'public/registry/cloudflare-pages-preflight.json');
    const scopePath = joinPath(ROOT, 'public/registry/cloudflare-token-scope-proof.json');
    if (!(await Bun.file(preflightPath).exists()) || !(await Bun.file(scopePath).exists())) {
      return;
    }
    const preflight = await Bun.file(preflightPath).json();
    const tokenScope = await Bun.file(scopePath).json();
    const row = auditCloudflarePreflightTokenScope(preflight, tokenScope);
    expect(row.ok).toBe(true);
  });

  test('docs-coverage and doc-index defaults coverage align', async () => {
    const dcPath = joinPath(ROOT, 'public/registry/docs-coverage-proof.json');
    const diPath = joinPath(ROOT, 'public/registry/doc-index.json');
    if (!(await Bun.file(dcPath).exists()) || !(await Bun.file(diPath).exists())) return;
    const docsCoverage = await Bun.file(dcPath).json();
    const docIndex = await Bun.file(diPath).json();
    const row = auditDocsCoverageDocIndexParity(docsCoverage, docIndex);
    expect(row.ok).toBe(true);
  });

  test('cloudflare token scope proof pins match SSOT', async () => {
    const path = joinPath(ROOT, 'public/registry/cloudflare-token-scope-proof.json');
    if (!(await Bun.file(path).exists())) return;
    const proof = await Bun.file(path).json();
    const row = auditCloudflareTokenScopeSsot(proof, {
      accountId: CLOUDFLARE_TOKEN_PERMISSIONS.accountId,
      pagesProject: CLOUDFLARE_TOKEN_PERMISSIONS.pagesProject,
      zoneName: CLOUDFLARE_TOKEN_PERMISSIONS.zoneName,
    });
    expect(row.ok).toBe(true);
  });

  test('well-known mcp catalog parity matches token scope proof', async () => {
    const proofPath = joinPath(ROOT, 'public/registry/cloudflare-token-scope-proof.json');
    const wellKnownPath = joinPath(ROOT, 'public/.well-known/mcp.json');
    if (!(await Bun.file(proofPath).exists()) || !(await Bun.file(wellKnownPath).exists())) {
      return;
    }
    const proof = await Bun.file(proofPath).json();
    const wellKnown = await Bun.file(wellKnownPath).json();
    const row = auditWellKnownMcpCatalogParity(proof, wellKnown);
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
    const registryClient = (await Bun.file(
      joinPath(ROOT, 'public/registry/registry-client-proof.json')
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
      registryClient,
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
