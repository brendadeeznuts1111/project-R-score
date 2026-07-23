#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
/**
 * Rank candidate tsconfig.check.json include globs by error count
 * when added alone on top of the current check island.
 */
const check = (await Bun.file('tsconfig.check.json').json()) as {
  extends: string;
  compilerOptions: Record<string, unknown>;
  include: string[];
  exclude: string[];
};

const candidates = [
  'lib/mcp/**/*',
  'lib/factory/**/*',
  'lib/theme/**/*',
  'lib/r2/**/*',
  'lib/package/**/*',
  'lib/rss/**/*',
  'lib/shared/**/*',
  'lib/macros/**/*',
  'lib/performance/**/*',
  'lib/constants/**/*',
  'lib/ai/**/*',
  'lib/deep-equals.ts',
  'lib/image-metadata.ts',
  'lib/peek-settle.ts',
  'lib/screenshot-remediation.ts',
  'lib/time.ts',
  'lib/text.ts',
  'lib/terminal.ts',
  'lib/gate-map.ts',
  'lib/gate-report-monorepo.ts',
  'lib/github-repository-ref.ts',
  'config/r2-env.ts',
  'config/**/*.ts',
];

async function errorsFor(include: string[]): Promise<number> {
  const probe = 'tsconfig.check.probe.json';
  await Bun.write(
    probe,
    `${JSON.stringify(
      {
        ...check,
        include,
        compilerOptions: {
          ...check.compilerOptions,
          incremental: false,
          tsBuildInfoFile: undefined,
        },
      },
      null,
      2
    )}\n`
  );
  const r = Bun.spawnSync({
    cmd: ['bunx', 'tsc', '-p', probe, '--pretty', 'false'],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = `${r.stdout.toString()}${r.stderr.toString()}`;
  return (out.match(/error TS/g) ?? []).length;
}

const baseN = await errorsFor(check.include);
console.info(`baseline errors: ${baseN}`);

const rows: { candidate: string; alone: number; withBase: number }[] = [];
for (const c of candidates) {
  const alone = await errorsFor([c]);
  const withBase = alone === 0 ? await errorsFor([...check.include, c]) : alone;
  rows.push({ candidate: c, alone, withBase });
  console.info(
    `${String(alone).padStart(4)} alone · ${String(withBase).padStart(4)} +base :: ${c}`
  );
}

rows.sort((a, b) => a.withBase - b.withBase || a.candidate.localeCompare(b.candidate));
console.log(
  Bun.inspect.table(
    rows.filter(r => r.withBase <= 20),
    ['candidate', 'alone', 'withBase'],
    { colors: true }
  )
);
await Bun.$`rm -f tsconfig.check.probe.json`.quiet();
