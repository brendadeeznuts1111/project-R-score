// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io — Bun.write
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildResearchAgentEnvironment,
  buildThreadResearchPrompt,
  runThreadResearchCycle,
  selectWeakestActionableThreads,
  targetScoreForDeficitClosure,
} from '../lib/research/thread-improvement.ts';
import {
  parseThreadPortfolioWire,
  type ThreadPortfolio,
} from '../tools/codex-thread-portfolio.ts';

const PORTFOLIO_PATH = new URL('../tools/codex-thread-portfolio.json', import.meta.url).pathname;

async function loadPortfolio(): Promise<ThreadPortfolio> {
  return parseThreadPortfolioWire((await Bun.file(PORTFOLIO_PATH).json()) as unknown);
}

describe('daily weakest-thread research', () => {
  test('closes 45% of the remaining score deficit', () => {
    expect(targetScoreForDeficitClosure(25)).toBe(59);
    expect(targetScoreForDeficitClosure(40)).toBe(67);
    expect(targetScoreForDeficitClosure(54)).toBe(75);
    expect(targetScoreForDeficitClosure(100)).toBe(100);
  });

  test('selects the three weakest actionable scoped threads', async () => {
    const targets = selectWeakestActionableThreads(await loadPortfolio());
    expect(targets.map(target => target.thread.ref)).toEqual(['RTH-036', 'RTH-012', 'RTH-030']);
    expect(targets.map(target => target.targetScore)).toEqual([73, 75, 86]);
    expect(targets.every(target => target.lane.entrypoint.length > 0)).toBe(true);
  });

  test('keeps each agent read-only and inside its lane boundary', async () => {
    const [target] = selectWeakestActionableThreads(await loadPortfolio(), 1);
    const prompt = buildThreadResearchPrompt(target!);
    expect(prompt).toContain('Do not edit files');
    expect(prompt).toContain(`Lane entrypoint: ${target!.lane.entrypoint}`);
    expect(prompt).toContain(`Lane boundary: ${target!.lane.boundary}`);
    expect(prompt).toContain('closing 45% of the remaining score deficit');
  });

  test('does not pass ambient credentials to research agents', () => {
    const env = buildResearchAgentEnvironment({
      HOME: '/Users/test',
      CODEX_HOME: '/Users/test/.codex',
      LANG: 'en_US.UTF-8',
      CLOUDFLARE_API_TOKEN: 'secret',
      GITHUB_TOKEN: 'secret',
      API_PASSWORD: 'secret',
    });
    expect(env.HOME).toBe('/Users/test');
    expect(env.CODEX_HOME).toBe('/Users/test/.codex');
    expect(env.CLOUDFLARE_API_TOKEN).toBeUndefined();
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.API_PASSWORD).toBeUndefined();
  });

  test('runs one isolated agent per target and writes an ignored latest manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'project-r-thread-research-'));
    try {
      const calls: string[] = [];
      const result = await runThreadResearchCycle({
        portfolio: await loadPortfolio(),
        root,
        executeAgents: true,
        now: new Date('2026-08-07T12:00:00.000Z'),
        agent: async (target, prompt, reportPath) => {
          calls.push(target.thread.ref);
          await Bun.write(reportPath, `# ${target.thread.ref}\n\n${prompt.length}\n`);
        },
      });
      expect(calls).toEqual(['RTH-036', 'RTH-012', 'RTH-030']);
      expect(result.reports).toHaveLength(3);
      expect(result.failures).toEqual([]);
      expect(await Bun.file(join(root, '.cache/thread-research/latest.json')).exists()).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('preserves successful reports when one agent fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'project-r-thread-research-partial-'));
    try {
      const result = await runThreadResearchCycle({
        portfolio: await loadPortfolio(),
        root,
        executeAgents: true,
        now: new Date('2026-08-07T12:00:00.000Z'),
        agent: async (target, _prompt, reportPath) => {
          if (target.thread.ref === 'RTH-030') throw new Error('usage_limit');
          await Bun.write(reportPath, `# ${target.thread.ref}\n`);
        },
      });
      expect(result.reports.map(report => report.ref)).toEqual(['RTH-036', 'RTH-012']);
      expect(result.failures[0]).toMatchObject({ ref: 'RTH-030', errorCode: 'usage_limit' });
      const manifest = await Bun.file(join(root, '.cache/thread-research/latest.json')).json();
      expect(manifest.cycle).toBe('thread-research-20260807T120000000z');
      expect(manifest.failures[0]).toMatchObject({ ref: 'RTH-030', errorCode: 'usage_limit' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('stops the cycle and redacts details when research quota is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'project-r-thread-research-quota-'));
    try {
      const calls: string[] = [];
      const result = await runThreadResearchCycle({
        portfolio: await loadPortfolio(),
        root,
        executeAgents: true,
        now: new Date('2026-08-07T12:00:00.000Z'),
        agent: async target => {
          calls.push(target.thread.ref);
          throw new Error('usage_limit');
        },
      });
      expect(calls).toEqual(['RTH-036']);
      expect(result.failures[0]).toMatchObject({
        ref: 'RTH-036',
        errorCode: 'usage_limit',
        message: 'Research quota is unavailable; no raw agent output was retained.',
        retryAt: '2026-08-08T12:00:00.000Z',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
