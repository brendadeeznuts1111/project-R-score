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

console.log('🎯 Bun.inspect Features Demonstration');
console.log('====================================');

// =============================================================================
// BASIC BUN.INSPECT() DEMONSTRATION
// =============================================================================

console.log('\n📋 Basic Bun.inspect() Examples:');
console.log('=================================');

// Simple object serialization
const obj = { foo: "bar", nested: { deep: "value" } };
const str = Bun.inspect(obj);
console.log('Object:', obj);
console.log('Serialized:', str);
console.log('');

// TypedArray serialization
const uint8Array = new Uint8Array([1, 2, 3, 255, 128, 0]);
console.log('Uint8Array:', uint8Array);
console.log('Serialized:', Bun.inspect(uint8Array));
console.log('');

// =============================================================================
// BUN.INSPECT.CUSTOM DEMONSTRATION
// =============================================================================

console.log('🎨 Bun.inspect.custom Examples:');
console.log('===============================');

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

console.log('Custom Service:');
console.log(service);
console.log('');

console.log('Custom Response:');
console.log(response);
console.log('');

// =============================================================================
// BUN.INSPECT.TABLE DEMONSTRATION
// =============================================================================

console.log('📊 Bun.inspect.table Examples:');
console.log('==============================');

// Basic table example
const services = [
    { name: 'Bridge', status: 'active', requests: 1000000, errors: 42, uptime: '99.9%' },
    { name: 'Analytics', status: 'beta', requests: 500000, errors: 125, uptime: '98.5%' },
    { name: 'Monitor', status: 'active', requests: 750000, errors: 23, uptime: '99.7%' }
];

console.log('Basic Service Table:');
console.log(Bun.inspect.table(services, { colors: true }));
console.log('');

// Table with specific properties
console.log('Table with Selected Properties:');
console.log(Bun.inspect.table(services, ['name', 'status', 'uptime'], { colors: true }));
console.log('');

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

console.log('API Metrics Table:');
console.log(Bun.inspect.table(apiMetrics, { colors: true }));
console.log('');

// =============================================================================
// ADVANCED SERIALIZATION OPTIONS
// =============================================================================

console.log('🔧 Advanced Serialization Options:');
console.log('===================================');

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

console.log('Compact serialization:');
console.log(Bun.inspect(complexObj, { compact: true, colors: false }));
console.log('');

console.log('Detailed serialization with depth control:');
console.log(Bun.inspect(complexObj, {
    compact: false,
    colors: true,
    depth: 4,
    maxStringLength: 15
}));
console.log('');

// =============================================================================
// PERFORMANCE COMPARISON
// =============================================================================

console.log('⚡ Performance Comparison:');
console.log('==========================');

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

    console.log(`${method.name}: ${opsPerSec.toLocaleString()} ops/sec (${duration.toFixed(2)}ms)`);
}

// =============================================================================
// DEPTH CONTROL DEMONSTRATION
// =============================================================================

console.log('\n🔍 Depth Control Demonstration:');
console.log('===============================');

const nestedData = { a: { b: { c: { d: "deep" } } } };

console.log('Default console.log (depth 2):');
console.log(nestedData);
console.log('');

console.log('Bun.inspect with depth 4:');
console.log(Bun.inspect(nestedData, { depth: 4, colors: true }));
console.log('');

console.log('Bun.inspect with depth 2:');
console.log(Bun.inspect(nestedData, { depth: 2, colors: true }));
console.log('');

// =============================================================================
// REAL-WORLD EXAMPLES
// =============================================================================

console.log('🌐 Real-World Examples:');
console.log('========================');

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

console.log('System Services Status:');
systemStatus.forEach(service => console.log(service));
console.log('');

console.log('System Services Table:');
console.log(Bun.inspect.table(systemStatus.map(s => ({
    service: s.serviceName,
    status: s.status,
    responseTime: `${s.metrics.responseTime}ms`,
    errorRate: `${s.metrics.errorRate}%`,
    uptime: `${s.metrics.uptime}%`
})), { colors: true }));

console.log('\n🎉 Bun.inspect Features Demo Complete!');
console.log('🔍 You now understand the power of Bun.inspect() API!');
console.log('💡 Use these features for better debugging and logging!');
