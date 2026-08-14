import { afterEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  AGENT_SKILLS_PATHS,
  agentSkillsDisplayPath,
  resolveAgentSkillsPath,
  resolveAgentSkillsRoot,
} from '../lib/agent-skills-paths.ts';
import { validateAgentSkills } from '../scripts/validate-agent-skills.ts';
import { parseProjectRDxContract } from '../scripts/check-project-r-dx-contract.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'agent-skills-'));
  roots.push(root);
  await mkdir(resolveAgentSkillsRoot(root), { recursive: true });
  return root;
}

async function writeSkill(
  root: string,
  name: string,
  options: { frontmatterExtra?: string; body?: string; metadata?: boolean } = {}
): Promise<void> {
  const folder = resolveAgentSkillsPath(root, name);
  const metadataPath = resolveAgentSkillsPath(root, name, AGENT_SKILLS_PATHS.metadataFile);
  await mkdir(dirname(metadataPath), { recursive: true });
  await writeFile(
    join(folder, AGENT_SKILLS_PATHS.skillFile),
    [
      '---',
      `name: ${name}`,
      'description: A complete skill description that says what it does and when to use it.',
      options.frontmatterExtra,
      '---',
      '',
      options.body ?? `# ${name}`,
    ]
      .filter(value => value !== undefined && value !== '')
      .join('\n')
  );
  if (options.metadata === false) return;
  await writeFile(
    metadataPath,
    [
      'interface:',
      `  display_name: "${name}"`,
      '  short_description: "Validate a repository-local skill"',
      `  default_prompt: "Use $${name} to validate this skill."`,
    ].join('\n')
  );
}

async function writeRegistry(root: string, names: string[], skillsValue?: unknown): Promise<void> {
  const registryPath = resolveAgentSkillsPath(root, AGENT_SKILLS_PATHS.loopRegistry);
  const registryFolder = dirname(registryPath);
  await mkdir(registryFolder, { recursive: true });
  if (!(await Bun.file(join(registryFolder, AGENT_SKILLS_PATHS.skillFile)).exists())) {
    await writeSkill(root, 'ast-grep');
  }
  const skills =
    skillsValue ??
    Object.fromEntries(
      names.map(name => [
        name,
        {
          path: agentSkillsDisplayPath(name),
          phases: { doctor: { enabled: true }, rate: { enabled: true } },
        },
      ])
    );
  await writeFile(
    registryPath,
    JSON.stringify({ version: 2, skills })
  );
}

describe('validateAgentSkills', () => {
  it('accepts aligned skill, metadata, and registry entries', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'demo-skill');
    await writeRegistry(root, ['demo-skill']);

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(true);
    expect(result.skillCount).toBe(2);
    expect(result.registryCount).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it('rejects unsupported frontmatter and non-empty directories without SKILL.md', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'demo-skill', { frontmatterExtra: 'triggers: [demo]' });
    await mkdir(resolveAgentSkillsPath(root, 'broken-entry', 'agents'), { recursive: true });
    await writeFile(resolveAgentSkillsPath(root, 'broken-entry', 'agents', 'openai.yaml'), 'name: x\n');
    await writeRegistry(root, ['demo-skill']);

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(false);
    expect(result.issues.map(item => item.code)).toContain('frontmatter-key');
    expect(result.issues.map(item => item.code)).toContain('skill-entry-broken');
  });

  it('ignores empty skill directories left without SKILL.md', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'demo-skill');
    await mkdir(resolveAgentSkillsPath(root, 'retired-skill'), { recursive: true });
    await writeRegistry(root, ['demo-skill']);

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(true);
    expect(result.issues.map(item => item.code)).not.toContain('skill-entry-broken');
  });

  it('rejects malformed registry entries and missing registered metadata', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'demo-skill', { metadata: false });
    await writeRegistry(root, [], {
      'demo-skill': {
        path: agentSkillsDisplayPath('not-demo-skill'),
        phases: { doctor: { enabled: false } },
      },
    });

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(false);
    expect(result.issues.map(item => item.code)).toContain('metadata-missing');
    expect(result.issues.map(item => item.code)).toContain('registry-path');
    expect(result.issues.filter(item => item.code === 'registry-phase')).toHaveLength(2);
  });

  it('rejects broken relative links in skill bodies', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'demo-skill', { body: '# Demo\n\n[missing](references/missing.md)' });
    await writeRegistry(root, ['demo-skill']);

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(false);
    expect(result.issues.map(item => item.code)).toContain('skill-link-broken');
    expect(result.issues.map(item => item.code)).not.toContain('skill-entry-broken');
  });

  it('rejects phantom bun scripts and noncanonical cross-skill paths', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'other-skill');
    await writeSkill(root, 'demo-skill', {
      body: [
        '# Demo',
        '',
        'Do not use `other-skill/SKILL.md` as a repository path.',
        '',
        '```bash',
        'bun run missing:proof',
        '```',
      ].join('\n'),
    });
    await writeRegistry(root, ['demo-skill']);

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(false);
    expect(result.issues.map(item => item.code)).toContain('skill-path-noncanonical');
    expect(result.issues.map(item => item.code)).toContain('skill-command-missing');
  });

  it('accepts a skill-local bun script after an explicit cd', async () => {
    const root = await fixtureRoot();
    await writeSkill(root, 'demo-skill', {
      body: '# Demo\n\n```bash\ncd .agents/skills/demo-skill\nbun run doctor\n```',
    });
    await writeFile(
      resolveAgentSkillsPath(root, 'demo-skill', 'package.json'),
      JSON.stringify({ scripts: { doctor: 'bun --version' } })
    );
    await writeRegistry(root, ['demo-skill']);

    const result = await validateAgentSkills(root);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('keeps the repository skill plane valid', async () => {
    const result = await validateAgentSkills(join(import.meta.dir, '..'));
    expect(result.issues.filter(item => item.level === 'error')).toEqual([]);
  });

  it('hydrates the ast-grep doctor pin without filtering the root workspace', async () => {
    const install = await Bun.file(
      resolveAgentSkillsPath(
        join(import.meta.dir, '..'),
        'ast-grep',
        'scripts',
        'install.sh'
      )
    ).text();
    expect(install).toContain('cd "$SKILL_ROOT"');
    expect(install).not.toContain('--filter');
  });
});

describe('Project R DX contract', () => {
  it('keeps installed skills and global pointers repository-owned', async () => {
    const root = join(import.meta.dir, '..');
    const result = await parseProjectRDxContract(root);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.contract?.installedSkills).toEqual([
      'project-r-ops-management',
      'project-r-skill-maintenance',
    ]);
    expect(result.contract?.globalAuthorityPointers).toContain('docs/BUN_DOCS_OPERATE.md');
  });

  it('fails closed on unsafe paths, duplicate skills, and missing authority files', async () => {
    const root = await fixtureRoot();
    const result = await parseProjectRDxContract(root, {
      schemaVersion: 1,
      projectKey: 'project-r',
      agentContext: '../AGENTS.md',
      skillAuthority: '.agents/skills',
      installedSkills: ['demo-skill', 'demo-skill'],
      globalAuthorityPointers: ['docs/missing.md'],
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toContain('agentContext must be a safe relative path');
    expect(result.issues).toContain('installedSkills must be unique');
  });
});
