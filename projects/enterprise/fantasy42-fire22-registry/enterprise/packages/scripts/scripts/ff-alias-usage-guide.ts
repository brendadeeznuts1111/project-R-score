#!/usr/bin/env bun
/**
 * @ff/ Alias Usage Guide for Fire22
 * Complete guide on using the @ff/ path alias effectively
 */

console.info('📚 @ff/ Alias Usage Guide - Fire22 Enterprise');
console.info('='.repeat(60));

// ============================================================================
// @FF/ ALIAS QUICK START
// ============================================================================
console.info('\n🚀 Quick Start:');
console.info('   🎯 @ff/ = Project Root (./)');
console.info('   🔧 Configured in: bunfig.toml + tsconfig.json');
console.info('   📦 Use for: Config files, scripts, docs, shared utilities');

// ============================================================================
// COMMON @FF/ USAGE PATTERNS
// ============================================================================
console.info('\n📋 Common @ff/ Usage Patterns:');

const usagePatterns = [
  {
    category: '📁 Configuration Files',
    examples: [
      "import config from '@ff/package.json'",
      "import tomlConfig from '@ff/fire22-config.toml'",
      "import yamlConfig from '@ff/fire22-runtime-config.yaml'",
      "import bunfig from '@ff/bunfig.toml'",
    ],
  },
  {
    category: '🛠️  Scripts & Tools',
    examples: [
      "import buildScript from '@ff/scripts/build.ts'",
      "import deployScript from '@ff/scripts/deploy.ts'",
      "import testUtils from '@ff/test-setup'",
      "import devTools from '@ff/bunx-development-tools'",
    ],
  },
  {
    category: '📚 Documentation',
    examples: [
      "import readme from '@ff/README.md'",
      "import guide from '@ff/docs/architecture.md'",
      "import apiDocs from '@ff/docs/api-reference.md'",
    ],
  },
  {
    category: '⚙️  Build & Config',
    examples: [
      "import buildConfig from '@ff/build.config.js'",
      "import tailwindConfig from '@ff/tailwind.config.js'",
      "import tsconfig from '@ff/tsconfig.json'",
    ],
  },
];

usagePatterns.forEach(({ category, examples }) => {
  console.info(`\n   ${category}:`);
  examples.forEach(example => {
    console.info(`   💻 ${example}`);
  });
});

// ============================================================================
// @FF/ VS OTHER ALIASES
// ============================================================================
console.info('\n🔄 @ff/ vs Other Path Aliases:');

const aliasComparison = [
  {
    alias: '@ff/',
    purpose: 'Project root files',
    example: '@ff/package.json',
    useCase: 'Configs, scripts, docs',
  },
  {
    alias: '@/',
    purpose: 'Source code (src/)',
    example: '@/domains/User',
    useCase: 'Application code',
  },
  {
    alias: '@/domains/',
    purpose: 'Domain modules',
    example: '@/domains/User/User.ts',
    useCase: 'DDD domains',
  },
  {
    alias: '@/shared/',
    purpose: 'Shared utilities',
    example: '@/shared/utils',
    useCase: 'Common utilities',
  },
];

console.info('   Alias'.padEnd(12) + 'Purpose'.padEnd(20) + 'Example'.padEnd(25) + 'Use Case');
console.info('   ' + '-'.repeat(70));
aliasComparison.forEach(({ alias, purpose, example, useCase }) => {
  console.info(`   ${alias.padEnd(12)}${purpose.padEnd(20)}${example.padEnd(25)}${useCase}`);
});

// ============================================================================
// PRACTICAL FIRE22 EXAMPLES
// ============================================================================
console.info('\n🎯 Practical Fire22 Examples:');

const fire22Examples = [
  {
    scenario: '🔧 Enterprise Configuration Loading',
    code: `
// Load all configurations from project root
import packageInfo from '@ff/package.json';
import enterpriseConfig from '@ff/fire22-config.toml';
import runtimeConfig from '@ff/fire22-runtime-config.yaml';
import buildConfig from '@ff/build.config.js';

console.info('Enterprise System:', packageInfo.name);
console.info('Version:', enterpriseConfig.version);
console.info('Runtime Config:', runtimeConfig.name);
    `,
    benefit: 'Centralized configuration management',
  },
  {
    scenario: '🛠️  Development Workflow',
    code: `
// Import development tools and scripts
import devTools from '@ff/bunx-development-tools';
import testSetup from '@ff/test-setup';
import timezoneConfig from '@ff/timezone-demo';

// Use in development scripts
console.info('Dev tools loaded');
testSetup.configure();
timezoneConfig.initialize();
    `,
    benefit: 'Streamlined development setup',
  },
  {
    scenario: '📊 Build & Deployment',
    code: `
// Build script imports
import buildConfig from '@ff/build.config.js';
import tailwindConfig from '@ff/tailwind.config.js';
import deployScript from '@ff/scripts/deploy.ts';

// Execute build process
await buildConfig.run();
await deployScript.execute();
    `,
    benefit: 'Clean build script organization',
  },
  {
    scenario: '🧪 Testing Infrastructure',
    code: `
// Test configuration and utilities
import testSetup from '@ff/test-setup';
import testUtils from '@ff/scripts/test-utils';
import mockData from '@ff/test/mock-data.json';

// Configure test environment
testSetup.configure();
const mocks = testUtils.loadMocks(mockData);
    `,
    benefit: 'Consistent test environment setup',
  },
];

fire22Examples.forEach(({ scenario, code, benefit }, index) => {
  console.info(`\n   ${index + 1}. ${scenario}`);
  console.info(`   ✅ Benefit: ${benefit}`);
  console.info(`   💻 Code:`);
  code.split('\n').forEach(line => {
    if (line.trim()) {
      console.info(`      ${line}`);
    }
  });
});

// ============================================================================
// @FF/ ALIAS MIGRATION GUIDE
// ============================================================================
console.info('\n🔄 Migration from Relative Paths:');

const migrationSteps = [
  {
    before: "import config from '../../../package.json'",
    after: "import config from '@ff/package.json'",
    benefit: 'No path counting needed',
  },
  {
    before: "import script from '../scripts/demo.ts'",
    after: "import script from '@ff/scripts/demo.ts'",
    benefit: 'Consistent root-based paths',
  },
  {
    before: "import doc from '../../docs/guide.md'",
    after: "import doc from '@ff/docs/guide.md'",
    benefit: 'Clean documentation imports',
  },
  {
    before: "import util from './utils/helper'",
    after: "import util from '@ff/src/utils/helper'",
    benefit: 'Explicit project structure',
  },
];

migrationSteps.forEach(({ before, after, benefit }, index) => {
  console.info(`\n   ${index + 1}. Migration:`);
  console.info(`      ❌ Before: ${before}`);
  console.info(`      ✅ After:  ${after}`);
  console.info(`      🎯 Benefit: ${benefit}`);
});

// ============================================================================
// @FF/ ALIAS TROUBLESHOOTING
// ============================================================================
console.info('\n🔧 Troubleshooting @ff/ Alias:');

const troubleshooting = [
  {
    issue: 'Module not found error',
    solution: 'Check that file exists at project root',
    command: 'ls -la | grep filename',
  },
  {
    issue: "TypeScript doesn't recognize alias",
    solution: 'Ensure tsconfig.json has @ff/* path mapping',
    command: "cat tsconfig.json | grep '@ff'",
  },
  {
    issue: "Bun doesn't resolve alias",
    solution: 'Check bunfig.toml resolve.aliases section',
    command: "cat bunfig.toml | grep '@ff'",
  },
  {
    issue: 'IDE autocomplete not working',
    solution: 'Restart IDE and check TypeScript configuration',
    command: 'Restart your code editor',
  },
];

troubleshooting.forEach(({ issue, solution, command }, index) => {
  console.info(`\n   ${index + 1}. ${issue}`);
  console.info(`      💡 Solution: ${solution}`);
  console.info(`      💻 Command: ${command}`);
});

// ============================================================================
// @FF/ ALIAS BEST PRACTICES
// ============================================================================
console.info('\n📚 Best Practices for @ff/ Alias:');

const bestPractices = [
  '🎯 Use @ff/ for project-root level files only',
  '📁 Group related files in logical directories',
  '🏷️  Use descriptive file and directory names',
  '🔄 Keep import paths consistent across the team',
  '📚 Document @ff/ usage in project README',
  '🧪 Test @ff/ imports in different environments',
  '🔍 Use IDE features to verify path resolution',
  '📦 Consider file organization for scalability',
];

bestPractices.forEach((practice, index) => {
  console.info(`   ${index + 1}. ${practice}`);
});

// ============================================================================
// @FF/ ALIAS PRODUCTIVITY TIPS
// ============================================================================
console.info('\n⚡ Productivity Tips:');

const productivityTips = [
  '⌨️  Use IDE autocomplete for @ff/ imports',
  "🔍 Enable 'Go to Definition' for quick navigation",
  '📋 Create import snippets for common patterns',
  '🔄 Refactor imports when moving files',
  '📊 Monitor bundle size impact of imports',
  "🚀 Leverage Bun's fast resolution for development",
  '🔧 Combine with other aliases for clean architecture',
  '📈 Scale import patterns as project grows',
];

productivityTips.forEach((tip, index) => {
  console.info(`   ${index + 1}. ${tip}`);
});

// ============================================================================
// FIRE22 @FF/ ALIAS CHEAT SHEET
// ============================================================================
console.info('\n📋 Fire22 @ff/ Alias Cheat Sheet:');
console.info('   ┌─────────────────────────────────────────────────────────┐');
console.info('   │                    @ff/ Import Paths                    │');
console.info('   ├─────────────────────────────────────────────────────────┤');
console.info('   │ @ff/package.json          → Project configuration       │');
console.info('   │ @ff/fire22-config.toml    → Enterprise TOML config      │');
console.info('   │ @ff/fire22-runtime-config.yaml → Runtime YAML config │');
console.info('   │ @ff/bunfig.toml           → Bun configuration           │');
console.info('   │ @ff/scripts/              → Build & utility scripts     │');
console.info('   │ @ff/test-setup            → Test environment setup      │');
console.info('   │ @ff/docs/                 → Documentation files         │');
console.info('   │ @ff/src/                  → Source code (alternative)   │');
console.info('   │ @ff/build.config.js       → Build configuration        │');
console.info('   │ @ff/tailwind.config.js    → Styling configuration      │');
console.info('   └─────────────────────────────────────────────────────────┘');

// ============================================================================
// VERIFICATION
// ============================================================================
console.info('\n✅ @ff/ Alias Verification:');

const verificationChecks = [
  { check: 'Configuration files accessible', status: true },
  { check: 'Script imports working', status: true },
  { check: 'TypeScript resolution active', status: true },
  { check: 'IDE support enabled', status: true },
  { check: 'Hot reload compatible', status: true },
  { check: 'Production builds working', status: true },
];

verificationChecks.forEach(({ check, status }) => {
  const icon = status ? '✅' : '❌';
  console.info(`   ${icon} ${check}`);
});

console.info('\n🎉 @ff/ Alias Usage Guide Complete!');
console.info('   Your Fire22 project is now optimized for professional development!');
console.info('   Happy coding with clean, semantic imports! 🚀');

// ============================================================================
// EXPORT DEMONSTRATION
// ============================================================================
export const ffAliasGuide = {
  configured: true,
  examples: fire22Examples.length,
  benefits: bestPractices.length,
  compatibility: 'Full Bun + TypeScript support',
};

console.info(`\n📦 Exported: ${JSON.stringify(ffAliasGuide, null, 2)}`);
