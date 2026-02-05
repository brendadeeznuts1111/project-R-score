/**
 * Rotation grid cache and management
 * 
 * Maintains in-memory cache of games for fast grid generation
 */

import type { Game } from "../types/game.js";
import { extractRotationNumber } from "./heatmap.js";

/**
 * Rotation cache entry
 */
interface RotationCacheEntry {
  game: Game;
  rotationNumber: number;
  lastUpdated: number;
}

/**
 * Rotation cache for fast grid lookups
 */
class RotationCache {
  private cache: Map<string, RotationCacheEntry> = new Map();
  private maxSize: number = 10000;

  /**
   * Add or update game in cache
   */
  set(game: Game): void {
    const rotationNumber = extractRotationNumber(game.id);
    
    // Evict oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].lastUpdated - b[1].lastUpdated
      )[0];
      this.cache.delete(oldest[0]);
    }
    
    this.cache.set(game.id, {
      game,
      rotationNumber,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Get game by ID
   */
  get(gameId: string): Game | undefined {
    return this.cache.get(gameId)?.game;
  }

  /**
   * Get all games sorted by rotation
   */
  getAllSorted(): Array<{ game: Game; rotationNumber: number }> {
    return Array.from(this.cache.values())
      .sort((a, b) => {
        // Sort by league, date, then rotation number
        const aLeague = a.game.id.split("-")[0];
        const bLeague = b.game.id.split("-")[0];
        if (aLeague !== bLeague) return aLeague.localeCompare(bLeague);
        
        const aDate = a.game.id.match(/-(\d{8})-/)?.[1] || "";
        const bDate = b.game.id.match(/-(\d{8})-/)?.[1] || "";
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        
        return a.rotationNumber - b.rotationNumber;
      })
      .map((entry) => ({
        game: entry.game,
        rotationNumber: entry.rotationNumber,
      }));
  }

  /**
   * Get rotation count
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get entries iterator
   */
  entries(): IterableIterator<[string, RotationCacheEntry]> {
    return this.cache.entries();
  }
}

/**
 * Global rotation cache instance
 */
export const rotationCache = new RotationCache();

