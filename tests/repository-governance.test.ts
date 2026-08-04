// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from 'bun:test';

import mainRuleset from '../.github/rulesets/main.json' with { type: 'json' };
import tagRuleset from '../.github/rulesets/release-tags.json' with { type: 'json' };
import packageJson from '../package.json' with { type: 'json' };
import { getReleaseSteps, RELEASE_COMMIT_PATHS } from '../scripts/release.ts';

function ruleTypes(ruleset: { rules: Array<{ type: string }> }): Set<string> {
  return new Set(ruleset.rules.map(rule => rule.type));
}

describe('repository governance', () => {
  test('main is PR-only, linear, locally gated, and non-destructive', async () => {
    expect(mainRuleset.target).toBe('branch');
    expect(mainRuleset.enforcement).toBe('active');
    expect(mainRuleset.conditions.ref_name.include).toContain('~DEFAULT_BRANCH');
    expect(ruleTypes(mainRuleset)).toEqual(
      new Set([
        'deletion',
        'non_fast_forward',
        'required_linear_history',
        'pull_request',
      ])
    );

    expect(mainRuleset.rules.find(rule => rule.type === 'required_status_checks')).toBeUndefined();
    expect(packageJson.scripts['bun:ci']).toContain('scripts/bun-ci.ts');
    expect(packageJson.scripts['bun:ci']).toContain('--env-file ~/.reasonix/.env');
    expect(packageJson.scripts['bun:ci']).not.toContain('R2_BUCKET_NAME=');
    const localCi = await Bun.file(`${import.meta.dir}/../scripts/bun-ci.ts`).text();
    expect(localCi).toContain("['bun', 'run', 'ci:core']");
    expect(localCi).toContain("['bun', 'run', 'ci:types']");
    expect(localCi).toContain("['bun', 'run', 'ci:security']");
    expect(localCi).toContain("['bun', 'run', 'ci:portal-registry']");
    expect(localCi).toContain("from '../lib/macros/git-commit.ts'");
    expect(localCi).not.toContain("type: 'macro'");
    expect(localCi).toContain("Bun.env.R2_BUCKET_NAME");
    expect(localCi).toContain('factory-wager-wiki');
  });

  test('release tags in the v* namespace are immutable', () => {
    expect(tagRuleset.target).toBe('tag');
    expect(tagRuleset.conditions.ref_name.include).toEqual(['refs/tags/v*']);
    expect(ruleTypes(tagRuleset)).toEqual(
      new Set(['deletion', 'update', 'non_fast_forward'])
    );
  });

  test('release workflow defers tags and stages only owned paths', () => {
    const steps = getReleaseSteps('patch');
    expect(steps.find(step => step.name === 'Bump version')?.cmd).toContain(
      '--no-git-tag-version'
    );
    expect(RELEASE_COMMIT_PATHS).toEqual(['package.json', 'CHANGELOG.md']);
  });

  test('local-only repositories and prototypes are quarantined', async () => {
    const ignore = await Bun.file(`${import.meta.dir}/../.gitignore`).text();
    expect(ignore).toContain('/king-zippy-umbra-acre/');
    expect(ignore).toContain('/artifacts/deeplink-automation/');
  });

  test('root examples and skill guidance stay Bun-native and Oxlint-free', async () => {
    expect(packageJson.cheatsheets.code.typescript.examples['Nullish Coalescing']).toContain(
      'Bun.env.PORT'
    );
    expect(packageJson.cheatsheets.code.bun.examples['Spawn with CWD']).toContain(
      "Bun.spawn(['bun', 'install']"
    );
    expect(packageJson.cheatsheets.code.bun.examples['Check Env']).not.toContain('process.env');

    const workerGuidance = await Promise.all(
      [
        '.agents/skills/workers-best-practices/SKILL.md',
        '.agents/skills/workers-best-practices/references/review.md',
        '.agents/skills/workers-best-practices/references/rules.md',
      ].map(path => Bun.file(`${import.meta.dir}/../${path}`).text())
    );
    const combinedGuidance = workerGuidance.join('\n');
    expect(combinedGuidance).not.toMatch(/\bnpx (?:eslint|oxlint|tsc)\b/);
    expect(combinedGuidance).not.toContain('bunx oxlint');
    expect(combinedGuidance).toContain('bun run lint');
    expect(combinedGuidance).toContain('bun run tsc --noEmit');
  });
});
