// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { describe, expect, test } from 'bun:test';
import {
  CLOUDFLARE_DEFAULTS,
  CLOUDFLARE_ENV_KEYS,
  CLOUDFLARE_PAGES,
  CLOUDFLARE_TOKEN_PERMISSIONS,
  CLOUDFLARE_ZONE,
  assertCloudflarePagesPins,
  cloudflareAccountIdFromEnv,
  cloudflarePagesDesiredBuild,
  cloudflareDashboardUrlFromEnv,
  factoryWagerRegistryUrlFromEnv,
  factoryWagerWikiUrl,
  r2BenchPrefixFromEnv,
  r2BucketFromEnv,
  r2BucketUrlFromEnv,
  r2EndpointFromAccount,
  r2UploadRetriesFromEnv,
  factoryRegistryBucketFromEnv,
  requireR2Config,
  tryR2Config,
} from '../config/r2-env.ts';

describe('config/r2-env Cloudflare SSOT', () => {
  test('proven Pages identity + pins match live project-r-score', () => {
    const p = CLOUDFLARE_DEFAULTS.pages;
    expect(CLOUDFLARE_DEFAULTS.accountId).toBe('7a470541a704caaf91e71efccc78fd36');
    expect(p.project).toBe('project-r-score');
    expect(p.subdomain).toBe('project-r-score.pages.dev');
    expect(p.destinationDir).toBe('tmp/pages-optimized');
    expect(p.buildCommand).toBe('bun tools/optimize-portal-assets.ts --no-report');
    expect(p.productionBranch).toBe('main');
    expect(p.bunVersion).toBe('1.4.0');
    expect(p.skipDependencyInstall).toBe(true);

    expect(CLOUDFLARE_PAGES.url).toBe(`https://${p.subdomain}`);
    expect(cloudflarePagesDesiredBuild()).toEqual({
      build_command: 'bun tools/optimize-portal-assets.ts --no-report',
      destination_dir: 'tmp/pages-optimized',
      root_dir: '',
      production_branch: 'main',
    });
    expect(() => assertCloudflarePagesPins()).not.toThrow();
  });

  test('token permissions SSOT pins project-r-score + factory-wager zone', () => {
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.pagesProject).toBe('project-r-score');
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.zoneName).toBe('factory-wager.com');
    expect(CLOUDFLARE_TOKEN_PERMISSIONS.minimal.length).toBeGreaterThanOrEqual(4);
  });

  test('zone defaults + account/endpoint/bucket helpers', () => {
    expect(CLOUDFLARE_ZONE.name).toBe('factory-wager.com');
    expect(CLOUDFLARE_ZONE.id).toMatch(/^[a-f0-9]{32}$/);
    const account = cloudflareAccountIdFromEnv();
    expect(account).toMatch(/^[a-f0-9]{32}$/);
    expect(r2EndpointFromAccount(account)).toBe(
      `https://${account}.r2.cloudflarestorage.com`
    );
    expect(r2BucketFromEnv().length).toBeGreaterThan(0);
    expect(r2BenchPrefixFromEnv().length).toBeGreaterThan(0);
    expect(r2UploadRetriesFromEnv()).toBeGreaterThan(0);
    const bucketUrl = r2BucketUrlFromEnv();
    expect(bucketUrl.startsWith('https://')).toBe(true);
    expect(bucketUrl).toContain('.r2.cloudflarestorage.com');
    expect(factoryWagerRegistryUrlFromEnv()).toContain(CLOUDFLARE_DEFAULTS.registryHost);
    expect(factoryWagerWikiUrl()).toBe(`https://${CLOUDFLARE_DEFAULTS.wikiHost}`);
    expect(CLOUDFLARE_DEFAULTS.registryDoctorBucket).toBe('npm-registry');
    expect(factoryRegistryBucketFromEnv().length).toBeGreaterThan(0);
    expect(CLOUDFLARE_DEFAULTS.registryBucket).toBe('factory-wager-registry');
    expect(cloudflareDashboardUrlFromEnv()).toContain(
      `/dash.cloudflare.com/${CLOUDFLARE_DEFAULTS.accountId}/`
    );
  });

  test('requireR2Config / tryR2Config are S3-only (no API token required)', () => {
    const cfg = requireR2Config();
    expect(cfg.endpoint).toContain('.r2.cloudflarestorage.com');
    expect(cfg.bucket.length).toBeGreaterThan(0);
    expect(cfg.accessKeyId.length).toBeGreaterThan(0);
    expect(cfg).not.toHaveProperty('cloudflareApiToken');
    expect(tryR2Config()?.bucket).toBe(cfg.bucket);
  });

  test('env key catalog stays lean', () => {
    expect(CLOUDFLARE_ENV_KEYS.identity).toEqual([
      'CLOUDFLARE_ACCOUNT_ID',
      'R2_ACCOUNT_ID',
      'CLOUDFLARE_ZONE_ID',
      'CLOUDFLARE_ZONE_NAME',
    ]);
    expect(CLOUDFLARE_ENV_KEYS.pagesBuild).toEqual([
      'BUN_VERSION',
      'SKIP_DEPENDENCY_INSTALL',
    ]);
    expect(CLOUDFLARE_ENV_KEYS.identity.join(' ')).not.toContain('CLOUDFLARE_PAGES_');
  });

  test('.env.example + public/index.html are the Pages source surface', async () => {
    const text = await Bun.file('.env.example').text();
    expect(text).toContain('BUN_VERSION=1.4.0');
    expect(text).toContain('SKIP_DEPENDENCY_INSTALL=true');
    expect(text).toContain('REGISTRY_URL=https://registry.factory-wager.com');
    // Channel/outbox plane bucket (doctor fallback remains CLOUDFLARE_DEFAULTS.registryDoctorBucket)
    expect(text).toContain('R2_REGISTRY_BUCKET=factory-wager-registry');
    expect(text).not.toContain('CLOUDFLARE_PAGES_PROJECT=');

    const index = await Bun.file('public/index.html').text();
    expect(index).toContain('FactoryWager');
    expect(index).toContain('wiki.factory-wager.com');
    expect(index).toContain('/registry/projects-registry.json');
  });
});
