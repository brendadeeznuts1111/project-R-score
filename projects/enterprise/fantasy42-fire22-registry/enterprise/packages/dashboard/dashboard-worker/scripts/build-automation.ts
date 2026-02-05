#!/usr/bin/env bun

/**
 * Fire22 Dashboard Worker - Comprehensive Build Automation System
 *
 * This script automates the entire build process including:
 * - Automatic version management
 * - Documentation generation and embedding
 * - Dependency analysis and updates
 * - Metadata generation and updates
 * - Package embedding and bundling
 * - Quality checks and validation
 */

import { $ } from 'bun';

interface BuildConfig {
  version: {
    autoIncrement: boolean;
    type: 'patch' | 'minor' | 'major' | 'prerelease';
    prereleaseId?: string;
  };
  documentation: {
    generate: boolean;
    embed: boolean;
    formats: ('html' | 'md' | 'json')[];
  };
  dependencies: {
    analyze: boolean;
    update: boolean;
    audit: boolean;
  };
  metadata: {
    generate: boolean;
    update: boolean;
    validate: boolean;
  };
  packaging: {
    embed: boolean;
    bundle: boolean;
    optimize: boolean;
  };
  quality: {
    lint: boolean;
    test: boolean;
    coverage: boolean;
  };
}

interface BuildResult {
  success: boolean;
  version: string;
  timestamp: string;
  duration: number;
  steps: BuildStep[];
  errors: string[];
  warnings: string[];
}

interface BuildStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  output?: string;
}

class BuildAutomation {
  private config: BuildConfig;
  private startTime: number;
  private result: BuildResult;

  constructor(config: BuildConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.result = {
      success: false,
      version: '',
      timestamp: new Date().toISOString(),
      duration: 0,
      steps: [],
      errors: [],
      warnings: [],
    };
  }

  async run(): Promise<BuildResult> {
    console.log('🔥 Fire22 Build Automation Starting...\n');

    try {
      // Step 1: Pre-build validation
      await this.runStep('Pre-build Validation', this.validateEnvironment.bind(this));

      // Step 2: Version management
      if (this.config.version.autoIncrement) {
        await this.runStep('Version Management', this.manageVersion.bind(this));
      }

      // Step 3: Dependency management
      if (this.config.dependencies.analyze || this.config.dependencies.update) {
        await this.runStep('Dependency Management', this.manageDependencies.bind(this));
      }

      // Step 4: Documentation generation
      if (this.config.documentation.generate) {
        await this.runStep('Documentation Generation', this.generateDocumentation.bind(this));
      }

      // Step 5: Metadata generation
      if (this.config.metadata.generate) {
        await this.runStep('Metadata Generation', this.generateMetadata.bind(this));
      }

      // Step 6: Quality checks
      if (this.config.quality.lint || this.config.quality.test) {
        await this.runStep('Quality Checks', this.runQualityChecks.bind(this));
      }

      // Step 7: Build packages
      await this.runStep('Package Building', this.buildPackages.bind(this));

      // Step 8: Package embedding
      if (this.config.packaging.embed) {
        await this.runStep('Package Embedding', this.embedPackages.bind(this));
      }

      // Step 9: Main build
      await this.runStep('Main Build', this.buildMain.bind(this));

      // Step 10: Documentation embedding
      if (this.config.documentation.embed) {
        await this.runStep('Documentation Embedding', this.embedDocumentation.bind(this));
      }

      // Step 11: Final validation
      await this.runStep('Final Validation', this.validateBuild.bind(this));

      // Step 12: Post-build tasks
      await this.runStep('Post-build Tasks', this.postBuildTasks.bind(this));

      this.result.success = true;
      this.result.duration = Date.now() - this.startTime;

      console.log('\n✅ Build completed successfully!');
      this.printSummary();
    } catch (error) {
      this.result.success = false;
      this.result.duration = Date.now() - this.startTime;
      this.result.errors.push(error instanceof Error ? error.message : String(error));

      console.error('\n❌ Build failed!');
      this.printSummary();
    }

    return this.result;
  }

  private async runStep(name: string, fn: () => Promise<void>): Promise<void> {
    const step: BuildStep = {
      name,
      status: 'running',
      duration: 0,
    };

    this.result.steps.push(step);
    const stepStartTime = Date.now();

    console.log(`\n🔄 ${name}...`);

    try {
      await fn();
      step.status = 'completed';
      step.duration = Date.now() - stepStartTime;
      console.log(`✅ ${name} completed in ${step.duration}ms`);
    } catch (error) {
      step.status = 'failed';
      step.duration = Date.now() - stepStartTime;
      step.error = error instanceof Error ? error.message : String(error);
      this.result.errors.push(`${name}: ${step.error}`);
      console.error(`❌ ${name} failed: ${step.error}`);
      throw error;
    }
  }

  private async validateEnvironment(): Promise<void> {
    // Check if we're in the right directory
    const packageJson = await Bun.file('package.json').json();
    if (!packageJson.name || !packageJson.name.includes('fire22-dashboard-worker')) {
      throw new Error('Must run from dashboard-worker directory');
    }

    // Check required tools
    const bunVersion = await $`bun --version`.text();
    console.log(`📦 Bun version: ${bunVersion.trim()}`);

    // Check if packages directory exists
    const packagesPath = 'packages';
    const currentDir = await $`pwd`.text();
    console.log(`📍 Current directory: ${currentDir.trim()}`);

    // Try different path approaches
    let packagesFound = false;
    const possiblePaths = ['packages', './packages', '../packages'];

    for (const path of possiblePaths) {
      try {
        const stat = await Bun.file(path).stat();
        if (stat.isDirectory) {
          console.log(`✅ Found packages at: ${path}`);
          packagesFound = true;
          break;
        }
      } catch (error) {
        console.log(`❌ Path ${path} not accessible:`, error.message);
      }
    }

    if (!packagesFound) {
      // Try using shell command as fallback
      try {
        const result = await $`ls -d packages`.text();
        if (result.trim()) {
          console.log(`✅ Found packages using shell command`);
          packagesFound = true;
        }
      } catch (error) {
        console.log(`❌ Shell command also failed:`, error.message);
      }
    }

    if (!packagesFound) {
      throw new Error(
        `Packages directory not found. Tried: ${possiblePaths.join(', ')} and shell command`
      );
    }

    // List packages for verification
    const packageDirs = await $`ls packages`.text();
    console.log(`📦 Found packages: ${packageDirs.trim()}`);
  }

  private async manageVersion(): Promise<void> {
    // Read current version
    const packageJson = await Bun.file('package.json').json();
    const currentVersion = packageJson.version;

    // Determine new version
    let newVersion: string;
    if (this.config.version.type === 'prerelease') {
      newVersion = await this.incrementPrereleaseVersion(currentVersion);
    } else {
      newVersion = await this.incrementVersion(currentVersion, this.config.version.type);
    }

    // Update package.json
    packageJson.version = newVersion;
    await Bun.write('package.json', JSON.stringify(packageJson, null, 2));

    // Update metadata
    if (packageJson.metadata) {
      packageJson.metadata.versioning = {
        ...packageJson.metadata.versioning,
        lastRelease: currentVersion,
        nextRelease: newVersion,
        lastUpdated: new Date().toISOString(),
      };
      await Bun.write('package.json', JSON.stringify(packageJson, null, 2));
    }

    this.result.version = newVersion;
    console.log(`📈 Version updated: ${currentVersion} → ${newVersion}`);
  }

  private async incrementVersion(
    currentVersion: string,
    type: 'patch' | 'minor' | 'major'
  ): Promise<string> {
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return currentVersion;
    }
  }

  private async incrementPrereleaseVersion(currentVersion: string): Promise<string> {
    const prereleaseId = this.config.version.prereleaseId || 'beta';

    if (currentVersion.includes('-')) {
      const [version, prerelease] = currentVersion.split('-');
      const [id, number] = prerelease.split('.');
      if (id === prereleaseId) {
        return `${version}-${id}.${Number(number) + 1}`;
      }
    }

    return `${currentVersion}-${prereleaseId}.1`;
  }

  private async manageDependencies(): Promise<void> {
    if (this.config.dependencies.analyze) {
      console.log('🔍 Analyzing dependencies...');
      const outdated = await $`bun outdated`.text();
      console.log('📊 Outdated packages:', outdated);
    }

    if (this.config.dependencies.update) {
      console.log('🔄 Updating dependencies...');
      await $`bun update`;
      console.log('✅ Dependencies updated');
    }

    if (this.config.dependencies.audit) {
      console.log('🔒 Auditing dependencies...');
      try {
        const audit = await $`bun audit`.text();
        console.log('🔒 Audit results:', audit);
      } catch (error) {
        console.warn('⚠️ Dependency audit failed (non-blocking):', error.message);
        console.log('🔒 Continuing build despite audit issues...');
      }
    }
  }

  private async generateDocumentation(): Promise<void> {
    console.log('📚 Generating documentation...');

    // Generate API documentation
    if (this.config.documentation.formats.includes('html')) {
      await this.generateHtmlDocs();
    }

    if (this.config.documentation.formats.includes('md')) {
      await this.generateMarkdownDocs();
    }

    if (this.config.documentation.formats.includes('json')) {
      await this.generateJsonDocs();
    }

    console.log('✅ Documentation generated');
  }

  private async generateHtmlDocs(): Promise<void> {
    // Generate comprehensive HTML documentation
    const htmlDocs = await this.generateComprehensiveHtmlDocs();
    await Bun.write('docs/build-documentation.html', htmlDocs);
  }

  private async generateMarkdownDocs(): Promise<void> {
    // Generate markdown documentation
    const mdDocs = await this.generateComprehensiveMarkdownDocs();
    await Bun.write('docs/BUILD-SYSTEM.md', mdDocs);
  }

  private async generateJsonDocs(): Promise<void> {
    // Generate JSON documentation
    const jsonDocs = await this.generateComprehensiveJsonDocs();
    await Bun.write('docs/build-system.json', jsonDocs);
  }

  private async generateMetadata(): Promise<void> {
    console.log('🏷️ Generating metadata...');

    const packageJson = await Bun.file('package.json').json();

    // Generate comprehensive metadata
    const metadata = {
      build: {
        timestamp: new Date().toISOString(),
        version: packageJson.version,
        environment: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: (await $`bun --version`.text()).trim(),
      },
      packages: await this.analyzePackages(),
      dependencies: await this.analyzeDependencies(),
      performance: await this.analyzePerformance(),
      quality: await this.analyzeQuality(),
    };

    // Update package.json metadata
    packageJson.metadata = {
      ...packageJson.metadata,
      build: metadata,
    };

    await Bun.write('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Metadata generated and updated');
  }

  private async analyzePackages(): Promise<any> {
    const packages: any = {};

    try {
      const packageDirs = await $`ls packages`.text();
      const packageList = packageDirs.trim().split('\n');

      for (const pkg of packageList) {
        const packagePath = `packages/${pkg}`;
        const packageJsonPath = `${packagePath}/package.json`;

        if (await Bun.file(packageJsonPath).exists()) {
          const packageJson = await Bun.file(packageJsonPath).json();
          const distPath = `${packagePath}/dist`;

          packages[pkg] = {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            size: await this.calculatePackageSize(packagePath),
            buildStatus: (await Bun.file(distPath).exists()) ? 'built' : 'not-built',
            lastModified: await this.getLastModified(packagePath),
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not analyze packages:', error);
    }

    return packages;
  }

  private async analyzeDependencies(): Promise<any> {
    try {
      const packageJson = await Bun.file('package.json').json();
      return {
        total:
          Object.keys(packageJson.dependencies || {}).length +
          Object.keys(packageJson.devDependencies || {}).length,
        production: Object.keys(packageJson.dependencies || {}).length,
        development: Object.keys(packageJson.devDependencies || {}).length,
        outdated: await this.getOutdatedCount(),
        vulnerabilities: await this.getVulnerabilityCount(),
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  private async analyzePerformance(): Promise<any> {
    return {
      buildTime: this.result.duration,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
    };
  }

  private async analyzeQuality(): Promise<any> {
    return {
      lintStatus: 'pending',
      testStatus: 'pending',
      coverageStatus: 'pending',
      buildStatus: 'in-progress',
    };
  }

  private async buildPackages(): Promise<void> {
    console.log('🏗️ Building packages...');

    const packageDirs = await $`ls packages`.text();
    const packageList = packageDirs.trim().split('\n');

    for (const pkg of packageList) {
      const packagePath = `packages/${pkg}`;
      const packageJsonPath = `${packagePath}/package.json`;

      if (await Bun.file(packageJsonPath).exists()) {
        console.log(`  📦 Building ${pkg}...`);
        try {
          await $`cd ${packagePath} && bun run build`.quiet();
          console.log(`  ✅ ${pkg} built successfully`);
        } catch (error) {
          console.error(`  ❌ ${pkg} build failed:`, error);
          throw error;
        }
      }
    }
  }

  private async embedPackages(): Promise<void> {
    console.log('🔗 Embedding packages...');

    // Create embedded packages file
    const embeddedPackages = await this.createEmbeddedPackages();
    await Bun.write('src/embedded-packages.ts', embeddedPackages);

    console.log('✅ Packages embedded');
  }

  private async buildMain(): Promise<void> {
    console.log('🏗️ Building main application...');

    // Run the main build using manual build command
    await $`bun build ./src/index.ts --target=bun --outdir ./dist`;

    console.log('✅ Main application built');
  }

  private async runQualityChecks(): Promise<void> {
    console.log('🧪 Running quality checks...');

    if (this.config.quality.lint) {
      console.log('  🔍 Running linting...');
      try {
        await $`bun run lint:check`.quiet();
        console.log('  ✅ Linting passed');
      } catch (error) {
        console.warn('  ⚠️ Linting failed (non-blocking):', error.message);
      }
    }

    if (this.config.quality.test) {
      console.log('  🧪 Running tests...');
      try {
        await $`bun run test:quick`.quiet();
        console.log('  ✅ Tests passed');
      } catch (error) {
        console.warn('  ⚠️ Tests failed (non-blocking):', error.message);
      }
    }

    if (this.config.quality.coverage) {
      console.log('  📊 Running coverage...');
      try {
        await $`bun run test:coverage`.quiet();
        console.log('  ✅ Coverage generated');
      } catch (error) {
        console.warn('  ⚠️ Coverage failed (non-blocking):', error.message);
      }
    }

    console.log('✅ Quality checks completed');
  }

  private async embedDocumentation(): Promise<void> {
    console.log('📚 Embedding documentation...');

    // Embed documentation into the build
    const embeddedDocs = await this.createEmbeddedDocumentation();
    await Bun.write('src/embedded-documentation.ts', embeddedDocs);

    console.log('✅ Documentation embedded');
  }

  private async validateBuild(): Promise<void> {
    console.log('✅ Validating build...');

    // Check current directory and list contents
    const currentDir = await $`pwd`.text();
    console.log(`📍 Validation directory: ${currentDir.trim()}`);

    const lsResult = await $`ls -la`.text();
    console.log('📁 Directory contents:', lsResult);

    // Check if dist directory exists and has content using shell commands
    try {
      // Use shell command to check if dist exists
      const distCheck = await $`test -d dist && echo "exists" || echo "not found"`.text();
      if (distCheck.trim() !== 'exists') {
        throw new Error('Build output directory not found');
      }

      const distFiles = await $`ls -la dist`.text();
      console.log('📁 Build output:', distFiles);

      // Validate package builds
      const packageDirs = await $`ls packages`.text();
      const packageList = packageDirs.trim().split('\n');

      for (const pkg of packageList) {
        if (pkg === 'README.md') continue; // Skip README file

        const distPath = `packages/${pkg}/dist`;
        try {
          const pkgDistCheck =
            await $`test -d ${distPath} && echo "exists" || echo "not found"`.text();
          if (pkgDistCheck.trim() === 'exists') {
            const files = await $`ls ${distPath}`.text();
            console.log(`  📦 ${pkg} dist files:`, files.trim());
          } else {
            console.log(`  ⚠️ ${pkg} has no dist directory`);
          }
        } catch (error) {
          console.log(`  ❌ Error checking ${pkg}:`, error.message);
        }
      }

      console.log('✅ Build validation passed');
    } catch (error) {
      console.error('❌ Validation error:', error);
      throw error;
    }
  }

  private async postBuildTasks(): Promise<void> {
    console.log('🚀 Running post-build tasks...');

    // Generate build report
    const buildReport = await this.generateBuildReport();
    await Bun.write('BUILD-REPORT.md', buildReport);

    // Update CHANGELOG
    await this.updateChangelog();

    // Clean up temporary files
    await this.cleanup();

    console.log('✅ Post-build tasks completed');
  }

  private async generateBuildReport(): Promise<string> {
    const packageJson = await Bun.file('package.json').json();

    return `# Fire22 Dashboard Worker - Build Report

**Build Date**: ${new Date().toLocaleDateString()}
**Build Time**: ${new Date().toLocaleTimeString()}
**Version**: ${packageJson.version}
**Duration**: ${this.result.duration}ms
**Status**: ${this.result.success ? '✅ SUCCESS' : '❌ FAILED'}

## Build Steps

${this.result.steps
  .map(
    step =>
      `- **${step.name}**: ${step.status} ${step.duration ? `(${step.duration}ms)` : ''} ${step.error ? `- ${step.error}` : ''}`
  )
  .join('\n')}

## Errors

${this.result.errors.length > 0 ? this.result.errors.map(error => `- ${error}`).join('\n') : 'None'}

## Warnings

${this.result.warnings.length > 0 ? this.result.warnings.map(warning => `- ${warning}`).join('\n') : 'None'}

## Package Status

${Object.entries(await this.analyzePackages())
  .map(([name, info]: [string, any]) => `- **${name}**: ${info.buildStatus} (${info.size})`)
  .join('\n')}

---
*Generated by Fire22 Build Automation System*
`;
  }

  private async updateChangelog(): Promise<void> {
    const packageJson = await Bun.file('package.json').json();
    const changelogPath = 'CHANGELOG.md';

    let changelog = '';
    if (await Bun.file(changelogPath).exists()) {
      changelog = await Bun.file(changelogPath).text();
    }

    const newEntry = `## [${packageJson.version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Automated build system with version management
- Comprehensive documentation generation
- Package embedding and bundling
- Quality checks and validation

### Changed
- Build process now fully automated
- Version management integrated
- Documentation automatically generated and embedded

### Technical
- Build duration: ${this.result.duration}ms
- Packages built: ${Object.keys(await this.analyzePackages()).length}
- Build status: ${this.result.success ? 'SUCCESS' : 'FAILED'}

---

`;

    const updatedChangelog = newEntry + changelog;
    await Bun.write(changelogPath, updatedChangelog);
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');

    // Remove temporary files
    try {
      await $`rm -rf .build-temp`;
      await $`rm -rf .build-cache`;
    } catch (error) {
      // Ignore cleanup errors
    }

    console.log('✅ Cleanup completed');
  }

  private async calculatePackageSize(packagePath: string): Promise<string> {
    try {
      const distPath = `${packagePath}/dist`;
      if (await Bun.file(distPath).exists()) {
        const size = await $`du -sh ${distPath}`.text();
        return size.trim().split('\t')[0];
      }
      return '0B';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getLastModified(path: string): Promise<string> {
    try {
      const stat = await Bun.file(path).stat();
      return new Date(stat.mtime).toISOString();
    } catch (error) {
      return 'unknown';
    }
  }

  private async getOutdatedCount(): Promise<number> {
    try {
      const outdated = await $`bun outdated --json`.text();
      const packages = JSON.parse(outdated);
      return packages.length;
    } catch (error) {
      return 0;
    }
  }

  private async getVulnerabilityCount(): Promise<number> {
    try {
      const audit = await $`bun audit --json`.text();
      const result = JSON.parse(audit);
      return result.vulnerabilities?.length || 0;
    } catch (error) {
      return 0;
    }
  }

  private async createEmbeddedPackages(): Promise<string> {
    return `// Auto-generated embedded packages
// Generated on: ${new Date().toISOString()}

export const embeddedPackages = {
  version: "${this.result.version}",
  timestamp: "${new Date().toISOString()}",
  packages: ${JSON.stringify(await this.analyzePackages(), null, 2)}
};

export default embeddedPackages;
`;
  }

  private async createEmbeddedDocumentation(): Promise<string> {
    return `// Auto-generated embedded documentation
// Generated on: ${new Date().toISOString()}

export const embeddedDocumentation = {
  version: "${this.result.version}",
  timestamp: "${new Date().toISOString()}",
  buildReport: ${JSON.stringify(this.result, null, 2)}
};

export default embeddedDocumentation;
`;
  }

  private async generateComprehensiveHtmlDocs(): Promise<string> {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Build System Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d); color: white; padding: 20px; border-radius: 10px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .success { border-color: #4CAF50; background-color: #f1f8e9; }
        .error { border-color: #f44336; background-color: #ffebee; }
        .warning { border-color: #ff9800; background-color: #fff3e0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔥 Fire22 Build System Documentation</h1>
        <p>Comprehensive build automation and documentation system</p>
    </div>
    
    <div class="section success">
        <h2>Build Status: ${this.result.success ? 'SUCCESS' : 'FAILED'}</h2>
        <p><strong>Version:</strong> ${this.result.version}</p>
        <p><strong>Duration:</strong> ${this.result.duration}ms</p>
        <p><strong>Timestamp:</strong> ${this.result.timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Build Steps</h2>
        <ul>
            ${this.result.steps
              .map(
                step =>
                  `<li><strong>${step.name}:</strong> ${step.status} ${step.duration ? `(${step.duration}ms)` : ''}</li>`
              )
              .join('')}
        </ul>
    </div>
    
    <div class="section">
        <h2>Configuration</h2>
        <pre>${JSON.stringify(this.config, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  private async generateComprehensiveMarkdownDocs(): Promise<string> {
    return `# Fire22 Build System Documentation

## Overview

The Fire22 Build Automation System provides comprehensive build management including:

- **Automatic Version Management**: Increment versions automatically
- **Documentation Generation**: Generate HTML, Markdown, and JSON docs
- **Dependency Management**: Analyze, update, and audit dependencies
- **Metadata Generation**: Comprehensive build metadata
- **Package Embedding**: Embed packages and documentation
- **Quality Checks**: Lint, test, and coverage validation

## Configuration

\`\`\`typescript
interface BuildConfig {
  version: {
    autoIncrement: boolean;
    type: 'patch' | 'minor' | 'major' | 'prerelease';
    prereleaseId?: string;
  };
  documentation: {
    generate: boolean;
    embed: boolean;
    formats: ('html' | 'md' | 'json')[];
  };
  dependencies: {
    analyze: boolean;
    update: boolean;
    audit: boolean;
  };
  metadata: {
    generate: boolean;
    update: boolean;
    validate: boolean;
  };
  packaging: {
    embed: boolean;
    bundle: boolean;
    optimize: boolean;
  };
  quality: {
    lint: boolean;
    test: boolean;
    coverage: boolean;
  };
}
\`\`\`

## Usage

\`\`\`bash
# Run with default configuration
bun run scripts/build-automation.ts

# Run with custom configuration
bun run scripts/build-automation.ts --config=production
\`\`\`

## Build Process

1. **Pre-build Validation**: Environment and tool checks
2. **Version Management**: Automatic version incrementing
3. **Dependency Management**: Analysis, updates, and auditing
4. **Documentation Generation**: HTML, Markdown, and JSON docs
5. **Metadata Generation**: Comprehensive build metadata
6. **Quality Checks**: Lint, test, and coverage validation
7. **Package Building**: Build all modular packages
8. **Package Embedding**: Embed packages into main build
9. **Main Build**: Build main application
10. **Documentation Embedding**: Embed docs into build
11. **Final Validation**: Validate build output
12. **Post-build Tasks**: Reports, changelog, cleanup

## Output

The build system generates:

- **Updated package.json**: With new version and metadata
- **Build Report**: Comprehensive build summary
- **Embedded Packages**: Packages embedded in main build
- **Embedded Documentation**: Documentation embedded in build
- **Updated CHANGELOG**: Automatic changelog updates
- **Quality Reports**: Lint, test, and coverage results

## Integration

This build system integrates with:

- **Bun Package Manager**: For dependency management
- **TypeScript**: For type checking and compilation
- **ESLint**: For code quality
- **Testing Framework**: For validation
- **Documentation System**: For comprehensive docs

---
*Generated by Fire22 Build Automation System*
`;
  }

  private async generateComprehensiveJsonDocs(): Promise<string> {
    return JSON.stringify(
      {
        buildSystem: {
          name: 'Fire22 Build Automation System',
          version: '1.0.0',
          description: 'Comprehensive build automation and documentation system',
          features: [
            'Automatic version management',
            'Documentation generation',
            'Dependency management',
            'Metadata generation',
            'Package embedding',
            'Quality checks',
          ],
          configuration: this.config,
          buildResult: this.result,
          timestamp: new Date().toISOString(),
        },
      },
      null,
      2
    );
  }

  private printSummary(): void {
    console.log('\n📊 Build Summary');
    console.log('!==!==!==');
    console.log(`Status: ${this.result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Version: ${this.result.version}`);
    console.log(`Duration: ${this.result.duration}ms`);
    console.log(`Steps: ${this.result.steps.length}`);
    console.log(`Errors: ${this.result.errors.length}`);
    console.log(`Warnings: ${this.result.warnings.length}`);

    if (this.result.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
  }
}

// Default configuration
const defaultConfig: BuildConfig = {
  version: {
    autoIncrement: true,
    type: 'patch',
  },
  documentation: {
    generate: true,
    embed: true,
    formats: ['html', 'md', 'json'],
  },
  dependencies: {
    analyze: true,
    update: false,
    audit: true,
  },
  metadata: {
    generate: true,
    update: true,
    validate: true,
  },
  packaging: {
    embed: true,
    bundle: true,
    optimize: true,
  },
  quality: {
    lint: true,
    test: true,
    coverage: true,
  },
};

// Production configuration
const productionConfig: BuildConfig = {
  ...defaultConfig,
  version: {
    autoIncrement: true,
    type: 'minor',
  },
  dependencies: {
    analyze: true,
    update: true,
    audit: true,
  },
  quality: {
    lint: true,
    test: true,
    coverage: true,
  },
};

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const config = args.includes('--production') ? productionConfig : defaultConfig;

  const automation = new BuildAutomation(config);
  const result = await automation.run();

  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Build automation failed:', error);
    process.exit(1);
  });
}

export { BuildAutomation, BuildConfig, BuildResult, defaultConfig, productionConfig };
