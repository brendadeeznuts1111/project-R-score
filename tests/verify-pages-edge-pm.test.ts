// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  artifactRegistryApi,
  artifactRegistryHealthUrl,
  buildPmProofReport,
  cleanManifest,
  manifestParity,
  manifestsEqual,
  npmRegistryMetadata,
  packDryRun,
  parsePackDryRunFiles,
  parsePmPkgValue,
  pmLsSanity,
  pmPkgParity,
  PM_PROOF_REPORT_PATH,
  PM_PROOF_SCHEMA,
  readmeMetadata,
  registryHostOrigin,
  scopedPackumentUrl,
} from '../lib/verification/pm-registry-probes.ts';

describe('pm-registry-probes parsing', () => {
  test('parsePmPkgValue reads last JSON line, ignores env timing noise', () => {
    expect(parsePmPkgValue('"[0.3ms] .env"\n"@factorywager/registry-client"\n')).toBe(
      '@factorywager/registry-client'
    );
    expect(parsePmPkgValue('"1.0.0"')).toBe('1.0.0');
    expect(parsePmPkgValue('raw-value')).toBe('raw-value');
  });

  test('parsePackDryRunFiles extracts packed file paths', () => {
    const out = [
      'bun pack v1.4.0-canary.1 (a227ad991)',
      '',
      'packed 0.99KB package.json',
      'packed 0.86KB README.md',
      'packed 3.16KB dist/index.d.ts',
      'packed 4.97KB dist/index.js',
      '',
      'factorywager-registry-client-1.0.0.tgz',
      '',
      'Total files: 4',
      'Unpacked size: 9.99KB',
    ].join('\n');
    expect(parsePackDryRunFiles(out)).toEqual([
      'package.json',
      'README.md',
      'dist/index.d.ts',
      'dist/index.js',
    ]);
  });

  test('scopedPackumentUrl encodes scoped package names', () => {
    expect(scopedPackumentUrl('https://registry.factory-wager.com', '@factorywager/rip')).toBe(
      'https://registry.factory-wager.com/@factorywager%2frip'
    );
    expect(scopedPackumentUrl('https://reg.example', 'lodash')).toBe(
      'https://reg.example/lodash'
    );
    expect(scopedPackumentUrl('http://127.0.0.1:4873/api/npm/', 'lodash')).toBe(
      'http://127.0.0.1:4873/api/npm/lodash'
    );
  });

  test('artifactRegistryHealthUrl discards npm registry path prefixes', () => {
    expect(artifactRegistryHealthUrl('https://registry.factory-wager.com/api/npm')).toBe(
      'https://registry.factory-wager.com/api/registry/health'
    );
    expect(artifactRegistryHealthUrl('https://reg.example/custom/npm/')).toBe(
      'https://reg.example/api/registry/health'
    );
  });
});

describe('pm-registry-probes manifest parity', () => {
  const base = {
    name: '@factorywager/registry-client',
    version: '1.0.0',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: { '.': { import: './dist/index.js' } },
    files: ['dist', 'README.md'],
    sideEffects: false,
  };

  test('cleanManifest keeps only publish-relevant keys', () => {
    const cleaned = cleanManifest({ ...base, scripts: { build: 'x' }, devDependencies: { a: '1' } });
    expect(cleaned).not.toHaveProperty('scripts');
    expect(cleaned).not.toHaveProperty('devDependencies');
    expect(cleaned.name).toBe(base.name);
  });

  test('manifestsEqual ignores non-publish fields, catches drift', () => {
    expect(manifestsEqual(base, { ...base, scripts: { prepublishOnly: 'y' } })).toBe(true);
    expect(manifestsEqual(base, { ...base, version: '1.0.1' })).toBe(false);
    expect(manifestsEqual(base, { ...base, files: ['dist'] })).toBe(false);
  });

  test('manifestParity skips when packument missing or version unpublished', async () => {
    const noPack = await manifestParity(undefined, async () => base);
    expect(noPack.skipped).toBe(true);
    expect(noPack.ok).toBe(true);

    const unpublished = await manifestParity({ versions: { '0.9.0': { version: '0.9.0' } } }, async () => base);
    expect(unpublished.skipped).toBe(true);
    expect(unpublished.ok).toBe(true);
  });

  test('manifestParity passes on match, fails on drift', async () => {
    const match = await manifestParity({ versions: { '1.0.0': { ...base } } }, async () => ({
      ...base,
      scripts: { build: 'local-only' },
    }));
    expect(match.ok).toBe(true);
    expect(match.skipped).toBe(false);

    const drift = await manifestParity(
      { versions: { '1.0.0': { ...base, files: ['dist'] } } },
      async () => base
    );
    expect(drift.ok).toBe(false);
  });
});

describe('pm-registry-probes spawn seams', () => {
  test('pmPkgParity validates name and semver via injected spawn', () => {
    const good = pmPkgParity((cmd) => ({
      exitCode: 0,
      stdout: cmd.includes('version') ? '"1.0.0"\n' : '"@factorywager/registry-client"\n',
      stderr: '',
    }));
    expect(good.ok).toBe(true);

    const badName = pmPkgParity(() => ({ exitCode: 0, stdout: '"@factorywager/other"\n', stderr: '' }));
    expect(badName.ok).toBe(false);

    const badVersion = pmPkgParity((cmd) => ({
      exitCode: 0,
      stdout: cmd.includes('version') ? '"not-semver"\n' : '"@factorywager/registry-client"\n',
      stderr: '',
    }));
    expect(badVersion.ok).toBe(false);
  });

  test('packDryRun skips without dist, fails on missing files, passes on full set', async () => {
    const skipped = await packDryRun(
      () => ({ exitCode: 0, stdout: '', stderr: '' }),
      async () => ({}),
      async () => false
    );
    expect(skipped.skipped).toBe(true);
    expect(skipped.ok).toBe(true);

    const dryRunOut = 'packed 1KB package.json\npacked 1KB README.md\npacked 1KB dist/index.d.ts\npacked 1KB dist/index.js\n';
    const pass = await packDryRun(
      () => ({ exitCode: 0, stdout: dryRunOut, stderr: '' }),
      async () => ({ dependencies: {} }),
      async () => true
    );
    expect(pass.ok).toBe(true);

    const missing = await packDryRun(
      () => ({ exitCode: 0, stdout: 'packed 1KB package.json\n', stderr: '' }),
      async () => ({}),
      async () => true
    );
    expect(missing.ok).toBe(false);

    const badProtocol = await packDryRun(
      () => ({ exitCode: 0, stdout: dryRunOut, stderr: '' }),
      async () => ({ dependencies: { '@factorywager/internal-only': 'workspace:*' } }),
      async () => true
    );
    expect(badProtocol.ok).toBe(false);
  });

  test('pmLsSanity follows spawn exit code', () => {
    expect(pmLsSanity(() => ({ exitCode: 0, stdout: '', stderr: '' })).ok).toBe(true);
    expect(pmLsSanity(() => ({ exitCode: 1, stdout: '', stderr: 'err' })).ok).toBe(false);
  });
});

describe('pm-registry-probes network fail-soft', () => {
  test('npmRegistryMetadata skips on non-200 and on throw', async () => {
    const notFound = await npmRegistryMetadata(
      (() => Promise.resolve(new Response('nope', { status: 404 }))) as unknown as typeof fetch,
      'https://reg.example'
    );
    expect(notFound.row.skipped).toBe(true);
    expect(notFound.row.ok).toBe(true);

    const thrown = await npmRegistryMetadata(
      (() => Promise.reject(new Error('ENOTFOUND'))) as unknown as typeof fetch,
      'https://reg.example'
    );
    expect(thrown.row.skipped).toBe(true);
    expect(thrown.row.ok).toBe(true);
  });

  test('npmRegistryMetadata returns packument on 200', async () => {
    const packument = { name: '@factorywager/registry-client', 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': {} } };
    const res = await npmRegistryMetadata(
      (() => Promise.resolve(Response.json(packument))) as unknown as typeof fetch,
      'https://reg.example'
    );
    expect(res.row.ok).toBe(true);
    expect(res.row.skipped).toBe(false);
    expect(res.packument?.['dist-tags']?.latest).toBe('1.0.0');
  });

  test('npmRegistryMetadata skips on HTML SPA fallback', async () => {
    const html = await npmRegistryMetadata(
      (() =>
        Promise.resolve(
          new Response('<!DOCTYPE html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        )) as unknown as typeof fetch,
      'https://reg.example'
    );
    expect(html.row.skipped).toBe(true);
    expect(html.row.ok).toBe(true);
    expect(html.row.detail).toContain('no npm packument');
  });

  test('artifactRegistryApi passes on live JSON, fails on served errors, skips on network throw', async () => {
    let requestedUrl = '';
    const live = await artifactRegistryApi(
      ((input: string | URL | Request) => {
        requestedUrl = String(input);
        return Promise.resolve(
          Response.json({ ok: true }, { headers: { 'content-type': 'application/json' } })
        );
      }) as typeof fetch,
      'https://reg.example/api/npm'
    );
    expect(live.ok).toBe(true);
    expect(live.skipped).toBe(false);
    expect(requestedUrl).toBe('https://reg.example/api/registry/health');

    const down = await artifactRegistryApi(
      (() => Promise.resolve(new Response('err', { status: 500 }))) as unknown as typeof fetch,
      'https://reg.example'
    );
    expect(down.ok).toBe(false);

    const thrown = await artifactRegistryApi(
      (() => Promise.reject(new Error('ENOTFOUND'))) as unknown as typeof fetch,
      'https://reg.example'
    );
    expect(thrown.ok).toBe(true);
    expect(thrown.skipped).toBe(true);
  });

  test('artifactRegistryApi uses host origin, not npm packument base', async () => {
    expect(registryHostOrigin('https://registry.factory-wager.com/api/npm')).toBe(
      'https://registry.factory-wager.com'
    );
    let hit = '';
    const row = await artifactRegistryApi(
      (async (input: RequestInfo | URL) => {
        hit = String(input);
        return Response.json(
          { status: 'ok' },
          { headers: { 'content-type': 'application/json' } }
        );
      }) as unknown as typeof fetch,
      'https://registry.factory-wager.com/api/npm'
    );
    expect(hit).toBe('https://registry.factory-wager.com/api/registry/health');
    expect(hit).not.toContain('/api/npm/api/');
    expect(row.ok).toBe(true);
  });

});

describe('pm-registry-probes readme metadata (Bun 1.3.14+)', () => {
  const local = { name: '@factorywager/registry-client', version: '1.0.0' };

  test('skips without packument or published version', async () => {
    const noPack = await readmeMetadata(undefined, async () => local);
    expect(noPack.skipped).toBe(true);
    const noVersion = await readmeMetadata({ versions: {} }, async () => local);
    expect(noVersion.skipped).toBe(true);
  });

  test('passes when readme and readmeFilename are populated', async () => {
    const packument = {
      versions: {
        '1.0.0': { version: '1.0.0', readme: '# Registry Client\n…', readmeFilename: 'README.md' },
      },
    };
    const row = await readmeMetadata(packument, async () => local);
    expect(row.ok).toBe(true);
    expect(row.skipped).toBe(false);
    expect(row.detail).toContain('README.md');
  });

  test('fails when metadata is empty (pre-1.3.14 publish)', async () => {
    const packument = { versions: { '1.0.0': { version: '1.0.0', readme: '', readmeFilename: '' } } };
    const row = await readmeMetadata(packument, async () => local);
    expect(row.ok).toBe(false);
    expect(row.detail).toContain('Bun ≥1.3.14');
  });

  test('falls back to dist-tags.latest when local version is unpublished', async () => {
    const packument = {
      'dist-tags': { latest: '0.9.0' },
      versions: { '0.9.0': { version: '0.9.0', readme: '# old', readmeFilename: 'README.md' } },
    };
    const row = await readmeMetadata(packument, async () => local);
    expect(row.ok).toBe(true);
    expect(row.detail).toContain('v0.9.0');
  });
});

describe('verify-pages-edge --pm wiring', () => {
  test('tool dispatches --pm and --strict-pm', async () => {
    const text = await Bun.file('tools/verify-pages-edge.ts').text();
    expect(text).toContain("argv.includes('--pm')");
    expect(text).toContain("argv.includes('--strict-pm')");
    expect(text).toContain("argv.includes('--save')");
    expect(text).toContain('runPmProbes');
    expect(text).toContain('buildPmProofReport');
    expect(text).toContain('pmMain');
  });

  test('buildPmProofReport schema pins', () => {
    const proof = buildPmProofReport(
      [{ name: 'x', ok: true, skipped: false, detail: 'ok' }],
      { bunVersion: '1.4.0', bunRevision: 'abc' }
    );
    expect(proof.schema).toBe(PM_PROOF_SCHEMA);
    expect(proof.reportPath).toBe(PM_PROOF_REPORT_PATH);
    expect(proof.artifactId).toBe('pm-proof');
    expect(proof.artifactName).toBe('PM publish-plane proof');
    expect(proof.artifactId).not.toBe(proof.artifactName);
    expect(proof.plane).toBe('publish');
    expect(proof.purpose).toBe('audit');
    expect(proof.cli).toBe('bun run verify:pm:save');
    expect(proof.conceptId).toBe('publish.pm_proof');
    expect(proof.color.colorKey).toBe('kalshi');
    expect(proof.color.hex).toMatch(/^#[0-9A-F]{6}$/i);
    expect(proof.modeColor.conceptId).toBe('publish.mode.soft');
    expect(proof.links).toEqual({
      json: '/registry/pm-proof.json',
      board: '/portal/packages/',
      weave: '/registry/portal-weave.json',
    });
    expect(proof.summary.status).toBe('pass');
  });

  test('domain sweep runs verify:pm gate', async () => {
    const text = await Bun.file('tools/domain-sweep.ts').text();
    expect(text).toContain("'verify:pm'");
    expect(text).toContain("'--pm'");
  });

  test('package.json exposes verify:pm + save + ssot:flow:soft', async () => {
    const pkg = (await Bun.file('package.json').json()) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.['verify:pm']).toBe('bun tools/verify-pages-edge.ts --pm');
    expect(pkg.scripts?.['verify:pm:save']).toBe('bun tools/verify-pages-edge.ts --pm --save');
    expect(pkg.scripts?.['ssot:flow:soft']).toBe('bun tools/bake-ssot-flow-soft.ts');
    expect(pkg.scripts?.['tennis:ssot:release:check']).toBe(
      'bun tools/verify-tennis-ssot-release.ts'
    );
    expect(pkg.scripts?.['tennis:ssot:release:check:live']).toBe(
      'bun tools/verify-tennis-ssot-release.ts --live'
    );
  });
});
