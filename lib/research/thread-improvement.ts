// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
import { mkdir } from 'node:fs/promises';
import { joinPath } from '../path-bun.ts';
import {
  loadThreadPortfolio,
  type PortfolioThread,
  type ThreadLaneDefinition,
  type ThreadPortfolio,
} from '../../tools/codex-thread-portfolio.ts';

export const THREAD_RESEARCH_COUNT = 3;
export const THREAD_RESEARCH_IMPROVEMENT_FRACTION = 0.45;
export const THREAD_RESEARCH_REPORT_DIRECTORY = '.cache/thread-research';

const COMPLETED_STATES = new Set(['index', 'shipped', 'merged', 'verified']);

export type ThreadImprovementTarget = {
  thread: PortfolioThread;
  lane: ThreadLaneDefinition;
  baselineScore: number;
  targetScore: number;
  deficitClosed: number;
};

export type ThreadResearchReport = {
  ref: string;
  path: string;
  baselineScore: number;
  targetScore: number;
};

export type ThreadResearchFailure = {
  ref: string;
  error: string;
};

export type ThreadResearchCycleResult = {
  generatedAt: string;
  count: number;
  improvementFraction: number;
  targets: ThreadImprovementTarget[];
  reports: ThreadResearchReport[];
  failures: ThreadResearchFailure[];
};

export type ThreadResearchAgent = (
  target: ThreadImprovementTarget,
  prompt: string,
  reportPath: string,
  root: string
) => Promise<void>;

export function buildResearchAgentEnvironment(
  env: Record<string, string | undefined> = Bun.env
): Record<string, string> {
  const allowed = ['HOME', 'CODEX_HOME', 'LANG', 'LC_ALL', 'TMPDIR', 'TERM'] as const;
  const sanitized: Record<string, string> = {
    PATH: '/opt/homebrew/bin:/Users/nolarose/.bun/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  };
  for (const key of allowed) {
    const value = env[key]?.trim();
    if (value) sanitized[key] = value;
  }
  return sanitized;
}

export function targetScoreForDeficitClosure(
  score: number,
  improvementFraction = THREAD_RESEARCH_IMPROVEMENT_FRACTION
): number {
  return Math.min(100, score + Math.ceil((100 - score) * improvementFraction));
}

export function selectWeakestActionableThreads(
  portfolio: ThreadPortfolio,
  count = THREAD_RESEARCH_COUNT,
  improvementFraction = THREAD_RESEARCH_IMPROVEMENT_FRACTION
): ThreadImprovementTarget[] {
  return portfolio.threads
    .filter(
      thread => thread.rank > 0 && thread.quality !== 'empty' && !COMPLETED_STATES.has(thread.state)
    )
    .sort((left, right) => left.score - right.score || right.rank - left.rank)
    .slice(0, count)
    .map(thread => {
      const targetScore = targetScoreForDeficitClosure(thread.score, improvementFraction);
      return {
        thread,
        lane: portfolio.lanes[thread.lane],
        baselineScore: thread.score,
        targetScore,
        deficitClosed: targetScore - thread.score,
      };
    });
}

export function buildThreadResearchPrompt(target: ThreadImprovementTarget): string {
  const references = target.thread.references.length
    ? target.thread.references
        .map(reference => `- ${reference.kind}: ${reference.target}`)
        .join('\n')
    : '- none recorded';
  return `You are a read-only Project R research agent assigned to one cataloged thread.

Thread: ${target.thread.ref}
Title: ${target.thread.title}
Lane: ${target.thread.lane}
Baseline portfolio score: ${target.baselineScore}/100
Goal: reach at least ${target.targetScore}/100 by closing 45% of the remaining score deficit (${target.deficitClosed} points).
Lane entrypoint: ${target.lane.entrypoint}
Lane boundary: ${target.lane.boundary}
Current closure action: ${target.thread.closure}

Known references:
${references}

Inspect the repository and, when useful, current primary sources. Do not edit files, change git state, create PRs/issues, mutate thread metadata, access secrets, or claim the goal is achieved. Return a concise Markdown research brief with: verified baseline; strongest evidence; blockers and boundary conditions; a measurable plan mapped to the portfolio scoring weights; the smallest next action; exact local entrypoints/commands; and falsification criteria. Separate observed facts from recommendations.`;
}

async function resolveCodexExecutable(): Promise<string> {
  const configured = Bun.env.THREAD_RESEARCH_CODEX_BIN?.trim();
  if (configured) return configured;
  const desktopBundled = '/Applications/ChatGPT.app/Contents/Resources/codex';
  if (await Bun.file(desktopBundled).exists()) return desktopBundled;
  const discovered = Bun.which('codex');
  if (discovered) return discovered;
  const homebrew = '/opt/homebrew/bin/codex';
  if (await Bun.file(homebrew).exists()) return homebrew;
  throw new Error('codex executable not found; set THREAD_RESEARCH_CODEX_BIN');
}

export const runCodexResearchAgent: ThreadResearchAgent = async (
  _target,
  prompt,
  reportPath,
  root
) => {
  const codex = await resolveCodexExecutable();
  const child = Bun.spawn(
    [
      codex,
      'exec',
      '--ephemeral',
      '--sandbox',
      'read-only',
      '--color',
      'never',
      '--cd',
      root,
      '--output-last-message',
      reportPath,
      '-',
    ],
    {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: buildResearchAgentEnvironment(),
    }
  );
  child.stdin.write(prompt);
  child.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `Codex research agent failed (exit ${exitCode}): ${stderr.trim() || stdout.trim()}`
    );
  }
  if (!(await Bun.file(reportPath).exists())) {
    throw new Error(`Codex research agent did not write ${reportPath}`);
  }
};

export async function runThreadResearchCycle(
  options: {
    portfolio?: ThreadPortfolio;
    root?: string;
    executeAgents?: boolean;
    agent?: ThreadResearchAgent;
    now?: Date;
  } = {}
): Promise<ThreadResearchCycleResult> {
  const portfolio = options.portfolio ?? (await loadThreadPortfolio());
  const root = options.root ?? portfolio.scope.cwd;
  const generatedAt = (options.now ?? new Date()).toISOString();
  const targets = selectWeakestActionableThreads(portfolio);
  const reports: ThreadResearchReport[] = [];
  const failures: ThreadResearchFailure[] = [];

  if (options.executeAgents) {
    const directory = joinPath(root, THREAD_RESEARCH_REPORT_DIRECTORY);
    await mkdir(directory, { recursive: true });
    const date = generatedAt.slice(0, 10);
    const agent = options.agent ?? runCodexResearchAgent;
    for (const target of targets) {
      const reportPath = joinPath(directory, `${date}-${target.thread.ref.toLowerCase()}.md`);
      const report = {
        ref: target.thread.ref,
        path: reportPath,
        baselineScore: target.baselineScore,
        targetScore: target.targetScore,
      };
      if ((await Bun.file(reportPath).exists()) && Bun.file(reportPath).size > 0) {
        reports.push(report);
        continue;
      }
      try {
        await agent(target, buildThreadResearchPrompt(target), reportPath, root);
        reports.push(report);
      } catch (error) {
        failures.push({
          ref: target.thread.ref,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await Bun.write(
      joinPath(directory, 'latest.json'),
      `${JSON.stringify({ generatedAt, reports, failures }, null, 2)}\n`
    );
  }

  return {
    generatedAt,
    count: targets.length,
    improvementFraction: THREAD_RESEARCH_IMPROVEMENT_FRACTION,
    targets,
    reports,
    failures,
  };
}
