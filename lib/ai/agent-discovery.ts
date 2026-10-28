import { parseSkillFrontmatter } from '../http/skills-catalog.ts';
import { dirnamePath, resolvePath } from '../path-bun.ts';
import {
  type AgentDiscovery,
  type DiscoveryHit,
  type DiscoveryKind,
  readFrictionRegistry,
  matchingTerms,
  relevance,
  safeRepoPath,
  tokens,
} from './agent-path-contract.ts';

async function applicableAgentContexts(repoRoot: string, paths: string[]): Promise<string[]> {
  const found = new Set<string>();
  const candidates = paths.length > 0 ? paths : ['.'];
  for (const candidate of candidates) {
    const relative = safeRepoPath(repoRoot, candidate);
    let directory = '.';
    if (relative !== '.') {
      try {
        const stats = await Bun.file(resolvePath(repoRoot, relative)).stat();
        directory = stats.isDirectory() ? relative : dirnamePath(relative);
      } catch {
        directory = dirnamePath(relative);
      }
    }
    const chain: string[] = [];
    while (true) {
      chain.push(directory === '.' ? 'AGENTS.md' : `${directory}/AGENTS.md`);
      if (directory === '.') break;
      directory = dirnamePath(directory);
    }
    for (const path of chain.reverse()) {
      if (await Bun.file(resolvePath(repoRoot, path)).exists()) found.add(path);
    }
  }
  return [...found];
}

function guidanceEntries(markdown: string): Array<{ id: string; text: string }> {
  const entries: Array<{ id: string; text: string }> = [];
  let current = '';
  for (const line of markdown.split(/\r?\n/)) {
    if (/^- /.test(line)) {
      if (current) entries.push({ id: `guidance-${entries.length + 1}`, text: current });
      current = line.slice(2).trim();
    } else if (current && /^\s{2,}\S/.test(line)) {
      current += ` ${line.trim()}`;
    } else if (current) {
      entries.push({ id: `guidance-${entries.length + 1}`, text: current });
      current = '';
    }
  }
  if (current) entries.push({ id: `guidance-${entries.length + 1}`, text: current });
  return entries;
}

export async function discoverAgentPath(
  repoRoot: string,
  options: { query: string; paths?: string[]; limit?: number }
): Promise<AgentDiscovery> {
  const paths = (options.paths ?? []).map(path => safeRepoPath(repoRoot, path));
  const contexts = await applicableAgentContexts(repoRoot, paths);
  const query = options.query.trim();
  const queryTokens = tokens(query || paths.join(' '));
  const scopeTokens = tokens(
    paths
      .map(path => path.split('/')[0])
      .filter(segment => segment && segment !== '.')
      .join(' ')
  );
  const hits: DiscoveryHit[] = contexts.map((path, index) => ({
    kind: 'context',
    id: path,
    path,
    score: 100 - index,
    summary: 'Applicable repository guidance',
  }));

  const packageJson = await Bun.file(resolvePath(repoRoot, 'package.json')).json();
  for (const [id, command] of Object.entries(packageJson.scripts as Record<string, string>)) {
    const queryScore = relevance(queryTokens, id, command);
    if (queryScore === 0) continue;
    const score = queryScore + relevance(scopeTokens, id, '') * 2;
    hits.push({
      kind: 'command',
      id,
      command: `bun run ${id}`,
      score,
      matchedTerms: matchingTerms(queryTokens, id, command),
      summary: command.length > 140 ? `${command.slice(0, 137)}…` : command,
    });
  }

  const governance = await Bun.file(
    resolvePath(repoRoot, '.agents/skills/references/skill-governance.json')
  ).json();
  for (const [name, entry] of Object.entries(
    governance.packages as Record<string, { lifecycle: string }>
  )) {
    if (entry.lifecycle !== 'active') continue;
    const path = `.agents/skills/${name}/SKILL.md`;
    const skill = parseSkillFrontmatter(await Bun.file(resolvePath(repoRoot, path)).text());
    const score = relevance(queryTokens, name, skill.description);
    if (score === 0) continue;
    hits.push({
      kind: 'skill',
      id: name,
      path,
      score,
      matchedTerms: matchingTerms(queryTokens, name, skill.description),
      summary: skill.description,
    });
  }

  const guidancePath = 'docs/AGENTS.md';
  const guidance = guidanceEntries(await Bun.file(resolvePath(repoRoot, guidancePath)).text());
  for (const entry of guidance) {
    const score = relevance(queryTokens, entry.id, entry.text);
    if (score > 0) {
      hits.push({
        kind: 'guidance',
        id: entry.id,
        path: guidancePath,
        score,
        matchedTerms: matchingTerms(queryTokens, entry.id, entry.text),
        summary: entry.text,
      });
    }
  }

  for (const issue of (await readFrictionRegistry(repoRoot)).issues) {
    const score = relevance(queryTokens, issue.id, `${issue.title} ${issue.tags.join(' ')}`);
    if (score > 0) {
      hits.push({
        kind: 'friction',
        id: issue.id,
        score,
        matchedTerms: matchingTerms(
          queryTokens,
          issue.id,
          `${issue.title} ${issue.tags.join(' ')}`
        ),
        summary: `${issue.status}: ${issue.title}${issue.prevention ? ` · ${issue.prevention}` : ''}`,
      });
    }
  }

  const limit = Math.max(1, Math.min(options.limit ?? 8, 20));
  const rankedByKind = (kind: DiscoveryKind, count: number) =>
    hits
      .filter(hit => hit.kind === kind)
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
      .slice(0, count);
  const ranked = [
    ...rankedByKind('command', 3),
    ...rankedByKind('skill', 2),
    ...rankedByKind('guidance', 2),
    ...rankedByKind('friction', 1),
  ].slice(0, limit);
  return {
    schemaVersion: 1,
    query,
    paths,
    contexts,
    hits: [...hits.filter(hit => hit.kind === 'context'), ...ranked],
  };
}
