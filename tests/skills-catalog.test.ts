import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SkillPackageError,
  buildHarnessSkillsCatalog,
  buildSkillDetail,
  buildSkillsCatalog,
  packageSkill,
  parseSkillFrontmatter,
  skillPackageExists,
} from '../lib/http/skills-catalog.ts';

const prevSkills = Bun.env.PORTAL_SKILLS_DIR;
const prevPkgs = Bun.env.PORTAL_SKILLS_PACKAGES_DIR;

afterEach(() => {
  if (prevSkills === undefined) delete Bun.env.PORTAL_SKILLS_DIR;
  else Bun.env.PORTAL_SKILLS_DIR = prevSkills;
  if (prevPkgs === undefined) delete Bun.env.PORTAL_SKILLS_PACKAGES_DIR;
  else Bun.env.PORTAL_SKILLS_PACKAGES_DIR = prevPkgs;
});

describe('parseSkillFrontmatter', () => {
  test('reads inline name and description', () => {
    const fm = parseSkillFrontmatter(
      '---\nname: demo-skill\ndescription: A short description for the demo skill that is long enough.\n---\n\n# Body\n'
    );
    expect(fm.name).toBe('demo-skill');
    expect(fm.description).toContain('demo skill');
  });

  test('folds description: > blocks', () => {
    const fm = parseSkillFrontmatter(
      [
        '---',
        'name: folded',
        'description: >',
        '  First line of a folded description that continues',
        '  onto a second indented line for length.',
        '---',
        '',
        'Body',
      ].join('\n')
    );
    expect(fm.name).toBe('folded');
    expect(fm.description.length).toBeGreaterThan(40);
    expect(fm.description).not.toContain('\n');
  });
});

describe('skills catalog scan', () => {
  test('buildSkillsCatalog returns empty + warning when dir missing', async () => {
    Bun.env.PORTAL_SKILLS_DIR = join(tmpdir(), `missing-skills-${Date.now()}`);
    const catalog = await buildSkillsCatalog();
    expect(catalog.count).toBe(0);
    expect(catalog.skills).toEqual([]);
    expect(catalog.warning).toMatch(/PORTAL_SKILLS_DIR/);
  });

  test('buildSkillsCatalog lists skills and package presence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skills-'));
    const pkgs = await mkdtemp(join(tmpdir(), 'skill-pkgs-'));
    try {
      const skillDir = join(root, 'alpha-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        [
          '---',
          'name: alpha-skill',
          'description: Alpha skill description that is definitely longer than forty characters.',
          '---',
          '',
          '# Alpha',
          '',
          'Do things.',
        ].join('\n')
      );
      await writeFile(join(pkgs, 'alpha-skill.skill'), 'PK\x03\x04fake-zip');
      Bun.env.PORTAL_SKILLS_DIR = root;
      Bun.env.PORTAL_SKILLS_PACKAGES_DIR = pkgs;

      const catalog = await buildSkillsCatalog();
      expect(catalog.count).toBe(1);
      expect(catalog.skills[0]?.name).toBe('alpha-skill');
      expect(catalog.skills[0]?.hasPackage).toBe(true);
      expect(catalog.skills[0]?.validation).toEqual([]);

      const detail = await buildSkillDetail('alpha-skill');
      expect(detail?.bodyMarkdown).toContain('# Alpha');
      expect(await skillPackageExists('alpha-skill')).toBe(true);
      expect(await skillPackageExists('../escape')).toBe(false);
      expect(await buildSkillDetail('../escape')).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(pkgs, { recursive: true, force: true });
    }
  });
});

describe('buildHarnessSkillsCatalog', () => {
  test('scans repo .agents/skills harness plane', async () => {
    const root = join(import.meta.dir, '..');
    const catalog = await buildHarnessSkillsCatalog(root);
    expect(catalog.plane).toBe('harness-agents');
    expect(catalog.count).toBeGreaterThan(20);
    expect(catalog.skills.some((s) => s.name === 'reference-discovery')).toBe(true);
    expect(catalog.skills.some((s) => s.name === 'audit-gap-close')).toBe(true);
    expect(catalog.skillLoopRegistry).toContain('skill-loop-registry.json');
  });
});

describe('packageSkill', () => {
  test('rejects traversal / invalid names before filesystem touch', async () => {
    await expect(packageSkill('../etc')).rejects.toBeInstanceOf(SkillPackageError);
    await expect(packageSkill('Has Caps')).rejects.toMatchObject({ code: 'not-found' });
  });

  test('rejects missing skill with typed error', async () => {
    const root = await mkdtemp(join(tmpdir(), 'skills-empty-'));
    try {
      Bun.env.PORTAL_SKILLS_DIR = root;
      await expect(packageSkill('no-such-skill')).rejects.toMatchObject({
        code: 'not-found',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
