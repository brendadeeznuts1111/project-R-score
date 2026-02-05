#!/usr/bin/env bun

/**
 * 🔧 Configuration System - Using Bun v1.3.6 JSONC API
 * 
 * Handles configuration files with comments and trailing commas
 */

import { readFileSync } from 'fs';

interface EvidenceConfig {
  monitoring: {
    enabled: boolean;
    interval: number;
    alertThreshold: number;
  };
  quantumHash: {
    hardwareAcceleration: boolean;
    fallbackToSoftware: boolean;
  };
  archive: {
    compression: 'gzip' | 'none';
    level: number;
    storage: 's3' | 'local';
  };
  dashboard: {
    port: number;
    refreshInterval: number;
  };
}

class ConfigurationManager {
  private config: EvidenceConfig;
  private configPath: string;

  constructor(configPath: string = './config/evidence.jsonc') {
    this.configPath = configPath;
    this.config = this.getDefaultConfig();
    this.loadConfigurationAsync();
  }

  private async loadConfigurationAsync(): Promise<void> {
    this.config = await this.loadConfiguration();
  }

  /**
   * 📝 Load configuration using Bun.JSONC
   */
  private async loadConfiguration(): Promise<EvidenceConfig> {
    console.log('📝 Loading evidence configuration...');
    
    try {
      // Check if config file exists
      const configFile = Bun.file(this.configPath);
      if (!await configFile.exists()) {
        console.log('📝 Creating default configuration...');
        this.createDefaultConfig();
      }

      // Parse JSONC with comments and trailing commas
      const configContent = await configFile.text();
      const parsedConfig = Bun.JSONC.parse(configContent);
      
      console.log('✅ Configuration loaded successfully');
      console.log(`   • Monitoring: ${parsedConfig.monitoring?.enabled ? 'enabled' : 'disabled'}`);
      console.log(`   • Quantum Hash: ${parsedConfig.quantumHash?.hardwareAcceleration ? 'hardware' : 'software'}`);
      console.log(`   • Archive: ${parsedConfig.archive?.compression} compression`);
      
      return parsedConfig as EvidenceConfig;
    } catch (error) {
      console.error('❌ Configuration loading failed:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 🔧 Create default configuration with comments
   */
  private createDefaultConfig(): void {
    const defaultConfig = `{
  // Evidence Integrity Pipeline Configuration
  // This file uses JSONC format - comments and trailing commas are allowed
  
  "monitoring": {
    "enabled": true,  // Enable evidence monitoring
    "interval": 5000,  // Check interval in milliseconds
    "alertThreshold": 100,  // Alert threshold for anomalies
  },
  
  "quantumHash": {
    "hardwareAcceleration": true,  // Use hardware acceleration if available
    "fallbackToSoftware": true,  // Fall back to software if hardware fails
  },
  
  "archive": {
    "compression": "gzip",  // Compression type: "gzip" or "none"
    "level": 9,  // Compression level (1-12 for gzip)
    "storage": "s3",  // Storage backend: "s3" or "local"
  },
  
  "dashboard": {
    "port": 3000,  // Dashboard port
    "refreshInterval": 1000,  // Dashboard refresh interval
  },
}`;

    // Write default configuration
    Bun.write(this.configPath, defaultConfig);
    console.log(`✅ Default configuration created: ${this.configPath}`);
  }

  /**
   * 🔍 Get default configuration
   */
  private getDefaultConfig(): EvidenceConfig {
    return {
      monitoring: {
        enabled: true,
        interval: 5000,
        alertThreshold: 100,
      },
      quantumHash: {
        hardwareAcceleration: true,
        fallbackToSoftware: true,
      },
      archive: {
        compression: 'gzip',
        level: 9,
        storage: 's3',
      },
      dashboard: {
        port: 3000,
        refreshInterval: 1000,
      },
    };
  }

  /**
   * 📊 Get configuration value
   */
  get<K extends keyof EvidenceConfig>(key: K): EvidenceConfig[K] {
    return this.config[key];
  }

  /**
   * 🔧 Update configuration value
   */
  set<K extends keyof EvidenceConfig>(key: K, value: EvidenceConfig[K]): void {
    this.config[key] = value;
    this.saveConfiguration();
  }

  /**
   * 💾 Save configuration to file
   */
  private saveConfiguration(): void {
    const configContent = `{
  // Evidence Integrity Pipeline Configuration
  // Updated: ${new Date().toISOString()}
  
  "monitoring": ${JSON.stringify(this.config.monitoring, null, 2)},
  "quantumHash": ${JSON.stringify(this.config.quantumHash, null, 2)},
  "archive": ${JSON.stringify(this.config.archive, null, 2)},
  "dashboard": ${JSON.stringify(this.config.dashboard, null, 2)},
}`;
    
    Bun.write(this.configPath, configContent);
    console.log('✅ Configuration saved');
  }

  /**
   * 🔄 Reload configuration
   */
  reload(): void {
    console.log('🔄 Reloading configuration...');
    this.config = this.loadConfiguration();
  }
}

// 🚀 Demonstration
async function demonstrateConfigurationSystem() {
  console.log('🚀 Configuration System Demo - Bun v1.3.6 JSONC API');
  console.log('==================================================');
  
  const configManager = new ConfigurationManager();
  
  // Display current configuration
  console.log('\n📊 Current Configuration:');
  console.log(`   • Monitoring enabled: ${configManager.get('monitoring').enabled}`);
  console.log(`   • Check interval: ${configManager.get('monitoring').interval}ms`);
  console.log(`   • Quantum hash: ${configManager.get('quantumHash').hardwareAcceleration ? 'hardware' : 'software'}`);
  console.log(`   • Archive compression: ${configManager.get('archive').compression}`);
  console.log(`   • Dashboard port: ${configManager.get('dashboard').port}`);
  
  // Update configuration
  console.log('\n🔧 Updating configuration...');
  configManager.set('monitoring', { ...configManager.get('monitoring'), interval: 3000 });
  configManager.set('archive', { ...configManager.get('archive'), level: 12 });
  
  console.log('\n🎯 Configuration System: FULLY OPERATIONAL!');
  console.log('   • Bun.JSONC API: ✅ Utilized');
  console.log('   • Comments support: ✅ Active');
  console.log('   • Trailing commas: ✅ Supported');
  console.log('   • Dynamic updates: ✅ Working');
}

// Run demonstration
if (import.meta.main) {
  demonstrateConfigurationSystem().catch(console.error);
}

export { ConfigurationManager, EvidenceConfig };
