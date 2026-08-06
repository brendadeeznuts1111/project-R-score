// @see https://bun.com/docs/test/writing-tests — bun:test
import { describe, expect, test } from 'bun:test';

const ROOT = `${import.meta.dir}/..`;

describe('VS Code Bun-first workspace config', () => {
  test('settings disable npm autoDetect and pin bun packageManager', async () => {
    const settings = (await Bun.file(`${ROOT}/.vscode/settings.json`).json()) as {
      'npm.autoDetect'?: string;
      'npm.packageManager'?: string;
      'npm.exclude'?: string;
      'bun.runtime'?: string;
    };
    expect(settings['npm.autoDetect']).toBe('off');
    expect(settings['npm.packageManager']).toBe('bun');
    expect(settings['bun.runtime']).toBe('bun');
    const exclude = settings['npm.exclude'] ?? '';
    expect(exclude).toContain('plum-spruce-dawn-dune1');
    expect(exclude).toContain('.worktrees');
    expect(exclude).toContain('.codex-worktrees');
  });

  test('tasks.json is a curated Bun shell palette (not npm auto-detect)', async () => {
    const doc = (await Bun.file(`${ROOT}/.vscode/tasks.json`).json()) as {
      tasks: Array<{ label: string; command?: string; type?: string }>;
    };
    const labels = doc.tasks.map(t => t.label);
    expect(labels).toContain('FW: Test');
    expect(labels).toContain('FW: Type Check');
    expect(labels).toContain('FW: DX MCP (stdio)');
    expect(doc.tasks.every(t => t.type === 'shell' && t.command === 'bun')).toBe(true);
    // Keep the palette small — do not mirror hundreds of package.json scripts.
    expect(doc.tasks.length).toBeGreaterThanOrEqual(6);
    expect(doc.tasks.length).toBeLessThanOrEqual(24);
  });
});
