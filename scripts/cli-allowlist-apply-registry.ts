#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
/**
 * Merge plan.json into ALLOWED_LONG_REGISTRY (lib/docs/ref-id-tool-flags.ts).
 *
 *   bun scripts/cli-allowlist-apply-registry.ts --dry-run
 *   bun scripts/cli-allowlist-apply-registry.ts --write
 *
 * Appends missing `*_ALLOWED_LONG` constants + registry keys from
 * artifacts/cli-allowlist-team/plan.json. Idempotent (skips keys already present).
 */

import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('cli:allowlist:apply-registry', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const DRY = !argv.includes('--write');
const PLAN = 'artifacts/cli-allowlist-team/plan.json';
const TARGET = 'lib/docs/ref-id-tool-flags.ts';

type PlanEntry = {
  key: string;
  constName: string;
  path: string;
  leaves: string[];
};

async function main(): Promise<void> {
  const plan = (await Bun.file(PLAN).json()) as { entries: PlanEntry[] };
  let src = await Bun.file(TARGET).text();

  const missing = plan.entries.filter(e => !src.includes(`'${e.key}':`));
  console.log(
    `plan entries: ${plan.entries.length} · missing from registry text: ${missing.length}`
  );
  if (missing.length === 0) {
    console.log('nothing to apply');
    return;
  }

  const constBlock =
    missing
      .map(
        e =>
          `/** § — ${e.key} (\`${e.path}\`) — auto team plan */\n` +
          `export const ${e.constName} = ${JSON.stringify(e.leaves)} as const;\n`
      )
      .join('\n') + '\n';

  const typeAnchor = '/** CLI names keyed in `ALLOWED_LONG_REGISTRY`';
  if (!src.includes(typeAnchor)) {
    throw new Error('type anchor not found');
  }
  src = src.replace(typeAnchor, `${constBlock}${typeAnchor}`);

  const central = '/**\n * Central allowlist registry';
  const centralIdx = src.indexOf(central);
  if (centralIdx < 0) throw new Error('central registry comment not found');
  const beforeCentral = src.slice(0, centralIdx);
  const afterCentral = src.slice(centralIdx);
  // Strip trailing semicolon after last union member so new members attach
  let typeBody = beforeCentral;
  typeBody = typeBody.replace(/(\n  \| '[^']+');(\s*)$/, '$1$2');
  const lastUnion = typeBody.lastIndexOf("| '");
  if (lastUnion < 0) throw new Error('no union members');
  const lineEnd = typeBody.indexOf('\n', lastUnion);
  const newTypeMembers = missing.map(e => `  | '${e.key}'`).join('\n') + '\n';
  // Ensure type ends with semicolon after all members
  let rest = typeBody.slice(lineEnd + 1);
  src =
    typeBody.slice(0, lineEnd + 1) +
    newTypeMembers +
    (rest.trimStart().startsWith(';') ? rest : ';\n' + rest) +
    afterCentral;

  const regEnd = src.indexOf('} as const satisfies Record<AllowedLongCliName');
  if (regEnd < 0) throw new Error('registry end not found');
  const regEntries = missing.map(e => `  '${e.key}': ${e.constName},`).join('\n') + '\n';
  src = src.slice(0, regEnd) + regEntries + src.slice(regEnd);

  if (DRY) {
    console.log(`[dry-run] would add ${missing.length} registry keys`);
    console.log(
      missing
        .slice(0, 12)
        .map(e => e.key)
        .join('\n')
    );
    if (missing.length > 12) console.log(`… +${missing.length - 12} more`);
    return;
  }

  await Bun.write(TARGET, src);
  console.log(`wrote ${TARGET} (+${missing.length} keys)`);
}

await main();
