#!/usr/bin/env bun
/**
 * Demo file for bun run - TSX Support
 * Native TSX execution with full TypeScript + JSX support
 */

// TypeScript interfaces for TSX components
interface RegistryConfig {
  name: string;
  version: string;
  features: string[];
  environment: 'development' | 'staging' | 'production';
  packages: PackageInfo[];
}

interface PackageInfo {
  name: string;
  status: 'active' | 'inactive';
  dependencies: number;
  lastUpdated: Date;
}

// TSX Component with TypeScript
const RegistryStatus: React.FC<{ config: RegistryConfig }> = ({ config }) => {
  const totalDeps = config.packages.reduce((sum, pkg) => sum + pkg.dependencies, 0);
  const activeCount = config.packages.filter(p => p.status === 'active').length;

  return (
    <div className="registry-status">
      <h2>📊 Registry Status</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{config.packages.length}</span>
          <span className="stat-label">Total Packages</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">Active Packages</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalDeps}</span>
          <span className="stat-label">Dependencies</span>
        </div>
      </div>
    </div>
  );
};

const PackageList: React.FC<{ packages: PackageInfo[] }> = ({ packages }) => {
  return (
    <div className="package-list">
      <h3>📦 Package Details</h3>
      {packages.map((pkg, index) => (
        <div key={index} className={`package-item ${pkg.status}`}>
          <h4>{pkg.name}</h4>
          <div className="package-meta">
            <span className={`status ${pkg.status}`}>
              {pkg.status === 'active' ? '🟢' : '🔴'} {pkg.status}
            </span>
            <span className="deps">{pkg.dependencies} deps</span>
            <span className="updated">Updated: {pkg.lastUpdated.toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Sample data with proper typing
const registryConfig: RegistryConfig = {
  name: 'Fantasy42-Fire22 Registry',
  version: '3.1.0',
  features: ['Security', 'Analytics', 'Compliance', 'Monitoring', 'TypeScript'],
  environment: 'development',
  packages: [
    { name: 'core-security', status: 'active', dependencies: 12, lastUpdated: new Date() },
    { name: 'analytics-dashboard', status: 'active', dependencies: 8, lastUpdated: new Date() },
    { name: 'compliance-core', status: 'active', dependencies: 6, lastUpdated: new Date() },
  ],
};

console.log('🚀 Bun Run Demo - TSX (TypeScript + JSX)');
console.log('='.repeat(50));

const startTime = performance.now();

// Type-safe TSX rendering simulation
const renderTSX = (config: RegistryConfig): void => {
  console.log('🎨 TSX Components Rendered:');
  console.log(`📋 ${config.name} v${config.version}`);
  console.log(`🌍 Environment: ${config.environment}`);

  console.log('\n✨ TypeScript + JSX Features:');
  config.features.forEach(feature => {
    console.log(`   🔥 ${feature}`);
  });

  // Simulate component rendering
  console.log('\n📊 Registry Status Component:');
  const totalDeps = config.packages.reduce((sum, pkg) => sum + pkg.dependencies, 0);
  const activeCount = config.packages.filter(p => p.status === 'active').length;
  console.log(`   📦 Total Packages: ${config.packages.length}`);
  console.log(`   🟢 Active Packages: ${activeCount}`);
  console.log(`   🔗 Total Dependencies: ${totalDeps}`);

  console.log('\n📦 Package List Component:');
  config.packages.forEach(pkg => {
    console.log(`   📋 ${pkg.name}: ${pkg.status} (${pkg.dependencies} deps)`);
  });
};

// Render TSX components
renderTSX(registryConfig);

// Advanced TypeScript features
const advancedTypeScriptDemo = (): void => {
  console.log('\n🔧 Advanced TypeScript Features:');

  // Generics
  const createRegistry = <T extends RegistryConfig>(config: T): T => {
    console.log(`   📝 Created registry: ${config.name}`);
    return config;
  };

  // Union types and type guards
  const getPackageStatus = (status: 'active' | 'inactive'): string => {
    return status === 'active' ? '🟢 Operational' : '🔴 Inactive';
  };

  // Mapped types
  type PackageStatusMap = {
    [K in PackageInfo['status']]: string;
  };

  const statusMessages: PackageStatusMap = {
    active: '🟢 Package is active and running',
    inactive: '🔴 Package is inactive',
  };

  console.log(`   🎯 Generics: Registry created successfully`);
  console.log(`   🔍 Type Guards: ${getPackageStatus('active')}`);
  console.log(`   🗺️  Mapped Types: Status messages available`);

  // Async/await with proper typing
  const asyncDemo = async (): Promise<string> => {
    await Bun.sleep(1);
    return '✅ TypeScript async operations complete';
  };

  // Promise with proper typing
  asyncDemo().then(result => console.log(`   ${result}`));
};

advancedTypeScriptDemo();

const endTime = performance.now();
console.log(`\n⚡ TSX execution time: ${(endTime - startTime).toFixed(2)}ms`);
console.log('🎉 TSX execution complete!');
