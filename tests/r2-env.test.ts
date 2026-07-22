// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { describe, expect, test } from 'bun:test';
import {
  CLOUDFLARE_DEFAULTS,
  CLOUDFLARE_ENV_KEYS,
  CLOUDFLARE_PAGES,
  CLOUDFLARE_ZONE,
  cloudflareAccountIdFromEnv,
  r2EndpointFromAccount,
} from '../config/r2-env.ts';

describe('config/r2-env Cloudflare SSOT', () => {
  test('proven Pages identity + pins (single SSOT, no CLOUDFLARE_PAGES_* env)', () => {
    const p = CLOUDFLARE_DEFAULTS.pages;
    expect(CLOUDFLARE_DEFAULTS.accountId).toBe('7a470541a704caaf91e71efccc78fd36');
    expect(p.project).toBe('project-r-score');
    expect(p.subdomain).toBe('project-r-score.pages.dev');
    expect(p.destinationDir).toBe('public');
    expect(p.buildCommand).toBe('exit 0');
    expect(p.productionBranch).toBe('main');
    expect(p.bunVersion).toBe('1.3.14');
    expect(p.skipDependencyInstall).toBe(true);

    expect(CLOUDFLARE_PAGES.url).toBe(`https://${p.subdomain}`);
    expect(CLOUDFLARE_PAGES.bunVersion).toBe('1.3.14');
    expect(CLOUDFLARE_PAGES.bunVersion).not.toBe('1.4.0');
    expect(CLOUDFLARE_PAGES.skipDependencyInstall).toBe(true);
  });

  test('zone defaults + account/endpoint helpers', () => {
    expect(CLOUDFLARE_ZONE.name).toBe('factory-wager.com');
    expect(CLOUDFLARE_ZONE.id).toMatch(/^[a-f0-9]{32}$/);
    const account = cloudflareAccountIdFromEnv();
    expect(account).toMatch(/^[a-f0-9]{32}$/);
    expect(r2EndpointFromAccount(account)).toBe(
      `https://${account}.r2.cloudflarestorage.com`
    );
  });

  test('env key catalog is secrets + account/zone + Pages build pins only', () => {
    expect(CLOUDFLARE_ENV_KEYS.identity).toEqual([
      'CLOUDFLARE_ACCOUNT_ID',
      'R2_ACCOUNT_ID',
      'CLOUDFLARE_ZONE_ID',
      'CLOUDFLARE_ZONE_NAME',
    ]);
    expect(CLOUDFLARE_ENV_KEYS.secrets).toContain('CLOUDFLARE_API_TOKEN');
    expect(CLOUDFLARE_ENV_KEYS.pagesBuild).toEqual([
      'BUN_VERSION',
      'SKIP_DEPENDENCY_INSTALL',
    ]);
    expect(CLOUDFLARE_ENV_KEYS.identity.join(' ')).not.toContain('CLOUDFLARE_PAGES_');
  });

  test('.env.example documents pins without duplicating Pages identity keys', async () => {
    const text = await Bun.file('.env.example').text();
    for (const key of [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ZONE_ID',
      'BUN_VERSION',
      'SKIP_DEPENDENCY_INSTALL',
      'R2_ENDPOINT',
    ]) {
      expect(text).toContain(`${key}=`);
    }
    expect(text).toContain('BUN_VERSION=1.3.14');
    expect(text).toContain('SKIP_DEPENDENCY_INSTALL=true');
    expect(text).not.toContain('CLOUDFLARE_PAGES_PROJECT=');
    expect(text).not.toContain('CLOUDFLARE_PAGES_DESTINATION_DIR=');
  });
});
