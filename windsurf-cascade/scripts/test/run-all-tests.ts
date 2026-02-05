#!/usr/bin/env bun

import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';

import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface TestResult {
  success: boolean;
  package: string;
  duration: number;
  tests: number;
  passed: number;
  failed: number;
  coverage?: number;
  error?: string;
}

class Tester {
  private packages: string[] = [
    'packages/odds-core',
    'packages/odds-websocket',
    'packages/odds-arbitrage',
    'packages/odds-ml',
    'packages/odds-temporal',
    'packages/odds-validation',
    'apps/dashboard',
    'apps/api-gateway',
    'apps/stream-processor'
  ];

  private propertyTests: string = 'property-tests';

  async testAll(options: TestOptions = {}): Promise<void> {
    console.log('🧪 Running all tests...\n');
    
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Run unit tests first
    if (options.unit !== false) {
      console.log('📋 Running unit tests...\n');
      for (const pkg of this.packages) {
        const result = await this.testPackage(pkg, options);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ ${pkg} - ${result.passed}/${result.tests} passed - ${result.duration}ms`);
        } else {
          console.log(`❌ ${pkg} - ${result.error}`);
        }
      }
    }

    // Run property tests
    if (options.property !== false) {
      console.log('\n🔬 Running property tests...\n');
      const propertyResult = await this.runPropertyTests(options);
      results.push(propertyResult);
      
      if (propertyResult.success) {
        console.log(`✅ Property tests - ${propertyResult.passed}/${propertyResult.tests} passed - ${propertyResult.duration}ms`);
      } else {
        console.log(`❌ Property tests - ${propertyResult.error}`);
      }
    }

    const totalTime = Date.now() - startTime;
    this.printSummary(results, totalTime);
  }

  async testPackage(packagePath: string, options: TestOptions = {}): Promise<TestResult> {
    if (!existsSync(packagePath)) {
      return {
        success: false,
        package: packagePath,
        duration: 0,
        tests: 0,
        passed: 0,
        failed: 0,
        error: 'Package directory does not exist'
      };
    }

    const packageJsonPath = `${packagePath}/package.json`;
    if (!existsSync(packageJsonPath)) {
      return {
        success: false,
        package: packagePath,
        duration: 0,
        tests: 0,
        passed: 0,
        failed: 0,
        error: 'package.json not found'
      };
    }

    const startTime = Date.now();

    try {
      // Check if package has test script
      const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());
      if (!packageJson.scripts?.test) {
        return {
          success: true,
          package: packagePath,
          duration: Date.now() - startTime,
          tests: 0,
          passed: 0,
          failed: 0,
          error: 'No test script found (skipped)'
        };
      }

      // Run test command
      const testCommand = options.coverage 
        ? `cd ${packagePath} && bun run test --coverage`
        : `cd ${packagePath} && bun run test`;
      
      const output = execSync(testCommand, { 
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      }).toString();

      // Parse test results (simplified parsing)
      const testCount = this.parseTestCount(output);
      const passedCount = this.parsePassedCount(output);
      const failedCount = this.parseFailedCount(output);
      const coverage = options.coverage ? this.parseCoverage(output) : undefined;

      return {
        success: failedCount === 0,
        package: packagePath,
        duration: Date.now() - startTime,
        tests: testCount,
        passed: passedCount,
        failed: failedCount,
        coverage
      };

    } catch (error) {
      return {
        success: false,
        package: packagePath,
        duration: Date.now() - startTime,
        tests: 0,
        passed: 0,
        failed: 1,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runPropertyTests(options: TestOptions = {}): Promise<TestResult> {
    const startTime = Date.now();

    try {
      if (!existsSync(this.propertyTests)) {
        return {
          success: false,
          package: this.propertyTests,
          duration: 0,
          tests: 0,
          passed: 0,
          failed: 0,
          error: 'Property tests directory does not exist'
        };
      }

      const testCommand = options.coverage
        ? `cd ${this.propertyTests} && bun run test:coverage`
        : `cd ${this.propertyTests} && bun run test`;
      
      const output = execSync(testCommand, { 
        stdio: 'pipe',
        timeout: 600000 // 10 minutes timeout for property tests
      }).toString();

      const testCount = this.parseTestCount(output);
      const passedCount = this.parsePassedCount(output);
      const failedCount = this.parseFailedCount(output);
      const coverage = options.coverage ? this.parseCoverage(output) : undefined;

      return {
        success: failedCount === 0,
        package: this.propertyTests,
        duration: Date.now() - startTime,
        tests: testCount,
        passed: passedCount,
        failed: failedCount,
        coverage
      };

    } catch (error) {
      return {
        success: false,
        package: this.propertyTests,
        duration: Date.now() - startTime,
        tests: 0,
        passed: 0,
        failed: 1,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async testSingle(packageName: string, options: TestOptions = {}): Promise<void> {
    const packagePath = this.packages.find(p => p.includes(packageName));
    
    if (!packagePath) {
      console.error(`❌ Package '${packageName}' not found`);
      console.log('Available packages:', this.packages);
      process.exit(1);
    }

    console.log(`🧪 Testing single package: ${packagePath}`);
    
    const result = await this.testPackage(packagePath, options);
    
    if (result.success) {
      console.log(`✅ ${packagePath} - ${result.passed}/${result.tests} passed - ${result.duration}ms`);
      if (result.coverage) {
        console.log(`📊 Coverage: ${result.coverage}%`);
      }
    } else {
      console.log(`❌ ${packagePath} test failed: ${result.error}`);
      process.exit(1);
    }
  }

  async watch(packageName?: string): Promise<void> {
    console.log('👀 Starting watch mode...');
    
    const testCommand = packageName 
      ? `cd packages/${packageName} && bun run test:watch`
      : `bun run test:watch`;
    
    try {
      execSync(testCommand, { stdio: 'inherit' });
    } catch (error) {
      console.error('Watch mode failed:', error);
      process.exit(1);
    }
  }

  private parseTestCount(output: string): number {
    const match = output.match(/(\d+)\s+test/);
    return match ? parseInt(match[1]) : 0;
  }

  private parsePassedCount(output: string): number {
    const match = output.match(/(\d+)\s+pass/);
    return match ? parseInt(match[1]) : 0;
  }

  private parseFailedCount(output: string): number {
    const match = output.match(/(\d+)\s+fail/);
    return match ? parseInt(match[1]) : 0;
  }

  private parseCoverage(output: string): number {
    const match = output.match(/All files\s+\|\s+([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private printSummary(results: TestResult[], totalTime: number): void {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const totalTests = results.reduce((sum, r) => sum + r.tests, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    console.log(`\n📊 Test Summary:`);
    console.log(`   Packages: ${results.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Tests: ${totalPassed}/${totalTests} passed`);
    console.log(`   Total time: ${totalTime}ms`);

    if (failed.length > 0) {
      console.log('\n❌ Failed packages:');
      failed.forEach(result => {
        console.log(`   - ${result.package}: ${result.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed');
    }
  }
}

interface TestOptions {
  coverage?: boolean;
  unit?: boolean;
  property?: boolean;
  watch?: boolean;
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const packageName = process.argv[3];
  const options: TestOptions = {
    coverage: process.argv.includes('--coverage'),
    unit: !process.argv.includes('--no-unit'),
    property: !process.argv.includes('--no-property'),
    watch: process.argv.includes('--watch')
  };

  const tester = new Tester();

  switch (command) {
    case 'single':
      if (!packageName) {
        console.error('❌ Package name required for single test');
        console.log('Usage: bun run scripts/test.ts single <package-name>');
        process.exit(1);
      }
      await tester.testSingle(packageName, options);
      break;
    case 'watch':
      await tester.watch(packageName);
      break;
    case 'property':
      await tester.runPropertyTests(options);
      break;
    case 'all':
    default:
      await tester.testAll(options);
      break;
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
}

export { Tester };
