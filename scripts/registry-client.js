#!/usr/bin/env node

const fetch = require('node-fetch');
const DNSHealthChecker = require('./dns-health-check.js');

class RegistryClient {
    constructor(config = {}) {
        this.config = {
            primary: 'https://registry.factory-wager.com/',
            fallbacks: [
                'https://npm.factory-wager.com/',
                'https://cache.factory-wager.com/',
                'https://registry.npmjs.org/'
            ],
            timeout: 5000,
            retries: 3,
            cache: new Map(),
            cacheTTL: 300000, // 5 minutes
            ...config
        };
        
        this.dnsChecker = new DNSHealthChecker();
        this.workingRegistries = [];
    }

    async initialize() {
        console.log('🔄 Initializing registry client...');
        await this.updateWorkingRegistries();
        console.log(`✅ Registry client ready with ${this.workingRegistries.length} working servers`);
    }

    async updateWorkingRegistries() {
        const results = await this.dnsChecker.checkAllDomains();
        this.workingRegistries = results
            .filter(r => r.success)
            .map(r => `https://${r.domain}/`);
    }

    getCacheKey(url) {
        return url;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async fetchWithFallback(url, options = {}) {
        const cacheKey = this.getCacheKey(url);
        const cached = this.getFromCache(cacheKey);
        
        if (cached && !options.skipCache) {
            console.log(`📦 Cache hit for ${url}`);
            return cached;
        }

        const registries = [this.config.primary, ...this.config.fallbacks];
        let lastError;

        for (const registry of registries) {
            if (!this.workingRegistries.includes(registry) && registry !== this.config.primary) {
                continue; // Skip known non-working registries
            }

            const fullUrl = url.startsWith('http') ? url : `${registry}${url}`;
            
            try {
                console.log(`🔄 Trying ${registry}...`);
                
                const response = await Promise.race([
                    fetch(fullUrl, {
                        ...options,
                        timeout: this.config.timeout
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
                    )
                ]);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                this.setCache(cacheKey, data);
                
                console.log(`✅ Success from ${registry}`);
                return data;

            } catch (error) {
                lastError = error;
                console.log(`❌ Failed ${registry}: ${error.message}`);
                
                // Mark registry as non-working temporarily
                const index = this.workingRegistries.indexOf(registry);
                if (index > -1) {
                    this.workingRegistries.splice(index, 1);
                }
            }
        }

        // If all failed, refresh DNS and try once more
        console.log('🔄 All registries failed, refreshing DNS...');
        await this.updateWorkingRegistries();
        
        if (this.workingRegistries.length > 0) {
            return this.fetchWithFallback(url, options);
        }

        throw new Error(`All registries failed. Last error: ${lastError.message}`);
    }

    async getPackage(packageName) {
        try {
            console.log(`📦 Fetching package: ${packageName}`);
            const data = await this.fetchWithFallback(`${packageName}`);
            return data;
        } catch (error) {
            console.error(`❌ Failed to fetch package ${packageName}:`, error.message);
            throw error;
        }
    }

    async searchPackages(query) {
        try {
            console.log(`🔍 Searching packages: ${query}`);
            const data = await this.fetchWithFallback(`-/v1/search?text=${encodeURIComponent(query)}`);
            return data;
        } catch (error) {
            console.error(`❌ Failed to search packages:`, error.message);
            throw error;
        }
    }

    async publishPackage(packageData, authToken) {
        const registries = [this.config.primary, ...this.config.fallbacks.slice(0, 2)]; // Try primary + 2 fallbacks for publishing
        
        for (const registry of registries) {
            try {
                console.log(`📤 Publishing to ${registry}...`);
                
                const response = await fetch(`${registry}package`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                        ...packageData.headers
                    },
                    body: JSON.stringify(packageData.body),
                    timeout: this.config.timeout * 2 // Longer timeout for publishing
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(`✅ Successfully published to ${registry}`);
                return data;

            } catch (error) {
                console.log(`❌ Failed to publish to ${registry}: ${error.message}`);
                if (registry === registries[registries.length - 1]) {
                    throw error; // Last registry failed
                }
            }
        }
    }

    getStats() {
        return {
            workingRegistries: this.workingRegistries.length,
            totalRegistries: this.config.fallbacks.length + 1,
            cacheSize: this.cache.size,
            cacheKeys: Array.from(this.cache.keys())
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }
}

// CLI usage
if (require.main === module) {
    const client = new RegistryClient();
    
    client.initialize().then(async () => {
        const command = process.argv[2];
        const packageName = process.argv[3];
        
        try {
            switch (command) {
                case 'get':
                    if (!packageName) {
                        console.error('❌ Package name required');
                        process.exit(1);
                    }
                    await client.getPackage(packageName);
                    break;
                    
                case 'search':
                    const query = packageName || 'factory-wager';
                    await client.searchPackages(query);
                    break;
                    
                case 'stats':
                    console.log('📊 Registry Client Stats:');
                    console.log(JSON.stringify(client.getStats(), null, 2));
                    break;
                    
                case 'clear-cache':
                    client.clearCache();
                    break;
                    
                default:
                    console.log('Usage:');
                    console.log('  node registry-client.js get <package>');
                    console.log('  node registry-client.js search [query]');
                    console.log('  node registry-client.js stats');
                    console.log('  node registry-client.js clear-cache');
            }
        } catch (error) {
            console.error('❌ Operation failed:', error.message);
            process.exit(1);
        }
    });
}

module.exports = RegistryClient;
