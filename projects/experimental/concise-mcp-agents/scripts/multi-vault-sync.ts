#!/usr/bin/env bun

// [MULTI-VAULT][SYNC][SYNCHRONIZATION][MV-SYNC-001][v1.3][ACTIVE]

// [UTILITIES][TOOLS][UT-TO-EAB][v1.3.0][ACTIVE]

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { YAML } from "bun";

interface VaultConfig {
  path: string;
  name: string;
  priority: number; // Higher priority vaults win conflicts
  lastSync?: string;
  enabled: boolean;
}

interface SyncResult {
  vault: string;
  status: 'success' | 'conflict' | 'error' | 'no_change';
  changes: number;
  error?: string;
  conflicts?: Conflict[];
}

interface Conflict {
  field: string;
  localValue: any;
  remoteValue: any;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
}

interface SyncStats {
  totalVaults: number;
  syncedVaults: number;
  totalChanges: number;
  conflictsResolved: number;
  errors: number;
  duration: number;
}

class MultiVaultSync {
  private vaults: VaultConfig[] = [];
  private dataFile = 'data/bets.yaml';
  private configFile = '.vault-sync.json';

  constructor() {
    this.loadVaultConfig();
  }

  private loadVaultConfig(): void {
    // Default vaults from environment and common locations
    const defaultVaults = [
      { path: process.env.OBSIDIAN_VAULT || process.cwd(), name: 'Primary', priority: 10, enabled: true },
      { path: join(process.env.HOME || '', 'Documents', 'Obsidian Vault'), name: 'Documents', priority: 5, enabled: true },
      { path: join(process.env.HOME || '', 'Obsidian'), name: 'Home', priority: 3, enabled: true },
      { path: '/Volumes/External/Obsidian', name: 'External', priority: 1, enabled: false },
    ];

    // Load custom config if exists
    if (existsSync(this.configFile)) {
      try {
        const config = JSON.parse(readFileSync(this.configFile, 'utf-8'));
        this.vaults = config.vaults || defaultVaults;
      } catch (error) {
        console.warn(`⚠️  Failed to load vault config: ${error}`);
        this.vaults = defaultVaults;
      }
    } else {
      this.vaults = defaultVaults;
    }

    // Filter to only enabled vaults that exist
    this.vaults = this.vaults.filter(vault => vault.enabled && existsSync(vault.path));
  }

  private saveVaultConfig(): void {
    const config = { vaults: this.vaults, lastSync: new Date().toISOString() };
    Bun.write(this.configFile, JSON.stringify(config, null, 2));
  }

  async discoverVaults(): Promise<void> {
    console.info('🔍 Discovering Obsidian vaults...');

    const searchPaths = [
      process.env.HOME || '',
      '/Volumes',
      '/Users',
    ];

    const foundVaults: VaultConfig[] = [];

    for (const searchPath of searchPaths) {
      if (!existsSync(searchPath)) continue;

      try {
        const items = readdirSync(searchPath, { withFileTypes: true });

        for (const item of items) {
          if (item.isDirectory()) {
            const vaultPath = join(searchPath, item.name);

            // Check if it's an Obsidian vault (has .obsidian folder)
            if (existsSync(join(vaultPath, '.obsidian'))) {
              const existing = this.vaults.find(v => v.path === vaultPath);
              if (!existing) {
                foundVaults.push({
                  path: vaultPath,
                  name: item.name,
                  priority: 1,
                  enabled: false // Require manual enable
                });
              }
            }
          }
        }
      } catch (error) {
        // Skip inaccessible directories
        continue;
      }
    }

    if (foundVaults.length > 0) {
      console.info(`📁 Found ${foundVaults.length} new vaults:`);
      foundVaults.forEach(vault => {
        console.info(`   • ${vault.name}: ${vault.path}`);
      });

      // Add to config
      this.vaults.push(...foundVaults);
      this.saveVaultConfig();
      console.info(`💾 Added to ${this.configFile} (set enabled: true to activate)`);
    } else {
      console.info('✅ No new vaults found');
    }
  }

  async syncAll(): Promise<SyncStats> {
    const startTime = Date.now();
    console.info(`🔄 Starting multi-vault sync across ${this.vaults.length} vaults...`);

    const results: SyncResult[] = [];
    let totalChanges = 0;
    let conflictsResolved = 0;
    let errors = 0;

    // Get primary vault (highest priority)
    const primaryVault = this.vaults.reduce((prev, current) =>
      (current.priority > prev.priority) ? current : prev
    );

    console.info(`🎯 Primary vault: ${primaryVault.name} (${primaryVault.path})`);

    // Sync each vault
    for (const vault of this.vaults) {
      if (vault.path === primaryVault.path) continue; // Skip primary

      try {
        const result = await this.syncVault(primaryVault, vault);
        results.push(result);

        if (result.status === 'success') {
          totalChanges += result.changes;
          conflictsResolved += result.conflicts?.length || 0;
        } else if (result.status === 'error') {
          errors++;
        }

        console.info(`   ${this.getStatusIcon(result.status)} ${vault.name}: ${result.changes} changes`);
        if (result.conflicts && result.conflicts.length > 0) {
          console.info(`      ⚠️  ${result.conflicts.length} conflicts resolved`);
        }

      } catch (error) {
        results.push({
          vault: vault.name,
          status: 'error',
          changes: 0,
          error: error.message
        });
        errors++;
        console.info(`   ❌ ${vault.name}: Error - ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const stats: SyncStats = {
      totalVaults: this.vaults.length,
      syncedVaults: results.filter(r => r.status === 'success').length,
      totalChanges,
      conflictsResolved,
      errors,
      duration
    };

    this.saveVaultConfig();
    console.info(`\n📊 Sync Complete:`);
    console.info(`   • ${stats.syncedVaults}/${stats.totalVaults} vaults synced`);
    console.info(`   • ${stats.totalChanges} total changes`);
    console.info(`   • ${stats.conflictsResolved} conflicts resolved`);
    console.info(`   • ${stats.errors} errors`);
    console.info(`   • ${(duration / 1000).toFixed(1)}s duration`);

    return stats;
  }

  private async syncVault(sourceVault: VaultConfig, targetVault: VaultConfig): Promise<SyncResult> {
    const sourceFile = join(sourceVault.path, this.dataFile);
    const targetFile = join(targetVault.path, this.dataFile);

    // Check if source file exists
    if (!existsSync(sourceFile)) {
      return {
        vault: targetVault.name,
        status: 'error',
        changes: 0,
        error: 'Source data file not found'
      };
    }

    // Read source data
    const sourceData = YAML.parse(await Bun.file(sourceFile).text()) || { bets: [] };

    // Read target data (if exists)
    let targetData = { bets: [] };
    if (existsSync(targetFile)) {
      targetData = YAML.parse(await Bun.file(targetFile).text()) || { bets: [] };
    }

    // Perform sync
    const result = this.mergeBetData(sourceData, targetData, sourceVault.priority > targetVault.priority);

    if (result.changes === 0 && result.conflicts.length === 0) {
      return {
        vault: targetVault.name,
        status: 'no_change',
        changes: 0
      };
    }

    // Write merged data to target
    const targetDir = dirname(targetFile);
    if (!existsSync(targetDir)) {
      await Bun.spawn(['mkdir', '-p', targetDir]);
    }

    await Bun.write(targetFile, YAML.stringify(result.mergedData));

    return {
      vault: targetVault.name,
      status: result.conflicts.length > 0 ? 'conflict' : 'success',
      changes: result.changes,
      conflicts: result.conflicts
    };
  }

  private mergeBetData(source: any, target: any, sourceHasPriority: boolean) {
    const sourceBets = source.bets || [];
    const targetBets = target.bets || [];

    // Create maps for quick lookup by hashId or betGroupId
    const sourceMap = new Map();
    const targetMap = new Map();

    sourceBets.forEach((bet: any) => {
      const key = bet.hashId || bet.betGroupId;
      if (key) sourceMap.set(key, bet);
    });

    targetBets.forEach((bet: any) => {
      const key = bet.hashId || bet.betGroupId;
      if (key) targetMap.set(key, bet);
    });

    const mergedBets: any[] = [];
    const conflicts: Conflict[] = [];
    let changes = 0;

    // Add all source bets
    for (const [key, sourceBet] of sourceMap) {
      const targetBet = targetMap.get(key);

      if (!targetBet) {
        // New bet from source
        mergedBets.push(sourceBet);
        changes++;
      } else {
        // Check for conflicts
        const conflict = this.detectConflicts(sourceBet, targetBet);
        if (conflict) {
          conflicts.push(conflict);
          // Resolve based on priority
          mergedBets.push(sourceHasPriority ? sourceBet : targetBet);
        } else {
          // No conflict, use newer data
          const sourceTime = new Date(sourceBet.logTime || 0).getTime();
          const targetTime = new Date(targetBet.logTime || 0).getTime();

          if (sourceTime > targetTime) {
            mergedBets.push(sourceBet);
            changes++;
          } else {
            mergedBets.push(targetBet);
          }
        }
      }
    }

    // Add target-only bets
    for (const [key, targetBet] of targetMap) {
      if (!sourceMap.has(key)) {
        mergedBets.push(targetBet);
        changes++;
      }
    }

    return {
      mergedData: {
        ...source,
        bets: mergedBets,
        metadata: {
          ...source.metadata,
          lastSync: new Date().toISOString(),
          syncConflicts: conflicts.length
        }
      },
      changes,
      conflicts
    };
  }

  private detectConflicts(bet1: any, bet2: any): Conflict | null {
    const conflictFields = ['profit', 'volume', 'result'];

    for (const field of conflictFields) {
      const val1 = bet1[field];
      const val2 = bet2[field];

      if (val1 !== val2 && val1 !== undefined && val2 !== undefined) {
        return {
          field,
          localValue: val1,
          remoteValue: val2,
          resolution: 'merge' // Default resolution
        };
      }
    }

    return null;
  }

  private getStatusIcon(status: SyncResult['status']): string {
    switch (status) {
      case 'success': return '✅';
      case 'conflict': return '⚠️ ';
      case 'error': return '❌';
      case 'no_change': return '➡️ ';
      default: return '❓';
    }
  }

  async showStatus(): Promise<void> {
    console.info('📊 Multi-Vault Sync Status\n');

    for (const vault of this.vaults) {
      const dataFile = join(vault.path, this.dataFile);
      const exists = existsSync(dataFile);

      console.info(`${vault.enabled ? '✅' : '❌'} ${vault.name} (Priority: ${vault.priority})`);
      console.info(`   Path: ${vault.path}`);

      if (exists) {
        try {
          const data = YAML.parse(await Bun.file(dataFile).text()) || { bets: [] };
          const betCount = data.bets?.length || 0;
          const lastSync = data.metadata?.lastSync;

          console.info(`   Bets: ${betCount}`);
          console.info(`   Last Sync: ${lastSync || 'Never'}`);
        } catch (error) {
          console.info(`   Status: Error reading data`);
        }
      } else {
        console.info(`   Status: No ${this.dataFile} found`);
      }
      console.info('');
    }

    console.info(`🔧 Config: ${this.configFile}`);
    console.info(`💡 Use 'discover' to find more vaults`);
  }
}

// CLI Interface
const cmd = process.argv[2];

const sync = new MultiVaultSync();

try {
  switch (cmd) {
    case 'sync':
      await sync.syncAll();
      break;

    case 'discover':
      await sync.discoverVaults();
      break;

    case 'status':
      await sync.showStatus();
      break;

    default:
      console.info(`🔄 Multi-Vault Sync v1.3

USAGE:
  bun vault:sync                    # Sync all enabled vaults
  bun vault:discover               # Discover new vaults
  bun vault:status                 # Show vault sync status

CONFIG:
  • Edit .vault-sync.json to configure vaults
  • Set "enabled": true to activate vaults
  • Higher "priority" vaults win conflicts

FEATURES:
  • Bidirectional data synchronization
  • Conflict resolution by priority
  • Automatic vault discovery
  • YAML data format support
  • Sync status tracking

EXAMPLE CONFIG:
{
  "vaults": [
    {
      "path": "/path/to/vault",
      "name": "My Vault",
      "priority": 10,
      "enabled": true
    }
  ]
}
`);
  }
} catch (error) {
  console.error(`❌ Multi-Vault Sync error: ${error.message}`);
  process.exit(1);
}
