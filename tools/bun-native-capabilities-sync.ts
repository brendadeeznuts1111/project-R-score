#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/reference/bun/argv — Bun.argv
/** Check, update, or preview the generated Bun Markdown adoption block. */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  createAstGrepSearch,
  syncBunNativeCapabilities,
} from '../lib/docs/bun-native-capabilities-sync.ts';
import { CANONICAL_REPO_DOCS } from '../lib/docs/repo-docs.ts';
import { resolvePath } from '../lib/path-bun.ts';

type Mode = 'check' | 'write' | 'preview';

function printHelp(): void {
  console.info(`bun-native-capabilities-sync — structural Bun Markdown documentation evidence

Usage:
  bun tools/bun-native-capabilities-sync.ts --check    Fail when the generated block is stale (default)
  bun tools/bun-native-capabilities-sync.ts --write    Update only the bounded generated block
  bun tools/bun-native-capabilities-sync.ts --preview  Render the candidate block to the terminal
`);
}

export function parseMode(argv: string[]): Mode | 'help' {
  if (argv.includes('--help') || argv.includes('-h')) return 'help';
  const selected = (['--check', '--write', '--preview'] as const).filter(flag =>
    argv.includes(flag)
  );
  if (selected.length > 1) throw new Error(`Choose one mode, received: ${selected.join(', ')}`);
  if (
    argv.some(arg => arg.startsWith('-') && !selected.includes(arg as (typeof selected)[number]))
  ) {
    throw new Error(
      `Unknown option: ${argv.find(arg => arg.startsWith('-') && !selected.includes(arg as (typeof selected)[number]))}`
    );
  }
  if (selected[0] === '--write') return 'write';
  if (selected[0] === '--preview') return 'preview';
  return 'check';
}

export async function main(argv: string[] = Bun.argv.slice(2)): Promise<void> {
  const mode = parseMode(argv);
  if (mode === 'help') {
    printHelp();
    return;
  }

  const repoRoot = resolvePath(import.meta.dir, '..');
  const docPath = resolvePath(repoRoot, CANONICAL_REPO_DOCS.bunNativeCapabilities);
  const current = await Bun.file(docPath).text();
  const result = await syncBunNativeCapabilities(current, createAstGrepSearch(repoRoot));

  if (mode === 'preview') {
    console.info(Bun.markdown.ansi(result.generatedSection));
    console.info(
      result.changed ? 'Candidate differs from the saved document.' : 'Saved document is current.'
    );
    return;
  }

  if (mode === 'write') {
    if (!result.changed) {
      console.info('✅ Bun native Markdown evidence is already current.');
      return;
    }
    await Bun.write(docPath, result.next);
    console.info(`✅ Updated ${CANONICAL_REPO_DOCS.bunNativeCapabilities}`);
    return;
  }

  if (result.changed) {
    console.error('❌ Bun native Markdown evidence is stale.');
    console.error('   Repair: bun run docs:native:sync');
    process.exitCode = 1;
    return;
  }
  console.info('✅ Bun native Markdown evidence is current.');
}

if (isModuleEntrypoint(import.meta)) await main();
