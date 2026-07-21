#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
const joinPath = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');

type PromoteOptions = {
  baselinePath: string;
  comparePath: string;
};

function getArg(name: string): string {
  const direct = Bun.argv.find(arg => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const idx = Bun.argv.findIndex(arg => arg === name);
  return idx >= 0 && idx + 1 < Bun.argv.length ? Bun.argv[idx + 1] : '';
}

function parseOptions(): PromoteOptions {
  return {
    baselinePath: getArg('--baseline') || 'reports/protocol-parallel.baseline.json',
    comparePath: getArg('--compare') || 'reports/protocol-parallel.compare.json',
  };
}

async function runCompareGate(): Promise<number> {
  // Former package script test:protocol:parallel:compare (removed in script trim).
  const proc = Bun.spawn(
    [
      'bun',
      'run',
      'scripts/test-protocol-parallel.ts',
      '--rerun-each=3',
      '--max-concurrency=4',
      '--max-failures=0',
      '--max-p95-ms=120',
      '--baseline-json=reports/protocol-parallel.baseline.json',
      '--max-p95-regression-ms=20',
      '--max-failure-regression=0',
      '--json-out=reports/protocol-parallel.compare.json',
    ],
    {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );
  return await proc.exited;
}

async function promoteBaseline(options: PromoteOptions): Promise<void> {
  const baselineFile = Bun.file(options.baselinePath);
  const compareFile = Bun.file(options.comparePath);

  const compareExists = await compareFile.exists();
  if (!compareExists) {
    throw new Error(`Compare report not found: ${options.comparePath}`);
  }

  const baselineExists = await baselineFile.exists();
  if (baselineExists) {
    const parent = options.baselinePath.includes('/')
      ? options.baselinePath.slice(0, options.baselinePath.lastIndexOf('/'))
      : '.';
    const archiveDir = joinPath(parent, 'archive');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = joinPath(archiveDir, `protocol-parallel.baseline.${ts}.json`);
    await Bun.write(archivePath, baselineFile);
    console.info(`Archived previous baseline -> ${archivePath}`);
  }

  await Bun.write(options.baselinePath, compareFile);
  console.info(`Promoted baseline -> ${options.baselinePath}`);
}

async function main() {
  const options = parseOptions();
  const exitCode = await runCompareGate();
  if (exitCode !== 0) {
    console.error(`Compare gate failed with exit code ${exitCode}. Baseline not promoted.`);
    process.exit(exitCode);
  }

  await promoteBaseline(options);
  process.exit(0);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
