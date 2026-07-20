// tools/bun-docs-mcp-format.ts — Compact MCP output formatters (token-aware)

import type {
  BlogPostSummary,
  DocCategory,
  IndexMeta,
  QueryHit,
  ReleaseNote,
  SearchHit,
} from './bun-docs-mcp-lib.ts';

export const DEFAULTS = {
  searchLimit: 8,
  queryLimit: 12,
  queryContext: 2,
  readMaxLines: 150,
  blogMaxLines: 100,
  blogListLimit: 8,
  topicListLimit: 40,
  snippetLen: 100,
  rssSummaryLen: 220,
  rssCacheMs: 300_000,
} as const;

export function formatSearchHits(results: SearchHit[], docsBase = 'https://bun.com/docs'): string {
  if (!results.length) return '';
  return (
    `${docsBase}\n\n` +
    results
      .map((r, i) => {
        const desc = r.desc.length > 90 ? `${r.desc.slice(0, 90)}…` : r.desc;
        return `${i + 1}. **${r.title}** (\`${r.slug}\`)\n   ${desc}\n   ${r.snippet}`;
      })
      .join('\n\n')
  );
}

export function formatQueryHits(hits: QueryHit[], engine: string): string {
  if (!hits.length) return '';
  return (
    `engine: ${engine}\n\n` +
    hits.map((h, i) => `${i + 1}. \`${h.slug}\`:${h.line}\n${h.context || h.text}`).join('\n\n')
  );
}

export function formatDocPage(
  title: string,
  desc: string,
  slug: string,
  content: string,
  docsBase = 'https://bun.com/docs'
): string {
  const header = desc
    ? `# ${title}\n${desc}\n${docsBase}/${slug}\n\n---\n\n`
    : `# ${title}\n${docsBase}/${slug}\n\n---\n\n`;
  return header + content;
}

export function formatBlogPost(
  title: string,
  slug: string,
  content: string,
  blogBase = 'https://bun.com/blog'
): string {
  return `# ${title}\n${blogBase}/${slug}\n\n---\n\n${content}`;
}

export function formatRssItems(
  items: ReleaseNote[] | BlogPostSummary[],
  blogBase = 'https://bun.com/blog'
): string {
  return items
    .map((item, i) => {
      const slug = 'slug' in item ? item.slug : item.link.replace(`${blogBase}/`, '');
      const summary =
        item.summary.length > DEFAULTS.rssSummaryLen
          ? `${item.summary.slice(0, DEFAULTS.rssSummaryLen)}…`
          : item.summary;
      return `${i + 1}. **${item.title}** (\`${slug}\`)\n   ${item.date}\n   ${summary}`;
    })
    .join('\n\n');
}

export function formatCategories(cats: DocCategory[]): string {
  return cats
    .map(c => `- **${c.category}** (${c.count}): ${c.examples.slice(0, 3).join(', ')}`)
    .join('\n');
}

export function formatTopics(
  topics: { slug: string; title: string }[],
  meta: { docsVersion: string; category?: string; truncated?: boolean }
): string {
  const header = `bun-types ${meta.docsVersion}${meta.category ? ` · ${meta.category}` : ''} · ${topics.length} topics`;
  const lines = topics.map(t => `- \`${t.slug}\` — ${t.title}`);
  const footer = meta.truncated ? '\n\n(use category filter or search_bun_docs for more)' : '';
  return `${header}\n\n${lines.join('\n')}${footer}`;
}

export function formatIndexMeta(meta: IndexMeta | null): string {
  if (!meta) return '{}';
  return JSON.stringify(
    {
      docsVersion: meta.docsVersion,
      runtimeVersion: meta.runtimeVersion,
      stale: meta.stale,
      docCount: meta.docCount,
      docs: meta.docsBaseUrl,
      blog: meta.blogBaseUrl,
      rss: meta.rssUrl,
    },
    null,
    2
  );
}

export function formatCatalogEntry(entry: {
  name: string;
  type: string;
  stability: string;
  section: string;
  description?: string;
  releasedIn?: string;
  fixedIn?: string;
  changedIn?: string;
  docsUrl?: string;
  blogUrl?: string;
  releaseUrl?: string;
}): string {
  const lines = [
    `**${entry.name}** (${entry.type}, ${entry.stability}, ${entry.section})`,
    entry.description ?? '',
    entry.docsUrl ? `docs: ${entry.docsUrl}` : '',
    entry.releasedIn ? `ship: ${entry.releasedIn}` : '',
    entry.fixedIn ? `fix: ${entry.fixedIn}` : '',
    entry.changedIn ? `chg: ${entry.changedIn}` : '',
    entry.blogUrl ? `blog: ${entry.blogUrl}` : '',
    entry.releaseUrl ? `release: ${entry.releaseUrl}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export function formatCuratedEntry(entry: Record<string, unknown>): string {
  const { term, path, description, url, minVersion, stability, related } = entry as {
    term: string;
    path: string;
    description: string;
    url: string;
    minVersion?: string;
    stability?: string;
    related?: string[];
  };
  const lines = [`**${term}** → \`${path}\``, url, description];
  if (minVersion) lines.push(`min: ${minVersion}`);
  if (stability) lines.push(`stability: ${stability}`);
  if (related?.length) lines.push(`related: ${related.slice(0, 4).join(', ')}`);
  return lines.join('\n');
}
