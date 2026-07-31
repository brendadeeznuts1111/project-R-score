// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from 'bun:test';

import mainRuleset from '../.github/rulesets/main.json' with { type: 'json' };
import tagRuleset from '../.github/rulesets/release-tags.json' with { type: 'json' };
import { getReleaseSteps, RELEASE_COMMIT_PATHS } from '../scripts/release.ts';

function ruleTypes(ruleset: { rules: Array<{ type: string }> }): Set<string> {
  return new Set(ruleset.rules.map(rule => rule.type));
}

describe('repository governance', () => {
  test('main is PR-only, linear, collision-gated, and non-destructive', () => {
    expect(mainRuleset.target).toBe('branch');
    expect(mainRuleset.enforcement).toBe('active');
    expect(mainRuleset.conditions.ref_name.include).toContain('~DEFAULT_BRANCH');
    expect(ruleTypes(mainRuleset)).toEqual(
      new Set([
        'deletion',
        'non_fast_forward',
        'required_linear_history',
        'pull_request',
        'required_status_checks',
      ])
    );

    const status = mainRuleset.rules.find(rule => rule.type === 'required_status_checks');
    const contexts = status?.parameters?.required_status_checks?.map(check => check.context) ?? [];
    expect(contexts).toContain('Harness (ratchets · lint · brands · test:changed)');
    expect(contexts).toContain('Type Check');
    expect(contexts).toContain('security-audit');
    expect(new Set(contexts).size).toBe(contexts.length);
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
});
