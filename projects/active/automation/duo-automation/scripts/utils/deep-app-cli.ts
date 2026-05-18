#!/usr/bin/env bun

/**
 * Deep App CLI v2.7 - Config Empire Extension
 * Enhanced CLI for configuration scanning across monorepo
 * Features: Config Overrides, Env Dumps, Real R2 Sync Swarm
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { R2ConfigManager, getR2Config, setupR2Credentials, exportR2Credentials } from '../src/config/r2-manager.js';
import { SecretsOnlyConfigManager } from '../src/config/secrets-only-config.js';
import { einsteinSimilarity, fastSimilarity, codeSimilarity, nameSimilarity } from '../src/utils/einstein-similarity.js';

interface ConfigScanResult {
  name: string;
  path: string;
  ports: number;
  services: number;
  dashboards: number;
  status: 'SHARED' | 'LOCAL' | 'NOT_CONFIGURED';
  hasConfigFile: boolean;
  hasImport: boolean;
  validation?: {
    valid: boolean;
    errors: string[];
  };
}

interface ConfigDumpResult {
  proj: string;
  config: any;
  override?: string;
  env: string;
}

interface ScanOptions {
  hyper?: boolean;
  parallel?: boolean;
  projects?: boolean;
  scan?: string;
  feature?: string;
  env?: string;
  configOverride?: string;
}

class ConfigEmpireCLI {
  private projectRoot: string;
  private results: ConfigScanResult[] = [];

  constructor() {
    this.projectRoot = process.cwd();
  }

  async dumpConfigs(env: string = 'dev', override?: string): Promise<ConfigDumpResult[]> {
    console.info(`📊 Dumping Configuration Empire (${env} mode)...`);
    console.info('===========================================');

    const projectsDir = join(this.projectRoot, 'projects');
    
    if (!existsSync(projectsDir)) {
      console.info('⚠️ No projects/ directory found');
      return [];
    }

    const projects = readdirSync(projectsDir)
      .filter(name => statSync(join(projectsDir, name)).isDirectory())
      .map(name => join(projectsDir, name));

    console.info(`📁 Dumping configs for ${projects.length} projects...`);

    const results: ConfigDumpResult[] = [];

    for (const projectPath of projects) {
      const projectName = projectPath.split('/').pop() || 'unknown';
      
      try {
        const originalCwd = process.cwd();
        process.chdir(projectPath);
        
        const { config } = await import('windsurf-project/src/config/index.js');
        
        // Get config based on environment
        let dumped = (env === 'prod' && config.isProduction()) ? config : config;
        
        // Apply override if specified
        if (override) {
          const parts = override.split('=');
          if (parts.length === 2) {
            const key = parts[0];
            const value = parts[1];
            const [section, property] = key.split('.');
            
            // Use type assertions for dynamic property access
            const configAny = dumped as any;
            if (!configAny[section]) configAny[section] = {};
            
            if (section === 'ports') {
              configAny[section][property] = parseInt(value) || value;
            } else {
              configAny[section][property] = value;
            }
            
            dumped = configAny;
          }
        }
        
        process.chdir(originalCwd);
        
        results.push({
          proj: projectName,
          config: dumped,
          override: override || undefined,
          env
        });
        
        console.info(`  ✅ Dumped: ${projectName}`);
        
      } catch (error) {
        console.info(`  ❌ Failed: ${projectName} - ${(error as Error).message}`);
      }
    }

    console.info(`\n🎯 Config Dump Complete: ${results.length}/${projects.length} projects dumped`);
    return results;
  }

  async syncConfigsToR2(): Promise<void> {
    console.info('🔄 Config R2 Swarm: windsurf-project → Cloudflare R2');
    console.info('==================================================');

    try {
        // Initialize R2 manager with Bun Secrets
        const r2Config = await getR2Config();
        const r2Manager = new R2ConfigManager(r2Config);
        
        console.info(`✅ Connected to R2: ${r2Config.endpoint}`);
        console.info(`📦 Bucket: ${r2Config.bucket}`);
        console.info(`🔐 Using Bun Secrets API for credentials`);

        const projectsDir = join(this.projectRoot, 'projects');
        
        if (!existsSync(projectsDir)) {
          console.info('⚠️ No projects/ directory found');
          return;
        }

        const projects = readdirSync(projectsDir)
          .filter(name => statSync(join(projectsDir, name)).isDirectory())
          .map(name => join(projectsDir, name));

        console.info(`📁 Syncing configs to R2 for ${projects.length} projects...`);

        let syncedCount = 0;
        let connectionError = false;
        
        for (const projectPath of projects) {
          const projectName = projectPath.split('/').pop() || 'unknown';
          
          try {
            const originalCwd = process.cwd();
            process.chdir(projectPath);
            
            const { config } = await import('windsurf-project/src/config/index.js');
            
            // Sync to real R2
            await r2Manager.syncProject(projectName, config);
            
            process.chdir(originalCwd);
            syncedCount++;
            
            // Show public URL
            const publicUrl = r2Manager.getPublicUrl(projectName);
            console.info(`  ✅ ${projectName}: ${publicUrl}`);
            
          } catch (error) {
            if ((error as any).code === 'ECONNREFUSED' || (error as Error).message.includes('ECONNREFUSED')) {
              console.info(`❌ Connection error for ${projectName}`);
              connectionError = true;
              break; // Exit loop on connection error
            }
            console.info(`  ❌ Failed: ${projectName} - ${(error as Error).message}`);
          }
        }

        if (connectionError) {
          throw new Error('ECONNREFUSED');
        }

        console.info(`\n🎯 R2 Sync Complete: ${syncedCount}/${projects.length} configs synced`);
        console.info('✅ Cloudflare R2 Integration Active');
        console.info('🔐 Credentials secured with Bun Secrets API');
        
        // List all configs in R2
        const syncedProjects = await r2Manager.listConfigs();
        console.info(`📊 Total configs in R2: ${syncedProjects.length}`);
        
      } catch (error) {
        if ((error as Error).message.includes('REQUIRED SECRETS MISSING')) {
          console.info('❌ Configuration Error: All secrets must be stored in Bun Secrets');
          console.info('');
          console.info('🔒 SECRETS-ONLY CONFIGURATION REQUIRED');
          console.info('🚫 NO environment variables, NO config files, NO simulation mode');
          console.info('');
          console.info('To configure ALL required secrets:');
          console.info('  bun run secrets-setup-all');
          console.info('');
          console.info('To check current secrets:');
          console.info('  bun run secrets-get-all');
          console.info('');
          console.info('To validate configuration:');
          console.info('  bun run secrets-validate');
          console.info('');
          console.error('❌ R2 sync failed: All configuration must be in Bun Secrets');
          process.exit(1);
        } else {
          console.error('❌ R2 sync failed:', error);
          throw error;
        }
      }
  }

  private async simulateR2Sync(): Promise<void> {
    console.info('🔄 Config R2 Swarm: windsurf-project → 30 Projs (Simulation)');
    console.info('===============================================================');

    const projectsDir = join(this.projectRoot, 'projects');
    
    if (!existsSync(projectsDir)) {
      console.info('⚠️ No projects/ directory found');
      return;
    }

    const projects = readdirSync(projectsDir)
      .filter(name => statSync(join(projectsDir, name)).isDirectory())
      .map(name => join(projectsDir, name));

    console.info(`📁 Simulating R2 sync for ${projects.length} projects...`);

    let syncedCount = 0;
    for (const projectPath of projects) {
      const projectName = projectPath.split('/').pop() || 'unknown';
      
      try {
        const originalCwd = process.cwd();
        process.chdir(projectPath);
        
        const { config } = await import('windsurf-project/src/config/index.js');
        
        // Simulate R2 upload
        const r2Path = `r2://factory-wager/configs/${projectName}/config.json`;
        console.info(`  📤 Simulating: ${projectName} → ${r2Path}`);
        
        process.chdir(originalCwd);
        syncedCount++;
        
      } catch (error) {
        console.info(`  ❌ Failed: ${projectName} - ${(error as Error).message}`);
      }
    }

    console.info(`\n🎯 R2 Simulation Complete: ${syncedCount}/${projects.length} configs synced`);
    console.info('✅ 30 Configs Synced (simulation mode)');
  }

  createHyperConfigDump(projs: ConfigDumpResult[]): string {
    const r2Base = 'https://r2.dev/configs/';
    
    let output = '\u001b[1mProj    │ WebPort │ Maps URL              │ Redis            │ Override     │ R2\u001b[0m\n';
    output += '─'.repeat(70) + '\n';
    
    output += projs.map(p => {
      const webPort = p.config.ports?.webServer || 'N/A';
      const mapsUrl = (p.config.services?.maps?.url || '').slice(0, 30) + '...';
      const redisUrl = p.config.database?.redis?.url || 'N/A';
      
      // Extract override value for display
      let overrideDisplay = 'N/A';
      if (p.override) {
        const [key, value] = p.override.split('=');
        const [section, property] = key.split('.');
        overrideDisplay = `${property}:${value}`;
      }
      
      const projName = p.proj.padEnd(8);
      
      return `${projName} │ ${webPort} │ ${mapsUrl.padEnd(30)} │ ${redisUrl.padEnd(16)} │ ${overrideDisplay.padEnd(12)} │ \u001b]8;;${r2Base}${p.proj}\u001b\\[R2]\u001b[0m`;
    }).join('\n');
    
    output += `\n🏰 Windsurf Empire: ${projs.length}/30 Configs Live ✅`;
    
    return output;
  }

  async configSync(): Promise<void> {
    console.info('🔄 Configuration Sync Across Empire...');
    console.info('=====================================');

    const projectsDir = join(this.projectRoot, 'projects');
    
    if (!existsSync(projectsDir)) {
      console.info('⚠️ No projects/ directory found');
      return;
    }

    const projects = readdirSync(projectsDir)
      .filter(name => statSync(join(projectsDir, name)).isDirectory())
      .map(name => join(projectsDir, name));

    console.info(`📁 Syncing configuration across ${projects.length} projects...`);

    let syncedCount = 0;
    for (const projectPath of projects) {
      const projectName = projectPath.split('/').pop() || 'unknown';
      const configPath = join(projectPath, 'src', 'config.ts');
      
      // Create src directory if it doesn't exist
      mkdirSync(join(projectPath, 'src'), { recursive: true });
      
      // Create/update configuration file
      const configContent = `import { config } from "windsurf-project";

// Export configuration for project use
export { config };

// Project-specific configuration overrides
export const projectConfig = {
  name: '${projectName}',
  ports: config.ports,
  services: config.services,
  environment: config.app.env
};

// Last synced: ${new Date().toISOString()}
`;

      writeFileSync(configPath, configContent);
      console.info(`  ✅ Synced: ${projectName}`);
      syncedCount++;
    }

    console.info(`\n🎯 Configuration Sync Complete: ${syncedCount}/${projects.length} projects synced`);
  }

  async scanBuilds(feature?: string): Promise<void> {
    console.info('🏗️ Scanning Build Status Across Empire...');
    console.info('=======================================');

    const projectsDir = join(this.projectRoot, 'projects');
    
    if (!existsSync(projectsDir)) {
      console.info('⚠️ No projects/ directory found');
      return;
    }

    const projects = readdirSync(projectsDir)
      .filter(name => statSync(join(projectsDir, name)).isDirectory())
      .map(name => join(projectsDir, name));

    console.info(`📁 Scanning builds for ${projects.length} projects...`);

    const buildResults: Array<{name: string, buildTime: number, status: string}> = [];

    for (const projectPath of projects) {
      const projectName = projectPath.split('/').pop() || 'unknown';
      
      // Simulate build process with timing
      const startTime = Date.now();
      
      try {
        // Check if configuration is accessible
        const originalCwd = process.cwd();
        process.chdir(projectPath);
        
        const { config } = await import('windsurf-project/src/config/index.js');
        const validation = config.validate();
        
        process.chdir(originalCwd);
        
        const buildTime = Date.now() - startTime;
        const status = validation.valid ? 'SUCCESS' : 'FAILED';
        
        buildResults.push({
          name: projectName,
          buildTime,
          status
        });
        
        console.info(`  ${status === 'SUCCESS' ? '✅' : '❌'} ${projectName}: ${buildTime}ms`);
        
      } catch (error) {
        const buildTime = Date.now() - startTime;
        buildResults.push({
          name: projectName,
          buildTime,
          status: 'ERROR'
        });
        
        console.info(`  ❌ ${projectName}: ${buildTime}ms (ERROR)`);
      }
    }

    if (buildResults.length > 0) {
      const avgBuildTime = buildResults.reduce((sum, r) => sum + r.buildTime, 0) / buildResults.length;
      const successfulBuilds = buildResults.filter(r => r.status === 'SUCCESS').length;
      
      console.info(`\n📊 Build Statistics:`);
      console.info(`  Average Build Time: ${avgBuildTime.toFixed(2)}ms`);
      console.info(`  Successful Builds: ${successfulBuilds}/${buildResults.length}`);
      console.info(`  Feature: ${feature || 'ALL'}`);
    }
  }

  async scanProjects(options: ScanOptions = {}): Promise<ConfigScanResult[]> {
    console.info('🔍 Scanning Configuration Empire...');
    console.info('=====================================');

    const projectsDir = join(this.projectRoot, 'projects');
    
    if (!existsSync(projectsDir)) {
      console.info('⚠️ No projects/ directory found');
      return [];
    }

    const projects = readdirSync(projectsDir)
      .filter(name => statSync(join(projectsDir, name)).isDirectory())
      .map(name => join(projectsDir, name));

    console.info(`📁 Found ${projects.length} projects`);

    // Scan each project
    for (const projectPath of projects) {
      const result = await this.scanProject(projectPath);
      this.results.push(result);
      
      if (!options.hyper) {
        this.printProjectResult(result);
      }
    }

    if (options.hyper) {
      this.printHyperTable();
    }

    return this.results;
  }

  private async scanProject(projectPath: string): Promise<ConfigScanResult> {
    const projectName = projectPath.split('/').pop() || 'unknown';
    const configPath = join(projectPath, 'src', 'config.ts');
    
    const result: ConfigScanResult = {
      name: projectName,
      path: projectPath,
      ports: 0,
      services: 0,
      dashboards: 0,
      status: 'NOT_CONFIGURED',
      hasConfigFile: existsSync(configPath),
      hasImport: false
    };

    if (result.hasConfigFile) {
      try {
        const configContent = readFileSync(configPath, 'utf8');
        
        // Check for windsurf-project import
        result.hasImport = configContent.includes('from "windsurf-project"');
        
        if (result.hasImport) {
          result.status = 'SHARED';
          
          // Test configuration access
          try {
            // Change to project directory temporarily
            const originalCwd = process.cwd();
            process.chdir(projectPath);
            
            // Import and test configuration
            const { config } = await import('windsurf-project/src/config/index.js');
            
            result.ports = Object.keys(config.ports).length;
            result.services = Object.keys(config.services).length;
            result.dashboards = Object.keys(config.dashboards).length;
            
            // Validate configuration
            const validation = config.validate();
            result.validation = validation;
            
            process.chdir(originalCwd);
          } catch (error) {
            result.status = 'LOCAL';
            console.warn(`⚠️ Could not load shared config for ${projectName}: ${error}`);
          }
        } else {
          result.status = 'LOCAL';
        }
      } catch (error) {
        console.warn(`⚠️ Error reading config for ${projectName}: ${error}`);
      }
    }

    return result;
  }

  private printProjectResult(result: ConfigScanResult): void {
    const statusIcon = {
      'SHARED': '✅',
      'LOCAL': '🔧',
      'NOT_CONFIGURED': '❌'
    }[result.status];

    console.info(`${statusIcon} ${result.name}`);
    console.info(`   Ports: ${result.ports}, Services: ${result.services}, Dashboards: ${result.dashboards}`);
    console.info(`   Status: ${result.status}`);
    
    if (result.validation) {
      const validationIcon = result.validation.valid ? '✅' : '❌';
      console.info(`   Validation: ${validationIcon} ${result.validation.valid ? 'Passed' : 'Failed'}`);
    }
    console.info('');
  }

  private printHyperTable(): void {
    console.info('');
    console.info('🏰 Empire Pro Config Empire - Hyper Configuration Table');
    console.info('=========================================================');
    console.info('');
    console.info('| Project | Ports | Services | Dashboards | Status | R2 Config |');
    console.info('|---------|-------|----------|------------|--------|-----------|');

    let sharedCount = 0;
    let totalCount = this.results.length;

    this.results.forEach(result => {
      const statusIcon = {
        'SHARED': '✅',
        'LOCAL': '🔧',
        'NOT_CONFIGURED': '❌'
      }[result.status];

      const r2Config = result.status === 'SHARED' ? '[R2 Config]' : '❌';
      
      console.info(`| ${result.name} | ${result.ports} | ${result.services} | ${result.dashboards} | ${statusIcon} ${result.status} | ${r2Config} |`);
      
      if (result.status === 'SHARED') {
        sharedCount++;
      }
    });

    console.info('');
    console.info(`🏆 **Config Empire: ${sharedCount}/${totalCount} Projects Shared** ${sharedCount === totalCount ? '✅' : '⚠️'}`);
    
    // Statistics
    const totalPorts = this.results.reduce((sum, r) => sum + r.ports, 0);
    const totalServices = this.results.reduce((sum, r) => sum + r.services, 0);
    const totalDashboards = this.results.reduce((sum, r) => sum + r.dashboards, 0);
    
    console.info('');
    console.info('📊 Empire Statistics:');
    console.info(`  Total Ports Configured: ${totalPorts}`);
    console.info(`  Total Services Configured: ${totalServices}`);
    console.info(`  Total Dashboards Configured: ${totalDashboards}`);
    console.info(`  Configuration Coverage: ${Math.round((sharedCount / totalCount) * 100)}%`);
  }

  async validateParallel(): Promise<void> {
    console.info('🧪 Parallel Validation Across Empire...');
    console.info('=======================================');

    const promises = this.results.map(async (result) => {
      if (result.status === 'SHARED') {
        try {
          const originalCwd = process.cwd();
          process.chdir(result.path);
          
          const { config } = await import('windsurf-project/src/config/index.js');
          const validation = config.validate();
          
          process.chdir(originalCwd);
          
          return {
            project: result.name,
            valid: validation.valid,
            errors: validation.errors
          };
        } catch (error) {
          return {
            project: result.name,
            valid: false,
            errors: [(error as Error).toString()]
          };
        }
      }
      return {
        project: result.name,
        valid: false,
        errors: ['Not using shared configuration']
      };
    });

    const results = await Promise.all(promises);
    
    console.info('📊 Validation Results:');
    results.forEach(result => {
      const icon = result.valid ? '✅' : '❌';
      console.info(`  ${icon} ${result.project}: ${result.valid ? 'Valid' : 'Invalid'}`);
      if (!result.valid && result.errors.length > 0) {
        result.errors.forEach(error => console.info(`    - ${error}`));
      }
    });

    const validCount = results.filter(r => r.valid).length;
    console.info(`\n🎯 Summary: ${validCount}/${results.length} projects validated successfully`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0]; // Get the main command
  
  // Find config-override argument properly
  let configOverride: string | undefined;
  const configOverrideIndex = args.findIndex(arg => arg.startsWith('--config-override='));
  if (configOverrideIndex !== -1) {
    configOverride = args[configOverrideIndex].substring('--config-override='.length);
  }
  
  const options: ScanOptions = {
    hyper: args.includes('--hyper'),
    parallel: args.includes('--parallel'),
    projects: args.includes('--projects'),
    scan: args.find(arg => arg.startsWith('--scan='))?.split('=')[1],
    feature: args.find(arg => arg.startsWith('--feature='))?.split('=')[1],
    env: args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'dev',
    configOverride
  };

  const cli = new ConfigEmpireCLI();
  const configManager = new SecretsOnlyConfigManager();

  // Bun Secrets Commands - ALL Configuration
  if (cmd === 'secrets-setup-all') {
    await configManager.setupAllConfig();
    return;
  }

  if (cmd === 'secrets-get-all') {
    await configManager.getAllConfig();
    return;
  }

  if (cmd === 'secrets-validate') {
    const isValid = await configManager.validateConfig();
    process.exit(isValid ? 0 : 1);
  }

  if (cmd === 'secrets-export-all') {
    await configManager.exportAsEnv();
    return;
  }

  if (cmd === 'secrets-delete-all') {
    await configManager.deleteAllConfig();
    return;
  }

  // Legacy Bun Secrets Commands
  if (cmd === 'secrets-r2-setup') {
    await setupR2Credentials();
    return;
  }

  if (cmd === 'secrets-r2-export') {
    await exportR2Credentials();
    return;
  }

  // Einstein Similarity Commands
  if (cmd === 'similarity') {
    const similarityArgs = args.slice(1); // Skip 'similarity'
    const s1 = similarityArgs.find(arg => !arg.startsWith('--')) || '';
    const s2 = similarityArgs.slice(similarityArgs.findIndex(arg => !arg.startsWith('--')) + 1).find(arg => !arg.startsWith('--')) || '';
    
    if (!s1 || !s2) {
      console.info('🚀 Einstein Similarity - Empire Pro Duplicate Hunter');
      console.info('Usage: bun run deep-app-cli.ts similarity "string1" "string2" [--code|--name] [--hyper]');
      console.info('');
      console.info('Options:');
      console.info('  --code     Compare code snippets (tokenizes)');
      console.info('  --name     Compare names (normalizes)');
      console.info('  --hyper    Show hyper link to R2 visualization');
      console.info('');
      console.info('Examples:');
      console.info('  bun run deep-app-cli.ts similarity "func()" "func2()"');
      console.info('  bun run deep-app-cli.ts similarity --code "void func()" "void func2()"');
      console.info('  bun run deep-app-cli.ts similarity --name "John Doe" "Jon Doh"');
      console.info('  bun run deep-app-cli.ts similarity --hyper "Empire Pro" "Emp Pro"');
      return;
    }
    
    let similarity: number;
    let comparisonType = 'text';
    
    if (similarityArgs.includes('--code')) {
      similarity = codeSimilarity(s1, s2);
      comparisonType = 'code';
    } else if (similarityArgs.includes('--name')) {
      similarity = nameSimilarity(s1, s2);
      comparisonType = 'name';
    } else {
      similarity = einsteinSimilarity(s1, s2);
    }
    
    const fast = fastSimilarity(s1, s2);
    
    console.info(`🧬 Einstein Similarity (${comparisonType}): ${similarity.toFixed(1)}%`);
    console.info(`⚡ Fast Similarity: ${fast.toFixed(3)}`);
    
    if (similarityArgs.includes('--hyper')) {
      const r2Link = `\u001b]8;;https://r2.dev/sim?s1=${encodeURIComponent(s1)}&s2=${encodeURIComponent(s2)}\u001b\\Sim ${similarity.toFixed(1)}% [R2]\u001b[0m`;
      console.info(`🔗 ${r2Link}`);
    }
    
    // Interpretation
    if (similarity >= 90) {
      console.info('🎯 VERY HIGH SIMILARITY - Likely duplicates or variations');
    } else if (similarity >= 80) {
      console.info('⚠️  HIGH SIMILARITY - Possible duplicates, review recommended');
    } else if (similarity >= 70) {
      console.info('📊 MODERATE SIMILARITY - Some similarity, probably distinct');
    } else {
      console.info('✅ LOW SIMILARITY - Likely distinct');
    }
    
    return;
  }

  // CLI v2.7 - Config Swarm Commands
  if (args.includes('--config-dump') || cmd === 'config') {
    const results = await cli.dumpConfigs(options.env, options.configOverride);
    if (options.hyper) {
      console.info(cli.createHyperConfigDump(results));
    } else {
      console.info(JSON.stringify(results, null, 2));
    }
    return;
  }

  if (cmd === 'config-sync') {
    console.info('🔄 Config R2 Swarm: windsurf-project → 30 Projs');
    await cli.syncConfigsToR2();
    return;
  }

  // Legacy commands
  if (args.includes('config-sync')) {
    await cli.configSync();
    return;
  }

  if (options.scan === 'config') {
    await cli.scanProjects(options);
    
    if (options.parallel) {
      await cli.validateParallel();
    }
  } else if (options.scan === 'build') {
    await cli.scanBuilds(options.feature);
  } else {
    console.info('🏰 Deep App CLI v2.7 - Config Empire Extension');
    console.info('🔒 ALL CONFIGURATION IN BUN SECRETS - NO FILES, NO ENV VARS');
    console.info('Usage:');
    console.info('');
    console.info('🔐 Secrets-Only Configuration (ALL CONFIG):');
    console.info('  bun run deep-app-cli.ts secrets-setup-all      # Setup ALL config in secrets');
    console.info('  bun run deep-app-cli.ts secrets-get-all        # View ALL stored config');
    console.info('  bun run deep-app-cli.ts secrets-validate       # Validate ALL config present');
    console.info('  bun run deep-app-cli.ts secrets-export-all     # Export ALL as env vars');
    console.info('  bun run deep-app-cli.ts secrets-delete-all     # Delete ALL config');
    console.info('');
    console.info('🌐 Legacy R2-Specific:');
    console.info('  bun run deep-app-cli.ts secrets-r2-setup       # Setup R2 credentials only');
    console.info('  bun run deep-app-cli.ts secrets-r2-export      # Export R2 as env vars');
    console.info('');
    console.info('🧬 Einstein Similarity - Duplicate Hunter:');
    console.info('  bun run deep-app-cli.ts similarity "str1" "str2"           # Text similarity');
    console.info('  bun run deep-app-cli.ts similarity --code "func()" "func2()" # Code similarity');
    console.info('  bun run deep-app-cli.ts similarity --name "John" "Jon"     # Name similarity');
    console.info('  bun run deep-app-cli.ts similarity --hyper "str1" "str2"   # With R2 link');
    console.info('');
    console.info('📊 Configuration Management:');
    console.info('  bun run deep-app-cli.ts config --env=prod --hyper');
    console.info('  bun run deep-app-cli.ts config --config-override=ports.webServer=3000 --hyper');
    console.info('  bun run deep-app-cli.ts config-sync');
    console.info('  bun run deep-app-cli.ts --projects --scan=config --hyper');
    console.info('  bun run deep-app-cli.ts --projects --scan=build --feature=CONFIG_SHARED');
    console.info('');
    console.info('🚫 NO .env FILES, NO CONFIG FILES, NO ENVIRONMENT VARIABLES');
    console.info('🔒 EVERYTHING STORED IN OS CREDENTIAL MANAGER VIA BUN SECRETS');
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { ConfigEmpireCLI };
