/**
 * Pure convert helpers: .mcp.json SSOT → VS Code .vscode/mcp.json shape.
 *
 * Cursor reads SSOT directly (envFile + ${CLOUDFLARE_API_TOKEN}).
 * VS Code HTTP schema has no envFile — Cloudflare auth uses ${input:…}.
 *
 * @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write (consumer)
 */

export const WORKSPACE_TOKEN = '${workspaceFolder}';

export const CLOUDFLARE_TOKEN_INPUT_ID = 'cloudflare-api-token';

export const CLOUDFLARE_TOKEN_INPUT = {
  type: 'promptString' as const,
  id: CLOUDFLARE_TOKEN_INPUT_ID,
  description: 'CLOUDFLARE_API_TOKEN from Proton Pass / project .env',
  password: true,
};

export interface McpServer {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  envFile?: string;
  url?: string;
  headers?: Record<string, string>;
  description?: string;
}

export interface McpSsot {
  mcpServers: Record<string, McpServer>;
}

export interface VsCodeMcpInput {
  type: 'promptString';
  id: string; // brand-ok — VS Code mcp.json inputs[].id wire key (not a domain *Id)
  description: string;
  password: boolean;
}

export interface VsCodeMcpDoc {
  inputs: VsCodeMcpInput[];
  servers: Record<string, Record<string, unknown>>;
}

const CLOUDFLARE_BEARER_RE = /^Bearer \$\{(?:env:)?CLOUDFLARE_API_TOKEN\}$/;

/** Normalize path-like values to ${workspaceFolder}/… for VS Code. */
export function toWorkspaceRelative(root: string, value: string): string {
  if (value === WORKSPACE_TOKEN || value === root) {
    return WORKSPACE_TOKEN;
  }
  if (value.startsWith(`${WORKSPACE_TOKEN}/`)) {
    return value;
  }
  if (value.startsWith(`${root}/`)) {
    return `${WORKSPACE_TOKEN}${value.slice(root.length)}`;
  }
  // Single repo-relative path/file — never rewrite comma-separated values.
  // or bare commands ("bun").
  if (
    value.length > 0 &&
    !value.includes(',') &&
    !value.includes(' ') &&
    !value.startsWith('/') &&
    !value.startsWith('${') &&
    (value.includes('/') || value.startsWith('.env') || /\.(?:ts|tsx|js|mjs|cjs|sh)$/.test(value))
  ) {
    return `${WORKSPACE_TOKEN}/${value}`;
  }
  return value;
}

/** Cursor/SSOT ${VAR} → VS Code ${env:VAR} (skips already-${env:} and ${input:}). */
export function toVsCodeEnvRef(value: string): string {
  return value.replace(/\$\{(?!env:|input:)([A-Z_][A-Z0-9_]*)\}/g, '${env:$1}');
}

export function isCloudflareBearerAuth(authorization: string | undefined): boolean {
  return typeof authorization === 'string' && CLOUDFLARE_BEARER_RE.test(authorization.trim());
}

function rewriteHttpHeaders(headers: Record<string, string>): {
  headers: Record<string, string>;
  needsCloudflareInput: boolean;
} {
  let needsCloudflareInput = false;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key === 'Authorization' && isCloudflareBearerAuth(value)) {
      out[key] = `Bearer \${input:${CLOUDFLARE_TOKEN_INPUT_ID}}`;
      needsCloudflareInput = true;
    } else {
      out[key] = toVsCodeEnvRef(value);
    }
  }
  return { headers: out, needsCloudflareInput };
}

export function convertServer(
  server: McpServer,
  root: string
): { server: Record<string, unknown>; needsCloudflareInput: boolean } {
  if (server.url) {
    const out: Record<string, unknown> = { type: 'http', url: server.url };
    let needsCloudflareInput = false;
    if (server.headers) {
      const rewritten = rewriteHttpHeaders(server.headers);
      out.headers = rewritten.headers;
      needsCloudflareInput = rewritten.needsCloudflareInput;
    }
    // VS Code HTTP schema has no envFile — omit even if SSOT has it for Cursor.
    return { server: out, needsCloudflareInput };
  }

  const out: Record<string, unknown> = {
    type: server.type ?? 'stdio',
    command: server.command ? toWorkspaceRelative(root, server.command) : server.command,
    args: (server.args ?? []).map(a => toWorkspaceRelative(root, a)),
  };
  if (server.env && Object.keys(server.env).length > 0) {
    out.env = Object.fromEntries(
      Object.entries(server.env).map(([k, v]) => [k, toWorkspaceRelative(root, v)])
    );
  }
  if (server.envFile) {
    out.envFile = toWorkspaceRelative(root, server.envFile);
  }
  return { server: out, needsCloudflareInput: false };
}

export function buildVsCodeMcp(ssot: McpSsot, root: string): VsCodeMcpDoc {
  let needsCloudflareInput = false;
  const servers: Record<string, Record<string, unknown>> = {};
  for (const [name, server] of Object.entries(ssot.mcpServers)) {
    const converted = convertServer(server, root);
    servers[name] = converted.server;
    if (converted.needsCloudflareInput) needsCloudflareInput = true;
  }
  return {
    inputs: needsCloudflareInput ? [CLOUDFLARE_TOKEN_INPUT] : [],
    servers,
  };
}

export function stringifyVsCodeMcp(doc: VsCodeMcpDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}
