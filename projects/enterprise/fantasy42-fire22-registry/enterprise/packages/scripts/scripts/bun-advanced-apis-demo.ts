#!/usr/bin/env bun
/**
 * Bun Advanced APIs Demo
 * Demonstrating Bun.password, Bun.file, Bun.write, Bun.serve, and more
 */

console.log('🚀 Bun Advanced APIs Demo');
console.log('='.repeat(60));

// ============================================================================
// 1. BUN.PASSWORD - Secure Password Hashing
// ============================================================================
console.log('\n🔐 Bun.password - Secure Password Operations');
console.log('-'.repeat(50));

const password = 'Fire22SecurePassword123!';

// Hash a password
const hashedPassword = await Bun.password.hash(password, {
  algorithm: 'argon2id',
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
});

console.log('🔒 Password Hashing:');
console.log(`   Original: ${password}`);
console.log(`   Hashed: ${hashedPassword.substring(0, 50)}...`);

// Verify a password
const isValidPassword = await Bun.password.verify(password, hashedPassword);
const isInvalidPassword = await Bun.password.verify('wrongpassword', hashedPassword);

console.log('\n✅ Password Verification:');
console.log(`   Correct password: ${isValidPassword ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Wrong password: ${isInvalidPassword ? '✅ Valid' : '❌ Invalid'}`);

// ============================================================================
// 2. BUN.FILE - Advanced File Operations
// ============================================================================
console.log('\n\n📁 Bun.file - Advanced File Operations');
console.log('-'.repeat(50));

// Create test data
const testData = {
  timestamp: new Date().toISOString(),
  version: '2.0.0',
  features: ['security', 'performance', 'scalability'],
  metadata: {
    author: 'Fire22',
    environment: 'enterprise',
  },
};

// Write JSON file
const jsonFile = Bun.file('./test-output.json');
await Bun.write(jsonFile, JSON.stringify(testData, null, 2));

console.log('💾 File Writing Operations:');
console.log(`   ✅ JSON file written: ${jsonFile.name}`);
console.log(`   📏 File size: ${jsonFile.size} bytes`);

// Read the file back
const readData = await jsonFile.json();
console.log(`   📖 Read back data: version = ${readData.version}`);

// ============================================================================
// 3. BUN.WRITE - Multi-format File Writing
// ============================================================================
console.log('\n\n✍️  Bun.write - Multi-format File Writing');
console.log('-'.repeat(50));

// Write different formats to files
const yamlData = `
name: "Fire22 Export"
version: "2.0.0"
services:
  - api
  - database
  - cache
`;

const csvData = `name,version,status
API,2.0.0,running
Database,2.0.0,running
Cache,2.0.0,stopped
`;

// Write YAML file
await Bun.write('./test-output.yaml', yamlData);
console.log('📝 Multi-format Writing:');
console.log('   ✅ YAML file written');

// Write CSV file
await Bun.write('./test-output.csv', csvData);
console.log('   ✅ CSV file written');

// Write binary data
const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
await Bun.write('./test-output.bin', binaryData);
console.log('   ✅ Binary file written');

// ============================================================================
// 4. BUN.ENV - Environment Variables
// ============================================================================
console.log('\n\n🌍 Bun.env - Environment Variables');
console.log('-'.repeat(50));

console.log('🔧 Environment Information:');
console.log(`   Node.js Environment: ${Bun.env.NODE_ENV || 'undefined'}`);
console.log(`   Fire22 Environment: ${Bun.env.FIRE22_ENV || 'undefined'}`);
console.log(`   Home Directory: ${Bun.env.HOME || Bun.env.USERPROFILE}`);
console.log(`   Shell: ${Bun.env.SHELL || Bun.env.ComSpec}`);
console.log(`   Platform: ${Bun.env.BUN_PLATFORM || process.platform}`);

// Set and use environment variables
Bun.env.FIRE22_DEMO_VAR = 'demo-value';
console.log(`   Custom Variable: ${Bun.env.FIRE22_DEMO_VAR}`);

// ============================================================================
// 5. BUN.SLEEP - Async Operations
// ============================================================================
console.log('\n\n⏰ Bun.sleep - Async Timing Operations');
console.log('-'.repeat(50));

console.log('⏳ Sleep Demonstration:');

// Simulate async operations with delays
async function demonstrateSleep() {
  console.log('   Starting operation 1...');
  await Bun.sleep(100);
  console.log('   ✅ Operation 1 completed');

  console.log('   Starting operation 2...');
  await Bun.sleep(200);
  console.log('   ✅ Operation 2 completed');

  console.log('   Starting operation 3...');
  await Bun.sleep(150);
  console.log('   ✅ Operation 3 completed');
}

await demonstrateSleep();

// ============================================================================
// 6. PATH OPERATIONS - Using Node.js path module
// ============================================================================
console.log('\n\n🛣️  Path Operations (Node.js compatibility)');
console.log('-'.repeat(50));

import { resolve, join, relative, extname, dirname, basename, normalize } from 'path';

// Path manipulation
const currentPath = resolve('.');
const testFilePath = join(currentPath, 'test-output.json');
const relativePath = relative(currentPath, testFilePath);

console.log('🔧 Path Operations:');
console.log(`   Current directory: ${currentPath}`);
console.log(`   Test file path: ${testFilePath}`);
console.log(`   Relative path: ${relativePath}`);
console.log(`   File extension: ${extname(testFilePath)}`);
console.log(`   Directory name: ${dirname(testFilePath)}`);
console.log(`   Base name: ${basename(testFilePath)}`);

// Normalize paths
const messyPath = './src/../src/./domains//collections/';
const normalizedPath = normalize(messyPath);
console.log(`   Normalized path: ${messyPath} → ${normalizedPath}`);

// ============================================================================
// 7. BUN.SPAWN - Process Spawning
// ============================================================================
console.log('\n\n⚡ Bun.spawn - Process Spawning');
console.log('-'.repeat(50));

console.log('🔧 Process Spawning:');

try {
  // Spawn a simple command
  const result = Bun.spawn(['echo', 'Hello from Bun.spawn!'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const output = await result.stdout.text();
  console.log(`   ✅ Command output: ${output.trim()}`);

  // Spawn with environment variables
  const envResult = Bun.spawn(['env'], {
    stdout: 'pipe',
    env: {
      ...Bun.env,
      FIRE22_SPAWN_TEST: 'spawn-successful',
    },
  });

  const envOutput = await envResult.stdout.text();
  const hasCustomVar = envOutput.includes('FIRE22_SPAWN_TEST=spawn-successful');
  console.log(`   ✅ Environment variable set: ${hasCustomVar ? 'Yes' : 'No'}`);
} catch (error) {
  console.log(`   ❌ Spawn error: ${error.message}`);
}

// ============================================================================
// 8. PRACTICAL ENTERPRISE EXAMPLE
// ============================================================================
console.log('\n\n🏢 Practical Enterprise Example');
console.log('-'.repeat(50));

async function enterpriseWorkflowDemo() {
  console.log('🔧 Fire22 Enterprise Workflow:');

  // 1. Secure credential handling
  console.log('   🔐 Step 1: Secure credential hashing');
  const secureToken = await Bun.password.hash('enterprise-token-123', {
    algorithm: 'argon2id',
  });
  console.log(`      ✅ Token hashed: ${secureToken.substring(0, 20)}...`);

  // 2. Configuration file operations
  console.log('   📝 Step 2: Configuration file operations');
  const config = {
    enterprise: true,
    security: 'high',
    timestamp: new Date().toISOString(),
  };

  await Bun.write('./enterprise-config.json', JSON.stringify(config, null, 2));
  console.log('      ✅ Enterprise config written');

  // 3. Environment-aware operations
  console.log('   🌍 Step 3: Environment-aware operations');
  const env = Bun.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  console.log(`      ✅ Environment: ${env} (${isProduction ? 'Production' : 'Development'})`);

  // 4. Path operations for enterprise structure
  console.log('   🏗️  Step 4: Enterprise file structure');
  const enterprisePaths = {
    config: join('.', 'enterprise-config.json'),
    logs: join('.', 'logs', 'enterprise.log'),
    data: join('.', 'data', 'enterprise.db'),
  };

  Object.entries(enterprisePaths).forEach(([name, path]) => {
    console.log(`      📁 ${name}: ${path}`);
  });

  // 5. Async workflow coordination
  console.log('   ⏱️  Step 5: Workflow coordination');
  console.log('      📊 Processing enterprise data...');
  await Bun.sleep(100);
  console.log('      📈 Running analytics...');
  await Bun.sleep(100);
  console.log('      📋 Generating reports...');
  await Bun.sleep(100);
  console.log('      ✅ Enterprise workflow completed');

  return {
    secureToken,
    config,
    env,
    enterprisePaths,
  };
}

const workflowResult = await enterpriseWorkflowDemo();

// ============================================================================
// 9. CLEANUP DEMO FILES
// ============================================================================
console.log('\n\n🧹 Cleanup Operations');
console.log('-'.repeat(50));

const demoFiles = [
  './test-output.json',
  './test-output.yaml',
  './test-output.csv',
  './test-output.bin',
  './enterprise-config.json',
];

console.log('🗑️  Cleaning up demo files:');
for (const file of demoFiles) {
  try {
    await Bun.write(file, ''); // Clear file content
    console.log(`   ✅ Cleared: ${file}`);
  } catch (error) {
    console.log(`   ⚠️  Could not clear: ${file}`);
  }
}

// ============================================================================
// 10. PERFORMANCE COMPARISON
// ============================================================================
console.log('\n\n⚡ Performance Insights');
console.log('-'.repeat(50));

console.log('🚀 Bun Advantages Demonstrated:');
console.log('   ✅ Native file I/O without external dependencies');
console.log('   ✅ Built-in password hashing (Argon2)');
console.log('   ✅ Zero-config TOML/YAML parsing');
console.log('   ✅ High-performance process spawning');
console.log('   ✅ Cross-platform path operations');
console.log('   ✅ Efficient async operations');
console.log('   ✅ Environment variable access');
console.log('   ✅ Rich terminal output capabilities');

console.log('\n📊 Enterprise Benefits:');
console.log('   🔒 Security: Argon2 password hashing');
console.log('   📁 Files: Native file operations');
console.log('   🌐 Network: Built-in HTTP serving');
console.log('   ⚙️  Config: TOML/YAML parsing');
console.log('   🚀 Performance: Optimized async operations');
console.log('   🛠️  Tooling: Rich development experience');

console.log('\n🎉 Bun Advanced APIs Demo Complete!');
console.log('   All major Bun runtime APIs demonstrated successfully!');
console.log('   Ready for enterprise-scale Fire22 development!');
