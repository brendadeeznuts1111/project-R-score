#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// tools/bun-docs-mcp.ts — MCP server for local bun-types MDX docs (zero npm deps)

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { getCuratedEntry, searchCuratedEntries } from './bun-docs-curated.ts';
import {
  DEFAULTS,
  formatBlogPost,
  formatCategories,
  formatCatalogEntry,
  formatCuratedEntry,
  formatDocPage,
  formatIndexMeta,
  formatQueryHits,
  formatRssItems,
  formatSearchHits,
  formatTopics,
} from './bun-docs-mcp-format.ts';
import {
  buildDocIndex,
  buildSlugMap,
  fetchBlogPost,
  fetchBlogPosts,
  getIndexMeta,
  listCategories,
  listTopics,
  queryDocs,
  readDocPage,
  searchDocsAsync,
  type Doc,
  type IndexMeta,
} from './bun-docs-mcp-lib.ts';
import {
  readJsonRpcStream,
  rpcErr,
  rpcOk,
  toolText,
  writeJsonRpc,
  type JsonRpcMessage,
  type ToolCallResult,
} from '../lib/mcp/stdio-jsonrpc.ts';

const MANIFEST_VERSION = '1.3.0';
const SERVER_NAME = 'bun-docs';
const SERVER_VERSION = '1.3.0';

let docs: Doc[] = [];
let slugMap = new Map<string, Doc>();
let docsRoot = '';
let docsVersion = '0.0.0';
let indexMeta: IndexMeta | null = null;

const SEARCH_SCHEMA = {
  type: 'object' as const,
  properties: {
    query: { type: 'string', description: "Keywords (e.g. 'Bun.Image', 'http3')" },
    limit: { type: 'number', description: `Max results (default ${DEFAULTS.searchLimit})` },
    category: { type: 'string', description: 'Slug prefix: runtime, pm, guides, test, bundler' },
    codeOnly: { type: 'boolean', description: 'Search fenced code blocks only' },
  },
  required: ['query'],
};

const TOOLS = [
  {
    name: 'search_bun_docs',
    description: 'Search Bun docs by keyword. Returns compact ranked hits with slugs and snippets.',
    inputSchema: SEARCH_SCHEMA,
  },
  { name: 'search_bun', description: 'Alias for search_bun_docs.', inputSchema: SEARCH_SCHEMA },
  {
    name: 'query_bun_docs',
    description:
      'Exact pattern search with line context (ripgrep). Best for API strings and flags.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: "Pattern (e.g. 'http3: true')" },
        contextLines: {
          type: 'number',
          description: `Context lines (default ${DEFAULTS.queryContext})`,
        },
        limit: { type: 'number', description: `Max matches (default ${DEFAULTS.queryLimit})` },
        category: { type: 'string', description: 'Slug prefix filter' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'read_bun_doc',
    description: `Read a doc page by slug. Cleaned markdown; defaults to ${DEFAULTS.readMaxLines} lines.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: "e.g. 'runtime/image'" },
        section: { type: 'string', description: '## heading substring' },
        maxLines: { type: 'number', description: '0 = full page' },
        raw: { type: 'boolean', description: 'Raw MDX' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_bun_doc_entry',
    description:
      'Catalog-first token lookup (Bun.Image, --filter, install.linker, …) → NOTE/SHIP/FIX/BLOG/DOC; falls back to curated hot-path.',
    inputSchema: {
      type: 'object' as const,
      properties: { term: { type: 'string' } },
      required: ['term'],
    },
  },
  {
    name: 'list_bun_categories',
    description: 'Top-level doc categories with counts. Use before list_bun_topics.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_bun_topics',
    description: `List doc slugs/titles. Pass category or limit (default ${DEFAULTS.topicListLimit}).`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by prefix (recommended)' },
        limit: { type: 'number', description: 'Max topics returned' },
      },
    },
  },
  {
    name: 'get_bun_blog_posts',
    description:
      'Recent Bun blog/release posts from bun.com/rss.xml. Same feed for releases + blog.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: `Posts (default ${DEFAULTS.blogListLimit})` },
      },
    },
  },
  {
    name: 'read_bun_blog_post',
    description: `Fetch blog post as text (slug or URL). Defaults to ${DEFAULTS.blogMaxLines} lines.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: "e.g. 'bun-v1.3.14'" },
        maxLines: { type: 'number', description: '0 = full post' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_bun_docs_index',
    description: 'Index metadata: versions, counts, staleness, base URLs.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
];

function ok(id: number | string | undefined, result: ToolCallResult): JsonRpcMessage {
  return rpcOk(id, result);
}

function parseNum(v: unknown, fallback: number): number {
  return typeof v === 'number' ? v : fallback;
}

async function handleToolsCall(
  id: number | string | undefined,
  params: Record<string, unknown>
): Promise<JsonRpcMessage> {
  const tool = params?.name as string;
  const args = (params?.arguments ?? {}) as Record<string, unknown>;

  switch (tool) {
    case 'search_bun_docs':
    case 'search_bun': {
      const query = String(args.query ?? '');
      const results = await searchDocsAsync(
        docs,
        query,
        parseNum(args.limit, DEFAULTS.searchLimit),
        typeof args.category === 'string' ? args.category : undefined,
        args.codeOnly === true
      );
      if (!results.length) return ok(id, toolText(`No results for "${query}".`));
      return ok(id, toolText(formatSearchHits(results)));
    }

    case 'query_bun_docs': {
      const pattern = String(args.pattern ?? '');
      if (!pattern) return ok(id, toolText('pattern is required', true));
      const { hits, engine } = await queryDocs(docs, docsRoot, pattern, {
        contextLines: parseNum(args.contextLines, DEFAULTS.queryContext),
        limit: parseNum(args.limit, DEFAULTS.queryLimit),
        category: typeof args.category === 'string' ? args.category : undefined,
      });
      if (!hits.length) return ok(id, toolText(`No matches for /${pattern}/ (${engine}).`));
      return ok(id, toolText(formatQueryHits(hits, engine)));
    }

    case 'read_bun_doc': {
      const maxLines =
        args.maxLines === 0 ? undefined : parseNum(args.maxLines, DEFAULTS.readMaxLines);
      const page = await readDocPage(docs, String(args.slug ?? ''), {
        slugMap,
        section: typeof args.section === 'string' ? args.section : undefined,
        maxLines,
        raw: args.raw === true,
      });
      if (!page) return ok(id, toolText(`Not found: "${args.slug}". Try search_bun_docs.`, true));
      return ok(
        id,
        toolText(formatDocPage(page.title, page.desc, String(args.slug), page.content))
      );
    }

    case 'get_bun_doc_entry': {
      const term = String(args.term ?? '');
      try {
        const { getCatalogEntry } = await import('./bun-docs-catalog.ts');
        const cat = await getCatalogEntry(term);
        if (cat) return ok(id, toolText(formatCatalogEntry(cat)));
      } catch {
        /* catalog optional */
      }
      const entry = getCuratedEntry(term) ?? searchCuratedEntries(term, 1)[0];
      if (!entry) return ok(id, toolText(`No entry for "${term}".`, true));
      return ok(id, toolText(formatCuratedEntry(entry as unknown as Record<string, unknown>)));
    }

    case 'list_bun_categories':
      return ok(id, toolText(formatCategories(listCategories(docs))));

    case 'list_bun_topics': {
      const category =
        typeof args.category === 'string' ? args.category.replace(/^\/+|\/+$/g, '') : '';
      const limit = parseNum(args.limit, DEFAULTS.topicListLimit);
      let topics = listTopics(docs);
      if (category) topics = topics.filter(t => t.slug.startsWith(category));
      const truncated = topics.length > limit;
      topics = topics.slice(0, limit);
      const stale = indexMeta?.stale
        ? `\n⚠ docs ${indexMeta.docsVersion} < runtime ${indexMeta.runtimeVersion}`
        : '';
      return ok(
        id,
        toolText(
          formatTopics(topics, { docsVersion, category: category || undefined, truncated }) + stale
        )
      );
    }

    case 'get_bun_blog_posts':
      try {
        const posts = await fetchBlogPosts(parseNum(args.limit, DEFAULTS.blogListLimit));
        return ok(id, toolText(formatRssItems(posts)));
      } catch (err) {
        return ok(id, toolText(`RSS fetch failed: ${err}`, true));
      }

    case 'read_bun_blog_post':
      try {
        const maxLines =
          args.maxLines === 0 ? undefined : parseNum(args.maxLines, DEFAULTS.blogMaxLines);
        const post = await fetchBlogPost(String(args.slug ?? ''), { maxLines });
        return ok(id, toolText(formatBlogPost(post.title, post.slug, post.content)));
      } catch (err) {
        return ok(id, toolText(`Blog fetch failed: ${err}`, true));
      }

    case 'get_bun_docs_index':
      return ok(id, toolText(formatIndexMeta(indexMeta)));

    default:
      return rpcErr(id, -32601, `Unknown tool: ${tool}`);
  }
}

function handleRequest(msg: JsonRpcMessage): JsonRpcMessage | null {
  const { method, id } = msg;
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) return null;

  switch (method) {
    case 'initialize':
      return rpcOk(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION,
          manifestVersion: MANIFEST_VERSION,
        },
      });
    case 'tools/list':
      return rpcOk(id, { tools: TOOLS });
    default:
      return id !== undefined ? rpcErr(id, -32601, `Unknown method: ${method}`) : null;
  }
}

async function main() {
  const workspaceRoot = Bun.env.BUN_DOCS_ROOT || process.cwd();
  const built = await buildDocIndex(workspaceRoot);
  docs = built.docs;
  slugMap = buildSlugMap(docs);
  docsRoot = built.docsRoot;
  docsVersion = built.docsVersion;
  indexMeta = getIndexMeta(docs, docsRoot, docsVersion);

  const log = (s: string) => process.stderr.write(`${s}\n`);
  log(
    `[${SERVER_NAME}] v${SERVER_VERSION} · ${docs.length} docs (bun-types ${docsVersion}) · rg:${Bun.which('rg') ? 'yes' : 'no'}`
  );
  if (indexMeta.stale)
    log(`[${SERVER_NAME}] ⚠ docs ${docsVersion} < runtime ${indexMeta.runtimeVersion}`);

  for await (const msg of readJsonRpcStream(Bun.stdin.stream())) {
    try {
      if (msg.method === 'tools/call') {
        writeJsonRpc(await handleToolsCall(msg.id, (msg.params ?? {}) as Record<string, unknown>));
        continue;
      }
      const response = handleRequest(msg);
      if (response) writeJsonRpc(response);
    } catch (e) {
      log(`[bun-docs-mcp] ${e}`);
    }
  }
}

if (import.meta.main) {
  void main();
}
