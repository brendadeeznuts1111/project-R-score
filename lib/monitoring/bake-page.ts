// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Embed monitoring + ops snapshot into static HTML for no-JS-first-paint on Pages.
 */
import { joinPath } from '../path-bun.ts';
import { bakeJsonEmbed } from '../http/portal-embed-bake.ts';

export async function bakeMonitoringPage(opts: {
  snapshotPath: string;
  htmlPath: string;
  opsPath?: string;
}): Promise<void> {
  const snapText = await Bun.file(opts.snapshotPath).text();
  const mon = JSON.parse(snapText) as Record<string, unknown>;

  let ops: Record<string, unknown> | null = null;
  if (opts.opsPath) {
    const opsFile = Bun.file(opts.opsPath);
    if (await opsFile.exists()) {
      ops = (await opsFile.json()) as Record<string, unknown>;
    }
  }

  await bakeJsonEmbed(opts.htmlPath, 'monitoring-embed', { mon, ops });
}

/** Default paths from repo root. */
export async function bakeMonitoringPageDefault(
  root = joinPath(import.meta.dir, '../..')
): Promise<void> {
  await bakeMonitoringPage({
    snapshotPath: joinPath(root, 'public/registry/monitoring.json'),
    htmlPath: joinPath(root, 'public/monitoring/index.html'),
    opsPath: joinPath(root, 'public/registry/ops-summary.json'),
  });
}
