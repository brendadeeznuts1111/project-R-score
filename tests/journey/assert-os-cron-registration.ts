// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level — OS-level (primary)
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawnSync
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Shared OS-cron registration asserts for journey tests.
 *
 * Used by cron-os-persistent + portal-snapshot-cron-os journeys.
 */
import { expect } from 'bun:test';
import { joinPath } from '../../lib/path-bun.ts';

/** Assert Bun.cron OS registration exists for `title` on the current platform. */
export async function assertOsCronRegistration(title: string): Promise<void> {
  if (process.platform === 'darwin') {
    const plist = joinPath(
      Bun.env.HOME || '',
      'Library/LaunchAgents',
      `bun.cron.${title}.plist`
    );
    expect(await Bun.file(plist).exists()).toBe(true);
    const list = Bun.spawnSync(['launchctl', 'list'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(list.exitCode).toBe(0);
    expect(list.stdout.toString()).toContain(`bun.cron.${title}`);
    return;
  }

  if (process.platform === 'linux') {
    const cron = Bun.spawnSync(['crontab', '-l'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    // crontab -l exits 1 when empty; registration should still show marker
    const text = `${cron.stdout.toString()}${cron.stderr.toString()}`;
    expect(text).toContain(`# bun-cron: ${title}`);
    expect(text).toContain(`--cron-title=${title}`);
    return;
  }

  if (process.platform === 'win32') {
    const q = Bun.spawnSync(['schtasks', '/query', '/tn', `bun-cron-${title}`], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(q.exitCode).toBe(0);
    return;
  }

  throw new Error(`Unsupported platform for OS cron proof: ${process.platform}`);
}
