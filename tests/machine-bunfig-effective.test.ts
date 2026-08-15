// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';
import {
  readEffectiveGlobalBunfig,
  readMachineBunfig,
  resolveEffectiveInstallPolicy,
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
    const project = { bunfigPath: null, install: null, cacheDir: null };
    const policy = resolveEffectiveInstallPolicy(project, effective);
    expect(policy.linker).toBe('hoisted');
    expect(policy.source.linker).toBe('machine');
    await Bun.$`rm -rf ${home}`.quiet();
  });
});
