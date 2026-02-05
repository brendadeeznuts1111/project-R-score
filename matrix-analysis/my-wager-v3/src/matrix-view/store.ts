// BunMatrixStore — CRUD operations for matrix entries

import type { BunDocEntry, MatrixMetrics } from "./types";
import { calculateMetrics } from "./analytics";
import { updateFromRSS } from "./rss";
import { CACHE_TTL_5MIN_MS } from "../tension-field/constants";

export class BunMatrixStore {
  private entries = new Map<string, BunDocEntry>();
  private rssCache = new Map<string, { lastFetch: Date; entries: number }>();
  metricsCache = new Map<string, { timestamp: number; data: MatrixMetrics }>();

  set(entry: BunDocEntry): void {
    entry.lastUpdated = new Date();
    this.entries.set(entry.term, entry);
  }

  get(term: string): BunDocEntry | undefined {
    return this.entries.get(term);
  }

  getAll(): BunDocEntry[] {
    return Array.from(this.entries.values());
  }

  filterByPlatform(platform: "darwin" | "linux" | "win32"): BunDocEntry[] {
    return this.getAll().filter(entry =>
      entry.platforms.includes(platform)
    );
  }

  filterByStability(stability: "experimental" | "stable" | "deprecated"): BunDocEntry[] {
    return this.getAll().filter(entry => entry.stability === stability);
  }

  isCompatible(term: string, bunVersion: string): boolean {
    const entry = this.get(term);
    if (!entry) return false;

    const [minMajor, minMinor, minPatch] = entry.bunMinVersion.split(".").map(Number);
    const [major, minor, patch] = bunVersion.split(".").map(Number);

    if (major > minMajor) return true;
    if (major < minMajor) return false;
    if (minor > minMinor) return true;
    if (minor < minMinor) return false;
    return patch >= minPatch;
  }

  getBreakingChanges(version: string): BunDocEntry[] {
    const [major, minor, patch] = version.split(".").map(Number);

    return this.getAll().filter(entry =>
      entry.breakingChanges?.some(b =>
        b.major <= major && b.minor <= minor && b.patch <= patch
      ) ?? false
    );
  }

  calculateMetrics(): MatrixMetrics {
    const cacheKey = "metrics";
    const cached = this.metricsCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_5MIN_MS) {
      return cached.data;
    }

    const entries = this.getAll();
    const metrics = calculateMetrics(entries);

    this.metricsCache.set(cacheKey, { timestamp: Date.now(), data: metrics });
    return metrics;
  }

  getRssCache(): Map<string, { lastFetch: Date; entries: number }> {
    return this.rssCache;
  }

  async updateFromRSS(feedUrl: string): Promise<void> {
    return updateFromRSS(this, feedUrl);
  }
}
