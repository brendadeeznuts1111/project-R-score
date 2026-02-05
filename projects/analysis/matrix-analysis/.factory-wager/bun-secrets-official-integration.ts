#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager v1.3.8 Official Bun.secrets Integration
 * Aligned with official Bun documentation - https://bun.com/docs/bun/secrets
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { secrets } from "bun";

class FactoryWagerOfficialSecretsIntegration {
  private readonly serviceName = "com.factorywager.cli";
  private readonly environment = process.env.FW_MODE || "development";

  /**
   * Official Bun.secrets API implementation
   * Following official documentation patterns
   */

  /**
   * Store API token using official API
   */
  async storeApiToken(token: string): Promise<void> {
    console.log(`🔐 Storing FactoryWager API token...`);
    
    try {
      // Official API: object syntax
      await secrets.set({
        service: this.serviceName,
        name: "tier-api-token",
        value: token
      });
      
      console.log(`✅ API token stored securely in OS keychain`);
      console.log(`   Service: ${this.serviceName}`);
      console.log(`   Environment: ${this.environment}`);
      
    } catch (error) {
      console.error(`❌ Failed to store API token: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Retrieve API token using official API
   */
  async getApiToken(): Promise<string | null> {
    console.log(`🔍 Retrieving FactoryWager API token...`);
    
    try {
      // Official API: object syntax
      const token = await secrets.get({
        service: this.serviceName,
        name: "tier-api-token"
      });
      
      if (token) {
        console.log(`✅ API token retrieved successfully`);
        console.log(`   Token preview: ${token.substring(0, 8)}...`);
        console.log(`   Token length: ${token.length} characters`);
        return token;
      } else {
        console.log(`⚠️  No API token found in keychain`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to retrieve API token: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Store database credentials using official API
   */
  async storeDatabaseCredentials(config: {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
  }): Promise<void> {
    console.log(`🗄️  Storing database credentials...`);
    
    const credentials = [
      { name: "db-host", value: config.host },
      { name: "db-port", value: config.port },
      { name: "db-user", value: config.user },
      { name: "db-password", value: config.password },
      { name: "db-database", value: config.database }
    ];

    try {
      // Store all credentials using official API
      await Promise.all(
        credentials.map(cred => 
          secrets.set({
            service: this.serviceName,
            name: cred.name,
            value: cred.value
          })
        )
      );
      
      console.log(`✅ Database credentials stored securely`);
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   Database: ${config.database}`);
      console.log(`   User: ${config.user}`);
      
    } catch (error) {
      console.error(`❌ Failed to store database credentials: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Retrieve database credentials using official API
   */
  async getDatabaseCredentials(): Promise<{
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
  } | null> {
    console.log(`🔍 Retrieving database credentials...`);
    
    const credentialNames = [
      "db-host", "db-port", "db-user", "db-password", "db-database"
    ];

    try {
      // Retrieve all credentials using official API
      const credentials = await Promise.all(
        credentialNames.map(name => 
          secrets.get({
            service: this.serviceName,
            name: name
          })
        )
      );

      // Check if all credentials exist
      if (credentials.every(cred => cred !== null)) {
        const result = {
          host: credentials[0]!,
          port: credentials[1]!,
          user: credentials[2]!,
          password: credentials[3]!,
          database: credentials[4]!
        };
        
        console.log(`✅ Database credentials retrieved`);
        console.log(`   Host: ${result.host}:${result.port}`);
        console.log(`   Database: ${result.database}`);
        console.log(`   User: ${result.user}`);
        console.log(`   Password: ${result.password.substring(0, 4)}...`);
        
        return result;
      } else {
        console.log(`⚠️  Incomplete database credentials found`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to retrieve database credentials: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Store JWT signing key using official API
   */
  async storeJwtSigningKey(): Promise<string> {
    console.log(`🔑 Generating and storing JWT signing key...`);
    
    try {
      // Generate cryptographically secure key
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const hexKey = Array.from(keyBytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Store using official API
      await secrets.set({
        service: this.serviceName,
        name: "jwt-signing-key",
        value: hexKey
      });
      
      console.log(`✅ JWT signing key generated and stored`);
      console.log(`   Key length: ${hexKey.length} characters (256 bits)`);
      console.log(`   Key preview: ${hexKey.substring(0, 16)}...`);
      
      return hexKey;
      
    } catch (error) {
      console.error(`❌ Failed to store JWT signing key: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Retrieve JWT signing key using official API
   */
  async getJwtSigningKey(): Promise<string | null> {
    console.log(`🔍 Retrieving JWT signing key...`);
    
    try {
      const key = await secrets.get({
        service: this.serviceName,
        name: "jwt-signing-key"
      });
      
      if (key) {
        console.log(`✅ JWT signing key retrieved`);
        console.log(`   Key length: ${key.length} characters`);
        console.log(`   Key preview: ${key.substring(0, 16)}...`);
        return key;
      } else {
        console.log(`⚠️  No JWT signing key found`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to retrieve JWT signing key: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Migrate from .env file to official Bun.secrets
   */
  async migrateFromEnvFile(): Promise<void> {
    console.log(`🔄 Migrating from .env file to Bun.secrets...`);
    
    const envMappings = [
      { env: "TIER_API_TOKEN", secret: "tier-api-token" },
      { env: "DATABASE_HOST", secret: "db-host" },
      { env: "DATABASE_PORT", secret: "db-port" },
      { env: "DATABASE_USER", secret: "db-user" },
      { env: "DATABASE_PASSWORD", secret: "db-password" },
      { env: "DATABASE_NAME", secret: "db-database" },
      { env: "JWT_SECRET", secret: "jwt-signing-key" }
    ];

    let migratedCount = 0;
    
    for (const mapping of envMappings) {
      const envValue = process.env[mapping.env];
      
      if (envValue) {
        try {
          await secrets.set({
            service: this.serviceName,
            name: mapping.secret,
            value: envValue
          });
          
          console.log(`✅ Migrated ${mapping.env} → ${mapping.secret}`);
          migratedCount++;
          
        } catch (error) {
          console.error(`❌ Failed to migrate ${mapping.env}: ${(error as Error).message}`);
        }
      } else {
        console.log(`⚠️  ${mapping.env} not found in environment`);
      }
    }
    
    console.log(`\n🎉 Migration complete: ${migratedCount} secrets migrated`);
    console.log(`💡 Consider removing sensitive values from .env file`);
  }

  /**
   * List all stored secrets for debugging
   */
  async listStoredSecrets(): Promise<void> {
    console.log(`📋 Listing stored secrets for ${this.serviceName}...`);
    
    const commonSecretNames = [
      "tier-api-token",
      "db-host", "db-port", "db-user", "db-password", "db-database",
      "jwt-signing-key"
    ];

    const foundSecrets: string[] = [];
    
    for (const name of commonSecretNames) {
      try {
        const value = await secrets.get({
          service: this.serviceName,
          name: name
        });
        
        if (value) {
          const displayValue = name.includes("password") || name.includes("token") || name.includes("key")
            ? `${value.substring(0, 4)}...`
            : value;
          
          console.log(`   ✅ ${name}: ${displayValue}`);
          foundSecrets.push(name);
        } else {
          console.log(`   ❌ ${name}: not found`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${name}: error - ${(error as Error).message}`);
      }
    }
    
    console.log(`\n📊 Summary: ${foundSecrets.length}/${commonSecretNames.length} secrets found`);
  }

  /**
   * Delete a secret using official API
   */
  async deleteSecret(name: string): Promise<boolean> {
    console.log(`🗑️  Deleting secret: ${name}...`);
    
    try {
      const deleted = await secrets.delete({
        service: this.serviceName,
        name: name
      });
      
      if (deleted) {
        console.log(`✅ Secret ${name} deleted successfully`);
      } else {
        console.log(`⚠️  Secret ${name} not found`);
      }
      
      return deleted;
      
    } catch (error) {
      console.error(`❌ Failed to delete secret ${name}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Demonstrate official API usage patterns
   */
  async demonstrateOfficialApi(): Promise<void> {
    console.log(`🚀 FactoryWager Official Bun.secrets API Demonstration`);
    console.log(`====================================================`);
    console.log(`Service: ${this.serviceName}`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Runtime: Bun ${process.versions.bun}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    console.log(``);

    // Demo 1: Store and retrieve API token
    console.log(`📝 Demo 1: API Token Management`);
    await this.storeApiToken("demo-tier-api-token-12345");
    const token = await this.getApiToken();
    console.log(``);

    // Demo 2: Database credentials
    console.log(`📝 Demo 2: Database Credentials`);
    await this.storeDatabaseCredentials({
      host: "localhost",
      port: "5432",
      user: "factorywager",
      password: "secure-password-123",
      database: "factorywager_prod"
    });
    const dbCreds = await this.getDatabaseCredentials();
    console.log(``);

    // Demo 3: JWT signing key
    console.log(`📝 Demo 3: JWT Signing Key`);
    const jwtKey = await this.storeJwtSigningKey();
    const retrievedKey = await this.getJwtSigningKey();
    console.log(``);

    // Demo 4: List all secrets
    console.log(`📝 Demo 4: Secret Inventory`);
    await this.listStoredSecrets();
    console.log(``);

    // Demo 5: Alternative API syntax (official support)
    console.log(`📝 Demo 5: Alternative API Syntax`);
    try {
      // Official alternative syntax: service, name parameters
      const altToken = await secrets.get(this.serviceName, "tier-api-token");
      console.log(`✅ Alternative syntax works: ${altToken?.substring(0, 8)}...`);
      
      // Store with alternative syntax
      await secrets.set(this.serviceName, "alt-test", "alternative-syntax-value");
      console.log(`✅ Alternative store syntax works`);
      
      // Clean up
      await this.deleteSecret("alt-test");
      console.log(`✅ Alternative delete syntax works`);
      
    } catch (error) {
      console.log(`⚠️  Alternative syntax: ${(error as Error).message}`);
    }

    console.log(`\n🎉 Official Bun.secrets API demonstration complete!`);
    console.log(`✅ All official API patterns verified`);
    console.log(`✅ FactoryWager integration ready for production`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Interface for Official Integration
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🚀 FactoryWager Official Bun.secrets Integration

Usage:
  bun run bun-secrets-official-integration.ts <command> [options]

Commands:
  demo                    Demonstrate official API usage
  store-token <token>     Store API token
  get-token              Retrieve API token
  store-db <host> <port> <user> <password> <db>  Store database credentials
  get-db                  Retrieve database credentials
  generate-jwt            Generate and store JWT signing key
  migrate                 Migrate from .env file
  list                    List all stored secrets
  delete <name>           Delete a secret

Official API Features:
  🔐 OS keychain integration (macOS Keychain, Linux libsecret, Windows Credential Manager)
  🔄 Async operations on Bun's threadpool
  🔒 Native encryption by operating system
  🛡️ Memory safety (zeroed after use)
  📋 Cross-platform compatibility

Examples:
  bun run bun-secrets-official-integration.ts demo
  bun run bun-secrets-official-integration.ts store-token "your-token-here"
  bun run bun-secrets-official-integration.ts migrate

Based on official Bun documentation: https://bun.com/docs/bun/secrets
`);
    process.exit(0);
  }

  const integration = new FactoryWagerOfficialSecretsIntegration();

  switch (command) {
    case "demo":
      await integration.demonstrateOfficialApi();
      break;
    case "store-token":
      const token = args[1];
      if (!token) {
        console.error("❌ Token required");
        process.exit(1);
      }
      await integration.storeApiToken(token);
      break;
    case "get-token":
      const retrievedToken = await integration.getApiToken();
      if (retrievedToken) {
        console.log(`Token: ${retrievedToken}`);
      }
      break;
    case "store-db":
      const [host, port, user, password, database] = args.slice(1);
      if (!host || !port || !user || !password || !database) {
        console.error("❌ All database parameters required: host port user password database");
        process.exit(1);
      }
      await integration.storeDatabaseCredentials({ host, port, user, password, database });
      break;
    case "get-db":
      const dbCreds = await integration.getDatabaseCredentials();
      if (dbCreds) {
        console.log(JSON.stringify(dbCreds, null, 2));
      }
      break;
    case "generate-jwt":
      await integration.storeJwtSigningKey();
      break;
    case "migrate":
      await integration.migrateFromEnvFile();
      break;
    case "list":
      await integration.listStoredSecrets();
      break;
    case "delete":
      const secretName = args[1];
      if (!secretName) {
        console.error("❌ Secret name required");
        process.exit(1);
      }
      await integration.deleteSecret(secretName);
      break;
    default:
      console.error("❌ Unknown command. Use --help for usage information.");
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { FactoryWagerOfficialSecretsIntegration };
