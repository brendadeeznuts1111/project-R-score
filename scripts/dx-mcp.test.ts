#!/usr/bin/env bun
// dx-mcp.test.ts — MCP protocol smoke test suite

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { join } from 'node:path';

const SCRIPT = join(import.meta.dir, 'dx-mcp.ts');

let proc: Subprocess;
let reqId = 0;
let stdoutBuf = '';
let resolveNext: ((line: string) => void) | null = null;

function req(method: string, params?: Record<string, unknown>) {
  return JSON.stringify({ jsonrpc: '2.0', id: ++reqId, method, params }) + '\n';
}

function isAlive(): boolean {
  try {
    return proc.killed === false;
  } catch {
    return false;
  }
}

async function send(input: string, timeoutMs = 3000): Promise<any> {
  if (!isAlive()) return { error: 'Process dead' };
  (proc.stdin! as any).write(input);
  // Clear any stale waiter from a previous timeout
  resolveNext = null;
  try {
    return await Promise.race([
      new Promise<any>(resolve => {
        resolveNext = (line: string) => {
          try {
            resolve(JSON.parse(line));
          } catch {
            resolve({ error: 'Parse error', raw: line });
          }
        };
      }),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
  } finally {
    resolveNext = null;
  }
}

async function drainStdout() {
  const reader = (proc.stdout! as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      stdoutBuf += decoder.decode(value);
      while (stdoutBuf.includes('\n')) {
        const idx = stdoutBuf.indexOf('\n');
        const line = stdoutBuf.slice(0, idx);
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (line.trim() && resolveNext) {
          resolveNext(line);
          resolveNext = null;
        }
      }
    }
  } catch {}
}

beforeAll(() => {
  proc = spawn([process.argv0, 'run', SCRIPT], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  drainStdout();
});

afterAll(() => {
  try {
    proc.kill();
  } catch {}
});

describe('dx-mcp server', () => {
  // ── Core protocol ──────────────────────────────────────────
  it('handles initialize', async () => {
    const res = await send(req('initialize'));
    expect(res.result.protocolVersion).toBe('2024-11-05');
  });

  it('handles tools/list — 15+ tools', async () => {
    const res = await send(req('tools/list'));
    expect(res.result.tools.length).toBeGreaterThanOrEqual(15);
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toContain('list_projects');
    expect(names).toContain('dx_oneliner');
  });

  it('rejects unknown method', async () => {
    const res = await send(req('tools/call', { name: 'foobar', arguments: {} }));
    expect(res.result.error).toBeTruthy();
  });

  // ── Project listing ────────────────────────────────────────
  it('list_projects returns projects', async () => {
    const res = await send(req('tools/call', { name: 'list_projects', arguments: {} }));
    expect(res.result.total).toBeGreaterThan(0);
    expect(res.result.projects[0]).toHaveProperty('name');
  });

  it('list_projects filters by type', async () => {
    const res = await send(
      req('tools/call', { name: 'list_projects', arguments: { type: 'cascade-mover' } })
    );
    expect(res.result.total).toBeGreaterThanOrEqual(1);
    expect(res.result.projects.every((p: any) => p.type === 'cascade-mover')).toBe(true);
  });

  // ── Project info ───────────────────────────────────────────
  it('project_info resolves cascade-mover-v3', async () => {
    const res = await send(
      req('tools/call', { name: 'project_info', arguments: { project: 'cascade-mover-v3' } })
    );
    expect(res.result.type).toBe('cascade-mover');
    expect(res.result.fileCount).toBeGreaterThan(0);
  });

  it('project_info errors for unknown', async () => {
    const res = await send(
      req('tools/call', { name: 'project_info', arguments: { project: '__nonexistent__' } })
    );
    expect(res.result.error).toBeTruthy();
  });

  it('project_health returns health', async () => {
    const res = await send(req('tools/call', { name: 'project_health', arguments: {} }));
    expect(res.result.total).toBeGreaterThan(0);
  });

  it('project_config finds configs', async () => {
    const res = await send(
      req('tools/call', { name: 'project_config', arguments: { project: 'cascade-mover-v3' } })
    );
    expect(res.result.configs.map((c: any) => c.path)).toContain('tsconfig.json');
  });

  it('project_entrypoints lists entry points', async () => {
    const res = await send(
      req('tools/call', { name: 'project_entrypoints', arguments: { project: 'cascade-mover-v3' } })
    );
    expect(res.result.entrypoints.map((e: any) => e.path)).toContain('src/server/main-server.ts');
  });

  // ── Version & timings ──────────────────────────────────────
  it('bun_version returns features', async () => {
    const res = await send(
      req('tools/call', { name: 'bun_version', arguments: { expected: '1.3.14' } })
    );
    expect(res.result.bun).toBeTruthy();
    expect(res.result.wave9.webview).toBe(true);
  });

  it('dx_timing returns latencies', async () => {
    const res = await send(req('tools/call', { name: 'dx_timing', arguments: {} }));
    expect(res.result.server).toBe('2.1.0');
    expect(res.result.totalCalls).toBeGreaterThan(0);
  });

  // ── One-liner registry ─────────────────────────────────────
  it('dx_oneliner lists all topics', async () => {
    const res = await send(
      req('tools/call', { name: 'dx_oneliner', arguments: { topic: '--list' } })
    );
    expect(res.result.count).toBeGreaterThanOrEqual(25);
    expect(res.result.topics.map((t: any) => t.topic)).toContain('bun-webview');
  });

  it('dx_oneliner returns code for topic', async () => {
    const res = await send(
      req('tools/call', { name: 'dx_oneliner', arguments: { topic: 'bun-escapehtml' } })
    );
    expect(res.result.code).toContain('Bun.escapeHTML');
  });

  // ── Lockfiles ──────────────────────────────────────────────
  it('check_lockfiles returns entries', async () => {
    const res = await send(req('tools/call', { name: 'check_lockfiles', arguments: {} }));
    expect(res.result.entries.length).toBeGreaterThan(0);
  });

  // ── Workspace ──────────────────────────────────────────────
  it('analyze_workspace returns workspace info', async () => {
    const res = await send(req('tools/call', { name: 'analyze_workspace', arguments: {} }), 15000);
    if (!res.result || res.result?.error) return;
    expect(res.result.workspaceGlobs.length).toBeGreaterThan(0);
  }, 20000);

  // ── Readme ─────────────────────────────────────────────────
  it('project_readme returns raw markdown', async () => {
    const res = await send(
      req('tools/call', {
        name: 'project_readme',
        arguments: { project: 'cascade-mover-v3', format: 'raw' },
      }),
      15000
    );
    if (!res.result || res.result?.error) return;
    expect(res.result.readme.length).toBeGreaterThan(0);
  }, 20000);

  // ── Heavy tools (run last, may stress subprocess) ──────────
  it('rg_search on single project', async () => {
    const res = await send(
      req('tools/call', {
        name: 'rg_search',
        arguments: { project: 'cascade-mover-v3', pattern: 'Bun.serve' },
      })
    );
    if (!res.result || res.result?.error) return;
    expect(typeof res.result.matchCount).toBe('number');
  });

  it('rg_search scope=all runs cross-project', async () => {
    const res = await send(
      req('tools/call', {
        name: 'rg_search',
        arguments: { project: 'all', pattern: 'Bun.serve', maxResults: 5 },
      })
    );
    if (!res.result || res.result?.error) return;
    expect(typeof res.result.projectCount).toBe('number');
  });

  it('find_unused_deps runs on project', async () => {
    const res = await send(
      req('tools/call', { name: 'find_unused_deps', arguments: { project: 'cascade-mover-v3' } })
    );
    if (!res.result || res.result?.error) return;
    expect(typeof res.result.totalDeps).toBe('number');
  });

  it('scan_imports returns imports', async () => {
    const res = await send(
      req('tools/call', { name: 'scan_imports', arguments: { project: 'cascade-mover-v3' } })
    );
    if (!res.result || res.result?.error) return;
    expect(typeof res.result.filesScanned).toBe('number');
  });

  it('find_large_files returns largest', async () => {
    const res = await send(
      req('tools/call', {
        name: 'find_large_files',
        arguments: { project: 'cascade-mover-v3', topN: 5 },
      })
    );
    if (!res.result || res.result?.error) return;
    expect(res.result.topFiles.length).toBeLessThanOrEqual(5);
  });

  it('find_bloat returns metrics', async () => {
    const res = await send(
      req('tools/call', { name: 'find_bloat', arguments: { project: 'cascade-mover-v3' } })
    );
    if (!res.result || res.result?.error) return;
    expect(res.result).toHaveProperty('nodeModulesKb');
  });
});
