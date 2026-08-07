#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io — Bun.write · Bun.file().delete()
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/console#object-inspection-depth — cliOut dual-mode
// @see https://bun.com/docs/project/contributing#download-release-build-from-pull-requests — bunx bun-pr
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { cliOut, logTable } from '../../../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
} from '../../../lib/docs/ref-id-tool-flags.ts';
import { prepareReleaseInventoryIndex, type PreparedReleaseInventoryIndex } from './catalog';
import { fetchReleaseFeed, loadReleaseFeedSettings, selectReleaseFeedEntries } from './feed';
import {
  normalizeVersion,
  prepareReleaseInventory,
  type PreparedReleaseInventory,
} from './generator';

export { BUN_RELEASE_CONTRACTS_ALLOWED_LONG };

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const DEFAULT_OUTPUT_DIR = resolve(import.meta.dir, '..', 'contracts');

function positiveInteger(value: string | undefined, name: string, fallback?: number): number {
  if (value == null && fallback != null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await worker(values[index]!);
    }
  });
  await Promise.all(runners);
  return results;
}

function printHelp(): void {
  console.log(`Usage: bun run bun:release-contracts -- [vMAJOR.MINOR.PATCH | latest] [options]
       bun packages/bun-release-contracts/src/cli.ts [vMAJOR.MINOR.PATCH | latest] [options]

Options:
  --all                Generate every stable release present in the Bun RSS feed
  --since <version>    With --all, include releases at or after this version
  --limit <count>      With --all, limit releases selected newest first
  --concurrency <n>    Concurrent blog fetches for batch generation (default: 4, max: 8)
  --output-dir <path>  Inventory output directory
  --check              Fail when an inventory or index is missing or stale
  --json               Machine-readable summary via cliOut
  -h, --help           Show this help

Upstream Bun PR builds (not this CLI's flags):
  bunx bun-pr <pr> && bun run bun:pr:verify -- <pr>
  See docs/BUN_DOCS_OPERATE.md · docs/harness/cli-constants-flags.md §6`);
}

export type ReleaseContractsCliSummary = {
  mode: 'check' | 'generate';
  bunVersion: string;
  outputDir: string;
  releases: Array<{
    version: string;
    path: string;
    status: 'verified' | 'generated' | 'unchanged';
    itemCount: number;
  }>;
  index: {
    path: string;
    status: 'verified' | 'generated' | 'unchanged';
    releaseCount: number;
  };
};

export type GenerateReleaseInventoryBatchOptions = {
  versions: string[];
  outputDir: string;
  check?: boolean;
  concurrency?: number;
  fetchImpl?: typeof fetch;
  repoRoot?: string;
  /** Deterministic commit coordination/fault injection for contract tests. */
  commitHooks?: BatchCommitHooks;
};

export type BatchCommitHooks = {
  afterLockAcquired?: () => Promise<void> | void;
  beforeMove?: (moveIndex: number, targetPath: string) => Promise<void> | void;
};

export type GenerateReleaseInventoryBatchResult = {
  inventories: PreparedReleaseInventory[];
  index: PreparedReleaseInventoryIndex;
};

async function currentContent(path: string): Promise<string | null> {
  const file = Bun.file(path);
  return (await file.exists()) ? file.text() : null;
}

async function assertUnchangedSincePreparation(
  inventories: PreparedReleaseInventory[],
  index: PreparedReleaseInventoryIndex
): Promise<void> {
  const targets = [
    ...inventories.map(inventory => ({
      path: inventory.outputPath,
      expected: inventory.existingContent,
    })),
    { path: index.outputPath, expected: index.existingContent },
  ];
  for (const target of targets) {
    if ((await currentContent(target.path)) !== target.expected) {
      throw new Error(`Release contract changed during generation: ${target.path}`);
    }
  }
}

async function runFilesystemCommand(command: string[], action: string): Promise<void> {
  const process = Bun.spawn(command, { stdout: 'ignore', stderr: 'pipe' });
  const [exitCode, stderr] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(`${action} failed (${exitCode}): ${stderr.trim() || command.join(' ')}`);
  }
}

async function ensureDirectory(directory: string): Promise<void> {
  const marker = join(directory, `.bun-release-contracts-${Bun.randomUUIDv7()}.keep`);
  await Bun.write(marker, '');
  await Bun.file(marker).delete();
}

async function moveStagedFile(source: string, target: string): Promise<void> {
  await runFilesystemCommand(['mv', '-f', '--', source, target], `Move ${source} to ${target}`);
}

async function removeStagingDirectory(stagingDir: string): Promise<void> {
  if (!basename(stagingDir).startsWith('.bun-release-contracts-stage-')) {
    throw new Error(`Refusing to remove unexpected staging directory: ${stagingDir}`);
  }
  await runFilesystemCommand(['rm', '-rf', '--', stagingDir], `Remove ${stagingDir}`);
}

async function acquireOutputLock(outputDir: string): Promise<string> {
  const lockDir = `${outputDir}.bun-release-contracts.lock`;
  try {
    await runFilesystemCommand(['mkdir', '--', lockDir], `Acquire ${lockDir}`);
  } catch (error) {
    throw new Error(`Release contract output is locked: ${outputDir}`, { cause: error });
  }
  return lockDir;
}

async function releaseOutputLock(lockDir: string): Promise<void> {
  if (!basename(lockDir).endsWith('.bun-release-contracts.lock')) {
    throw new Error(`Refusing to remove unexpected release contract lock: ${lockDir}`);
  }
  await runFilesystemCommand(['rm', '-rf', '--', lockDir], `Release ${lockDir}`);
}

type CommitTarget = {
  stagedPath: string;
  outputPath: string;
  existingContent: string | null;
};

async function rollbackInstalledTargets(
  installed: CommitTarget[],
  backupDir: string
): Promise<unknown[]> {
  const failures: unknown[] = [];
  for (const target of [...installed].reverse()) {
    try {
      if (target.existingContent === null) {
        if (await Bun.file(target.outputPath).exists()) await Bun.file(target.outputPath).delete();
      } else {
        await moveStagedFile(join(backupDir, basename(target.outputPath)), target.outputPath);
      }
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}

async function commitPreparedBatch(
  outputDir: string,
  inventories: PreparedReleaseInventory[],
  index: PreparedReleaseInventoryIndex,
  hooks: BatchCommitHooks = {}
): Promise<void> {
  const changedInventories = inventories.filter(inventory => inventory.changed);
  if (changedInventories.length === 0 && !index.changed) return;

  const parentDir = dirname(outputDir);
  const stagingDir = join(parentDir, `.bun-release-contracts-stage-${Bun.randomUUIDv7()}`);
  const backupDir = join(stagingDir, 'backups');
  let lockDir: string | undefined;
  let primaryError: unknown;
  try {
    await Promise.all([
      ...changedInventories.map(inventory =>
        Bun.write(join(stagingDir, basename(inventory.outputPath)), inventory.content)
      ),
      ...(index.changed ? [Bun.write(join(stagingDir, 'index.json'), index.content)] : []),
    ]);

    const targets: CommitTarget[] = [
      ...changedInventories.map(inventory => ({
        stagedPath: join(stagingDir, basename(inventory.outputPath)),
        outputPath: inventory.outputPath,
        existingContent: inventory.existingContent,
      })),
      ...(index.changed
        ? [
            {
              stagedPath: join(stagingDir, 'index.json'),
              outputPath: index.outputPath,
              existingContent: index.existingContent,
            },
          ]
        : []),
    ];
    await Promise.all(
      targets
        .filter(target => target.existingContent !== null)
        .map(target =>
          Bun.write(join(backupDir, basename(target.outputPath)), target.existingContent as string)
        )
    );

    lockDir = await acquireOutputLock(outputDir);
    await hooks.afterLockAcquired?.();
    await assertUnchangedSincePreparation(inventories, index);
    await ensureDirectory(outputDir);

    const installed: CommitTarget[] = [];
    try {
      for (let moveIndex = 0; moveIndex < targets.length; moveIndex++) {
        const target = targets[moveIndex]!;
        await hooks.beforeMove?.(moveIndex, target.outputPath);
        await moveStagedFile(target.stagedPath, target.outputPath);
        installed.push(target);
      }
    } catch (error) {
      const rollbackFailures = await rollbackInstalledTargets(installed, backupDir);
      if (rollbackFailures.length > 0) {
        throw new AggregateError(
          [error, ...rollbackFailures],
          'Release contract commit failed and rollback was incomplete'
        );
      }
      throw error;
    }
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const cleanupFailures: unknown[] = [];
    try {
      await removeStagingDirectory(stagingDir);
    } catch (error) {
      cleanupFailures.push(error);
    }
    if (lockDir) {
      try {
        await releaseOutputLock(lockDir);
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (cleanupFailures.length > 0) {
      if (primaryError !== undefined) {
        console.warn(
          `Release contract cleanup failed after the primary error: ${cleanupFailures
            .map(error => (error instanceof Error ? error.message : String(error)))
            .join(' · ')}`
        );
      } else {
        throw new AggregateError(cleanupFailures, 'Release contract cleanup failed');
      }
    }
  }
}

export async function generateReleaseInventoryBatch(
  options: GenerateReleaseInventoryBatchOptions
): Promise<GenerateReleaseInventoryBatchResult> {
  if (options.versions.length === 0) throw new Error('Expected at least one Bun release version');
  const versions = options.versions.map(normalizeVersion);
  if (new Set(versions).size !== versions.length) {
    throw new Error('Batch generation contains duplicate Bun release versions');
  }
  const concurrency = Math.min(8, options.concurrency ?? 4);
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new Error('concurrency must be a positive integer');
  }
  const outputDir = resolve(options.outputDir);

  // Phase one is read-only: every fetch, parse, coverage check, and future catalog
  // validation must succeed before any contract output is staged or committed.
  const inventories = await mapConcurrent(versions, concurrency, version =>
    prepareReleaseInventory({
      version,
      outputDir,
      fetchImpl: options.fetchImpl,
      repoRoot: options.repoRoot,
    })
  );
  const index = await prepareReleaseInventoryIndex({
    outputDir,
    replacements: inventories.map(inventory => inventory.inventory),
    repoRoot: options.repoRoot,
  });

  if (options.check) {
    const stalePaths = [
      ...inventories.filter(inventory => inventory.changed).map(inventory => inventory.outputPath),
      ...(index.changed ? [index.outputPath] : []),
    ];
    if (stalePaths.length > 0) {
      throw new Error(`Release contract state is missing or stale:\n${stalePaths.join('\n')}`);
    }
  } else {
    await commitPreparedBatch(outputDir, inventories, index, options.commitHooks);
  }

  return { inventories, index };
}

export async function runCli(
  args = Bun.argv.slice(2)
): Promise<ReleaseContractsCliSummary | undefined> {
  const guarded = applyUnknownLongOptionGuardFor('bun:release-contracts', args, {
    onFail: 'throw',
  });
  const { values, positionals } = parseArgs({
    args: guarded,
    options: {
      all: { type: 'boolean', default: false },
      since: { type: 'string' },
      limit: { type: 'string' },
      concurrency: { type: 'string' },
      check: { type: 'boolean', default: false },
      'output-dir': { type: 'string' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    printHelp();
    return undefined;
  }
  if (positionals.length > 1) throw new Error('Expected at most one version argument');
  if (values.all && positionals.length > 0) {
    throw new Error('Do not combine --all with a positional version');
  }
  if (values.since && !values.all) throw new Error('--since requires --all');
  if (values.limit && !values.all) throw new Error('--limit requires --all');

  const limit = values.limit == null ? undefined : positiveInteger(values.limit, '--limit');
  const concurrency = Math.min(8, positiveInteger(values.concurrency, '--concurrency', 4));
  const outputDir = resolve(values['output-dir'] ?? DEFAULT_OUTPUT_DIR);
  let versions: string[];

  if (values.all || positionals[0] === 'latest') {
    const settings = await loadReleaseFeedSettings(REPO_ROOT);
    const feed = await fetchReleaseFeed({
      url: settings.url,
      timeoutMs: settings.timeoutMs,
    });
    const since = values.since ? normalizeVersion(values.since) : undefined;
    const selected = selectReleaseFeedEntries(feed, {
      since,
      limit: values.all ? limit : 1,
    });
    versions = selected.map(entry => entry.version);
    if (versions.length === 0) throw new Error('No Bun releases matched the feed selection');
  } else {
    versions = [normalizeVersion(positionals[0] ?? Bun.version)];
  }

  const batch = await generateReleaseInventoryBatch({
    versions,
    outputDir,
    check: values.check,
    concurrency,
    repoRoot: REPO_ROOT,
  });

  const summary: ReleaseContractsCliSummary = {
    mode: values.check ? 'check' : 'generate',
    bunVersion: Bun.version,
    outputDir,
    releases: batch.inventories.map(inventory => ({
      version: inventory.inventory.releaseVersion,
      path: inventory.outputPath,
      status: values.check ? 'verified' : inventory.changed ? 'generated' : 'unchanged',
      itemCount: inventory.itemCount,
    })),
    index: {
      path: batch.index.outputPath,
      status: values.check ? 'verified' : batch.index.changed ? 'generated' : 'unchanged',
      releaseCount: batch.index.releaseCount,
    },
  };

  if (values.json) {
    cliOut(summary, { json: true });
    return summary;
  }

  logTable(
    summary.releases.map(row => ({
      version: row.version,
      status: row.status,
      items: row.itemCount,
      path: row.path,
    })),
    ['version', 'status', 'items', 'path']
  );
  console.log(
    `${summary.index.status}: ${summary.index.path} (${summary.index.releaseCount} releases)`
  );
  return summary;
}

if (import.meta.main) {
  try {
    await runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
