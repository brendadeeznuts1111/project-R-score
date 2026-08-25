// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
import { resolvePath as resolve } from '../../lib/path-bun';
import {
  buildBun14CapabilityRegistry,
  syncBun14CapabilityRegistry,
  validateCapabilityAnchors,
} from './capabilities.ts';
import { syncBun14ChannelRelease } from './channel-release.ts';
import { syncBun14VideoSharePages } from './channel-pages.ts';
import { REPO_ROOT } from './constants.ts';
import { discoverAssets } from './discovery.ts';
import { fail } from './errors.ts';
import { syncBun14AssetFeeds } from './feed.ts';
import { inspectAllAssets } from './inspection.ts';
import { buildManifest } from './manifest-build.ts';
import { compareManifestToInspection, parseManifestShape } from './manifest-validation.ts';
import { readRightsApprovalEvidence } from './rights.ts';
import { buildRefreshPlan, formatRefreshPlan } from './refresh-plan.ts';
import { loadSourceDocuments } from './sources.ts';
import { atomicWriteJson, readManifest, stageVendorAssets } from './storage.ts';
import type { AssetManifest, CliOptions } from './types.ts';

export async function run(options: CliOptions): Promise<AssetManifest> {
  if (options.vendor && !options.confirmRights) {
    fail('vendor mode is blocked until --confirm-rights is supplied');
  }
  if (options.vendor && !options.rightsEvidencePath) {
    fail('vendor mode is blocked until --rights-evidence PATH is supplied');
  }
  const approval = options.rightsEvidencePath
    ? await readRightsApprovalEvidence(options.rightsEvidencePath)
    : null;
  const documents = await loadSourceDocuments(options);
  const discovered = discoverAssets(documents);
  const inspected = await inspectAllAssets(discovered.assets, options.timeoutMs, options.mode);
  const manifest = parseManifestShape(
    buildManifest(
      documents,
      discovered.assets,
      inspected,
      discovered.authors,
      options.mode,
      approval
    ),
    'generated manifest'
  );

  if (options.plan) {
    const existing = await readManifest(options.manifestPath);
    console.log(formatRefreshPlan(buildRefreshPlan(existing, manifest)));
    return manifest;
  }

  if (options.check) {
    const existing = await readManifest(options.manifestPath);
    compareManifestToInspection(existing, manifest);
    const capabilityRegistry = buildBun14CapabilityRegistry(existing);
    validateCapabilityAnchors(capabilityRegistry, documents.html);
    await syncBun14CapabilityRegistry(capabilityRegistry, true);
    if (existing.rightsStatus === 'approved') {
      for (const asset of existing.assets.filter(item => item.kind !== 'embed')) {
        if (!asset.localUrl) fail(`approved asset ${asset.id} is missing localUrl`);
        const localPath = resolve(REPO_ROOT, asset.localUrl.replace(/^\//, ''));
        if (!(await Bun.file(localPath).exists())) {
          fail(`approved local asset is missing: ${localPath}`);
        }
      }
    }
    await syncBun14AssetFeeds(existing, capabilityRegistry, true);
    await syncBun14VideoSharePages(existing, true);
    await syncBun14ChannelRelease({ check: true, archive: false, quiet: true });
    console.log(
      `bun-blog-assets: check passed (${existing.assets.length} assets; ` +
        `${existing.rightsStatus} rights; source bytes verified in memory)`
    );
    return existing;
  }

  if (options.vendor) {
    await stageVendorAssets(inspected, options.vendorDir);
    console.log(`bun-blog-assets: staged approved media in ${options.vendorDir}`);
  }
  await atomicWriteJson(options.manifestPath, manifest);
  const capabilityRegistry = buildBun14CapabilityRegistry(manifest);
  validateCapabilityAnchors(capabilityRegistry, documents.html);
  await syncBun14CapabilityRegistry(capabilityRegistry, false);
  await syncBun14AssetFeeds(manifest, capabilityRegistry, false);
  await syncBun14VideoSharePages(manifest, false);
  await syncBun14ChannelRelease({ check: false, archive: true, quiet: true });
  console.log(
    `bun-blog-assets: wrote ${manifest.assets.length}-asset ${manifest.rightsStatus} manifest to ${options.manifestPath}`
  );
  return manifest;
}
