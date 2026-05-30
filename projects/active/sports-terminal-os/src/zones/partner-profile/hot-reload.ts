/**
 * Partner Profile OS — Template Hot Reload
 *
 * File watcher on ./profiles/*.toml using Bun-native fs.watch.
 * On change: reload template, refresh book index.
 *
 * Behavior:
 *   - Watches *.toml files in the template directory
 *   - On change: reloads all templates, refreshes book index
 *   - Does NOT modify existing partner runtime state (balance, exposure, etc.)
 *   - New partners get fresh materialization; existing partners keep runtime state
 */

import { watch } from "fs";
import { loadAndCacheTemplates } from "./partner-profile-loader";
import { partnerProfileService } from "./partner-profile-service";

let currentWatcher: ReturnType<typeof watch> | null = null;

/**
 * Start watching the template directory for changes.
 *
 * @param templateDir Directory containing *.toml templates
 */
export function startTemplateWatcher(templateDir: string = "./profiles"): void {
  // Stop any existing watcher
  stopTemplateWatcher();

  currentWatcher = watch(
    templateDir,
    { recursive: true },
    async (eventType, filename) => {
      if (!filename?.endsWith(".toml")) return;

      console.log(`[HOT-RELOAD] Template ${eventType}: ${filename}`);

      try {
        // Reload all templates
        await loadAndCacheTemplates(templateDir);

        // Refresh book index with new template configs
        partnerProfileService.refreshBookIndex();

        const gwCount = partnerProfileService["gateways" as keyof typeof partnerProfileService];
        console.log(`[HOT-RELOAD] Templates reloaded, book index refreshed`);
      } catch (err: any) {
        console.error(`[HOT-RELOAD] Reload failed: ${err.message}`);
      }
    }
  );

  console.log(`[HOT-RELOAD] Watching ${templateDir} for template changes`);
}

/**
 * Stop the template watcher.
 */
export function stopTemplateWatcher(): void {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
    console.log("[HOT-RELOAD] Template watcher stopped");
  }
}

/**
 * Check if the watcher is currently active.
 */
export function isWatcherActive(): boolean {
  return currentWatcher !== null;
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
  } catch (err: any) {
    errors.push(err.message);
    return { templatesLoaded: 0, errors };
  }
}
