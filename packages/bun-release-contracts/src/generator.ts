// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/blog/bun-v1.3.14#no-orphans — --no-orphans
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
import { join, resolve } from 'node:path';

export type ReleaseItem = {
  category: string;
  section: string;
  announcement: string;
};

export type ReleaseInventoryItem = ReleaseItem & {
  key: string;
  status: 'planned';
  testPath: null;
};

export type ReleaseInventory = {
  schemaVersion: 1;
  runtime: 'bun';
  releaseVersion: string;
  sourceUrl: string;
  counts: {
    planned: number;
    executable: 0;
  };
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
  return version;
}

export function blogUrlForVersion(version: string): string {
  return `https://bun.com/blog/bun-v${normalizeVersion(version)}`;
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

export async function extractReleaseItems(input: Response | string): Promise<ReleaseItem[]> {
  const response = typeof input === 'string' ? new Response(input) : input;
  const items: ReleaseItem[] = [];
  const headings: Capture[] = [];
  const listItems: Array<Capture & { category: string; section: string }> = [];
  let currentSection = '';
  let currentCategory = 'uncategorized';
  let articleCount = 0;

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
          const heading = normalizeText(capture.parts.join(''));
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
        const capture = { parts: [], category: currentCategory, section: currentSection };
        listItems.push(capture);
        element.onEndTag(() => {
          const announcement = normalizeText(capture.parts.join(''));
          const index = listItems.lastIndexOf(capture);
          if (index >= 0) listItems.splice(index, 1);
          if (!capture.section || announcement.length < 6) return;
          items.push({
            category: capture.category,
            section: capture.section,
            announcement,
          });
        });
      },
      text(chunk) {
        for (const capture of listItems) capture.parts.push(chunk.text);
      },
    });

  await rewriter.transform(response).arrayBuffer();
  if (articleCount === 0) {
    throw new Error('Bun blog markup did not contain an <article> element');
  }

  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.category}\u0000${item.announcement}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return !/^thanks to \d+ contributors?\b/i.test(item.section);
  });
}

function inventoryKey(item: ReleaseItem, index: number): string {
  const suffix = Bun.hash
    .crc32(`${item.category}\u0000${item.announcement}`)
    .toString(16)
    .padStart(8, '0');
  return `${String(index + 1).padStart(3, '0')}-${item.category}-${suffix}`;
}

export function renderReleaseInventory(versionInput: string, items: ReleaseItem[]): string {
  const releaseVersion = normalizeVersion(versionInput);
  const inventoryItems = items.map((item, index): ReleaseInventoryItem => ({
    key: inventoryKey(item, index),
    ...item,
    status: 'planned',
    testPath: null,
  }));
  const inventory: ReleaseInventory = {
    schemaVersion: 1,
    runtime: 'bun',
    releaseVersion,
    sourceUrl: blogUrlForVersion(releaseVersion),
    counts: { planned: inventoryItems.length, executable: 0 },
    items: inventoryItems,
  };
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

export type GenerateReleaseInventoryOptions = {
  version: string;
  outputDir?: string;
  check?: boolean;
  fetchImpl?: typeof fetch;
};

export async function generateReleaseInventory(
  options: GenerateReleaseInventoryOptions
): Promise<{ changed: boolean; itemCount: number; outputPath: string }> {
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
  const content = renderReleaseInventory(version, items);
  const outputFile = Bun.file(outputPath);
  const existing = (await outputFile.exists()) ? await outputFile.text() : null;
  const changed = existing !== content;

  if (options.check) {
    if (changed) throw new Error(`Release inventory is missing or stale: ${outputPath}`);
  } else if (changed) {
    await Bun.write(outputPath, content, { createPath: true });
  }
  return { changed, itemCount: items.length, outputPath };
}
