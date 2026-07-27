#!/usr/bin/env bun
/**
 * mcp-sync — generate .vscode/mcp.json from the SSOT .mcp.json.
 *
 * .mcp.json is the single source of truth for workspace MCP servers
 * (.cursor/mcp.json is a symlink to it). VS Code uses a different schema
 * (`servers` key, `${env:VAR}` interpolation), so it is generated.
 *
 * Usage:
 *   bun scripts/mcp-sync.ts          # write .vscode/mcp.json
 *   bun scripts/mcp-sync.ts --check  # exit 1 if .vscode/mcp.json is stale
 */
// @see https://bun.com/docs/runtime/file-io

const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const ssotPath = `${root}/.mcp.json`;
const vscodePath = `${root}/.vscode/mcp.json`;
const workspaceToken = '${workspaceFolder}';

interface McpServer {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  envFile?: string;
  url?: string;
  headers?: Record<string, string>;
}

const ssot = (await Bun.file(ssotPath).json()) as { mcpServers: Record<string, McpServer> };

const toWorkspaceRelative = (value: string): string => value.replaceAll(root, workspaceToken);
const toVsCodeEnvRef = (value: string): string =>
  value.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, '${env:$1}');

function convert(server: McpServer): Record<string, unknown> {
  if (server.url) {
    const out: Record<string, unknown> = { type: 'http', url: server.url };
    if (server.headers) {
      out.headers = Object.fromEntries(
        Object.entries(server.headers).map(([k, v]) => [k, toVsCodeEnvRef(v)])
      );
    }
    return out;
  }
  const out: Record<string, unknown> = {
    type: server.type ?? 'stdio',
    command: server.command ? toWorkspaceRelative(server.command) : server.command,
    args: (server.args ?? []).map(toWorkspaceRelative),
  };
  if (server.env && Object.keys(server.env).length > 0) {
    out.env = Object.fromEntries(
      Object.entries(server.env).map(([k, v]) => [k, toWorkspaceRelative(v)])
    );
  }
  if (server.envFile) out.envFile = toWorkspaceRelative(server.envFile);
  return out;
}

const generated = `${JSON.stringify(
  {
    inputs: [],
    servers: Object.fromEntries(
      Object.entries(ssot.mcpServers).map(([name, server]) => [name, convert(server)])
    ),
  },
  null,
  2
)}\n`;

if (Bun.argv.includes('--check')) {
  const current = await Bun.file(vscodePath).text();
  if (current === generated) {
    console.log('mcp-sync: .vscode/mcp.json is up to date');
    process.exit(0);
  }
  console.error('mcp-sync: .vscode/mcp.json is stale — run `bun scripts/mcp-sync.ts`');
  process.exit(1);
}

await Bun.write(vscodePath, generated);
console.log(`mcp-sync: wrote ${vscodePath} from ${ssotPath}`);
