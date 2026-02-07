// lib/core/r2-session-manager.ts — R2 Session management with error handling

import {
  recordError,
  createSystemError,
  createNetworkError,
  EnterpriseErrorCode,
  safeAsync,
  safeAsyncWithRetry,
  withCircuitBreaker,
  CircuitBreaker,
  ErrorMetricsCollector,
  getErrorMetricsCollector,
} from './index';

/**
 * Session member information
 */
export interface SessionMember {
  id: string;
  name?: string;
  role?: string;
}

/**
 * Spawn profile returned from terminal
 */
export interface SpawnProfile {
  sessionId: string;
  terminalId: string;
  pid: number;
  status: 'running' | 'exited' | 'error';
  startTime: number;
  metadata?: Record<string, any>;
}

/**
 * Upload result from R2
 */
export interface UploadResult {
  success: boolean;
  key: string;
  etag?: string;
  size: number;
  timestamp: number;
}

/**
 * Session spawn configuration
 */
export interface SessionSpawnConfig {
  /** Command to run */
  command: string[];
  /** Markdown file path */
  mdFile: string;
  /** Session ID */
  sessionId: string;
  /** Member information */
  member: SessionMember;
  /** Retry configuration */
  retry?: {
    maxRetries: number;
    delayMs: number;
  };
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Circuit breaker configuration */
  circuitBreaker?: {
    enabled: boolean;
    failureThreshold?: number;
    resetTimeoutMs?: number;
  };
}

/**
 * Session spawn result
 */
export interface SessionSpawnResult {
  success: boolean;
  spawnProfile?: SpawnProfile;
  uploadResult?: UploadResult;
  error?: Error;
  durationMs: number;
  attempts: number;
}

/**
 * R2 Session Manager
 * 
 * Manages spawning R2 sessions with comprehensive error handling,
 * retry logic, circuit breaker protection, and metrics collection.
 * 
 * @example
 * ```typescript
 * const manager = new R2SessionManager();
 * 
 * const result = await manager.spawnSession({
 *   command: ['bun', 'junior-runner', 'session.md'],
 *   mdFile: 'session.md',
 *   sessionId: 'sess-123',
 *   member: { id: 'user-456', name: 'John' },
 * });
 * 
 * if (result.success) {
 *   console.log('Session spawned:', result.spawnProfile);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export class R2SessionManager {
  private circuitBreaker: CircuitBreaker;
  private metrics: ErrorMetricsCollector;

  constructor(
    private config: {
      /** Default timeout for operations */
      defaultTimeoutMs?: number;
      /** Default retry configuration */
      defaultRetry?: { maxRetries: number; delayMs: number };
      /** Service name for metrics */
      serviceName?: string;
    } = {}
  ) {
    this.config = {
      defaultTimeoutMs: 30000,
      defaultRetry: { maxRetries: 3, delayMs: 1000 },
      serviceName: 'r2-session-manager',
      ...config,
    };

    // Initialize circuit breaker for R2 operations
    this.circuitBreaker = new CircuitBreaker('r2-session-spawn', {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      successThreshold: 2,
      callTimeoutMs: this.config.defaultTimeoutMs,
    });

    // Initialize metrics collector
    this.metrics = getErrorMetricsCollector();
  }

  /**
   * Spawn an R2 session with full error handling
   */
  async spawnSession(config: SessionSpawnConfig): Promise<SessionSpawnResult> {
    const startTime = performance.now();
    let attempts = 0;

    try {
      // Step 1: Spawn terminal
      attempts++;
      const spawnProfile = await this.spawnTerminalWithRetry(config);

      if (!spawnProfile) {
        throw createSystemError(
          EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED,
          'Failed to spawn R2 terminal session',
          {
            command: config.command,
            mdFile: config.mdFile,
            sessionId: config.sessionId,
            attempts,
          }
        );
      }

      // Step 2: Upload session profile
      attempts++;
      const uploadResult = await this.uploadSessionProfileWithRetry(
        config,
        spawnProfile
      );

      if (!uploadResult) {
        // Record error but don't fail - spawn succeeded
        recordError(
          new Error('Failed to upload session profile to R2'),
          {
            service: this.config.serviceName,
            operation: 'upload_session_profile',
            sessionId: config.sessionId,
            memberId: config.member.id,
            spawnProfile,
          }
        );
      }

      const durationMs = performance.now() - startTime;

      return {
        success: true,
        spawnProfile,
        uploadResult: uploadResult || undefined,
        durationMs,
        attempts,
      };
    } catch (error) {
      const durationMs = performance.now() - startTime;

      // Record the error
      recordError(error instanceof Error ? error : new Error(String(error)), {
        service: this.config.serviceName,
        operation: 'spawn_session',
        sessionId: config.sessionId,
        memberId: config.member.id,
        attempts,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        durationMs,
        attempts,
      };
    }
  }

  /**
   * Spawn terminal with retry logic
   */
  private async spawnTerminalWithRetry(
    config: SessionSpawnConfig
  ): Promise<SpawnProfile | null> {
    const useCircuitBreaker = config.circuitBreaker?.enabled ?? true;

    const spawnFn = async (): Promise<SpawnProfile | null> => {
      return safeAsync(
        async () => {
          // Simulate spawnTerminal call
          // In real implementation: return await spawnTerminal(config.command);
          const profile: SpawnProfile = {
            sessionId: config.sessionId,
            terminalId: `term-${Date.now()}`,
            pid: Math.floor(Math.random() * 10000) + 1000,
            status: 'running',
            startTime: Date.now(),
            metadata: {
              command: config.command,
              mdFile: config.mdFile,
            },
          };
          return profile;
        },
        'Spawning R2 terminal',
        null
      );
    };

    if (useCircuitBreaker) {
      return this.circuitBreaker.execute(spawnFn);
    }

    // Use retry without circuit breaker
    return safeAsyncWithRetry(
      spawnFn,
      'Spawning R2 terminal (with retry)',
      config.retry?.maxRetries ?? this.config.defaultRetry!.maxRetries,
      config.retry?.delayMs ?? this.config.defaultRetry!.delayMs,
      null
    );
  }

  /**
   * Upload session profile with retry logic
   */
  private async uploadSessionProfileWithRetry(
    config: SessionSpawnConfig,
    spawnProfile: SpawnProfile
  ): Promise<UploadResult | null> {
    return safeAsyncWithRetry(
      async () => {
        // Simulate uploadSessionProfile call
        // In real implementation:
        // return await uploadSessionProfile(
        //   config.sessionId,
        //   'spawn_terminal',
        //   spawnProfile,
        //   config.member
        // );

        const result: UploadResult = {
          success: true,
          key: `sessions/${config.sessionId}/spawn_terminal.json`,
          etag: `"${Math.random().toString(36).substring(2)}"`,
          size: JSON.stringify(spawnProfile).length,
          timestamp: Date.now(),
        };
        return result;
      },
      'Uploading session profile to R2',
      config.retry?.maxRetries ?? this.config.defaultRetry!.maxRetries,
      config.retry?.delayMs ?? this.config.defaultRetry!.delayMs,
      null
    );
  }

  /**
   * Quick spawn method for simple use cases
   * 
   * @example
   * ```typescript
   * // Original code:
   * const spawnProfile = await spawnTerminal(['bun', 'junior-runner', mdFile]);
   * await uploadSessionProfile(sessionId, 'spawn_terminal', spawnProfile, member);
   * 
   * // With error handling:
   * const result = await R2SessionManager.quickSpawn(
   *   ['bun', 'junior-runner', mdFile],
   *   mdFile,
   *   sessionId,
   *   member
   * );
   * ```
   */
  static async quickSpawn(
    command: string[],
    mdFile: string,
    sessionId: string,
    member: SessionMember
  ): Promise<SessionSpawnResult> {
    const manager = new R2SessionManager();
    return manager.spawnSession({
      command,
      mdFile,
      sessionId,
      member,
    });
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Get metrics stats
   */
  getMetricsStats() {
    return this.metrics.getStats();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.circuitBreaker.destroy();
  }
}

/**
 * Convenience function for one-off session spawning
 * 
 * @example
 * ```typescript
 * const result = await spawnR2Session({
 *   command: ['bun', 'junior-runner', 'doc.md'],
 *   mdFile: 'doc.md',
 *   sessionId: 'sess-123',
 *   member: { id: 'user-456' },
 * });
 * 
 * if (result.success) {
 *   console.log('Spawned:', result.spawnProfile);
 * }
 * ```
 */
export async function spawnR2Session(
  config: SessionSpawnConfig
): Promise<SessionSpawnResult> {
  const manager = new R2SessionManager();
  try {
    return await manager.spawnSession(config);
  } finally {
    manager.destroy();
  }
}

// Entry guard for testing
if (import.meta.main) {
  console.log('🔧 R2 Session Manager Demo\n');

  const manager = new R2SessionManager({
    serviceName: 'demo-service',
  });

  console.log('Spawning session with error handling...\n');

  const result = await manager.spawnSession({
    command: ['bun', 'junior-runner', 'test.md'],
    mdFile: 'test.md',
    sessionId: `demo-${Date.now()}`,
    member: { id: 'demo-user', name: 'Demo User' },
    circuitBreaker: { enabled: true },
  });

  console.log('Result:', {
    success: result.success,
    durationMs: result.durationMs.toFixed(2),
    attempts: result.attempts,
    hasProfile: !!result.spawnProfile,
    hasUpload: !!result.uploadResult,
  });

  if (result.success && result.spawnProfile) {
    console.log('\nSpawn Profile:');
    console.log(`  Session ID: ${result.spawnProfile.sessionId}`);
    console.log(`  Terminal ID: ${result.spawnProfile.terminalId}`);
    console.log(`  PID: ${result.spawnProfile.pid}`);
    console.log(`  Status: ${result.spawnProfile.status}`);
  }

  console.log('\nCircuit Breaker Stats:', manager.getCircuitBreakerStats());
  console.log('Metrics Stats:', manager.getMetricsStats());

  manager.destroy();
  console.log('\n✅ Demo complete!');
}
