// @see https://bun.com/docs/runtime/file-io — Bun.file
import { describe, expect, test } from 'bun:test';

import mainRuleset from '../.github/rulesets/main.json' with { type: 'json' };
import tagRuleset from '../.github/rulesets/release-tags.json' with { type: 'json' };
import bunTestProfiles from '../.agents/skills/ast-grep/bun-test-profiles.json' with {
  type: 'json',
};
import packageJson from '../package.json' with { type: 'json' };
import {
  CI_CORE_ALLOWED_LONG,
  CI_HARNESS_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags';
import { getReleaseSteps, RELEASE_COMMIT_PATHS } from '../scripts/release.ts';

function ruleTypes(ruleset: { rules: Array<{ type: string }> }): Set<string> {
  return new Set(ruleset.rules.map(rule => rule.type));
}

describe('repository governance', () => {
  test('Bun test profiles never repeat isolation already implied by parallel workers', () => {
    for (const [name, profile] of Object.entries(bunTestProfiles.profiles)) {
      const usesParallel = profile.args.some(argument => argument.startsWith('--parallel'));
      expect(
        usesParallel && profile.args.includes('--isolate'),
        `${name} must not combine --parallel with redundant --isolate`
      ).toBe(false);
    }
  });

  test('ci:core and ci:harness share one forwarded option contract', () => {
    expect(CI_CORE_ALLOWED_LONG).toBe(CI_HARNESS_ALLOWED_LONG);
    expect(CI_CORE_ALLOWED_LONG).toContain('fast');
    expect(CI_CORE_ALLOWED_LONG).toContain('full-lint');
    expect(CI_CORE_ALLOWED_LONG).toContain('fail-json');
  });

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
    expect(localCi).not.toContain("['bun', 'run', 'test:snapshots']");
    expect(localCi).not.toContain("['bun', 'run', 'test:partner-cli:snapshots']");
    expect(localCi).toContain("['bun', 'run', 'ci:types']");
    expect(localCi).toContain("['bun', 'run', 'ci:security']");
    expect(localCi).toContain("['bun', 'run', 'ci:portal-registry']");
    expect(packageJson.scripts['ci:portal-registry']).toBe('bun scripts/assert-public-clean.ts');
    expect(localCi).toContain("from '../lib/macros/git-commit.ts'");
    expect(localCi).not.toContain("type: 'macro'");
    expect(localCi).toContain("Bun.env.R2_BUCKET_NAME");
    expect(localCi).toContain('factory-wager-wiki');
    expect(localCi).toContain('Bun.spawn([bunExecutable');
    const ciCore = await Bun.file(`${import.meta.dir}/../scripts/ci-core.ts`).text();
    const ciCoreRunner = await Bun.file(
      `${import.meta.dir}/../scripts/lib/ci-core-runner.ts`
    ).text();
    expect(ciCore).toContain("'--skip-cache-size'");
    expect(ciCore).toContain('parallelCoreSteps.map');
    expect(ciCoreRunner).toContain('wallMs:');
    expect(ciCore).toContain("name: 'bun-release-contracts'");
    expect(ciCore).toContain("['bun', 'run', 'bun:release-contracts:check']");
    expect(ciCore.indexOf("name: 'bun-release-contracts'")).toBeLessThan(
      ciCore.indexOf("name: 'bun-release-knowledge'")
    );
    expect(packageJson.scripts['test:partner-cli:snapshots']).toBe(
      'bun test tests/partner-cli-snapshots.test.ts'
    );
    expect(packageJson.scripts['test:snapshots']).toBe(
      'bun tools/bun-test-snapshots.ts --test'
    );
  });

  test('default test scripts lock Bun 1.4 parallel and JUnit env wiring', () => {
    expect(packageJson.scripts.test).toContain('--parallel');
    expect(packageJson.scripts['test:watch']).toBe('NODE_ENV=test bun run test:changed:watch');
    expect(packageJson.scripts['test:ci']).toContain('run-with-junit-env');
    const testDots = packageJson.scripts['test:dots'];
    if (testDots !== undefined) {
      expect(
        testDots.includes('--dots') || testDots.includes('--reporter=dots'),
        'test:dots must pass --dots or --reporter=dots'
      ).toBe(true);
    }
  });

  test('prepare installs Husky hooks in the active worktree', () => {
    expect(packageJson.scripts.prepare).toStartWith('bunx husky');
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
