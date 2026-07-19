#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// dx-mcp.test.ts — MCP protocol smoke test suite

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { join } from 'node:path';
import { parseToolPayload } from '../lib/mcp/stdio-jsonrpc.ts';

const SCRIPT = join(import.meta.dir, 'dx-mcp.ts');
const BUN_VERSION = Bun.version;

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

function payload(res: { result?: unknown }) {
  return parseToolPayload(res.result);
}

async function send(input: string, timeoutMs = 8000): Promise<any> {
  if (!isAlive()) return { error: 'Process dead' };
  (proc.stdin! as any).write(input);
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
  proc = spawn([process.argv0, 'run', SCRIPT], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, DX_MCP_NDJSON: '1' },
  });
  drainStdout();
});

afterAll(() => {
  try {
    proc.kill();
  } catch {}
});

describe('dx-mcp server', () => {
  it('handles initialize', async () => {
    const res = await send(req('initialize'));
    expect(res.result.protocolVersion).toBe('2024-11-05');
    expect(res.result.serverInfo.version).toBe('2.2.0');
  });

  it('handles tools/list — 16+ tools', async () => {
    const res = await send(req('tools/list'));
    expect(res.result.tools.length).toBeGreaterThanOrEqual(16);
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toContain('list_projects');
    expect(names).toContain('dx_catalog');
    expect(names).toContain('mcp_status');
  });

  it('rejects unknown tool', async () => {
    const res = await send(req('tools/call', { name: 'foobar', arguments: {} }));
    expect(res.result.isError).toBe(true);
  });

  it('list_projects returns projects', async () => {
    const res = await send(req('tools/call', { name: 'list_projects', arguments: {} }));
    const data = payload(res);
    expect(data.total).toBeGreaterThan(0);
    expect(data.projects[0]).toHaveProperty('name');
  });

  it('list_projects filters by type', async () => {
    const res = await send(
      req('tools/call', { name: 'list_projects', arguments: { type: 'cascade-mover' } })
    );
    const data = payload(res);
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.projects.every((p: any) => p.type === 'cascade-mover')).toBe(true);
  });

  it('project_info resolves cascade-mover-v3', async () => {
    const res = await send(
      req('tools/call', { name: 'project_info', arguments: { project: 'cascade-mover-v3' } })
    );
    const data = payload(res);
    expect(data.type).toBe('cascade-mover');
    expect(data.fileCount).toBeGreaterThan(0);
  });

  it('project_info errors for unknown', async () => {
    const res = await send(
      req('tools/call', { name: 'project_info', arguments: { project: '__nonexistent__' } })
    );
    expect(res.result.isError).toBe(true);
  });

  it('project_health returns health', async () => {
    const res = await send(req('tools/call', { name: 'project_health', arguments: {} }));
    const data = payload(res);
    expect(data.total).toBeGreaterThan(0);
  });

  it('mcp_status reads config catalog', async () => {
    const res = await send(req('tools/call', { name: 'mcp_status', arguments: {} }));
    const data = payload(res);
    expect(data.serverCount).toBeGreaterThan(0);
    expect(data.catalog?.essential).toContain('dx');
  });

  it('dx_catalog lists entries', async () => {
    const res = await send(req('tools/call', { name: 'dx_catalog', arguments: {} }));
    const data = payload(res);
    expect(data.total).toBeGreaterThan(10);
  });

  it('bun_version returns features', async () => {
    const res = await send(
      req('tools/call', { name: 'bun_version', arguments: { expected: BUN_VERSION } })
    );
    const data = payload(res);
    expect(data.bun).toBeTruthy();
    expect(data.wave9.markdown).toBe(true);
  });

  it('dx_timing returns latencies', async () => {
    const res = await send(req('tools/call', { name: 'dx_timing', arguments: {} }));
    const data = payload(res);
    expect(data.server).toBe('2.2.0');
    expect(data.totalCalls).toBeGreaterThan(0);
  });

  it('dx_oneliner lists all topics', async () => {
    const res = await send(
      req('tools/call', { name: 'dx_oneliner', arguments: { topic: '--list' } })
    );
    const data = payload(res);
    expect(data.count).toBeGreaterThanOrEqual(25);
  });

  it('check_lockfiles returns entries', async () => {
    const res = await send(req('tools/call', { name: 'check_lockfiles', arguments: {} }));
    const data = payload(res);
    expect(data.entries.length).toBeGreaterThan(0);
  });
});
