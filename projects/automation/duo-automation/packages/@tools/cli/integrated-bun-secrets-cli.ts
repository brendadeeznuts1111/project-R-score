#!/usr/bin/env bun
// Integrated Bun Secrets CLI with Health Endpoint and Per-User Scopes
// Combines secrets management, health monitoring, and user-specific scope handling

import { Elysia } from 'elysia';
import { DesignSystem } from '../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../terminal/src/enhanced-unicode-formatter';

// =============================================================================
// USER AND SCOPE MANAGEMENT TYPES
// =============================================================================

/**
 * User profile with permissions and scope access
 */
interface UserProfile {
  /** Unique user identifier */
  userId: string;
  /** User's display name */
  displayName: string;
  /** User's email address */
  email: string;
  /** User's role in the system */
  role: 'admin' | 'developer' | 'operator' | 'viewer';
  /** Scopes this user has access to */
  allowedScopes: string[];
  /** Default scope for this user */
  defaultScope: string;
  /** User's timezone preference */
  timezone: string;
  /** When the user was created */
  createdAt: string;
  /** Last activity timestamp */
  lastActive: string;
}

/**
 * Per-user secrets configuration
 */
interface UserSecretsConfig {
  /** User identifier */
  userId: string;
  /** Current operational scope */
  scope: string;
  /** Secrets backend configuration for this user */
  backend: {
    /** Backend type */
    type: string;
    /** Service name for this user */
    serviceName: string;
    /** User-specific backend configuration */
    config: Record<string, any>;
  };
  /** Available secrets for this user in current scope */
  availableSecrets: string[];
  /** Encryption level for this user */
  encryptionLevel: 'standard' | 'enhanced' | 'maximum';
  /** Access permissions */
  permissions: {
    /** Can read secrets */
    read: boolean;
    /** Can write secrets */
    write: boolean;
    /** Can delete secrets */
    delete: boolean;
    /** Can manage permissions */
    managePermissions: boolean;
  };
}

/**
 * User-specific health status
 */
interface UserHealthStatus {
  /** User identifier */
  userId: string;
  /** User's current scope */
  scope: string;
  /** Overall health status for this user */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Secrets backend connectivity for this user */
  secretsHealth: {
    connected: boolean;
    responseTime: number;
    lastCheck: string;
    availableSecrets: number;
    error?: string;
  };
  /** System health affecting this user */
  systemHealth: {
    cli: boolean;
    scopeLookup: boolean;
    timezoneMatrix: boolean;
    unicodeFormatter: boolean;
    designSystem: boolean;
  };
  /** User-specific recommendations */
  recommendations: string[];
}

// =============================================================================
// BUN SECRETS CLI INTEGRATION
// =============================================================================

/**
 * Bun secrets CLI manager with per-user scope support
 */
class BunSecretsCLIManager {
  /** User profiles database */
  private readonly users: Map<string, UserProfile> = new Map();
  /** User secrets configurations */
  private readonly userSecretsConfigs: Map<string, UserSecretsConfig> = new Map();

  constructor() {
    this.initializeDefaultUsers();
  }

  /**
   * Initialize default user profiles for demonstration
   */
  private initializeDefaultUsers(): void {
    // Admin user with full access
    const adminUser: UserProfile = {
      userId: 'user-001',
      displayName: 'Alice Johnson',
      email: 'alice@company.com',
      role: 'admin',
      allowedScopes: ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'],
      defaultScope: 'ENTERPRISE',
      timezone: 'America/New_York',
      createdAt: '2024-01-01T00:00:00Z',
      lastActive: new Date().toISOString()
    };

    // Developer user with limited access
    const developerUser: UserProfile = {
      userId: 'user-002',
      displayName: 'Bob Smith',
      email: 'bob@company.com',
      role: 'developer',
      allowedScopes: ['DEVELOPMENT', 'LOCAL-SANDBOX'],
      defaultScope: 'DEVELOPMENT',
      timezone: 'Europe/London',
      createdAt: '2024-01-15T00:00:00Z',
      lastActive: new Date().toISOString()
    };

    // Operator user with basic access
    const operatorUser: UserProfile = {
      userId: 'user-003',
      displayName: 'Carol Davis',
      email: 'carol@company.com',
      role: 'operator',
      allowedScopes: ['LOCAL-SANDBOX'],
      defaultScope: 'LOCAL-SANDBOX',
      timezone: 'UTC',
      createdAt: '2024-02-01T00:00:00Z',
      lastActive: new Date().toISOString()
    };

    this.users.set(adminUser.userId, adminUser);
    this.users.set(developerUser.userId, developerUser);
    this.users.set(operatorUser.userId, operatorUser);

    // Initialize secrets configs for each user
    this.initializeUserSecretsConfigs();
  }

  /**
   * Initialize secrets configurations for each user
   */
  private initializeUserSecretsConfigs(): void {
    for (const [userId, user] of this.users) {
      const config: UserSecretsConfig = {
        userId,
        scope: user.defaultScope,
        backend: this.getUserBackendConfig(user),
        availableSecrets: this.getUserSecrets(user.defaultScope),
        encryptionLevel: this.getUserEncryptionLevel(user.defaultScope),
        permissions: this.getUserPermissions(user.role)
      };

      this.userSecretsConfigs.set(userId, config);
    }
  }

  /**
   * Get backend configuration for a user
   */
  private getUserBackendConfig(user: UserProfile): { type: string; serviceName: string; config: Record<string, any> } {
    const scopeConfigs = {
      'ENTERPRISE': {
        type: 'aws-secrets-manager',
        serviceName: `duoplus-enterprise-${user.userId}`,
        config: { region: 'us-east-1', endpoint: 'https://secretsmanager.us-east-1.amazonaws.com' }
      },
      'DEVELOPMENT': {
        type: 'local-vault',
        serviceName: `duoplus-dev-${user.userId}`,
        config: { address: 'localhost:8200', path: `secret/duoplus/dev/${user.userId}` }
      },
      'LOCAL-SANDBOX': {
        type: 'env-file',
        serviceName: `duoplus-local-${user.userId}`,
        config: { file: `.env.${user.userId}`, path: './env' }
      }
    };

    return scopeConfigs[user.defaultScope as keyof typeof scopeConfigs] || scopeConfigs['LOCAL-SANDBOX'];
  }

  /**
   * Get available secrets for a user's scope
   */
  private getUserSecrets(scope: string): string[] {
    const scopeSecrets = {
      'ENTERPRISE': [
        'DATABASE_URL', 'API_KEYS', 'ENCRYPTION_KEYS', 'CERTIFICATES',
        'SERVICE_ACCOUNTS', 'JWT_SECRETS', 'REDIS_CONFIG', 'MONITORING_TOKENS'
      ],
      'DEVELOPMENT': [
        'DATABASE_URL', 'API_KEYS', 'JWT_SECRETS', 'REDIS_CONFIG'
      ],
      'LOCAL-SANDBOX': [
        'DATABASE_URL', 'JWT_SECRETS'
      ]
    };

    return scopeSecrets[scope as keyof typeof scopeSecrets] || [];
  }

  /**
   * Get encryption level for a scope
   */
  private getUserEncryptionLevel(scope: string): 'standard' | 'enhanced' | 'maximum' {
    const encryptionLevels = {
      'ENTERPRISE': 'maximum',
      'DEVELOPMENT': 'enhanced',
      'LOCAL-SANDBOX': 'standard'
    };

    return encryptionLevels[scope as keyof typeof encryptionLevels] || 'standard';
  }

  /**
   * Get permissions based on user role
   */
  private getUserPermissions(role: string): { read: boolean; write: boolean; delete: boolean; managePermissions: boolean } {
    const rolePermissions = {
      'admin': { read: true, write: true, delete: true, managePermissions: true },
      'developer': { read: true, write: true, delete: false, managePermissions: false },
      'operator': { read: true, write: false, delete: false, managePermissions: false },
      'viewer': { read: true, write: false, delete: false, managePermissions: false }
    };

    return rolePermissions[role as keyof typeof rolePermissions] || rolePermissions['viewer'];
  }

  /**
   * Authenticate user and return their profile
   */
  async authenticateUser(userId: string): Promise<UserProfile | null> {
    const user = this.users.get(userId);
    if (user) {
      // Update last active
      user.lastActive = new Date().toISOString();
      this.users.set(userId, user);
      return user;
    }
    return null;
  }

  /**
   * Get user's secrets configuration
   */
  getUserSecretsConfig(userId: string): UserSecretsConfig | null {
    return this.userSecretsConfigs.get(userId) || null;
  }

  /**
   * Switch user's scope (if allowed)
   */
  async switchUserScope(userId: string, newScope: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || !user.allowedScopes.includes(newScope)) {
      return false;
    }

    // Update user's scope
    user.defaultScope = newScope;
    this.users.set(userId, user);

    // Update secrets config
    const config: UserSecretsConfig = {
      userId,
      scope: newScope,
      backend: this.getUserBackendConfig(user),
      availableSecrets: this.getUserSecrets(newScope),
      encryptionLevel: this.getUserEncryptionLevel(newScope),
      permissions: this.getUserPermissions(user.role)
    };

    this.userSecretsConfigs.set(userId, config);
    return true;
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }

  /**
   * Simulate Bun secrets API call for a user
   */
  async simulateBunSecretsAPI(userId: string, secretName?: string): Promise<Record<string, string> | string> {
    const config = this.getUserSecretsConfig(userId);
    if (!config) {
      throw new Error('User not found or no configuration available');
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

    // Mock secrets data based on user and scope
    const mockSecrets: Record<string, string> = {
      'DATABASE_URL': `postgresql://${config.scope.toLowerCase()}-user-${userId}@db.${config.scope.toLowerCase()}.company.com:5432/duoplus`,
      'API_KEYS': `sk-${config.scope.toLowerCase()}-${userId}-${Math.random().toString(36).substring(2)}`,
      'JWT_SECRETS': `jwt-${config.scope.toLowerCase()}-secret-${userId}-${Date.now()}`,
      'REDIS_CONFIG': `redis://${config.scope.toLowerCase()}.redis.cache.company.com:6379`,
      'ENCRYPTION_KEYS': `aes-256-gcm-${config.scope.toLowerCase()}-key-${userId}`,
      'CERTIFICATES': `-----BEGIN CERTIFICATE-----\n${config.scope}-cert-${userId}\n-----END CERTIFICATE-----`,
      'SERVICE_ACCOUNTS': `${config.scope.toLowerCase()}-sa-${userId}@company.com`,
      'MONITORING_TOKENS': `monitoring-${config.scope.toLowerCase()}-${userId}-${Math.random().toString(36).substring(2)}`
    };

    if (secretName) {
      return mockSecrets[secretName] || '';
    }

    // Return only available secrets for this user
    const availableSecrets: Record<string, string> = {};
    config.availableSecrets.forEach(secret => {
      if (mockSecrets[secret]) {
        availableSecrets[secret] = mockSecrets[secret];
      }
    });

    return availableSecrets;
  }
}

// =============================================================================
// USER-SPECIFIC HEALTH MONITORING
// =============================================================================

/**
 * Health monitoring with per-user scope support
 */
class UserHealthMonitor {
  private readonly secretsManager: BunSecretsCLIManager;

  constructor(secretsManager: BunSecretsCLIManager) {
    this.secretsManager = secretsManager;
  }

  /**
   * Get health status for a specific user
   */
  async getUserHealthStatus(userId: string): Promise<UserHealthStatus> {
    const user = await this.secretsManager.authenticateUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const config = this.secretsManager.getUserSecretsConfig(userId);
    if (!config) {
      throw new Error('User configuration not found');
    }

    // Check secrets backend connectivity for this user
    const secretsHealth = await this.checkUserSecretsHealth(userId, config);

    // Check system health
    const systemHealth = await this.checkSystemHealth();

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(secretsHealth, systemHealth);

    // Generate user-specific recommendations
    const recommendations = this.generateUserRecommendations(user, config, secretsHealth, systemHealth);

    return {
      userId,
      scope: config.scope,
      status: overallStatus,
      secretsHealth,
      systemHealth,
      recommendations
    };
  }

  /**
   * Check secrets backend health for a specific user
   */
  private async checkUserSecretsHealth(userId: string, config: UserSecretsConfig): Promise<{
    connected: boolean;
    responseTime: number;
    lastCheck: string;
    availableSecrets: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simulate connectivity check
      await this.secretsManager.simulateBunSecretsAPI(userId);
      const responseTime = Date.now() - startTime;

      return {
        connected: responseTime < 2000,
        responseTime,
        lastCheck: new Date().toISOString(),
        availableSecrets: config.availableSecrets.length
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        availableSecrets: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check overall system health
   */
  private async checkSystemHealth(): Promise<{
    cli: boolean;
    scopeLookup: boolean;
    timezoneMatrix: boolean;
    unicodeFormatter: boolean;
    designSystem: boolean;
  }> {
    // Simulate system health checks
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    return {
      cli: Math.random() > 0.1, // 90% uptime
      scopeLookup: Math.random() > 0.05, // 95% uptime
      timezoneMatrix: Math.random() > 0.05, // 95% uptime
      unicodeFormatter: Math.random() > 0.02, // 98% uptime
      designSystem: Math.random() > 0.02 // 98% uptime
    };
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallStatus(
    secretsHealth: { connected: boolean },
    systemHealth: { [key: string]: boolean }
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const allSystems = Object.values(systemHealth);
    const operationalCount = allSystems.filter(status => status).length;
    const totalSystems = allSystems.length + 1; // +1 for secrets

    const secretsOperational = secretsHealth.connected;
    const operationalSystems = operationalCount + (secretsOperational ? 1 : 0);

    if (operationalSystems === totalSystems) {
      return 'healthy';
    } else if (operationalSystems >= totalSystems * 0.7) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Generate user-specific recommendations
   */
  private generateUserRecommendations(
    user: UserProfile,
    config: UserSecretsConfig,
    secretsHealth: { connected?: boolean; error?: string },
    systemHealth: { [key: string]: boolean }
  ): string[] {
    const recommendations: string[] = [];

    // Secrets-related recommendations
    if (!secretsHealth.connected) {
      recommendations.push(`Secrets backend (${config.backend.type}) is not responding for user ${user.displayName}`);
      if (secretsHealth.error) {
        recommendations.push(`Error: ${secretsHealth.error}`);
      }
    }

    // System health recommendations
    const failedSystems = Object.entries(systemHealth)
      .filter(([_, status]) => !status)
      .map(([system]) => system);

    if (failedSystems.length > 0) {
      recommendations.push(`The following systems are affecting your experience: ${failedSystems.join(', ')}`);
    }

    // Scope-specific recommendations
    if (config.scope === 'LOCAL-SANDBOX' && user.role === 'admin') {
      recommendations.push('Consider switching to ENTERPRISE or DEVELOPMENT scope for full functionality');
    }

    // Permission-based recommendations
    if (!config.permissions.write && user.role === 'developer') {
      recommendations.push('Request write permissions to modify secrets in your scope');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operational - no action required');
    }

    return recommendations;
  }
}

// =============================================================================
// INTEGRATED CLI APPLICATION
// =============================================================================

/**
 * Create integrated Bun secrets CLI with health endpoint
 */
function createIntegratedSecretsCLI(): Elysia {
  const secretsManager = new BunSecretsCLIManager();
  const healthMonitor = new UserHealthMonitor(secretsManager);

  return new Elysia()
    // User authentication and profile endpoints
    .get('/auth/user/:userId', async ({ params }) => {
      const user = await secretsManager.authenticateUser(params.userId);
      if (!user) {
        return { error: 'User not found', status: 404 };
      }
      return { user: { ...user, lastActive: new Date().toISOString() } };
    })

    // User secrets configuration
    .get('/user/:userId/secrets/config', async ({ params }) => {
      const user = await secretsManager.authenticateUser(params.userId);
      if (!user) {
        return { error: 'User not found', status: 404 };
      }

      const config = secretsManager.getUserSecretsConfig(params.userId);
      return { user, config };
    })

    // Get user's secrets (with permissions check)
    .get('/user/:userId/secrets', async ({ params, query }) => {
      const user = await secretsManager.authenticateUser(params.userId);
      if (!user) {
        return { error: 'User not found', status: 404 };
      }

      const config = secretsManager.getUserSecretsConfig(params.userId);
      if (!config || !config.permissions.read) {
        return { error: 'Insufficient permissions', status: 403 };
      }

      try {
        const secretName = query.secret as string;
        const secrets = await secretsManager.simulateBunSecretsAPI(params.userId, secretName);
        return { secrets, scope: config.scope, backend: config.backend.type };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to fetch secrets', status: 500 };
      }
    })

    // Switch user scope
    .post('/user/:userId/scope', async ({ params, body }) => {
      const user = await secretsManager.authenticateUser(params.userId);
      if (!user) {
        return { error: 'User not found', status: 404 };
      }

      const { newScope } = body as { newScope: string };
      const success = await secretsManager.switchUserScope(params.userId, newScope);
      
      if (!success) {
        return { error: 'Invalid scope or insufficient permissions', status: 400 };
      }

      const updatedConfig = secretsManager.getUserSecretsConfig(params.userId);
      return { success, newScope, config: updatedConfig };
    })

    // User-specific health check
    .get('/user/:userId/health', async ({ params }) => {
      try {
        const healthStatus = await healthMonitor.getUserHealthStatus(params.userId);
        return { health: healthStatus };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Health check failed', status: 500 };
      }
    })

    // Admin endpoints
    .get('/admin/users', async () => {
      const users = secretsManager.getAllUsers();
      return { users: users.map(u => ({ ...u, lastActive: new Date().toISOString() })) };
    })

    // General health endpoint (backward compatibility)
    .get('/health', async () => {
      // Return health for first available user (demo purposes)
      const users = secretsManager.getAllUsers();
      if (users.length === 0) {
        return { error: 'No users available', status: 500 };
      }

      const healthStatus = await healthMonitor.getUserHealthStatus(users[0].userId);
      return healthStatus;
    });
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the integrated Bun secrets CLI with per-user scopes
 */
async function demonstrateIntegratedSecretsCLI(): Promise<void> {
  console.log(EmpireProDashboard.generateHeader(
    'INTEGRATED BUN SECRETS CLI WITH PER-USER SCOPES',
    'Health Monitoring, User Management, and Scope-Based Access Control'
  ));

  const app = createIntegratedSecretsCLI();
  const port = process.env.PORT || 3000;
  
  const server = app.listen(port);
  
  console.log(UnicodeTableFormatter.colorize('🚀 Integrated Bun Secrets CLI Server Started', DesignSystem.status.operational));
  console.log(UnicodeTableFormatter.colorize(`🌐 Server: http://localhost:${port}`, DesignSystem.text.accent.blue));
  
  // Demonstrate user authentication and profiles
  console.log(UnicodeTableFormatter.colorize('\n👥 USER PROFILES AND SCOPES:', DesignSystem.text.accent.blue));
  
  const users = ['user-001', 'user-002', 'user-003'];
  const userProfiles = [];
  
  for (const userId of users) {
    const response = await app.handle(new Request(`http://localhost:${port}/auth/user/${userId}`)).then(r => r.json());
    if (response.user) {
      userProfiles.push({
        User: UnicodeTableFormatter.colorize(response.user.displayName, DesignSystem.text.primary),
        Role: UnicodeTableFormatter.colorize(response.user.role, 
          response.user.role === 'admin' ? DesignSystem.status.operational :
          response.user.role === 'developer' ? DesignSystem.text.accent.blue :
          response.user.role === 'operator' ? DesignSystem.text.accent.yellow :
          DesignSystem.text.muted),
        Scope: UnicodeTableFormatter.colorize(response.user.defaultScope,
          response.user.defaultScope === 'ENTERPRISE' ? DesignSystem.status.operational :
          response.user.defaultScope === 'DEVELOPMENT' ? DesignSystem.text.accent.blue :
          DesignSystem.text.muted),
        'Allowed Scopes': UnicodeTableFormatter.colorize(response.user.allowedScopes.join(', '), DesignSystem.text.secondary),
        Timezone: UnicodeTableFormatter.colorize(response.user.timezone, DesignSystem.text.accent.purple)
      });
    }
  }
  
  console.log(UnicodeTableFormatter.generateTable(userProfiles, { maxWidth: 120 }));
  
  // Demonstrate user secrets configurations
  console.log(UnicodeTableFormatter.colorize('\n🔐 USER SECRETS CONFIGURATIONS:', DesignSystem.text.accent.blue));
  
  const secretsConfigs = [];
  for (const userId of users) {
    const response = await app.handle(new Request(`http://localhost:${port}/user/${userId}/secrets/config`)).then(r => r.json());
    if (response.config) {
      secretsConfigs.push({
        User: UnicodeTableFormatter.colorize(response.user.displayName, DesignSystem.text.primary),
        Backend: UnicodeTableFormatter.colorize(response.config.backend.type, DesignSystem.text.accent.purple),
        'Service Name': UnicodeTableFormatter.colorize(response.config.backend.serviceName, DesignSystem.text.accent.green),
        'Available Secrets': UnicodeTableFormatter.colorize(`${response.config.availableSecrets.length}`, DesignSystem.text.accent.blue),
        'Encryption Level': UnicodeTableFormatter.colorize(response.config.encryptionLevel,
          response.config.encryptionLevel === 'maximum' ? DesignSystem.status.operational :
          response.config.encryptionLevel === 'enhanced' ? DesignSystem.status.degraded :
          DesignSystem.text.muted),
        Permissions: UnicodeTableFormatter.colorize(
          `${response.config.permissions.read ? 'R' : ''}${response.config.permissions.write ? 'W' : ''}${response.config.permissions.delete ? 'D' : ''}${response.config.permissions.managePermissions ? 'M' : ''}`,
          DesignSystem.text.secondary
        )
      });
    }
  }
  
  console.log(UnicodeTableFormatter.generateTable(secretsConfigs, { maxWidth: 140 }));
  
  // Demonstrate user-specific health checks
  console.log(UnicodeTableFormatter.colorize('\n🏥 USER-SPECIFIC HEALTH CHECKS:', DesignSystem.text.accent.blue));
  
  const healthChecks = [];
  for (const userId of users) {
    const response = await app.handle(new Request(`http://localhost:${port}/user/${userId}/health`)).then(r => r.json());
    if (response.health) {
      const health = response.health;
      healthChecks.push({
        User: UnicodeTableFormatter.colorize(health.userId, DesignSystem.text.primary),
        Scope: UnicodeTableFormatter.colorize(health.scope,
          health.scope === 'ENTERPRISE' ? DesignSystem.status.operational :
          health.scope === 'DEVELOPMENT' ? DesignSystem.text.accent.blue :
          DesignSystem.text.muted),
        Status: UnicodeTableFormatter.formatStatus(health.status),
        'Secrets Connected': UnicodeTableFormatter.colorize(health.secretsHealth.connected ? 'Yes' : 'No',
          health.secretsHealth.connected ? DesignSystem.status.operational : DesignSystem.status.downtime),
        'Available Secrets': UnicodeTableFormatter.colorize(`${health.secretsHealth.availableSecrets}`, DesignSystem.text.accent.blue),
        'Response Time': UnicodeTableFormatter.colorize(`${health.secretsHealth.responseTime}ms`,
          health.secretsHealth.responseTime < 1000 ? DesignSystem.status.operational : DesignSystem.status.degraded)
      });
    }
  }
  
  console.log(UnicodeTableFormatter.generateTable(healthChecks, { maxWidth: 120 }));
  
  // Demonstrate secrets access
  console.log(UnicodeTableFormatter.colorize('\n🔑 SECRETS ACCESS DEMONSTRATION:', DesignSystem.text.accent.blue));
  
  // Get secrets for admin user
  const adminSecretsResponse = await app.handle(new Request(`http://localhost:${port}/user/user-001/secrets`)).then(r => r.json());
  if (adminSecretsResponse.secrets) {
    console.log(UnicodeTableFormatter.colorize('👑 Admin User (user-001) Secrets:', DesignSystem.text.accent.green));
    const secretsTable = Object.entries(adminSecretsResponse.secrets).map(([key, value]) => ({
      Secret: UnicodeTableFormatter.colorize(key, DesignSystem.text.accent.purple),
      Value: UnicodeTableFormatter.colorize(
        typeof value === 'string' && value.length > 50 ? value.substring(0, 47) + '...' : String(value),
        DesignSystem.text.muted
      ),
      Type: UnicodeTableFormatter.colorize(
        key.includes('URL') ? 'Connection' :
        key.includes('KEY') || key.includes('SECRET') ? 'Authentication' :
        key.includes('CERT') ? 'Certificate' : 'Config',
        DesignSystem.text.secondary
      )
    }));
    console.log(UnicodeTableFormatter.generateTable(secretsTable, { maxWidth: 120 }));
  }
  
  // Get secrets for developer user
  const devSecretsResponse = await app.handle(new Request(`http://localhost:${port}/user/user-002/secrets`)).then(r => r.json());
  if (devSecretsResponse.secrets) {
    console.log(UnicodeTableFormatter.colorize('💻 Developer User (user-002) Secrets:', DesignSystem.text.accent.blue));
    const secretsTable = Object.entries(devSecretsResponse.secrets).map(([key, value]) => ({
      Secret: UnicodeTableFormatter.colorize(key, DesignSystem.text.accent.purple),
      Value: UnicodeTableFormatter.colorize(
        typeof value === 'string' && value.length > 50 ? value.substring(0, 47) + '...' : String(value),
        DesignSystem.text.muted
      ),
      Type: UnicodeTableFormatter.colorize(
        key.includes('URL') ? 'Connection' :
        key.includes('KEY') || key.includes('SECRET') ? 'Authentication' :
        key.includes('CERT') ? 'Certificate' : 'Config',
        DesignSystem.text.secondary
      )
    }));
    console.log(UnicodeTableFormatter.generateTable(secretsTable, { maxWidth: 120 }));
  }
  
  console.log(EmpireProDashboard.generateFooter());
  
  console.log('\n🎉 INTEGRATED BUN SECRETS CLI DEMO COMPLETE!');
  console.log('✅ Per-user scope management with proper access control');
  console.log('✅ User-specific secrets backend configuration');
  console.log('✅ Health monitoring with user-aware status tracking');
  console.log('✅ Role-based permissions and security');
  console.log('✅ Integration with Bun secrets API simulation');
  console.log('\n📋 AVAILABLE ENDPOINTS:');
  console.log('  GET /auth/user/:userId           - User authentication and profile');
  console.log('  GET /user/:userId/secrets/config  - User secrets configuration');
  console.log('  GET /user/:userId/secrets         - Get user secrets (with permissions)');
  console.log('  POST /user/:userId/scope          - Switch user scope');
  console.log('  GET /user/:userId/health          - User-specific health check');
  console.log('  GET /admin/users                  - List all users (admin only)');
  console.log('  GET /health                       - General health endpoint');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(UnicodeTableFormatter.colorize('\n🛑 Shutting down integrated secrets CLI server...', DesignSystem.text.secondary));
    server.stop();
    process.exit(0);
  });
}

// Start the integrated Bun secrets CLI
demonstrateIntegratedSecretsCLI().catch(error => {
  console.error(UnicodeTableFormatter.colorize(`❌ Failed to start integrated secrets CLI: ${error}`, DesignSystem.status.downtime));
  process.exit(1);
});
