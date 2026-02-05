#!/usr/bin/env bun

/**
 * 🔧 Fire22 Pattern Applicator
 *
 * Demonstrates how to apply enhanced patterns to other scripts:
 * - Performance monitoring integration
 * - Error handling patterns
 * - Configuration validation
 * - Database integration
 * - Testing strategies
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { runScript } from './script-runner';
import { handleError, createError } from './error-handler';
import { validateConfig } from './config-validator';

// Example configuration schema for a build script
const buildConfigSchema = {
  target: {
    type: 'string',
    required: true,
    enum: ['development', 'staging', 'production'],
  },
  optimize: {
    type: 'boolean',
    required: false,
    default: false,
  },
  parallel: {
    type: 'number',
    required: false,
    min: 1,
    max: 16,
    default: 4,
  },
  outputDir: {
    type: 'string',
    required: true,
    min: 1,
  },
  sourceMaps: {
    type: 'boolean',
    required: false,
    default: true,
  },
};

// Example configuration for a test script
const testConfigSchema = {
  environment: {
    type: 'string',
    required: true,
    enum: ['unit', 'integration', 'e2e', 'performance'],
  },
  coverage: {
    type: 'boolean',
    required: false,
    default: true,
  },
  timeout: {
    type: 'number',
    required: false,
    min: 1000,
    max: 300000,
    default: 30000,
  },
  parallel: {
    type: 'boolean',
    required: false,
    default: true,
  },
  watch: {
    type: 'boolean',
    required: false,
    default: false,
  },
};

// Example configuration for a deployment script
const deployConfigSchema = {
  environment: {
    type: 'string',
    required: true,
    enum: ['staging', 'production', 'canary'],
  },
  region: {
    type: 'string',
    required: true,
    min: 1,
  },
  version: {
    type: 'string',
    required: true,
    pattern: /^\d+\.\d+\.\d+$/,
  },
  rollback: {
    type: 'boolean',
    required: false,
    default: true,
  },
  healthCheck: {
    type: 'boolean',
    required: false,
    default: true,
  },
};

// Example build script with enhanced patterns
async function enhancedBuildScript(
  config: any
): Promise<{ success: boolean; artifacts: string[]; duration: number }> {
  return await runScript(
    'enhanced-build',
    async () => {
      try {
        // Validate configuration
        const validation = validateConfig(config, buildConfigSchema);
        if (!validation.isValid) {
          throw createError(
            'Invalid build configuration',
            {
              scriptName: 'enhanced-build',
              operation: 'validate-config',
            },
            {
              type: 'validation',
              severity: 'high',
              recoverable: false,
              details: validation.errors,
            }
          );
        }

        console.log(`🚀 Starting enhanced build for target: ${config.target}`);
        console.log(`   Optimization: ${config.optimize ? 'Enabled' : 'Disabled'}`);
        console.log(`   Parallel jobs: ${config.parallel}`);
        console.log(`   Output directory: ${config.outputDir}`);

        // Simulate build steps
        const buildSteps = [
          'Dependency resolution',
          'TypeScript compilation',
          'Asset bundling',
          'Code optimization',
          'Source map generation',
          'Output generation',
        ];

        const artifacts: string[] = [];

        for (let i = 0; i < buildSteps.length; i++) {
          const step = buildSteps[i];
          console.log(`   📦 ${step}...`);

          // Simulate work
          await Bun.sleep(200 + Math.random() * 300);

          // Generate artifact
          const artifact = `${config.outputDir}/artifact-${i + 1}.js`;
          artifacts.push(artifact);

          console.log(`   ✅ ${step} completed`);
        }

        console.log(`\n🎉 Build completed successfully!`);
        console.log(`   Generated ${artifacts.length} artifacts`);
        console.log(`   Target: ${config.target}`);

        return {
          success: true,
          artifacts,
          duration: Date.now(), // Will be calculated by ScriptRunner
        };
      } catch (error) {
        throw createError(
          'Build failed',
          {
            scriptName: 'enhanced-build',
            operation: 'build-process',
          },
          {
            type: 'build',
            severity: 'high',
            recoverable: false,
            originalError: error,
          }
        );
      }
    },
    {
      tags: ['build', config.target, 'enhanced'],
      timeout: 300000, // 5 minutes
      logLevel: 'info',
    }
  );
}

// Example test script with enhanced patterns
async function enhancedTestScript(
  config: any
): Promise<{ success: boolean; testsRun: number; passed: number; failed: number }> {
  return await runScript(
    'enhanced-test',
    async () => {
      try {
        // Validate configuration
        const validation = validateConfig(config, testConfigSchema);
        if (!validation.isValid) {
          throw createError(
            'Invalid test configuration',
            {
              scriptName: 'enhanced-test',
              operation: 'validate-config',
            },
            {
              type: 'validation',
              severity: 'high',
              recoverable: false,
              details: validation.errors,
            }
          );
        }

        console.log(`🧪 Starting enhanced test suite`);
        console.log(`   Environment: ${config.environment}`);
        console.log(`   Coverage: ${config.coverage ? 'Enabled' : 'Disabled'}`);
        console.log(`   Timeout: ${config.timeout}ms`);
        console.log(`   Parallel: ${config.parallel ? 'Enabled' : 'Disabled'}`);

        // Simulate test execution
        const testSuites = [
          'Unit tests',
          'Integration tests',
          'API tests',
          'Database tests',
          'Performance tests',
        ];

        let testsRun = 0;
        let passed = 0;
        let failed = 0;

        for (const suite of testSuites) {
          console.log(`   🔍 Running ${suite}...`);

          // Simulate test execution
          const suiteTests = 10 + Math.floor(Math.random() * 20);
          const suitePassed = suiteTests - Math.floor(Math.random() * 3);
          const suiteFailed = suiteTests - suitePassed;

          testsRun += suiteTests;
          passed += suitePassed;
          failed += suiteFailed;

          await Bun.sleep(300 + Math.random() * 400);

          console.log(`   ✅ ${suite}: ${suitePassed}/${suiteTests} passed`);
          if (suiteFailed > 0) {
            console.log(`   ❌ ${suite}: ${suiteFailed} failed`);
          }
        }

        const success = failed === 0;
        console.log(
          `\n${success ? '🎉' : '⚠️'} Test suite ${success ? 'completed successfully' : 'completed with failures'}`
        );
        console.log(`   Total tests: ${testsRun}`);
        console.log(`   Passed: ${passed}`);
        console.log(`   Failed: ${failed}`);

        return {
          success,
          testsRun,
          passed,
          failed,
        };
      } catch (error) {
        throw createError(
          'Test execution failed',
          {
            scriptName: 'enhanced-test',
            operation: 'test-execution',
          },
          {
            type: 'test',
            severity: 'medium',
            recoverable: true,
            originalError: error,
          }
        );
      }
    },
    {
      tags: ['test', config.environment, 'enhanced'],
      timeout: config.timeout || 300000,
      logLevel: 'info',
    }
  );
}

// Example deployment script with enhanced patterns
async function enhancedDeployScript(
  config: any
): Promise<{ success: boolean; deploymentId: string; status: string }> {
  return await runScript(
    'enhanced-deploy',
    async () => {
      try {
        // Validate configuration
        const validation = validateConfig(config, deployConfigSchema);
        if (!validation.isValid) {
          throw createError(
            'Invalid deployment configuration',
            {
              scriptName: 'enhanced-deploy',
              operation: 'validate-config',
            },
            {
              type: 'validation',
              severity: 'high',
              recoverable: false,
              details: validation.errors,
            }
          );
        }

        console.log(`🚀 Starting enhanced deployment`);
        console.log(`   Environment: ${config.environment}`);
        console.log(`   Region: ${config.region}`);
        console.log(`   Version: ${config.version}`);
        console.log(`   Rollback: ${config.rollback ? 'Enabled' : 'Disabled'}`);

        // Simulate deployment steps
        const deploymentSteps = [
          'Environment validation',
          'Resource allocation',
          'Code deployment',
          'Database migration',
          'Service startup',
          'Health check verification',
        ];

        const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        for (const step of deploymentSteps) {
          console.log(`   🔧 ${step}...`);

          // Simulate work
          await Bun.sleep(400 + Math.random() * 600);

          console.log(`   ✅ ${step} completed`);
        }

        // Simulate health check
        if (config.healthCheck) {
          console.log(`   🏥 Running health checks...`);
          await Bun.sleep(200);
          console.log(`   ✅ Health checks passed`);
        }

        console.log(`\n🎉 Deployment completed successfully!`);
        console.log(`   Deployment ID: ${deploymentId}`);
        console.log(`   Environment: ${config.environment}`);
        console.log(`   Version: ${config.version}`);

        return {
          success: true,
          deploymentId,
          status: 'deployed',
        };
      } catch (error) {
        throw createError(
          'Deployment failed',
          {
            scriptName: 'enhanced-deploy',
            operation: 'deployment-process',
          },
          {
            type: 'deployment',
            severity: 'high',
            recoverable: config.rollback,
            originalError: error,
          }
        );
      }
    },
    {
      tags: ['deploy', config.environment, 'enhanced'],
      timeout: 600000, // 10 minutes
      logLevel: 'info',
    }
  );
}

// Pattern application examples
async function demonstratePatternApplication() {
  console.log('🔧 Fire22 Pattern Application Examples');
  console.log('!==!==!==!==!==!==!===\n');

  try {
    // 1. Enhanced Build Script Example
    console.log('📦 Example 1: Enhanced Build Script');
    console.log('------------------------------------');

    const buildConfig = {
      target: 'production',
      optimize: true,
      parallel: 8,
      outputDir: './dist',
      sourceMaps: true,
    };

    const buildResult = await enhancedBuildScript(buildConfig);
    console.log(`✅ Build completed: ${buildResult.success ? 'Success' : 'Failed'}`);
    console.log(`   Artifacts: ${buildResult.artifacts.length}`);
    console.log(`   Duration: ${buildResult.duration}ms\n`);

    // 2. Enhanced Test Script Example
    console.log('🧪 Example 2: Enhanced Test Script');
    console.log('----------------------------------');

    const testConfig = {
      environment: 'integration',
      coverage: true,
      timeout: 60000,
      parallel: true,
      watch: false,
    };

    const testResult = await enhancedTestScript(testConfig);
    console.log(`✅ Test suite completed: ${testResult.success ? 'Success' : 'Failed'}`);
    console.log(`   Tests run: ${testResult.testsRun}`);
    console.log(`   Passed: ${testResult.passed}`);
    console.log(`   Failed: ${testResult.failed}\n`);

    // 3. Enhanced Deployment Script Example
    console.log('🚀 Example 3: Enhanced Deployment Script');
    console.log('----------------------------------------');

    const deployConfig = {
      environment: 'staging',
      region: 'us-west-2',
      version: '1.2.3',
      rollback: true,
      healthCheck: true,
    };

    const deployResult = await enhancedDeployScript(deployConfig);
    console.log(`✅ Deployment completed: ${deployResult.success ? 'Success' : 'Failed'}`);
    console.log(`   Deployment ID: ${deployResult.deploymentId}`);
    console.log(`   Status: ${deployResult.status}\n`);

    // 4. Pattern Summary
    console.log('📋 Pattern Application Summary');
    console.log('-------------------------------');
    console.log('✅ All enhanced patterns applied successfully!');
    console.log('✅ Configuration validation working');
    console.log('✅ Performance monitoring active');
    console.log('✅ Error handling robust');
    console.log('✅ ScriptRunner integration complete');
    console.log('\n🚀 Your scripts are now enterprise-grade!');
  } catch (error) {
    await handleError(error, {
      scriptName: 'pattern-applicator',
      operation: 'demonstrate-patterns',
      environment: 'demo',
    });
  }
}

// Main function
async function main() {
  return await runScript('pattern-applicator-main', demonstratePatternApplication, {
    tags: ['demo', 'patterns', 'enhanced'],
    timeout: 300000, // 5 minutes
    logLevel: 'info',
  });
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Fire22 Pattern Applicator

Usage: bun run pattern-applicator.ts [options]

Options:
  --help, -h     Show this help message
  --build        Show build script example only
  --test         Show test script example only
  --deploy       Show deployment script example only

Examples:
  bun run pattern-applicator.ts                    # Run all examples
  bun run pattern-applicator.ts --build           # Build script example only
  bun run pattern-applicator.ts --test            # Test script example only
  bun run pattern-applicator.ts --deploy          # Deployment script example only

This script demonstrates:
🔧 How to apply enhanced patterns to your scripts
📦 Enhanced build script with validation and monitoring
🧪 Enhanced test script with configuration and reporting
🚀 Enhanced deployment script with safety and rollback
✅ Configuration validation patterns
📊 Performance monitoring integration
🛡️ Error handling and recovery patterns
📋 Template patterns for other script types
    `);
    process.exit(0);
  }

  // Run the pattern applicator
  main().catch(async error => {
    await handleError(error, {
      scriptName: 'pattern-applicator',
      operation: 'cli-main',
      environment: 'demo',
    });
    process.exit(1);
  });
}

export {
  main,
  enhancedBuildScript,
  enhancedTestScript,
  enhancedDeployScript,
  buildConfigSchema,
  testConfigSchema,
  deployConfigSchema,
};
