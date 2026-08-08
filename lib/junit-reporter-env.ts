// @see https://bun.com/docs/test/reporters#environment-variables-in-junit-reports — JUnit <properties>
// @see https://bun.com/docs/test/reporters#configuring-via-bunfig-toml — [test.reporter] junit
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
/**
 * Fill-missing env so Bun's JUnit reporter can emit `<properties>`:
 *   ci      ← GITHUB_RUN_ID+SERVER_URL+REPOSITORY · or CI_JOB_URL
 *   commit  ← GITHUB_SHA · CI_COMMIT_SHA · GIT_SHA
 * Hostname is OS-derived on `<testsuite hostname>` (not env).
 *
 * Never clobbers Actions / operator-set values. Local default for `ci` is a
 * commit (or repo) URL via CI_JOB_URL — not a fake GITHUB_RUN_ID.
 *
 * Bun snapshots env when the `bun test` process starts — apply via
 * `scripts/run-with-junit-env.ts` (not only preload) for `<properties>` to land.
 */
import {
  BUN_GITHUB_ENV,
  commitUrl,
  GITHUB_ORIGIN,
  type GitHubRemoteConstants,
} from './github-repository-ref.ts';

type EnvMap = { [key: string]: string | undefined };

export type JunitReporterEnvApplied = {
  commit?: 'GIT_SHA';
  repository?: 'GITHUB_REPOSITORY';
  serverUrl?: 'GITHUB_SERVER_URL';
  ciJobUrl?: 'CI_JOB_URL';
};

function trim(env: EnvMap, key: string): string | undefined {
  const v = env[key]?.trim();
  return v || undefined;
}

function tryGitHead(): string | undefined {
  const result = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (result.exitCode !== 0) return undefined;
  const sha = result.stdout.toString().trim();
  return sha || undefined;
}

/**
 * Ensure Bun JUnit provenance env keys are present (fill-missing only).
 * Writes only through the provided map + `Bun.env` (harness Bun.env ratchet —
 * no `process.env` literals in lib/).
 *
 * @param env mutable env map (default `Bun.env`)
 * @param opts.gitSha test seam — `null` skips git; string forces; omit = `git rev-parse HEAD`
 * @param opts.origin remote constants for local defaults (default `GITHUB_ORIGIN`)
 */
export function ensureJunitReporterEnv(
  env: EnvMap = Bun.env,
  opts?: {
    gitSha?: string | null;
    origin?: GitHubRemoteConstants;
  }
): JunitReporterEnvApplied {
  const origin = opts?.origin ?? GITHUB_ORIGIN;
  const applied: JunitReporterEnvApplied = {};
  const write = (key: string, value: string) => {
    env[key] = value;
    // Keep process-visible env in sync when the caller mutates Bun.env (spawn inherit).
    if (env === Bun.env) {
      Bun.env[key] = value;
    }
  };

  const hasCommit =
    Boolean(trim(env, BUN_GITHUB_ENV.SHA)) ||
    Boolean(trim(env, BUN_GITHUB_ENV.CI_COMMIT_SHA)) ||
    Boolean(trim(env, BUN_GITHUB_ENV.GIT_SHA));

  if (!hasCommit) {
    const sha =
      opts?.gitSha === null
        ? undefined
        : opts?.gitSha !== undefined
          ? opts.gitSha.trim() || undefined
          : tryGitHead();
    if (sha) {
      write(BUN_GITHUB_ENV.GIT_SHA, sha);
      applied.commit = 'GIT_SHA';
    }
  }

  if (!trim(env, BUN_GITHUB_ENV.SERVER_URL)) {
    write(BUN_GITHUB_ENV.SERVER_URL, `https://${origin.host}`);
    applied.serverUrl = 'GITHUB_SERVER_URL';
  }

  if (!trim(env, BUN_GITHUB_ENV.REPOSITORY)) {
    write(BUN_GITHUB_ENV.REPOSITORY, origin.ownerName);
    applied.repository = 'GITHUB_REPOSITORY';
  }

  const onActions = trim(env, BUN_GITHUB_ENV.ACTIONS) === 'true';
  const hasCi =
    Boolean(trim(env, BUN_GITHUB_ENV.RUN_ID)) || Boolean(trim(env, BUN_GITHUB_ENV.CI_JOB_URL));

  if (!onActions && !hasCi) {
    const sha =
      trim(env, BUN_GITHUB_ENV.SHA) ||
      trim(env, BUN_GITHUB_ENV.CI_COMMIT_SHA) ||
      trim(env, BUN_GITHUB_ENV.GIT_SHA);
    const url = sha ? commitUrl(origin, sha) : origin.url;
    write(BUN_GITHUB_ENV.CI_JOB_URL, url);
    applied.ciJobUrl = 'CI_JOB_URL';
  }

  return applied;
}
