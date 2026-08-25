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

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: { json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
    strict: true,
  });
  const action = positionals[0] ?? 'check';
  if (values.help) {
    console.log(`Usage: bun tools/bun-package-governance-cli.ts [check|licenses] [--json]

  check       Validate production license metadata and bun.lock deduplication
  licenses    Validate and summarize production license metadata only
  --json      Print the normalized, path-free license summary as JSON`);
    return;
  }
  if (!['check', 'licenses'].includes(action) || positionals.length > 1) {
    throw new Error(`expected check or licenses, received: ${positionals.join(' ')}`);
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
