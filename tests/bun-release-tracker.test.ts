// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/reference/node/tls/getCACertificates
import { describe, expect, test } from 'bun:test';
import {
  BUN_RELEASE_NOTE_ROWS,
  BUN_V1314_ANCHORS,
  BUN_V1314_BLOG,
  BUN_V135_BLOG,
  BUN_V135_ANCHORS,
  canonicalForReleaseTest,
  pushReleaseResult,
  probeTlsSystemCaCertificates,
  probeProcessExitWithPendingTimer,
  probeTimerRefAfterFire,
  probeStringWidthV135Accuracy,
  probeUrlHost,
  smokeBuiltinObjectsGc,
  buildFetchS3Request,
  awsEnvFromR2Credentials,
  BUN_INSTALL_CPU_VALUES,
  BUN_INSTALL_OS_VALUES,
  BUN_INSTALL_PLATFORM_SUPPORTED,
  FETCH_PROTOCOL_COVERAGE,
  FETCH_PROTOCOL_DOCS,
  INSTALL_PLATFORM_COVERAGE,
  INSTALL_PLATFORM_DOCS,
  probeBunInstallPlatformFlags,
  probeFetchS3Optional,
  runFetchProtocolProbes,
  smokeFetchProtocolSupport,
} from '../lib/docs/bun-release-tracker.ts';
import type { VerificationResult } from '../lib/verification/types.ts';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';

describe('lib/docs/bun-release-tracker', () => {
  test('tracks release note ids with canonical blog URLs', () => {
    const ids = BUN_RELEASE_NOTE_ROWS.map(r => r.id);
    expect(ids).toContain('tls-system-ca-no-flag');
    expect(ids).toContain('bun-terminal-pty');
    expect(ids).toContain('compile-time-feature-flags');
    for (const row of BUN_RELEASE_NOTE_ROWS) {
      expect(row.canonical.startsWith('https://bun.com/blog/bun-v1.3.')).toBe(true);
    }
  });

  test('BUN_V1314_ANCHORS covers all user-listed blog sections', () => {
    const expected = [
      'bun-image',
      'terminal-methods',
      'global-virtual-store',
      'http3',
      'http2-client',
      'event-loop-refactor',
      'tls-getcacertificates-system-now-works-without-use-system-ca',
    ] as const;
    for (const key of expected) {
      expect(BUN_V1314_ANCHORS[key]).toBe(`${BUN_V1314_BLOG}#${key}`);
    }
    expect(Object.keys(BUN_V1314_ANCHORS).length).toBeGreaterThanOrEqual(24);
  });

  test('canonicalForReleaseTest maps automated probes to blog anchors', () => {
    expect(canonicalForReleaseTest("tls.getCACertificates('system')")).toBe(
      BUN_V1314_ANCHORS['tls-getcacertificates-system-now-works-without-use-system-ca']
    );
    expect(canonicalForReleaseTest('timer.ref() after fired setTimeout')).toBe(
      BUN_V1314_ANCHORS['event-loop-refactor']
    );
    expect(canonicalForReleaseTest('--no-orphans support')).toBe(BUN_V1314_ANCHORS['no-orphans']);
  });

  test('probeStringWidthV135Accuracy matches release-note vectors', () => {
    const probe = probeStringWidthV135Accuracy();
    expect(probe.ok).toBe(true);
  });

  test('probeUrlHost matches WHATWG host vs hostname semantics', () => {
    const probe = probeUrlHost();
    expect(probe.ok).toBe(true);
    expect(canonicalForReleaseTest('URL.host (hostname + port)')).toBe(CANONICAL_REFS['URL.host']);
    const url = new URL('https://example.com:8080/path');
    expect(url.host).toBe('example.com:8080');
    expect(url.hostname).toBe('example.com');
    expect(url.port).toBe('8080');
    url.host = 'test.com:9000';
    expect(url.href).toBe('https://test.com:9000/path');
  });

  test('BUN_V135_ANCHORS includes Terminal ship note', () => {
    expect(BUN_V135_ANCHORS['bun-terminal-api-for-pseudo-terminal-pty-support']).toBe(
      `${BUN_V135_BLOG}#bun-terminal-api-for-pseudo-terminal-pty-support`
    );
  });

  test('probeTlsSystemCaCertificates matches Node parity on this runtime', () => {
    const probe = probeTlsSystemCaCertificates();
    expect(probe.platform).toBe(process.platform);
    expect(probe.nodeParity).toBe(true);
    if (process.platform !== 'darwin') {
      expect(probe.count).toBeGreaterThan(0);
    }
  });

  test('smokeBuiltinObjectsGc survives Request/Response churn', () => {
    const smoke = smokeBuiltinObjectsGc();
    expect(smoke.ok).toBe(true);
    expect(smoke.count).toBe(2000);
  });

  test(
    'event loop probes exit on unref timer and ref-after-fire',
    async () => {
      const pending = await probeProcessExitWithPendingTimer();
      expect(pending.ok).toBe(true);

      const refAfterFire = await probeTimerRefAfterFire();
      expect(refAfterFire.ok).toBe(true);
    },
    { timeout: 10_000 }
  );

  test('pushReleaseResult attaches canonical and _links', () => {
    const results: VerificationResult[] = [];
    pushReleaseResult(
      results,
      {
        name: 'timer.ref() after fired setTimeout',
        expected: 'exit',
        actual: 'ok',
        passed: true,
        anchor: 'event-loop-refactor',
      },
      {
        semanticTags: {
          channel: 'runtime',
          targetVersion: '1.4.0',
          provenanceId: 'test',
          testedAt: '2026-07-23T12:00:00.000Z',
          runtimeVersion: '1.4.0-canary.1',
        },
      }
    );
    expect(results[0]?.canonical).toBe(BUN_V1314_ANCHORS['event-loop-refactor']);
    expect(results[0]?._links?.docs).toBe(BUN_V1314_ANCHORS['event-loop-refactor']);
    expect(results[0]?._links?.report).toBe('/registry/release-features.json');
  });

  test('CANONICAL_REFS includes tls.getCACertificates and Bun.Image blog anchors', () => {
    expect(CANONICAL_REFS['tls.getCACertificates']).toContain(
      'bun.com/reference/node/tls/getCACertificates'
    );
    expect(CANONICAL_REFS['Bun.Image (v1.3.14)']).toBe(BUN_V1314_ANCHORS['bun-image']);
    expect(CANONICAL_REFS['Bun.Image terminal methods']).toBe(BUN_V1314_ANCHORS['terminal-methods']);
    expect(CANONICAL_REFS['fetch protocol support']).toContain('#protocol-support');
    expect(CANONICAL_REFS['s3://']).toContain('#s3-urls-s3');
    expect(CANONICAL_REFS['data:']).toContain('#data-urls-data');
  });

  test('FETCH_PROTOCOL_COVERAGE maps probes to canonical anchors', () => {
    expect(FETCH_PROTOCOL_COVERAGE.length).toBe(6);
    expect(FETCH_PROTOCOL_COVERAGE.map(r => r.protocol)).toEqual([
      'data:',
      'blob:',
      'file://',
      's3:// (explicit)',
      's3:// (env)',
      's3:// (Bun.file)',
    ]);
  });

  test('buildFetchS3Request matches Bun docs env vs explicit creds', () => {
    const envOnly = buildFetchS3Request('my-bucket', 'path/to/object');
    expect(envOnly.url).toBe('s3://my-bucket/path/to/object');
    expect(envOnly.init).toBeUndefined();

    const explicit = buildFetchS3Request('my-bucket', '/path/to/object', {
      accessKeyId: 'YOUR_ACCESS_KEY',
      secretAccessKey: 'YOUR_SECRET_KEY',
      region: 'us-east-1',
    });
    expect(explicit.url).toBe('s3://my-bucket/path/to/object');
    expect(explicit.init?.s3).toEqual({
      accessKeyId: 'YOUR_ACCESS_KEY',
      secretAccessKey: 'YOUR_SECRET_KEY',
      region: 'us-east-1',
    });
  });

  test('canonicalForReleaseTest maps s3 fetch probes to #s3-urls-s3', () => {
    expect(canonicalForReleaseTest('fetch s3:// (explicit s3: creds)')).toContain('#s3-urls-s3');
    expect(canonicalForReleaseTest('fetch protocol (file://)')).toContain('#file-urls-file');
  });

  test('runFetchProtocolProbes passes offline protocols without R2 env', async () => {
    const report = await runFetchProtocolProbes({});
    const offline = report.rows.filter(r => !r.name.includes('s3://'));
    expect(offline.every(r => r.ok)).toBe(true);
    expect(report.rows.filter(r => r.skipped).length).toBe(3);
  });

  test('awsEnvFromR2Credentials maps access keys for env-only s3://', () => {
    const env = awsEnvFromR2Credentials({
      accessKeyId: 'AKIA_TEST' as import('../lib/types/branded.ts').AccessKeyId,
      secretAccessKey: 'secret',
      endpoint: 'https://abc.r2.cloudflarestorage.com',
    });
    expect(env['AWS_ACCESS_KEY_ID']).toBe('AKIA_TEST');
    expect(env['AWS_SECRET_ACCESS_KEY']).toBe('secret');
    expect(env['S3_ENDPOINT']).toContain('r2.cloudflarestorage.com');
  });

  test('probeFetchS3Optional skips when R2 env is absent', async () => {
    const probe = await probeFetchS3Optional({});
    expect(probe.ok).toBe(true);
    expect(probe.skipped).toBe(true);
  });

  test('smokeFetchProtocolSupport round-trips data: and blob:', async () => {
    const smoke = await smokeFetchProtocolSupport();
    expect(smoke.ok).toBe(true);
  });

  test('INSTALL_PLATFORM_COVERAGE links probes to install doc anchors', () => {
    expect(INSTALL_PLATFORM_COVERAGE[0]?.canonical).toContain('#platform-specific-dependencies');
    expect(INSTALL_PLATFORM_COVERAGE[1]?.canonical).toContain('#cpu-and-os-flags');
    expect(INSTALL_PLATFORM_COVERAGE[1]?.supported?.cpu).toContain('x64');
    expect(INSTALL_PLATFORM_COVERAGE[1]?.supported?.os).toContain('linux');
    expect(BUN_INSTALL_CPU_VALUES).toBe(BUN_INSTALL_PLATFORM_SUPPORTED.cpu);
    expect(BUN_INSTALL_OS_VALUES).toBe(BUN_INSTALL_PLATFORM_SUPPORTED.os);
  });

  test('canonicalForReleaseTest maps bun install --cpu/--os to install docs', () => {
    expect(canonicalForReleaseTest('install platform: runtime-flags')).toBe(
      CANONICAL_REFS['bun install --cpu']
    );
    expect(canonicalForReleaseTest('install platform: lockfile-stable')).toBe(
      CANONICAL_REFS['platform-specific dependencies']
    );
    expect(canonicalForReleaseTest('install platform: monorepo-cross-dry-run')).toBe(
      CANONICAL_REFS['bun install --cpu']
    );
  });

  test('probeBunInstallPlatformFlags accepts valid target and rejects invalid cpu', async () => {
    const probe = await probeBunInstallPlatformFlags();
    expect(probe.ok).toBe(true);
    expect(probe.validExitCode).toBe(0);
    expect(probe.invalidExitCode).not.toBe(0);
    expect(probe.invalidMessage).toContain('Invalid CPU');
  });

  test('CANONICAL_REFS includes bun install platform doc anchors', () => {
    expect(CANONICAL_REFS['bun install --cpu']).toContain('#cpu-and-os-flags');
    expect(CANONICAL_REFS['platform-specific dependencies']).toContain(
      '#platform-specific-dependencies'
    );
  });

  test('CANONICAL_INSTALL_PLATFORM_TOKENS carries kind and stability metadata', async () => {
    const { CANONICAL_INSTALL_PLATFORM_TOKENS } = await import('../tools/bun-doc-refs.ts');
    expect(CANONICAL_INSTALL_PLATFORM_TOKENS['bun install --cpu']).toEqual({
      url: 'https://bun.com/docs/pm/cli/install#cpu-and-os-flags',
      kind: 'CLI',
      stability: 'stable',
      subsystem: 'package-manager',
      introducedIn: 'all',
    });
    expect(CANONICAL_INSTALL_PLATFORM_TOKENS['platform-specific dependencies']).toMatchObject({
      kind: 'Concept',
      stability: 'stable',
      subsystem: 'package-manager',
    });
  });
});

describe('tools/verify-bun-release.ts', () => {
  test(
    'runs full suite including release-note probes',
    async () => {
      const proc = Bun.spawn(['bun', 'tools/verify-bun-release.ts'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
      expect(code).toBe(0);
      expect(stdout).toContain("tls.getCACertificates('system')");
      expect(stdout).toContain('Built-in objects GC smoke');
      expect(stdout).toContain('timer.ref() after fired setTimeout');
      expect(stdout).toContain('passed');
    },
    { timeout: 60_000 }
  );

  test('proof JSON includes canonical blog URLs per test', async () => {
    const proc = Bun.spawn(['bun', 'tools/verify-bun-release.ts', '--save'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(code).toBe(0);
    expect(stdout).toContain('Proof saved');

    const proof = await Bun.file('public/registry/release-features.json').json();
    expect(proof.blogPost).toBe(BUN_V1314_BLOG);
    const tls = proof.results.find((r: { name: string }) => r.name.includes('tls.getCACertificates'));
    expect(tls?.canonical).toBe(
      BUN_V1314_ANCHORS['tls-getcacertificates-system-now-works-without-use-system-ca']
    );
    expect(proof.releaseNotes?.[0]?.canonical).toContain(BUN_V1314_BLOG);
    expect(proof.semanticTags?.channel).toBeDefined();
    expect(proof.semanticTags?.provenanceId).toBeDefined();
    expect(proof.type).toBe('ChannelAwareVerificationReport');
    expect(tls?._links?.docs).toBe(
      BUN_V1314_ANCHORS['tls-getcacertificates-system-now-works-without-use-system-ca']
    );
    expect(proof.jsonLd?.['@type']).toBe('SoftwareApplication');

    // Rebake channel-meta so downstream consistency tests see aligned artifacts.
    const meta = Bun.spawn(['bun', 'tools/verify-channel-meta.ts', '--prefer-artifacts', '--save'], {
      stdout: 'ignore',
      stderr: 'ignore',
    });
    expect(await meta.exited).toBe(0);
  }, { timeout: 60_000 });
});
