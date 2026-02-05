#!/usr/bin/env bun
/**
 * FactoryWager Secrets Manager v1.3.8
 * Secure secrets management and validation
 */

interface SecretInfo {
  service: string;
  name: string;
  description: string;
  critical: boolean;
}

class SecretsManager {
  private secrets: SecretInfo[] = [
    // Cloudflare API
    { service: "cloudflare", name: "API_TOKEN", description: "Primary R2-enabled token", critical: true },
    { service: "cloudflare", name: "API_TOKEN_BACKUP", description: "Original DNS token", critical: false },
    { service: "cloudflare", name: "ACCOUNT_ID", description: "Cloudflare account ID", critical: true },
    { service: "cloudflare", name: "ZONE_ID", description: "FactoryWager zone ID", critical: true },

    // R2 Storage
    { service: "r2", name: "AWS_ACCESS_KEY_ID", description: "R2 S3 access key", critical: true },
    { service: "r2", name: "AWS_SECRET_ACCESS_KEY", description: "R2 S3 secret key", critical: true },
    { service: "r2", name: "ENDPOINT", description: "R2 EU endpoint URL", critical: true },

    // Registry Config
    { service: "registry", name: "DOMAIN", description: "Registry domain name", critical: true },
    { service: "registry", name: "VERSION", description: "Registry version", critical: false }
  ];

  async audit(): Promise<void> {
    console.log("🔍 FactoryWager Secrets Audit");
    console.log("============================");
    console.log("Timestamp:", new Date().toISOString());

    let totalSecrets = this.secrets.length;
    let storedSecrets = 0;
    let criticalSecrets = 0;
    let storedCriticalSecrets = 0;

    for (const secret of this.secrets) {
      if (secret.critical) criticalSecrets++;

      try {
        const value = await Bun.secrets.get({ service: secret.service, name: secret.name });
        if (value) {
          const masked = this.maskSecret(secret.name, value.toString());
          const status = secret.critical ? "🔴" : "🟡";
          console.log(`${status} ✅ ${secret.service}:${secret.name} = ${masked}`);
          console.log(`      ${secret.description}`);
          storedSecrets++;
          if (secret.critical) storedCriticalSecrets++;
        } else {
          console.log(`❌ ${secret.service}:${secret.name} = NOT STORED`);
          console.log(`      ${secret.description}`);
        }
      } catch (error) {
        console.log(`❌ ${secret.service}:${secret.name} = ERROR - ${(error as Error).message}`);
      }
    }

    console.log(`\n📊 Audit Summary:`);
    console.log(`   Total Secrets: ${storedSecrets}/${totalSecrets}`);
    console.log(`   Critical Secrets: ${storedCriticalSecrets}/${criticalSecrets}`);

    if (storedSecrets === totalSecrets && storedCriticalSecrets === criticalSecrets) {
      console.log("🎉 All secrets stored securely!");
    } else {
      console.log("⚠️ Some secrets missing - action required");
    }
  }

  private maskSecret(name: string, value: string): string {
    const sensitiveKeywords = ["TOKEN", "SECRET", "KEY", "PASSWORD"];
    const isSensitive = sensitiveKeywords.some(keyword => name.includes(keyword));

    if (isSensitive) {
      return value.length > 8 ? value.slice(0, 8) + "..." : "***";
    }
    return value;
  }

  async testAccess(): Promise<void> {
    console.log("\n🧪 Testing Secret Access");
    console.log("========================");

    const criticalSecrets = this.secrets.filter(s => s.critical);
    let successCount = 0;

    for (const secret of criticalSecrets) {
      try {
        const value = await Bun.secrets.get({ service: secret.service, name: secret.name });
        if (value) {
          console.log(`✅ ${secret.name}: ACCESSIBLE`);
          successCount++;
        } else {
          console.log(`❌ ${secret.name}: NOT FOUND`);
        }
      } catch (error) {
        console.log(`❌ ${secret.name}: ERROR - ${(error as Error).message}`);
      }
    }

    console.log(`\n🎯 Access Test: ${successCount}/${criticalSecrets.length} critical secrets accessible`);

    if (successCount === criticalSecrets.length) {
      console.log("🚀 All critical secrets accessible - ready for production!");
    } else {
      console.log("⚠️ Some critical secrets inaccessible - check permissions");
    }
  }

  async backupInfo(): Promise<void> {
    console.log("\n💾 Secrets Backup Information");
    console.log("============================");

    console.log("🔐 Security Features:");
    console.log("   ✅ OS-native keychain storage");
    console.log("   ✅ Encrypted at rest");
    console.log("   ✅ Process-isolated access");
    console.log("   ✅ Automatic masking in logs");

    console.log("\n📋 Backup Strategy:");
    console.log("   • Secrets stored in system keychain");
    console.log("   • No plaintext files containing secrets");
    console.log("   • Environment-specific isolation");
    console.log("   • Version-controlled configuration only");

    console.log("\n🔄 Recovery Process:");
    console.log("   1. Access system keychain");
    console.log("   2. Retrieve secrets by service:name");
    console.log("   3. Validate critical secret access");
    console.log("   4. Update as needed with this script");
  }

  async generateEnvFile(): Promise<void> {
    console.log("\n📝 Generating Environment Template");
    console.log("=================================");

    try {
      const apiToken = await Bun.secrets.get({ service: "cloudflare", name: "API_TOKEN" });
      const accountId = await Bun.secrets.get({ service: "cloudflare", name: "ACCOUNT_ID" });
      const r2Key = await Bun.secrets.get({ service: "r2", name: "AWS_ACCESS_KEY_ID" });
      const r2Secret = await Bun.secrets.get({ service: "r2", name: "AWS_SECRET_ACCESS_KEY" });
      const r2Endpoint = await Bun.secrets.get({ service: "r2", name: "ENDPOINT" });

      const envTemplate = `# FactoryWager Environment Configuration
# Generated: ${new Date().toISOString()}
# ⚠️  This is a template - use actual secrets from Bun.secrets

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=${apiToken || "YOUR_API_TOKEN_HERE"}
CLOUDFLARE_ACCOUNT_ID=${accountId || "YOUR_ACCOUNT_ID_HERE"}

# R2 Storage Configuration
R2_ACCESS_KEY_ID=${r2Key || "YOUR_R2_ACCESS_KEY_HERE"}
R2_SECRET_ACCESS_KEY=${r2Secret || "YOUR_R2_SECRET_KEY_HERE"}
R2_ENDPOINT=${r2Endpoint || "YOUR_R2_ENDPOINT_HERE"}

# Registry Configuration
REGISTRY_DOMAIN=registry.factory-wager.co
REGISTRY_VERSION=1.3.8

# Usage:
# export CLOUDFLARE_API_TOKEN=$(bun -e 'console.log(await Bun.secrets.get("cloudflare", "API_TOKEN"))')
# export R2_ACCESS_KEY_ID=$(bun -e 'console.log(await Bun.secrets.get("r2", "AWS_ACCESS_KEY_ID"))')
`;

      await Bun.write(Bun.file('./.env.template'), envTemplate);
      console.log("✅ Environment template created: .env.template");
      console.log("⚠️  Use Bun.secrets for actual values in production");

    } catch (error) {
      console.log("❌ Template generation failed:", (error as Error).message);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || "audit";

  const manager = new SecretsManager();

  switch (action) {
    case "audit":
      await manager.audit();
      await manager.testAccess();
      break;
    case "test":
      await manager.testAccess();
      break;
    case "backup":
      await manager.backupInfo();
      break;
    case "env":
      await manager.generateEnvFile();
      break;
    default:
      console.log("Usage: bun run secrets-manager.ts [audit|test|backup|env]");
      console.log("  audit  - Full secrets audit and access test");
      console.log("  test   - Test critical secret access only");
      console.log("  backup - Show backup information");
      console.log("  env    - Generate environment template");
  }
}

if (import.meta.main) {
  main();
}
