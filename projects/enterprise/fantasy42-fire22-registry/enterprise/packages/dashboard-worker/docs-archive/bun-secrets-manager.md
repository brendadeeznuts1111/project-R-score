# 🔐 Bun.secrets - Native Secrets Manager

## Overview

`Bun.secrets` is a native secrets manager that securely stores and retrieves
credentials using the operating system's native credential storage. This
eliminates the need to store sensitive data in plaintext files, making it ideal
for CLI tools and local development.

## Key Features

### 🔒 **OS-Native Security**

- **macOS**: Keychain Services
- **Linux**: libsecret (GNOME Keyring, KWallet)
- **Windows**: Windows Credential Manager

### ⚡ **Performance**

- All operations run asynchronously in Bun's thread pool
- No blocking of the main thread
- Fast native system integration

### 🛡️ **Security Benefits**

- No plaintext storage
- OS-level encryption
- User authentication integration
- Secure credential lifecycle management

## API Reference

````typescript
```javascript
import { secrets } from "bun";
````text

// Type definitions interface SecretOptions { service: string; // Your
application/service name name: string; // The secret identifier value?: string;
// The secret value (for set operation) }

````

## Core Operations

### 1. **Storing Secrets**

```javascript
```javascript
import { secrets } from "bun";
````text

// Store a GitHub token await secrets.set({ service: "my-cli-tool", name:
"github-token", value: "ghp_xxxxxxxxxxxxxxxxxxxx", });

// Store API credentials await secrets.set({ service: "my-app", name: "api-key",
value: "sk-1234567890abcdef", });

// Store database credentials await secrets.set({ service: "my-app", name:
"db-password", value: "super-secret-password", });

````

### 2. **Retrieving Secrets**

```javascript
// Get a stored secret
const token = await secrets.get({
  service: "my-cli-tool",
  name: "github-token",
});

if (token) {
  console.log("Token retrieved successfully");
  // Use the token for API calls
} else {
  console.log("Token not found");
}
````

### 3. **Deleting Secrets**

```javascript
// Remove a secret
await secrets.delete({
  service: 'my-cli-tool',
  name: 'github-token',
});

// Clean up all secrets for a service (iterate and delete)
const secretNames = ['api-key', 'db-password', 'jwt-secret'];
for (const name of secretNames) {
  await secrets.delete({
    service: 'my-app',
    name,
  });
}
```

## Real-World Examples

### CLI Tool Authentication

````javascript
#!/usr/bin/env bun
```javascript
import { secrets } from "bun";
````text

```javascript
import { prompt } from './utils';
```text

class CLIAuth { constructor(serviceName = "my-cli") { this.service =
serviceName; }

async login() { const username = await prompt("Username: "); const password =
await prompt("Password: ", { hidden: true });

    // Authenticate with your API
    const response = await fetch("https://api.example.com/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const { token } = await response.json();

      // Store the token securely
      await secrets.set({
        service: this.service,
        name: "auth-token",
        value: token,
      });

      console.log("✅ Login successful! Token stored securely.");
      return true;
    }

    console.error("❌ Login failed");
    return false;

}

async logout() { await secrets.delete({ service: this.service, name:
"auth-token", }); console.log("✅ Logged out successfully"); }

async getToken() { return await secrets.get({ service: this.service, name:
"auth-token", }); }

async makeAuthenticatedRequest(url) { const token = await this.getToken();

    if (!token) {
      console.error("❌ Not authenticated. Please login first.");
      return null;
    }

    return fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

} }

// Usage const auth = new CLIAuth("github-cli"); await auth.login(); const
response = await auth.makeAuthenticatedRequest("https://api.github.com/user");

````

### Multi-Service Credential Manager

```javascript
```javascript
import { secrets } from "bun";
````text

class CredentialManager { constructor(appName = "my-app") { this.appName =
appName; }

// Store multiple related credentials async storeServiceCredentials(serviceName,
credentials) { const promises = Object.entries(credentials).map(([key, value])
=> secrets.set({ service: `${this.appName}-${serviceName}`, name: key, value:
String(value), }) );

    await Promise.all(promises);
    console.log(`✅ Stored ${Object.keys(credentials).length} credentials for ${serviceName}`);

}

// Retrieve all credentials for a service async
getServiceCredentials(serviceName, credentialNames) { const credentials = {};

    for (const name of credentialNames) {
      const value = await secrets.get({
        service: `${this.appName}-${serviceName}`,
        name,
      });

      if (value) {
        credentials[name] = value;
      }
    }

    return credentials;

}

// Update a specific credential async updateCredential(serviceName,
credentialName, newValue) { await secrets.set({ service:
`${this.appName}-${serviceName}`, name: credentialName, value: newValue, });
console.log(`✅ Updated ${credentialName} for ${serviceName}`); }

// Remove all credentials for a service async
removeServiceCredentials(serviceName, credentialNames) { const promises =
credentialNames.map((name) => secrets.delete({ service:
`${this.appName}-${serviceName}`, name, }) );

    await Promise.all(promises);
    console.log(`✅ Removed all credentials for ${serviceName}`);

} }

// Usage example const manager = new CredentialManager("fire22");

// Store database credentials await manager.storeServiceCredentials("database",
{ host: "db.example.com", username: "admin", password: "super-secret", port:
"5432", });

// Store API credentials await manager.storeServiceCredentials("stripe", {
publishableKey: "pk_test_xxxxx", secretKey: "sk_test_xxxxx", webhookSecret:
"whsec_xxxxx", });

// Retrieve credentials when needed const dbCreds = await
manager.getServiceCredentials("database", [ "host", "username", "password",
"port" ]);

````

### Environment-Specific Secrets

```javascript
```javascript
import { secrets } from "bun";
````text

class EnvironmentSecrets { constructor(appName = "my-app") { this.appName =
appName; this.env = process.env.NODE_ENV || "development"; }

getServiceName(key) { return `${this.appName}-${this.env}`; }

async set(key, value) { await secrets.set({ service: this.getServiceName(),
name: key, value, }); }

async get(key) { return await secrets.get({ service: this.getServiceName(),
name: key, }); }

async delete(key) { await secrets.delete({ service: this.getServiceName(), name:
key, }); }

// Load all secrets as environment variables async loadToEnv(keys) { for (const
key of keys) { const value = await this.get(key); if (value) { process.env[key]
= value; } } }

// Migrate secrets between environments async migrate(fromEnv, toEnv, keys) {
const fromService = `${this.appName}-${fromEnv}`; const toService =
`${this.appName}-${toEnv}`;

    for (const key of keys) {
      const value = await secrets.get({
        service: fromService,
        name: key,
      });

      if (value) {
        await secrets.set({
          service: toService,
          name: key,
          value,
        });
      }
    }

    console.log(`✅ Migrated ${keys.length} secrets from ${fromEnv} to ${toEnv}`);

} }

// Usage const envSecrets = new EnvironmentSecrets("fire22");

// Development environment process.env.NODE_ENV = "development"; await
envSecrets.set("API_KEY", "dev_key_123"); await envSecrets.set("DB_PASSWORD",
"dev_password");

// Production environment process.env.NODE_ENV = "production"; await
envSecrets.set("API_KEY", "prod_key_xyz"); await envSecrets.set("DB_PASSWORD",
"prod_secure_password");

// Load secrets for current environment await envSecrets.loadToEnv(["API_KEY",
"DB_PASSWORD"]);

````

## Security Best Practices

### 1. **Service Naming Convention**
```javascript
// Good: Use reverse domain notation
const service = "com.company.app-name";

// Good: Include environment
const service = "com.company.app-production";

// Avoid: Generic names
const service = "my-app"; // Too generic
````

### 2. **Error Handling**

```javascript
async function safeGetSecret(service, name) {
  try {
    const value = await secrets.get({ service, name });

    if (!value) {
      console.warn(`Secret ${name} not found in ${service}`);
      return null;
    }

    return value;
  } catch (error) {
    console.error(`Failed to retrieve secret: ${error.message}`);
    return null;
  }
}
```

### 3. **Secret Rotation**

```javascript
class SecretRotation {
  async rotateSecret(service, name, newValue) {
    // Store the new secret with a version suffix
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
    await secrets.set({
      service,
      name: `${name}_previous`,
      value: name,
    });

    console.log(`✅ Rotated secret ${name}`);
  }
}
```

### 4. **Validation**

````javascript
```javascript
function validateSecretName(name) {
  // Ensure name follows naming convention
  const validPattern = /^[a-z0-9-_]+$/i;

  if (!validPattern.test(name)) {
    throw new Error("Invalid secret name. Use only alphanumeric, dash, and underscore.");
  }

  if (name.length > 255) {
    throw new Error("Secret name too long (max 255 characters)");
  }

  return true;
}
````text

````

## Platform-Specific Notes

### macOS (Keychain Services)
```javascript
// Secrets are stored in the user's login keychain
// Accessible via Keychain Access app
// Path: ~/Library/Keychains/
````

### Linux (libsecret)

```javascript
// Requires libsecret to be installed
// Ubuntu/Debian: sudo apt-get install libsecret-1-dev
// Fedora: sudo dnf install libsecret-devel
// Arch: sudo pacman -S libsecret
```

### Windows (Credential Manager)

```javascript
// Stored in Windows Credential Manager
// Accessible via: Control Panel → Credential Manager → Windows Credentials
// Or run: rundll32.exe keymgr.dll, KRShowKeyMgr
```

## Testing Secrets

````javascript
```javascript
import { test, expect } from "bun:test";
````text

```javascript
import { secrets } from 'bun';
```text

test("secrets CRUD operations", async () => { const testService =
"test-service"; const testName = "test-secret"; const testValue =
"test-value-123";

// Create await secrets.set({ service: testService, name: testName, value:
testValue, });

// Read const retrieved = await secrets.get({ service: testService, name:
testName, });

expect(retrieved).toBe(testValue);

// Delete await secrets.delete({ service: testService, name: testName, });

// Verify deletion const deleted = await secrets.get({ service: testService,
name: testName, });

expect(deleted).toBeNull(); });

````

## Migration from .env Files

```javascript
```javascript
import { secrets } from "bun";
````text

```javascript
import { readFileSync } from 'fs';
```text

```javascript
import { parse } from 'dotenv';
```text

async function migrateEnvToSecrets(envPath = ".env", serviceName = "my-app") {
const envContent = readFileSync(envPath, "utf-8"); const parsed =
parse(envContent);

for (const [key, value] of Object.entries(parsed)) { await secrets.set({
service: serviceName, name: key, value, }); console.log(`✅ Migrated ${key}`); }

console.log(`\n🎉 Successfully migrated ${Object.keys(parsed).length} secrets`);
console.log("⚠️ Remember to delete your .env file and add it to .gitignore"); }

// Run migration await migrateEnvToSecrets(".env.local", "fire22-dashboard");

```

## Summary

`Bun.secrets` provides a secure, native solution for managing sensitive data in CLI tools and applications. By leveraging OS-native credential storage, it eliminates the security risks associated with plaintext storage while providing a simple, async API for credential management.

### Key Benefits:
- 🔐 **OS-native security** - Leverages platform credential managers
- ⚡ **Async operations** - Non-blocking thread pool execution
- 🛡️ **No plaintext** - Encrypted storage by default
- 🔄 **Simple API** - Easy get/set/delete operations
- 🌍 **Cross-platform** - Works on macOS, Linux, and Windows

Use `Bun.secrets` whenever you need to store API keys, tokens, passwords, or any sensitive configuration data in your Bun applications.
```text
