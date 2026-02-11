#!/usr/bin/env node

/**
 * Bun Secrets Management Example
 * Demonstrates how to use Bun.secrets with FactoryWager CLI
 */

// Set up your secrets using Bun.secrets (recommended method)
console.log('🔐 Setting up Bun secrets...');

// Method 1: Using Bun.secrets API (Recommended)
if (typeof Bun !== 'undefined') {
    const demoService = "com.factorywager.demo";
    Bun.secrets.set({ service: demoService, name: "R2_SECRET_KEY", value: "my-secret-key" });
    Bun.secrets.set({ service: demoService, name: "R2_ACCOUNT_ID", value: "your-account-id" });
    Bun.secrets.set({ service: demoService, name: "R2_ACCESS_KEY_ID", value: "your-access-key" });
    Bun.secrets.set({ service: demoService, name: "R2_SECRET_ACCESS_KEY", value: "your-secret-access-key" });
    Bun.secrets.set({ service: demoService, name: "CLOUDFLARE_API_TOKEN", value: "your-cloudflare-token" });
    Bun.secrets.set({ service: demoService, name: "FACTORY_WAGER_TOKEN", value: "your-factory-wager-token" });
    Bun.secrets.set({ service: demoService, name: "GITHUB_TOKEN", value: "your-github-token" });
    
    console.log('✅ Secrets set in Bun.secrets');
} else {
    console.log('⚠️ Bun runtime not detected, using environment variables');
}

// Method 2: Environment variables (alternative)
process.env.R2_SECRET_KEY = process.env.R2_SECRET_KEY || "my-secret-key";
process.env.R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "your-account-id";
process.env.R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "your-access-key";
process.env.R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "your-secret-access-key";
process.env.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "your-cloudflare-token";
process.env.FACTORY_WAGER_TOKEN = process.env.FACTORY_WAGER_TOKEN || "your-factory-wager-token";
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || "your-github-token";

// Now test the secrets management
const { SecretsManager } = require('./secrets-management.cjs');

async function demonstrateSecrets() {
    console.log('\n🧪 Testing Secrets Management...');
    
    const secretsManager = new SecretsManager();
    
    // List all available secrets
    console.log('\n📋 Available Secrets:');
    const secrets = secretsManager.listSecrets();
    secrets.forEach(secret => {
        try {
            const value = secretsManager.getSecret(secret);
            const masked = secret.toLowerCase().includes('key') || secret.toLowerCase().includes('token') 
                ? `${value.substring(0, 4)}****` 
                : '[CONFIGURED]';
            console.log(`  ✅ ${secret}: ${masked}`);
        } catch (error) {
            console.log(`  ❌ ${secret}: Not available`);
        }
    });
    
    // Test R2 configuration
    console.log('\n🗄️ Testing R2 Configuration:');
    try {
        const r2Config = secretsManager.getR2Config();
        console.log(`  ✅ Account ID: ${r2Config.accountId.substring(0, 8)}****`);
        console.log(`  ✅ Access Key: ${r2Config.accessKeyId.substring(0, 4)}****`);
        console.log(`  ✅ Secret Access Key: ${r2Config.secretAccessKey.substring(0, 4)}****`);
        if (r2Config.secretKey) {
            console.log(`  ✅ Secret Key: ${r2Config.secretKey.substring(0, 4)}****`);
        }
    } catch (error) {
        console.log(`  ❌ R2 configuration failed: ${error.message}`);
    }
    
    // Test Cloudflare configuration
    console.log('\n☁️ Testing Cloudflare Configuration:');
    try {
        const cfConfig = secretsManager.getCloudflareConfig();
        console.log(`  ✅ API Token: ${cfConfig.apiToken.substring(0, 8)}****`);
        console.log(`  ✅ Zone ID: ${cfConfig.zoneId}`);
    } catch (error) {
        console.log(`  ❌ Cloudflare configuration failed: ${error.message}`);
    }
    
    // Test GitHub configuration
    console.log('\n🐙 Testing GitHub Configuration:');
    try {
        const ghConfig = secretsManager.getGitHubConfig();
        console.log(`  ✅ Token: ${ghConfig.token.substring(0, 4)}****`);
        console.log(`  ✅ Repository: ${ghConfig.owner}/${ghConfig.repo}`);
    } catch (error) {
        console.log(`  ❌ GitHub configuration failed: ${error.message}`);
    }
    
    // Validate all required secrets
    console.log('\n🔍 Validating Required Secrets:');
    try {
        secretsManager.validateRequiredSecrets([
            'R2_ACCOUNT_ID',
            'R2_ACCESS_KEY_ID',
            'R2_SECRET_ACCESS_KEY',
            'CLOUDFLARE_API_TOKEN'
        ]);
        console.log('  ✅ All required secrets are available');
    } catch (error) {
        console.log(`  ❌ Validation failed: ${error.message}`);
    }
    
    console.log('\n🎉 Secrets management demonstration complete!');
}

// CLI integration example
function demonstrateCLIIntegration() {
    console.log('\n🔧 CLI Integration Example:');
    console.log('==============================');
    
    console.log('\n# Set secrets in your application:');
    console.log('Bun.secrets.set("R2_SECRET_KEY", "my-secret-key");');
    console.log('Bun.secrets.set("CLOUDFLARE_API_TOKEN", "your-cloudflare-token");');
    
    console.log('\n# Use with FactoryWager CLI:');
    console.log('./cli/fw-cli secrets list      # List available secrets');
    console.log('./cli/fw-cli secrets validate  # Validate required secrets');
    console.log('./cli/fw-cli secrets test      # Test secret loading');
    console.log('./cli/fw-cli secrets setup     # Show setup guide');
    
    console.log('\n# CLI commands will automatically use secrets from:');
    console.log('1. Bun.secrets (highest priority)');
    console.log('2. Environment variables');
    console.log('3. Configuration files');
    
    console.log('\n# Example with dry-run mode:');
    console.log('./cli/fw-cli dns list --dryrun  # Uses CLOUDFLARE_API_TOKEN');
    console.log('./cli/fw-cli deploy content ./docs --dryrun  # Uses GITHUB_TOKEN');
}

// Production deployment example
function showProductionDeployment() {
    console.log('\n🚀 Production Deployment Example:');
    console.log('===================================');
    
    console.log('\n# In your production application:');
    console.log(`
// Load secrets from secure source
Bun.secrets.set("R2_SECRET_KEY", process.env.R2_SECRET_KEY);
Bun.secrets.set("CLOUDFLARE_API_TOKEN", process.env.CLOUDFLARE_API_TOKEN);

// Initialize CLI with secrets
const { FactoryWagerCLI } = require('./cli/factory-wager-cli.cjs');
const cli = new FactoryWagerCLI();

// Deploy with confidence
await cli.executeCommand(['deploy', 'content', './dist']);
    `);
    
    console.log('\n# Environment variables for production:');
    console.log('export R2_SECRET_KEY="your-production-secret-key"');
    console.log('export CLOUDFLARE_API_TOKEN="your-production-api-token"');
    console.log('export GITHUB_TOKEN="your-production-github-token"');
    
    console.log('\n# Or use .env file:');
    console.log('echo "R2_SECRET_KEY=your-production-secret-key" >> .env');
    console.log('echo "CLOUDFLARE_API_TOKEN=your-production-api-token" >> .env');
}

// Run the demonstration
if (require.main === module) {
    demonstrateSecrets()
        .then(() => demonstrateCLIIntegration())
        .then(() => showProductionDeployment())
        .catch(console.error);
}

module.exports = {
    demonstrateSecrets,
    demonstrateCLIIntegration,
    showProductionDeployment
};
