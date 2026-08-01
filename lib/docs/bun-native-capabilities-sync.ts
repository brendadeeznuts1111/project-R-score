// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * Deterministic Bun Markdown adoption evidence for BUN_NATIVE_CAPABILITIES.md.
 *
 * The ast-grep pattern catalog owns syntax matching. This module only selects
 * the Markdown family, records matching source files, and replaces one marked
 * documentation block without rewriting authored sections.
 */
import bunPatternCatalog from '../../.agents/skills/ast-grep/bun-patterns.json' with { type: 'json' };
import { resolvePath } from '../path-bun.ts';

export const BUN_NATIVE_MARKDOWN_SYNC_START = '<!-- bun-native-markdown-sync:start -->';
export const BUN_NATIVE_MARKDOWN_SYNC_END = '<!-- bun-native-markdown-sync:end -->';

export const MARKDOWN_PATTERN_KEYS = [
  'bun-markdown-html',
  'bun-markdown-ansi',
  'bun-markdown-render',
  'bun-markdown-react',
] as const;

export type MarkdownPatternKey = (typeof MARKDOWN_PATTERN_KEYS)[number];

export type MarkdownPattern = {
  key: MarkdownPatternKey;
  name: string;
  pattern: string;
  lang: string;
  docsUrl: string;
};

export type MarkdownAdoptionRow = MarkdownPattern & {
  sourceFiles: string[];
};

export type BunNativeCapabilitiesSyncResult = {
  changed: boolean;
  current: string;
  next: string;
  generatedSection: string;
  rows: MarkdownAdoptionRow[];
};

export type StructuralSearch = (pattern: MarkdownPattern) => Promise<string[]>;

const SOURCE_ROOTS = ['lib', 'scripts', 'tools', 'config', 'packages', 'server'] as const;
const INSERT_BEFORE_HEADING = 'Release maps';
const EXPECTED_DOCUMENT_HEADING = 'Bun native capabilities (platform note)';

function catalogMarkdownPatterns(): MarkdownPattern[] {
  return MARKDOWN_PATTERN_KEYS.map(key => {
    const entry = bunPatternCatalog.patterns.find(pattern => pattern.id === key);
    if (!entry) throw new Error(`Missing ast-grep Bun pattern: ${key}`);
    if (!entry.docs_url) throw new Error(`Missing docs_url for ast-grep Bun pattern: ${key}`);
    return {
      key,
      name: entry.name,
      pattern: entry.pattern,
      lang: entry.lang,
      docsUrl: entry.docs_url,
    };
  });
}

function normalizedHeadingText(children: string): string {
  return children
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse headings with Bun's Markdown callbacks before touching the document. */
export function markdownHeadings(markdown: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  Bun.markdown.render(markdown, {
    heading: (children, { level }) => {
      headings.push({ level, text: normalizedHeadingText(children) });
      return children;
    },
  });
  return headings;
}

function assertExpectedDocument(markdown: string): void {
  const headings = markdownHeadings(markdown);
  if (
    !headings.some(heading => heading.level === 1 && heading.text === EXPECTED_DOCUMENT_HEADING)
  ) {
    throw new Error(
      `Refusing to update unexpected document: missing # ${EXPECTED_DOCUMENT_HEADING}`
    );
  }
}

function markdownLinkForSource(file: string): string {
  return `[\`${file}\`](../${file})`;
}

export function renderMarkdownAdoptionSection(rows: MarkdownAdoptionRow[]): string {
  const lines = [
    '## Native Markdown automation',
    '',
    'This bounded block is generated from the shared ast-grep Bun pattern catalog. Source matches are structural call expressions; comments, strings, and generated bundles are excluded.',
    '',
    BUN_NATIVE_MARKDOWN_SYNC_START,
    '| Primitive | State | Structural owners | Pattern authority |',
    '|-----------|-------|-------------------|-------------------|',
  ];

  for (const row of rows) {
    const state = row.sourceFiles.length > 0 ? 'Adopted' : 'Catalogued';
    const owners =
      row.sourceFiles.length > 0
        ? row.sourceFiles.map(markdownLinkForSource).join('<br>')
        : 'No source call found';
    lines.push(
      `| [\`${row.name}\`](${row.docsUrl}) | ${state} | ${owners} | [\`${row.key}\`](../.agents/skills/ast-grep/bun-patterns.json) |`
    );
  }

  lines.push(
    BUN_NATIVE_MARKDOWN_SYNC_END,
    '',
    'Operator paths: `bun run docs:native:preview` renders the candidate block in-process with the FactoryWager ANSI theme; `bun ./docs/BUN_NATIVE_CAPABILITIES.md` renders the saved file directly.'
  );
  return `${lines.join('\n')}\n`;
}

export function replaceMarkdownAdoptionSection(current: string, generatedSection: string): string {
  assertExpectedDocument(current);
  const start = current.indexOf(BUN_NATIVE_MARKDOWN_SYNC_START);
  const end = current.indexOf(BUN_NATIVE_MARKDOWN_SYNC_END);

  if ((start === -1) !== (end === -1)) {
    throw new Error('Refusing to update a partial Bun native Markdown sync block');
  }

  if (start !== -1 && end !== -1) {
    if (end < start) throw new Error('Bun native Markdown sync markers are out of order');
    const sectionHeading = current.lastIndexOf('## Native Markdown automation', start);
    if (sectionHeading === -1)
      throw new Error('Bun native Markdown sync block has no owning heading');
    const nextHeading = current.indexOf('\n## ', end + BUN_NATIVE_MARKDOWN_SYNC_END.length);
    const replaceEnd = nextHeading === -1 ? current.length : nextHeading + 1;
    return `${current.slice(0, sectionHeading)}${generatedSection}\n${current.slice(replaceEnd)}`;
  }

  const insertion = `\n## ${INSERT_BEFORE_HEADING}\n`;
  const insertionIndex = current.indexOf(insertion);
  if (insertionIndex === -1) {
    throw new Error(`Refusing to update document: missing ## ${INSERT_BEFORE_HEADING}`);
  }
  return `${current.slice(0, insertionIndex)}\n${generatedSection}${current.slice(insertionIndex)}`;
}

function astGrepExecutable(repoRoot: string): string {
  const skillLocal = resolvePath(repoRoot, '.agents/skills/ast-grep/node_modules/.bin/ast-grep');
  const executable = Bun.which('ast-grep') ?? Bun.which('sg');
  if (executable) return executable;
  if (Bun.file(skillLocal).size > 0) return skillLocal;
  throw new Error(
    'ast-grep is required for docs:native:*; run `.agents/skills/ast-grep/scripts/install.sh`'
  );
}

export function createAstGrepSearch(repoRoot: string): StructuralSearch {
  const executable = astGrepExecutable(repoRoot);
  return async ({ pattern, lang }) => {
    const proc = Bun.spawn(
      [
        executable,
        'run',
        '--pattern',
        pattern,
        '--lang',
        lang,
        '--files-with-matches',
        ...SOURCE_ROOTS,
      ],
      { cwd: repoRoot, stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) {
      throw new Error(`ast-grep failed for ${pattern}: ${stderr.trim() || `exit ${exitCode}`}`);
    }
    return [
      ...new Set(
        stdout
          .split('\n')
          .map(file => file.trim())
          .filter(Boolean)
      ),
    ].sort();
  };
}

export async function collectMarkdownAdoption(
  search: StructuralSearch
): Promise<MarkdownAdoptionRow[]> {
  const patterns = catalogMarkdownPatterns();
  return Promise.all(
    patterns.map(async pattern => ({ ...pattern, sourceFiles: await search(pattern) }))
  );
}

export async function syncBunNativeCapabilities(
  current: string,
  search: StructuralSearch
): Promise<BunNativeCapabilitiesSyncResult> {
  const rows = await collectMarkdownAdoption(search);
  const generatedSection = renderMarkdownAdoptionSection(rows);
  const next = replaceMarkdownAdoptionSection(current, generatedSection);
  return { changed: current !== next, current, next, generatedSection, rows };
}
