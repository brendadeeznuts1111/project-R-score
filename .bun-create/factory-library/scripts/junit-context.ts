import { $ } from 'bun';

export type JunitContext = {
  schemaVersion: 2;
  generatedAt: string;
  reportContext: 'ci' | 'local';
  commit?: string;
  commitSource: 'environment' | 'git' | 'unavailable';
  runId?: string;
  runIdSource: 'environment' | 'unavailable';
  repository?: string;
  repositorySource: 'environment' | 'git-remote' | 'unavailable';
  branch?: string;
  branchSource: 'environment' | 'git' | 'detached' | 'unavailable';
};

type Environment = Record<string, string | undefined>;

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

type GitText = { available: boolean; value?: string };

async function gitText(command: 'branch' | 'commit' | 'remote'): Promise<GitText> {
  const result =
    command === 'branch'
      ? await $`git branch --show-current`.nothrow().quiet()
      : command === 'commit'
        ? await $`git rev-parse HEAD`.nothrow().quiet()
        : await $`git config --get remote.origin.url`.nothrow().quiet();
  return result.exitCode === 0
    ? { available: true, value: nonEmpty(result.stdout.toString()) }
    : { available: false };
}

export function repositoryFromRemote(remote: string): string | undefined {
  const normalized = remote
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');
  return normalized.match(/(?:[:/])([^/:]+\/[^/]+)$/)?.[1];
}

export async function resolveJunitContext(
  env: Environment = Bun.env,
  now = new Date()
): Promise<JunitContext> {
  const [gitCommit, remote, gitBranch] = await Promise.all([
    gitText('commit'),
    gitText('remote'),
    gitText('branch'),
  ]);
  const environmentCommit =
    nonEmpty(env.GITHUB_SHA) ?? nonEmpty(env.CI_COMMIT_SHA) ?? nonEmpty(env.GIT_SHA);
  const environmentRunId = nonEmpty(env.GITHUB_RUN_ID);
  const environmentServerUrl = nonEmpty(env.GITHUB_SERVER_URL);
  const environmentRepository = nonEmpty(env.GITHUB_REPOSITORY);
  const environmentBranch = nonEmpty(env.GITHUB_REF_NAME);
  const repositoryFromGit = remote.value ? repositoryFromRemote(remote.value) : undefined;
  const reportContext =
    nonEmpty(env.CI) ||
    environmentRunId ||
    environmentServerUrl ||
    environmentRepository ||
    nonEmpty(env.CI_JOB_URL)
      ? 'ci'
      : 'local';

  return {
    schemaVersion: 2,
    generatedAt: now.toISOString(),
    reportContext,
    ...(environmentCommit
      ? { commit: environmentCommit, commitSource: 'environment' as const }
      : gitCommit.value
        ? { commit: gitCommit.value, commitSource: 'git' as const }
        : { commitSource: 'unavailable' as const }),
    ...(environmentRunId
      ? { runId: environmentRunId, runIdSource: 'environment' as const }
      : { runIdSource: 'unavailable' as const }),
    ...(environmentRepository
      ? { repository: environmentRepository, repositorySource: 'environment' as const }
      : repositoryFromGit
        ? { repository: repositoryFromGit, repositorySource: 'git-remote' as const }
        : { repositorySource: 'unavailable' as const }),
    ...(environmentBranch
      ? { branch: environmentBranch, branchSource: 'environment' as const }
      : gitBranch.value
        ? { branch: gitBranch.value, branchSource: 'git' as const }
        : gitBranch.available
          ? { branchSource: 'detached' as const }
          : { branchSource: 'unavailable' as const }),
  };
}

export function junitContextPath(reportPath: string): string {
  const separator = Math.max(reportPath.lastIndexOf('/'), reportPath.lastIndexOf('\\'));
  return `${separator === -1 ? '' : reportPath.slice(0, separator + 1)}junit-context.json`;
}

export function junitEnvironment(context: JunitContext, env: Environment): Record<string, string> {
  const existingCommit =
    nonEmpty(env.GITHUB_SHA) ?? nonEmpty(env.CI_COMMIT_SHA) ?? nonEmpty(env.GIT_SHA);
  // Never manufacture CI fields. Bun emits its native `ci` property only when
  // the caller/CI supplied real CI context. A local Git commit is still useful
  // and can be supplied through Bun's documented GIT_SHA fallback.
  return context.commit && !existingCommit ? { GIT_SHA: context.commit } : {};
}

function isJunitContext(value: unknown): value is JunitContext {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== 2) return false;
  const requiredStrings = [
    'generatedAt',
    'reportContext',
    'commitSource',
    'runIdSource',
    'repositorySource',
    'branchSource',
  ];
  const optionalString = (key: string): string | undefined => {
    const field = candidate[key];
    return typeof field === 'string' && field.trim() ? field : undefined;
  };
  const sourceMatches = (
    source: unknown,
    field: string | undefined,
    valueSources: readonly string[]
  ): boolean =>
    source === 'unavailable'
      ? field === undefined
      : valueSources.includes(source as string) && field !== undefined;

  const commit = optionalString('commit');
  const runId = optionalString('runId');
  const repository = optionalString('repository');
  const branch = optionalString('branch');
  return (
    requiredStrings.every(key => typeof candidate[key] === 'string' && candidate[key].length > 0) &&
    ['ci', 'local'].includes(candidate.reportContext as string) &&
    ['environment', 'git', 'unavailable'].includes(candidate.commitSource as string) &&
    ['environment', 'unavailable'].includes(candidate.runIdSource as string) &&
    ['environment', 'git-remote', 'unavailable'].includes(candidate.repositorySource as string) &&
    ['environment', 'git', 'detached', 'unavailable'].includes(candidate.branchSource as string) &&
    sourceMatches(candidate.commitSource, commit, ['environment', 'git']) &&
    sourceMatches(candidate.runIdSource, runId, ['environment']) &&
    sourceMatches(candidate.repositorySource, repository, ['environment', 'git-remote']) &&
    (candidate.branchSource === 'detached' || candidate.branchSource === 'unavailable'
      ? branch === undefined
      : sourceMatches(candidate.branchSource, branch, ['environment', 'git']))
  );
}

export async function writeJunitContext(
  reportPath: string,
  context: JunitContext
): Promise<string> {
  const path = junitContextPath(reportPath);
  await Bun.write(path, `${JSON.stringify(context, null, 2)}\n`);
  return path;
}

export async function readJunitContext(reportPath: string): Promise<JunitContext | undefined> {
  const file = Bun.file(junitContextPath(reportPath));
  if (!(await file.exists())) return undefined;
  try {
    const value = await file.json();
    return isJunitContext(value) ? value : undefined;
  } catch {
    return undefined;
  }
}
