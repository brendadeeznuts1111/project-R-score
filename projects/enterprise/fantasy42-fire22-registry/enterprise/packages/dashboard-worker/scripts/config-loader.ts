#!/usr/bin/env bun

/**
 * Fire22 Dashboard Configuration Loader
 *
 * This script efficiently loads all dashboard configurations using Bun.file()
 * and provides a unified configuration management interface.
 */

interface DashboardConfig {
  package: {
    name: string;
    version: string;
    description: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  build: {
    target: string;
    entry: string;
    output: string;
    plugins: string[];
  };
  environment: {
    variables: Record<string, string>;
    configs: string[];
  };
  matrix: {
    health: {
      enabled: boolean;
      interval: number;
      thresholds: Record<string, number>;
    };
    permissions: {
      validation: boolean;
      autoRepair: boolean;
    };
  };
}

interface ConfigLoadResult {
  success: boolean;
  config?: DashboardConfig;
  errors: string[];
  warnings: string[];
  loadTime: number;
  timestamp: string;
}

class ConfigLoader {
  private config: DashboardConfig | null = null;
  private loadResults: ConfigLoadResult[] = [];

  constructor() {
    this.config = null;
  }

  /**
   * Load all dashboard configurations
   */
  async loadAllConfigurations(): Promise<ConfigLoadResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔧 Loading Fire22 Dashboard Configurations...\n');

    try {
      // Load package.json
      const packageConfig = await this.loadPackageConfig();
      if (!packageConfig) {
        errors.push('Failed to load package.json');
      }

      // Load build configuration
      const buildConfig = await this.loadBuildConfig();
      if (!buildConfig) {
        warnings.push('Build configuration not found, using defaults');
      }

      // Load environment configuration
      const envConfig = await this.loadEnvironmentConfig();
      if (!envConfig) {
        warnings.push('Environment configuration not found, using defaults');
      }

      // Load matrix health configuration
      const matrixConfig = await this.loadMatrixConfig();
      if (!matrixConfig) {
        warnings.push('Matrix health configuration not found, using defaults');
      }

      // Assemble final configuration
      this.config = {
        package: packageConfig || this.getDefaultPackageConfig(),
        build: buildConfig || this.getDefaultBuildConfig(),
        environment: envConfig || this.getDefaultEnvironmentConfig(),
        matrix: matrixConfig || this.getDefaultMatrixConfig(),
      };

      const loadTime = performance.now() - startTime;
      const result: ConfigLoadResult = {
        success: errors.length === 0,
        config: this.config,
        errors,
        warnings,
        loadTime,
        timestamp: new Date().toISOString(),
      };

      this.loadResults.push(result);
      return result;
    } catch (error) {
      const loadTime = performance.now() - startTime;
      const result: ConfigLoadResult = {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        loadTime,
        timestamp: new Date().toISOString(),
      };

      this.loadResults.push(result);
      return result;
    }
  }

  /**
   * Load package.json configuration
   */
  private async loadPackageConfig(): Promise<any> {
    try {
      console.log('📦 Loading package.json...');
      const packageJson = await Bun.file('package.json').json();
      console.log(`   ✅ Loaded: ${packageJson.name}@${packageJson.version}`);
      return packageJson;
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Load build configuration
   */
  private async loadBuildConfig(): Promise<any> {
    try {
      console.log('🏗️  Loading build configuration...');

      // Try bun.config.ts first
      const bunConfig = Bun.file('bun.config.ts');
      if (await bunConfig.exists()) {
        const content = await bunConfig.text();
        console.log('   ✅ Loaded: bun.config.ts');
        return this.parseBuildConfig(content);
      }

      // Try tsconfig.json
      const tsConfig = Bun.file('tsconfig.json');
      if (await tsConfig.exists()) {
        const content = await tsConfig.json();
        console.log('   ✅ Loaded: tsconfig.json');
        return this.parseTsConfig(content);
      }

      console.log('   ⚠️  No build configuration found');
      return null;
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Load environment configuration
   */
  private async loadEnvironmentConfig(): Promise<any> {
    try {
      console.log('🌍 Loading environment configuration...');

      const envFiles = ['.env', '.env.example', '.env.local'];
      const envVars: Record<string, string> = {};
      const configs: string[] = [];

      for (const envFile of envFiles) {
        const file = Bun.file(envFile);
        if (await file.exists()) {
          const content = await file.text();
          const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

          lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              envVars[key.trim()] = valueParts.join('=').trim();
            }
          });

          configs.push(envFile);
          console.log(`   ✅ Loaded: ${envFile} (${lines.length} variables)`);
        }
      }

      if (configs.length === 0) {
        console.log('   ⚠️  No environment files found');
        return null;
      }

      return { variables: envVars, configs };
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Load matrix health configuration
   */
  private async loadMatrixConfig(): Promise<any> {
    try {
      console.log('🔍 Loading matrix health configuration...');

      // Try to load matrix config file
      const matrixConfig = Bun.file('matrix-config.json');
      if (await matrixConfig.exists()) {
        const config = await matrixConfig.json();
        console.log('   ✅ Loaded: matrix-config.json');
        return config;
      }

      // Try to load from package.json scripts
      const packageJson = await Bun.file('package.json').json();
      const matrixScripts = Object.keys(packageJson.scripts || {}).filter(
        script => script.includes('matrix') || script.includes('health')
      );

      if (matrixScripts.length > 0) {
        console.log(`   ✅ Found matrix scripts: ${matrixScripts.join(', ')}`);
        return {
          health: {
            enabled: true,
            interval: 300000, // 5 minutes
            thresholds: { warning: 70, critical: 50 },
          },
          permissions: {
            validation: true,
            autoRepair: false,
          },
        };
      }

      console.log('   ⚠️  No matrix configuration found');
      return null;
    } catch (error) {
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Parse build configuration from bun.config.ts
   */
  private parseBuildConfig(content: string): any {
    // Simple parsing for bun.config.ts
    const config: any = {
      target: 'bun',
      entry: 'src/index.ts',
      output: 'dist',
      plugins: [],
    };

    // Extract entry point
    const entryMatch = content.match(/entry:\s*['"`]([^'"`]+)['"`]/);
    if (entryMatch) config.entry = entryMatch[1];

    // Extract output directory
    const outputMatch = content.match(/outdir:\s*['"`]([^'"`]+)['"`]/);
    if (outputMatch) config.output = outputMatch[1];

    return config;
  }

  /**
   * Parse TypeScript configuration
   */
  private parseTsConfig(content: any): any {
    return {
      target: 'bun',
      entry: content.compilerOptions?.rootDir || 'src',
      output: content.compilerOptions?.outDir || 'dist',
      plugins: [],
    };
  }

  /**
   * Get default package configuration
   */
  private getDefaultPackageConfig(): any {
    return {
      name: 'fire22-dashboard',
      version: '1.0.0',
      description: 'Fire22 Dashboard with Cloudflare Workers',
      scripts: {},
      dependencies: {},
      devDependencies: {},
    };
  }

  /**
   * Get default build configuration
   */
  private getDefaultBuildConfig(): any {
    return {
      target: 'bun',
      entry: 'src/index.ts',
      output: 'dist',
      plugins: [],
    };
  }

  /**
   * Get default environment configuration
   */
  private getDefaultEnvironmentConfig(): any {
    return {
      variables: {},
      configs: [],
    };
  }

  /**
   * Get default matrix configuration
   */
  private getDefaultMatrixConfig(): any {
    return {
      health: {
        enabled: true,
        interval: 300000,
        thresholds: { warning: 70, critical: 50 },
      },
      permissions: {
        validation: true,
        autoRepair: false,
      },
    };
  }

  /**
   * Get loaded configuration
   */
  getConfiguration(): DashboardConfig | null {
    return this.config;
  }

  /**
   * Get configuration summary
   */
  getConfigurationSummary(): any {
    if (!this.config) return null;

    return {
      package: {
        name: this.config.package.name,
        version: this.config.package.version,
        scriptsCount: Object.keys(this.config.package.scripts).length,
        dependenciesCount: Object.keys(this.config.package.dependencies).length,
      },
      build: {
        target: this.config.build.target,
        entry: this.config.build.entry,
        output: this.config.build.output,
      },
      environment: {
        variablesCount: Object.keys(this.config.environment.variables).length,
        configsCount: this.config.environment.configs.length,
      },
      matrix: {
        healthEnabled: this.config.matrix.health.enabled,
        validationEnabled: this.config.matrix.permissions.validation,
      },
    };
  }

  /**
   * Export configuration to file
   */
  async exportConfiguration(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: this.getConfigurationSummary(),
      loadResults: this.loadResults,
    };

    const exportPath = 'dashboard-config-export.json';
    await Bun.write(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`📤 Configuration exported to: ${exportPath}`);
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): { valid: boolean; issues: string[] } {
    if (!this.config) {
      return { valid: false, issues: ['No configuration loaded'] };
    }

    const issues: string[] = [];

    // Validate package configuration
    if (!this.config.package.name) issues.push('Package name is missing');
    if (!this.config.package.version) issues.push('Package version is missing');

    // Validate build configuration
    if (!this.config.build.entry) issues.push('Build entry point is missing');
    if (!this.config.build.output) issues.push('Build output directory is missing');

    // Validate matrix configuration
    if (this.config.matrix.health.enabled && this.config.matrix.health.interval < 60000) {
      issues.push('Matrix health interval is too low (minimum 1 minute)');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// CLI interface
if (import.meta.main) {
  const loader = new ConfigLoader();

  try {
    console.log('🚀 Fire22 Dashboard Configuration Loader');
    console.log('!==!==!==!==!==!==!====\n');

    const result = await loader.loadAllConfigurations();

    if (result.success) {
      console.log('\n✅ Configuration loaded successfully!');

      // Display summary
      const summary = loader.getConfigurationSummary();
      if (summary) {
        console.log('\n📊 Configuration Summary:');
        console.log(`   Package: ${summary.package.name}@${summary.package.version}`);
        console.log(`   Build Target: ${summary.build.target}`);
        console.log(`   Environment Variables: ${summary.environment.variablesCount}`);
        console.log(`   Matrix Health: ${summary.matrix.healthEnabled ? 'Enabled' : 'Disabled'}`);
      }

      // Validate configuration
      const validation = loader.validateConfiguration();
      if (validation.valid) {
        console.log('\n✅ Configuration validation passed');
      } else {
        console.log('\n⚠️  Configuration validation issues:');
        validation.issues.forEach(issue => console.log(`   • ${issue}`));
      }

      // Export configuration
      await loader.exportConfiguration();
    } else {
      console.log('\n❌ Configuration loading failed:');
      result.errors.forEach(error => console.log(`   • ${error}`));
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`   • ${warning}`));
      }
    }

    console.log(`\n⏱️  Total load time: ${result.loadTime.toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ Configuration loader failed:', error);
    process.exit(1);
  }
}

export { ConfigLoader, DashboardConfig, ConfigLoadResult };
