#!/usr/bin/env bun

/**
 * Bun Environment Variable Expansion Demo
 * Showcases the enhanced .npmrc environment variable handling
 */

function demonstrateEnvExpansion() {
  console.info('\n🌍 Bun Environment Variable Expansion Demo');
  console.info('=========================================\n');

  console.info('📋 Enhanced .npmrc Environment Variable Support:\n');

  // Simulate different .npmrc scenarios
  const scenarios = [
    {
      description: 'Basic variable expansion',
      npmrc: 'token = ${NPM_TOKEN}',
      env: { NPM_TOKEN: 'abc123def456' },
      result: 'token = abc123def456'
    },
    {
      description: 'Quoted string expansion',
      npmrc: 'token = "${NPM_TOKEN}"',
      env: { NPM_TOKEN: 'abc123def456' },
      result: 'token = "abc123def456"'
    },
    {
      description: 'Single quotes (no expansion)',
      npmrc: "token = '${NPM_TOKEN}'",
      env: { NPM_TOKEN: 'abc123def456' },
      result: "token = '${NPM_TOKEN}'" // No expansion in single quotes
    },
    {
      description: 'Optional modifier (?) - undefined variable',
      npmrc: 'token = ${NPM_TOKEN?}',
      env: {}, // NPM_TOKEN not defined
      result: 'token = ' // Empty string
    },
    {
      description: 'Optional modifier (?) - defined variable',
      npmrc: 'token = ${NPM_TOKEN?}',
      env: { NPM_TOKEN: 'xyz789' },
      result: 'token = xyz789'
    },
    {
      description: 'Complex Bearer token',
      npmrc: 'auth = "Bearer ${API_TOKEN?}"',
      env: { API_TOKEN: 'secret-jwt-token' },
      result: 'auth = "Bearer secret-jwt-token"'
    }
  ];

  scenarios.forEach((scenario, index) => {
    console.info(`${index + 1}. ${scenario.description}:`);
    console.info(`   .npmrc: ${scenario.npmrc}`);
    console.info(`   Result: ${scenario.result}\n`);
  });

  console.info('🔧 Technical Details:\n');
  console.info('• Variables in double quotes: Expanded');
  console.info('• Variables in single quotes: NOT expanded');
  console.info('• ${VAR?} syntax: Empty string if undefined');
  console.info('• Compatible with npm behavior\n');

  console.info('📁 Configuration Files:\n');
  console.info('• ~/.npmrc (global)');
  console.info('• ./project/.npmrc (project-specific)');
  console.info('• Environment variables override file settings\n');

  console.info('🚀 Production Benefits:\n');
  console.info('• Secure token management via environment variables');
  console.info('• No hardcoded secrets in configuration files');
  console.info('• Consistent behavior across development/production');
  console.info('• Optional variable handling prevents deployment failures\n');

  console.info('✅ Enhanced Environment Variable Support Active!');
}

if (import.meta.main) {
  demonstrateEnvExpansion();
}