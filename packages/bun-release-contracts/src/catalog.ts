// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
import { basename, join, resolve } from 'node:path';
import {
  blogUrlForVersion,
  normalizeVersion,
  parseReleaseInventory,
  renderReleaseInventory,
  validateReleaseInventoryCoverage,
  validateReleaseInventoryItemKeys,
  type ReleaseInventory,
  type ReleaseInventoryCounts,
} from './generator';
import { compareReleaseVersions } from './feed';

export type ReleaseInventoryIndexEntry = {
  releaseVersion: string;
  sourceUrl: string;
  file: string;
  counts: ReleaseInventoryCounts;
};

export type ReleaseInventoryIndex = {
  schemaVersion: 1;
  runtime: 'bun';
  counts: ReleaseInventoryCounts & { releases: number };
  releases: ReleaseInventoryIndexEntry[];
};

export type PreparedReleaseInventoryIndex = {
  changed: boolean;
  outputPath: string;
  content: string;
  existingContent: string | null;
  releaseCount: number;
};

export type ReleaseInventoryDirectoryValidation = ReleaseInventoryCounts & {
  releases: number;
};

function validateInventoryIdentity(
  inventory: ReleaseInventory,
  scannedFile?: string
): { file: string; semanticVersion: string } {
  validateReleaseInventoryItemKeys(inventory);
  const normalizedVersion = normalizeVersion(inventory.releaseVersion);
  if (inventory.releaseVersion !== normalizedVersion) {
    throw new Error(
      `Release inventory version must be normalized: ${JSON.stringify(inventory.releaseVersion)}`
    );
  }

  const semanticVersion = normalizedVersion
    .split('.')
    .map(component => String(Number(component)))
    .join('.');
  if (semanticVersion !== normalizedVersion) {
    throw new Error(`Release inventory version is not canonical: ${inventory.releaseVersion}`);
  }

  const file = `bun-v${normalizedVersion}.json`;
  if (scannedFile != null && basename(scannedFile) !== file) {
    throw new Error(
      `Release inventory filename ${JSON.stringify(basename(scannedFile))} does not match internal version ${normalizedVersion}; expected ${file}`
    );
  }

  const canonicalSourceUrl = blogUrlForVersion(normalizedVersion);
  if (inventory.sourceUrl !== canonicalSourceUrl) {
    throw new Error(
      `Release inventory ${file} has non-canonical sourceUrl; expected ${canonicalSourceUrl}`
    );
  }

  const seenKeys = new Set<string>();
  for (const item of inventory.items) {
    if (seenKeys.has(item.key)) {
      throw new Error(`Release inventory ${file} contains duplicate item key: ${item.key}`);
    }
    seenKeys.add(item.key);
  }

  return { file, semanticVersion };
}

function indexEntries(inventories: ReleaseInventory[]): ReleaseInventoryIndexEntry[] {
  const seenVersions = new Set<string>();
  const seenFiles = new Set<string>();
  return [...inventories]
    .sort((a, b) => compareReleaseVersions(b.releaseVersion, a.releaseVersion))
    .map((inventory): ReleaseInventoryIndexEntry => {
      const { file, semanticVersion } = validateInventoryIdentity(inventory);
      if (seenVersions.has(semanticVersion)) {
        throw new Error(`Duplicate release inventory version: ${inventory.releaseVersion}`);
      }
      if (seenFiles.has(file)) {
        throw new Error(`Duplicate release inventory file: ${file}`);
      }
      seenVersions.add(semanticVersion);
      seenFiles.add(file);
      return {
        releaseVersion: inventory.releaseVersion,
        sourceUrl: inventory.sourceUrl,
        file,
        counts: inventory.counts,
      };
    });
}

export async function readReleaseInventories(outputDir: string): Promise<ReleaseInventory[]> {
  const inventories: ReleaseInventory[] = [];
  try {
    if (!(await Bun.file(outputDir).stat()).isDirectory()) {
      throw new Error(`Release inventory output path is not a directory: ${outputDir}`);
    }
  } catch (error) {
    const code =
      error != null && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT') return inventories;
    throw error;
  }
  const seenVersions = new Set<string>();
  const seenFiles = new Set<string>();
  const glob = new Bun.Glob('bun-v*.json');
  for await (const relativePath of glob.scan({ cwd: outputDir, onlyFiles: true })) {
    const inventory = parseReleaseInventory(await Bun.file(join(outputDir, relativePath)).text());
    const { file, semanticVersion } = validateInventoryIdentity(inventory, relativePath);
    if (seenVersions.has(semanticVersion)) {
      throw new Error(`Duplicate release inventory version: ${inventory.releaseVersion}`);
    }
    if (seenFiles.has(file)) throw new Error(`Duplicate release inventory file: ${file}`);
    seenVersions.add(semanticVersion);
    seenFiles.add(file);
    inventories.push(inventory);
  }
  inventories.sort((a, b) => compareReleaseVersions(b.releaseVersion, a.releaseVersion));
  return inventories;
}

export function renderReleaseInventoryIndex(inventories: ReleaseInventory[]): string {
  const releases = indexEntries(inventories);
  const index: ReleaseInventoryIndex = {
    schemaVersion: 1,
    runtime: 'bun',
    counts: {
      releases: releases.length,
      planned: releases.reduce((sum, entry) => sum + entry.counts.planned, 0),
      executable: releases.reduce((sum, entry) => sum + entry.counts.executable, 0),
    },
    releases,
  };
  return `${JSON.stringify(index, null, 2)}\n`;
}

/**
 * Validate committed release contracts without fetching upstream release pages.
 *
 * This is the CI boundary: every covered test path must resolve inside the
 * repository, every inventory must be canonical byte-for-byte, and index.json
 * must be the exact aggregate derived from those inventories.
 */
export async function validateReleaseInventoryDirectory(options: {
  outputDir: string;
  repoRoot?: string;
}): Promise<ReleaseInventoryDirectoryValidation> {
  const outputDir = resolve(options.outputDir);
  const inventories = await readReleaseInventories(outputDir);
  if (inventories.length === 0) {
    throw new Error(`No Bun release inventories found in ${outputDir}`);
  }

  for (const inventory of inventories) {
    await validateReleaseInventoryCoverage(inventory, options.repoRoot);
    const inventoryPath = join(outputDir, `bun-v${inventory.releaseVersion}.json`);
    const expected = renderReleaseInventory(inventory.releaseVersion, inventory.items, inventory);
    if ((await Bun.file(inventoryPath).text()) !== expected) {
      throw new Error(`Release inventory is not canonical: ${inventoryPath}`);
    }
  }

  const indexPath = join(outputDir, 'index.json');
  const expectedIndex = renderReleaseInventoryIndex(inventories);
  if (
    !(await Bun.file(indexPath).exists()) ||
    (await Bun.file(indexPath).text()) !== expectedIndex
  ) {
    throw new Error(`Release inventory index is missing or stale: ${indexPath}`);
  }

  return {
    releases: inventories.length,
    planned: inventories.reduce((sum, inventory) => sum + inventory.counts.planned, 0),
    executable: inventories.reduce((sum, inventory) => sum + inventory.counts.executable, 0),
  };
}

export async function prepareReleaseInventoryIndex(options: {
  outputDir: string;
  replacements?: ReleaseInventory[];
  repoRoot?: string;
}): Promise<PreparedReleaseInventoryIndex> {
  const outputDir = resolve(options.outputDir);
  const inventoriesByVersion = new Map(
    (await readReleaseInventories(outputDir)).map(inventory => [
      inventory.releaseVersion,
      inventory,
    ])
  );
  for (const replacement of options.replacements ?? []) {
    validateInventoryIdentity(replacement);
    inventoriesByVersion.set(replacement.releaseVersion, replacement);
  }
  const inventories = [...inventoriesByVersion.values()];
  for (const inventory of inventories) {
    await validateReleaseInventoryCoverage(inventory, options.repoRoot);
  }

  const content = renderReleaseInventoryIndex(inventories);
  const outputPath = join(outputDir, 'index.json');
  const outputFile = Bun.file(outputPath);
  const existingContent = (await outputFile.exists()) ? await outputFile.text() : null;
  return {
    changed: existingContent !== content,
    outputPath,
    content,
    existingContent,
    releaseCount: inventories.length,
  };
}

export async function syncReleaseInventoryIndex(options: {
  outputDir: string;
  check?: boolean;
  repoRoot?: string;
}): Promise<{ changed: boolean; outputPath: string; releaseCount: number }> {
  const prepared = await prepareReleaseInventoryIndex(options);

  if (options.check) {
    if (prepared.changed) {
      throw new Error(`Release inventory index is missing or stale: ${prepared.outputPath}`);
    }
  } else if (prepared.changed) {
    await Bun.write(prepared.outputPath, prepared.content, { createPath: true });
  }
  return {
    changed: prepared.changed,
    outputPath: basename(prepared.outputPath),
    releaseCount: prepared.releaseCount,
  };
}
