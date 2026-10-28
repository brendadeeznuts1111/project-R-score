// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @updated Bun.spawn · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.spawn · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawn · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.spawn · fixed v0.6.6 · 2023-05-31 · https://bun.com/blog/bun-v0.6.6
// @updated Bun.spawn · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.spawn · fixed v1.0.8 · 2023-11-02 · https://bun.com/blog/bun-v1.0.8
// @updated Bun.spawn · fixed v1.0.9 · 2023-11-05 · https://bun.com/blog/bun-v1.0.9
// @updated Bun.spawn · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.spawn · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.spawn · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.spawn · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.spawn · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.spawn · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawn · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.spawn · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.spawn · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · fixed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.spawn · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.spawn · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · changed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.spawn · fixed v1.2.16 · 2025-06-11 · https://bun.com/blog/bun-v1.2.16
// @updated Bun.spawn · fixed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated Bun.spawn · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated Bun.spawn · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · changed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.spawn · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawn · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.spawn · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.spawn · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/child-process
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
import { parseArgs } from 'util';
import { jsonOut } from '../lib/console-depth.ts';
import {
  assertDedupeClean,
  collectProductionLicenses,
  type LicenseSummary,
} from './bun-package-governance.ts';

function markdown(summary: LicenseSummary, dedupeChecked: boolean): string {
  const rows = summary.licenses
    .map(group => `| ${group.license} | ${group.packages} | ${group.versions} |`)
    .join('\n');
  return `# Production dependency governance

- Bun: \`${summary.bunVersion}\`
- Packages: ${summary.totals.uniquePackages} unique / ${summary.totals.packages} license records
- Resolved versions: ${summary.totals.versions}
- License groups: ${summary.totals.licenses}
- Review-required license labels: ${summary.reviewRequired.length}
- Lockfile dedupe: ${dedupeChecked ? 'clean' : 'not checked'}

| License | Packages | Versions |
| --- | ---: | ---: |
${rows}
`;
}

export function buildPackageDiffCommand(
  specs: readonly string[],
  bunExecutable = process.execPath
): string[] {
  if (specs.length === 0) {
    throw new Error('dependencies:diff requires at least one package or folder spec');
  }
  return [bunExecutable, 'pm', 'diff', ...specs];
}

function help(): string {
  return `Usage: bun tools/bun-package-governance-cli.ts <action> [options]

  check                    Validate production license metadata and bun.lock deduplication
  licenses                 Validate and summarize production license metadata only
  diff <spec...>           Review package-version changes with Bun's read-only package diff
  --json                   Print the normalized, path-free license summary as JSON

Diff examples:
  bun run dependencies:diff -- react
  bun run dependencies:diff -- react@18.2.0 19.0.0
  bun run dependencies:diff -- ./vendored-pkg pkg@2.1.0
  bun run dependencies:diff -- react-dom@18.2.0 18.3.1 '*.min.js'`;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: { json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
    strict: true,
  });
  const action = positionals[0] ?? 'check';
  if (values.help) {
    console.log(help());
    return;
  }
  if (!['check', 'licenses', 'diff'].includes(action)) {
    throw new Error(`expected check, licenses, or diff; received: ${positionals.join(' ')}`);
  }

  if (action === 'diff') {
    if (values.json) throw new Error('--json applies to check and licenses, not diff');
    const proc = Bun.spawn(buildPackageDiffCommand(positionals.slice(1)), {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });
    process.exitCode = await proc.exited;
    return;
  }

  if (positionals.length > 1) {
    throw new Error(`${action} does not accept package specs`);
  }

  const summary = await collectProductionLicenses();
  if (summary.reviewRequired.length) {
    const labels = summary.reviewRequired.map(item => item.license).join(', ');
    throw new Error(`production dependency licenses require review: ${labels}`);
  }

  const dedupeChecked = action === 'check';
  if (dedupeChecked) await assertDedupeClean();
  if (values.json) jsonOut(summary);
  else console.log(Bun.markdown.ansi(markdown(summary, dedupeChecked)));
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
