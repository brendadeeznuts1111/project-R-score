// packages/testing/src/scripts/run-rotation-tests.ts

import { spawn } from 'bun';

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    coverage?: number;
}

class RotationTestRunner {
    private results: TestResult[] = [];

    async runCommand(command: string, args: string[]): Promise<TestResult> {
        const start = Date.now();

        try {
            const proc = spawn({
                cmd: [command, ...args],
                stdout: 'pipe',
                stderr: 'pipe'
            });

            const [stdout, stderr] = await Promise.all([
                proc.exited.then(() => proc.stdout?.text() || ''),
                proc.exited.then(() => proc.stderr?.text() || '')
            ]);

            const duration = Date.now() - start;
            const passed = proc.exitCode === 0;

            const result: TestResult = {
                name: args.join(' '),
                passed,
                duration
            };

            this.results.push(result);

            if (!passed) {
                console.error(`❌ ${args.join(' ')} failed:`);
                console.error(stderr);
            } else {
                console.log(`✅ ${args.join(' ')} passed in ${duration}ms`);
            }

            return result;

        } catch (error) {
            const duration = Date.now() - start;
            const result: TestResult = {
                name: args.join(' '),
                passed: false,
                duration
            };

            this.results.push(result);
            console.error(`❌ ${args.join(' ')} crashed:`, error);

            return result;
        }
    }

    async runAllTests(): Promise<void> {
        console.log('🚀 Starting Comprehensive Rotation Number Test Suite\n');

        const testCommands = [
            // Basic rotation number tests
            ['bun', 'test', 'src/domain/rotation-numbers/', '--coverage'],

            // Property tests with concurrency
            ['bun', 'test', 'src/domain/rotation-numbers/property/', '--concurrent', '--max-concurrency', '20'],

            // Type tests
            ['bun', 'test', 'src/domain/rotation-numbers/types/'],

            // Integration tests
            ['bun', 'test', 'src/domain/rotation-numbers/integration/'],

            // Benchmarks
            ['bun', 'test', 'src/benchmarks/rotation-processing.bench.ts', '--bench'],

            // Randomized tests to catch dependencies
            ['bun', 'test', 'src/domain/rotation-numbers/', '--randomize', '--seed', Date.now().toString()],

            // CI mode (strict)
            ['bun', 'test', 'src/domain/rotation-numbers/', '--ci', '--reporter', 'junit', '--output-file', 'test-results/rotation-numbers.xml']
        ];

        // Create test results directory
        await this.ensureDirectory('test-results');

        for (const command of testCommands) {
            await this.runCommand(command[0], command.slice(1));
            console.log(''); // Add spacing between tests
        }

        this.printSummary();
        this.validateSuccessMetrics();
    }

    private async ensureDirectory(path: string): Promise<void> {
        try {
            await spawn(['mkdir', '-p', path]).exited;
        } catch (error) {
            // Directory might already exist
        }
    }

    private printSummary(): void {
        console.log('📊 Test Execution Summary');
        console.log('='.repeat(50));

        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ${failed > 0 ? '❌' : '✅'}`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Average Duration: ${Math.round(totalDuration / this.results.length)}ms`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}`);
            });
        }
    }

    private validateSuccessMetrics(): void {
        console.log('\n🎯 Success Metrics Validation');
        console.log('='.repeat(50));

        const metrics = [
            {
                name: 'Execution Time',
                target: '< 15s',
                actual: `${Math.round(this.results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s`,
                passed: this.results.reduce((sum, r) => sum + r.duration, 0) < 15000
            },
            {
                name: 'Test Success Rate',
                target: '100%',
                actual: `${Math.round((this.results.filter(r => r.passed).length / this.results.length) * 100)}%`,
                passed: this.results.every(r => r.passed)
            },
            {
                name: 'Individual Test Duration',
                target: '< 30s',
                actual: `${Math.round(Math.max(...this.results.map(r => r.duration)) / 1000)}s`,
                passed: this.results.every(r => r.duration < 30000)
            }
        ];

        metrics.forEach(metric => {
            const status = metric.passed ? '✅' : '❌';
            console.log(`${status} ${metric.name}: ${metric.actual} (Target: ${metric.target})`);
        });

        const allPassed = metrics.every(m => m.passed);
        if (allPassed) {
            console.log('\n🎉 All success metrics achieved!');
        } else {
            console.log('\n⚠️  Some success metrics not met. Review results above.');
        }
    }

    async runPropertyTestsOnly(): Promise<void> {
        console.log('🧪 Running Property Tests Only\n');

        await this.runCommand('bun', [
            'test',
            'src/domain/rotation-numbers/property/',
            '--concurrent',
            '--max-concurrency', '20'
        ]);

        this.printSummary();
    }

    async runBenchmarksOnly(): Promise<void> {
        console.log('📈 Running Benchmarks Only\n');

        await this.runCommand('bun', [
            'test',
            'src/benchmarks/rotation-processing.bench.ts',
            '--bench'
        ]);

        this.printSummary();
    }

    async runCI(): Promise<void> {
        console.log('🤖 Running CI Mode (Strict)\n');

        await this.ensureDirectory('test-results');

        await this.runCommand('bun', [
            'test',
            'src/domain/rotation-numbers/',
            '--ci',
            '--coverage',
            '--reporter', 'junit',
            '--output-file', 'test-results/rotation-numbers.xml'
        ]);

        this.printSummary();
    }
}

// CLI interface
async function main() {
    const runner = new RotationTestRunner();
    const args = process.argv.slice(2);

    switch (args[0]) {
        case 'property':
            await runner.runPropertyTestsOnly();
            break;
        case 'benchmarks':
            await runner.runBenchmarksOnly();
            break;
        case 'ci':
            await runner.runCI();
            break;
        case 'all':
        default:
            await runner.runAllTests();
            break;
    }
}

// Export for programmatic use
export { RotationTestRunner };

// Run if called directly
if (import.meta.main) {
    main().catch(console.error);
}
