// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/blog/bun-v1.3.14#no-orphans-exit-when-the-parent-process-dies — --no-orphans
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { blogUrlForReleaseVersion } from '../../../lib/docs/bun-blog-url.ts';

export type ReleaseItem = {
  category: string;
  section: string;
  announcement: string;
};

export type ReleaseInventoryItem = ReleaseItem & { key: string } & (
    { status: 'planned'; testPath: null } | { status: 'covered'; testPath: string }
  );

export type ReleaseInventoryCounts = {
  planned: number;
  executable: number;
};

export type ReleaseInventory = {
  schemaVersion: 2;
  runtime: 'bun';
  releaseVersion: string;
  sourceUrl: string;
  counts: ReleaseInventoryCounts;
  items: ReleaseInventoryItem[];
};

const CATEGORY_MAP: Readonly<Record<string, string>> = {
  'Bun.Image': 'image',
  'Input sources': 'image-inputs',
  'Chainable transforms': 'image-transforms',
  'Resize filters': 'image-filters',
  'Terminal methods': 'image-output',
  'Body integration': 'image-body',
  'Platform-specific formats': 'image-formats',
  'Performance vs sharp': 'image-performance',
  'Global Virtual Store': 'install',
  'HTTP/3 (QUIC) support in Bun.serve': 'http3-server',
  'Experimental HTTP/2 Client for fetch()': 'http2-client',
  'Experimental HTTP/3 Client for fetch()': 'http3-client',
  'Alt-Svc HTTP/3 upgrades': 'http3-upgrade',
  'Rewritten fs.watch() backend': 'fs-watch',
  '--no-orphans': 'orphans',
  Bugfixes: 'bugfixes',
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const DEFAULT_OUTPUT_DIR = resolve(import.meta.dir, '..', 'contracts');

export function normalizeVersion(value: string): string {
  const version = value.trim().replace(/^v/i, '');
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid Bun version ${JSON.stringify(value)}; expected vMAJOR.MINOR.PATCH`);
  }
  const canonical = version
    .split('.')
    .map(component => String(Number(component)))
    .join('.');
  if (version !== canonical) {
    throw new Error(
      `Invalid Bun version ${JSON.stringify(value)}; components must not be zero-padded`
    );
  }
  return version;
}

export function blogUrlForVersion(version: string): string {
  return blogUrlForReleaseVersion(normalizeVersion(version));
}

function decodeHtmlEntities(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 16))
    )
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity);
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
}

function normalizeHeading(value: string): string {
  // Bun's blog appends a visible permalink anchor (`<a class="anchor">#</a>`)
  // inside headings. It is navigation chrome, not part of the release section.
  return normalizeText(value).replace(/\s*#$/, '').trim();
}

function slugify(value: string): string {
  return (
    normalizeText(value)
      .toLowerCase()
      .replace(/[`'"()]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'uncategorized'
  );
}

export function categoryForHeading(heading: string): string {
  const normalized = normalizeText(heading).toLowerCase();
  for (const [title, category] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(title.toLowerCase())) return category;
  }
  return slugify(heading);
}

type Capture = { parts: string[] };
type ItemCapture = Capture & { category: string; section: string; order: number };
type OrderedReleaseItem = ReleaseItem & { order: number };

export async function extractReleaseItems(input: Response | string): Promise<ReleaseItem[]> {
  const response = typeof input === 'string' ? new Response(input) : input;
  const items: OrderedReleaseItem[] = [];
  const headings: Capture[] = [];
  const listItems: ItemCapture[] = [];
  const paragraphs: ItemCapture[] = [];
  let currentSection = '';
  let currentCategory = 'uncategorized';
  let articleCount = 0;
  let nextItemOrder = 0;
  let listDepth = 0;

  const rewriter = new HTMLRewriter()
    .on('article', {
      element() {
        articleCount += 1;
      },
    })
    .on('article h2, article h3', {
      element(element) {
        const capture: Capture = { parts: [] };
        headings.push(capture);
        element.onEndTag(() => {
          const heading = normalizeHeading(capture.parts.join(''));
          const index = headings.lastIndexOf(capture);
          if (index >= 0) headings.splice(index, 1);
          if (!heading) return;
          currentSection = heading;
          currentCategory = categoryForHeading(heading);
        });
      },
      text(chunk) {
        headings.at(-1)?.parts.push(chunk.text);
      },
    })
    .on('article ul li, article ol li', {
      element(element) {
        listDepth += 1;
        const capture = {
          parts: [],
          category: currentCategory,
          section: currentSection,
          order: nextItemOrder++,
        };
        listItems.push(capture);
        element.onEndTag(() => {
          const announcement = normalizeText(capture.parts.join(''));
          const index = listItems.lastIndexOf(capture);
          if (index >= 0) listItems.splice(index, 1);
          listDepth -= 1;
          if (!capture.section || announcement.length < 6) return;
          items.push({
            category: capture.category,
            section: capture.section,
            announcement,
            order: capture.order,
          });
        });
      },
      text(chunk) {
        listItems.at(-1)?.parts.push(chunk.text);
      },
    })
    .on('article p', {
      element(element) {
        if (listDepth > 0) return;
        const capture = {
          parts: [],
          category: currentCategory,
          section: currentSection,
          order: nextItemOrder++,
        };
        paragraphs.push(capture);
        element.onEndTag(() => {
          const announcement = normalizeText(capture.parts.join(''));
          const index = paragraphs.lastIndexOf(capture);
          if (index >= 0) paragraphs.splice(index, 1);
          if (!capture.section || announcement.length < 6) return;
          items.push({
            category: capture.category,
            section: capture.section,
            announcement,
            order: capture.order,
          });
        });
      },
      text(chunk) {
        paragraphs.at(-1)?.parts.push(chunk.text);
      },
    });

  await rewriter.transform(response).arrayBuffer();
  if (articleCount === 0) {
    throw new Error('Bun blog markup did not contain an <article> element');
  }

  const seen = new Set<string>();
  return items
    .sort((left, right) => left.order - right.order)
    .filter(item => {
      const key = `${item.category}\u0000${item.announcement}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return !/^thanks to \d+ contributors?\b/i.test(item.section);
    })
    .map(({ order: _order, ...item }) => item);
}

export function releaseInventoryItemKey(item: ReleaseItem): string {
  const suffix = Bun.hash
    .crc32(`${item.category}\u0000${item.announcement}`)
    .toString(16)
    .padStart(8, '0');
  return `${item.category}-${suffix}`;
}

export function validateReleaseInventoryItemKeys(inventory: ReleaseInventory): void {
  for (const item of inventory.items) {
    const expected = releaseInventoryItemKey(item);
    if (item.key !== expected) {
      throw new Error(
        `Release inventory item key mismatch for ${JSON.stringify(item.announcement)}; expected ${expected}, got ${item.key}`
      );
    }
  }
}

function itemIdentity(item: ReleaseItem): string {
  return `${item.category}\u0000${item.section}\u0000${item.announcement}`;
}

export function parseReleaseInventory(text: string): ReleaseInventory {
  const value = JSON.parse(text) as {
    schemaVersion?: unknown;
    runtime?: unknown;
    releaseVersion?: unknown;
    sourceUrl?: unknown;
    items?: unknown;
  };
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2) {
    throw new Error('Release inventory schemaVersion must be 1 or 2');
  }
  if (
    value.runtime !== 'bun' ||
    typeof value.releaseVersion !== 'string' ||
    typeof value.sourceUrl !== 'string'
  ) {
    throw new Error('Release inventory runtime/releaseVersion/sourceUrl is invalid');
  }
  if (!Array.isArray(value.items)) throw new Error('Release inventory items must be an array');
  const items = value.items.map((raw, index): ReleaseInventoryItem => {
    if (raw == null || typeof raw !== 'object') {
      throw new Error(`Release inventory item ${index} must be an object`);
    }
    const item = raw as Record<string, unknown>;
    for (const field of ['key', 'category', 'section', 'announcement'] as const) {
      if (typeof item[field] !== 'string' || item[field].length === 0) {
        throw new Error(`Release inventory item ${index}.${field} must be a non-empty string`);
      }
    }
    const releaseItemFields = {
      category: item.category as string,
      section: item.section as string,
      announcement: item.announcement as string,
    };
    const expectedKey = releaseInventoryItemKey(releaseItemFields);
    if (value.schemaVersion === 2 && item.key !== expectedKey) {
      throw new Error(
        `Release inventory item ${index}.key mismatch; expected ${expectedKey}, got ${String(item.key)}`
      );
    }
    const releaseItem = {
      key: value.schemaVersion === 1 ? expectedKey : (item.key as string),
      ...releaseItemFields,
    };
    if (item.status === 'planned' && item.testPath === null) {
      return { ...releaseItem, status: 'planned', testPath: null };
    }
    if (
      item.status === 'covered' &&
      typeof item.testPath === 'string' &&
      item.testPath.length > 0
    ) {
      return { ...releaseItem, status: 'covered', testPath: item.testPath };
    }
    throw new Error(
      `Release inventory item ${index} must be planned/null or covered/non-empty testPath`
    );
  });
  const executable = items.filter(item => item.status === 'covered').length;
  return {
    schemaVersion: 2,
    runtime: 'bun',
    releaseVersion: value.releaseVersion,
    sourceUrl: value.sourceUrl,
    counts: { planned: items.length - executable, executable },
    items,
  };
}

export function renderReleaseInventory(
  versionInput: string,
  items: ReleaseItem[],
  previous?: ReleaseInventory
): string {
  const releaseVersion = normalizeVersion(versionInput);
  if (previous) validateReleaseInventoryItemKeys(previous);
  const previousByKey = new Map((previous?.items ?? []).map(item => [item.key, item] as const));
  const previousByIdentity = new Map(
    (previous?.items ?? []).map(item => [itemIdentity(item), item] as const)
  );
  const matchedPreviousItems = new Set<ReleaseInventoryItem>();
  const inventoryItems = items.map((item): ReleaseInventoryItem => {
    const key = releaseInventoryItemKey(item);
    const byKey = previousByKey.get(key);
    const adopted =
      byKey?.category === item.category && byKey.announcement === item.announcement
        ? byKey
        : previousByIdentity.get(itemIdentity(item));
    if (adopted) matchedPreviousItems.add(adopted);
    const coverage =
      adopted?.status === 'covered' && typeof adopted.testPath === 'string'
        ? ({ status: 'covered', testPath: adopted.testPath } as const)
        : ({ status: 'planned', testPath: null } as const);
    return { key, ...item, ...coverage };
  });
  const unmatchedCovered = (previous?.items ?? []).filter(
    item => item.status === 'covered' && !matchedPreviousItems.has(item)
  );
  if (unmatchedCovered.length > 0) {
    throw new Error(
      `Covered release inventory items no longer match the release post:\n${unmatchedCovered
        .map(item => `${item.key}: ${item.announcement}`)
        .join('\n')}`
    );
  }
  const executable = inventoryItems.filter(item => item.status === 'covered').length;
  const inventory: ReleaseInventory = {
    schemaVersion: 2,
    runtime: 'bun',
    releaseVersion,
    sourceUrl: blogUrlForVersion(releaseVersion),
    counts: { planned: inventoryItems.length - executable, executable },
    items: inventoryItems,
  };
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

export type GenerateReleaseInventoryOptions = {
  version: string;
  outputDir?: string;
  check?: boolean;
  fetchImpl?: typeof fetch;
  repoRoot?: string;
};

export type PreparedReleaseInventory = {
  changed: boolean;
  itemCount: number;
  outputPath: string;
  content: string;
  existingContent: string | null;
  inventory: ReleaseInventory;
};

async function resolveRealPath(path: string): Promise<string> {
  const proc = Bun.spawn(['realpath', path], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const resolvedPath = stdout.trim();
  if (exitCode !== 0 || !resolvedPath) {
    const detail = stderr.trim();
    throw new Error(`realpath failed for ${path}${detail ? `: ${detail}` : ''}`);
  }
  return resolvedPath;
}

export async function validateReleaseInventoryCoverage(
  inventory: ReleaseInventory,
  repoRoot = resolve(import.meta.dir, '..', '..', '..')
): Promise<void> {
  const errors: string[] = [];
  const resolvedRepoRoot = await resolveRealPath(repoRoot);
  for (const item of inventory.items) {
    if (item.status === 'planned') continue;
    if (!item.testPath || isAbsolute(item.testPath)) {
      errors.push(`${item.key}: covered testPath must be repository-relative`);
      continue;
    }
    const absolutePath = resolve(repoRoot, item.testPath);
    const relativePath = relative(repoRoot, absolutePath);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      errors.push(`${item.key}: covered testPath escapes the repository`);
      continue;
    }
    const portableRelativePath = relativePath.split(sep).join('/');
    if (!/^tests\/(?:[^/]+\/)*[^/]+\.test\.ts$/.test(portableRelativePath)) {
      errors.push(`${item.key}: covered testPath must point to a tests/**/*.test.ts file`);
      continue;
    }
    try {
      const pathStat = await Bun.file(absolutePath).stat();
      const resolvedPath = await resolveRealPath(absolutePath);
      const resolvedRelativePath = relative(resolvedRepoRoot, resolvedPath);
      if (
        resolvedRelativePath === '..' ||
        resolvedRelativePath.startsWith(`..${sep}`) ||
        isAbsolute(resolvedRelativePath)
      ) {
        errors.push(`${item.key}: covered testPath resolves outside the repository`);
      } else if (
        !/^tests\/(?:[^/]+\/)*[^/]+\.test\.ts$/.test(resolvedRelativePath.split(sep).join('/'))
      ) {
        errors.push(`${item.key}: covered testPath resolves to a non-test file`);
      } else if (!pathStat.isFile()) {
        errors.push(`${item.key}: covered testPath is not a regular file: ${item.testPath}`);
      }
    } catch (error) {
      const code =
        error != null && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : undefined;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        errors.push(`${item.key}: covered testPath does not exist: ${item.testPath}`);
      } else {
        errors.push(
          `${item.key}: covered testPath could not be inspected: ${item.testPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }
  if (errors.length > 0)
    throw new Error(`Invalid release inventory coverage:\n${errors.join('\n')}`);
}

export async function prepareReleaseInventory(
  options: GenerateReleaseInventoryOptions
): Promise<PreparedReleaseInventory> {
  const version = normalizeVersion(options.version);
  const url = blogUrlForVersion(version);
  const response = await (options.fetchImpl ?? fetch)(url, {
    headers: { 'user-agent': 'factorywager-bun-release-inventory/0.1' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const items = await extractReleaseItems(response);
  if (items.length === 0) throw new Error(`No release announcements found in ${url}`);

  const outputDir = resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR);
  const outputPath = join(outputDir, `bun-v${version}.json`);
  const outputFile = Bun.file(outputPath);
  const existingContent = (await outputFile.exists()) ? await outputFile.text() : null;
  const previous = existingContent == null ? undefined : parseReleaseInventory(existingContent);
  const content = renderReleaseInventory(version, items, previous);
  const inventory = parseReleaseInventory(content);
  await validateReleaseInventoryCoverage(inventory, options.repoRoot);
  const changed = existingContent !== content;

  return { changed, itemCount: items.length, outputPath, content, existingContent, inventory };
}

export async function generateReleaseInventory(
  options: GenerateReleaseInventoryOptions
): Promise<{ changed: boolean; itemCount: number; outputPath: string }> {
  const prepared = await prepareReleaseInventory(options);

  if (options.check) {
    if (prepared.changed) {
      throw new Error(`Release inventory is missing or stale: ${prepared.outputPath}`);
    }
  } else if (prepared.changed) {
    await Bun.write(prepared.outputPath, prepared.content, { createPath: true });
  }
  return {
    changed: prepared.changed,
    itemCount: prepared.itemCount,
    outputPath: prepared.outputPath,
  };
}
