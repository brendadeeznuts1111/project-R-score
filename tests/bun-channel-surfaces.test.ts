// @see https://github.com/oven-sh/setup-bun#using-version-file
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
import { describe, expect, test } from 'bun:test';
import { ENTERPRISE_DOCUMENTATION_PATHS } from '../lib/docs/constants/categories.ts';
import {
  DocumentationCategory,
  DocumentationProvider,
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  QUICK_REFERENCE_URLS,
} from '../lib/docs/constants/domains.ts';
import { joinPath } from '../lib/path-bun.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';

const ROOT = joinPath(import.meta.dir, '..');
const SETUP_BUN_SHA = '0c5077e51419868618aeaa5fe8019c62421857d6';

async function githubYamlFiles(): Promise<string[]> {
  const files: string[] = [];
  for await (const path of new Bun.Glob('**/*.{yml,yaml}').scan({
    cwd: joinPath(ROOT, '.github'),
    onlyFiles: true,
  })) {
    files.push(joinPath(ROOT, '.github', path));
  }
  return files.sort();
}

describe('Bun channel surfaces', () => {
  test('canonical RSS catalogs expose only Bun’s one verified official feed', () => {
    const officialFeed = 'https://bun.com/rss.xml';
    const absoluteCatalogs = [
      ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_RSS],
      ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_FEEDS],
      QUICK_REFERENCE_URLS.RSS_FEEDS,
    ];

    for (const catalog of absoluteCatalogs) {
      const feedUrls = Object.values(catalog).filter(value => value.endsWith('.xml'));
      expect(feedUrls.length).toBeGreaterThan(0);
      expect(new Set(feedUrls)).toEqual(new Set([officialFeed]));
    }

    const feedPaths =
      ENTERPRISE_DOCUMENTATION_PATHS.BUN_CORE[DocumentationProvider.BUN_RSS][
        DocumentationCategory.RSS_FEEDS
      ];
    expect(new Set(Object.values(feedPaths))).toEqual(new Set(['/rss.xml']));
  });

  test('network-free runtime check reports the exact executing revision', async () => {
    const resolvedBun = resolveVerificationBunBinary();
    expect(resolvedBun.matchesRuntime).toBe(true);
    const process = Bun.spawn([resolvedBun.path, 'tools/bun-runtime-pin.ts', '--json'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const [exitCode, stdout] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
    ]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout) as {
      ok: boolean;
      runtime: string;
      revision: string;
    };
    expect(result).toMatchObject({ ok: true, runtime: Bun.version, revision: Bun.revision });
  });

  test('every root setup-bun call reads .bun-version and pins the action revision', async () => {
    const violations: string[] = [];
    for (const path of await githubYamlFiles()) {
      const text = await Bun.file(path).text();
      if (!text.includes('oven-sh/setup-bun@')) continue;

      const relative = path.slice(ROOT.length + 1);
      const setupCalls = text.match(/oven-sh\/setup-bun@[^\s]+/g) ?? [];
      const versionFileInputs = text.match(/bun-version-file:\s*(?:\$\{\{ inputs\.bun-version-file \}\}|\.bun-version)/g) ?? [];
      if (setupCalls.some(call => call !== `oven-sh/setup-bun@${SETUP_BUN_SHA}`)) {
        violations.push(`${relative}: setup-bun action is not revision-pinned`);
      }
      if (versionFileInputs.length !== setupCalls.length) {
        violations.push(`${relative}: each setup-bun call must read .bun-version`);
      }
      if (/^\s*bun-version:\s*/m.test(text)) {
        violations.push(`${relative}: copied bun-version input is forbidden`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('root runtime selectors agree and partner workspaces accept the selected stable pin', async () => {
    const selected = (await Bun.file(joinPath(ROOT, '.bun-version')).text()).trim();
    const rootManifest = (await Bun.file(joinPath(ROOT, 'package.json')).json()) as {
      packageManager?: string;
      engines?: { bun?: string };
    };
    expect(rootManifest.packageManager).toBe(`bun@${selected}`);
    expect(Bun.semver.satisfies(selected, rootManifest.engines?.bun ?? '')).toBe(true);

    for (const relative of [
      'packages/partners/package.json',
      'projects/active/sports-terminal-os/package.json',
    ]) {
      const manifest = (await Bun.file(joinPath(ROOT, relative)).json()) as {
        engines?: { bun?: string };
      };
      expect(Bun.semver.satisfies(selected, manifest.engines?.bun ?? '')).toBe(true);
    }
  });

  test('root type selectors use the stable 1.4 wrapper and reviewed vendored declarations', async () => {
    const manifest = (await Bun.file(joinPath(ROOT, 'package.json')).json()) as {
      catalog?: { '@types/bun'?: string; 'bun-types'?: string };
    };
    expect(manifest.catalog?.['@types/bun']).toBe('1.4.0');
    expect(manifest.catalog?.['bun-types']).toBe(
      'file:tools/vendor/bun-types/bun-types-1.4.0-tip.23d233b2.tgz'
    );
  });

  test('partner composition references Bun governance without copying runtime versions', async () => {
    const plan = await Bun.file(joinPath(ROOT, 'docs/design/partner-dashboard-mvp.toml')).text();
    const runtimeSection = plan.match(/\[runtime\]\n([\s\S]*?)\n\[core\]/)?.[1] ?? '';
    expect(runtimeSection).toContain('authority = "config/bun-channels.toml"');
    expect(runtimeSection).toContain(
      'status_artifact = "public/registry/bun-channel-status.json"'
    );
    expect(runtimeSection).not.toMatch(/\b\d+\.\d+\.\d+(?:-[\w.]+)?\b/);
  });
});
