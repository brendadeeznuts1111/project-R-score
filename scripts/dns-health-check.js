#!/usr/bin/env node

const dns = require('dns').promises;
const { performance } = require('perf_hooks');

class DNSHealthChecker {
    constructor(config = {}) {
        this.primary = config.primary || 'registry.factory-wager.com';
        this.fallbacks = config.fallbacks || [
            'npm.factory-wager.com',
            'cache.factory-wager.com',
            'registry.npmjs.org'
        ];
        this.timeout = config.timeout || 5000;
        this.retries = config.retries || 3;
        this.results = [];
    }

    async resolveDomain(domain) {
        const startTime = performance.now();
        
        try {
            const result = await Promise.race([
                dns.resolve4(domain),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('DNS timeout')), this.timeout)
                )
            ]);
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            return {
                domain,
                success: true,
                ips: result,
                responseTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            return {
                domain,
                success: false,
                error: error.message,
                responseTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkAllDomains() {
        console.log('🔍 Starting DNS health check...\n');
        
        const domains = [this.primary, ...this.fallbacks];
        const results = await Promise.allSettled(
            domains.map(domain => this.resolveDomain(domain))
        );

        this.results = results.map(result => result.value);

        this.displayResults();
        return this.results;
    }

    displayResults() {
        console.log('📊 DNS Health Check Results:\n');
        
        this.results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const type = index === 0 ? 'PRIMARY' : index === 1 ? 'FALLBACK 1' : index === 2 ? 'FALLBACK 2' : 'EMERGENCY';
            
            console.log(`${status} ${type}: ${result.domain}`);
            console.log(`   Response Time: ${result.responseTime.toFixed(2)}ms`);
            
            if (result.success) {
                console.log(`   IP Addresses: ${result.ips.join(', ')}`);
            } else {
                console.log(`   Error: ${result.error}`);
            }
            
            console.log(`   Timestamp: ${result.timestamp}\n`);
        });

        this.showSummary();
    }

    showSummary() {
        const successful = this.results.filter(r => r.success);
        const failed = this.results.filter(r => !r.success);
        const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;

        console.log('📈 Summary:');
        console.log(`   ✓ Successful: ${successful.length}/${this.results.length}`);
        console.log(`   ✗ Failed: ${failed.length}/${this.results.length}`);
        console.log(`   ⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
        
        if (failed.length > 0) {
            console.log('\n⚠️  Recommendations:');
            failed.forEach(result => {
                console.log(`   - Check ${result.domain} configuration`);
            });
        }

        if (successful.length >= 2) {
            console.log('\n🛡️  DNS Fallback: Ready');
        } else {
            console.log('\n🚨 DNS Fallback: Critical - Less than 2 servers available');
        }
    }

    async getWorkingRegistry() {
        const results = await this.checkAllDomains();
        const working = results.find(r => r.success);
        
        if (working) {
            return `https://${working.domain}/`;
        }
        
        throw new Error('No working registry servers available');
    }
}

// CLI usage
if (require.main === module) {
    const checker = new DNSHealthChecker();
    
    checker.checkAllDomains()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ DNS health check failed:', error.message);
            process.exit(1);
        });
}

module.exports = DNSHealthChecker;
