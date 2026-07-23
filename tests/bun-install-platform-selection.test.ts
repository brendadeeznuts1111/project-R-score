// @see https://bun.com/docs/pm/cli/install#platform-specific-dependencies
// @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags
// @see https://bun.com/docs/pm/cli/install#dry-run
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/test/index#run-tests — bun:test
import { expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

interface PlatformDefinition {
  cpu: readonly string[];
  os: readonly string[];
}

interface PackedFixture {
  bytes: Uint8Array;
  filename: string;
  integrity: string;
}

interface InstallResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

const PLATFORM_PACKAGES: Readonly<Record<string, PlatformDefinition>> = {
  'darwin-arm64-only': { cpu: ['arm64'], os: ['darwin'] },
  'linux-x64-only': { cpu: ['x64'], os: ['linux'] },
};

async function packPlatformFixtures(
  root: string
): Promise<ReadonlyMap<string, PackedFixture>> {
  const packed = new Map<string, PackedFixture>();

  for (const [name, platform] of Object.entries(PLATFORM_PACKAGES)) {
    const packageDir = join(root, `pack-${name}`);
    mkdirSync(packageDir);
    await Bun.write(
      join(packageDir, 'package.json'),
      JSON.stringify({
        name,
        version: '1.0.0',
        main: 'index.cjs',
        files: ['index.cjs'],
        ...platform,
      })
    );
    await Bun.write(join(packageDir, 'index.cjs'), 'module.exports = true;\n');

    const pack = Bun.spawnSync(
      ['bun', 'pm', 'pack', '--destination', root, '--ignore-scripts', '--quiet'],
      { cwd: packageDir, stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' }
    );
    expect(pack.exitCode, new TextDecoder().decode(pack.stderr)).toBe(0);

    const outputPath = new TextDecoder()
      .decode(pack.stdout)
      .trim()
      .split('\n')
      .at(-1);
    if (!outputPath) throw new Error(`bun pm pack did not return a path for ${name}`);

    const filename = basename(outputPath);
    const bytes = new Uint8Array(await Bun.file(join(root, filename)).arrayBuffer());
    const integrity = `sha512-${new Bun.CryptoHasher('sha512')
      .update(bytes)
      .digest('base64')}`;
    packed.set(name, { bytes, filename, integrity });
  }

  return packed;
}

test(
  'bun install keeps one normalized lockfile while selecting packages by --cpu and --os',
  async () => {
    const root = mkdtempSync(join(tmpdir(), 'fw-bun-platform-selection-'));
    let server: Bun.Server<undefined> | undefined;

    try {
      const packed = await packPlatformFixtures(root);
      server = Bun.serve({
        port: 0,
        fetch(request) {
          const url = new URL(request.url);

          for (const [name, platform] of Object.entries(PLATFORM_PACKAGES)) {
            const archive = packed.get(name);
            if (!archive) continue;

            if (url.pathname === `/${name}`) {
              return Response.json({
                name,
                'dist-tags': { latest: '1.0.0' },
                versions: {
                  '1.0.0': {
                    name,
                    version: '1.0.0',
                    ...platform,
                    dist: {
                      integrity: archive.integrity,
                      tarball: `${url.origin}/${name}/-/${archive.filename}`,
                    },
                  },
                },
              });
            }

            if (url.pathname === `/${name}/-/${archive.filename}`) {
              return new Response(archive.bytes, {
                headers: { 'content-type': 'application/octet-stream' },
              });
            }
          }

          return new Response('not found', { status: 404 });
        },
      });

      await Bun.write(
        join(root, 'package.json'),
        JSON.stringify({
          name: 'fw-bun-platform-selection',
          private: true,
          optionalDependencies: {
            'darwin-arm64-only': '1.0.0',
            'linux-x64-only': '1.0.0',
          },
        })
      );

      const configPath = join(root, 'bunfig.toml');
      await Bun.write(
        configPath,
        [
          '[install]',
          'frozenLockfile = false',
          'linker = "hoisted"',
          'minimumReleaseAge = 0',
          '',
        ].join('\n')
      );

      const registry = `http://127.0.0.1:${server.port}`;
      const runInstall = async (
        cpu: string,
        os: string,
        extra: readonly string[]
      ): Promise<InstallResult> => {
        const process = Bun.spawn(
          [
            'bun',
            'install',
            `--cpu=${cpu}`,
            `--os=${os}`,
            `--config=${configPath}`,
            `--registry=${registry}`,
            '--save-text-lockfile',
            '--no-cache',
            ...extra,
          ],
          { cwd: root, stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' }
        );
        const [exitCode, stdout, stderr] = await Promise.all([
          process.exited,
          new Response(process.stdout).text(),
          new Response(process.stderr).text(),
        ]);
        return { exitCode, stderr, stdout };
      };

      const dryRun = await runInstall('x64', 'linux', ['--dry-run']);
      expect(dryRun.exitCode, dryRun.stderr).toBe(0);
      expect(existsSync(join(root, 'bun.lock'))).toBe(false);
      expect(existsSync(join(root, 'node_modules'))).toBe(false);

      const invalid = await runInstall('bogus', 'linux', ['--dry-run']);
      expect(invalid.exitCode).not.toBe(0);
      expect(invalid.stderr).toContain('Invalid CPU architecture');

      const lockOnly = await runInstall('x64', 'linux', ['--lockfile-only']);
      expect(lockOnly.exitCode, lockOnly.stderr).toBe(0);

      const lockPath = join(root, 'bun.lock');
      const lockBeforeInstalls = await Bun.file(lockPath).text();
      expect(lockBeforeInstalls).toContain('{ "os": "darwin", "cpu": "arm64" }');
      expect(lockBeforeInstalls).toContain('{ "os": "linux", "cpu": "x64" }');

      const linuxInstall = await runInstall('x64', 'linux', ['--frozen-lockfile']);
      expect(linuxInstall.exitCode, linuxInstall.stderr).toBe(0);
      expect(readdirSync(join(root, 'node_modules')).sort()).toEqual(['linux-x64-only']);

      rmSync(join(root, 'node_modules'), { recursive: true, force: true });

      const darwinInstall = await runInstall('arm64', 'darwin', ['--frozen-lockfile']);
      expect(darwinInstall.exitCode, darwinInstall.stderr).toBe(0);
      expect(readdirSync(join(root, 'node_modules')).sort()).toEqual(['darwin-arm64-only']);

      expect(await Bun.file(lockPath).text()).toBe(lockBeforeInstalls);
    } finally {
      server?.stop(true);
      rmSync(root, { recursive: true, force: true });
    }
  },
  { timeout: 30_000 }
);
