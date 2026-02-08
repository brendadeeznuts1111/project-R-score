#!/usr/bin/env bun
// tools/bun-docs-mcp.ts — MCP server for local bun-types MDX docs
// Zero dependencies. Indexes 313 MDX files, exposes search + read over stdio.
// Max 300 lines.

// --- Types ---
type Doc = { path: string; slug: string; title: string; desc: string; content: string };
type JsonRpc = { jsonrpc: "2.0"; id?: number | string; method?: string; params?: any };

// --- Index ---
const docs: Doc[] = [];
let docsRoot = "";

async function buildIndex() {
  // Find bun-types/docs anywhere under the project
  const glob = new Bun.Glob("**/bun-types/docs/**/*.mdx");
  const root = process.env.BUN_DOCS_ROOT || process.cwd();
  const seen = new Set<string>();

  for await (const path of glob.scan({ cwd: root, absolute: true })) {
    // Take the first bun-types/docs tree we find, skip dupes from other node_modules
    const docsIdx = path.indexOf("bun-types/docs/");
    if (docsIdx === -1) continue;
    const thisRoot = path.slice(0, docsIdx + "bun-types/docs/".length);
    if (!docsRoot) docsRoot = thisRoot;
    if (thisRoot !== docsRoot) continue;

    const slug = path.slice(docsRoot.length).replace(/\.mdx$/, "");
    if (seen.has(slug)) continue;
    seen.add(slug);

    const raw = await Bun.file(path).text();
    const { title, desc, body } = parseFrontmatter(raw);
    docs.push({ path, slug, title, desc, content: body });
  }

  // Sort by slug for stable ordering
  docs.sort((a, b) => a.slug.localeCompare(b.slug));
}

function parseFrontmatter(raw: string): { title: string; desc: string; body: string } {
  if (!raw.startsWith("---")) return { title: "", desc: "", body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { title: "", desc: "", body: raw };
  const fm = raw.slice(4, end);
  const body = raw.slice(end + 4).trim();
  let title = "", desc = "";
  for (const line of fm.split("\n")) {
    const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (!m) continue;
    if (m[1] === "title") title = m[2];
    if (m[1] === "description") desc = m[2];
  }
  return { title, desc, body };
}

// --- Search ---
function searchDocs(query: string, limit = 10): { slug: string; title: string; desc: string; score: number }[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const results: { slug: string; title: string; desc: string; score: number }[] = [];

  for (const doc of docs) {
    let score = 0;
    const titleLow = doc.title.toLowerCase();
    const descLow = doc.desc.toLowerCase();
    const slugLow = doc.slug.toLowerCase();
    const contentLow = doc.content.toLowerCase();

    for (const term of terms) {
      // Title match is highest signal
      if (titleLow.includes(term)) score += 10;
      // Slug match (file path) is strong signal
      if (slugLow.includes(term)) score += 6;
      // Description match
      if (descLow.includes(term)) score += 4;
      // Content match — count occurrences, cap at 5
      const contentHits = countOccurrences(contentLow, term);
      score += Math.min(contentHits, 5) * 1;
    }

    if (score > 0) results.push({ slug: doc.slug, title: doc.title, desc: doc.desc, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0, idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
  return count;
}

// --- Read ---
function readDoc(slug: string): { title: string; desc: string; content: string } | null {
  const doc = docs.find(d => d.slug === slug);
  if (!doc) return null;
  return { title: doc.title, desc: doc.desc, content: doc.content };
}

function listTopics(): { slug: string; title: string }[] {
  return docs.map(d => ({ slug: d.slug, title: d.title }));
}

// --- MCP Protocol (stdio with Content-Length framing) ---
const TOOLS = [
  {
    name: "search_bun_docs",
    description: "Search Bun documentation by keyword. Returns ranked results with titles and descriptions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search keywords (e.g. 'sqlite', 'websocket server', 'file io')" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_bun_doc",
    description: "Read the full content of a Bun documentation page by its slug (e.g. 'runtime/sqlite', 'guides/http/cluster').",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Doc slug from search results (e.g. 'runtime/sqlite')" },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_bun_topics",
    description: "List all available Bun documentation topics with their slugs and titles.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

function handleRequest(msg: JsonRpc): object | null {
  const { method, id, params } = msg;

  // Notifications (no id) — just acknowledge
  if (method === "notifications/initialized") return null;
  if (method?.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "bun-docs", version: "1.0.0" },
        },
      };

    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: TOOLS } };

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments ?? {};

      if (toolName === "search_bun_docs") {
        const results = searchDocs(args.query, args.limit);
        const text = results.length === 0
          ? `No results for "${args.query}".`
          : results.map((r, i) => `${i + 1}. **${r.title}** (${r.slug})\n   ${r.desc} [score: ${r.score}]`).join("\n\n");
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } };
      }

      if (toolName === "read_bun_doc") {
        const doc = readDoc(args.slug);
        if (!doc) {
          return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `Doc not found: "${args.slug}". Use search_bun_docs to find valid slugs.` }], isError: true } };
        }
        const text = `# ${doc.title}\n\n${doc.desc}\n\n---\n\n${doc.content}`;
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } };
      }

      if (toolName === "list_bun_topics") {
        const topics = listTopics();
        const text = `${topics.length} docs indexed from ${docsRoot}\n\n` +
          topics.map(t => `- \`${t.slug}\` — ${t.title}`).join("\n");
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }] } };
      }

      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
    }

    default:
      if (id !== undefined) {
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } };
      }
      return null;
  }
}

// --- Stdio Transport ---
function send(msg: object) {
  const json = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  process.stdout.write(header + json);
}

async function main() {
  await buildIndex();
  const stderr = (s: string) => process.stderr.write(s + "\n");
  stderr(`[bun-docs-mcp] Indexed ${docs.length} docs from ${docsRoot}`);

  // Read stdin as a stream, parse Content-Length framed messages
  let buffer = "";
  const decoder = new TextDecoder();

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });

    while (true) {
      // Look for Content-Length header
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // Skip malformed header
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;

      if (buffer.length < bodyEnd) break; // Need more data

      const body = buffer.slice(bodyStart, bodyEnd);
      buffer = buffer.slice(bodyEnd);

      try {
        const msg: JsonRpc = JSON.parse(body);
        const response = handleRequest(msg);
        if (response) send(response);
      } catch (e) {
        stderr(`[bun-docs-mcp] Parse error: ${e}`);
      }
    }
  }
}

main();
