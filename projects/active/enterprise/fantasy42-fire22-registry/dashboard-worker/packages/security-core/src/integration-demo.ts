#!/usr/bin/env bun

/**
 * @fire22/security-core Integration Demo
 *
 * Demonstrates integration with Fire22 core packages and workspace ecosystem
 */

import { initializeFire22Security } from './index';

class Fire22SecurityIntegrationDemo {
  private security: any;
  private coreConfig: any = {};

  async initialize() {
    console.info('🔥 Fire22 Security Integration Demo');
    console.info('='.repeat(50));

    // Initialize security system with core package integration
    this.security = await initializeFire22Security({
      service: 'fire22-dashboard-workspace',
      environments: ['development', 'staging', 'production', 'test'],
      scanner: {
        enabled: true,
        excludePackages: ['@fire22/testing-framework'], // Allow internal testing
      },
      credentials: {
        validation: true,
        rotation: {
          enabled: false, // Disable for demo
        },
      },
    });

    console.info('✅ Security system initialized with workspace integration');
  }

  async demoWorkspaceCredentials() {
    console.info('\n🔐 Workspace Credential Management');
    console.info('-'.repeat(30));

    // Demo credentials for different Fire22 packages
    const workspaceCredentials = [
      {
        package: '@fire22/core',
        credentials: [
          {
            name: 'database_url',
            value: 'postgresql://fire22_core:secure@localhost:5432/fire22_core',
          },
          { name: 'api_base_url', value: 'https://api.fire22.com/v1' },
        ],
      },
      {
        package: '@fire22/middleware',
        credentials: [
          {
            name: 'jwt_secret',
            value: 'ultra_secure_jwt_key_for_middleware_' + Math.random().toString(36),
          },
          { name: 'rate_limit_redis', value: 'redis://localhost:6379/1' },
        ],
      },
      {
        package: '@fire22/wager-system',
        credentials: [
          {
            name: 'stripe_secret',
            value: 'sk_test_fire22_wager_' + Math.random().toString(36).substring(2, 15),
          },
          {
            name: 'payment_webhook_secret',
            value: 'whsec_fire22_' + Math.random().toString(36).substring(2, 20),
          },
        ],
      },
    ];

    for (const pkg of workspaceCredentials) {
      console.info(`\n📦 ${pkg.package}:`);

      for (const cred of pkg.credentials) {
        const keyName = `${pkg.package.replace('@fire22/', '')}_${cred.name}`;
        await this.security.storeCredential(
          keyName,
          cred.value,
          `${pkg.package} - ${cred.name}`,
          'development'
        );
        console.info(`  ✅ Stored: ${keyName}`);
      }
    }
  }

  async demoPackageSecurityScanning() {
    console.info('\n🛡️ Package Security Scanning');
    console.info('-'.repeat(30));

    // Create a mock package.json with Fire22 workspace dependencies
    const mockPackageJson = {
      name: '@fire22/integrated-app',
      dependencies: {
        '@fire22/core': 'workspace:*',
        '@fire22/security-core': 'workspace:*',
        '@fire22/middleware': 'workspace:*',
        '@fire22/wager-system': 'workspace:*',
        express: '^4.18.0',
        zod: '^3.22.4',
        // Some packages that might trigger security policies
        'crypto-js': '^4.2.0', // Might trigger crypto policy
        lodash: '^4.17.21', // Might be flagged for replacement
      },
      devDependencies: {
        '@fire22/testing-framework': 'workspace:*',
        '@types/node': '^20.0.0',
        typescript: '^5.9.2',
      },
    };

    console.info('📋 Scanning Fire22 workspace dependencies...');
    console.info('Dependencies:', Object.keys(mockPackageJson.dependencies).length);
    console.info('Dev Dependencies:', Object.keys(mockPackageJson.devDependencies).length);

    // Simulate security scan results
    console.info('\n🔍 Security Scan Results:');
    console.info('✅ @fire22/* packages: Clean (internal packages trusted)');
    console.info('✅ express: No vulnerabilities found');
    console.info('✅ zod: No vulnerabilities found');
    console.info('⚠️ crypto-js: Policy warning (cryptocurrency-related package)');
    console.info('📝 lodash: Consider replacing with native ES6+ methods');

    console.info('\n💡 Fire22 Workspace Security Benefits:');
    console.info('  • Internal packages (@fire22/*) automatically trusted');
    console.info('  • Workspace protocol prevents version conflicts');
    console.info('  • Custom policies for Fire22 development standards');
    console.info('  • Integration with existing Fire22 testing framework');
  }

  async demoEnvironmentIsolation() {
    console.info('\n🌍 Environment Isolation Demo');
    console.info('-'.repeat(30));

    const environments = ['development', 'staging', 'production'];
    const baseCredentials = ['database_url', 'fire22_api_token', 'jwt_secret'];

    for (const env of environments) {
      console.info(`\n📍 ${env.toUpperCase()} Environment:`);

      for (const credName of baseCredentials) {
        const envSpecificValue = this.generateEnvSpecificCredential(credName, env);
        await this.security.storeCredential(
          credName,
          envSpecificValue,
          `${env} environment credential`,
          env
        );

        // Retrieve and verify
        const retrieved = await this.security.getCredential(credName, { environment: env });
        const masked = retrieved
          ? retrieved.substring(0, 10) + '...' + retrieved.slice(-4)
          : 'null';
        console.info(`  🔐 ${credName}: ${masked}`);
      }
    }

    console.info('\n✅ Environment isolation complete');
    console.info('💡 Each environment has separate, encrypted credential storage');
  }

  async demoIntegrationWithCore() {
    console.info('\n🔗 Integration with @fire22/core');
    console.info('-'.repeat(30));

    // Load Fire22 configuration from secure storage
    const secureConfig = await this.security.credentialManager.loadFire22Config();

    console.info('📋 Loaded secure configuration from keychain:');
    for (const [key, value] of Object.entries(secureConfig)) {
      if (value && typeof value === 'string') {
        const masked = value.substring(0, 8) + '...' + value.slice(-4);
        console.info(`  ${key}: ${masked}`);
      }
    }

    // Demonstrate integration with other Fire22 packages
    console.info('\n🔄 Package Integration Examples:');

    const integrationExamples = [
      {
        package: '@fire22/middleware',
        use: 'JWT secret for authentication middleware',
        credential: 'jwt_secret',
      },
      {
        package: '@fire22/wager-system',
        use: 'Stripe API key for payment processing',
        credential: 'stripe_secret_key',
      },
      {
        package: '@fire22/env-manager',
        use: 'Database credentials for environment management',
        credential: 'database_url',
      },
      {
        package: '@fire22/testing-framework',
        use: 'Test database and API credentials',
        credential: 'test_api_token',
      },
    ];

    for (const example of integrationExamples) {
      console.info(`\n📦 ${example.package}:`);
      console.info(`   Usage: ${example.use}`);
      console.info(`   Credential: ${example.credential} (securely retrieved from keychain)`);
      console.info(`   Integration: Seamless import from @fire22/security-core`);
    }
  }

  async demoWorkspaceOrchestration() {
    console.info('\n🏗️ Workspace Orchestration Security');
    console.info('-'.repeat(30));

    // Simulate workspace orchestration with security
    const workspaceConfig = {
      workspaces: [
        { name: '@fire22/core', securityLevel: 'standard' },
        { name: '@fire22/security-core', securityLevel: 'strict' },
        { name: '@fire22/middleware', securityLevel: 'strict' },
        { name: '@fire22/wager-system', securityLevel: 'strict' },
        { name: '@fire22/testing-framework', securityLevel: 'permissive' },
        { name: '@fire22/env-manager', securityLevel: 'standard' },
      ],
      sharedCredentials: ['database_url', 'fire22_api_token'],
      centralizedAudit: true,
    };

    console.info('📊 Workspace Security Configuration:');
    for (const workspace of workspaceConfig.workspaces) {
      const icon =
        workspace.securityLevel === 'strict'
          ? '🔒'
          : workspace.securityLevel === 'standard'
            ? '🛡️'
            : '📂';
      console.info(`  ${icon} ${workspace.name}: ${workspace.securityLevel}`);
    }

    console.info(`\n🔗 Shared Credentials: ${workspaceConfig.sharedCredentials.join(', ')}`);
    console.info(
      `📊 Centralized Audit: ${workspaceConfig.centralizedAudit ? 'Enabled' : 'Disabled'}`
    );

    // Demo centralized security audit
    console.info('\n🔍 Centralized Security Audit:');
    console.info('  ✅ All workspaces scanned for vulnerabilities');
    console.info('  ✅ Shared credentials verified and encrypted');
    console.info('  ✅ Security policies enforced across workspace');
    console.info('  ✅ Integration with existing Fire22 tooling');
  }

  async performanceDemo() {
    console.info('\n⚡ Performance Benchmarks');
    console.info('-'.repeat(30));

    const benchmark = await this.security.credentialManager.benchmarkPerformance(50);

    console.info(`📊 Credential Retrieval Performance (50 iterations):`);
    console.info(`   Average Time: ${benchmark.averageRetrievalTime.toFixed(3)}ms`);
    console.info(`   Total Time: ${benchmark.totalTime.toFixed(2)}ms`);
    console.info(`   Operations/sec: ${Math.round(benchmark.operationsPerSecond)}`);
    console.info(`   🚀 Performance: ${benchmark.averageRetrievalTime < 2 ? 'Excellent' : 'Good'}`);

    console.info('\n💡 Performance Benefits:');
    console.info('  • Native OS keychain integration (no external deps)');
    console.info('  • Bun native APIs for maximum performance');
    console.info('  • Efficient credential caching');
    console.info('  • Workspace-optimized for Fire22 development');
  }

  private generateEnvSpecificCredential(name: string, env: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    switch (name) {
      case 'database_url':
        return `postgresql://fire22_${env}:secure_${random}@${env}.fire22.db:5432/fire22_${env}`;
      case 'fire22_api_token':
        return `f22_${env}_api_${timestamp}_${random}`;
      case 'jwt_secret':
        return `jwt_${env}_${timestamp}_${random}_ultra_secure_key`;
      default:
        return `${name}_${env}_${timestamp}_${random}`;
    }
  }

  async cleanup() {
    console.info('\n🧹 Demo Cleanup');
    console.info('-'.repeat(30));

    const testCredentials = [
      'core_database_url',
      'middleware_jwt_secret',
      'wager-system_stripe_secret',
      'database_url',
      'fire22_api_token',
      'jwt_secret',
    ];

    const environments = ['development', 'staging', 'production'];

    for (const env of environments) {
      for (const cred of testCredentials) {
        try {
          await this.security.credentialManager.deleteCredential(cred, env);
        } catch (error) {
          // Ignore errors for demo cleanup
        }
      }
    }

    console.info('✅ Demo credentials cleaned up');
  }
}

// Run demo if called directly
async function runIntegrationDemo() {
  const demo = new Fire22SecurityIntegrationDemo();

  try {
    await demo.initialize();
    await demo.demoWorkspaceCredentials();
    await demo.demoPackageSecurityScanning();
    await demo.demoEnvironmentIsolation();
    await demo.demoIntegrationWithCore();
    await demo.demoWorkspaceOrchestration();
    await demo.performanceDemo();
    await demo.cleanup();

    console.info('\n🎉 Fire22 Security Integration Demo Complete!');
    console.info('\n💡 Next Steps:');
    console.info('  1. Install: bun add @fire22/security-core');
    console.info('  2. Import: import { initializeFire22Security } from "@fire22/security-core"');
    console.info('  3. Configure: Set up your security policies and credentials');
    console.info('  4. Deploy: Use with existing Fire22 workspace packages');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

if (import.meta.main) {
  await runIntegrationDemo();
}

export { Fire22SecurityIntegrationDemo };
