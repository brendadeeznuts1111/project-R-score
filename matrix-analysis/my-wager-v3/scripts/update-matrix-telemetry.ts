#!/usr/bin/env bun
// scripts/update-matrix-telemetry.ts
// Extend Tier-1380 Matrix with Patch & Env Telemetry (Cols 94-100)

import { Database } from 'bun:sqlite';
import { hash } from 'bun';
import { readdir } from 'fs/promises';

interface MatrixUpdate {
  col_94_redis_patch?: string;
  col_95_public_env?: boolean;
  col_96_bundle_crc32?: string;
  col_97_lockfile_clean?: boolean;
  col_98_patch_time?: number;
  col_99_env_count?: number;
  col_100_leak_check?: boolean;
}

class MatrixTelemetry {
  private db: Database;

  constructor(dbPath: string = 'tier1380.db') {
    this.db = new Database(dbPath);
    this.ensureColumns();
  }

  private ensureColumns() {
    // ALTER TABLE throws if column already exists — expected and safe to ignore
    const columns = [
      "col_94_redis_patch TEXT",
      "col_95_public_env BOOLEAN",
      "col_96_bundle_crc32 TEXT",
      "col_97_lockfile_clean BOOLEAN",
      "col_98_patch_time REAL",
      "col_99_env_count INTEGER",
      "col_100_leak_check BOOLEAN",
    ];
    for (const col of columns) {
      try { this.db.run(`ALTER TABLE tier1380_matrix ADD COLUMN ${col}`); } catch { /* column exists */ }
    }
  }

  async calculatePatchChecksum(patchFile: string): Promise<string> {
    const file = Bun.file(patchFile);
    const buffer = await file.arrayBuffer();
    return hash.crc32(new Uint8Array(buffer)).toString(16);
  }

  async calculateBundleChecksum(bundleDir: string): Promise<string> {
    const files = await readdir(bundleDir);
    let combinedChecksum = '';

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        const filePath = `${bundleDir}/${file}`;
        const fileBuffer = await Bun.file(filePath).arrayBuffer();
        const fileChecksum = hash.crc32(new Uint8Array(fileBuffer)).toString(16);
        combinedChecksum += fileChecksum;
      }
    }

    return hash.crc32(combinedChecksum).toString(16);
  }

  async checkLockfileClean(): Promise<boolean> {
    try {
      const { stdout } = await Bun.spawn(["git", "status", "--porcelain", "bun.lockb"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const status = await new Response(stdout).text();
      return !status.trim();
    } catch {
      return false;
    }
  }

  async countPublicEnvVars(): Promise<number> {
    return Object.keys(process.env).filter(key => key.startsWith('PUBLIC_')).length;
  }

  async checkSecretLeaks(bundleDir: string): Promise<boolean> {
    const files = await readdir(bundleDir);
    const secretPatterns = [
      /sk_live_[a-zA-Z0-9]{24,}/,
      /sk-ant-[a-zA-Z0-9]{20,}/,
      /CF_API_TOKEN/,
      /BUN_ENCRYPTION_KEY/,
      /JWT_SECRET/,
    ];

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        const content = await Bun.file(`${bundleDir}/${file}`).text();

        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            console.log(`Secret leak detected in ${file}: ${pattern.source}`);
            return true;
          }
        }
      }
    }

    return false;
  }

  async updateMatrix(update: Partial<MatrixUpdate>) {
    const stmt = this.db.prepare(`
      INSERT INTO tier1380_matrix (
        col_94_redis_patch,
        col_95_public_env,
        col_96_bundle_crc32,
        col_97_lockfile_clean,
        col_98_patch_time,
        col_99_env_count,
        col_100_leak_check
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      update.col_94_redis_patch || null,
      update.col_95_public_env || false,
      update.col_96_bundle_crc32 || null,
      update.col_97_lockfile_clean || false,
      update.col_98_patch_time || null,
      update.col_99_env_count || null,
      update.col_100_leak_check || false
    );

    console.log('✅ Matrix telemetry updated');
  }

  async fullTelemetryUpdate() {
    console.log('📊 Collecting Tier-1380 telemetry...');

    const startTime = Date.now();

    // 1. Redis patch checksum
    const redisChecksum = await this.calculatePatchChecksum('patches/redis-hll-volume.patch');

    // 2. Bundle checksum
    const bundleChecksum = await this.calculateBundleChecksum('dist/dashboard');

    // 3. Lockfile status
    const lockfileClean = await this.checkLockfileClean();

    // 4. Public env count
    const publicEnvCount = await this.countPublicEnvVars();

    // 5. Secret leak check
    const hasLeaks = await this.checkSecretLeaks('dist/dashboard');

    // 6. Patch time
    const patchTime = (Date.now() - startTime) / 1000;

    // Update matrix
    await this.updateMatrix({
      col_94_redis_patch: redisChecksum,
      col_95_public_env: publicEnvCount > 0,
      col_96_bundle_crc32: bundleChecksum,
      col_97_lockfile_clean: lockfileClean,
      col_98_patch_time: patchTime,
      col_99_env_count: publicEnvCount,
      col_100_leak_check: hasLeaks,
    });

    // Report
    console.log('\n📊 Tier-1380 Telemetry Report:');
    console.log('================================');
    console.log(`Col 94 - Redis Patch: ${redisChecksum}`);
    console.log(`Col 95 - Public Env: ${publicEnvCount > 0 ? '✅' : '❌'} (${publicEnvCount} vars)`);
    console.log(`Col 96 - Bundle CRC32: ${bundleChecksum}`);
    console.log(`Col 97 - Lockfile Clean: ${lockfileClean ? '✅' : '❌'}`);
    console.log(`Col 98 - Patch Time: ${patchTime.toFixed(2)}s`);
    console.log(`Col 99 - Env Count: ${publicEnvCount}`);
    console.log(`Col 100 - Leak Check: ${hasLeaks ? '❌ LEAK' : '✅ CLEAN'}`);

    return {
      redisChecksum,
      bundleChecksum,
      lockfileClean,
      publicEnvCount,
      hasLeaks,
      patchTime,
    };
  }

  getLatestTelemetry() {
    const stmt = this.db.prepare(`
      SELECT * FROM tier1380_matrix
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    return stmt.get() as any;
  }
}

// CLI interface
if (import.meta.main) {
  const telemetry = new MatrixTelemetry();
  const command = process.argv[2];

  switch (command) {
    case 'update':
      telemetry.fullTelemetryUpdate();
      break;

    case 'latest':
      console.log(telemetry.getLatestTelemetry());
      break;

    default:
      console.log('Usage: bun scripts/update-matrix-telemetry.ts [update|latest]');
  }
}

export { MatrixTelemetry };
