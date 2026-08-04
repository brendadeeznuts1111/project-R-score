import { joinPath } from './path-bun.ts';

/** Repository-local Codex skill-plane paths, relative to the repository root. */
export const AGENT_SKILLS_PATHS = {
  root: '.agents/skills',
  skillFile: 'SKILL.md',
  metadataFile: 'agents/openai.yaml',
  loopRegistry: 'ast-grep/skill-loop-registry.json',
} as const;

export function resolveAgentSkillsRoot(repoRoot: string): string {
  return joinPath(repoRoot, AGENT_SKILLS_PATHS.root);
}

export function resolveAgentSkillsPath(repoRoot: string, ...segments: string[]): string {
  return joinPath(resolveAgentSkillsRoot(repoRoot), ...segments);
}

export function agentSkillsDisplayPath(...segments: string[]): string {
  return joinPath(AGENT_SKILLS_PATHS.root, ...segments);
}
