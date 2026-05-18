# 🔐 Security Setup Guide - Bun.secrets Integration

<div align="center">

**Enterprise-Grade Credential Management for Crystal Clear Architecture**

[![Bun](https://img.shields.io/badge/Bun-1.0+-yellow?style=for-the-badge)](https://bun.sh)
[![Security](https://img.shields.io/badge/Security-Enterprise-red?style=for-the-badge)](https://bun.sh/docs/runtime/security)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge)](https://www.typescriptlang.org/)

_Secure your application with OS-native credential storage_

</div>

---

## 🎯 Overview

This guide covers the implementation of **Bun.secrets** for secure credential
management in your Crystal Clear Architecture private repository. All sensitive
data (API keys, database passwords, tokens) will be stored securely using your
operating system's native credential storage.

### **🔒 Security Benefits**

- **OS-Native Encryption**: Uses Keychain (macOS), Credential Manager (Windows),
  or libsecret (Linux)
- **No Plaintext Storage**: Credentials are never stored as plaintext files
- **User Authentication**: Integrates with system user authentication
- **Cross-Platform**: Works consistently across all supported platforms
- **Async Operations**: Non-blocking credential operations

---

## 🚀 Quick Security Setup

### **1. Initialize Security Framework**

```bash
# Set up your security environment
bun run registry:setup

# Verify security configuration
bun run security:check
```

### **2. Store Your First Secrets**

```javascript
import { secrets } from 'bun';

// Store database credentials
await secrets.set({
  service: 'fire22-production',
  name: 'database-url',
  value: 'postgresql://user:secure-password@host:5432/fire22_prod',
});

// Store API keys
await secrets.set({
  service: 'fire22-production',
  name: 'api-key',
  value: 'sk-prod-xxxxxxxxxxxxxxxxxx',
});

// Store JWT secrets
await secrets.set({
  service: 'fire22-production',
  name: 'jwt-secret',
  value: 'your-super-secure-jwt-secret-key',
});
```

### **3. Access Stored Secrets**

```javascript
// Retrieve secrets in your application
const dbUrl = await secrets.get({
  service: 'fire22-production',
  name: 'database-url',
});

const apiKey = await secrets.get({
  service: 'fire22-production',
  name: 'api-key',
});

// Use in configuration
const config = {
  database: { url: dbUrl },
  api: { key: apiKey },
};
```

---

## 🏗️ Security Architecture

### **Service Naming Convention**

```javascript
// ✅ Recommended: Reverse domain notation with environment
const services = {
  production: 'com.fire22.dashboard-production',
  staging: 'com.fire22.dashboard-staging',
  development: 'com.fire22.dashboard-development',
};

// ✅ Good: Include application and environment
const service = 'fire22-dashboard-prod';

// ❌ Avoid: Generic names
const badService = 'my-app'; // Too generic, potential conflicts
```

### **Environment Isolation**

```javascript
class EnvironmentSecrets {
  constructor() {
    this.appName = 'fire22-dashboard';
    this.env = process.env.NODE_ENV || 'development';
  }

  getServiceName() {
    return `${this.appName}-${this.env}`;
  }

  async set(key, value) {
    await secrets.set({
      service: this.getServiceName(),
      name: key,
      value,
    });
  }

  async get(key) {
    return await secrets.get({
      service: this.getServiceName(),
      name: key,
    });
  }
}

// Usage
const envSecrets = new EnvironmentSecrets();

// Automatically uses correct service based on NODE_ENV
await envSecrets.set('API_KEY', 'your-api-key');
await envSecrets.set('DB_PASSWORD', 'your-db-password');
```

---

## 🔧 Security Implementation Examples

### **1. Database Configuration**

```javascript
// config/database.ts
import { secrets } from 'bun';

export async function getDatabaseConfig() {
  const env = process.env.NODE_ENV || 'development';
  const service = `fire22-dashboard-${env}`;

  const [url, sslMode] = await Promise.all([
    secrets.get({ service, name: 'database-url' }),
    secrets.get({ service, name: 'database-ssl-mode' }),
  ]);

  if (!url) {
    throw new Error(`Database URL not found for environment: ${env}`);
  }

  return {
    url,
    ssl: sslMode === 'require',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Usage in application
import { getDatabaseConfig } from './config/database';
const dbConfig = await getDatabaseConfig();
```

### **2. API Client with Authentication**

```javascript
// services/api-client.ts
import { secrets } from 'bun';

class SecureApiClient {
  private apiKey: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async initialize() {
    const env = process.env.NODE_ENV || 'development';
    this.apiKey = await secrets.get({
      service: `fire22-dashboard-${env}`,
      name: 'api-key'
    });

    if (!this.apiKey) {
      throw new Error('API key not found in secure storage');
    }
  }

  async request(endpoint: string, options: RequestInit = {}) {
    if (!this.apiKey) {
      await this.initialize();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage
const apiClient = new SecureApiClient('https://api.fire22.com');
const data = await apiClient.request('/users/profile');
```

### **3. JWT Token Management**

```javascript
// services/jwt-service.ts
import { secrets } from 'bun';
import jwt from 'jsonwebtoken';

export class JWTService {
  private secret: string | null = null;

  async initialize() {
    if (this.secret) return;

    const env = process.env.NODE_ENV || 'development';
    this.secret = await secrets.get({
      service: `fire22-dashboard-${env}`,
      name: 'jwt-secret'
    });

    if (!this.secret) {
      throw new Error('JWT secret not found in secure storage');
    }
  }

  async generateToken(payload: object, expiresIn = '1h') {
    await this.initialize();
    return jwt.sign(payload, this.secret!, { expiresIn });
  }

  async verifyToken(token: string) {
    await this.initialize();
    try {
      return jwt.verify(token, this.secret!);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async refreshToken(oldToken: string) {
    const decoded = await this.verifyToken(oldToken);
    const newPayload = { ...decoded, iat: Math.floor(Date.now() / 1000) };
    return this.generateToken(newPayload);
  }
}

// Usage
const jwtService = new JWTService();
const token = await jwtService.generateToken({ userId: '123', role: 'admin' });
const verified = await jwtService.verifyToken(token);
```

### **4. Multi-Service Credential Manager**

```javascript
// services/credential-manager.ts
import { secrets } from 'bun';

export class CredentialManager {
  private env: string;

  constructor() {
    this.env = process.env.NODE_ENV || 'development';
  }

  private getServiceName(service: string) {
    return `fire22-${service}-${this.env}`;
  }

  async storeCredentials(service: string, credentials: Record<string, string>) {
    const serviceName = this.getServiceName(service);
    const promises = Object.entries(credentials).map(([key, value]) =>
      secrets.set({ service: serviceName, name: key, value })
    );

    await Promise.all(promises);
    console.log(`✅ Stored ${Object.keys(credentials).length} credentials for ${service}`);
  }

  async getCredentials(service: string, keys: string[]) {
    const serviceName = this.getServiceName(service);
    const credentials: Record<string, string> = {};

    for (const key of keys) {
      const value = await secrets.get({ service: serviceName, name: key });
      if (value) {
        credentials[key] = value;
      }
    }

    return credentials;
  }

  async updateCredential(service: string, key: string, value: string) {
    const serviceName = this.getServiceName(service);
    await secrets.set({ service: serviceName, name: key, value });
    console.log(`✅ Updated ${key} for ${service}`);
  }

  async deleteCredentials(service: string, keys: string[]) {
    const serviceName = this.getServiceName(service);
    const promises = keys.map(key =>
      secrets.delete({ service: serviceName, name: key })
    );

    await Promise.all(promises);
    console.log(`✅ Deleted ${keys.length} credentials for ${service}`);
  }
}

// Usage
const credManager = new CredentialManager();

// Store Stripe credentials
await credManager.storeCredentials('stripe', {
  publishableKey: 'pk_test_xxxxx',
  secretKey: 'sk_test_xxxxx',
  webhookSecret: 'whsec_xxxxx'
});

// Get database credentials
const dbCreds = await credManager.getCredentials('database', [
  'host', 'username', 'password', 'database'
]);
```

---

## 🧪 Testing Secure Applications

### **1. Unit Tests for Secret Operations**

```javascript
// tests/security/secrets.test.ts
import { test, expect } from 'bun:test';
import { secrets } from 'bun';

test('secrets CRUD operations', async () => {
  const testService = 'fire22-test-service';
  const testName = 'test-secret';
  const testValue = 'test-value-123';

  // Create
  await secrets.set({
    service: testService,
    name: testName,
    value: testValue,
  });

  // Read
  const retrieved = await secrets.get({
    service: testService,
    name: testName,
  });

  expect(retrieved).toBe(testValue);

  // Delete
  await secrets.delete({
    service: testService,
    name: testName,
  });

  // Verify deletion
  const deleted = await secrets.get({
    service: testService,
    name: testName,
  });

  expect(deleted).toBeNull();
});
```

### **2. Integration Tests with Mock Secrets**

```javascript
// tests/integration/api-client.test.ts
import { test, expect, mock } from 'bun:test';

// Mock secrets for testing
mock.module('bun', () => ({
  secrets: {
    get: async ({ service, name }) => {
      const mockSecrets = {
        'fire22-test': {
          'api-key': 'test-api-key-123',
          'database-url': 'postgresql://test:test@localhost:5432/test',
        },
      };
      return mockSecrets[service]?.[name] || null;
    },
  },
}));

test('API client uses secure secrets', async () => {
  const { SecureApiClient } = await import('../services/api-client');
  const client = new SecureApiClient('https://api.test.com');

  // This should work with mocked secrets
  const data = await client.request('/test-endpoint');

  expect(data).toBeDefined();
});
```

### **3. Security Compliance Tests**

```javascript
// tests/security/compliance.test.ts
import { test, expect } from 'bun:test';
import { secrets } from 'bun';

test('secrets follow security best practices', async () => {
  const testService = 'fire22-security-test';

  // Test service name validation
  const validService = 'com.fire22.dashboard-test';
  const invalidService = 'my-app'; // Too generic

  // Valid service should work
  await secrets.set({
    service: validService,
    name: 'test-secret',
    value: 'test-value',
  });

  const value = await secrets.get({
    service: validService,
    name: 'test-secret',
  });

  expect(value).toBe('test-value');

  // Cleanup
  await secrets.delete({
    service: validService,
    name: 'test-secret',
  });
});
```

---

## 🔄 Migration from .env Files

### **Automated Migration Script**

```javascript
// scripts/migrate-env-to-secrets.ts
import { secrets } from 'bun';
import { readFileSync } from 'fs';
import { parse } from 'dotenv';

export async function migrateEnvToSecrets(
  envPath = '.env',
  serviceName = 'fire22-migrated'
) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const parsed = parse(envContent);

    console.log(`🔄 Migrating ${Object.keys(parsed).length} secrets...`);

    for (const [key, value] of Object.entries(parsed)) {
      await secrets.set({
        service: serviceName,
        name: key,
        value,
      });
      console.log(`✅ Migrated ${key}`);
    }

    console.log(
      `\n🎉 Successfully migrated ${Object.keys(parsed).length} secrets`
    );
    console.log(
      '⚠️  Remember to delete your .env file and add it to .gitignore'
    );
    console.log(
      '🔒 Your secrets are now securely stored in system credential storage'
    );
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (import.meta.main) {
  const envPath = process.argv[2] || '.env';
  const serviceName = process.argv[3] || `fire22-${Date.now()}`;

  await migrateEnvToSecrets(envPath, serviceName);
}
```

### **Usage**

```bash
# Migrate existing .env file
bun run scripts/migrate-env-to-secrets.ts .env fire22-production

# Migrate specific environment file
bun run scripts/migrate-env-to-secrets.ts .env.local fire22-development
```

---

## 🛡️ Security Best Practices

### **1. Service Naming**

```javascript
// ✅ Use reverse domain notation
const service = 'com.fire22.dashboard';

// ✅ Include environment
const service = 'com.fire22.dashboard-production';

// ✅ Use application-specific names
const service = 'fire22-dashboard-api-keys';

// ❌ Avoid generic names
const bad = 'my-secrets'; // Conflicts with other apps
```

### **2. Error Handling**

```javascript
// ✅ Safe secret retrieval
async function safeGetSecret(service: string, name: string) {
  try {
    const value = await secrets.get({ service, name });

    if (!value) {
      console.warn(`Secret ${name} not found in ${service}`);
      return null;
    }

    return value;
  } catch (error) {
    console.error(`Failed to retrieve secret: ${error.message}`);
    // Don't log the actual error details in production
    throw new Error('Failed to retrieve secure credential');
  }
}
```

### **3. Secret Rotation**

```javascript
class SecretRotation {
  async rotateSecret(service: string, name: string, newValue: string) {
    const timestamp = Date.now();

    // Store new version
    await secrets.set({
      service,
      name: `${name}_${timestamp}`,
      value: newValue,
    });

    // Update current pointer
    await secrets.set({
      service,
      name: `${name}_current`,
      value: `${name}_${timestamp}`,
    });

    // Keep previous version for rollback
    const currentValue = await secrets.get({ service, name });
    if (currentValue) {
      await secrets.set({
        service,
        name: `${name}_previous`,
        value: currentValue,
      });
    }

    console.log(`✅ Rotated secret ${name}`);
  }

  async rollbackSecret(service: string, name: string) {
    const previousValue = await secrets.get({
      service,
      name: `${name}_previous`
    });

    if (previousValue) {
      await secrets.set({ service, name, value: previousValue });
      console.log(`✅ Rolled back secret ${name}`);
    }
  }
}
```

### **4. Access Logging**

```javascript
// ✅ Log secret access for audit purposes
async function auditedGetSecret(service: string, name: string) {
  const startTime = Date.now();

  try {
    const value = await secrets.get({ service, name });

    // Log successful access (without revealing the secret)
    console.log(`🔐 Secret accessed: ${service}/${name} (${Date.now() - startTime}ms)`);

    return value;
  } catch (error) {
    // Log failed access attempts
    console.warn(`🚨 Secret access failed: ${service}/${name} - ${error.message}`);

    throw error;
  }
}
```

---

## 🚨 Security Checklist

### **Pre-Deployment**

- [ ] All secrets migrated from `.env` files
- [ ] Environment-specific service names configured
- [ ] Secret rotation policy implemented
- [ ] Access logging enabled
- [ ] Error handling tested
- [ ] Backup strategy for secrets documented

### **Runtime Security**

- [ ] No hardcoded credentials in codebase
- [ ] All API calls use secure secrets
- [ ] Database connections use secure credentials
- [ ] JWT secrets properly managed
- [ ] External service integrations secured

### **Monitoring & Alerting**

- [ ] Failed secret access attempts logged
- [ ] Secret rotation alerts configured
- [ ] Security audit logs reviewed regularly
- [ ] Credential expiration monitoring

---

## 📞 Troubleshooting

### **Common Issues**

```javascript
// Issue: Secret not found
const secret = await secrets.get({ service: 'wrong-service', name: 'api-key' });
// Fix: Check service name matches what was used when storing

// Issue: Platform-specific issues
// macOS: Check Keychain access permissions
// Linux: Ensure libsecret is installed
// Windows: Check Credential Manager permissions
```

### **Debug Mode**

```bash
# Enable debug logging for secrets operations
DEBUG=* bun run your-script.ts

# Check what secrets are stored
# macOS: security find-generic-password -l
# Linux: secret-tool search
# Windows: Use Credential Manager GUI
```

### **Recovery Procedures**

```javascript
// Emergency secret recovery
async function recoverSecret(service: string, name: string) {
  console.log(`🔍 Attempting to recover secret: ${service}/${name}`);

  // Try different service name variations
  const variations = [
    service,
    `${service}-production`,
    `${service}-development`,
    `com.fire22.${service}`
  ];

  for (const variation of variations) {
    const value = await secrets.get({ service: variation, name });
    if (value) {
      console.log(`✅ Found in: ${variation}`);
      return value;
    }
  }

  console.log('❌ Secret not found in any variation');
  return null;
}
```

---

## 📚 Additional Resources

### **📖 Documentation**

- [Bun.secrets API Reference](./docs/bun-secrets-manager.md)
- [Security Best Practices](./docs/SECURITY_BEST_PRACTICES.md)
- [Credential Management Guide](./docs/CREDENTIAL_MANAGEMENT.md)

### **🔧 Tools & Scripts**

```bash
# Security setup script
bun run scripts/setup-security.ts

# Secret migration utility
bun run scripts/migrate-secrets.ts

# Security audit
bun run scripts/security-audit.ts
```

### **🎯 Key Takeaways**

1. **Always use Bun.secrets** for sensitive data
2. **Follow service naming conventions** to avoid conflicts
3. **Implement proper error handling** for secret operations
4. **Set up secret rotation** policies
5. **Test security thoroughly** before deployment
6. **Monitor and audit** secret access patterns

---

<div align="center">

**🔐 Secure Your Application with Bun.secrets**

_Enterprise-grade security without the complexity_

---

**Ready to secure your application?**

1. Run `bun run registry:setup` to initialize
2. Store your secrets with `secrets.set()`
3. Access them securely with `secrets.get()`
4. Test thoroughly before deployment

**Happy secure coding! 🛡️**

</div>
