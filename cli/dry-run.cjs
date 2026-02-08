#!/usr/bin/env node

/**
 * FactoryWager CLI Dry Run Mode
 * Preview changes before executing them
 */

class DryRunManager {
    constructor(options = {}) {
        this.dryRun = false;
        this.preview = [];
        this.maxPreviewSize = options.maxPreviewSize || 50;
        this.dangerousOperations = [
            'delete', 'remove', 'destroy', 'purge',
            'create', 'add', 'update', 'modify'
        ];
        this.sensitiveFields = ['token', 'password', 'secret', 'key', 'auth'];
    }

    enable() {
        this.dryRun = true;
        console.log('🔍 DRY RUN MODE ENABLED');
        console.log('   No changes will be executed');
        console.log('   Previewing operations only...\n');
    }

    disable() {
        this.dryRun = false;
        this.preview = [];
    }

    async previewCloudflareRequest(method, endpoint, data = null) {
        // Input validation
        if (!this.validateInput(method, endpoint, data)) {
            throw new Error('Invalid input parameters for dry-run preview');
        }
        
        // Enforce preview size limit
        if (this.preview.length >= this.maxPreviewSize) {
            this.preview.shift(); // Remove oldest entry
        }
        
        const operation = this.classifyOperation(method, endpoint, data);
        
        const preview = {
            timestamp: new Date().toISOString(),
            operation: operation.type,
            method,
            endpoint,
            data: data ? this.sanitizeData(data) : null,
            impact: operation.impact,
            risk: operation.risk
        };

        this.preview.push(preview);
        this.displayPreview(preview);

        // Return mock data for dry run
        return this.mockResponse(method, endpoint);
    }

    validateInput(method, endpoint, data) {
        // Validate HTTP method
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        if (!validMethods.includes(method.toUpperCase())) {
            return false;
        }
        
        // Validate endpoint format
        if (typeof endpoint !== 'string' || !endpoint.startsWith('/')) {
            return false;
        }
        
        // Validate data if present
        if (data && typeof data !== 'object') {
            return false;
        }
        
        return true;
    }

    sanitizeData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        
        const sanitized = JSON.parse(JSON.stringify(data));
        
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                const lowerKey = key.toLowerCase();
                if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }

    classifyOperation(method, endpoint, data) {
        const operation = {
            type: 'read',
            impact: 'low',
            risk: 'safe'
        };

        // Classify by method
        if (method === 'DELETE') {
            operation.type = 'destructive';
            operation.impact = 'high';
            operation.risk = 'dangerous';
        } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            operation.type = 'modify';
            operation.impact = 'medium';
            operation.risk = 'caution';
        }

        // Classify by endpoint patterns
        if (endpoint.includes('/delete') || endpoint.includes('/remove')) {
            operation.type = 'destructive';
            operation.impact = 'high';
            operation.risk = 'dangerous';
        }

        // Classify by data content
        if (data) {
            const dataStr = JSON.stringify(data).toLowerCase();
            if (this.dangerousOperations.some(op => dataStr.includes(op))) {
                operation.impact = operation.impact === 'high' ? 'high' : 'medium';
                operation.risk = operation.risk === 'dangerous' ? 'dangerous' : 'caution';
            }
        }

        return operation;
    }

    displayPreview(preview) {
        const icons = {
            safe: '✅',
            caution: '⚠️',
            dangerous: '🚨'
        };

        const impacts = {
            low: '🟢 Low',
            medium: '🟡 Medium', 
            high: '🔴 High'
        };

        console.log(`${icons[preview.risk]} ${preview.operation.toUpperCase()}: ${preview.method} ${preview.endpoint}`);
        console.log(`   Impact: ${impacts[preview.impact]}`);
        
        if (preview.data) {
            console.log(`   Data: ${preview.data.substring(0, 100)}${preview.data.length > 100 ? '...' : ''}`);
        }
        console.log('');
    }

    mockResponse(method, endpoint) {
        // Simulate potential errors based on operation type
        const errorRate = this.getErrorRate(method, endpoint);
        if (Math.random() < errorRate) {
            return {
                success: false,
                errors: [{ 
                    message: `Dry-run simulated error for ${method} ${endpoint}`,
                    code: 'DRY_RUN_ERROR'
                }]
            };
        }
        
        // Return realistic mock responses for dry run
        if (endpoint.includes('/zones/') && endpoint.includes('/dns_records')) {
            return {
                success: true,
                result: [
                    { id: 'mock123', name: 'mock.example.com', type: 'A', content: '192.168.1.1' }
                ]
            };
        }

        if (endpoint.includes('/zones/')) {
            return {
                success: true,
                result: {
                    id: 'mockzone',
                    name: 'example.com',
                    status: 'active'
                }
            };
        }

        return {
            success: true,
            result: { message: 'Dry run - operation would succeed' }
        };
    }

    getErrorRate(method, endpoint) {
        // Different error rates for different operations
        if (method === 'DELETE') return 0.1; // 10% error rate for deletes
        if (method === 'POST') return 0.05; // 5% error rate for creates
        if (method === 'PUT') return 0.05; // 5% error rate for updates
        return 0.01; // 1% error rate for reads
    }

    showSummary() {
        if (!this.dryRun) return;

        console.log('\n📋 DRY RUN SUMMARY');
        console.log('==================');
        
        const stats = this.preview.reduce((acc, op) => {
            acc[op.operation] = (acc[op.operation] || 0) + 1;
            acc.total++;
            return acc;
        }, { total: 0 });

        console.log(`Total Operations: ${stats.total}`);
        
        Object.entries(stats).forEach(([type, count]) => {
            if (type !== 'total') {
                console.log(`  ${type}: ${count}`);
            }
        });

        const dangerous = this.preview.filter(op => op.risk === 'dangerous').length;
        if (dangerous > 0) {
            console.log(`\n🚨 WARNING: ${dangerous} dangerous operation(s) detected!`);
        }

        console.log('\n💡 To execute these operations, run without --dryrun flag');
    }

    async confirmExecution() {
        if (!this.dryRun) return true;

        const dangerous = this.preview.filter(op => op.risk === 'dangerous').length;
        if (dangerous > 0) {
            console.log(`\n⚠️  This preview contains ${dangerous} dangerous operation(s).`);
            console.log('   Please review carefully before executing.');
        }

        return false; // Always return false in dry run mode
    }
}

// CLI Integration
function addDryRunOption(argv) {
    return argv.includes('--dryrun') || argv.includes('-n');
}

function wrapCloudflareRequest(originalFunction, dryRunManager) {
    return async function(method, endpoint, data = null) {
        if (dryRunManager.dryRun) {
            return await dryRunManager.previewCloudflareRequest(method, endpoint, data);
        }
        
        return await originalFunction.call(this, method, endpoint, data);
    };
}

module.exports = {
    DryRunManager,
    addDryRunOption,
    wrapCloudflareRequest
};
