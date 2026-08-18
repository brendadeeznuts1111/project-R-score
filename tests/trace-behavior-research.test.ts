import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write

type Report = {
  source: { cacheHits: number; files: number; rescannedFiles: number };
  clusters: Array<{ label: string; samples: string[] }>;
  rankedSkills: Array<{ name: string }>;
  skillImpact: Array<{
    baselineTurnsDelta: number | null;
    samples: number;
    skillName: string;
  }>;
};

const script = join(
  import.meta.dir,
  '../.agents/skills/trace-behavior-research/scripts/mine-traces.ts'
);

async function runMiner(root: string, output: string, drafts: string): Promise<void> {
  const child = Bun.spawn({
    cmd: [
      process.execPath,
      script,
      '--root',
      root,
      '--out',
      'all',
      '--output-dir',
      output,
      '--min-count',
      '2',
      '--draft-skills',
      '--draft-dir',
      drafts,
    ],
    stderr: 'pipe',
    stdout: 'pipe',
  });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe('');
  expect(exitCode).toBe(0);
}

describe('trace behavior research', () => {
  test('emits redacted formats, review-only drafts, and incremental cache hits', async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), 'trace-research-fixture-'));
    const output = join(fixtureRoot, 'reports');
    const drafts = join(fixtureRoot, 'drafts');
    const sessions = join(fixtureRoot, 'sessions');
    await mkdir(sessions, { recursive: true });
    const message = (text: string) =>
      `${JSON.stringify({ timestamp: '2026-08-18T00:00:00.000Z', payload: { content: [{ text }] } })}\n`;
    await Bun.write(
      join(sessions, 'rollout-2026-08-18-a.jsonl'),
      message(
        'Please run bun:ci and commit secret=do-not-copy alice@example.com from /Users/nolarose at 10.1.2.3'
      ) +
        `${JSON.stringify({ type: 'session_summary', timestamp: '2026-08-18T00:10:00.000Z', payload: { error_count: 0, interruption_count: 0, session_id: 'session-a', skills: ['ci-and-proof-loop'], turns_to_resolution: 6 } })}\n`
    );
    await Bun.write(
      join(sessions, 'rollout-2026-08-18-b.jsonl'),
      'not-json\n' +
        message('Use a focused test proof before the pull request commit') +
        `${JSON.stringify({ type: 'session_summary', timestamp: '2026-08-18T00:20:00.000Z', payload: { error_count: 0, interruption_count: 0, session_id: 'session-b', skills: [], turns_to_resolution: 10 } })}\n`
    );

    await runMiner(sessions, output, drafts);
    const first = (await Bun.file(join(output, 'behavior-research.json')).json()) as Report;
    expect(first.source).toMatchObject({ cacheHits: 0, files: 2, rescannedFiles: 2 });
    expect(await Bun.file(join(output, 'behavior-research.md')).exists()).toBe(true);
    expect(await Bun.file(join(output, 'behavior-research.html')).exists()).toBe(true);
    expect(await Bun.file(join(output, 'behavior-research.summary.txt')).exists()).toBe(true);
    expect(await Bun.file(join(output, 'skills.db')).exists()).toBe(true);
    expect(await Bun.file(join(drafts, 'git-delivery-loop.draft.md')).exists()).toBe(true);
    expect(await Bun.file(join(drafts, 'SKILL.md')).exists()).toBe(false);
    const samples = first.clusters.flatMap(cluster => cluster.samples).join(' ');
    expect(samples).not.toContain('alice@example.com');
    expect(samples).not.toContain('do-not-copy');
    expect(samples).not.toContain('/Users/nolarose');
    expect(samples).not.toContain('10.1.2.3');
    expect(samples).toContain('<email>');
    expect(samples).toContain('/Users/<user>');
    expect(samples).toContain('<ip-address>');
    expect(samples).toContain('<redacted>');
    expect(first.skillImpact).toContainEqual(
      expect.objectContaining({
        baselineTurnsDelta: -4,
        samples: 1,
        skillName: 'ci-and-proof-loop',
      })
    );
    expect(first.rankedSkills.map(skill => skill.name)).toContain('ci-and-proof-loop');

    await runMiner(sessions, output, drafts);
    const second = (await Bun.file(join(output, 'behavior-research.json')).json()) as Report;
    expect(second.source).toMatchObject({ cacheHits: 2, files: 2, rescannedFiles: 0 });
  });
});
