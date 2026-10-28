import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkAgentGuidance } from '../scripts/check-agent-guidance.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'agent-guidance-'));
  roots.push(root);
  return root;
}

describe('checkAgentGuidance', () => {
  test('accepts bounded nested guidance', async () => {
    const root = await fixture();
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), 'root policy');
    await writeFile(join(root, 'docs', 'AGENTS.md'), 'docs routing');

    expect(await checkAgentGuidance(root, 64)).toMatchObject({ ok: true, files: 2 });
  });

  test('rejects oversized chains and leaked editor artifacts', async () => {
    const root = await fixture();
    await mkdir(join(root, 'nested'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '12345678');
    await writeFile(join(root, 'nested', 'AGENTS.md'), '12345678\n</content>');

    const result = await checkAgentGuidance(root, 16);
    expect(result.ok).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain('instruction-chain-size');
    expect(result.issues.map(issue => issue.code)).toContain('edit-artifact');
  });

  test('keeps repository guidance within the Codex instruction budget', async () => {
    const result = await checkAgentGuidance(join(import.meta.dir, '..'));
    expect(result.issues).toEqual([]);
  });
});
