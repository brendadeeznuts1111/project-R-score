#!/usr/bin/env bun
/**
 * @fileoverview Bun-native GitHub API client
 * @description Zero-dependency GitHub operations using native Bun APIs
 *
 * Bun 1.3 Features Used:
 * - Native fetch (faster than node-fetch)
 * - Bun.env for environment variables
 * - Bun.argv for CLI args
 * - Bun.write for file output
 * - console.table for structured output
 * - Top-level await
 */

const GITHUB_API = 'https://api.github.com';
const TOKEN = Bun.env.GITHUB_TOKEN || Bun.env.GH_TOKEN;

// ANSI color codes (Bun-native terminal support)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  // Box drawing
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║', lm: '╠', rm: '╣',
};

if (!TOKEN) {
  console.error(`${c.red}GITHUB_TOKEN not set${c.reset}`);
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'nexus-bun/1.0',
};

// ============ Types ============
interface PR {
  number: number;
  title: string;
  state: string;
  mergeable: boolean | null;
  merged: boolean;
  html_url: string;
  user: { login: string };
  created_at: string;
  merged_at: string | null;
  merge_commit_sha: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
  head: { ref: string };
  base: { ref: string };
}

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}

// ============ API Helpers ============
async function ghFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${res.status}: ${(err as any).message || res.statusText}`);
  }

  return res.json();
}

// ============ Box Drawing Helper ============
function box(lines: string[], title?: string): string {
  const width = 70;
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));

  let out = `${c.cyan}${c.tl}${c.h.repeat(width)}${c.tr}${c.reset}\n`;

  if (title) {
    out += `${c.cyan}${c.v}${c.reset} ${c.bold}${title}${c.reset}${' '.repeat(width - title.length - 1)}${c.cyan}${c.v}${c.reset}\n`;
    out += `${c.cyan}${c.lm}${c.h.repeat(width)}${c.rm}${c.reset}\n`;
  }

  for (const line of lines) {
    out += `${c.cyan}${c.v}${c.reset} ${pad(line, width - 1)}${c.cyan}${c.v}${c.reset}\n`;
  }

  out += `${c.cyan}${c.bl}${c.h.repeat(width)}${c.br}${c.reset}`;
  return out;
}

// ============ Commands ============
async function getPR(owner: string, repo: string, pr: number): Promise<void> {
  const data = await ghFetch<PR>(`/repos/${owner}/${repo}/pulls/${pr}`);

  const stateColor = data.merged ? c.green : (data.state === 'open' ? c.yellow : c.red);
  const stateText = data.merged ? 'MERGED' : data.state.toUpperCase();

  const lines = [
    `${c.green}PR #${data.number}${c.reset} ${data.title.slice(0, 50)}`,
    '',
    `${c.dim}State${c.reset}       ${stateColor}${stateText}${c.reset}`,
    `${c.dim}Branch${c.reset}      ${c.cyan}${data.head.ref}${c.reset} → ${data.base.ref}`,
    `${c.dim}Author${c.reset}      ${data.user.login}`,
    `${c.dim}Created${c.reset}     ${new Date(data.created_at).toLocaleString()}`,
  ];

  if (data.merged_at) {
    lines.push(`${c.dim}Merged${c.reset}      ${new Date(data.merged_at).toLocaleString()}`);
  }

  lines.push(`${c.dim}Commit${c.reset}      ${data.merge_commit_sha?.slice(0, 7) || 'N/A'}`);
  lines.push('');
  lines.push(`${c.green}+${data.additions}${c.reset} / ${c.red}-${data.deletions}${c.reset} ${c.dim}(${data.changed_files} files)${c.reset}`);
  lines.push('');
  lines.push(`${c.dim}${data.html_url}${c.reset}`);

  console.log('\n' + box(lines, `${owner}/${repo}`) + '\n');
}

async function listPRs(owner: string, repo: string, state = 'all'): Promise<void> {
  const data = await ghFetch<PR[]>(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=10`);

  console.log(`\n${c.cyan}${c.bold}PRs for ${owner}/${repo}${c.reset}\n`);

  // Custom table with Bun-native formatting
  const rows = data.map(pr => ({
    '#': pr.number,
    title: pr.title.slice(0, 40),
    state: pr.merged ? `${c.green}MERGED${c.reset}` : pr.state.toUpperCase(),
    author: pr.user.login,
    date: new Date(pr.created_at).toLocaleDateString(),
  }));

  console.table(rows);
}

async function getCommits(owner: string, repo: string, limit = 5): Promise<void> {
  const data = await ghFetch<Commit[]>(`/repos/${owner}/${repo}/commits?per_page=${limit}`);

  console.log(`\n${c.cyan}${c.bold}Recent commits for ${owner}/${repo}${c.reset}\n`);

  const lines = data.map(commit =>
    `${c.yellow}${commit.sha.slice(0, 7)}${c.reset} ${commit.commit.message.split('\n')[0].slice(0, 50)} ${c.dim}(${commit.commit.author.name})${c.reset}`
  );

  console.log(box(lines, 'COMMITS'));
}

async function mergePR(owner: string, repo: string, pr: number, method: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<void> {
  const data = await ghFetch<{ sha: string; merged: boolean }>(
    `/repos/${owner}/${repo}/pulls/${pr}/merge`,
    {
      method: 'PUT',
      body: JSON.stringify({ merge_method: method }),
    }
  );

  if (data.merged) {
    console.log(`\n${c.green}${c.bold}PR #${pr} merged successfully${c.reset}`);
    console.log(`${c.dim}Commit: ${data.sha.slice(0, 7)}${c.reset}\n`);
  }
}

// ============ CLI ============
const [cmd, ...args] = Bun.argv.slice(2);

const usage = `
${c.cyan}${c.bold}Bun-Native GitHub CLI${c.reset}

${c.yellow}Usage:${c.reset}
  bun scripts/gh.ts pr <owner> <repo> <number>    View PR details
  bun scripts/gh.ts prs <owner> <repo> [state]    List PRs (all|open|closed)
  bun scripts/gh.ts commits <owner> <repo> [n]    Recent commits
  bun scripts/gh.ts merge <owner> <repo> <pr>     Merge PR (squash)

${c.yellow}Examples:${c.reset}
  bun scripts/gh.ts pr brendadeeznuts1111 trader-analyzer-bun 1
  bun scripts/gh.ts prs brendadeeznuts1111 trader-analyzer-bun open

${c.dim}Requires: GITHUB_TOKEN or GH_TOKEN env var${c.reset}
`;

async function main() {
  switch (cmd) {
    case 'pr':
      await getPR(args[0], args[1], parseInt(args[2]));
      break;
    case 'prs':
      await listPRs(args[0], args[1], args[2] || 'all');
      break;
    case 'commits':
      await getCommits(args[0], args[1], parseInt(args[2]) || 5);
      break;
    case 'merge':
      await mergePR(args[0], args[1], parseInt(args[2]));
      break;
    default:
      console.log(usage);
  }
}

main().catch(e => {
  console.error(`${c.red}${e.message}${c.reset}`);
  process.exit(1);
});
