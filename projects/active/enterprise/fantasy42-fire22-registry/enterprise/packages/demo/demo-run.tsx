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

console.info('🚀 Bun Run Demo - TSX (TypeScript + JSX)');
console.info('='.repeat(50));

const startTime = performance.now();

// Type-safe TSX rendering simulation
const renderTSX = (config: RegistryConfig): void => {
  console.info('🎨 TSX Components Rendered:');
  console.info(`📋 ${config.name} v${config.version}`);
  console.info(`🌍 Environment: ${config.environment}`);

  console.info('\n✨ TypeScript + JSX Features:');
  config.features.forEach(feature => {
    console.info(`   🔥 ${feature}`);
  });

  // Simulate component rendering
  console.info('\n📊 Registry Status Component:');
  const totalDeps = config.packages.reduce((sum, pkg) => sum + pkg.dependencies, 0);
  const activeCount = config.packages.filter(p => p.status === 'active').length;
  console.info(`   📦 Total Packages: ${config.packages.length}`);
  console.info(`   🟢 Active Packages: ${activeCount}`);
  console.info(`   🔗 Total Dependencies: ${totalDeps}`);

  console.info('\n📦 Package List Component:');
  config.packages.forEach(pkg => {
    console.info(`   📋 ${pkg.name}: ${pkg.status} (${pkg.dependencies} deps)`);
  });
};

// Render TSX components
renderTSX(registryConfig);

// Advanced TypeScript features
const advancedTypeScriptDemo = (): void => {
  console.info('\n🔧 Advanced TypeScript Features:');

  // Generics
  const createRegistry = <T extends RegistryConfig>(config: T): T => {
    console.info(`   📝 Created registry: ${config.name}`);
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

  console.info(`   🎯 Generics: Registry created successfully`);
  console.info(`   🔍 Type Guards: ${getPackageStatus('active')}`);
  console.info(`   🗺️  Mapped Types: Status messages available`);

  // Async/await with proper typing
  const asyncDemo = async (): Promise<string> => {
    await Bun.sleep(1);
    return '✅ TypeScript async operations complete';
  };

  // Promise with proper typing
  asyncDemo().then(result => console.info(`   ${result}`));
};

advancedTypeScriptDemo();

const endTime = performance.now();
console.info(`\n⚡ TSX execution time: ${(endTime - startTime).toFixed(2)}ms`);
console.info('🎉 TSX execution complete!');
