// `node:fs.watch` is the bounded compatibility bridge for observing a data file;
// Bun's --watch/--hot restart imported modules and do not expose a Bun.watch API.
// eslint-disable-next-line no-restricted-imports -- no Bun callback watcher exists
import { watch, type FSWatcher } from 'node:fs';
import { ENHANCEMENT_REGISTRY_PATH, loadEnhancementRegistry } from './registry.ts';
import { resolveEnhancementEnvironment, resolveEnhancementRegistry } from './resolver.ts';
import type { EnhancementSnapshot } from './types.ts';

export class EnhancementStore {
  #snapshot: EnhancementSnapshot | null = null;
  #watcher: FSWatcher | null = null;
  #reloadTimer: Timer | null = null;

  constructor(readonly registryPath = ENHANCEMENT_REGISTRY_PATH) {}

  async load(): Promise<EnhancementSnapshot> {
    const next = resolveEnhancementRegistry(await loadEnhancementRegistry(this.registryPath));
    this.#snapshot = next;
    return next;
  }

  get snapshot(): EnhancementSnapshot {
    if (!this.#snapshot) throw new Error('enhancement registry has not been loaded');
    return this.#snapshot;
  }

  enabled(id: string): boolean {
    return this.snapshot.items.find(item => item.id === id)?.enabled ?? false;
  }

  async startDevelopmentWatcher(
    onReload: (snapshot: EnhancementSnapshot) => void = () => {}
  ): Promise<boolean> {
    if (resolveEnhancementEnvironment() !== 'development' || this.#watcher) return false;
    if (!this.#snapshot) await this.load();
    this.#watcher = watch(this.registryPath, () => {
      if (this.#reloadTimer) clearTimeout(this.#reloadTimer);
      this.#reloadTimer = setTimeout(async () => {
        try {
          const next = await this.load();
          onReload(next);
        } catch (error) {
          console.error('Enhancement registry reload rejected; keeping last valid snapshot', error);
        }
      }, 75);
    });
    return true;
  }

  close(): void {
    if (this.#reloadTimer) clearTimeout(this.#reloadTimer);
    this.#reloadTimer = null;
    this.#watcher?.close();
    this.#watcher = null;
  }
}
