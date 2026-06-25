#!/usr/bin/env bun
/**
 * Demo file for bun run - TypeScript Support
 * Native TypeScript execution without compilation
 */

interface RegistryConfig {
  name: string;
  version: string;
  features: string[];
  environment: 'development' | 'staging' | 'production';
  timestamp: string;
}

interface PackageInfo {
  name: string;
  status: 'active' | 'inactive';
  dependencies: number;
}

// TypeScript features demonstration
const createRegistryConfig = (): RegistryConfig => {
  return {
    name: 'Fantasy42-Fire22 Registry',
    version: '3.1.0',
    features: ['Security', 'Analytics', 'Compliance', 'Monitoring'],
    environment: 'development',
    timestamp: new Date().toISOString(),
  };
};

const processPackages = (packages: string[]): PackageInfo[] => {
  return packages.map((pkg, index) => ({
    name: pkg,
    status: 'active' as const,
    dependencies: Math.floor(Math.random() * 10) + 1,
  }));
};

console.info('🚀 Bun Run Demo - TypeScript');
console.info('='.repeat(40));

const startTime = performance.now();

// Type-safe configuration
const config: RegistryConfig = createRegistryConfig();
console.info('Registry Configuration:');
console.info(JSON.stringify(config, null, 2));

// Type-safe package processing
const packages = ['core-security', 'analytics-dashboard', 'compliance-core'];
const processedPackages: PackageInfo[] = processPackages(packages);

console.info('\nProcessed Packages:');
processedPackages.forEach(pkg => {
  console.info(`📦 ${pkg.name}: ${pkg.status} (${pkg.dependencies} deps)`);
});

// Advanced TypeScript features
const asyncTypeScriptDemo = async (): Promise<void> => {
  console.info('\n🔄 TypeScript Async Demo:');

  // Promise-based operations
  const results = await Promise.all([
    Bun.sleep(5).then(() => 'Task 1 complete'),
    Bun.sleep(10).then(() => 'Task 2 complete'),
    Bun.sleep(15).then(() => 'Task 3 complete'),
  ]);

  results.forEach(result => console.info(`✅ ${result}`));

  // Type-safe file operations (if needed)
  console.info('📁 File operations available with Bun.file()');
};

asyncTypeScriptDemo();

const endTime = performance.now();
console.info(`\n⚡ TypeScript execution time: ${(endTime - startTime).toFixed(2)}ms`);
console.info('🎉 TypeScript execution complete!');
