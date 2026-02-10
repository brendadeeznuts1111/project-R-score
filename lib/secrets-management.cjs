#!/usr/bin/env node

/**
 * FactoryWager CLI Secrets Management
 * Secure handling of API keys and sensitive configuration
 */

class SecretsManager {
    constructor() {
        this.secrets = new Map();
        this.bunService = 'com.factorywager.cli';
        this.loadEnvironmentSecrets();
        this.loadBunSecrets();
    }

    loadEnvironmentSecrets() {
        // Load from environment variables
        const envSecrets = {
            'CLOUDFLARE_API_TOKEN': process.env.CLOUDFLARE_API_TOKEN,
            'FACTORY_WAGER_TOKEN': process.env.FACTORY_WAGER_TOKEN,
            'R2_SECRET_KEY': process.env.R2_SECRET_KEY,
            'R2_ACCOUNT_ID': process.env.R2_ACCOUNT_ID,
            'R2_ACCESS_KEY_ID': process.env.R2_ACCESS_KEY_ID,
            'R2_SECRET_ACCESS_KEY': process.env.R2_SECRET_ACCESS_KEY,
            'GITHUB_TOKEN': process.env.GITHUB_TOKEN
        };

        Object.entries(envSecrets).forEach(([key, value]) => {
            if (value) {
                this.secrets.set(key, value);
            }
        });
    }

    loadBunSecrets() {
        // Load from Bun secrets if available
        try {
            if (typeof Bun !== 'undefined' && Bun.secrets) {
                // This would be set via: Bun.secrets.set({ service, name, value });
                const bunSecrets = [
                    'R2_SECRET_KEY',
                    'R2_ACCOUNT_ID', 
                    'R2_ACCESS_KEY_ID',
                    'R2_SECRET_ACCESS_KEY',
                    'CLOUDFLARE_API_TOKEN',
                    'FACTORY_WAGER_TOKEN'
                ];

                bunSecrets.forEach(secretName => {
                    void Bun.secrets
                        .get({ service: this.bunService, name: secretName })
                        .then(secretValue => {
                            if (secretValue) {
                                this.secrets.set(secretName, secretValue);
                            }
                        })
                        .catch(() => {
                            // Secret not set in Bun.secrets
                        });
                });
            }
        } catch (error) {
            console.log('🔐 Bun secrets not available, using environment variables');
        }
    }

    getSecret(key) {
        const value = this.secrets.get(key);
        if (!value) {
            throw new Error(`Secret '${key}' not found in environment or Bun secrets`);
        }
        return value;
    }

    setSecret(key, value) {
        if (typeof Bun !== 'undefined' && Bun.secrets) {
            void Bun.secrets.set({ service: this.bunService, name: key, value });
        }
        this.secrets.set(key, value);
    }

    listSecrets() {
        return Array.from(this.secrets.keys());
    }

    validateRequiredSecrets(requiredSecrets) {
        const missing = [];
        for (const secret of requiredSecrets) {
            if (!this.secrets.has(secret)) {
                missing.push(secret);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required secrets: ${missing.join(', ')}`);
        }
        
        return true;
    }

    // R2 Configuration helper
    getR2Config() {
        this.validateRequiredSecrets([
            'R2_ACCOUNT_ID',
            'R2_ACCESS_KEY_ID', 
            'R2_SECRET_ACCESS_KEY'
        ]);

        return {
            accountId: this.getSecret('R2_ACCOUNT_ID'),
            accessKeyId: this.getSecret('R2_ACCESS_KEY_ID'),
            secretAccessKey: this.getSecret('R2_SECRET_ACCESS_KEY'),
            secretKey: this.getSecret('R2_SECRET_KEY') // Optional additional secret
        };
    }

    // Cloudflare Configuration helper
    getCloudflareConfig() {
        this.validateRequiredSecrets(['CLOUDFLARE_API_TOKEN']);

        return {
            apiToken: this.getSecret('CLOUDFLARE_API_TOKEN'),
            zoneId: 'a3b7ba4bb62cb1b177b04b8675250674'
        };
    }

    // GitHub Configuration helper  
    getGitHubConfig() {
        this.validateRequiredSecrets(['GITHUB_TOKEN']);

        return {
            token: this.getSecret('GITHUB_TOKEN'),
            owner: 'brendadeeznuts1111',
            repo: 'project-R-score'
        };
    }
}

// Usage examples and setup guide
function setupSecretsGuide() {
    console.log(`
🔐 FactoryWager CLI Secrets Management Guide
==========================================

## Method 1: Using Bun Secrets (Recommended)

# Set secrets in your application
Bun.secrets.set("R2_SECRET_KEY", "my-secret-key");
Bun.secrets.set("R2_ACCOUNT_ID", "your-account-id");
Bun.secrets.set("R2_ACCESS_KEY_ID", "your-access-key");
Bun.secrets.set("R2_SECRET_ACCESS_KEY", "your-secret-access-key");

# Set Cloudflare API token
Bun.secrets.set("CLOUDFLARE_API_TOKEN", "your-cloudflare-token");

# Set GitHub token
Bun.secrets.set("GITHUB_TOKEN", "your-github-token");

## Method 2: Environment Variables

# Export in your shell
export R2_SECRET_KEY="my-secret-key"
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"
export CLOUDFLARE_API_TOKEN="your-cloudflare-token"
export GITHUB_TOKEN="your-github-token"

# Or create .env file
echo "R2_SECRET_KEY=my-secret-key" >> .env
echo "R2_ACCOUNT_ID=your-account-id" >> .env
echo "R2_ACCESS_KEY_ID=your-access-key" >> .env
echo "R2_SECRET_ACCESS_KEY=your-secret-access-key" >> .env

## Method 3: Configuration File

# Create .fw-secrets.json
{
  "R2_SECRET_KEY": "my-secret-key",
  "R2_ACCOUNT_ID": "your-account-id",
  "R2_ACCESS_KEY_ID": "your-access-key", 
  "R2_SECRET_ACCESS_KEY": "your-secret-access-key"
}

## Usage in CLI

# The CLI will automatically load secrets from:
# 1. Bun.secrets (highest priority)
# 2. Environment variables
# 3. Configuration files

# Example commands that use secrets:
fw-cli dns list                    # Uses CLOUDFLARE_API_TOKEN
fw-cli deploy content ./docs      # Uses GITHUB_TOKEN
fw-cli r2 upload ./dist           # Uses R2_* secrets

## Security Best Practices

1. Never commit secrets to version control
2. Use different secrets for development/production
3. Rotate secrets regularly
4. Use Bun secrets for runtime security
5. Limit secret access to minimum required permissions

## Testing Secrets

# Test if secrets are loaded correctly
node -e "
const { SecretsManager } = require('./secrets-management.cjs');
const sm = new SecretsManager();
console.log('Available secrets:', sm.listSecrets());
try {
    const r2Config = sm.getR2Config();
    console.log('✅ R2 secrets loaded successfully');
} catch (error) {
    console.log('❌ R2 secrets missing:', error.message);
}
"
`);
}

// Export for use in CLI
module.exports = {
    SecretsManager,
    setupSecretsGuide
};

// Run setup guide if executed directly
if (require.main === module) {
    setupSecretsGuide();
}
