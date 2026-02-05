# Environment Variables Guide

## Overview

Bun provides two ways to access environment variables:
- `Bun.env` (recommended, Bun-specific)
- `process.env` (Node.js compatible)

Both work identically and return the same values.

```typescript
Bun.env.API_TOKEN;     // => "secret"
process.env.API_TOKEN; // => "secret"
```

## 🔐 Bun Secrets Integration

### Windows Credential Manager Support

Bun integrates with Windows Credential Manager for secure secret storage:

```typescript
// Access secrets stored in Windows Credential Manager
const dbPassword = Bun.env.DB_PASSWORD; // Retrieved from secure storage
const apiKey = Bun.env.API_SECRET_KEY;  // Encrypted and managed by Bun
```

### Secret Management Best Practices

```typescript
// Recommended: Use Bun.env with type safety and validation
interface EnvironmentVariables {
  PORT: string;
  HOST: string;
  NODE_ENV: 'development' | 'staging' | 'production';
  DATABASE_URL: string;
  API_SECRET_KEY: string;
  JWT_SECRET: string;
}

// Type-safe environment variable access
function getEnvVar(key: keyof EnvironmentVariables): string {
  const value = Bun.env[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Usage in dashboard
const config = {
  port: parseInt(getEnvVar('PORT')),
  host: getEnvVar('HOST'),
  nodeEnv: getEnvVar('NODE_ENV') as EnvironmentVariables['NODE_ENV'],
  databaseUrl: getEnvVar('DATABASE_URL'),
  apiKey: getEnvVar('API_SECRET_KEY'),
  jwtSecret: getEnvVar('JWT_SECRET')
};
```

## Automatic .env File Loading

Bun automatically loads environment variables from `.env` files in order of increasing precedence:

1. **`.env`** - Base environment variables
2. **`.env.production`**, **`.env.development`**, **`.env.test`** - Environment-specific (based on `NODE_ENV`)
3. **`.env.local`** - Local overrides (not loaded when `NODE_ENV=test`)

### Example .env File

```ini
# pages/.env
PORT=8080
HOST=localhost
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/onepay
DB_PASSWORD=stored_in_windows_credential_manager

# API Keys and Secrets
API_SECRET_KEY=managed_by_bun_secrets
JWT_SECRET=auto_rotated_by_bun

# External Services
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=stored_securely
AWS_SECRET_ACCESS_KEY=stored_securely
STRIPE_SECRET_KEY=stored_securely

# Monitoring and Logging
SENTRY_DSN=your_sentry_dsn_here
SMTP_PASSWORD=your_smtp_password

# Security
ENCRYPTION_KEY=your_encryption_key
OAUTH_CLIENT_SECRET=your_oauth_secret
WEBHOOK_SECRET=your_webhook_secret
```

## 🚀 Dashboard Environment Variables

### Server Configuration

| Variable | Default | Description | Security Level |
|----------|---------|-------------|----------------|
| `PORT` | `8080` | Port for development server | Public |
| `HOST` | `localhost` | Hostname for development server | Public |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) | Public |

### Database Configuration

| Variable | Required | Description | Storage |
|----------|----------|-------------|----------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Windows Credential Manager |
| `DB_PASSWORD` | Yes | Database password | Bun Secrets |
| `REDIS_URL` | No | Redis connection string | Windows Credential Manager |

### Security & Authentication

| Variable | Required | Description | Rotation |
|----------|----------|-------------|----------|
| `API_SECRET_KEY` | Yes | API authentication key | Auto-rotated |
| `JWT_SECRET` | Yes | JWT signing secret | Auto-rotated |
| `ENCRYPTION_KEY` | Yes | Data encryption key | Manual |

### External Services

| Variable | Required | Description | Management |
|----------|----------|-------------|------------|
| `AWS_ACCESS_KEY_ID` | No | AWS access key | Windows Credential Manager |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key | Windows Credential Manager |
| `STRIPE_SECRET_KEY` | No | Stripe API key | Bun Secrets |
| `SENTRY_DSN` | No | Error tracking DSN | Bun Secrets |

## 🎯 Advanced Usage Examples

### OnePay Dashboard Integration

#### Secure Configuration Loading

```typescript
// dashboard/src/config/env.ts
interface DashboardConfig {
  server: {
    port: number;
    host: string;
    environment: 'development' | 'staging' | 'production';
  };
  database: {
    url: string;
    password: string;
  };
  security: {
    apiKey: string;
    jwtSecret: string;
    encryptionKey: string;
  };
  services: {
    redis?: string;
    aws?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
    stripe?: string;
  };
}

function loadDashboardConfig(): DashboardConfig {
  return {
    server: {
      port: parseInt(Bun.env.PORT || '8080'),
      host: Bun.env.HOST || 'localhost',
      environment: (Bun.env.NODE_ENV as any) || 'development'
    },
    database: {
      url: getRequiredEnv('DATABASE_URL'),
      password: getRequiredEnv('DB_PASSWORD') // Retrieved from Windows Credential Manager
    },
    security: {
      apiKey: getRequiredEnv('API_SECRET_KEY'), // Managed by Bun Secrets
      jwtSecret: getRequiredEnv('JWT_SECRET'),   // Auto-rotated
      encryptionKey: getRequiredEnv('ENCRYPTION_KEY')
    },
    services: {
      redis: Bun.env.REDIS_URL,
      aws: Bun.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: getRequiredEnv('AWS_SECRET_ACCESS_KEY')
      } : undefined,
      stripe: Bun.env.STRIPE_SECRET_KEY
    };
  };
}

// Initialize dashboard with secure configuration
const config = loadDashboardConfig();
console.log(`🚀 OnePay Dashboard starting on ${config.server.host}:${config.server.port}`);
console.log(`📊 Environment: ${config.server.environment}`);
console.log(`🔐 Security: ${config.security.apiKey ? 'Configured' : 'Missing'}`);
```

#### Environment-Specific Configurations

```typescript
// dashboard/src/config/environments.ts
const environmentConfigs = {
  development: {
    database: {
      url: 'postgresql://localhost:5432/onepay_dev',
      ssl: false
    },
    logging: {
      level: 'debug',
      console: true
    },
    features: {
      hotReload: true,
      debugMode: true
    }
  },
  staging: {
    database: {
      url: Bun.env.DATABASE_URL,
      ssl: true
    },
    logging: {
      level: 'info',
      console: false
    },
    features: {
      hotReload: false,
      debugMode: false
    }
  },
  production: {
    database: {
      url: Bun.env.DATABASE_URL,
      ssl: true
    },
    logging: {
      level: 'warn',
      console: false
    },
    features: {
      hotReload: false,
      debugMode: false
    }
  }
};

function getEnvironmentConfig() {
  const env = Bun.env.NODE_ENV || 'development';
  return environmentConfigs[env as keyof typeof environmentConfigs];
}
```

### Secret Rotation and Management

```typescript
// dashboard/src/security/secret-manager.ts
class SecretManager {
  private rotationInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startRotationMonitoring();
  }
  
  // Monitor secret expiration and rotate automatically
  private startRotationMonitoring() {
    this.rotationInterval = setInterval(() => {
      this.checkAndRotateSecrets();
    }, 24 * 60 * 60 * 1000); // Check daily
  }
  
  private async checkAndRotateSecrets() {
    const jwtAge = this.getSecretAge('JWT_SECRET');
    
    if (jwtAge > 30 * 24 * 60 * 60 * 1000) { // 30 days
      console.log('🔄 Rotating JWT secret...');
      await this.rotateJWTSecret();
      this.logSecurityEvent('JWT_SECRET_ROTATED', 'system');
    }
  }
  
  private async rotateJWTSecret() {
    const newSecret = this.generateSecureSecret();
    // In production, this would update Windows Credential Manager
    process.env.JWT_SECRET = newSecret;
  }
  
  private generateSecureSecret(): string {
    return require('crypto').randomBytes(64).toString('hex');
  }
  
  private getSecretAge(secretName: string): number {
    // Implementation to check secret age
    return Date.now() - this.getSecretCreationTime(secretName);
  }
  
  private logSecurityEvent(action: string, user: string) {
    console.log(`🔒 Security Event: ${action} by ${user} at ${new Date().toISOString()}`);
  }
}

// Initialize secret manager
const secretManager = new SecretManager();
```

#### Using .env File

1. Copy example file:
```bash
cp pages/.env.example pages/.env
```

2. Edit `pages/.env`:
```ini
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

3. Run CLI (variables loaded automatically):
```bash
bun cli/dashboard/dashboard-cli.ts serve
```

#### Using Command Line

```bash
# Linux/macOS
PORT=3000 HOST=0.0.0.0 bun cli/dashboard/dashboard-cli.ts serve

# Windows (CMD)
set PORT=3000 && set HOST=0.0.0.0 && bun cli/dashboard/dashboard-cli.ts serve

# Windows (PowerShell)
$env:PORT="3000"; $env:HOST="0.0.0.0"; bun cli/dashboard/dashboard-cli.ts serve
```

#### Using Bun.env in Code

```typescript
// Recommended: Use Bun.env with fallback to process.env
const port = parseInt(Bun.env.PORT || process.env.PORT || "8080");
const host = Bun.env.HOST || process.env.HOST || "localhost";

// Both work identically
console.log(Bun.env.PORT);     // => "8080"
console.log(process.env.PORT); // => "8080"
```

## Implementation in Dashboard Files

### CLI (`cli/dashboard/dashboard-cli.ts`)

```typescript
// Uses Bun.env with fallback to process.env and CLI args
const port = parseInt(
  Bun.env.PORT || process.env.PORT || args[1] || String(DEFAULT_PORT)
);
const host = Bun.env.HOST || process.env.HOST || args[2] || DEFAULT_HOST;
```

### Dev Server (`pages/dev-server.ts`)

```typescript
// Uses Bun.env with fallback to process.env
const PORT = parseInt(Bun.env.PORT || process.env.PORT || "8080");
const HOST = Bun.env.HOST || process.env.HOST || "localhost";
```

## 🛠️ Best Practices

### 🔒 Security Best Practices

1. **Use `.env` files** for development (don't commit `.env.local`)
2. **Use `Bun.env`** in Bun-specific code (with `process.env` fallback for compatibility)
3. **Document variables** in `.env.example` file
4. **Never commit secrets** - use `.env.local` or environment-specific files
5. **Set defaults** in code for required variables
6. **Implement secret rotation** for sensitive values
7. **Use Windows Credential Manager** for production secrets
8. **Enable audit logging** for secret access

### 🏗️ Architecture Best Practices

```typescript
// ✅ Recommended: Type-safe configuration with validation
interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  security: SecurityConfig;
}

function validateConfig(config: AppConfig): boolean {
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    throw new Error('Invalid server port');
  }
  
  if (!config.database.url.startsWith('postgresql://')) {
    throw new Error('Invalid database URL');
  }
  
  if (config.security.jwtSecret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters');
  }
  
  return true;
}

// ✅ Recommended: Environment-specific feature flags
const featureFlags = {
  development: {
    debugMode: true,
    hotReload: true,
    mockExternalApis: true
  },
  staging: {
    debugMode: false,
    hotReload: false,
    mockExternalApis: false
  },
  production: {
    debugMode: false,
    hotReload: false,
    mockExternalApis: false
  }
};

function isFeatureEnabled(feature: string): boolean {
  const env = Bun.env.NODE_ENV || 'development';
  return featureFlags[env as keyof typeof featureFlags][feature] || false;
}
```

### 📊 Monitoring and Observability

```typescript
// dashboard/src/monitoring/env-monitor.ts
class EnvironmentMonitor {
  private metrics: Map<string, any> = new Map();
  
  constructor() {
    this.trackEnvironmentVariables();
    this.monitorSecretHealth();
  }
  
  private trackEnvironmentVariables() {
    // Track which environment variables are loaded
    const requiredVars = ['DATABASE_URL', 'API_SECRET_KEY', 'JWT_SECRET'];
    const loadedVars = requiredVars.filter(varName => Bun.env[varName]);
    
    this.metrics.set('environment_variables_loaded', loadedVars.length);
    this.metrics.set('environment_variables_total', requiredVars.length);
    
    console.log(`📊 Environment: ${loadedVars.length}/${requiredVars.length} variables loaded`);
  }
  
  private monitorSecretHealth() {
    // Monitor secret age and rotation status
    const secrets = ['JWT_SECRET', 'API_SECRET_KEY'];
    
    secrets.forEach(secretName => {
      const age = this.getSecretAge(secretName);
      const health = age > 25 * 24 * 60 * 60 * 1000 ? 'warning' : 'healthy';
      
      this.metrics.set(`${secretName}_health`, health);
      this.metrics.set(`${secretName}_age_days`, Math.floor(age / (24 * 60 * 60 * 1000)));
    });
  }
  
  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }
}

// Initialize environment monitoring
const envMonitor = new EnvironmentMonitor();
```

### 🚀 Performance Optimization

```typescript
// ✅ Recommended: Cache environment variable access
class EnvCache {
  private cache: Map<string, string> = new Map();
  
  get(key: string): string {
    if (!this.cache.has(key)) {
      const value = Bun.env[key] || process.env[key];
      if (value) {
        this.cache.set(key, value);
      }
    }
    return this.cache.get(key)!;
  }
  
  // Pre-load frequently used variables
  preload(keys: string[]) {
    keys.forEach(key => this.get(key));
  }
}

const envCache = new EnvCache();
envCache.preload(['DATABASE_URL', 'API_SECRET_KEY', 'JWT_SECRET']);

// ✅ Recommended: Lazy loading for optional services
function getOptionalService<T>(
  envKey: string, 
  loader: (value: string) => T
): T | null {
  const value = envCache.get(envKey);
  return value ? loader(value) : null;
}

const awsConfig = getOptionalService('AWS_ACCESS_KEY_ID', (keyId) => ({
  accessKeyId: keyId,
  secretAccessKey: envCache.get('AWS_SECRET_ACCESS_KEY')
}));
```

## File Structure

```
pages/
├── .env.example          # Template (committed to git)
├── .env                  # Local overrides (gitignored)
├── .env.local            # Personal overrides (gitignored)
├── .env.development      # Development-specific (optional)
└── .env.production       # Production-specific (optional)
```

## Security Notes

- **Never commit `.env` or `.env.local`** to version control
- **Use `.env.example`** to document required variables
- **Use `.env.local`** for personal/secret overrides
- **Use environment-specific files** (`.env.production`) for deployment

## References

- [Bun Documentation: Environment Variables](https://bun.com/docs/runtime/environment-variables)
- [Bun Documentation: llms.txt](https://bun.com/docs/llms.txt)
