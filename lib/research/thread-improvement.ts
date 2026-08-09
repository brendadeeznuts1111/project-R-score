// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
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

const RESEARCHABLE_STATES = new Set(['open', 'ready', 'local', 'pushed', 'incomplete', 'planned']);
export const USAGE_LIMIT_RETRY_MS = 24 * 60 * 60 * 1000;

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
  errorCode: 'usage_limit' | 'agent_failed';
  message: string;
  retryAt?: string;
};

export type ThreadResearchCycleResult = {
  cycle: string;
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
      thread =>
        thread.rank > 0 &&
        thread.quality !== 'empty' &&
        (RESEARCHABLE_STATES.has(thread.state) ||
          (thread.state === 'blocked' && thread.researchEligible))
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
    const output = `${stderr}\n${stdout}`;
    if (/usage limit/i.test(output)) throw new Error('usage_limit');
    throw new Error(`agent_failed_exit_${exitCode}`);
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
  const cycle = `thread-research-${generatedAt.replace(/[-:.]/g, '').replace('Z', 'z')}`;
  const targets = selectWeakestActionableThreads(portfolio);
  const reports: ThreadResearchReport[] = [];
  const failures: ThreadResearchFailure[] = [];

  if (options.executeAgents) {
    const directory = joinPath(root, THREAD_RESEARCH_REPORT_DIRECTORY);
    const mkdir = Bun.spawn(['mkdir', '-p', directory]);
    if ((await mkdir.exited) !== 0) {
      throw new Error(`Unable to create thread research report directory: ${directory}`);
    }
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
        const code =
          error instanceof Error && error.message === 'usage_limit'
            ? 'usage_limit'
            : 'agent_failed';
        failures.push({
          ref: target.thread.ref,
          errorCode: code,
          message:
            code === 'usage_limit'
              ? 'Research quota is unavailable; no raw agent output was retained.'
              : 'Research agent failed; inspect the scheduler log for the exit status.',
          ...(code === 'usage_limit'
            ? { retryAt: new Date(Date.parse(generatedAt) + USAGE_LIMIT_RETRY_MS).toISOString() }
            : {}),
        });
        if (code === 'usage_limit') break;
      }
    }
    await Bun.write(
      joinPath(directory, 'latest.json'),
      `${JSON.stringify({ cycle, generatedAt, reports, failures }, null, 2)}\n`
    );
  }

  return {
    cycle,
    generatedAt,
    count: targets.length,
    improvementFraction: THREAD_RESEARCH_IMPROVEMENT_FRACTION,
    targets,
    reports,
    failures,
  };
}
