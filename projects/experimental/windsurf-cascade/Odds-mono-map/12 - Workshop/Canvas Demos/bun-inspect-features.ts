#!/usr/bin/env bun
/**
 * Bun.inspect Features Demonstration
 * 
 * Showcasing the powerful Bun.inspect API including:
 * - Basic serialization with Bun.inspect()
 * - Custom object formatting with Bun.inspect.custom
 * - Tabular data formatting with Bun.inspect.table()
 * - Advanced serialization options
 * 
 * Usage:
 *   bun run bun-inspect-features.ts
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

console.info('🎯 Bun.inspect Features Demonstration');
console.info('====================================');

// =============================================================================
// BASIC BUN.INSPECT() DEMONSTRATION
// =============================================================================

console.info('\n📋 Basic Bun.inspect() Examples:');
console.info('=================================');

// Simple object serialization
const obj = { foo: "bar", nested: { deep: "value" } };
const str = Bun.inspect(obj);
console.info('Object:', obj);
console.info('Serialized:', str);
console.info('');

// TypedArray serialization
const uint8Array = new Uint8Array([1, 2, 3, 255, 128, 0]);
console.info('Uint8Array:', uint8Array);
console.info('Serialized:', Bun.inspect(uint8Array));
console.info('');

// =============================================================================
// BUN.INSPECT.CUSTOM DEMONSTRATION
// =============================================================================

console.info('🎨 Bun.inspect.custom Examples:');
console.info('===============================');

// Custom class with inspect override
class CanvasService {
    constructor(
        public name: string,
        public status: 'active' | 'beta' | 'deprecated',
        public metrics: { requests: number; errors: number }
    ) { }

    [Bun.inspect.custom]() {
        const statusColor = this.status === 'active' ? '🟢' :
            this.status === 'beta' ? '🟡' : '🔴';
        const errorRate = ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2);

        return `🚀 CanvasService[${this.name}] ${statusColor} | Requests: ${this.metrics.requests.toLocaleString()} | Error Rate: ${errorRate}%`;
    }
}

// Custom API Response class
class APIResponse {
    constructor(
        public success: boolean,
        public data: any,
        public metadata: { timestamp: Date; requestId: string }
    ) { }

    [Bun.inspect.custom]() {
        const icon = this.success ? '✅' : '❌';
        const time = this.metadata.timestamp.toISOString();
        return `${icon} APIResponse[${this.metadata.requestId}] at ${time}`;
    }
}

// Test custom inspection
const service = new CanvasService('Bridge', 'active', { requests: 1000000, errors: 42 });
const response = new APIResponse(true, { user: 'test' }, {
    timestamp: new Date(),
    requestId: 'req_abc123'
});

console.info('Custom Service:');
console.info(service);
console.info('');

console.info('Custom Response:');
console.info(response);
console.info('');

// =============================================================================
// BUN.INSPECT.TABLE DEMONSTRATION
// =============================================================================

console.info('📊 Bun.inspect.table Examples:');
console.info('==============================');

// Basic table example
const services = [
    { name: 'Bridge', status: 'active', requests: 1000000, errors: 42, uptime: '99.9%' },
    { name: 'Analytics', status: 'beta', requests: 500000, errors: 125, uptime: '98.5%' },
    { name: 'Monitor', status: 'active', requests: 750000, errors: 23, uptime: '99.7%' }
];

console.info('Basic Service Table:');
console.info(Bun.inspect.table(services, { colors: true }));
console.info('');

// Table with specific properties
console.info('Table with Selected Properties:');
console.info(Bun.inspect.table(services, ['name', 'status', 'uptime'], { colors: true }));
console.info('');

// API metrics table
const apiMetrics = [
    {
        endpoint: '/api/users',
        method: 'GET',
        avgResponseTime: 125.5,
        p95ResponseTime: 280.3,
        requestsPerMinute: 450,
        errorRate: 0.02
    },
    {
        endpoint: '/api/auth',
        method: 'POST',
        avgResponseTime: 89.2,
        p95ResponseTime: 156.7,
        requestsPerMinute: 120,
        errorRate: 0.01
    }
];

console.info('API Metrics Table:');
console.info(Bun.inspect.table(apiMetrics, { colors: true }));
console.info('');

// =============================================================================
// ADVANCED SERIALIZATION OPTIONS
// =============================================================================

console.info('🔧 Advanced Serialization Options:');
console.info('===================================');

const complexObj = {
    services: Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        name: `Service ${i + 1}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        metrics: {
            requests: Math.floor(Math.random() * 1000000),
            errors: Math.floor(Math.random() * 100)
        }
    })),
    metadata: {
        timestamp: new Date(),
        version: '2.1.0',
        environment: 'production'
    }
};

console.info('Compact serialization:');
console.info(Bun.inspect(complexObj, { compact: true, colors: false }));
console.info('');

console.info('Detailed serialization with depth control:');
console.info(Bun.inspect(complexObj, {
    compact: false,
    colors: true,
    depth: 4,
    maxStringLength: 15
}));
console.info('');

// =============================================================================
// PERFORMANCE COMPARISON
// =============================================================================

console.info('⚡ Performance Comparison:');
console.info('==========================');

const iterations = 1000;
const testObj = { data: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `item-${i}` })) };

// Test different serialization methods
const methods = [
    { name: 'Bun.inspect (compact)', options: { compact: true, colors: false } },
    { name: 'Bun.inspect (detailed)', options: { compact: false, colors: false } },
    { name: 'Bun.inspect (depth 4)', options: { depth: 4, colors: false } },
    { name: 'Bun.inspect (depth 2)', options: { depth: 2, colors: false } }
];

for (const method of methods) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        Bun.inspect(testObj, method.options);
    }
    const duration = performance.now() - start;
    const opsPerSec = Math.round(iterations / duration * 1000);

    console.info(`${method.name}: ${opsPerSec.toLocaleString()} ops/sec (${duration.toFixed(2)}ms)`);
}

// =============================================================================
// DEPTH CONTROL DEMONSTRATION
// =============================================================================

console.info('\n🔍 Depth Control Demonstration:');
console.info('===============================');

const nestedData = { a: { b: { c: { d: "deep" } } } };

console.info('Default console.log (depth 2):');
console.info(nestedData);
console.info('');

console.info('Bun.inspect with depth 4:');
console.info(Bun.inspect(nestedData, { depth: 4, colors: true }));
console.info('');

console.info('Bun.inspect with depth 2:');
console.info(Bun.inspect(nestedData, { depth: 2, colors: true }));
console.info('');

// =============================================================================
// REAL-WORLD EXAMPLES
// =============================================================================

console.info('🌐 Real-World Examples:');
console.info('========================');

// API response with custom formatting
class ServiceStatus {
    constructor(
        public serviceName: string,
        public status: 'healthy' | 'degraded' | 'down',
        public metrics: { responseTime: number; errorRate: number; uptime: number }
    ) { }

    [Bun.inspect.custom]() {
        const icon = this.status === 'healthy' ? '🟢' :
            this.status === 'degraded' ? '🟡' : '🔴';
        return `${icon} ${this.serviceName}: ${this.metrics.responseTime}ms | ${this.metrics.errorRate}% errors | ${this.metrics.uptime}% uptime`;
    }
}

const systemStatus = [
    new ServiceStatus('Bridge', 'healthy', { responseTime: 125, errorRate: 0.01, uptime: 99.9 }),
    new ServiceStatus('Analytics', 'degraded', { responseTime: 280, errorRate: 0.05, uptime: 98.5 }),
    new ServiceStatus('Monitor', 'healthy', { responseTime: 89, errorRate: 0.00, uptime: 99.7 })
];

console.info('System Services Status:');
systemStatus.forEach(service => console.info(service));
console.info('');

console.info('System Services Table:');
console.info(Bun.inspect.table(systemStatus.map(s => ({
    service: s.serviceName,
    status: s.status,
    responseTime: `${s.metrics.responseTime}ms`,
    errorRate: `${s.metrics.errorRate}%`,
    uptime: `${s.metrics.uptime}%`
})), { colors: true }));

console.info('\n🎉 Bun.inspect Features Demo Complete!');
console.info('🔍 You now understand the power of Bun.inspect() API!');
console.info('💡 Use these features for better debugging and logging!');
