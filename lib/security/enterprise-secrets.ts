// lib/security/enterprise-secrets.ts — Enterprise secrets and profiler module

/**
 * Enterprise Secrets Manager
 * Uses Bun.secrets API with platform-native secure storage
 *
 * Windows: CRED_PERSIST_ENTERPRISE - per-user roaming credentials
 * macOS: Keychain (login keychain, prompts for access)
 * Linux: libsecret (GNOME Keyring, KWallet, etc.)
 */
export class EnterpriseSecretsManager {
  private readonly servicePrefix: string;

  constructor(organization: string = 'com.factorywager') {
    this.servicePrefix = organization;
  }

  /**
   * Store secret with enterprise naming convention
   * Format: { service: "com.org.service", name: "account" }
   *
   * @example
   * ```typescript
   * await secretsManager.set(
   *   "tier1380.api",
   *   "prod-token",
   *   "sk_live_..."
   * );
   * ```
   */
  async set(service: string, name: string, value: string): Promise<void> {
    const fullService = `${this.servicePrefix}.${service}`;

    await Bun.secrets.set({
      service: fullService,
      name,
      value,
    });

    console.info(`🔐 Secret stored: ${fullService}/${name}`);
  }

  /**
   * Retrieve secret
   * Returns null if not found
   */
  async get(service: string, name: string): Promise<string | null> {
    const fullService = `${this.servicePrefix}.${service}`;

    const value = await Bun.secrets.get({
      service: fullService,
      name,
    });

    return value;
  }

  /**
   * Delete secret
   */
  async delete(service: string, name: string): Promise<void> {
    const fullService = `${this.servicePrefix}.${service}`;

    await Bun.secrets.delete({
      service: fullService,
      name,
    });

    console.info(`🗑️  Secret deleted: ${fullService}/${name}`);
  }

  /**
   * Check if secret exists
   */
  async exists(service: string, name: string): Promise<boolean> {
    const value = await this.get(service, name);
    return value !== null;
  }
}

/**
 * Profiler Session Wrapper
 * Integrates with node:inspector for CPU profiling
 * Chrome DevTools compatible
 */
export class EnterpriseProfiler {
  private session: any; // Inspector Session
  private connected: boolean = false;

  /**
   * Connect to inspector
   */
  async connect(): Promise<void> {
    // @ts-expect-error - node:inspector is a Node.js built-in
    const { Session } = await import('node:inspector');
    this.session = new Session();
    this.session.connect();
    this.connected = true;
    console.info('🔍 Profiler connected');
  }

  /**
   * Enable profiler
   */
  async enable(): Promise<void> {
    if (!this.connected) await this.connect();
    await this.post('Profiler.enable');
  }

  /**
   * Start CPU profiling
   */
  async startProfiling(): Promise<void> {
    await this.post('Profiler.start');
    console.info('⏱️  Profiling started');
  }

  /**
   * Stop profiling and get results
   */
  async stopProfiling(): Promise<any> {
    const result = await this.post('Profiler.stop');
    console.info(`⏹️  Profiling stopped: ${result.profile?.nodes?.length || 0} nodes`);
    return result;
  }

  /**
   * Profile a function execution
   */
  async profile<T>(fn: () => Promise<T>): Promise<{
    result: T;
    profile: any;
    duration: number;
  }> {
    await this.enable();
    await this.startProfiling();

    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    const profile = await this.stopProfiling();

    return { result, profile, duration };
  }

  /**
   * Post message to inspector session
   */
  private post(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.session.post(method, params, (err: Error | null, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Disconnect profiler
   */
  disconnect(): void {
    if (this.session) {
      this.session.disconnect();
      this.connected = false;
      console.info('🔌 Profiler disconnected');
    }
  }
}

/**
 * Enterprise Scope + Profiler Integration
 * Demonstrates combined usage for security and observability
 */
export class Tier1380EnterpriseScope {
  private secrets: EnterpriseSecretsManager;
  private profiler: EnterpriseProfiler;

  constructor(organization?: string) {
    this.secrets = new EnterpriseSecretsManager(organization);
    this.profiler = new EnterpriseProfiler();
  }

  /**
   * Profiled secret operation
   * Measures performance of credential access with CPU profiling
   */
  async profiledSecretOperation<T>(
    operation: 'get' | 'set' | 'delete',
    service: string,
    name: string,
    value?: string
  ): Promise<{
    result: T | null;
    profile: any;
    duration: number;
    rScore: number;
  }> {
    // R-Score calculation: security + observability
    // C = 1.5 (COORDINATION - secrets handling)
    // E = 0.10 (XSS escape - minimal)
    // S = 0.050 (50 lines scope)
    // V = 0.0 (no state mutation)
    const rScore = 1.5 + 0.1 + 0.05 + 0.0; // 1.65 base + profiler overhead

    await this.profiler.connect();
    await this.profiler.enable();

    const { result, profile, duration } = await this.profiler.profile(async () => {
      switch (operation) {
        case 'get':
          return (await this.secrets.get(service, name)) as T;
        case 'set':
          if (!value) throw new Error('Value required for set operation');
          await this.secrets.set(service, name, value);
          return true as T;
        case 'delete':
          await this.secrets.delete(service, name);
          return true as T;
      }
    });

    this.profiler.disconnect();

    return {
      result,
      profile,
      duration,
      rScore,
    };
  }

  /**
   * Get platform-specific persistence info
   */
  getPersistenceInfo(): {
    platform: string;
    persistence: string;
    enterprise: boolean;
  } {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return {
          platform: 'Windows',
          persistence: 'CRED_PERSIST_ENTERPRISE (per-user roaming)',
          enterprise: true,
        };
      case 'darwin':
        return {
          platform: 'macOS',
          persistence: 'Keychain (login keychain)',
          enterprise: true,
        };
      case 'linux':
        return {
          platform: 'Linux',
          persistence: 'libsecret (GNOME Keyring/KWallet)',
          enterprise: true,
        };
      default:
        return {
          platform,
          persistence: 'Unknown',
          enterprise: false,
        };
    }
  }
}

// ============================================================================
// CLI Demo
// ============================================================================
// Entry guard
if (import.meta.main) {
  console.info(`
╔═══════════════════════════════════════════════════════════╗
║  Tier-1380 Enterprise Secrets & Profiler v4.6           ║
║  Bun ${Bun.version} - ${process.platform}                                     ║
╚═══════════════════════════════════════════════════════════╝
`);

  const enterprise = new Tier1380EnterpriseScope('com.factorywager');
  const persistence = enterprise.getPersistenceInfo();

  console.info('Platform Info:');
  console.info(`  Platform: ${persistence.platform}`);
  console.info(`  Persistence: ${persistence.persistence}`);
  console.info(`  Enterprise Ready: ${persistence.enterprise ? '✅' : '❌'}`);
  console.info();

  // Demo profiled secret operation
  console.info('Running profiled secret operation...');

  try {
    const { result, profile, duration, rScore } = await enterprise.profiledSecretOperation(
      'set',
      'tier1380.api',
      'demo-token',
      'sk_live_' + crypto.randomUUID().replace(/-/g, '')
    );

    console.info();
    console.info('Results:');
    console.info(`  Secret stored: ${result ? '✅' : '❌'}`);
    console.info(`  Profile nodes: ${profile?.profile?.nodes?.length || 0}`);
    console.info(`  Duration: ${duration.toFixed(2)}ms`);
    console.info(`  R-Score: ${rScore.toFixed(3)} (+0.14 enterprise delta)`);
    console.info();
    console.info('✅ Enterprise scope + Profiler LIVE');

    // Cleanup
    await enterprise.profiledSecretOperation('delete', 'tier1380.api', 'demo-token');
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    console.info();
    console.info('Note: On macOS, you may need to grant Keychain access permission.');
    console.info('      On Linux, ensure GNOME Keyring or KWallet is running.');
  }
}

// Classes already exported above
