// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun';
import {
  ensureMachineBunfig,
  machineBunfigHasRequiredSnippets,
  renderMachineBunfigTemplate,
  MACHINE_BUNFIG_TEMPLATE_REL,
  CACHE_DIR_PLACEHOLDER,
} from '../scripts/ensure-machine-bunfig.ts';

const ROOT = resolvePath(import.meta.dir, '..');

describe('ensure-machine-bunfig', () => {
  test('renderMachineBunfigTemplate substitutes absolute cache dir', () => {
    const out = renderMachineBunfigTemplate(
      `dir = "${CACHE_DIR_PLACEHOLDER}"\n`,
      '/home/runner/.bun/install/cache'
    );
    expect(out).toContain('dir = "/home/runner/.bun/install/cache"');
    expect(out).not.toContain(CACHE_DIR_PLACEHOLDER);
  });

  test('committed template exists and has required SSOT snippets', async () => {
    const text = await Bun.file(joinPath(ROOT, MACHINE_BUNFIG_TEMPLATE_REL)).text();
    expect(text).toContain(CACHE_DIR_PLACEHOLDER);
    expect(text).toContain('linker = "isolated"');
    expect(text).toContain('globalStore = true');
    const rendered = renderMachineBunfigTemplate(text, '/tmp/cache');
    expect(machineBunfigHasRequiredSnippets(rendered)).toEqual([]);
  });

  test('ensure writes ~/.bunfig.toml when missing', async () => {
    const home = joinPath(ROOT, 'tmp/ensure-machine-bunfig-home');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    const r = await ensureMachineBunfig({ cwd: ROOT, home, overwrite: false });
    expect(r.ok).toBe(true);
    expect(r.action).toBe('wrote');
    expect(await Bun.file(r.path).exists()).toBe(true);
    const text = await Bun.file(r.path).text();
    expect(text).toContain('linker = "isolated"');
    expect(text).toContain(r.cacheDir);
    expect(text).not.toContain(CACHE_DIR_PLACEHOLDER);
    // second call no-op
    const r2 = await ensureMachineBunfig({ cwd: ROOT, home, overwrite: false });
    expect(r2.ok).toBe(true);
    expect(r2.action).toBe('exists');
    // check passes
    const chk = await ensureMachineBunfig({ cwd: ROOT, home, checkOnly: true });
    expect(chk.ok).toBe(true);
    expect(chk.action).toBe('check-ok');
    await Bun.$`rm -rf ${home}`.quiet();
  });

  test('empty HOME doctor bunfig group passes after ensure', async () => {
    const home = joinPath(ROOT, 'tmp/ensure-doctor-home');
    await Bun.$`rm -rf ${home}`.quiet();
    await Bun.$`mkdir -p ${home}`.quiet();
    const ens = await ensureMachineBunfig({ cwd: ROOT, home, overwrite: true });
    expect(ens.ok).toBe(true);
    const { runPortalDoctor } = await import('../tools/lib/portal-cli-doctor.ts');
    // inject HOME via machineEnv — never mutate process Bun.env (parallel tests)
    const r = await runPortalDoctor({
      cwd: ROOT,
      group: 'bunfig',
      skipLiveAccess: true,
      machineEnv: { HOME: home },
    });
    expect(r.checks.find(c => c.id === 'bunfig-machine-ssot')?.ok).toBe(true);
    expect(r.checks.find(c => c.id === 'bunfig-merge-consistency')?.ok).toBe(true);
    expect(r.summary.failedFatal).toBe(0);
    expect(r.ok).toBe(true);
    await Bun.$`rm -rf ${home}`.quiet();
  });
});
