import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  discoverAgentPath,
  doctorAgentPath,
  frictionFingerprint,
  pruneAgentFriction,
  recordAgentFriction,
  reportAgentFriction,
} from '../lib/ai/agent-path.ts';

const repoRoot = join(import.meta.dir, '..');
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('AI-native agent path', () => {
  test('CLI explains the complete small-tool surface', async () => {
    const process = Bun.spawn(['bun', 'tools/ai-path.ts', '--help'], {
      cwd: repoRoot,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [exitCode, stdout] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('discover "<task>"');
    expect(stdout).toContain('friction record');
    expect(stdout).toContain('friction prune');
    expect(stdout).toContain('selected source, command help, and tests remain authority');
  });

  test('directory targets include their own applicable guidance', async () => {
    const result = await discoverAgentPath(repoRoot, { query: 'markdown links', paths: ['docs'] });
    expect(result.contexts).toEqual(['AGENTS.md', 'docs/AGENTS.md']);
  });

  test('scope is only a tie-breaker and cannot invent unrelated command matches', async () => {
    const result = await discoverAgentPath(repoRoot, {
      query: 'unrelated quantum banana',
      paths: ['docs/AGENTS.md'],
    });
    expect(result.hits.filter(hit => hit.kind !== 'context')).toEqual([]);
  });

  test('CLI rejects invalid limits with a stable JSON error', async () => {
    const process = Bun.spawn(
      ['bun', 'tools/ai-path.ts', 'discover', 'markdown', '--limit', 'nope', '--json'],
      { cwd: repoRoot, stdout: 'pipe', stderr: 'pipe' }
    );
    const [exitCode, stdout] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
    ]);
    expect(exitCode).toBe(2);
    expect(JSON.parse(stdout)).toMatchObject({
      schemaVersion: 1,
      ok: false,
      error: { code: 'invalid-arguments' },
    });
  });

  test('discovers applicable guidance and the focused repository command', async () => {
    const result = await discoverAgentPath(repoRoot, {
      query: 'fix broken markdown links',
      paths: ['docs/AGENTS.md'],
    });

    expect(result.contexts).toEqual(['AGENTS.md', 'docs/AGENTS.md']);
    expect(result.hits.some(hit => hit.kind === 'command' && hit.id === 'docs:links:check')).toBe(
      true
    );
    expect(result.hits.some(hit => hit.kind === 'skill' && hit.id === 'reference-discovery')).toBe(
      true
    );
    expect(result.hits.some(hit => hit.kind === 'skill' && hit.id === 'agents-sdk')).toBe(false);
  });

  test('doctor validates the live discovery contract', async () => {
    expect((await doctorAgentPath(repoRoot)).ok).toBe(true);
  });

  test('repeated friction crosses the configured promotion threshold', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ai-friction-'));
    temporaryRoots.push(root);
    await mkdir(join(root, 'config'), { recursive: true });
    await Bun.write(
      join(root, 'config/ai-friction.json'),
      `${JSON.stringify(
        {
          $schema: './schemas/ai-friction.schema.json',
          schemaVersion: 1,
          promotionThreshold: 3,
          observationWindowDays: 30,
          retentionDays: 90,
          issues: [],
        },
        null,
        2
      )}\n`
    );

    for (let index = 0; index < 3; index++) {
      await recordAgentFriction(root, {
        tool: 'docs:links:check',
        code: 'missing-route',
        detail: 'The task required manual command search',
      });
    }

    const report = await reportAgentFriction(root);
    expect(report.observations).toBe(3);
    expect(report.fingerprints).toHaveLength(1);
    expect(report.fingerprints[0]).toMatchObject({ count: 3, promote: true });
  });

  test('reopens a resolved issue when its prevention keeps failing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ai-friction-reopen-'));
    temporaryRoots.push(root);
    await mkdir(join(root, 'config'), { recursive: true });
    await Bun.write(join(root, 'owner.ts'), 'export {};\n');
    await Bun.write(
      join(root, 'config/ai-friction.json'),
      `${JSON.stringify(
        {
          $schema: './schemas/ai-friction.schema.json',
          schemaVersion: 1,
          promotionThreshold: 2,
          observationWindowDays: 30,
          retentionDays: 90,
          issues: [
            {
              id: 'missing-route',
              title: 'A route remained hidden',
              status: 'resolved',
              tags: ['discovery'],
              owner: 'owner.ts',
              match: { tool: 'ai', code: 'manual-discovery' },
              prevention: 'add a discoverable entrypoint',
            },
          ],
        },
        null,
        2
      )}\n`
    );
    for (let index = 0; index < 2; index++) {
      await recordAgentFriction(root, { tool: 'ai', code: 'manual-discovery' });
    }

    const report = await reportAgentFriction(root);
    expect(report.known[0]).toMatchObject({ observations: 2, reopen: true });
  });

  test('reports only the active window and explicitly prunes retained history', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ai-friction-window-'));
    temporaryRoots.push(root);
    await mkdir(join(root, 'config'), { recursive: true });
    await Bun.write(
      join(root, 'config/ai-friction.json'),
      `${JSON.stringify(
        {
          $schema: './schemas/ai-friction.schema.json',
          schemaVersion: 1,
          promotionThreshold: 2,
          observationWindowDays: 7,
          retentionDays: 30,
          issues: [],
        },
        null,
        2
      )}\n`
    );
    const tool = 'ai';
    const code = 'manual-discovery';
    const oldId = '00000000-0000-7000-8000-000000000001';
    await Bun.write(
      join(root, `.cache/ai-friction/events/${oldId}.json`),
      `${JSON.stringify({
        schemaVersion: 1,
        id: oldId,
        observedAt: '2025-01-01T00:00:00.000Z',
        fingerprint: frictionFingerprint(tool, code),
        tool,
        code,
      })}\n`
    );
    await recordAgentFriction(root, { tool, code });

    const now = new Date('2026-08-16T12:00:00.000Z');
    const report = await reportAgentFriction(root, now);
    expect(report).toMatchObject({ observations: 1, expiredObservations: 1 });
    const pruned = await pruneAgentFriction(root, now);
    expect(pruned).toMatchObject({ retentionDays: 30, deleted: 1 });
    expect(await Bun.file(join(root, `.cache/ai-friction/events/${oldId}.json`)).exists()).toBe(
      false
    );
  });

  test('rejects friction events whose fingerprint was tampered', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ai-friction-tampered-'));
    temporaryRoots.push(root);
    await mkdir(join(root, 'config'), { recursive: true });
    await Bun.write(
      join(root, 'config/ai-friction.json'),
      `${JSON.stringify({
        $schema: './schemas/ai-friction.schema.json',
        schemaVersion: 1,
        promotionThreshold: 2,
        observationWindowDays: 7,
        retentionDays: 30,
        issues: [],
      })}\n`
    );
    const id = '00000000-0000-7000-8000-000000000002';
    await Bun.write(
      join(root, `.cache/ai-friction/events/${id}.json`),
      `${JSON.stringify({
        schemaVersion: 1,
        id,
        observedAt: '2026-08-16T00:00:00.000Z',
        fingerprint: '00000000000000000000',
        tool: 'ai',
        code: 'manual-discovery',
      })}\n`
    );
    await expect(reportAgentFriction(root, new Date('2026-08-16T12:00:00.000Z'))).rejects.toThrow(
      'fingerprint mismatch'
    );
  });

  test('friction details reject apparent credentials', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ai-friction-secret-'));
    temporaryRoots.push(root);
    await expect(
      recordAgentFriction(root, {
        tool: 'example',
        code: 'blocked',
        detail: 'token=do-not-store-this',
      })
    ).rejects.toThrow('credential');
  });
});
