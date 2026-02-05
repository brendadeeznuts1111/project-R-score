#!/usr/bin/env bun
/**
 * Modular Configuration Manager
 * Interactive CLI for managing modular system configuration
 * 
 * Features:
 * - Theme switching and preview
 * - Endpoint management and testing
 * - Dashboard configuration
 * - Bulk operations and exports
 * - Interactive configuration wizard
 */

import { modularSystem, ColorSchemes, Endpoints, Dashboards } from '../config/modular-system.ts';
import { readFile, writeFile } from 'fs/promises';
import { createInterface } from 'readline';

interface ConfigExport {
  timestamp: string;
  version: string;
  themes: string[];
  endpoints: string[];
  dashboards: string[];
  currentTheme: string;
}

class ModularConfigManager {
  private rl: any;

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Start interactive configuration manager
   */
  async start(): Promise<void> {
    console.log('🔧 Modular Configuration Manager');
    console.log('==================================');
    console.log('');

    while (true) {
      await this.showMainMenu();
      const choice = await this.askQuestion('Enter your choice (1-7): ');
      
      switch (choice) {
        case '1':
          await this.manageThemes();
          break;
        case '2':
          await this.manageEndpoints();
          break;
        case '3':
          await this.manageDashboards();
          break;
        case '4':
          await this.healthCheckAll();
          break;
        case '5':
          await this.exportConfiguration();
          break;
        case '6':
          await this.importConfiguration();
          break;
        case '7':
          console.log('👋 Goodbye!');
          process.exit(0);
        default:
          console.log('❌ Invalid choice. Please try again.');
      }
      
      console.log('');
    }
  }

  /**
   * Show main menu
   */
  private async showMainMenu(): Promise<void> {
    console.log('📋 Main Menu:');
    console.log('1. 🎨 Manage Themes');
    console.log('2. 🔗 Manage Endpoints');
    console.log('3. 📱 Manage Dashboards');
    console.log('4. 🏥 Health Check All');
    console.log('5. 📤 Export Configuration');
    console.log('6. 📥 Import Configuration');
    console.log('7. 👋 Exit');
    console.log('');
  }

  /**
   * Theme management
   */
  private async manageThemes(): Promise<void> {
    console.log('🎨 Theme Management');
    console.log('==================');
    console.log('');

    const themes = Object.keys(ColorSchemes);
    const currentTheme = modularSystem.getColorScheme().name;

    console.log(`Current theme: ${currentTheme}`);
    console.log('');
    console.log('Available themes:');
    themes.forEach((theme, index) => {
      const scheme = ColorSchemes[theme];
      const indicator = scheme.name === currentTheme ? '✅' : '  ';
      console.log(`${indicator} ${index + 1}. ${scheme.name} (${theme})`);
    });
    console.log('');

    const choice = await this.askQuestion('Select theme (number) or press Enter to go back: ');
    
    if (choice === '') return;
    
    const themeIndex = parseInt(choice) - 1;
    if (themeIndex >= 0 && themeIndex < themes.length) {
      const selectedTheme = themes[themeIndex];
      modularSystem.setColorScheme(selectedTheme as keyof typeof ColorSchemes);
      
      // Generate CSS preview
      const css = modularSystem.generateThemeCSS(selectedTheme as keyof typeof ColorSchemes);
      console.log('');
      console.log('🎨 Theme switched successfully!');
      console.log('📄 CSS Preview:');
      console.log(css.substring(0, 500) + '...');
      
      // Save theme preference
      await this.saveThemePreference(selectedTheme);
    } else {
      console.log('❌ Invalid theme selection.');
    }
  }

  /**
   * Endpoint management
   */
  private async manageEndpoints(): Promise<void> {
    console.log('🔗 Endpoint Management');
    console.log('=====================');
    console.log('');

    const categories = ['storage', 'registry', 'status', 'api', 'analytics', 'phone'];
    
    for (const category of categories) {
      const endpoints = modularSystem.getEndpointsByCategory(category as any);
      console.log(`\n📁 ${category.toUpperCase()} Endpoints:`);
      
      endpoints.forEach((endpoint, index) => {
        console.log(`  ${index + 1}. ${endpoint.name}`);
        console.log(`     URL: ${endpoint.url}`);
        console.log(`     Auth: ${endpoint.auth ? 'Required' : 'None'}`);
        console.log(`     Description: ${endpoint.description}`);
      });
    }

    console.log('');
    const choice = await this.askQuestion('Enter endpoint ID to test or press Enter to go back: ');
    
    if (choice === '') return;
    
    await this.testEndpoint(choice);
  }

  /**
   * Dashboard management
   */
  private async manageDashboards(): Promise<void> {
    console.log('📱 Dashboard Management');
    console.log('======================');
    console.log('');

    const categories = ['main', 'storage', 'registry', 'status', 'analytics', 'phone'];
    
    for (const category of categories) {
      const dashboards = modularSystem.getDashboardsByCategory(category as any);
      console.log(`\n📁 ${category.toUpperCase()} Dashboards:`);
      
      dashboards.forEach((dashboard, index) => {
        const colors = ColorSchemes[dashboard.colorScheme];
        console.log(`  ${index + 1}. ${dashboard.name}`);
        console.log(`     Theme: ${colors.name} (${dashboard.colorScheme})`);
        console.log(`     URL: ${dashboard.url}`);
        console.log(`     Features: ${dashboard.features.length} features`);
      });
    }

    console.log('');
    const choice = await this.askQuestion('Enter dashboard ID to configure or press Enter to go back: ');
    
    if (choice === '') return;
    
    await this.configureDashboard(choice);
  }

  /**
   * Health check all endpoints
   */
  private async healthCheckAll(): Promise<void> {
    console.log('🏥 Health Check All Endpoints');
    console.log('===========================');
    console.log('');

    const results = await modularSystem.healthCheckAll();
    
    console.log('Results:');
    for (const [id, healthy] of Object.entries(results)) {
      const endpoint = Endpoints[id];
      const status = healthy ? '✅ Healthy' : '❌ Unhealthy';
      console.log(`  ${status} ${endpoint.name} (${endpoint.url})`);
    }

    const healthyCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log('');
    console.log(`📊 Summary: ${healthyCount}/${totalCount} endpoints healthy`);
  }

  /**
   * Export configuration
   */
  private async exportConfiguration(): Promise<void> {
    console.log('📤 Export Configuration');
    console.log('======================');
    console.log('');

    const config: ConfigExport = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      themes: Object.keys(ColorSchemes),
      endpoints: Object.keys(Endpoints),
      dashboards: Object.keys(Dashboards),
      currentTheme: modularSystem.getColorScheme().name
    };

    const fullConfig = {
      export: config,
      colorSchemes: ColorSchemes,
      endpoints: Endpoints,
      dashboards: Dashboards
    };

    const filename = `modular-config-${Date.now()}.json`;
    await writeFile(filename, JSON.stringify(fullConfig, null, 2));
    
    console.log(`✅ Configuration exported to: ${filename}`);
    console.log(`📊 Exported ${config.themes.length} themes, ${config.endpoints.length} endpoints, ${config.dashboards.length} dashboards`);
  }

  /**
   * Import configuration
   */
  private async importConfiguration(): Promise<void> {
    console.log('📥 Import Configuration');
    console.log('======================');
    console.log('');

    const filename = await this.askQuestion('Enter configuration file path: ');
    
    try {
      const content = await readFile(filename, 'utf-8');
      const config = JSON.parse(content);
      
      console.log('✅ Configuration imported successfully!');
      console.log(`📊 Imported ${Object.keys(config.colorSchemes || {}).length} themes`);
      console.log(`🔗 Imported ${Object.keys(config.endpoints || {}).length} endpoints`);
      console.log(`📱 Imported ${Object.keys(config.dashboards || {}).length} dashboards`);
      
      // Apply current theme if specified
      if (config.export?.currentTheme) {
        const themeKey = Object.keys(ColorSchemes).find(key => 
          ColorSchemes[key].name === config.export.currentTheme
        );
        if (themeKey) {
          modularSystem.setColorScheme(themeKey as keyof typeof ColorSchemes);
          console.log(`🎨 Applied theme: ${config.export.currentTheme}`);
        }
      }
      
    } catch (error) {
      console.log('❌ Failed to import configuration:', error.message);
    }
  }

  /**
   * Test specific endpoint
   */
  private async testEndpoint(id: string): Promise<void> {
    const endpoint = modularSystem.getEndpoint(id);
    if (!endpoint) {
      console.log('❌ Endpoint not found');
      return;
    }

    console.log(`🧪 Testing ${endpoint.name}...`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(endpoint.timeout)
      });
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Endpoint responded in ${responseTime}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`🔗 URL: ${endpoint.url}`);
      
    } catch (error) {
      console.log(`❌ Endpoint test failed: ${error.message}`);
    }
  }

  /**
   * Configure specific dashboard
   */
  private async configureDashboard(id: string): Promise<void> {
    const dashboard = modularSystem.getDashboard(id);
    if (!dashboard) {
      console.log('❌ Dashboard not found');
      return;
    }

    console.log(`⚙️  Configuring ${dashboard.name}...`);
    console.log(`📱 Current theme: ${ColorSchemes[dashboard.colorScheme].name}`);
    console.log(`🔗 URL: ${dashboard.url}`);
    console.log(`📋 Features: ${dashboard.features.join(', ')}`);
    
    const newTheme = await this.askQuestion('Enter new theme (leave empty to keep current): ');
    
    if (newTheme && ColorSchemes[newTheme]) {
      // In a real implementation, you would update the dashboard configuration
      console.log(`🎨 Theme would be changed to: ${ColorSchemes[newTheme].name}`);
    }
  }

  /**
   * Save theme preference
   */
  private async saveThemePreference(theme: string): Promise<void> {
    const preferences = {
      currentTheme: theme,
      lastUpdated: new Date().toISOString()
    };
    
    await writeFile('./config/theme-preferences.json', JSON.stringify(preferences, null, 2));
    console.log('💾 Theme preference saved');
  }

  /**
   * Ask question and get answer
   */
  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer: string) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Close readline interface
   */
  close(): void {
    this.rl.close();
  }
}

// CLI interface
async function main() {
  const manager = new ModularConfigManager();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    manager.close();
    process.exit(0);
  });

  try {
    await manager.start();
  } catch (error) {
    console.error('❌ Configuration manager failed:', error);
    manager.close();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { ModularConfigManager };
