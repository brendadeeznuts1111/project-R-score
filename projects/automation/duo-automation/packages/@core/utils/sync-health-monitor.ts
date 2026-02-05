/**
 * sync-health-monitor.ts
 * Logic for comparing local data mirrors against remote Cloudflare R2 counts
 * Part of the 'Sync Health' requirement for infrastructure observability
 */

import { BunR2AppleManager } from '../src/storage/r2-apple-manager';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ScopeDetector } from './scope-detector';

export interface SyncStats {
  localCount: number;
  remoteCount: number;
  drift: number;
  status: 'synced' | 'drifting' | 'critical';
  lastCheck: string;
}

export class SyncHealthMonitor {
  private static readonly LOCAL_MIRROR_BASE = './data';

  static async checkStorageSync(): Promise<SyncStats> {
    const scope = ScopeDetector.getScopeConfig().scope;
    const localDir = join(this.LOCAL_MIRROR_BASE, scope.toLowerCase());
    
    // 1. Get Local Count (Simple recursive count)
    let localCount = 0;
    try {
      localCount = await this.countFiles(localDir);
    } catch (e) {
      console.warn(`Local mirror directory not found: ${localDir}`);
    }

    // 2. Get Remote Count from R2
    // For this simulation/demo without real R2 creds, we'll mock the remote count
    // but in a real scenario, this would call r2.list()
    const remoteCount = localCount + (Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0);
    
    const drift = Math.abs(remoteCount - localCount);
    const status = drift === 0 ? 'synced' : drift < 5 ? 'drifting' : 'critical';

    return {
      localCount,
      remoteCount,
      drift,
      status,
      lastCheck: new Date().toISOString()
    };
  }

  private static async countFiles(dir: string): Promise<number> {
    let count = 0;
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await this.countFiles(join(dir, entry.name));
      } else {
        count++;
      }
    }
    
    return count;
  }
}