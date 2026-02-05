#!/usr/bin/env bun

// [TIMEOUT][SAFE][SPAWN][SAFE-001][v1.3][ACTIVE]

// [UTILITIES][TOOLS][UT-TO-8B9][v1.3.0][ACTIVE]

// Safe spawn utilities with timeout and maxBuffer protection
// Prevents hangs and crashes from runaway processes

export interface SafeSpawnOptions extends Bun.SpawnOptions.OptionsObject {
  timeout?: number; // Default 30s
  maxBuffer?: number; // Default 10MB
  retries?: number; // Default 0
}

export async function safeSpawn(command: string[], options: SafeSpawnOptions = {}) {
  const {
    timeout = 30000, // 30 seconds
    maxBuffer = 10 * 1024 * 1024, // 10MB
    retries = 0,
    ...spawnOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry ${attempt}/${retries} for: ${command.join(' ')}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }

      const proc = Bun.spawn(command, {
        ...spawnOptions,
        timeout,
        maxBuffer
      });

      const output = await proc.exited;

      if (output !== 0) {
        throw new Error(`Command failed with exit code ${output}`);
      }

      return proc;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Spawn attempt ${attempt + 1} failed: ${error.message}`);

      if (attempt === retries) {
        throw new Error(`Safe spawn failed after ${retries + 1} attempts: ${lastError.message}`);
      }
    }
  }
}

export async function safeSpawnSync(command: string[], options: SafeSpawnOptions = {}) {
  const {
    timeout = 30000,
    maxBuffer = 10 * 1024 * 1024,
    retries = 0,
    ...spawnOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry ${attempt}/${retries} for: ${command.join(' ')}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      return Bun.spawnSync(command, {
        ...spawnOptions,
        timeout,
        maxBuffer
      });
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ SpawnSync attempt ${attempt + 1} failed: ${error.message}`);

      if (attempt === retries) {
        throw new Error(`Safe spawnSync failed after ${retries + 1} attempts: ${lastError.message}`);
      }
    }
  }
}

// CLI usage example
if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log('Usage: safe-spawn <command> [args...]');
    console.log('Example: safe-spawn bun datapipe:fetch');
    process.exit(1);
  }

  safeSpawn([cmd, ...args], { timeout: 10000 })
    .then(() => console.log('✅ Command completed successfully'))
    .catch(error => {
      console.error(`❌ Command failed: ${error.message}`);
      process.exit(1);
    });
}
