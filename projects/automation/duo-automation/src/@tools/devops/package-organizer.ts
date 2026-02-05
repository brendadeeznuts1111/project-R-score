/**
 * Enhanced Package Configuration & Naming Standards
 * 
 * Organizes and enhances naming conventions across all packages,
 * classes, interfaces, and author information throughout the codebase.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  keywords: string[];
  repository: {
    type: string;
    url: string;
  };
  bugs: {
    url: string;
  };
  homepage: string;
  contributors: string[];
  funding?: {
    type: string;
    url: string;
  };
}

interface NamingStandards {
  packagePrefix: string;
  classNaming: 'PascalCase' | 'camelCase';
  interfaceNaming: 'PascalCase' | 'camelCase';
  fileNaming: 'kebab-case' | 'camelCase';
  descriptionTemplates: {
    core: string;
    platform: string;
    tools: string;
    build: string;
  };
}

class PackageOrganizer {
  private static readonly STANDARDS: NamingStandards = {
    packagePrefix: '@factory-wager',
    classNaming: 'PascalCase',
    interfaceNaming: 'PascalCase',
    fileNaming: 'kebab-case',
    descriptionTemplates: {
      core: 'FactoryWager Core - {feature} with enterprise-grade reliability',
      platform: 'FactoryWager Platform - {feature} for scalable infrastructure',
      tools: 'FactoryWager Tools - {feature} for developer productivity',
      build: 'FactoryWager Build - {feature} for optimized deployment'
    }
  };

  private static readonly AUTHOR_INFO = {
    name: 'FactoryWager Development Team',
    email: 'dev@factory-wager.ai',
    url: 'https://factory-wager.ai',
    organization: 'FactoryWager Technologies',
    license: 'MIT'
  };

  private static readonly REPOSITORY_INFO = {
    type: 'git',
    url: 'https://github.com/factory-wager/duo-automation.git',
    bugs: 'https://github.com/factory-wager/duo-automation/issues',
    homepage: 'https://factory-wager.ai'
  };

  /**
   * 🏗️ Enhanced root package.json
   */
  static enhanceRootPackage(): void {
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

    const enhancedPackage: PackageMetadata = {
      name: 'factory-wager-automation',
      version: '3.7.0',
      description: 'FactoryWager Automation - Enterprise-grade status system with workspace integration and Lightning Network payments',
      author: this.AUTHOR_INFO.name,
      license: this.AUTHOR_INFO.license,
      keywords: [
        'automation',
        'status-system',
        'bun-workspaces',
        'cloudflare-workers',
        'durable-objects',
        'monitoring',
        'lightning-network',
        'payments',
        'microtransactions',
        'savings-optimization',
        'enterprise-grade'
      ],
      repository: this.REPOSITORY_INFO,
      bugs: {
        url: this.REPOSITORY_INFO.bugs
      },
      homepage: this.REPOSITORY_INFO.homepage,
      contributors: [
        'FactoryWager Development Team <dev@factory-wager.ai>',
        'Lightning Network Integration Team <lightning@factory-wager.ai>',
        'Payment Systems Team <payments@factory-wager.ai>'
      ],
      funding: {
        type: 'github',
        url: 'https://github.com/sponsors/factory-wager'
      }
    };

    // Merge with existing package.json
    const mergedPackage = {
      ...packageJson,
      ...enhancedPackage,
      // Preserve existing workspaces and scripts
      workspaces: packageJson.workspaces,
      scripts: packageJson.scripts,
      devDependencies: packageJson.devDependencies,
      dependencies: packageJson.dependencies,
      exports: packageJson.exports,
      engines: packageJson.engines
    };

    writeFileSync(packagePath, JSON.stringify(mergedPackage, null, 2));
    console.log('✅ Enhanced root package.json');
  }

  /**
   * 📦 Enhanced package configurations
   */
  static enhancePackages(): void {
    const packages = [
      {
        path: 'packages/@core/status/package.json',
        name: '@factory-wager/status-system',
        type: 'core',
        feature: '18-endpoint status system with subscription management and real-time monitoring'
      },
      {
        path: 'packages/@platform/components/package.json',
        name: '@factory-wager/ui-components',
        type: 'platform',
        feature: 'React components for FactoryWager dashboards with real-time data visualization'
      },
      {
        path: 'packages/@tools/cli/package.json',
        name: '@factory-wager/cli-core',
        type: 'tools',
        feature: 'Command-line interface with enhanced inspection and regex filtering'
      },
      {
        path: 'packages/@core/utils/package.json',
        name: '@factory-wager/utils',
        type: 'core',
        feature: 'Utility functions for status management and data processing'
      },
      {
        path: 'packages/@core/terminal/package.json',
        name: '@factory-wager/terminal',
        type: 'core',
        feature: 'Terminal utilities for enhanced CLI experience and formatting'
      },
      {
        path: 'packages/@platform/modules/registry-gateway/package.json',
        name: '@factory-wager/registry-gateway',
        type: 'platform',
        feature: 'Registry gateway for package management and workspace integration'
      },
      {
        path: 'packages/@platform/modules/security-vault/package.json',
        name: '@factory-wager/security-vault',
        type: 'platform',
        feature: 'Security vault for secrets management and encryption'
      },
      {
        path: 'packages/@platform/modules/telemetry-kernel/package.json',
        name: '@factory-wager/telemetry-kernel',
        type: 'platform',
        feature: 'Telemetry kernel for metrics collection and performance monitoring'
      },
      {
        path: 'packages/@tools/testing/package.json',
        name: '@factory-wager/testing-framework',
        type: 'tools',
        feature: 'Testing framework with comprehensive validation and mocking'
      },
      {
        path: 'packages/build/package.json',
        name: '@factory-wager/build-system',
        type: 'build',
        feature: 'Build system for optimized deployment and asset management'
      }
    ];

    for (const pkg of packages) {
      this.enhancePackage(pkg.path, pkg.name, pkg.type, pkg.feature);
    }
  }

  /**
   * 🔧 Enhance individual package
   */
  private static enhancePackage(packagePath: string, name: string, type: string, feature: string): void {
    try {
      const fullPath = join(process.cwd(), packagePath);
      const packageJson = JSON.parse(readFileSync(fullPath, 'utf-8'));

      const template = this.STANDARDS.descriptionTemplates[type as keyof typeof this.STANDARDS.descriptionTemplates];
      const description = template.replace('{feature}', feature);

      const enhancedPackage = {
        ...packageJson,
        name,
        description,
        author: this.AUTHOR_INFO.name,
        license: this.AUTHOR_INFO.license,
        keywords: this.generateKeywords(name, type, feature),
        repository: this.REPOSITORY_INFO,
        bugs: {
          url: this.REPOSITORY_INFO.bugs
        },
        homepage: `${this.REPOSITORY_INFO.homepage}/packages/${name.replace('@factory-wager/', '')}`,
        contributors: [
          'FactoryWager Development Team <dev@factory-wager.ai>'
        ]
      };

      writeFileSync(fullPath, JSON.stringify(enhancedPackage, null, 2));
      console.log(`✅ Enhanced ${packagePath}`);
    } catch (error) {
      console.warn(`⚠️  Could not enhance ${packagePath}:`, error);
    }
  }

  /**
   * 🏷️ Generate relevant keywords
   */
  private static generateKeywords(name: string, type: string, feature: string): string[] {
    const baseKeywords = [
      'factory-wager',
      'automation',
      'bun',
      'typescript',
      'enterprise'
    ];

    const typeKeywords = {
      core: ['status-system', 'monitoring', 'utilities', 'terminal'],
      platform: ['infrastructure', 'scalability', 'security', 'telemetry'],
      tools: ['cli', 'testing', 'development', 'productivity'],
      build: ['deployment', 'optimization', 'assets', 'bundling']
    };

    const featureKeywords = feature.toLowerCase().split(/\s+/).filter(word => word.length > 3);

    return [...new Set([...baseKeywords, ...(typeKeywords[type as keyof typeof typeKeywords] || []), ...featureKeywords])];
  }

  /**
   * 📚 Generate class and interface naming guide
   */
  static generateNamingGuide(): void {
    const guide = `
# FactoryWager Naming Standards Guide

## Package Naming Convention
\`\`\`
@factory-wager/[category]-[component]
\`\`\`

### Categories:
- \`@factory-wager/core-*\` - Core functionality and utilities
- \`@factory-wager/platform-*\` - Platform infrastructure and services
- \`@factory-wager/tools-*\` - Development tools and utilities
- \`@factory-wager/build-*\` - Build and deployment systems

## Class Naming Convention (PascalCase)
\`\`\`
// Core Classes
StatusSystemManager
PaymentProcessor
LightningNetworkRouter
TelemetryCollector

// Service Classes
UserService
PaymentService
SecurityService
MonitoringService

// Utility Classes
ConfigurationManager
ValidationEngine
CacheManager
Logger
\`\`\`

## Interface Naming Convention (PascalCase with I prefix)
\`\`\`
// Core Interfaces
IStatusSystem
IPaymentProcessor
ILightningNetworkRouter
ITelemetryCollector

// Service Interfaces
IUserService
IPaymentService
ISecurityService
IMonitoringService

// Data Interfaces
IUser
IPayment
ISecurityConfig
IMonitoringMetrics
\`\`\`

## File Naming Convention (kebab-case)
\`\`\`
// Core Files
status-system-manager.ts
payment-processor.ts
lightning-network-router.ts
telemetry-collector.ts

// Service Files
user-service.ts
payment-service.ts
security-service.ts
monitoring-service.ts

// Utility Files
configuration-manager.ts
validation-engine.ts
cache-manager.ts
logger.ts
\`\`\`

## Function Naming Convention (camelCase)
\`\`\`
// Core Functions
getStatusSystem()
processPayment()
routeLightningPayment()
collectTelemetry()

// Service Functions
getUserById()
createPayment()
validateSecurity()
monitorMetrics()

// Utility Functions
parseConfiguration()
validateInput()
clearCache()
logMessage()
\`\`\`

## Variable Naming Convention (camelCase)
\`\`\`
// Core Variables
statusSystemConfig
paymentAmount
lightningInvoice
telemetryData

// Service Variables
userServiceInstance
paymentProcessor
securityValidator
monitoringClient

// Utility Variables
configData
validationResult
cacheEntry
logLevel
\`\`\`

## Constant Naming Convention (UPPER_SNAKE_CASE)
\`\`\`
// Core Constants
DEFAULT_STATUS_CONFIG
MAX_PAYMENT_AMOUNT
LIGHTNING_NETWORK_TIMEOUT
TELEMETRY_COLLECTION_INTERVAL

// Service Constants
USER_SERVICE_ENDPOINT
PAYMENT_WEBHOOK_SECRET
SECURITY_ENCRYPTION_KEY
MONITORING_ALERT_THRESHOLD

// Utility Constants
CONFIG_FILE_PATH
VALIDATION_REGEX_PATTERN
CACHE_TTL_SECONDS
LOG_LEVEL_DEBUG
\`\`\`

## Type Alias Naming Convention (PascalCase)
\`\`\`
// Core Types
StatusSystemConfig
PaymentResult
LightningInvoice
TelemetryMetrics

// Service Types
UserServiceConfig
PaymentProcessorOptions
SecurityValidationResult
MonitoringAlert

// Utility Types
ConfigurationData
ValidationRule
CacheEntry
LogLevel
\`\`\`

## Enum Naming Convention (PascalCase)
\`\`\`
// Core Enums
PaymentStatus
SecurityLevel
MonitoringSeverity
TelemetryType

// Service Enums
UserRole
PaymentMethod
SecurityPermission
MonitoringState

// Utility Enums
ConfigurationFormat
ValidationType
CacheStrategy
LogFormat
\`\`\`

## Author and License Standards
\`\`\json
{
  "author": "FactoryWager Development Team",
  "license": "MIT",
  "contributors": [
    "FactoryWager Development Team <dev@factory-wager.ai>",
    "Lightning Network Team <lightning@factory-wager.ai>",
    "Payment Systems Team <payments@factory-wager.ai>"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/factory-wager/duo-automation.git"
  },
  "bugs": {
    "url": "https://github.com/factory-wager/duo-automation/issues"
  },
  "homepage": "https://factory-wager.ai"
}
\`\`\`

## Description Templates
\`\`\`
// Core Package
"FactoryWager Core - {feature} with enterprise-grade reliability"

// Platform Package  
"FactoryWager Platform - {feature} for scalable infrastructure"

// Tools Package
"FactoryWager Tools - {feature} for developer productivity"

// Build Package
"FactoryWager Build - {feature} for optimized deployment"
\`\`\`
`;

    writeFileSync(join(process.cwd(), 'docs/NAMING_STANDARDS.md'), guide);
    console.log('✅ Generated naming standards guide');
  }

  /**
   * 🔍 Generate package overview
   */
  static generatePackageOverview(): void {
    const overview = {
      name: 'FactoryWager Automation',
      version: '3.7.0',
      description: 'Enterprise-grade automation system with Lightning Network payments',
      author: 'FactoryWager Development Team',
      license: 'MIT',
      packages: [
        {
          name: '@factory-wager/status-system',
          version: '3.7.0',
          description: '18-endpoint status system with subscription management',
          type: 'core',
          features: ['Real-time monitoring', 'Subscription management', 'Cloudflare Workers integration']
        },
        {
          name: '@factory-wager/ui-components',
          version: '1.2.4-beta.0',
          description: 'React components for dashboards with real-time visualization',
          type: 'platform',
          features: ['Real-time charts', 'Status indicators', 'Interactive controls']
        },
        {
          name: '@factory-wager/cli-core',
          version: '1.2.4-beta.0',
          description: 'Command-line interface with enhanced inspection',
          type: 'tools',
          features: ['Regex filtering', 'Path exclusion', 'Audit logging']
        },
        {
          name: '@factory-wager/lightning-network',
          version: '1.0.0',
          description: 'Lightning Network integration with savings optimization',
          type: 'core',
          features: ['Instant payments', 'Yield optimization', 'Auto-rebalancing']
        }
      ],
      standards: {
        packagePrefix: '@factory-wager',
        classNaming: 'PascalCase',
        interfaceNaming: 'PascalCase with I prefix',
        fileNaming: 'kebab-case',
        functionNaming: 'camelCase',
        constantNaming: 'UPPER_SNAKE_CASE'
      }
    };

    writeFileSync(join(process.cwd(), 'docs/PACKAGE_OVERVIEW.json'), JSON.stringify(overview, null, 2));
    console.log('✅ Generated package overview');
  }

  /**
   * 🚀 Run complete organization
   */
  static async organize(): Promise<void> {
    console.log('🏗️  Organizing FactoryWager packages and naming standards...\n');

    this.enhanceRootPackage();
    this.enhancePackages();
    this.generateNamingGuide();
    this.generatePackageOverview();

    console.log('\n✅ Package organization complete!');
    console.log('📚 Check docs/NAMING_STANDARDS.md for complete naming guidelines');
    console.log('📊 Check docs/PACKAGE_OVERVIEW.json for package overview');
  }
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];
  
  switch (command) {
    case 'organize':
      await PackageOrganizer.organize();
      break;
    case 'guide':
      PackageOrganizer.generateNamingGuide();
      break;
    case 'overview':
      PackageOrganizer.generatePackageOverview();
      break;
    default:
      console.log('Available commands:');
      console.log('  organize   - Organize all packages and naming standards');
      console.log('  guide      - Generate naming standards guide');
      console.log('  overview   - Generate package overview');
      break;
  }
}

export default PackageOrganizer;
export type { PackageMetadata, NamingStandards };
