// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';
import { inspectBunfigInode } from '../scripts/lib/bunfig-inode.ts';
import {
  formatGlobalBunfigRef,
  formatPolicySource,
  readBunfigInstall,
  readEffectiveGlobalBunfig,
  readGlobalBunfigLayers,
  readMachineBunfig,
  resolveEffectiveInstallPolicy,
  resolveGlobalBunfigPaths,
  resolveHomeBunfigPath,
} from '../scripts/lib/machine-bunfig.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('readEffectiveGlobalBunfig', () => {
  test('uses $HOME/.bunfig.toml when XDG global is absent', async () => {
    const home = joinPath(ROOT, 'tmp/effective-global-home-only');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    await Bun.write(
      joinPath(home, '.bunfig.toml'),
      '[install]\nlinker = "isolated"\nglobalStore = true\n'
    );
    const env = { HOME: home };
    const homeSnap = await readMachineBunfig(env);
    const effective = await readEffectiveGlobalBunfig(env);
    expect(effective.bunfigPath).toBe(homeSnap.bunfigPath);
    expect(effective.install?.linker).toBe('isolated');
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('uses $XDG_CONFIG_HOME/.bunfig.toml when that file exists', async () => {
    const home = joinPath(ROOT, 'tmp/effective-global-xdg');
    const xdg = joinPath(home, 'xdg');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${xdg}`.quiet();
    await Bun.write(
      joinPath(home, '.bunfig.toml'),
      '[install]\nlinker = "isolated"\nglobalStore = true\n[install.cache]\ndir = "/tmp/home-cache"\n'
    );
    await Bun.write(joinPath(xdg, '.bunfig.toml'), '[install]\nlinker = "hoisted"\n');
    const env = { HOME: home, XDG_CONFIG_HOME: xdg };
    const effective = await readEffectiveGlobalBunfig(env);
    expect(effective.bunfigPath).toBe(joinPath(xdg, '.bunfig.toml'));
    expect(effective.install?.linker).toBe('hoisted');
    const project = { bunfigPath: null, install: null, cacheDir: null, inode: 'missing' as const };
    const policy = resolveEffectiveInstallPolicy(project, effective);
    expect(policy.linker).toBe('hoisted');
    expect(policy.source.linker).toBe('machine');
    expect(policy.globalBunfigPath).toBe(joinPath(xdg, '.bunfig.toml'));
    expect(formatPolicySource('linker', policy, env)).toBe(
      'inherited from $XDG_CONFIG_HOME/.bunfig.toml'
    );
    expect(formatGlobalBunfigRef(policy.globalBunfigPath, env)).toBe(
      '$XDG_CONFIG_HOME/.bunfig.toml'
    );
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('formatPolicySource labels home SSOT as ~/.bunfig.toml', async () => {
    const home = joinPath(ROOT, 'tmp/effective-label-home');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    await Bun.write(joinPath(home, '.bunfig.toml'), '[install]\nlinker = "isolated"\n');
    const env = { HOME: home };
    const policy = resolveEffectiveInstallPolicy(
      { bunfigPath: null, install: null, cacheDir: null, inode: 'missing' },
      await readEffectiveGlobalBunfig(env)
    );
    expect(formatPolicySource('linker', policy, env)).toBe('inherited from ~/.bunfig.toml');
    expect(formatGlobalBunfigRef(resolveHomeBunfigPath(env), env)).toBe('~/.bunfig.toml');
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('readBunfigInstall expands ~ against the injected HOME', async () => {
    const home = joinPath(ROOT, 'tmp/tilde-expand-home');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    const bunfigPath = joinPath(home, '.bunfig.toml');
    await Bun.write(bunfigPath, '[install.cache]\ndir = "~/.bun/install/cache"\n');
    const { cacheDir } = await readBunfigInstall(bunfigPath, { HOME: home });
    expect(cacheDir).toBe(joinPath(home, '.bun/install/cache'));
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('bake paths: XDG file is effectiveGlobal; home remains machine SSOT', async () => {
    const home = joinPath(ROOT, 'tmp/bake-paths-xdg');
    const xdg = joinPath(home, 'xdg');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${xdg}`.quiet();
    await Bun.write(joinPath(home, '.bunfig.toml'), '[install]\nlinker = "isolated"\n');
    await Bun.write(joinPath(xdg, '.bunfig.toml'), '[install]\nlinker = "hoisted"\n');
    const env = { HOME: home, XDG_CONFIG_HOME: xdg };
    const paths = resolveGlobalBunfigPaths(env);
    expect(paths.machine).toBe(joinPath(home, '.bunfig.toml'));
    expect(paths.effectiveGlobal).toBe(joinPath(xdg, '.bunfig.toml'));
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('readGlobalBunfigLayers reuses the home snapshot when XDG is absent', async () => {
    const home = joinPath(ROOT, 'tmp/layers-home-only');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    await Bun.write(joinPath(home, '.bunfig.toml'), '[install]\nlinker = "isolated"\n');
    const layers = await readGlobalBunfigLayers({ HOME: home });
    expect(layers.xdgLoaded).toBe(false);
    expect(layers.effective).toBe(layers.machine);
    expect(layers.machine.install?.linker).toBe('isolated');
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('dangling home bunfig is not missing', async () => {
    const home = joinPath(ROOT, 'tmp/dangling-home-inode');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    const live = joinPath(home, '.bunfig.toml');
    const { symlinkSync } = await import('node:fs');
    symlinkSync(joinPath(home, 'missing-target.toml'), live);
    expect(inspectBunfigInode(live)).toBe('dangling-symlink');
    const snap = await readMachineBunfig({ HOME: home });
    expect(snap.inode).toBe('dangling-symlink');
    expect(snap.bunfigPath).toBeNull();
    expect(snap.install).toBeNull();
    const missingHome = joinPath(ROOT, 'tmp/missing-home-inode');
    await Bun.$`rm -rf ${missingHome}`.quiet();
    await Bun.$`mkdir -p ${missingHome}`.quiet();
    const gone = await readMachineBunfig({ HOME: missingHome });
    expect(gone.inode).toBe('missing');
    expect(gone.bunfigPath).toBeNull();
    await Bun.$`rm -rf ${home} ${missingHome}`.quiet();
  });
});
