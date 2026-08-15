// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  CLOUDFLARE_TOKEN_INPUT,
  CLOUDFLARE_TOKEN_INPUT_ID,
  buildVsCodeMcp,
  convertServer,
  isCloudflareBearerAuth,
  toVsCodeEnvRef,
  toWorkspaceRelative,
  type McpServer,
} from '../scripts/lib/mcp-sync-convert.ts';

const ROOT = '/Users/nolarose/Projects';

describe('toWorkspaceRelative', () => {
  test('rewrites absolute repo paths', () => {
    expect(toWorkspaceRelative(ROOT, `${ROOT}/.env`)).toBe('${workspaceFolder}/.env');
    expect(toWorkspaceRelative(ROOT, ROOT)).toBe('${workspaceFolder}');
  });

  test('keeps already-portable workspaceFolder paths', () => {
    expect(toWorkspaceRelative(ROOT, '${workspaceFolder}/tools/bun-docs-mcp.ts')).toBe(
      '${workspaceFolder}/tools/bun-docs-mcp.ts'
    );
    expect(toWorkspaceRelative(ROOT, '${workspaceFolder}')).toBe('${workspaceFolder}');
  });

  test('prefixes repo-relative script paths', () => {
    expect(toWorkspaceRelative(ROOT, 'tools/bun-docs-mcp.ts')).toBe(
      '${workspaceFolder}/tools/bun-docs-mcp.ts'
    );
  });

  test('leaves bare commands alone', () => {
    expect(toWorkspaceRelative(ROOT, 'bun')).toBe('bun');
  });

  test('leaves comma-separated relative lists alone', () => {
    const scanRoots =
      'projects/active,projects/experimental,projects/archive,packages,lib,tools';
    expect(toWorkspaceRelative(ROOT, scanRoots)).toBe(scanRoots);
  });

  test('prefixes single relative .env paths', () => {
    expect(toWorkspaceRelative(ROOT, '.env')).toBe('${workspaceFolder}/.env');
    expect(
      toWorkspaceRelative(ROOT, 'projects/active/enterprise/cascade-mover-v3/.env')
    ).toBe('${workspaceFolder}/projects/active/enterprise/cascade-mover-v3/.env');
  });
});

describe('toVsCodeEnvRef', () => {
  test('rewrites ${VAR} to ${env:VAR}', () => {
    expect(toVsCodeEnvRef('Bearer ${CLOUDFLARE_API_TOKEN}')).toBe(
      'Bearer ${env:CLOUDFLARE_API_TOKEN}'
    );
  });

  test('leaves $VAR bare form alone', () => {
    expect(toVsCodeEnvRef('Bearer $CLOUDFLARE_API_TOKEN')).toBe('Bearer $CLOUDFLARE_API_TOKEN');
  });

  test('leaves ${env:VAR} and ${input:…} alone', () => {
    expect(toVsCodeEnvRef('Bearer ${env:CLOUDFLARE_API_TOKEN}')).toBe(
      'Bearer ${env:CLOUDFLARE_API_TOKEN}'
    );
    expect(toVsCodeEnvRef(`Bearer \${input:${CLOUDFLARE_TOKEN_INPUT_ID}}`)).toBe(
      `Bearer \${input:${CLOUDFLARE_TOKEN_INPUT_ID}}`
    );
  });
});

describe('isCloudflareBearerAuth', () => {
  test('matches Cursor and env forms', () => {
    expect(isCloudflareBearerAuth('Bearer ${CLOUDFLARE_API_TOKEN}')).toBe(true);
    expect(isCloudflareBearerAuth('Bearer ${env:CLOUDFLARE_API_TOKEN}')).toBe(true);
  });

  test('rejects other auth', () => {
    expect(isCloudflareBearerAuth('Bearer ${OTHER_TOKEN}')).toBe(false);
    expect(isCloudflareBearerAuth(undefined)).toBe(false);
  });
});

describe('convertServer HTTP', () => {
  test('omits envFile even when SSOT has it', () => {
    const ssot: McpServer = {
      type: 'http',
      url: 'https://mcp.cloudflare.com/mcp',
      headers: { Authorization: 'Bearer ${CLOUDFLARE_API_TOKEN}' },
      envFile: `${ROOT}/.env`,
    };
    const { server, needsCloudflareInput } = convertServer(ssot, ROOT);
    expect(needsCloudflareInput).toBe(true);
    expect(server.envFile).toBeUndefined();
    expect(server.headers).toEqual({
      Authorization: `Bearer \${input:${CLOUDFLARE_TOKEN_INPUT_ID}}`,
    });
  });

  test('non-Cloudflare HTTP keeps headers and needs no input', () => {
    const ssot: McpServer = {
      type: 'http',
      url: 'http://100.64.250.26:8787/mcp',
    };
    const { server, needsCloudflareInput } = convertServer(ssot, ROOT);
    expect(needsCloudflareInput).toBe(false);
    expect(server).toEqual({ type: 'http', url: 'http://100.64.250.26:8787/mcp' });
    expect(server.envFile).toBeUndefined();
  });
});

describe('convertServer stdio', () => {
  test('emits envFile and workspace-relative args', () => {
    const ssot: McpServer = {
      type: 'stdio',
      command: 'bun',
      args: [`${ROOT}/tools/bun-docs-mcp.ts`],
      envFile: `${ROOT}/.env`,
      env: { BUN_DOCS_ROOT: ROOT },
    };
    const { server, needsCloudflareInput } = convertServer(ssot, ROOT);
    expect(needsCloudflareInput).toBe(false);
    expect(server).toEqual({
      type: 'stdio',
      command: 'bun',
      args: ['${workspaceFolder}/tools/bun-docs-mcp.ts'],
      env: { BUN_DOCS_ROOT: '${workspaceFolder}' },
      envFile: '${workspaceFolder}/.env',
    });
  });
});

describe('buildVsCodeMcp', () => {
  test('emits cloudflare input when any Cloudflare HTTP server present', () => {
    const doc = buildVsCodeMcp(
      {
        mcpServers: {
          'cascade-mover': { type: 'http', url: 'http://100.64.250.26:8787/mcp' },
          cloudflare: {
            type: 'http',
            url: 'https://mcp.cloudflare.com/mcp',
            headers: { Authorization: 'Bearer ${CLOUDFLARE_API_TOKEN}' },
            envFile: '${workspaceFolder}/.env',
          },
          'bun-docs': {
            type: 'stdio',
            command: 'bun',
            args: ['${workspaceFolder}/tools/bun-docs-mcp.ts'],
            envFile: '${workspaceFolder}/.env',
          },
        },
      },
      ROOT
    );
    expect(doc.inputs).toEqual([CLOUDFLARE_TOKEN_INPUT]);
    expect(doc.servers.cloudflare.headers).toEqual({
      Authorization: `Bearer \${input:${CLOUDFLARE_TOKEN_INPUT_ID}}`,
    });
    expect(doc.servers.cloudflare.envFile).toBeUndefined();
    expect(doc.servers['bun-docs'].envFile).toBe('${workspaceFolder}/.env');
    expect(doc.servers['cascade-mover']).toEqual({
      type: 'http',
      url: 'http://100.64.250.26:8787/mcp',
    });
  });

  test('emits empty inputs when no Cloudflare bearer headers', () => {
    const doc = buildVsCodeMcp(
      {
        mcpServers: {
          'cascade-mover': { type: 'http', url: 'http://100.64.250.26:8787/mcp' },
        },
      },
      ROOT
    );
    expect(doc.inputs).toEqual([]);
  });
});
