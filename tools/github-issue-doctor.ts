#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/networking/fetch — Bun.fetch
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Safe-by-default GitHub issue audit and label synchronization.
 *
 *   bun run issues:audit -- --issue=235,236
 *   bun run issues:sync-labels -- --dry-run
 *   bun run issues:sync-labels:write -- --confirm=owner/name
 */

import {
  auditParsedGithubIssues,
  boundaryFindingForGithubIssue,
  buildGithubLabelSyncPlan,
  formatGithubIssueAudit,
  formatGithubLabelSyncPlan,
  type GithubIssueAuditFinding,
  type GithubLabelMutation,
} from '../lib/github-issue-tooling.ts';
import {
  parseGithubProviderIssue,
  parseGithubIssueSpineFromProvider,
  parseGithubProviderLabel,
  type GithubProviderIssue,
  type GithubProviderLabel,
  type ParsedGithubProviderIssue,
} from '../lib/github-issue-tooling-wire.ts';
import {
  ownerName,
  resolveGitHubRepositoryRef,
  type GitHubRepositoryRef,
} from '../lib/github-repository-ref.ts';

export type GithubIssueToolCommand = 'audit' | 'sync-labels';

export type GithubIssueToolArgs = {
  readonly command: GithubIssueToolCommand;
  readonly issueNumbers: readonly number[];
  readonly apiUrl?: string;
  readonly json: boolean;
  readonly dryRun: boolean;
  readonly write: boolean;
  readonly confirm?: string;
};

export type GithubIssueToolNetwork = {
  readonly apiBaseUrl: URL;
  readonly token?: string;
  readonly tokenSource: 'GITHUB_TOKEN' | 'GITHUB_ACCESS_TOKEN' | 'GH_TOKEN' | 'none';
};

export type GithubFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

function parsePositiveIssueNumbers(value: string): number[] {
  const numbers = value.split(',').map(part => Number(part.trim()));
  if (
    numbers.length === 0 ||
    numbers.some(number => !Number.isSafeInteger(number) || number <= 0)
  ) {
    throw new TypeError(`--issue requires comma-separated positive integers: ${value}`);
  }
  return [...new Set(numbers)].sort((a, b) => a - b);
}

export function parseGithubIssueToolArgs(argv: readonly string[]): GithubIssueToolArgs {
  const command = argv[0];
  if (command !== 'audit' && command !== 'sync-labels') {
    throw new TypeError('Usage: github-issue-doctor.ts <audit|sync-labels> [options]');
  }
  const issueArg = argv.find(arg => arg.startsWith('--issue='));
  const apiArg = argv.find(arg => arg.startsWith('--api-url='));
  const confirmArg = argv.find(arg => arg.startsWith('--confirm='));
  const write = argv.includes('--write');
  const dryRun = argv.includes('--dry-run') || !write;
  if (command === 'audit' && write) throw new TypeError('issues:audit is read-only');
  if (write && argv.includes('--dry-run')) {
    throw new TypeError('--write and --dry-run are mutually exclusive');
  }
  return {
    command,
    issueNumbers: issueArg ? parsePositiveIssueNumbers(issueArg.slice('--issue='.length)) : [],
    ...(apiArg ? { apiUrl: apiArg.slice('--api-url='.length) } : {}),
    json: argv.includes('--json'),
    dryRun,
    write,
    ...(confirmArg ? { confirm: confirmArg.slice('--confirm='.length) } : {}),
  };
}

export function parseGithubIssueToolNetwork(
  apiUrl: string | undefined,
  env: Readonly<Record<string, string | undefined>>
): GithubIssueToolNetwork {
  const raw = apiUrl ?? `https://${env.GITHUB_API_DOMAIN?.trim() || 'api.github.com'}`;
  let base: URL;
  try {
    base = new URL(raw);
  } catch {
    throw new TypeError(`GitHub API URL is invalid: ${JSON.stringify(raw)}`);
  }
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new TypeError(`GitHub API URL protocol must be http: or https:, got ${base.protocol}`);
  }
  if (!base.hostname || base.username || base.password || base.search || base.hash) {
    throw new TypeError('GitHub API URL must contain only protocol, hostname, optional port/path');
  }
  if (!base.pathname.endsWith('/')) base.pathname += '/';

  const candidates = [
    ['GITHUB_TOKEN', env.GITHUB_TOKEN],
    ['GITHUB_ACCESS_TOKEN', env.GITHUB_ACCESS_TOKEN],
    ['GH_TOKEN', env.GH_TOKEN],
  ] as const;
  const tokenRow = candidates.find(([, token]) => token?.trim());
  return {
    apiBaseUrl: base,
    ...(tokenRow?.[1] ? { token: tokenRow[1].trim() } : {}),
    tokenSource: tokenRow?.[0] ?? 'none',
  };
}

function repositoryApiUrl(base: URL, repository: GitHubRepositoryRef, suffix: string): URL {
  const url = new URL(base);
  const root = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  url.pathname = `${root}repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/${suffix}`;
  return url;
}

function requestHeaders(network: GithubIssueToolNetwork, write = false): Headers {
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });
  if (network.token) headers.set('Authorization', `Bearer ${network.token}`);
  if (write) headers.set('Content-Type', 'application/json');
  return headers;
}

async function fetchJson(
  fetcher: GithubFetch,
  url: URL,
  init: RequestInit,
  context: string
): Promise<unknown> {
  const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${context} failed: HTTP ${response.status}`);
  return response.json();
}

export async function fetchGithubIssues(
  repository: GitHubRepositoryRef,
  network: GithubIssueToolNetwork,
  issueNumbers: readonly number[],
  fetcher: GithubFetch = fetch
): Promise<GithubProviderIssue[]> {
  if (issueNumbers.length > 0) {
    return Promise.all(
      issueNumbers.map(async number =>
        parseGithubProviderIssue(
          await fetchJson(
            fetcher,
            repositoryApiUrl(network.apiBaseUrl, repository, `issues/${number}`),
            { headers: requestHeaders(network) },
            `GitHub issue #${number}`
          )
        )
      )
    );
  }

  const issues: GithubProviderIssue[] = [];
  for (let page = 1; ; page += 1) {
    const url = repositoryApiUrl(network.apiBaseUrl, repository, 'issues');
    url.searchParams.set('state', 'open');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const payload = await fetchJson(
      fetcher,
      url,
      { headers: requestHeaders(network) },
      `GitHub issues page ${page}`
    );
    if (!Array.isArray(payload)) throw new TypeError('GitHub issues response must be an array');
    const rows = payload.filter(row => {
      if (row == null || typeof row !== 'object') return true;
      return !('pull_request' in row);
    });
    issues.push(...rows.map(parseGithubProviderIssue));
    if (payload.length < 100) break;
  }
  return issues;
}

export async function fetchGithubLabels(
  repository: GitHubRepositoryRef,
  network: GithubIssueToolNetwork,
  fetcher: GithubFetch = fetch
): Promise<GithubProviderLabel[]> {
  const labels: GithubProviderLabel[] = [];
  for (let page = 1; ; page += 1) {
    const url = repositoryApiUrl(network.apiBaseUrl, repository, 'labels');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const payload = await fetchJson(
      fetcher,
      url,
      { headers: requestHeaders(network) },
      `GitHub labels page ${page}`
    );
    if (!Array.isArray(payload)) throw new TypeError('GitHub labels response must be an array');
    labels.push(...payload.map(parseGithubProviderLabel));
    if (payload.length < 100) break;
  }
  return labels;
}

export async function applyGithubLabelSyncPlan(
  repository: GitHubRepositoryRef,
  network: GithubIssueToolNetwork,
  plan: readonly GithubLabelMutation[],
  fetcher: GithubFetch = fetch
): Promise<void> {
  if (!network.token) throw new Error('GitHub label writes require a GitHub token');
  for (const mutation of plan) {
    const suffix =
      mutation.action === 'create' ? 'labels' : `labels/${encodeURIComponent(mutation.name)}`;
    const response = await fetcher(repositoryApiUrl(network.apiBaseUrl, repository, suffix), {
      method: mutation.action === 'create' ? 'POST' : 'PATCH',
      headers: requestHeaders(network, true),
      body: JSON.stringify({ name: mutation.name, ...mutation.after }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(
        `GitHub label ${mutation.action} ${mutation.name} failed: HTTP ${response.status}`
      );
    }
  }
}

export function assertGithubLabelWriteAuthorized(
  args: GithubIssueToolArgs,
  repository: GitHubRepositoryRef
): void {
  const expected = ownerName(repository);
  if (!args.write || args.dryRun || args.confirm !== expected) {
    throw new Error(`label writes require --write --confirm=${expected}`);
  }
}

async function runAudit(
  args: GithubIssueToolArgs,
  repository: GitHubRepositoryRef,
  network: GithubIssueToolNetwork
): Promise<number> {
  const issues = await fetchGithubIssues(repository, network, args.issueNumbers);
  const parsed: ParsedGithubProviderIssue[] = [];
  const boundaryFindings: GithubIssueAuditFinding[] = [];
  for (const issue of issues) {
    try {
      parsed.push(parseGithubIssueSpineFromProvider(issue));
    } catch (error) {
      boundaryFindings.push(
        boundaryFindingForGithubIssue(
          issue,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }
  const report = auditParsedGithubIssues(parsed, boundaryFindings);
  console.info(args.json ? JSON.stringify(report, null, 2) : formatGithubIssueAudit(report));
  return report.ok ? 0 : 1;
}

async function runSyncLabels(
  args: GithubIssueToolArgs,
  repository: GitHubRepositoryRef,
  network: GithubIssueToolNetwork
): Promise<number> {
  const plan = buildGithubLabelSyncPlan(await fetchGithubLabels(repository, network));
  console.info(args.json ? JSON.stringify(plan, null, 2) : formatGithubLabelSyncPlan(plan));
  if (args.dryRun) return 0;
  assertGithubLabelWriteAuthorized(args, repository);
  await applyGithubLabelSyncPlan(repository, network, plan);
  console.info(`github-label-sync · applied ${plan.length} mutation(s)`);
  return 0;
}

async function main(): Promise<number> {
  const args = parseGithubIssueToolArgs(Bun.argv.slice(2));
  const repository = resolveGitHubRepositoryRef({ remote: 'origin' });
  const network = parseGithubIssueToolNetwork(args.apiUrl, Bun.env);
  return args.command === 'audit'
    ? runAudit(args, repository, network)
    : runSyncLabels(args, repository, network);
}

if (import.meta.main) process.exit(await main());
