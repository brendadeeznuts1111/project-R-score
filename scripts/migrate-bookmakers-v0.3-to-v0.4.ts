#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Migrate committed/live v0.3 bookmakers bake → v0.4 public + ops artifacts.
 *
 *   bun run bookmakers:migrate
 *   bun scripts/migrate-bookmakers-v0.3-to-v0.4.ts --in public/registry/bookmakers.json
 *
 * Writes:
 *   public/registry/bookmakers.json                         (Pages public catalog)
 *   artifact-registry/bookmakers/v0.4.0/public/books.json   (SSOT public)
 *   artifact-registry/bookmakers/v0.4.0/ops/books.json      (ops-only, not on Pages)
 */
import { jsonOut } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';
import { migrateCatalogV03ToV04 } from '../lib/bookmakers/migrate-v03-to-v04.ts';

const DEFAULT_IN = 'public/registry/bookmakers.json';
const PUBLIC_OUT = 'public/registry/bookmakers.json';
const ARTIFACT_PUBLIC = 'artifact-registry/bookmakers/v0.4.0/public/books.json';
const ARTIFACT_OPS = 'artifact-registry/bookmakers/v0.4.0/ops/books.json';

function argValue(flag: string): string | undefined {
  const i = Bun.argv.indexOf(flag);
  if (i >= 0 && Bun.argv[i + 1]) return Bun.argv[i + 1]!;
  return undefined;
}

async function main(): Promise<void> {
  const inPath = argValue('--in') ?? DEFAULT_IN;
  const dry = Bun.argv.includes('--dry-run');
  const asJson = Bun.argv.includes('--json');

  const raw = JSON.parse(await Bun.file(inPath).text()) as {
    schemaVersion?: number;
    bookmakers?: Record<string, unknown>;
    artifact?: { name?: string; version?: string; checksum?: string; source?: string };
  };

  // If already v0.4 public (schema 2 + fetcher field), re-split ops from enrichment only when forced.
  if (raw.schemaVersion === 2 && !Bun.argv.includes('--force')) {
    const sample = Object.values(raw.bookmakers ?? {})[0] as { fetcher?: string } | undefined;
    if (sample && typeof sample.fetcher === 'string') {
      if (!asJson) {
        console.log(`already v0.4 public catalog (${inPath}); pass --force to re-run migration`);
        return;
      }
    }
  }

  const { public: pub, ops } = migrateCatalogV03ToV04(raw, { version: '0.4.0' });

  if (asJson) {
    jsonOut({ public: pub, ops });
  } else {
    console.log(
      `migrate v0.3→v0.4: ${pub.summary.count} books · audit ${pub.audit.ok ? 'ok' : 'FAIL'} · issues ${pub.audit.issues.length}`
    );
    if (!pub.audit.ok) {
      for (const i of pub.audit.issues.slice(0, 20)) console.error(`  · ${i}`);
    }
  }

  if (dry) {
    if (!asJson) console.log('--dry-run: no files written');
    process.exit(pub.audit.ok ? 0 : 1);
  }

  // Strip undefined checksum for stable JSON
  if (!pub.artifact.checksum) delete (pub.artifact as { checksum?: string }).checksum;

  // When re-migrating from an already-public catalog, merge prior ops secrets
  // so restBaseUrl/apiKeyEnv are not wiped.
  let opsOut = ops;
  try {
    if (await Bun.file(ARTIFACT_OPS).exists()) {
      const prior = JSON.parse(await Bun.file(ARTIFACT_OPS).text()) as {
        bookmakers?: Record<string, Record<string, unknown>>;
      };
      const merged = { ...ops, bookmakers: { ...ops.bookmakers } };
      for (const [id, row] of Object.entries(merged.bookmakers)) {
        const prev = prior.bookmakers?.[id];
        if (!prev) continue;
        merged.bookmakers[id] = {
          ...row,
          restBaseUrl: row.restBaseUrl ?? (prev.restBaseUrl as string | undefined),
          restProtocol: row.restProtocol ?? (prev.restProtocol as string | undefined),
          apiKeyEnv: row.apiKeyEnv ?? (prev.apiKeyEnv as string | undefined),
          envVars: row.envVars ?? (prev.envVars as string[] | undefined),
        };
      }
      opsOut = merged;
    }
  } catch {
    /* no prior ops */
  }

  await Bun.write(PUBLIC_OUT, `${JSON.stringify(pub, null, 2)}\n`);
  await Bun.write(ARTIFACT_PUBLIC, `${JSON.stringify(pub, null, 2)}\n`);
  await Bun.write(ARTIFACT_OPS, `${JSON.stringify(opsOut, null, 2)}\n`);

  // README for the artifact split
  const readme = joinPath('artifact-registry/bookmakers/v0.4.0', 'README.md');
  await Bun.write(
    readme,
    `# Bookmakers v0.4.0 — public / ops split

| Path | Audience | Pages? |
|------|----------|--------|
| \`public/books.json\` | Portal mirror SSOT | yes → \`public/registry/bookmakers.json\` |
| \`ops/books.json\` | Operator desk (keys, balance placeholders) | **never** |

Regenerate: \`bun run bookmakers:migrate\`

Rules:
- \`id === slug\` (route primary key)
- regions: \`{ country, stateCode? }\` objects
- public must not contain \`restBaseUrl\`, \`apiKeyEnv\`, \`envVars\`, \`balance\`, \`health\`
`
  );

  console.log(`✓ ${PUBLIC_OUT}`);
  console.log(`✓ ${ARTIFACT_PUBLIC}`);
  console.log(`✓ ${ARTIFACT_OPS}`);
  process.exit(pub.audit.ok ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
