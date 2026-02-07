/**
 * Profile System
 *
 * Unified profiling exports:
 * - Profile engine
 * - CLI utilities
 * - R2 integration
 */

export {
  ProfileEngine,
  createProfileEngine,
  resolveR2ConfigFromEnv,
  parseProfileArgs,
  type ProfileType,
  type ProfileStatus,
  type ProfileConfig,
  type R2UploadConfig,
  type ProfileSession,
  type SamplingConfig,
  type SamplingResult,
  type PerformanceMarker,
  type ProfileReport,
} from './core/profile-engine';

// Re-export for convenience
export { ProfileEngine as default } from './core/profile-engine';

// ==================== Quick Profile Functions ====================

import { ProfileEngine, resolveR2ConfigFromEnv } from './core/profile-engine';

/**
 * Quick CPU profile
 */
export async function quickCpuProfile(
  workload: () => Promise<void>,
  options: { iterations?: number; outputDir?: string } = {}
): Promise<void> {
  const engine = new ProfileEngine({
    outputDir: options.outputDir || './profiles',
  });

  const session = engine.startSession('cpu', { source: 'quick-cpu-profile' });

  try {
    for (let i = 0; i < (options.iterations || 100); i++) {
      engine.mark(`iteration-${i}`);
      await workload();
      engine.measure(`iteration-${i}`);
    }

    engine.endSession();
    console.log(`Profile complete: ${session.id}`);
  } catch (error) {
    engine.endSession(undefined, String(error));
    throw error;
  }
}

/**
 * Quick heap profile
 */
export async function quickHeapProfile(options: { outputDir?: string } = {}): Promise<void> {
  const engine = new ProfileEngine({
    outputDir: options.outputDir || './profiles',
  });

  const session = engine.startSession('heap', { source: 'quick-heap-profile' });

  // Trigger garbage collection if available
  if (global.gc) {
    global.gc();
  }

  engine.endSession();
  console.log(`Heap profile complete: ${session.id}`);
}

/**
 * Quick sampling profile with automatic upload
 */
export async function quickSamplingProfile(
  target: string,
  options: {
    iterations?: number;
    intervalUs?: number;
    uploadR2?: boolean;
    outputDir?: string;
  } = {}
): Promise<void> {
  const r2Config = options.uploadR2 ? resolveR2ConfigFromEnv() : null;

  const engine = new ProfileEngine({
    outputDir: options.outputDir || './profiles',
    uploadToR2: !!r2Config,
    r2Config: r2Config || undefined,
  });

  const report = await engine.runSampling({
    target,
    iterations: options.iterations || 100,
    intervalUs: options.intervalUs || 100,
  });

  console.log(engine.formatReport(report));
}

// ==================== Version ====================

export const PROFILE_SYSTEM_VERSION = '2.0.0';
