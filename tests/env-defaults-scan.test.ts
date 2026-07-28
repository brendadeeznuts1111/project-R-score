import { describe, expect, test } from 'bun:test';
import {
  hasFallbackOrGuard,
  parseEnvTemplate,
  scanTextForIssues,
  scanTextForUsages,
  classifyEnvVar,
} from '../scripts/lib/env-defaults-scan.ts';

describe('classifyEnvVar', () => {
  test('ambient / secret / config', () => {
    expect(classifyEnvVar('TZ')).toBe('ambient');
    expect(classifyEnvVar('FORCE_COLOR')).toBe('ambient');
    expect(classifyEnvVar('CLOUDFLARE_API_TOKEN')).toBe('secret');
    expect(classifyEnvVar('R2_SECRET_ACCESS_KEY')).toBe('secret');
    expect(classifyEnvVar('PROVISION_ENCRYPTION_KEY')).toBe('secret');
    expect(classifyEnvVar('DOMAIN_REGISTRY_PATH')).toBe('config');
    expect(classifyEnvVar('SNAPSHOT_PHASE')).toBe('config');
  });
});

describe('hasFallbackOrGuard', () => {
  test('|| and ??', () => {
    expect(hasFallbackOrGuard(`const x = Bun.env.FOO || 'bar'`, '', [])).toBe(true);
    expect(hasFallbackOrGuard(`const x = Bun.env.FOO ?? 'bar'`, '', [])).toBe(true);
  });

  test('integerOption third-arg default', () => {
    expect(
      hasFallbackOrGuard(`this.min = integerOption(opts.min, Bun.env.SCALER_MIN_WORKERS, 2);`, '', [])
    ).toBe(true);
  });

  test('filter(Boolean) array of envs', () => {
    const line = `const raw = [Bun.env.FONBET_SPORT_IDS, Bun.env.FONBET_LEAGUE_IDS]`;
    const following = [`.filter(Boolean)`, `.join(",");`];
    expect(hasFallbackOrGuard(line, '', following, 'FONBET_SPORT_IDS')).toBe(true);
  });

  test('Number + isFinite guard', () => {
    const line = `const fixedNowMs = Number(Bun.env.CAPTURE_FIXED_NOW_MS);`;
    const following = [`if (!Number.isFinite(fixedNowMs) || fixedNowMs <= 0) return;`];
    expect(hasFallbackOrGuard(line, '', following)).toBe(true);
  });

  test('delete is meta', () => {
    expect(hasFallbackOrGuard(`delete Bun.env.RESEARCH_CACHE_DB;`, '', [], 'RESEARCH_CACHE_DB')).toBe(
      true
    );
  });

  test('isFeatureFlagActive helper', () => {
    expect(
      hasFallbackOrGuard(
        `const envOverride = isFeatureFlagActive(Bun.env.BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS);`,
        '',
        []
      )
    ).toBe(true);
  });
});

describe('scanTextForIssues', () => {
  test('flags bare config read', () => {
    const src = `export const path = Bun.env.DOMAIN_REGISTRY_PATH;\n`;
    const issues = scanTextForIssues('x.ts', src);
    expect(issues.some(i => i.envVar === 'DOMAIN_REGISTRY_PATH')).toBe(true);
  });

  test('allows typed default parameter', () => {
    const src = `function f(raw: string | undefined = Bun.env.SNAPSHOT_PHASE) { return raw; }\n`;
    expect(scanTextForIssues('x.ts', src)).toEqual([]);
  });

  test('skips secrets and ambient', () => {
    const src = `
      const t = Bun.env.CLOUDFLARE_API_TOKEN;
      const tz = Bun.env.TZ;
      const f = Bun.env.FORCE_COLOR;
    `;
    expect(scanTextForIssues('x.ts', src)).toEqual([]);
  });

  test('skips guarded multi-line r2 block', () => {
    const src = `
export function store() {
  const bucket = Bun.env.DOD_R2_BUCKET;
  const accountId = Bun.env.CLOUDFLARE_ACCOUNT_ID;
  if (!bucket || !accountId) return null;
  return bucket;
}
`;
    const issues = scanTextForIssues('x.ts', src);
    expect(issues.filter(i => i.envVar === 'DOD_R2_BUCKET')).toEqual([]);
  });

  test('skips object field pass-through', () => {
    const src = `const out = { registryPath: Bun.env.DOMAIN_REGISTRY_PATH };\n`;
    expect(scanTextForIssues('x.ts', src)).toEqual([]);
  });

  test('skips comments', () => {
    const src = `// set Bun.env.MY_CONFIG for tests\nconst x = 1;\n`;
    expect(scanTextForIssues('x.ts', src)).toEqual([]);
  });
});

describe('scanTextForUsages', () => {
  test('classifies write vs config', () => {
    const src = `
      Bun.env.MY_APP_MODE = "production";
      const p = Bun.env.SNAPSHOT_PHASE || 'pre';
    `;
    const u = scanTextForUsages('x.ts', src);
    expect(u.find(x => x.envVar === 'MY_APP_MODE')?.kind).toBe('write');
    expect(u.find(x => x.envVar === 'SNAPSHOT_PHASE')?.kind).toBe('config');
  });
});

describe('parseEnvTemplate', () => {
  test('extracts keys and pass refs', () => {
    const tpl = `
# comment
CLOUDFLARE_API_TOKEN={{ pass://factorywager/Cloudflare API Token/password }}
CLOUDFLARE_ACCOUNT_ID=7a470541a704caaf91e71efccc78fd36
NODE_ENV=production
`;
    const p = parseEnvTemplate(tpl);
    expect(p.keys).toContain('CLOUDFLARE_API_TOKEN');
    expect(p.keys).toContain('CLOUDFLARE_ACCOUNT_ID');
    expect(p.vaultRefs).toEqual([
      {
        key: 'CLOUDFLARE_API_TOKEN',
        ref: 'pass://factorywager/Cloudflare API Token/password',
      },
    ]);
    expect(p.defaults.CLOUDFLARE_ACCOUNT_ID).toBe('7a470541a704caaf91e71efccc78fd36');
    expect(p.defaults.NODE_ENV).toBe('production');
    expect(p.defaults.CLOUDFLARE_API_TOKEN).toBeUndefined();
  });

  test('REDIS_URL-style literals count as usable defaults', () => {
    const p = parseEnvTemplate('REDIS_URL=redis://localhost:6379\nEMPTY=\nSECRET={{ pass://x/y/password }}\n');
    expect(p.defaults.REDIS_URL).toBe('redis://localhost:6379');
    expect(p.defaults.EMPTY).toBeUndefined();
    expect(p.defaults.SECRET).toBeUndefined();
  });
});
