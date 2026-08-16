import { describe, expect, test } from 'bun:test';
import { dirname, resolve } from 'node:path';

const SKILL_ROOT = resolve(import.meta.dir, '../..');
const REPO_ROOT = resolve(SKILL_ROOT, '../../..');

async function markdownFiles(): Promise<string[]> {
  const files = [resolve(SKILL_ROOT, 'SKILL.md')];
  const glob = new Bun.Glob('references/*.md');
  for await (const relativePath of glob.scan({ cwd: SKILL_ROOT })) {
    files.push(resolve(SKILL_ROOT, relativePath));
  }
  return files.sort();
}

describe('ast-grep skill reference contract', () => {
  test('every relative Markdown link resolves', async () => {
    const missing: string[] = [];

    for (const filePath of await markdownFiles()) {
      const markdown = await Bun.file(filePath).text();
      for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1]?.trim();
        if (!target || target.startsWith('#') || /^[a-z]+:/i.test(target)) continue;

        const pathOnly = target.split('#', 1)[0];
        if (!pathOnly) continue;
        const resolvedTarget = resolve(dirname(filePath), decodeURIComponent(pathOnly));
        if (!(await Bun.file(resolvedTarget).exists())) {
          missing.push(`${filePath}: ${target}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  test('documented bun scripts resolve in the root or skill package', async () => {
    const [rootPackage, skillPackage] = await Promise.all([
      Bun.file(resolve(REPO_ROOT, 'package.json')).json(),
      Bun.file(resolve(SKILL_ROOT, 'package.json')).json(),
    ]);
    const scripts = new Set([
      ...Object.keys(rootPackage.scripts ?? {}),
      ...Object.keys(skillPackage.scripts ?? {}),
    ]);
    const missing = new Set<string>();

    for (const filePath of await markdownFiles()) {
      const markdown = await Bun.file(filePath).text();
      for (const match of markdown.matchAll(/\bbun run ([a-zA-Z0-9:_-]+)/g)) {
        const script = match[1];
        if (script && !scripts.has(script)) missing.add(script);
      }
    }

    expect([...missing].sort()).toEqual([]);
  });

  test('setup and MCP keep the repository pin authoritative', async () => {
    const paths = [
      'SKILL.md',
      'bun-patterns.json',
      'scripts/ast_grep_helper.py',
      'scripts/install.sh',
      'scripts/sg.sh',
      'mcp/ast-grep-mcp.ts',
    ];
    const contents = Object.fromEntries(
      await Promise.all(
        paths.map(async relativePath => [
          relativePath,
          await Bun.file(resolve(SKILL_ROOT, relativePath)).text(),
        ])
      )
    );
    const contract = Object.values(contents).join('\n');

    expect(contract).not.toContain('npm install -g');
    expect(contract).not.toContain('--global-fix');
    expect(contract).not.toContain('https://bun.sh');
    expect(contents['scripts/install.sh']).toContain('--no-save');
  });
});
