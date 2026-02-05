#!/usr/bin/env bun
/**
 * Demo file for bun run - JSX Support
 * Native JSX execution without build step
 */

// JSX-like structure (simplified for Bun execution)
const createRegistryDashboard = config => {
  return {
    type: 'div',
    props: { className: 'registry-dashboard' },
    children: [
      { type: 'header', children: `🚀 ${config.name}` },
      { type: 'section', children: `Version: ${config.version}` },
      {
        type: 'section',
        children: config.packages
          .map(pkg => `📦 ${pkg.name} (${pkg.status}) - ${pkg.dependencies} deps`)
          .join('\n'),
      },
    ],
  };
};

// Data for JSX demo
const config = {
  name: 'Fantasy42-Fire22 Registry',
  version: '3.1.0',
  features: ['Security', 'Analytics', 'Compliance', 'Monitoring'],
  environment: 'development',
  packages: [
    { name: 'core-security', status: 'active', dependencies: 12 },
    { name: 'analytics-dashboard', status: 'active', dependencies: 8 },
    { name: 'compliance-core', status: 'active', dependencies: 6 },
  ],
};

console.log('🚀 Bun Run Demo - JSX');
console.log('='.repeat(40));

const startTime = performance.now();

// Render JSX component (simulated)
const renderJSX = component => {
  // In a real React app, this would be ReactDOM.render()
  // Here we just simulate the structure
  console.log('🎨 JSX Component Rendered:');
  console.log(`📋 ${component.props.config.name}`);
  console.log(`🏷️  Version: ${component.props.config.version}`);
  console.log(`🌍 Environment: ${component.props.config.environment}`);

  console.log('\n✨ Features:');
  component.props.config.features.forEach(feature => {
    console.log(`   🔥 ${feature}`);
  });

  console.log('\n📦 Packages:');
  component.props.config.packages.forEach(pkg => {
    console.log(`   📋 ${pkg.name} (${pkg.status}) - ${pkg.dependencies} deps`);
  });
};

// Simulate JSX rendering
const dashboard = createRegistryDashboard(config);
renderJSX(dashboard);

// JSX with expressions
const packageCount = config.packages.length;
const activePackages = config.packages.filter(p => p.status === 'active').length;

console.log(`\n📊 Statistics:`);
console.log(`   Total Packages: ${packageCount}`);
console.log(`   Active Packages: ${activePackages}`);
console.log(
  `   Total Dependencies: ${config.packages.reduce((sum, pkg) => sum + pkg.dependencies, 0)}`
);

const endTime = performance.now();
console.log(`\n⚡ JSX execution time: ${(endTime - startTime).toFixed(2)}ms`);
console.log('🎉 JSX execution complete!');
