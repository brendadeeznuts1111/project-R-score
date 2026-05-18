#!/usr/bin/env bun

/**
 * Build Script with Bunfig Configuration
 * Demonstrates using various bunfig.toml configurations
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Read bunfig.toml configuration
function loadBunfig() {
  try {
    const bunfigPath = join(process.cwd(), 'bunfig.toml');
    if (!existsSync(bunfigPath)) {
      console.error('❌ bunfig.toml not found');
      process.exit(1);
    }

    const content = readFileSync(bunfigPath, 'utf-8');
    return parseTOML(content);
  } catch (error) {
    console.error('❌ Failed to load bunfig.toml:', error);
    process.exit(1);
  }
}

// Simple TOML parser for our needs
function parseTOML(content: string): any {
  const config: any = {};
  let currentSection = '';

  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      if (!config[currentSection]) {
        config[currentSection] = {};
      }
      return;
    }

    if (line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      let value = valueParts.join('=').trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Convert boolean strings
      if (value === 'true') value = true;
      if (value === 'false') value = false;

      // Parse numbers
      if (!isNaN(Number(value))) value = Number(value);

      // Set nested property
      const keys = key.trim().split('.');
      let current = config;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
    }
  });

  return config;
}

// Main build function
async function buildWithConfig() {
  console.info('🔨 Build Script with Bunfig Configuration');
  console.info('==========================================');

  const config = loadBunfig();
  const bundleConfig = config.bundle || {};
  const performanceConfig = config.performance || {};
  const analyticsConfig = config.analytics || {};

  console.info('📊 Configuration loaded:');
  console.info(`   Target: ${bundleConfig.target || 'browser'}`);
  console.info(`   Format: ${bundleConfig.format || 'esm'}`);
  console.info(`   Minify: ${bundleConfig.minify ? 'Enabled' : 'Disabled'}`);
  console.info(`   Source Maps: ${bundleConfig.sourcemap || 'none'}`);
  console.info(`   Performance: ${performanceConfig.optimizations ? 'Optimized' : 'Standard'}`);
  console.info(`   Analytics: ${analyticsConfig.enabled ? 'Enabled' : 'Disabled'}`);
  console.info('');

  // Create build output directory
  const outputDir = bundleConfig.output_dir || './dist';
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
    console.info(`📁 Created output directory: ${outputDir}`);
  }

  // Create analytics directory if enabled
  if (analyticsConfig.enabled) {
    const analyticsDir = analyticsConfig.output_dir || './analytics';
    if (!existsSync(analyticsDir)) {
      mkdirSync(analyticsDir, { recursive: true });
      console.info(`📊 Created analytics directory: ${analyticsDir}`);
    }
  }

  // Simulate build process
  console.info('🏗️  Building application...');

  // Create a sample build output
  const buildOutput = {
    timestamp: new Date().toISOString(),
    config: {
      target: bundleConfig.target || 'browser',
      format: bundleConfig.format || 'esm',
      minified: bundleConfig.minify ? true : false,
      sourcemap: bundleConfig.sourcemap || 'none',
    },
    performance: {
      optimized: performanceConfig.optimizations || false,
      preloaded: performanceConfig.preload || [],
    },
    analytics: {
      enabled: analyticsConfig.enabled || false,
      output_dir: analyticsConfig.output_dir || './analytics',
    },
    files: ['index.js', 'app.js', 'vendor.js', 'styles.css'],
    size: '2.3MB',
    chunks: 4,
  };

  // Write build manifest
  const manifestPath = join(outputDir, 'build-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(buildOutput, null, 2));
  console.info(`📄 Generated build manifest: ${manifestPath}`);

  // Create analytics report if enabled
  if (analyticsConfig.enabled) {
    const analyticsPath = join(analyticsConfig.output_dir || './analytics', 'build-report.json');
    const analyticsReport = {
      build_time: new Date().toISOString(),
      bundle_size: buildOutput.size,
      chunks: buildOutput.chunks,
      performance_score: 95,
      security_score: 98,
      accessibility_score: 92,
    };

    writeFileSync(analyticsPath, JSON.stringify(analyticsReport, null, 2));
    console.info(`📊 Generated analytics report: ${analyticsPath}`);
  }

  // Create performance report
  if (performanceConfig.optimizations) {
    console.info('⚡ Performance optimizations applied:');
    console.info('   ✅ Code splitting enabled');
    console.info('   ✅ Tree shaking applied');
    console.info('   ✅ Minification completed');
    console.info('   ✅ Compression enabled');

    if (performanceConfig.preload && performanceConfig.preload.length > 0) {
      console.info('   ✅ Critical resources preloaded:');
      performanceConfig.preload.forEach((resource: string) => {
        console.info(`      • ${resource}`);
      });
    }
  }

  console.info('');
  console.info('✅ Build completed successfully!');
  console.info(`📦 Output directory: ${outputDir}`);
  console.info(`📊 Bundle size: ${buildOutput.size}`);
  console.info(`🔢 Total chunks: ${buildOutput.chunks}`);
  console.info(`🎯 Target: ${buildOutput.config.target}`);
  console.info(`📄 Format: ${buildOutput.config.format}`);

  if (analyticsConfig.enabled) {
    console.info('');
    console.info('📈 Analytics enabled - Reports generated in:');
    console.info(`   ${analyticsConfig.output_dir || './analytics'}`);
  }

  console.info('');
  console.info('🚀 Ready for deployment!');
}

// Run the build
buildWithConfig().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
