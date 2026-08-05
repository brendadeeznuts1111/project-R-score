// @see https://bun.com/docs/test
/**
 * Pure checks for scripts/lib/pass-session.sh helpers (no live vault).
 */
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const HELPERS = join(ROOT, 'scripts/lib/pass-session.sh');

async function bashFn(fn: string, args: string[]): Promise<{ code: number; stdout: string }> {
  const quoted = args.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ');
  const script = `set -euo pipefail; . '${HELPERS}'; ${fn} ${quoted}`;
  const proc = Bun.spawn(['bash', '-c', script], { stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  const code = await proc.exited;
  return { code: code ?? 1, stdout: stdout.trimEnd() };
}

describe('pass-session helpers', () => {
  test('pass_template_to_run_env strips handlebars around pass://', async () => {
    const dir = await Bun.file(import.meta.path).exists();
    expect(dir).toBe(true);
    const tmpIn = join(ROOT, `.tmp-pass-run-in-${process.pid}.env`);
    const tmpOut = join(ROOT, `.tmp-pass-run-out-${process.pid}.env`);
    try {
      await Bun.write(
        tmpIn,
        [
          '# comment with {{ pass://ignored/in/comment }} stays',
          'PLAIN=hello',
          'SECRET={{ pass://factorywager/Cloudflare API Token/password }}',
          'SPACED={{  pass://vault/item/field  }}',
          '',
        ].join('\n')
      );
      const { code } = await bashFn('pass_template_to_run_env', [tmpIn, tmpOut]);
      expect(code).toBe(0);
      const out = await Bun.file(tmpOut).text();
      expect(out).toContain('SECRET=pass://factorywager/Cloudflare API Token/password');
      expect(out).toContain('SPACED=pass://vault/item/field');
      expect(out).toContain('PLAIN=hello');
      expect(out).not.toMatch(/SECRET=\{\{/);
    } finally {
      await Bun.write(tmpIn, '').catch(() => {});
      await Bun.write(tmpOut, '').catch(() => {});
      // best-effort cleanup
      try {
        const { unlinkSync } = await import('node:fs');
        unlinkSync(tmpIn);
        unlinkSync(tmpOut);
      } catch {
        /* ignore */
      }
    }
  });

  test('pass_session_root defaults under ~/.factorywager/pass-sessions', async () => {
    const { code, stdout } = await bashFn('pass_session_root', []);
    expect(code).toBe(0);
    expect(stdout).toContain('.factorywager/pass-sessions');
  });

  test('pass_session_dir_for nests project slug', async () => {
    const { code, stdout } = await bashFn('pass_session_dir_for', ['factorywager']);
    expect(code).toBe(0);
    expect(stdout.endsWith('/factorywager')).toBe(true);
  });

  test('pass_key_provider_for_agent defaults fs; keyring opt-in', async () => {
    const def = await Bun.spawn(
      ['bash', '-c', `set -e; . '${HELPERS}'; unset PASS_USE_KEYRING; pass_key_provider_for_agent`],
      { stdout: 'pipe' }
    );
    expect((await new Response(def.stdout).text()).trim()).toBe('fs');
    expect(await def.exited).toBe(0);

    const kr = await Bun.spawn(
      ['bash', '-c', `set -e; . '${HELPERS}'; PASS_USE_KEYRING=1 pass_key_provider_for_agent`],
      { stdout: 'pipe' }
    );
    expect((await new Response(kr.stdout).text()).trim()).toBe('keyring');
    expect(await kr.exited).toBe(0);
  });

  test('pass_ssh_vault_default is factorywager for agent path', async () => {
    const { code, stdout } = await bashFn('pass_ssh_vault_default', []);
    expect(code).toBe(0);
    // Unset overrides in subshell
    const r = await Bun.spawn(
      [
        'bash',
        '-c',
        `set -e; unset PASS_SSH_VAULT FACTORYWAGER_VAULT; . '${HELPERS}'; pass_ssh_vault_default`,
      ],
      { stdout: 'pipe' }
    );
    expect((await new Response(r.stdout).text()).trim()).toBe('factorywager');
    expect(await r.exited).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
  });

  test('pass_ssh_vault_for_session respects PASS_SSH_VAULT override', async () => {
    const r = await Bun.spawn(
      [
        'bash',
        '-c',
        `set -e; . '${HELPERS}'; PASS_SSH_VAULT=Personal pass_ssh_vault_for_session`,
      ],
      { stdout: 'pipe' }
    );
    expect((await new Response(r.stdout).text()).trim()).toBe('Personal');
    expect(await r.exited).toBe(0);
  });

  test('pass_ssh_vault_for_session defaults factorywager without live PAT', async () => {
    const r = await Bun.spawn(
      [
        'bash',
        '-c',
        `set -e; unset PASS_SSH_VAULT FACTORYWAGER_VAULT; . '${HELPERS}'; pass_ssh_vault_for_session`,
      ],
      { stdout: 'pipe' }
    );
    expect((await new Response(r.stdout).text()).trim()).toBe('factorywager');
    expect(await r.exited).toBe(0);
  });
});
