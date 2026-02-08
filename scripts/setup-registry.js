#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class RegistrySetup {
    constructor() {
        this.projectRoot = process.cwd();
        this.configFiles = [
            '.npmrc',
            'bunfig.toml',
            'package.json'
        ];
    }

    async setup() {
        console.log('🚀 Setting up FactoryWager Private Registry...\n');

        try {
            await this.checkPrerequisites();
            await this.setupNpmConfig();
            await this.setupBunConfig();
            await this.setupPackageJson();
            await this.testConfiguration();
            await this.createEnvironmentTemplate();
            
            console.log('✅ Registry setup complete!');
            console.log('\n📋 Next Steps:');
            console.log('1. Set your FACTORY_WAGER_TOKEN environment variable');
            console.log('2. Run: npm install or bun install');
            console.log('3. Test with: node scripts/registry-client.js stats');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...');
        
        // Check Node.js
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
            console.log(`   ✓ Node.js: ${nodeVersion}`);
        } catch (error) {
            throw new Error('Node.js is required but not installed');
        }

        // Check npm
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            console.log(`   ✓ npm: ${npmVersion}`);
        } catch (error) {
            console.log('   ⚠️  npm not found (optional if using Bun)');
        }

        // Check Bun
        try {
            const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim();
            console.log(`   ✓ Bun: ${bunVersion}`);
        } catch (error) {
            console.log('   ⚠️  Bun not found (optional if using npm)');
        }

        // Check DNS resolution
        try {
            const DNSHealthChecker = require('./dns-health-check.js');
            const checker = new DNSHealthChecker();
            const results = await checker.checkAllDomains();
            const working = results.filter(r => r.success);
            
            if (working.length >= 2) {
                console.log(`   ✓ DNS Resolution: ${working.length}/4 servers working`);
            } else {
                console.log(`   ⚠️  DNS Resolution: Only ${working.length}/4 servers working`);
            }
        } catch (error) {
            console.log('   ⚠️  DNS check failed, but continuing...');
        }
        
        console.log('');
    }

    async setupNpmConfig() {
        console.log('📦 Setting up npm configuration...');
        
        const npmrcPath = path.join(this.projectRoot, '.npmrc');
        const npmrcContent = `# FactoryWager Private Registry Configuration
@factory-wager:registry=https://registry.factory-wager.com/
//registry.factory-wager.com/:_authToken=\${FACTORY_WAGER_TOKEN}
//registry.factory-wager.com/:always-auth=true

# Fallback registries for redundancy
@factory-wager:registry=https://npm.factory-wager.com/
//npm.factory-wager.com/:_authToken=\${FACTORY_WAGER_TOKEN}
//npm.factory-wager.com/:always-auth=true

# Cache configuration for optimal performance
cache=.npm-cache
max-size=2GB

# Timeout and retry settings
timeout=5000
retry-timeout=1000
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000

# Strict SSL for security
strict-ssl=true

# Logging configuration
loglevel=info
progress=true

# Save exact versions for consistency
save-exact=false
save-prefix=^

# Package lock configuration
package-lock=true
package-lock-only=false

# Audit configuration
audit=true
audit-level=moderate

# Fund configuration
fund=true`;

        if (!fs.existsSync(npmrcPath)) {
            fs.writeFileSync(npmrcPath, npmrcContent);
            console.log('   ✓ Created .npmrc');
        } else {
            console.log('   ℹ️  .npmrc already exists');
        }
        
        console.log('');
    }

    async setupBunConfig() {
        console.log('🥟 Setting up Bun configuration...');
        
        const bunfigPath = path.join(this.projectRoot, 'bunfig.toml');
        const bunfigContent = `[install]
# Primary registry configuration
registry = "https://registry.factory-wager.com/"
cache = true
frozen-lockfile = false

# Fallback registries in order of preference
fallback = [
    "https://npm.factory-wager.com/",
    "https://cache.factory-wager.com/",
    "https://registry.npmjs.org/"
]

# Timeout and retry configuration
timeout = 5000
retries = 3

[cache]
# Cache configuration for optimal performance
dir = ".bun-cache"
max-size = "2GB"
compression = true

# Cache TTL settings
package-ttl = 3600        # 1 hour for packages
metadata-ttl = 300        # 5 minutes for metadata
index-ttl = 600           # 10 minutes for index

[dns]
# DNS resolution with fallback
primary = "registry.factory-wager.com"
fallbacks = [
    "npm.factory-wager.com",
    "cache.factory-wager.com"
]
emergency = "registry.npmjs.org"

# DNS TTL settings
ttl-primary = 300
ttl-fallback = 60
ttl-emergency = 30

# DNS resolution timeout
timeout = 3000

[registry]
# FactoryWager registry specific settings
@factory-wager:registry = "https://registry.factory-wager.com/"
@factory-wager:token = "\${FACTORY_WAGER_TOKEN}"
@factory-wager:always-auth = true

# Authentication for fallback registries
//npm.factory-wager.com/:_authToken = "\${FACTORY_WAGER_TOKEN}"
//cache.factory-wager.com/:_authToken = "\${FACTORY_WAGER_TOKEN}"

[ publish ]
# Publishing configuration
registry = "https://registry.factory-wager.com/"
access = "public"
tag = "latest"

# Publishing timeout (longer for large packages)
timeout = 30000

[lockfile]
# Lockfile settings for consistency
print = "yarn"
save-prefix = "^"
save-exact = false

[scripts]
# Pre and post install hooks
preinstall = "node scripts/dns-health-check.js"
postinstall = "node scripts/cache-stats.js"

[loglevel]
# Logging configuration
level = "info"
verbose = false

# Performance monitoring
enable-metrics = true
metrics-endpoint = "https://metrics.factory-wager.com/bun-install"

[security]
# Security settings
verify-ssl = true
strict-ssl = true
check-certificates = true

# Allowed origins for package installation
allowed-origins = [
    "registry.factory-wager.com",
    "npm.factory-wager.com", 
    "cache.factory-wager.com",
    "registry.npmjs.org"
]

[telemetry]
# Disable telemetry for privacy
disable = true
anonymous = false`;

        if (!fs.existsSync(bunfigPath)) {
            fs.writeFileSync(bunfigPath, bunfigContent);
            console.log('   ✓ Created bunfig.toml');
        } else {
            console.log('   ℹ️  bunfig.toml already exists');
        }
        
        console.log('');
    }

    async setupPackageJson() {
        console.log('📋 Setting up package.json configuration...');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Add registry configuration
            if (!packageJson.publishConfig) {
                packageJson.publishConfig = {};
            }
            
            packageJson.publishConfig.registry = 'https://registry.factory-wager.com/';
            packageJson.publishConfig.access = 'public';
            
            // Add scripts for registry management
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }
            
            packageJson.scripts['registry:setup'] = 'node scripts/setup-registry.js';
            packageJson.scripts['registry:health'] = 'node scripts/dns-health-check.js';
            packageJson.scripts['registry:stats'] = 'node scripts/registry-client.js stats';
            packageJson.scripts['registry:clear-cache'] = 'node scripts/registry-client.js clear-cache';
            
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('   ✓ Updated package.json');
        } else {
            console.log('   ℹ️  package.json not found');
        }
        
        console.log('');
    }

    async testConfiguration() {
        console.log('🧪 Testing configuration...');
        
        try {
            // Test DNS health
            const DNSHealthChecker = require('./dns-health-check.js');
            const checker = new DNSHealthChecker();
            const results = await checker.checkAllDomains();
            const working = results.filter(r => r.success);
            
            if (working.length >= 2) {
                console.log(`   ✓ DNS health check passed (${working.length}/4 servers)`);
            } else {
                console.log(`   ⚠️  DNS health check warning (${working.length}/4 servers)`);
            }
            
            // Test registry client
            const RegistryClient = require('./registry-client.js');
            const client = new RegistryClient();
            await client.initialize();
            const stats = client.getStats();
            
            console.log(`   ✓ Registry client initialized (${stats.workingRegistries}/${stats.totalRegistries} servers)`);
            
        } catch (error) {
            console.log(`   ⚠️  Configuration test failed: ${error.message}`);
        }
        
        console.log('');
    }

    async createEnvironmentTemplate() {
        console.log('📝 Creating environment template...');
        
        const envTemplatePath = path.join(this.projectRoot, '.env.template');
        const envContent = `# FactoryWager Registry Configuration
# Copy this file to .env and fill in your values

# Required: Your FactoryWager registry authentication token
FACTORY_WAGER_TOKEN=your_token_here

# Optional: Custom registry URLs (defaults to factory-wager.com)
REGISTRY_PRIMARY=https://registry.factory-wager.com/
REGISTRY_FALLBACK_1=https://npm.factory-wager.com/
REGISTRY_FALLBACK_2=https://cache.factory-wager.com/

# Optional: Cache settings
CACHE_ENABLED=true
CACHE_MAX_SIZE=2GB
CACHE_TTL=3600

# Optional: Timeout settings
TIMEOUT=5000
RETRIES=3

# Optional: Debug mode
DEBUG=false
LOG_LEVEL=info`;

        if (!fs.existsSync(envTemplatePath)) {
            fs.writeFileSync(envTemplatePath, envContent);
            console.log('   ✓ Created .env.template');
        } else {
            console.log('   ℹ️  .env.template already exists');
        }
        
        console.log('');
    }
}

// CLI usage
if (require.main === module) {
    const setup = new RegistrySetup();
    setup.setup();
}

module.exports = RegistrySetup;
