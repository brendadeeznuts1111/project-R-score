// utils/unified-dashboard-launcher.ts - Multi-tenant dashboard scoping propagation system

import { ScopeDetector, ScopeConfig } from './scope-detector';
import { ScopedSecretsManager } from './scoped-secrets-manager';
import { initializeScopeTimezone, getActiveTimezoneConfig, isTimezoneInitialized } from '../../../scripts/tools/bootstrap-timezone';
import type { Subprocess } from 'bun';

export interface DashboardConfig {
  scope: string;
  platformScope: string;
  domain: string;
  team?: string;
  service?: string;
  port?: number;
  env?: Record<string, string>;
}

export interface LaunchOptions {
  scope?: string;
  team?: string;
  service?: string;
  port?: number;
  env?: Record<string, string>;
  propagateToChildren?: boolean;
  validateScope?: boolean;
}

export interface ChildProcessConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
  scope: string;
  team?: string;
}

/**
 * Unified dashboard launcher with multi-tenant scoping propagation
 */
export class UnifiedDashboardLauncher {
  private static readonly DEFAULT_PORT = 3000;
  private static readonly SCOPE_ENV_VAR = 'DASHBOARD_SCOPE';
  private static activeProcesses = new Map<number, { proc: Subprocess, scope: string, entryPoint: string }>();
  private static scopeMetrics = new Map<string, any>();
  private static readonly PLATFORM_SCOPE_ENV_VAR = 'DASHBOARD_PLATFORM_SCOPE';
  private static readonly DOMAIN_ENV_VAR = 'DASHBOARD_DOMAIN';
  private static readonly TEAM_ENV_VAR = 'DASHBOARD_TEAM';

  /**
   * Parse CLI arguments for scope configuration
   */
  static parseArgs(args: string[]): LaunchOptions {
    const options: LaunchOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--scope':
          options.scope = nextArg;
          i++;
          break;
        case '--team':
          options.team = nextArg;
          i++;
          break;
        case '--service':
          options.service = nextArg;
          i++;
          break;
        case '--port':
          options.port = parseInt(nextArg);
          i++;
          break;
        case '--no-propagate':
          options.propagateToChildren = false;
          break;
        case '--no-validate':
          options.validateScope = false;
          break;
      }
    }

    return options;
  }

  /**
   * Get dashboard configuration from multiple sources
   */
  static getDashboardConfig(options?: LaunchOptions): DashboardConfig {
    // Priority: CLI args > environment variables > auto-detection
    const cliScope = options?.scope;
    const envScope = process.env[this.SCOPE_ENV_VAR];
    const autoScope = this.autoDetectScope();

    const scope = cliScope || envScope || autoScope.scope;
    const scopeConfig = ScopeDetector.getScopeConfig();

    const config: DashboardConfig = {
      scope,
      platformScope: scopeConfig.platformScope,
      domain: scopeConfig.domain,
      team: options?.team || process.env[this.TEAM_ENV_VAR],
      service: options?.service,
      port: options?.port || this.DEFAULT_PORT,
      env: Object.fromEntries(
        Object.entries({
          ...process.env,
          ...options?.env
        }).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>
    };

    return config;
  }

  /**
   * Auto-detect scope from current environment
   */
  static autoDetectScope(): ScopeConfig {
    return ScopeDetector.getScopeConfig();
  }

  /**
   * Validate scope configuration
   */
  static validateScopeConfig(config: DashboardConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate scope
    const validScopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
    if (!validScopes.includes(config.scope)) {
      errors.push(`Invalid scope: ${config.scope}. Must be one of: ${validScopes.join(', ')}`);
    }

    // Validate domain consistency
    const expectedConfig = ScopeDetector.getScopeConfig();
    if (config.domain !== expectedConfig.domain && config.scope !== 'LOCAL-SANDBOX') {
      warnings.push(`Domain mismatch: current=${config.domain}, expected=${expectedConfig.domain}`);
    }

    // Validate platform scope consistency
    if (config.platformScope !== expectedConfig.platformScope) {
      warnings.push(`Platform scope mismatch: current=${config.platformScope}, expected=${expectedConfig.platformScope}`);
    }

    // Validate port
    if (config.port && (config.port < 1024 || config.port > 65535)) {
      errors.push(`Invalid port: ${config.port}. Must be between 1024 and 65535`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Propagate scope to environment variables
   */
  static propagateScope(config: DashboardConfig): void {
    process.env[this.SCOPE_ENV_VAR] = config.scope;
    process.env[this.PLATFORM_SCOPE_ENV_VAR] = config.platformScope;
    process.env[this.DOMAIN_ENV_VAR] = config.domain;
    
    if (config.team) {
      process.env[this.TEAM_ENV_VAR] = config.team;
    }

    // Add scope to all existing env vars for child processes
    const scopeEnv = ScopeDetector.exportAsEnv(ScopeDetector.getScopeConfig());
    Object.assign(process.env, scopeEnv);
  }

  /**
   * Create child process configuration with scope propagation
   */
  static createChildProcessConfig(
    command: string, 
    args: string[], 
    config: DashboardConfig
  ): ChildProcessConfig {
    const childEnv: Record<string, string> = {
      ...process.env,
      [this.SCOPE_ENV_VAR]: config.scope,
      [this.PLATFORM_SCOPE_ENV_VAR]: config.platformScope,
      [this.DOMAIN_ENV_VAR]: config.domain,
      'SCOPE': config.scope,
      'PLATFORM_SCOPE': config.platformScope,
      'DOMAIN': config.domain
    };

    if (config.team) {
      childEnv[this.TEAM_ENV_VAR] = config.team;
      childEnv['TEAM'] = config.team;
    }

    return {
      command,
      args,
      env: childEnv,
      scope: config.scope,
      team: config.team
    };
  }

  /**
   * Launch dashboard with scoping
   */
  static async launchDashboard(options?: LaunchOptions): Promise<{
    success: boolean;
    config: DashboardConfig;
    url: string;
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      // Get configuration
      const config = this.getDashboardConfig(options);

      // Validate configuration
      const validation = this.validateScopeConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          config,
          url: '',
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Propagate scope to environment
      if (options?.propagateToChildren !== false) {
        this.propagateScope(config);
      }

      // Create dashboard URL
      const url = `http://localhost:${config.port}`;
      
      // In a real implementation, this would start the dashboard server
      console.log(`🚀 Launching dashboard with scope: ${config.scope}`);
      console.log(`📊 Platform scope: ${config.platformScope}`);
      console.log(`🌐 Domain: ${config.domain}`);
      console.log(`🔗 URL: ${url}`);
      
      if (config.team) {
        console.log(`👥 Team: ${config.team}`);
      }

      return {
        success: true,
        config,
        url,
        warnings: validation.warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        config: this.getDashboardConfig(options),
        url: '',
        errors: [errorMessage]
      };
    }
  }

  /**
   * Launch child dashboard process using Bun.spawn()
   * Propagates scope, timezone, and platform settings.
   * Enables IPC for status reporting and metrics.
   */
  static async launchDashboardChild(
    entryPoint: string,
    domain: string,
    args: string[] = [],
    port?: number
  ): Promise<Subprocess> {
    try {
      // 1. Detect scope from domain
      const scope = ScopeDetector.detectFromDomain(domain);
      
      // 2. Initialize timezone for current process (idempotent)
      let tzConfig;
      if (!isTimezoneInitialized()) {
        tzConfig = initializeScopeTimezone(scope);
      } else {
        tzConfig = getActiveTimezoneConfig();
      }

      // 3. Prepare environment for child
      const childEnv: Record<string, string> = {
        ...process.env,
        [this.SCOPE_ENV_VAR]: scope,
        'SCOPE': scope,
        'SCOPE_TIMEZONE': tzConfig.scopeTimezone,
        'TZ': tzConfig.scopeTimezone,
        [this.DOMAIN_ENV_VAR]: domain,
        'DOMAIN': domain,
        'ENABLE_IPC': 'true'
      };

      if (port) {
        childEnv['INFRA_PORT'] = port.toString();
      }

      // 4. Spawn child with both env and CLI args (as required by policy)
      console.log(`🚀 Spawning dashboard child [${scope}]: ${entryPoint}`);
      const spawnArgs = entryPoint === "-e" 
        ? ["bun", "-e", ...args]
        : ["bun", "run", entryPoint, "--scope", scope, ...args];
        
      const proc = Bun.spawn(
        spawnArgs,
        {
          cwd: process.cwd(),
          env: childEnv,
          serialization: "json",
          ipc: (message, proc) => {
            UnifiedDashboardLauncher.handleIPCMessage(scope, message);
          },
          onExit: (proc, exitCode, signalCode, error) => {
            UnifiedDashboardLauncher.activeProcesses.delete(proc.pid);
            if (exitCode !== 0 && signalCode === null) {
              console.error(`🚨 Dashboard child [${scope}] exited with code ${exitCode}`);
            } else if (signalCode) {
              console.log(`🛑 Dashboard child [${scope}] was terminated by signal: ${signalCode}`);
            } else {
              console.log(`✅ Dashboard child [${scope}] exited cleanly.`);
            }
          },
        }
      );

      // Register process for management
      this.activeProcesses.set(proc.pid, { proc, scope, entryPoint });

      return proc;
    } catch (error) {
      console.error(`❌ Failed to launch dashboard child for ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Launch child dashboard process (Legacy/Mock implementation)
   */
  static async launchChildDashboard(
    command: string, 
    args: string[], 
    options?: LaunchOptions
  ): Promise<{
    success: boolean;
    config: ChildProcessConfig;
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      const config = this.getDashboardConfig(options);
      const validation = this.validateScopeConfig(config);

      if (!validation.valid) {
        return {
          success: false,
          config: this.createChildProcessConfig(command, args, config),
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      const childConfig = this.createChildProcessConfig(command, args, config);

      return {
        success: true,
        config: childConfig,
        warnings: validation.warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        config: this.createChildProcessConfig(command, args, this.getDashboardConfig(options)),
        errors: [errorMessage]
      };
    }
  }

  /**
   * Handle IPC messages from child processes
   */
  private static handleIPCMessage(scope: string, message: any): void {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      if (data.type === 'status') {
        console.log(`[IPC] Status from [${scope}]: ${data.status} (PID: ${data.pid})`);
      } else if (data.type === 'metrics') {
        this.scopeMetrics.set(scope, data.data);
      } else {
        console.log(`[IPC] Message from [${scope}]:`, data);
      }
    } catch (e) {
      console.warn(`[IPC] Failed to parse message from [${scope}]:`, message);
    }
  }

  /**
   * Shutdown a specific process by PID
   */
  static async shutdownPID(pid: number): Promise<boolean> {
    const processInfo = this.activeProcesses.get(pid);
    if (!processInfo) {
      console.warn(`⚠️ Cannot shutdown PID ${pid}: Process not tracked.`);
      return false;
    }

    console.log(`🛑 Terminating process ${processInfo.scope} (PID: ${pid})...`);
    processInfo.proc.kill(); // SIGTERM
    await processInfo.proc.exited;
    this.activeProcesses.delete(pid);
    console.log(`✅ Process ${pid} terminated.`);
    return true;
  }

  /**
   * Send a command to a specific child process via IPC
   */
  static sendCommand(pid: number, command: string, payload: any = {}): boolean {
    const processInfo = this.activeProcesses.get(pid);
    if (!processInfo) {
      console.warn(`⚠️ Cannot send command to PID ${pid}: Process not tracked.`);
      return false;
    }

    try {
      processInfo.proc.send({
        type: 'command',
        command,
        payload,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error(`❌ Failed to send IPC command to PID ${pid}:`, error);
      return false;
    }
  }

  /**
   * Gracefully shutdown all active dashboard child processes
   */
  static async shutdownAll(): Promise<void> {
    if (this.activeProcesses.size === 0) {
      return;
    }

    console.log(`🛑 Shutting down ${this.activeProcesses.size} active dashboard processes...`);
    
    const terminations = Array.from(this.activeProcesses.values()).map(async ({ proc, scope }) => {
      console.log(`   -> Terminating ${scope} (PID: ${proc.pid})`);
      proc.kill(); // Sends SIGTERM by default
      return proc.exited;
    });

    await Promise.all(terminations);
    this.activeProcesses.clear();
    console.log('✅ All child processes shut down.');
  }

  /**
   * Get latest metrics for a specific scope (received via IPC)
   */
  static getLatestMetrics(scope: string): any {
    return this.scopeMetrics.get(scope);
  }

  /**
   * Get all active dashboard processes
   */
  static getActiveProcesses(): Array<{ pid: number, scope: string, entryPoint: string }> {
    return Array.from(this.activeProcesses.entries()).map(([pid, info]) => ({
      pid,
      scope: info.scope,
      entryPoint: info.entryPoint
    }));
  }

  /**
   * Get current scope from environment
   */
  static getCurrentScope(): string {
    return process.env[this.SCOPE_ENV_VAR] || this.autoDetectScope().scope;
  }

  /**
   * Get current platform scope from environment
   */
  static getCurrentPlatformScope(): string {
    return process.env[this.PLATFORM_SCOPE_ENV_VAR] || this.autoDetectScope().platformScope;
  }

  /**
   * Get current team from environment
   */
  static getCurrentTeam(): string | undefined {
    return process.env[this.TEAM_ENV_VAR];
  }

  /**
   * Check if running in scoped environment
   */
  static isScopedEnvironment(): boolean {
    return !!(process.env[this.SCOPE_ENV_VAR] || process.env[this.DOMAIN_ENV_VAR]);
  }

  /**
   * Export scope configuration for debugging
   */
  static exportScopeInfo(): {
    current: {
      scope: string;
      platformScope: string;
      domain: string;
      team?: string;
    };
    detected: ScopeConfig;
    environment: Record<string, string>;
    isScoped: boolean;
  } {
    return {
      current: {
        scope: this.getCurrentScope(),
        platformScope: this.getCurrentPlatformScope(),
        domain: process.env[this.DOMAIN_ENV_VAR] || this.autoDetectScope().domain,
        team: this.getCurrentTeam()
      },
      detected: this.autoDetectScope(),
      environment: {
        DASHBOARD_SCOPE: process.env[this.SCOPE_ENV_VAR] || 'not set',
        DASHBOARD_PLATFORM_SCOPE: process.env[this.PLATFORM_SCOPE_ENV_VAR] || 'not set',
        DASHBOARD_DOMAIN: process.env[this.DOMAIN_ENV_VAR] || 'not set',
        DASHBOARD_TEAM: process.env[this.TEAM_ENV_VAR] || 'not set'
      },
      isScoped: this.isScopedEnvironment()
    };
  }

  /**
   * CLI interface for scope management
   */
  static async runCLI(args: string[]): Promise<void> {
    const command = args[0];

    switch (command) {
      case 'detect':
        const detected = this.autoDetectScope();
        console.log('🔍 Detected scope configuration:');
        console.log(`   Scope: ${detected.scope}`);
        console.log(`   Platform Scope: ${detected.platformScope}`);
        console.log(`   Domain: ${detected.domain}`);
        console.log(`   Storage: ${detected.storageType}`);
        break;

      case 'set':
        const scope = args[1];
        if (!scope) {
          console.error('❌ Scope required: bun cli/unified-dashboard.ts set <scope>');
          process.exit(1);
        }
        process.env[this.SCOPE_ENV_VAR] = scope;
        console.log(`✅ Scope set to: ${scope}`);
        break;

      case 'launch':
        const options = this.parseArgs(args.slice(1));
        const result = await this.launchDashboard(options);
        if (result.success) {
          console.log(`✅ Dashboard launched: ${result.url}`);
        } else {
          console.error('❌ Launch failed:', result.errors);
          process.exit(1);
        }
        break;

      case 'info':
        const info = this.exportScopeInfo();
        console.log('📊 Scope Information:');
        console.log(`   Current Scope: ${info.current.scope}`);
        console.log(`   Platform Scope: ${info.current.platformScope}`);
        console.log(`   Domain: ${info.current.domain}`);
        if (info.current.team) {
          console.log(`   Team: ${info.current.team}`);
        }
        console.log(`   Scoped Environment: ${info.isScoped ? 'Yes' : 'No'}`);
        break;

      default:
        console.log(`
Unified Dashboard Launcher CLI

Commands:
  detect                    Auto-detect current scope configuration
  set <scope>               Set scope (ENTERPRISE, DEVELOPMENT, LOCAL-SANDBOX)
  launch [options]          Launch dashboard with scoping
  info                      Show current scope information

Options:
  --scope <scope>           Specify scope
  --team <team>             Specify team
  --service <service>       Specify service name
  --port <port>             Specify port (default: 3000)
  --no-propagate            Don't propagate scope to child processes
  --no-validate             Skip scope validation

Examples:
  bun cli/unified-dashboard.ts launch --scope ENTERPRISE --team production
  bun cli/unified-dashboard.ts detect
  bun cli/unified-dashboard.ts info
        `);
        break;
    }
  }
}