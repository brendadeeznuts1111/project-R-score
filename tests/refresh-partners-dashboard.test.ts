// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { refreshPartnersDashboard } from '../scripts/refresh-partners-dashboard.ts';

describe('partner:dashboard:refresh', () => {
  test('dry-run plans handshake + profiles + dashboard without writing', async () => {
    const result = await refreshPartnersDashboard({
      dryRun: true,
      skipHandshake: true, // avoid token/db dependency in unit dry-run
    });
    expect(result.ok).toBe(true);
    expect(result.dashboardPath).toBe('public/registry/partners-dashboard.json');
    const ids = result.steps.map(s => s.id);
    expect(ids).toContain('handshake');
    expect(ids).toContain('profiles');
    expect(ids).toContain('coverage');
    expect(ids).toContain('dashboard');
    expect(result.steps.find(s => s.id === 'handshake')?.detail).toBe('skipped');
  });

  test('dry-run align-clocks is a planned step', async () => {
    const result = await refreshPartnersDashboard({
      dryRun: true,
      skipHandshake: true,
      skipProfiles: true,
      skipDashboard: true,
      alignClocks: true,
    });
    expect(result.ok).toBe(true);
    expect(result.steps.some(s => s.id === 'align-clocks' && s.ok)).toBe(true);
  });

  test('CLI rejects unknown long options', async () => {
    const proc = Bun.spawn(
      ['bun', 'scripts/refresh-partners-dashboard.ts', '--not-a-real-flag'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    const [stderr, code] = await Promise.all([
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    expect(code).not.toBe(0);
    expect(stderr + (await new Response(proc.stdout).text())).toMatch(/Unknown long option|not-a-real-flag/);
  });
});
