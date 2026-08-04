// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Skills catalog — scan a skills directory for per-skill SKILL.md files and
 * expose a JSON summary.
 * Bun-native only (Bun.Glob, Bun.file, Bun.spawn). No yaml dependency:
 * frontmatter is parsed minimally for `name` / `description` (including
 * `description: >` folded blocks).
 *
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
 *
 *   PORTAL_SKILLS_DIR          — skills root (default: Kimi Work managed skills dir)
 *   PORTAL_SKILLS_PACKAGES_DIR — *.skill package drop dir (default: public/skills)
 *
 * Harness plane (repo `.agents/skills/`) is separate — see `buildHarnessSkillsCatalog()`
 * and baked `/registry/harness-skills-catalog.json` (not Kimi `skills-catalog.json`).
 *
 * Missing/inaccessible dirs never crash the route: they yield
 * `{ skills: [], count: 0, error, warning }` with HTTP 200.
 */

import {
  AGENT_SKILLS_PATHS,
  agentSkillsDisplayPath,
  resolveAgentSkillsRoot,
} from '../agent-skills-paths';

const DEFAULT_SKILLS_DIR =
  '/Users/nolarose/Library/Application Support/kimi-desktop/daimon-share/daimon/skills';
const DEFAULT_PACKAGES_DIR = 'public/skills';

/** Path-traversal-proof skill name (single segment, hyphen-case). */
const SKILL_NAME_RE = /^[a-z0-9-]{1,64}$/;

export interface SkillResources {
  scripts: number;
  references: number;
  assets: number;
}

export interface SkillEntry {
  name: string;
  description: string;
  /** ISO 8601 mtime of the SKILL.md file. */
  updatedAt: string;
  /** True when a matching `<name>.skill` archive exists in the packages dir. */
  hasPackage: boolean;
  /** Line count of the SKILL.md file. */
  lineCount: number;
  /** File counts in conventional resource subdirs. */
  resources: SkillResources;
  /** skill-creator style validation warnings (empty = clean). */
  validation: string[];
}

export interface SkillFile {
  /** Path relative to the skill dir (e.g. `scripts/run.sh`). */
  path: string;
  bytes: number;
}

export interface SkillDetail extends Omit<SkillEntry, 'hasPackage'> {
  /** Raw SKILL.md body with the frontmatter block stripped. */
  bodyMarkdown: string;
  files: SkillFile[];
}

export interface SkillsCatalog {
  skills: SkillEntry[];
  count: number;
  /** Present when the skills dir could not be scanned (empty result, HTTP 200). */
  error?: string;
  /** Human-readable note for the portal banner. */
  warning?: string;
}

/** Repo harness agent skills plane — distinct from Kimi PORTAL_SKILLS_DIR catalog. */
export interface HarnessSkillsCatalog extends SkillsCatalog {
  plane: 'harness-agents';
  skillLoopRegistry: string;
  scannedAt: string;
}

/** Typed packaging failure — `code` drives the HTTP status mapping. */
export class SkillPackageError extends Error {
  constructor(
    public readonly code: 'not-found' | 'zip-failed',
    message: string
  ) {
    super(message);
    this.name = 'SkillPackageError';
  }
}

function skillsDir(): string {
  return (Bun.env.PORTAL_SKILLS_DIR || '').trim() || DEFAULT_SKILLS_DIR;
}

function packagesDir(): string {
  return (Bun.env.PORTAL_SKILLS_PACKAGES_DIR || '').trim() || DEFAULT_PACKAGES_DIR;
}

/**
 * Minimal YAML frontmatter reader — extracts `name` and `description` only.
 * Handles inline scalars, single/double quotes, and `>` / `|-` style block
 * scalars (continuation lines indented deeper than the key).
 */
/** @internal exported for unit tests — frontmatter wire edge for SKILL.md */
export function parseSkillFrontmatter(text: string): { name: string; description: string } {
  return parseFrontmatter(text);
}

function parseFrontmatter(text: string): { name: string; description: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = { name: '', description: '' };
  if (!m) return out;
  const body = m[1]!;
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i]!.match(/^(name|description):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1] as 'name' | 'description';
    let value = kv[2]!.trim();
    if (value === '>' || value === '>-' || value === '|' || value === '|-') {
      // Folded/literal block: join following indented lines.
      const block: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const cont = lines[j]!;
        if (/^\s+\S/.test(cont)) block.push(cont.trim());
        else if (cont.trim() === '') block.push('');
        else break;
      }
      value = block
        .join(value.startsWith('|') ? '\n' : ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      value = value.replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
    }
    out[key] = value;
  }
  return out;
}

/** Split raw SKILL.md text into frontmatter block and markdown body. */
function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!m) return { frontmatter: '', body: text };
  return { frontmatter: m[0]!, body: text.slice(m[0]!.length) };
}

/** Count files under conventional resource subdirs of a skill dir. */
async function countResources(skillDirAbs: string): Promise<SkillResources> {
  const out: SkillResources = { scripts: 0, references: 0, assets: 0 };
  for (const sub of ['scripts', 'references', 'assets'] as const) {
    try {
      const glob = new Bun.Glob(`${sub}/**/*`);
      for await (const _ of glob.scan({ cwd: skillDirAbs, onlyFiles: true })) out[sub]++;
    } catch {
      // Missing/unreadable subdir — count stays 0.
    }
  }
  return out;
}

/** skill-creator rules: hyphen-case name, real description, bounded body. */
function validateSkill(name: string, description: string, bodyLines: number): string[] {
  const warnings: string[] = [];
  if (!SKILL_NAME_RE.test(name)) warnings.push(`name "${name}" is not hyphen-case (^[a-z0-9-]+$)`);
  if (!description) warnings.push('frontmatter missing description');
  else if (description.length < 40)
    warnings.push(`description too short (${description.length} chars, want ≥40)`);
  if (bodyLines > 500) warnings.push(`body too long (${bodyLines} lines, want ≤500)`);
  return warnings;
}

function lineCountOf(text: string): number {
  return text === '' ? 0 : text.split(/\r?\n/).length;
}

async function scanSkillsDirectory(
  dir: string,
  pkgs: string | null,
  unavailableNote?: string
): Promise<{ skills: SkillEntry[]; error?: string; warning?: string }> {
  try {
    const glob = new Bun.Glob('*/SKILL.md');
    const skills: SkillEntry[] = [];
    for await (const path of glob.scan({ cwd: dir, absolute: true, onlyFiles: true })) {
      try {
        const file = Bun.file(path);
        const text = await file.text();
        const fm = parseFrontmatter(text);
        const { body } = splitFrontmatter(text);
        const dirName = path.split('/').slice(-2, -1)[0] ?? '';
        const name = fm.name || dirName;
        if (!name) continue;
        const pkg = pkgs ? Bun.file(`${pkgs}/${name}.skill`) : null;
        const lineCount = lineCountOf(text);
        skills.push({
          name,
          description: fm.description,
          updatedAt: new Date(file.lastModified).toISOString(),
          hasPackage: pkg ? await pkg.exists() : false,
          lineCount,
          resources: await countResources(path.split('/').slice(0, -1).join('/')),
          validation: validateSkill(fm.name, fm.description, lineCountOf(body)),
        });
      } catch {
        // Unreadable file — skip, never abort the scan.
      }
    }
    skills.sort((a, b) => a.name.localeCompare(b.name));
    return { skills };
  } catch (err) {
    return {
      skills: [],
      error: err instanceof Error ? err.message : String(err),
      warning: unavailableNote ?? `Skills directory unavailable (${dir}) — set PORTAL_SKILLS_DIR.`,
    };
  }
}

/** Scan repo `.agents/skills/` for harness agent skills (not Kimi plane). Never throws. */
export async function buildHarnessSkillsCatalog(
  rootDir: string = process.cwd()
): Promise<HarnessSkillsCatalog> {
  const dir = resolveAgentSkillsRoot(rootDir);
  const result = await scanSkillsDirectory(
    dir,
    null,
    `Harness skills directory unavailable (${dir}).`
  );
  return {
    plane: 'harness-agents',
    skillLoopRegistry: agentSkillsDisplayPath(AGENT_SKILLS_PATHS.loopRegistry),
    scannedAt: new Date().toISOString(),
    skills: result.skills,
    count: result.skills.length,
    error: result.error,
    warning: result.warning,
  };
}

/** Scan the skills dir and build the catalog payload. Never throws. */
export async function buildSkillsCatalog(): Promise<SkillsCatalog> {
  const dir = skillsDir();
  const pkgs = packagesDir();
  const result = await scanSkillsDirectory(dir, pkgs);
  return {
    skills: result.skills,
    count: result.skills.length,
    error: result.error,
    warning: result.warning,
  };
}

/**
 * Full detail for one skill — null when the name is invalid or the skill
 * does not exist. Name is regex-gated before any filesystem touch.
 */
export async function buildSkillDetail(name: string): Promise<SkillDetail | null> {
  if (!SKILL_NAME_RE.test(name)) return null;
  const dir = skillsDir();
  const skillDirAbs = `${dir}/${name}`;
  const skillFile = Bun.file(`${skillDirAbs}/SKILL.md`);
  if (!(await skillFile.exists())) return null;
  try {
    const text = await skillFile.text();
    const fm = parseFrontmatter(text);
    const { body } = splitFrontmatter(text);
    const files: SkillFile[] = [];
    const glob = new Bun.Glob('**/*');
    for await (const rel of glob.scan({ cwd: skillDirAbs, onlyFiles: true })) {
      try {
        files.push({ path: rel, bytes: Bun.file(`${skillDirAbs}/${rel}`).size });
      } catch {
        // Unreadable file — skip.
      }
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return {
      name: fm.name || name,
      description: fm.description,
      updatedAt: new Date(skillFile.lastModified).toISOString(),
      lineCount: lineCountOf(text),
      resources: await countResources(skillDirAbs),
      validation: validateSkill(fm.name, fm.description, lineCountOf(body)),
      bodyMarkdown: body,
      files,
    };
  } catch {
    return null;
  }
}

/** True when `<name>.skill` exists in the packages dir (detail-page download link). */
export async function skillPackageExists(name: string): Promise<boolean> {
  if (!SKILL_NAME_RE.test(name)) return false;
  return Bun.file(`${packagesDir()}/${name}.skill`).exists();
}

/**
 * Zip a skill dir into `<packagesDir>/<name>.skill` via the macOS `zip` CLI.
 * Returns archive size + sha256. Throws SkillPackageError (typed).
 */
export async function packageSkill(
  name: string,
  packagesDirOverride?: string
): Promise<{ name: string; bytes: number; sha256: string }> {
  if (!SKILL_NAME_RE.test(name))
    throw new SkillPackageError('not-found', `bad skill name: ${name}`);
  const dir = skillsDir();
  const pkgs = (packagesDirOverride || '').trim() || packagesDir();
  const skillDirAbs = `${dir}/${name}`;
  if (!(await Bun.file(`${skillDirAbs}/SKILL.md`).exists()))
    throw new SkillPackageError('not-found', `no such skill: ${name}`);
  await Bun.$`mkdir -p ${pkgs}`.quiet();
  const target = `${pkgs}/${name}.skill`;
  const proc = Bun.spawn(['zip', '-r', '-q', target, name], {
    cwd: dir,
    stdout: 'ignore',
    stderr: 'pipe',
  });
  const code = await proc.exited;
  if (code !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new SkillPackageError('zip-failed', `zip exited ${code}: ${stderr.trim()}`);
  }
  const buf = await Bun.file(target).arrayBuffer();
  const sha256 = new Bun.CryptoHasher('sha256').update(new Uint8Array(buf)).digest('hex');
  return { name, bytes: buf.byteLength, sha256 };
}
