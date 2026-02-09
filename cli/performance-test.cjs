#!/usr/bin/env node

/**
 * FactoryWager Performance Testing Suite
 * Comprehensive performance testing and benchmarking for CLI operations
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class PerformanceTester {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                averageResponseTime: 0,
                minResponseTime: Infinity,
                maxResponseTime: 0
            }
        };
        
        this.config = {
            iterations: 10,
            concurrentRequests: 5,
            timeout: 10000,
            domains: [
                'wiki.factory-wager.com',
                'docs.factory-wager.com',
                'api.factory-wager.com',
                'registry.factory-wager.com',
                'registry.factory-wager.com'
            ]
        };
    }

    async runTest(testName, testFunction, options = {}) {
        const { iterations = this.config.iterations, warmup = true } = options;
        
        console.log(`🧪 Running test: ${testName}`);
        
        const testResults = {
            name: testName,
            iterations,
            results: [],
            statistics: {},
            status: 'running'
        };

        // Warmup runs
        if (warmup) {
            console.log('  🔥 Warming up...');
            for (let i = 0; i < 3; i++) {
                try {
                    await testFunction();
                } catch (error) {
                    // Ignore warmup errors
                }
            }
        }

        // Actual test runs
        console.log(`  📊 Running ${iterations} iterations...`);
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            
            try {
                const result = await Promise.race([
                    testFunction(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), this.config.timeout)
                    )
                ]);
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                testResults.results.push({
                    iteration: i + 1,
                    duration,
                    success: true,
                    result: typeof result === 'object' ? 'object' : result
                });
                
                process.stdout.write('.');
                
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                testResults.results.push({
                    iteration: i + 1,
                    duration,
                    success: false,
                    error: error.message
                });
                
                process.stdout.write('x');
            }
        }

        console.log(''); // New line

        // Calculate statistics
        const successfulResults = testResults.results.filter(r => r.success);
        const durations = successfulResults.map(r => r.duration);
        
        if (durations.length > 0) {
            testResults.statistics = {
                totalRuns: testResults.results.length,
                successfulRuns: successfulResults.length,
                failedRuns: testResults.results.length - successfulResults.length,
                successRate: (successfulResults.length / testResults.results.length) * 100,
                averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                medianDuration: this.calculateMedian(durations),
                p95Duration: this.calculatePercentile(durations, 95),
                p99Duration: this.calculatePercentile(durations, 99)
            };
            
            testResults.status = testResults.statistics.successRate >= 90 ? 'passed' : 'failed';
        } else {
            testResults.statistics = {
                totalRuns: testResults.results.length,
                successfulRuns: 0,
                failedRuns: testResults.results.length,
                successRate: 0,
                error: 'All tests failed'
            };
            testResults.status = 'failed';
        }

        // Display results
        this.displayTestResults(testResults);

        // Add to overall results
        this.results.tests.push(testResults);
        this.updateSummary(testResults);

        return testResults;
    }

    async testDNSResolution() {
        return this.runTest('DNS Resolution', async () => {
            const domain = this.config.domains[Math.floor(Math.random() * this.config.domains.length)];
            
            const { execSync } = require('child_process');
            const result = execSync(`dig +short ${domain}`, { encoding: 'utf8', timeout: 5000 });
            
            return result.trim().length > 0;
        });
    }

    async testHTTPResponse() {
        return this.runTest('HTTP Response', async () => {
            const domain = this.config.domains[Math.floor(Math.random() * this.config.domains.length)];
            
            const response = await fetch(`https://${domain}`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
            });
            
            return response.ok;
        });
    }

    async testCLICommands() {
        const commands = [
            { name: 'help', command: './cli/fw-cli help' },
            { name: 'status', command: './cli/fw-cli status' },
            { name: 'domains list', command: './cli/fw-cli domains list' },
            { name: 'badges list', command: './cli/fw-cli badges list' }
        ];

        const results = [];
        
        for (const cmd of commands) {
            const result = await this.runTest(`CLI: ${cmd.name}`, async () => {
                const { execSync } = require('child_process');
                const output = execSync(cmd.command, { 
                    encoding: 'utf8', 
                    timeout: 10000,
                    cwd: process.cwd()
                });
                
                return output.length > 0;
            }, { iterations: 5 });
            
            results.push(result);
        }

        return results;
    }

    async testBadgeGeneration() {
        return this.runTest('Badge Generation', async () => {
            const { execSync } = require('child_process');
            const output = execSync('node cli/status-badges.cjs infrastructure', { 
                encoding: 'utf8', 
                timeout: 15000,
                cwd: process.cwd()
            });
            
            return output.includes('✅');
        }, { iterations: 3 });
    }

    async testConcurrentRequests() {
        console.log('🧪 Running test: Concurrent HTTP Requests');
        
        const testResults = {
            name: 'Concurrent HTTP Requests',
            concurrency: this.config.concurrentRequests,
            results: [],
            statistics: {},
            status: 'running'
        };

        for (let i = 0; i < this.config.iterations; i++) {
            console.log(`  📊 Batch ${i + 1}/${this.config.iterations}...`);
            
            const startTime = performance.now();
            const promises = [];
            
            for (let j = 0; j < this.config.concurrentRequests; j++) {
                const domain = this.config.domains[j % this.config.domains.length];
                promises.push(
                    fetch(`https://${domain}`, {
                        method: 'HEAD',
                        signal: AbortSignal.timeout(5000)
                    }).then(response => ({
                        domain,
                        status: response.status,
                        success: response.ok
                    })).catch(error => ({
                        domain,
                        error: error.message,
                        success: false
                    }))
                );
            }

            try {
                const results = await Promise.all(promises);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                const successful = results.filter(r => r.success).length;
                
                testResults.results.push({
                    iteration: i + 1,
                    duration,
                    success: successful >= this.config.concurrentRequests * 0.8, // 80% success rate
                    successfulRequests: successful,
                    totalRequests: this.config.concurrentRequests,
                    details: results
                });
                
                console.log(`    ✅ ${successful}/${this.config.concurrentRequests} successful (${duration.toFixed(0)}ms)`);
                
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                testResults.results.push({
                    iteration: i + 1,
                    duration,
                    success: false,
                    error: error.message,
                    successfulRequests: 0,
                    totalRequests: this.config.concurrentRequests
                });
                
                console.log(`    ❌ Failed (${duration.toFixed(0)}ms): ${error.message}`);
            }
        }

        // Calculate statistics
        const successfulResults = testResults.results.filter(r => r.success);
        const durations = successfulResults.map(r => r.duration);
        
        if (durations.length > 0) {
            testResults.statistics = {
                totalRuns: testResults.results.length,
                successfulRuns: successfulResults.length,
                failedRuns: testResults.results.length - successfulResults.length,
                successRate: (successfulResults.length / testResults.results.length) * 100,
                averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                totalRequests: testResults.results.reduce((sum, r) => sum + r.totalRequests, 0),
                successfulRequests: testResults.results.reduce((sum, r) => sum + r.successfulRequests, 0),
                averageSuccessRate: (testResults.results.reduce((sum, r) => sum + (r.successfulRequests / r.totalRequests), 0) / testResults.results.length) * 100
            };
            
            testResults.status = testResults.statistics.successRate >= 80 ? 'passed' : 'failed';
        }

        this.displayTestResults(testResults);
        this.results.tests.push(testResults);
        this.updateSummary(testResults);

        return testResults;
    }

    async testMemoryUsage() {
        console.log('🧪 Running test: Memory Usage');
        
        const initialMemory = process.memoryUsage();
        
        const testResults = {
            name: 'Memory Usage',
            measurements: [],
            statistics: {},
            status: 'running'
        };

        // Measure memory over time
        for (let i = 0; i < 20; i++) {
            const memBefore = process.memoryUsage();
            
            // Perform some operations
            await this.testHTTPResponse();
            
            const memAfter = process.memoryUsage();
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const memFinal = process.memoryUsage();
            
            testResults.measurements.push({
                iteration: i + 1,
                heapUsed: memAfter.heapUsed,
                heapTotal: memAfter.heapTotal,
                external: memAfter.external,
                rss: memAfter.rss,
                heapDelta: memAfter.heapUsed - memBefore.heapUsed,
                heapAfterGC: memFinal.heapUsed
            });
            
            // Small delay between measurements
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Calculate statistics
        const heapUsages = testResults.measurements.map(m => m.heapUsed);
        
        testResults.statistics = {
            measurements: testResults.measurements.length,
            initialHeapUsed: initialMemory.heapUsed,
            finalHeapUsed: heapUsages[heapUsages.length - 1],
            averageHeapUsed: heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length,
            minHeapUsed: Math.min(...heapUsages),
            maxHeapUsed: Math.max(...heapUsages),
            heapGrowth: heapUsages[heapUsages.length - 1] - initialMemory.heapUsed,
            averageHeapDelta: testResults.measurements.reduce((sum, m) => sum + m.heapDelta, 0) / testResults.measurements.length
        };

        testResults.status = testResults.statistics.heapGrowth < 50 * 1024 * 1024 ? 'passed' : 'failed'; // Less than 50MB growth

        this.displayTestResults(testResults);
        this.results.tests.push(testResults);
        this.updateSummary(testResults);

        return testResults;
    }

    async runFullSuite() {
        console.log('🚀 Starting FactoryWager Performance Test Suite\n');
        console.log(`📊 Configuration:`);
        console.log(`   Iterations per test: ${this.config.iterations}`);
        console.log(`   Concurrent requests: ${this.config.concurrentRequests}`);
        console.log(`   Timeout: ${this.config.timeout}ms`);
        console.log(`   Test domains: ${this.config.domains.length}`);
        console.log('');

        const startTime = performance.now();

        try {
            // Run all tests
            await this.testDNSResolution();
            console.log('');
            
            await this.testHTTPResponse();
            console.log('');
            
            await this.testCLICommands();
            console.log('');
            
            await this.testBadgeGeneration();
            console.log('');
            
            await this.testConcurrentRequests();
            console.log('');
            
            await this.testMemoryUsage();
            console.log('');

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        }

        const endTime = performance.now();
        const totalDuration = endTime - startTime;

        // Display final summary
        this.displayFinalSummary(totalDuration);

        // Save results
        await this.saveResults();

        return this.results;
    }

    displayTestResults(testResults) {
        const stats = testResults.statistics;
        const status = testResults.status === 'passed' ? '✅' : '❌';
        
        console.log(`  ${status} ${testResults.name}`);
        
        if (stats.averageDuration !== undefined) {
            console.log(`     ⏱️  Average: ${stats.averageDuration.toFixed(2)}ms`);
            console.log(`     📊 Range: ${stats.minDuration.toFixed(2)}ms - ${stats.maxDuration.toFixed(2)}ms`);
            console.log(`     📈 Success Rate: ${stats.successRate.toFixed(1)}%`);
            
            if (stats.p95Duration !== undefined) {
                console.log(`     🎯 P95: ${stats.p95Duration.toFixed(2)}ms`);
                console.log(`     🎯 P99: ${stats.p99Duration.toFixed(2)}ms`);
            }
        }
        
        if (stats.totalRequests !== undefined) {
            console.log(`     🌐 Total Requests: ${stats.totalRequests}`);
            console.log(`     ✅ Successful: ${stats.successfulRequests} (${stats.averageSuccessRate.toFixed(1)}%)`);
        }
        
        if (stats.heapUsed !== undefined) {
            console.log(`     💾 Average Heap: ${this.formatFileSize(stats.averageHeapUsed)}`);
            console.log(`     📈 Heap Growth: ${this.formatFileSize(stats.heapGrowth)}`);
        }
        
        if (stats.error) {
            console.log(`     ❌ Error: ${stats.error}`);
        }
    }

    displayFinalSummary(totalDuration) {
        console.log('📊 Final Performance Summary');
        console.log('============================');
        
        const passedTests = this.results.tests.filter(t => t.status === 'passed').length;
        const totalTests = this.results.tests.length;
        
        console.log(`📋 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${totalTests - passedTests}`);
        console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`⏱️  Total Duration: ${totalDuration.toFixed(0)}ms`);
        console.log('');

        // Performance grades
        const grade = this.calculatePerformanceGrade();
        console.log(`🏆 Performance Grade: ${grade}`);
        
        if (grade.startsWith('A')) {
            console.log('🎉 Excellent performance!');
        } else if (grade.startsWith('B')) {
            console.log('👍 Good performance!');
        } else if (grade.startsWith('C')) {
            console.log('⚠️  Performance needs improvement.');
        } else {
            console.log('🚨 Poor performance - immediate attention required.');
        }
    }

    calculatePerformanceGrade() {
        const passedTests = this.results.tests.filter(t => t.status === 'passed').length;
        const totalTests = this.results.tests.length;
        const successRate = passedTests / totalTests;
        
        if (successRate >= 0.95) return 'A+';
        if (successRate >= 0.90) return 'A';
        if (successRate >= 0.85) return 'B+';
        if (successRate >= 0.80) return 'B';
        if (successRate >= 0.70) return 'C';
        if (successRate >= 0.60) return 'D';
        return 'F';
    }

    updateSummary(testResults) {
        this.results.summary.totalTests++;
        
        if (testResults.status === 'passed') {
            this.results.summary.passedTests++;
        } else {
            this.results.summary.failedTests++;
        }
        
        if (testResults.statistics.averageDuration !== undefined) {
            this.results.summary.minResponseTime = Math.min(
                this.results.summary.minResponseTime,
                testResults.statistics.minDuration
            );
            
            this.results.summary.maxResponseTime = Math.max(
                this.results.summary.maxResponseTime,
                testResults.statistics.maxDuration
            );
            
            // Update running average
            const allDurations = this.results.tests
                .filter(t => t.statistics.averageDuration !== undefined)
                .map(t => t.statistics.averageDuration);
            
            this.results.summary.averageResponseTime = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
        }
    }

    async saveResults() {
        const resultsDir = path.join(process.cwd(), 'test-results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = path.join(resultsDir, `performance-results-${timestamp}.json`);
        
        fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
        
        // Also save HTML report
        await this.generateHTMLReport(resultsFile.replace('.json', '.html'));
        
        console.log(`\n📁 Results saved: ${resultsFile}`);
        console.log(`🌐 HTML Report: ${resultsFile.replace('.json', '.html')}`);
    }

    async generateHTMLReport(outputPath) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FactoryWager Performance Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8fafc;
        }
        .header {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .metric {
            background: white;
            padding: 1.5rem;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #1e293b;
        }
        .metric-label {
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
        .test-results {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .test-item {
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .status-passed { color: #22c55e; }
        .status-failed { color: #ef4444; }
        .timestamp {
            text-align: center;
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 FactoryWager Performance Report</h1>
        <p>Generated on ${new Date(this.results.timestamp).toLocaleString()}</p>
        <p>Performance Grade: <strong>${this.calculatePerformanceGrade()}</strong></p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${this.results.summary.totalTests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.results.summary.passedTests}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.results.summary.failedTests}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${((this.results.summary.passedTests / this.results.summary.totalTests) * 100).toFixed(1)}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.results.summary.averageResponseTime.toFixed(2)}ms</div>
            <div class="metric-label">Avg Response</div>
        </div>
    </div>

    <div class="test-results">
        <h2>📊 Test Results</h2>
        ${this.results.tests.map(test => `
            <div class="test-item">
                <h3 class="status-${test.status}">${test.status === 'passed' ? '✅' : '❌'} ${test.name}</h3>
                ${test.statistics.averageDuration ? `
                    <p>Average Duration: ${test.statistics.averageDuration.toFixed(2)}ms</p>
                    <p>Success Rate: ${test.statistics.successRate.toFixed(1)}%</p>
                    <p>Range: ${test.statistics.minDuration.toFixed(2)}ms - ${test.statistics.maxDuration.toFixed(2)}ms</p>
                ` : ''}
                ${test.statistics.totalRequests ? `
                    <p>Total Requests: ${test.statistics.totalRequests}</p>
                    <p>Successful: ${test.statistics.successfulRequests} (${test.statistics.averageSuccessRate.toFixed(1)}%)</p>
                ` : ''}
            </div>
        `).join('')}
    </div>

    <div class="timestamp">
        Report generated by FactoryWager Performance Testing Suite
    </div>
</body>
</html>`;

        fs.writeFileSync(outputPath, html);
    }

    // Helper methods
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// CLI usage
if (require.main === module) {
    const tester = new PerformanceTester();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'dns':
            tester.testDNSResolution()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'http':
            tester.testHTTPResponse()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'cli':
            tester.testCLICommands()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'badges':
            tester.testBadgeGeneration()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'concurrent':
            tester.testConcurrentRequests()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'memory':
            tester.testMemoryUsage()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'all':
        default:
            tester.runFullSuite()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Test suite failed:', error.message);
                    process.exit(1);
                });
            break;
    }
}

module.exports = PerformanceTester;
