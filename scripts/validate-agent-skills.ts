#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/yaml — Bun.YAML
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Validate repository-local Codex skill structure and skill-loop registry alignment. */

import { dirnamePath, resolvePath } from '../lib/path-bun.ts';
import {
  AGENT_SKILLS_PATHS,
  agentSkillsDisplayPath,
  resolveAgentSkillsPath,
  resolveAgentSkillsRoot,
} from '../lib/agent-skills-paths.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { parseSkillFrontmatter } from '../lib/http/skills-catalog.ts';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('skills:validate', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const DEFAULT_REPO_ROOT = resolvePath(import.meta.dir, '..');
const SKILL_NAME_RE = /^[a-z0-9-]{1,64}$/;
const ALLOWED_FRONTMATTER_KEYS = new Set([
  'name',
  'description',
  'license',
  'allowed-tools',
  'metadata',
]);
const SHARED_SKILL_ENTRIES = new Set(['references']);
const OPTIONAL_LINKED_SKILL_ENTRIES = new Set<string>();
const REQUIRED_REGISTRY_PHASES = ['doctor', 'rate'] as const;

export type AgentSkillIssue = {
  level: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
};

export type AgentSkillValidation = {
  ok: boolean;
  skillCount: number;
  registryCount: number;
  issues: AgentSkillIssue[];
};

type ParsedSkill = {
  frontmatter: Record<string, unknown>;
  body: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(
  issues: AgentSkillIssue[],
  level: AgentSkillIssue['level'],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ level, code, path, message });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).stat();
    return true;
  } catch {
    return false;
  }
}

/** True when a skill folder still has any file (symlink stubs, agents/, etc.). */
async function skillEntryHasFiles(skillRoot: string): Promise<boolean> {
  for await (const _ of new Bun.Glob('**/*').scan({
    cwd: skillRoot,
    onlyFiles: true,
  })) {
    return true;
  }
  return false;
}

function parseFrontmatter(
  text: string,
  path: string,
  issues: AgentSkillIssue[]
): ParsedSkill | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    issue(
      issues,
      'error',
      'frontmatter-missing',
      path,
      'SKILL.md must start with YAML frontmatter'
    );
    return null;
  }

  try {
    const parsed: unknown = Bun.YAML.parse(match[1]!);
    if (!isRecord(parsed)) {
      issue(issues, 'error', 'frontmatter-shape', path, 'frontmatter must be a YAML mapping');
      return null;
    }
    return { frontmatter: parsed, body: text.slice(match[0].length).trim() };
  } catch (error) {
    issue(
      issues,
      'error',
      'frontmatter-yaml',
      path,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

async function validateLocalLinks(
  text: string,
  skillPath: string,
  displayPath: string,
  repoRoot: string,
  issues: AgentSkillIssue[]
): Promise<void> {
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;
  for (const match of text.matchAll(linkPattern)) {
    let destination = match[1]!.replace(/^<|>$/g, '');
    if (
      destination === '' ||
      destination.startsWith('#') ||
      /^[a-z][a-z0-9+.-]*:/i.test(destination)
    ) {
      continue;
    }
    destination = destination.split('#', 1)[0]!;
    try {
      destination = decodeURIComponent(destination);
    } catch {
      issue(issues, 'error', 'skill-link-encoding', displayPath, `invalid link: ${match[1]}`);
      continue;
    }
    const target = destination.startsWith('/')
      ? resolvePath(repoRoot, `.${destination}`)
      : resolvePath(dirnamePath(skillPath), destination);
    if (!(await pathExists(target))) {
      issue(
        issues,
        'error',
        'skill-link-broken',
        displayPath,
        `relative link does not resolve: ${match[1]}`
      );
    }
  }
}

function validateCanonicalSkillPaths(
  text: string,
  folderName: string,
  skillNames: ReadonlySet<string>,
  displayPath: string,
  issues: AgentSkillIssue[]
): void {
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1]!
      .trim()
      .split(/\s+/, 1)[0]!
      .replace(/[),;:]$/, '');
    const [firstSegment] = token.split('/', 1);
    if (
      firstSegment &&
      token.includes('/') &&
      firstSegment !== folderName &&
      skillNames.has(firstSegment) &&
      !token.startsWith(AGENT_SKILLS_PATHS.root)
    ) {
      issue(
        issues,
        'error',
        'skill-path-noncanonical',
        displayPath,
        `cross-skill path must start with ${AGENT_SKILLS_PATHS.root}/: ${token}`
      );
    }
  }
}

async function packageScripts(cwd: string): Promise<Set<string> | null> {
  const packagePath = resolvePath(cwd, 'package.json');
  if (!(await pathExists(packagePath))) return null;
  try {
    const parsed: unknown = await Bun.file(packagePath).json();
    if (!isRecord(parsed) || !isRecord(parsed.scripts)) return new Set();
    return new Set(Object.keys(parsed.scripts));
  } catch {
    return new Set();
  }
}

async function validateRunnableExamples(
  text: string,
  skillRoot: string,
  displayPath: string,
  repoRoot: string,
  issues: AgentSkillIssue[]
): Promise<void> {
  const shellBlockPattern = /```(?:bash|sh|zsh|shell)\r?\n([\s\S]*?)```/g;
  for (const block of text.matchAll(shellBlockPattern)) {
    let cwd = repoRoot;
    for (const rawLine of block[1]!.split(/\r?\n/)) {
      let line = rawLine.trim();
      if (line === '' || line.startsWith('#')) continue;

      const cdMatch = line.match(/^cd\s+([^\s;&|]+)(?:\s*&&\s*(.*))?$/);
      if (cdMatch) {
        cwd = resolvePath(cwd, cdMatch[1]!.replace(/^['"]|['"]$/g, ''));
        if (!(await pathExists(cwd))) {
          issue(
            issues,
            'error',
            'skill-command-cwd-missing',
            displayPath,
            `shell example changes to a missing directory: ${cdMatch[1]}`
          );
          break;
        }
        line = cdMatch[2]?.trim() ?? '';
        if (line === '') continue;
      }

      const runMatch = line.match(/^(?:[A-Z_][A-Z0-9_]*=[^\s]+\s+)*bun\s+run\s+([^\s#]+)/);
      if (!runMatch) continue;
      const target = runMatch[1]!;
      if (target.startsWith('-')) continue;

      if (target.includes('/') || /\.[cm]?[jt]sx?$/.test(target)) {
        if (!(await pathExists(resolvePath(cwd, target)))) {
          issue(
            issues,
            'error',
            'skill-command-target-missing',
            displayPath,
            `bun run target does not exist from the documented cwd: ${target}`
          );
        }
        continue;
      }

      const [scripts, owningSkillScripts] = await Promise.all([
        packageScripts(cwd),
        packageScripts(skillRoot),
      ]);
      if (!scripts?.has(target) && !owningSkillScripts?.has(target)) {
        issue(
          issues,
          'error',
          'skill-command-missing',
          displayPath,
          `bun run script does not exist from the documented cwd: ${target}`
        );
      }
    }
  }
}

async function validateBundledReferences(
  skillRoot: string,
  folderName: string,
  skillNames: ReadonlySet<string>,
  repoRoot: string,
  issues: AgentSkillIssue[]
): Promise<void> {
  for await (const relativePath of new Bun.Glob('references/**/*.md').scan({
    cwd: skillRoot,
    onlyFiles: true,
  })) {
    const referencePath = resolvePath(skillRoot, relativePath);
    const displayPath = agentSkillsDisplayPath(folderName, relativePath);
    const text = await Bun.file(referencePath).text();
    await validateLocalLinks(text, referencePath, displayPath, repoRoot, issues);
    validateCanonicalSkillPaths(text, folderName, skillNames, displayPath, issues);
    await validateRunnableExamples(text, skillRoot, displayPath, repoRoot, issues);
  }
}

async function validateMetadata(
  metadataPath: string,
  displayPath: string,
  required: boolean,
  issues: AgentSkillIssue[]
): Promise<void> {
  if (!(await pathExists(metadataPath))) {
    if (required) {
      issue(
        issues,
        'error',
        'metadata-missing',
        displayPath,
        'registered skills require agents/openai.yaml'
      );
    }
    return;
  }

  try {
    const parsed: unknown = Bun.YAML.parse(await Bun.file(metadataPath).text());
    if (!isRecord(parsed)) {
      issue(issues, 'error', 'metadata-shape', displayPath, 'metadata must be a YAML mapping');
      return;
    }
    if ('interface' in parsed && !isRecord(parsed.interface)) {
      issue(issues, 'error', 'metadata-interface', displayPath, 'interface must be a YAML mapping');
      return;
    }
    const candidate = isRecord(parsed.interface) ? parsed.interface : parsed;
    for (const field of ['display_name', 'short_description', 'default_prompt']) {
      if (typeof candidate[field] !== 'string' || candidate[field].trim() === '') {
        issue(issues, 'error', 'metadata-field', displayPath, `missing non-empty ${field}`);
      }
    }
    for (const field of ['icon_small', 'icon_large']) {
      const value = candidate[field];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.trim() === '') {
        issue(issues, 'error', 'metadata-icon', displayPath, `${field} must be a non-empty string`);
        continue;
      }
      const iconPath = resolvePath(dirnamePath(metadataPath), '..', value);
      if (!(await pathExists(iconPath))) {
        issue(
          issues,
          'error',
          'metadata-icon-missing',
          displayPath,
          `${field} does not resolve: ${value}`
        );
      }
    }
  } catch (error) {
    issue(
      issues,
      'error',
      'metadata-yaml',
      displayPath,
      error instanceof Error ? error.message : String(error)
    );
  }
}

function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
  folderName: string,
  displayPath: string,
  issues: AgentSkillIssue[]
): void {
  for (const key of Object.keys(frontmatter)) {
    if (!ALLOWED_FRONTMATTER_KEYS.has(key)) {
      issue(issues, 'error', 'frontmatter-key', displayPath, `unsupported frontmatter key: ${key}`);
    }
  }

  const name = frontmatter.name;
  if (
    typeof name !== 'string' ||
    !SKILL_NAME_RE.test(name) ||
    name.startsWith('-') ||
    name.endsWith('-') ||
    name.includes('--')
  ) {
    issue(
      issues,
      'error',
      'skill-name',
      displayPath,
      'name must be 1–64 lowercase letters, digits, or single hyphens'
    );
  } else if (name !== folderName) {
    issue(
      issues,
      'error',
      'skill-name-folder',
      displayPath,
      `frontmatter name ${name} must match folder ${folderName}`
    );
  }

  const description = frontmatter.description;
  if (typeof description !== 'string' || description.trim() === '') {
    issue(
      issues,
      'error',
      'skill-description',
      displayPath,
      'description must be a non-empty string'
    );
  } else {
    if (description.length > 1024) {
      issue(
        issues,
        'error',
        'skill-description-length',
        displayPath,
        'description exceeds 1024 characters'
      );
    }
    if (description.includes('<') || description.includes('>')) {
      issue(
        issues,
        'error',
        'skill-description-angle',
        displayPath,
        'description cannot contain angle brackets'
      );
    }
  }

  if (body === '') {
    issue(
      issues,
      'error',
      'skill-body-empty',
      displayPath,
      'SKILL.md requires Markdown instructions'
    );
  }
}

export async function validateAgentSkills(
  repoRoot: string = DEFAULT_REPO_ROOT
): Promise<AgentSkillValidation> {
  const skillsRoot = resolveAgentSkillsRoot(repoRoot);
  const registryPath = resolveAgentSkillsPath(repoRoot, AGENT_SKILLS_PATHS.loopRegistry);
  const registryDisplayPath = agentSkillsDisplayPath(AGENT_SKILLS_PATHS.loopRegistry);
  const issues: AgentSkillIssue[] = [];
  const discovered = new Map<string, string>();

  if (!(await pathExists(skillsRoot))) {
    issue(
      issues,
      'error',
      'skills-root-missing',
      AGENT_SKILLS_PATHS.root,
      'skills root is missing'
    );
    return { ok: false, skillCount: 0, registryCount: 0, issues };
  }

  let registrySkills: Record<string, unknown> = {};
  try {
    const registry: unknown = await Bun.file(registryPath).json();
    if (!isRecord(registry)) {
      issue(
        issues,
        'error',
        'registry-shape',
        registryDisplayPath,
        'registry must be a JSON object'
      );
    } else {
      if (registry.version !== 2) {
        issue(
          issues,
          'error',
          'registry-version',
          registryDisplayPath,
          'registry version must be 2'
        );
      }
      if (!isRecord(registry.skills)) {
        issue(
          issues,
          'error',
          'registry-skills',
          registryDisplayPath,
          'skills must be a JSON object'
        );
      } else {
        registrySkills = registry.skills;
      }
    }
  } catch (error) {
    issue(
      issues,
      'error',
      'registry-json',
      registryDisplayPath,
      error instanceof Error ? error.message : String(error)
    );
  }

  const skillEntries: string[] = [];
  for await (const entry of new Bun.Glob('*').scan({
    cwd: skillsRoot,
    dot: true,
    onlyFiles: false,
  })) {
    if (entry.startsWith('.') || SHARED_SKILL_ENTRIES.has(entry)) continue;
    const skillPath = resolveAgentSkillsPath(repoRoot, entry, AGENT_SKILLS_PATHS.skillFile);
    if (await pathExists(skillPath)) {
      skillEntries.push(entry);
      continue;
    }

    const entryRoot = resolveAgentSkillsPath(repoRoot, entry);
    // Empty dirs left after deleting SKILL.md (e.g. staged-test scratch trees) are not skills.
    if (!(await skillEntryHasFiles(entryRoot))) continue;

    const displayPath = agentSkillsDisplayPath(entry);
    if (OPTIONAL_LINKED_SKILL_ENTRIES.has(entry) && !(entry in registrySkills)) {
      issue(
        issues,
        'warning',
        'skill-link-unavailable',
        displayPath,
        'optional linked skill is unavailable in this checkout'
      );
    } else {
      issue(
        issues,
        'error',
        'skill-entry-broken',
        displayPath,
        'active skill entry does not resolve to SKILL.md'
      );
    }
  }

  const discoveredSkillNames = new Set(skillEntries);
  for (const folderName of skillEntries.sort()) {
    const skillPath = resolveAgentSkillsPath(repoRoot, folderName, AGENT_SKILLS_PATHS.skillFile);
    const displayPath = agentSkillsDisplayPath(folderName, AGENT_SKILLS_PATHS.skillFile);
    discovered.set(folderName, displayPath);
    const text = await Bun.file(skillPath).text();
    const parsed = parseFrontmatter(text, displayPath, issues);
    if (parsed) {
      validateFrontmatter(parsed.frontmatter, parsed.body, folderName, displayPath, issues);
      const catalogFrontmatter = parseSkillFrontmatter(text);
      if (catalogFrontmatter.name.trim() === '' || catalogFrontmatter.description.trim() === '') {
        issue(
          issues,
          'error',
          'skill-catalog-frontmatter',
          displayPath,
          'name and description must be readable by the harness skills catalog parser; use an inline scalar or an explicit > / | block'
        );
      }
    }
    await validateLocalLinks(text, skillPath, displayPath, repoRoot, issues);
    validateCanonicalSkillPaths(text, folderName, discoveredSkillNames, displayPath, issues);
    if (folderName in registrySkills) {
      await validateRunnableExamples(text, dirnamePath(skillPath), displayPath, repoRoot, issues);
      await validateBundledReferences(
        dirnamePath(skillPath),
        folderName,
        discoveredSkillNames,
        repoRoot,
        issues
      );
    }
    await validateMetadata(
      resolveAgentSkillsPath(repoRoot, folderName, AGENT_SKILLS_PATHS.metadataFile),
      agentSkillsDisplayPath(folderName, AGENT_SKILLS_PATHS.metadataFile),
      folderName in registrySkills,
      issues
    );
  }

  for (const [skillName, rawEntry] of Object.entries(registrySkills)) {
    const expectedPath = agentSkillsDisplayPath(skillName);
    if (!SKILL_NAME_RE.test(skillName)) {
      issue(
        issues,
        'error',
        'registry-skill-name',
        expectedPath,
        'registry key must be lowercase hyphen-case'
      );
    }
    if (!discovered.has(skillName)) {
      issue(issues, 'error', 'registry-skill-missing', expectedPath, 'registered skill is missing');
      continue;
    }
    if (!isRecord(rawEntry)) {
      issue(
        issues,
        'error',
        'registry-entry',
        expectedPath,
        'registry entry must be a JSON object'
      );
      continue;
    }
    if (rawEntry.path !== expectedPath) {
      issue(
        issues,
        'error',
        'registry-path',
        expectedPath,
        `registry path must be ${expectedPath}`
      );
    }
    const phases = rawEntry.phases;
    if (!isRecord(phases)) {
      issue(issues, 'error', 'registry-phases', expectedPath, 'registry entry requires phases');
      continue;
    }
    for (const phase of REQUIRED_REGISTRY_PHASES) {
      const config = phases[phase];
      if (!isRecord(config) || config.enabled !== true) {
        issue(
          issues,
          'error',
          'registry-phase',
          expectedPath,
          `registered skill requires enabled ${phase} phase`
        );
      }
    }
  }

  issues.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.code.localeCompare(b.code) ||
      a.message.localeCompare(b.message)
  );
  return {
    ok: !issues.some(item => item.level === 'error'),
    skillCount: discovered.size,
    registryCount: Object.keys(registrySkills).length,
    issues,
  };
}

function formatValidation(result: AgentSkillValidation): string {
  const lines = [
    `agent skills: ${result.skillCount} definitions · ${result.registryCount} registered`,
  ];
  for (const item of result.issues) {
    lines.push(`  ${item.level === 'error' ? 'ERROR' : 'WARN'} ${item.path}: ${item.message}`);
  }
  lines.push(result.ok ? '✅ agent skills valid' : '❌ agent skills invalid');
  return lines.join('\n');
}

if (import.meta.main) {
  const result = await validateAgentSkills();
  if (argv.includes('--json')) jsonOut(result);
  else console.info(formatValidation(result));
  if (!result.ok) process.exit(1);
}
