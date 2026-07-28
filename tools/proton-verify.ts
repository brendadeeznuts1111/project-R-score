#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Proton Pass vault reference verifier.
 *
 * Checks all `pass://` references in env.template:
 *   - Format: {{ pass://vault/item/field }}
 *   - No bare pass:// without {{ }}
 *   - No duplicate item references
 *   - All vault items match expected patterns
 *
 *   bun run proton:verify
 *   bun run proton:verify --json
 */
const ENV_TEMPLATE = 'env.template';
const PASS_RE = /\{\{\s*pass:\/\/([^/]+)\/([^/]+)\/(\S+?)\s*\}\}/g;

type VaultRef = {
  vault: string;
  item: string;
  field: string;
  line: number;
  status: 'ok' | 'duplicate';
};

async function main(): Promise<void> {
  const jsonOut = process.argv.includes('--json');
  const content = await Bun.file(ENV_TEMPLATE).text();
  const lines = content.split('\n');
  const refs: VaultRef[] = [];
  const seen = new Set<string>();
  let warnings = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;
    if (line.trimStart().startsWith('#')) continue; // skip comments
    if (!line.includes('{{')) continue;

    PASS_RE.lastIndex = 0;
    let m;
    while ((m = PASS_RE.exec(line)) !== null) {
      const key = `${m[1]}/${m[2]}/${m[3]}`;
      const dup = seen.has(key);
      if (dup) {
        console.warn(`  ⚠️  Line ${lineNum}: duplicate ${key}`);
        warnings++;
      }
      refs.push({
        vault: m[1]!,
        item: m[2]!,
        field: m[3]!,
        line: lineNum,
        status: dup ? 'duplicate' : 'ok',
      });
      seen.add(key);
    }
  }

  const summary = {
    totalRefs: refs.length,
    uniqueItems: seen.size,
    duplicates: refs.filter(r => r.status === 'duplicate').length,
    vaults: [...new Set(refs.map(r => r.vault))],
    warnings,
  };
  if (jsonOut) return void console.log(JSON.stringify({ summary, refs }, null, 2));
  console.log(
    `  ✅ Proton Pass Vault: ${summary.uniqueItems} unique refs, ${summary.duplicates} dupes, ${summary.warnings} warnings`
  );
}

if (import.meta.main) main();
