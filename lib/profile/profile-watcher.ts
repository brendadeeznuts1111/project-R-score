/**
 * Profile Watcher — local file auto-uploader
 *
 * Polls for new CPU.*.md / Heap.*.md files and auto-uploads them
 * via ProfileSessionUploader, optionally deleting after upload.
 *
 * Uses setInterval + Bun.Glob.scan() polling (same pattern as
 * lib/config/configuration-manager.ts).
 */

import { resolve } from 'node:path';
import { unlink } from 'node:fs/promises';
import { ProfileSessionUploader, type ProfileUploaderConfig, type ProfileEntry } from './session-uploader';

// ==================== Types ====================

export interface ProfileWatcherConfig {
  /** Polling interval in ms (default: 5000) */
  interval?: number;
  /** Directories to scan (default: ['./profiles']) */
  watchDirs?: string[];
  /** Also scan project root for stray profiles (default: false) */
  scanRoot?: boolean;
  /** Delete local files after successful upload (default: false) */
  deleteAfterUpload?: boolean;
  /** R2 uploader config */
  uploaderConfig?: ProfileUploaderConfig;
  /** Called after each successful upload batch */
  onUpload?: (count: number, dir: string) => void;
  /** Called on upload error */
  onError?: (error: Error) => void;
}

// ==================== Watcher ====================

export class ProfileWatcher {
  private config: ProfileWatcherConfig;
  private uploader: ProfileSessionUploader;
  private timer: ReturnType<typeof setInterval> | null = null;
  private scanning = false;
  private totalUploaded = 0;

  constructor(config: ProfileWatcherConfig = {}) {
    this.config = config;
    this.uploader = new ProfileSessionUploader(config.uploaderConfig || {});
  }

  /** Start the polling watcher */
  start(): void {
    if (this.timer) return;
    const interval = this.config.interval ?? 5000;
    this.timer = setInterval(() => this.poll(), interval);
    // Run immediately on start
    this.poll();
  }

  /** Stop the polling watcher */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Whether the watcher is currently running */
  isRunning(): boolean {
    return this.timer !== null;
  }

  /** Single poll cycle — scan all dirs and upload new profiles */
  private async poll(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;

    try {
      const dirs = this.resolveDirs();
      for (const dir of dirs) {
        await this.scanDir(dir);
      }
    } catch (err) {
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.scanning = false;
    }
  }

  /** Resolve the list of directories to scan */
  private resolveDirs(): string[] {
    const dirs = (this.config.watchDirs || ['./profiles']).map((d) => resolve(d));
    if (this.config.scanRoot) {
      const root = resolve('.');
      if (!dirs.includes(root)) dirs.push(root);
    }
    return dirs;
  }

  /**
   * Scan a single directory for new profile files, upload them, and update the manifest.
   * Delegates to scanAndUpload() which handles dedup, upload, and manifest atomically.
   */
  private async scanDir(dir: string): Promise<void> {
    try {
      const entries: ProfileEntry[] = await this.uploader.scanAndUpload(dir);

      if (entries.length > 0) {
        this.totalUploaded += entries.length;

        if (this.config.deleteAfterUpload) {
          for (const entry of entries) {
            try {
              await unlink(entry.localPath);
            } catch {
              // File may already be gone — not an error
            }
          }
        }

        this.config.onUpload?.(entries.length, dir);
      }
    } catch (err) {
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Get count of files uploaded across all poll cycles */
  getUploadedCount(): number {
    return this.totalUploaded;
  }
}
