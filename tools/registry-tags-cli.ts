#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Registry proof dist-tag lifecycle CLI.
 *
 *   bun tools/registry-tags-cli.ts status
 *   bun tools/registry-tags-cli.ts promote --all
 *   bun tools/registry-tags-cli.ts promote --package @factorywager/routing-test --stable
 *   bun tools/registry-tags-cli.ts upgrade --from pre
 *
 * Phases:
 *   pre  — canary / pre-deploy (ops:snapshot default)
 *   post — after deploy verification (promote)
 *   latest / stable — consumer install targets
 */
import {
  PROOF_PACKAGES,
  describeUpgrade,
  loadProofIndex,
  promoteProofPackage,
  writeProofIndex,
  type ProofPackageId,
  REGISTRY_DIST_TAGS,
} from '../lib/registry-tags.ts';
import { logTable } from '../lib/console-depth.ts';

const args = import.meta.main
  ? applyUnknownLongOptionGuardFor('registry:tags', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const cmd = args[0] ?? 'status';

function packageArg(): ProofPackageId | 'all' {
  const i = args.indexOf('--package');
  if (i >= 0 && args[i + 1]) return args[i + 1] as ProofPackageId;
  if (args.includes('--all')) return 'all';
  return 'all';
}

async function main(): Promise<void> {
  if (cmd === 'status') {
    const index = await loadProofIndex();
    const rows = Object.values(index.packages).map(p => ({
      Package: p.name,
      pre: p['dist-tags'].pre ?? '—',
      post: p['dist-tags'].post ?? '—',
      latest: p['dist-tags'].latest ?? '—',
      stable: p['dist-tags'].stable ?? '—',
      versions: p.versions.length,
    }));
    console.log(`Proof packages index · updated ${index.lastUpdated}`);
    if (rows.length === 0) {
      console.log('No proof packages yet. Run: bun run ops:snapshot');
    } else {
      logTable(rows, ['Package', 'pre', 'post', 'latest', 'stable', 'versions'], {
        colors: true,
      });
    }
    return;
  }

  if (cmd === 'promote') {
    const target = packageArg();
    const pinStable = args.includes('--stable');
    let index = await loadProofIndex();
    const names =
      target === 'all' ? ([...PROOF_PACKAGES] as ProofPackageId[]) : [target as ProofPackageId];
    for (const name of names) {
      if (!index.packages[name]) {
        console.warn(`skip ${name}: not in index`);
        continue;
      }
      index = promoteProofPackage(index, name, { pinStable });
      // also write post.json pointer from latest body
      const ver = index.packages[name]!['dist-tags'][REGISTRY_DIST_TAGS.post];
      const rel = ver ? index.packages[name]!.releases[ver] : undefined;
      if (rel?.path) {
        try {
          const body = await Bun.file(rel.path).text();
          const dir = `public/registry/${name}`;
          await Bun.write(`${dir}/post.json`, body);
          await Bun.write(`${dir}/latest.json`, body);
          if (pinStable) await Bun.write(`${dir}/stable.json`, body);
        } catch (e) {
          console.warn(`could not refresh tag files for ${name}:`, e);
        }
      }
      console.log(
        `promoted ${name} → post=${index.packages[name]!['dist-tags'].post}` +
          (pinStable ? ` stable=${index.packages[name]!['dist-tags'].stable}` : '')
      );
    }
    await writeProofIndex(index);
    return;
  }

  if (cmd === 'upgrade') {
    const fromIdx = args.indexOf('--from');
    const from =
      (fromIdx >= 0 ? args[fromIdx + 1] : REGISTRY_DIST_TAGS.pre) ?? REGISTRY_DIST_TAGS.pre;
    const index = await loadProofIndex();
    const rows = PROOF_PACKAGES.map(name => {
      const u = describeUpgrade(index, name, from);
      return {
        Package: name,
        From: `${u.fromTag}@${u.fromVersion ?? '—'}`,
        To: u.toTag ? `${u.toTag}@${u.toVersion ?? '(promote first)'}` : '—',
        Action: u.action,
      };
    });
    logTable(rows, ['Package', 'From', 'To', 'Action'], { colors: true });
    console.log('\nPromote: bun tools/registry-tags-cli.ts promote --all');
    console.log('Post-deploy snapshot: SNAPSHOT_PHASE=post bun run ops:snapshot');
    return;
  }

  console.error(`Unknown command: ${cmd}
Usage:
  status
  promote [--all | --package <name>] [--stable]
  upgrade [--from pre|post|latest]`);
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
