// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --compile
/**
 * Bun docs Bundler sidebar nav — institutional SSOT for leaf pages + group aliases.
 * Mirrors https://bun.com/docs/bundler (Core → … → Migration).
 *
 * Used by `tools/bun-doc-refs.ts` CANONICAL_REFS and `bun tools/bun-doc-refs.ts bundler`.
 * @see https://bun.com/docs/bundler/index
 * @see https://bun.com/docs/llms.txt
 */

export type BundlerNavGroup =
  | 'Core'
  | 'Development Server'
  | 'Asset Processing'
  | 'Single File Executable'
  | 'Extensions'
  | 'Optimization'
  | 'Migration';

export type BundlerNavLeaf = {
  group: BundlerNavGroup;
  /** Docs sidebar / page title (primary suggest key). */
  title: string;
  /** Path under https://bun.com/docs/ (no .md). */
  path: string;
  /** Extra suggest / url aliases. */
  aliases?: readonly string[];
};

/** Ordered as in the Bun docs sidebar. */
export const BUNDLER_NAV_LEAVES: readonly BundlerNavLeaf[] = [
  // Core
  { group: 'Core', title: 'Bundler', path: 'bundler/index', aliases: ['bundler', 'bun build'] },
  // Development Server
  {
    group: 'Development Server',
    title: 'Fullstack dev server',
    path: 'bundler/fullstack',
    aliases: ['fullstack'],
  },
  {
    group: 'Development Server',
    title: 'Hot reloading',
    path: 'bundler/hot-reloading',
    aliases: ['hot reloading'],
  },
  // Asset Processing
  {
    group: 'Asset Processing',
    title: 'HTML & static sites',
    path: 'bundler/html-static',
    aliases: ['html-static'],
  },
  {
    group: 'Asset Processing',
    title: 'Standalone HTML',
    path: 'bundler/standalone-html',
    aliases: ['standalone-html'],
  },
  { group: 'Asset Processing', title: 'CSS', path: 'bundler/css' },
  { group: 'Asset Processing', title: 'Loaders', path: 'bundler/loaders', aliases: ['loaders'] },
  // Single File Executable
  {
    group: 'Single File Executable',
    title: 'Single-file executable',
    path: 'bundler/executables',
    aliases: ['Single File Executable', 'bun build --compile', 'executables'],
  },
  // Extensions
  {
    group: 'Extensions',
    title: 'Plugins',
    path: 'bundler/plugins',
    aliases: ['plugins'],
  },
  { group: 'Extensions', title: 'Macros', path: 'bundler/macros', aliases: ['macros'] },
  // Optimization
  {
    group: 'Optimization',
    title: 'Bytecode Caching',
    path: 'bundler/bytecode',
    aliases: ['bytecode'],
  },
  { group: 'Optimization', title: 'Minifier', path: 'bundler/minifier', aliases: ['minifier'] },
  // Migration
  { group: 'Migration', title: 'esbuild', path: 'bundler/esbuild' },
] as const;

/** Sidebar group order. */
export const BUNDLER_NAV_GROUPS: readonly BundlerNavGroup[] = [
  'Core',
  'Development Server',
  'Asset Processing',
  'Single File Executable',
  'Extensions',
  'Optimization',
  'Migration',
] as const;

const DOCS = 'https://bun.com/docs';

export function bundlerDocUrl(path: string, fragment?: string): string {
  const base = `${DOCS}/${path.replace(/^\//, '').replace(/\.md$/, '')}`;
  return fragment ? `${base}#${fragment}` : base;
}

/** First leaf path per group (group-label → landing page). */
export function bundlerNavGroupLanding(): Record<BundlerNavGroup, string> {
  const out = {} as Record<BundlerNavGroup, string>;
  for (const group of BUNDLER_NAV_GROUPS) {
    const leaf = BUNDLER_NAV_LEAVES.find(l => l.group === group);
    if (!leaf) throw new Error(`bundler nav: empty group ${group}`);
    out[group] = bundlerDocUrl(leaf.path);
  }
  return out;
}

/**
 * Flat token → URL map for CANONICAL_REFS merge.
 * Includes leaf titles, aliases, and group labels (→ first leaf in group).
 */
export function bundlerNavCanonicalRefs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const leaf of BUNDLER_NAV_LEAVES) {
    const url = bundlerDocUrl(leaf.path);
    // `bun build` is a CLI phrase — prefer basic-example fragment when used as alias
    if (leaf.title === 'Bundler') {
      out[leaf.title] = url;
      out.bundler = url;
      out['bun build'] = bundlerDocUrl(leaf.path, 'basic-example');
    } else {
      out[leaf.title] = url;
      for (const a of leaf.aliases ?? []) {
        if (a === 'bun build') continue;
        out[a] = url;
      }
    }
  }
  const landing = bundlerNavGroupLanding();
  for (const group of BUNDLER_NAV_GROUPS) {
    // Avoid overwriting a leaf that shares a title with a group (none today)
    if (!(group in out)) out[group] = landing[group];
  }
  return out;
}

/** PascalCase / Title-Case keys that must not trigger annotate. */
export function bundlerNavConceptOnlyKeys(): string[] {
  const keys = new Set<string>();
  for (const leaf of BUNDLER_NAV_LEAVES) {
    if (/^[A-Z][A-Za-z0-9]+$/.test(leaf.title)) keys.add(leaf.title);
  }
  for (const group of BUNDLER_NAV_GROUPS) {
    if (/^[A-Z][A-Za-z0-9]+$/.test(group)) keys.add(group);
  }
  return [...keys];
}

/** Markdown table body for README / docs (no heading). */
export function formatBundlerNavMarkdown(): string {
  const lines: string[] = [];
  for (const group of BUNDLER_NAV_GROUPS) {
    lines.push(`### ${group}`, '', '| Nav | Doc |', '|-----|-----|');
    for (const leaf of BUNDLER_NAV_LEAVES.filter(l => l.group === group)) {
      lines.push(`| ${leaf.title} | [${leaf.path}](${bundlerDocUrl(leaf.path)}) |`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

/** Plain-text tree for CLI. */
export function formatBundlerNavTree(): string {
  const lines: string[] = ['Bundler', ''];
  for (const group of BUNDLER_NAV_GROUPS) {
    lines.push(group);
    for (const leaf of BUNDLER_NAV_LEAVES.filter(l => l.group === group)) {
      lines.push(`  ${leaf.title}`);
      lines.push(`    ${bundlerDocUrl(leaf.path)}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}
