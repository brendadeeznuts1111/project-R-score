/**
 * Partner Profile OS — Template Hot Reload
 *
 * Polls ./profiles/*.toml via Bun.Glob (no node:fs).
 * On change: reload template, refresh book index.
 *
 * Behavior:
 *   - Watches *.toml files in the template directory
 *   - On change: reloads all templates, refreshes book index
 *   - Does NOT modify existing partner runtime state (balance, exposure, etc.)
 *   - New partners get fresh materialization; existing partners keep runtime state
 */

import { loadAndCacheTemplates } from "./partner-profile-loader";
import { partnerProfileService } from "./partner-profile-service";

let pollTimer: ReturnType<typeof setInterval> | null = null;
const lastMtimes = new Map<string, number>();
let primed = false;

async function scanTemplateChanges(templateDir: string): Promise<void> {
  const glob = new Bun.Glob("**/*.toml");
  let changed = false;

  for await (const relativePath of glob.scan({ cwd: templateDir, onlyFiles: true })) {
    const file = Bun.file(`${templateDir}/${relativePath}`);
    const mtime = file.lastModified;
    const previous = lastMtimes.get(relativePath);

    if (previous === undefined) {
      lastMtimes.set(relativePath, mtime);
      continue;
    }

    if (mtime !== previous) {
      lastMtimes.set(relativePath, mtime);
      changed = true;
      console.log(`[HOT-RELOAD] Template changed: ${relativePath}`);
    }
  }

  if (!primed) {
    primed = true;
    return;
  }

  if (!changed) return;

  try {
    await loadAndCacheTemplates(templateDir);
    partnerProfileService.refreshBookIndex();
    console.log("[HOT-RELOAD] Templates reloaded, book index refreshed");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[HOT-RELOAD] Reload failed: ${message}`);
  }
}

/**
 * Start watching the template directory for changes.
 *
 * @param templateDir Directory containing *.toml templates
 */
export function startTemplateWatcher(templateDir: string = "./profiles"): void {
  stopTemplateWatcher();
  primed = false;
  lastMtimes.clear();

  void scanTemplateChanges(templateDir);
  pollTimer = setInterval(() => {
    void scanTemplateChanges(templateDir);
  }, 2000);

  console.log(`[HOT-RELOAD] Polling ${templateDir} for template changes (Bun.Glob)`);
}

/**
 * Stop the template watcher.
 */
export function stopTemplateWatcher(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[HOT-RELOAD] Template watcher stopped");
  }
}

/**
 * Check if the watcher is currently active.
 */
export function isWatcherActive(): boolean {
  return pollTimer !== null;
}

/**
 * Manually trigger a template reload.
 */
export async function reloadTemplates(
  templateDir: string = "./profiles"
): Promise<{ templatesLoaded: number; errors: string[] }> {
  const errors: string[] = [];

  try {
    const templates = await loadAndCacheTemplates(templateDir);
    partnerProfileService.refreshBookIndex();

    return {
      templatesLoaded: templates.size,
      errors,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    return { templatesLoaded: 0, errors };
  }
}