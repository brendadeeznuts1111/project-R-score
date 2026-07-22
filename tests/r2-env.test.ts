// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { describe, expect, test } from 'bun:test';
import {
  CLOUDFLARE_DEFAULTS,
  CLOUDFLARE_ENV_KEYS,
  CLOUDFLARE_PAGES,
  CLOUDFLARE_ZONE,
  cloudflareAccountIdFromEnv,
  cloudflarePagesBuildConfig,
  cloudflarePagesBuildEnvPlain,
  r2EndpointFromAccount,
} from '../config/r2-env.ts';

describe('config/r2-env Cloudflare SSOT', () => {
  test('proven account + Pages identity match live project-r-score', () => {
    expect(CLOUDFLARE_DEFAULTS.accountId).toBe('7a470541a704caaf91e71efccc78fd36');
    expect(CLOUDFLARE_DEFAULTS.pages.project).toBe('project-r-score');
    expect(CLOUDFLARE_DEFAULTS.pages.url).toBe('https://project-r-score.pages.dev');
    expect(CLOUDFLARE_DEFAULTS.pages.destinationDir).toBe('public');
    expect(CLOUDFLARE_DEFAULTS.pages.buildCommand).toBe('exit 0');
    expect(CLOUDFLARE_DEFAULTS.pages.productionBranch).toBe('main');
    expect(CLOUDFLARE_DEFAULTS.pages.bunVersion).toBe('1.3.14');
    expect(CLOUDFLARE_DEFAULTS.pages.skipDependencyInstall).toBe(true);
  });

  test('zone defaults include factory-wager.com', () => {
    expect(CLOUDFLARE_DEFAULTS.zones.factoryWager.name).toBe('factory-wager.com');
    expect(CLOUDFLARE_DEFAULTS.zones.factoryWager.id).toMatch(/^[a-f0-9]{32}$/);
    expect(CLOUDFLARE_ZONE.name).toBeTruthy();
    expect(CLOUDFLARE_ZONE.id).toMatch(/^[a-f0-9]{32}$/);
  });

  test('Pages build env pin is GitHub-releasable (not canary 1.4.0)', () => {
    const env = cloudflarePagesBuildEnvPlain();
    expect(env.BUN_VERSION).toBe('1.3.14');
    expect(env.SKIP_DEPENDENCY_INSTALL).toBe('true');
    expect(env.BUN_VERSION).not.toBe('1.4.0');
  });

  test('Pages build_config matches dashboard fix', () => {
    const cfg = cloudflarePagesBuildConfig();
    expect(cfg.build_command).toBe('exit 0');
    expect(cfg.destination_dir).toBe('public');
  });

  test('account helper and R2 endpoint shape', () => {
    const account = cloudflareAccountIdFromEnv();
    expect(account).toMatch(/^[a-f0-9]{32}$/);
    expect(r2EndpointFromAccount(account)).toBe(
      `https://${account}.r2.cloudflarestorage.com`
    );
  });

  test('env key catalog covers identity, secrets, pages build', () => {
    expect(CLOUDFLARE_ENV_KEYS.identity).toContain('CLOUDFLARE_PAGES_PROJECT');
    expect(CLOUDFLARE_ENV_KEYS.secrets).toContain('CLOUDFLARE_API_TOKEN');
    expect(CLOUDFLARE_ENV_KEYS.pagesBuild).toEqual([
      'BUN_VERSION',
      'SKIP_DEPENDENCY_INSTALL',
    ]);
    expect(CLOUDFLARE_PAGES.project).toBe(CLOUDFLARE_DEFAULTS.pages.project);
  });

  test('.env.example documents the Pages pin keys', async () => {
    const text = await Bun.file('.env.example').text();
    for (const key of [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_PAGES_PROJECT',
      'CLOUDFLARE_ZONE_ID',
      'BUN_VERSION',
      'SKIP_DEPENDENCY_INSTALL',
      'R2_ENDPOINT',
      'WIKI_BASE_URL',
    ]) {
      expect(text).toContain(`${key}=`);
    }
    expect(text).toContain('BUN_VERSION=1.3.14');
    expect(text).toContain('SKIP_DEPENDENCY_INSTALL=true');
    expect(text).toContain('CLOUDFLARE_PAGES_DESTINATION_DIR=public');
  });
});
