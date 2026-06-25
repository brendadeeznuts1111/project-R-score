// integration/spawn-integration.ts
import { performance } from "perf_hooks";
import { Tier1380SpawnManager } from "../spawn/quantum-spawn";
import { Tier1380HashSystem } from "../hashing/quantum-crc32";

// Types

interface SecureExecuteOptions {
  expectedCRC32?: number;
  env?: Record<string, string>;
}

interface SecureExecuteResult {
  stdout?: string;
  stderr?: string;
  exitCode: number;
  integrity: {
    crc32: number;
    verificationTime: number;
  };
  performance: {
    totalTime: number;
    integrityTime: number;
    spawnTime: number;
  };
}

interface BatchProcessOptions {
  concurrency?: number;
}

interface BatchProcessResult {
  results: SecureExecuteResult[];
  performance: {
    totalTime: number;
    verificationTime: number;
    writeTime: number;
    executeTime: number;
    cleanupTime: number;
    artifactsPerSecond: number;
  };
  integrity: {
    verified: number;
  };
}

class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrityError";
  }
}

export class Tier1380SpawnIntegration {
  // Execute a command against a verified artifact
  static async executeSecure(
    command: string[],
    artifact: Buffer,
    options: SecureExecuteOptions = {}
  ): Promise<SecureExecuteResult> {
    const startTime = performance.now();

    // Verify artifact integrity with CRC32
    const integrityStart = performance.now();
    const crc32Hash = Tier1380HashSystem.crc32(artifact);
    const integrityTime = performance.now() - integrityStart;

    if (options.expectedCRC32 !== undefined && options.expectedCRC32 !== crc32Hash) {
      throw new IntegrityError(
        `Artifact CRC32 mismatch: expected ${options.expectedCRC32}, got ${crc32Hash}`
      );
    }

    // Write artifact to temp file
    const tempPath = `/tmp/artifact-${Date.now()}-${crypto.randomUUID()}`;
    await Bun.write(tempPath, artifact);

    // Execute with spawn manager
    const spawnStart = performance.now();
    const result = Tier1380SpawnManager.spawnSync([...command, tempPath], {
      env: {
        ...options.env,
        ARTIFACT_CRC32: crc32Hash.toString(),
      },
    });
    const spawnTime = performance.now() - spawnStart;

    // Clean up temp file
    await Bun.file(tempPath).delete().catch(() => null);

    const totalTime = performance.now() - startTime;

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      integrity: {
        crc32: crc32Hash,
        verificationTime: integrityTime,
      },
      performance: {
        totalTime,
        integrityTime,
        spawnTime,
      },
    };
  }

  // Batch process multiple artifacts with CRC32 pre-verification
  static async processArtifacts(
    artifacts: Array<{
      command: string[];
      artifact: Buffer;
      expectedCRC32?: number;
    }>,
    options: BatchProcessOptions = {}
  ): Promise<BatchProcessResult> {
    const startTime = performance.now();

    // Pre-verify all artifacts
    const verificationStart = performance.now();
    const verified = artifacts.map(({ command, artifact, expectedCRC32 }) => {
      const crc32 = Tier1380HashSystem.crc32(artifact);
      if (expectedCRC32 !== undefined && expectedCRC32 !== crc32) {
        throw new IntegrityError(`Artifact CRC32 mismatch: expected ${expectedCRC32}, got ${crc32}`);
      }
      const tempPath = `/tmp/artifact-${Date.now()}-${crypto.randomUUID()}`;
      return { command, artifact, crc32, tempPath };
    });
    const verificationTime = performance.now() - verificationStart;

    // Write artifacts to temp files
    const writeStart = performance.now();
    await Promise.all(
      verified.map(({ artifact, tempPath }) => Bun.write(tempPath, artifact))
    );
    const writeTime = performance.now() - writeStart;

    // Execute commands
    const executeStart = performance.now();
    const spawnCommands = verified.map(({ command, tempPath, crc32 }) => ({
      command: [...command, tempPath],
      options: {
        env: { ARTIFACT_CRC32: crc32.toString() },
      },
    }));
    const batchResult = Tier1380SpawnManager.spawnSyncBatch(spawnCommands, {
      concurrency: options.concurrency || 10,
    });
    const executeTime = performance.now() - executeStart;

    // Clean up temp files
    const cleanupStart = performance.now();
    await Promise.all(
      verified.map(({ tempPath }) =>
        Bun.file(tempPath).delete().catch(() => null)
      )
    );
    const cleanupTime = performance.now() - cleanupStart;

    const totalTime = performance.now() - startTime;

    const results: SecureExecuteResult[] = batchResult.results.map((r, i) => ({
      stdout: r.stdout,
      stderr: r.stderr,
      exitCode: r.exitCode,
      integrity: {
        crc32: verified[i].crc32,
        verificationTime,
      },
      performance: {
        totalTime: 0,
        integrityTime: verificationTime,
        spawnTime: r.performance?.executionTime ?? 0,
      },
    }));

    return {
      results,
      performance: {
        totalTime,
        verificationTime,
        writeTime,
        executeTime,
        cleanupTime,
        artifactsPerSecond: artifacts.length / (totalTime / 1000),
      },
      integrity: {
        verified: verified.length,
      },
    };
  }
}

export { IntegrityError };
