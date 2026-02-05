#!/usr/bin/env bun

/**
 * Bun Environment Variable Expansion Demo
 * Showcases the enhanced .npmrc environment variable handling
 */

function demonstrateEnvExpansion() {
  console.log('\n🌍 Bun Environment Variable Expansion Demo');
  console.log('=========================================\n');

  console.log('📋 Enhanced .npmrc Environment Variable Support:\n');

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
    console.log(`${index + 1}. ${scenario.description}:`);
    console.log(`   .npmrc: ${scenario.npmrc}`);
    console.log(`   Result: ${scenario.result}\n`);
  });

  console.log('🔧 Technical Details:\n');
  console.log('• Variables in double quotes: Expanded');
  console.log('• Variables in single quotes: NOT expanded');
  console.log('• ${VAR?} syntax: Empty string if undefined');
  console.log('• Compatible with npm behavior\n');

  console.log('📁 Configuration Files:\n');
  console.log('• ~/.npmrc (global)');
  console.log('• ./project/.npmrc (project-specific)');
  console.log('• Environment variables override file settings\n');

  console.log('🚀 Production Benefits:\n');
  console.log('• Secure token management via environment variables');
  console.log('• No hardcoded secrets in configuration files');
  console.log('• Consistent behavior across development/production');
  console.log('• Optional variable handling prevents deployment failures\n');

  console.log('✅ Enhanced Environment Variable Support Active!');
}

if (import.meta.main) {
  demonstrateEnvExpansion();
}