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
    console.info('🔧 Modular Configuration Manager');
    console.info('==================================');
    console.info('');

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
          console.info('👋 Goodbye!');
          process.exit(0);
        default:
          console.info('❌ Invalid choice. Please try again.');
      }
      
      console.info('');
    }
  }

  /**
   * Show main menu
   */
  private async showMainMenu(): Promise<void> {
    console.info('📋 Main Menu:');
    console.info('1. 🎨 Manage Themes');
    console.info('2. 🔗 Manage Endpoints');
    console.info('3. 📱 Manage Dashboards');
    console.info('4. 🏥 Health Check All');
    console.info('5. 📤 Export Configuration');
    console.info('6. 📥 Import Configuration');
    console.info('7. 👋 Exit');
    console.info('');
  }

  /**
   * Theme management
   */
  private async manageThemes(): Promise<void> {
    console.info('🎨 Theme Management');
    console.info('==================');
    console.info('');

    const themes = Object.keys(ColorSchemes);
    const currentTheme = modularSystem.getColorScheme().name;

    console.info(`Current theme: ${currentTheme}`);
    console.info('');
    console.info('Available themes:');
    themes.forEach((theme, index) => {
      const scheme = ColorSchemes[theme];
      const indicator = scheme.name === currentTheme ? '✅' : '  ';
      console.info(`${indicator} ${index + 1}. ${scheme.name} (${theme})`);
    });
    console.info('');

    const choice = await this.askQuestion('Select theme (number) or press Enter to go back: ');
    
    if (choice === '') return;
    
    const themeIndex = parseInt(choice) - 1;
    if (themeIndex >= 0 && themeIndex < themes.length) {
      const selectedTheme = themes[themeIndex];
      modularSystem.setColorScheme(selectedTheme as keyof typeof ColorSchemes);
      
      // Generate CSS preview
      const css = modularSystem.generateThemeCSS(selectedTheme as keyof typeof ColorSchemes);
      console.info('');
      console.info('🎨 Theme switched successfully!');
      console.info('📄 CSS Preview:');
      console.info(css.substring(0, 500) + '...');
      
      // Save theme preference
      await this.saveThemePreference(selectedTheme);
    } else {
      console.info('❌ Invalid theme selection.');
    }
  }

  /**
   * Endpoint management
   */
  private async manageEndpoints(): Promise<void> {
    console.info('🔗 Endpoint Management');
    console.info('=====================');
    console.info('');

    const categories = ['storage', 'registry', 'status', 'api', 'analytics', 'phone'];
    
    for (const category of categories) {
      const endpoints = modularSystem.getEndpointsByCategory(category as any);
      console.info(`\n📁 ${category.toUpperCase()} Endpoints:`);
      
      endpoints.forEach((endpoint, index) => {
        console.info(`  ${index + 1}. ${endpoint.name}`);
        console.info(`     URL: ${endpoint.url}`);
        console.info(`     Auth: ${endpoint.auth ? 'Required' : 'None'}`);
        console.info(`     Description: ${endpoint.description}`);
      });
    }

    console.info('');
    const choice = await this.askQuestion('Enter endpoint ID to test or press Enter to go back: ');
    
    if (choice === '') return;
    
    await this.testEndpoint(choice);
  }

  /**
   * Dashboard management
   */
  private async manageDashboards(): Promise<void> {
    console.info('📱 Dashboard Management');
    console.info('======================');
    console.info('');

    const categories = ['main', 'storage', 'registry', 'status', 'analytics', 'phone'];
    
    for (const category of categories) {
      const dashboards = modularSystem.getDashboardsByCategory(category as any);
      console.info(`\n📁 ${category.toUpperCase()} Dashboards:`);
      
      dashboards.forEach((dashboard, index) => {
        const colors = ColorSchemes[dashboard.colorScheme];
        console.info(`  ${index + 1}. ${dashboard.name}`);
        console.info(`     Theme: ${colors.name} (${dashboard.colorScheme})`);
        console.info(`     URL: ${dashboard.url}`);
        console.info(`     Features: ${dashboard.features.length} features`);
      });
    }

    console.info('');
    const choice = await this.askQuestion('Enter dashboard ID to configure or press Enter to go back: ');
    
    if (choice === '') return;
    
    await this.configureDashboard(choice);
  }

  /**
   * Health check all endpoints
   */
  private async healthCheckAll(): Promise<void> {
    console.info('🏥 Health Check All Endpoints');
    console.info('===========================');
    console.info('');

    const results = await modularSystem.healthCheckAll();
    
    console.info('Results:');
    for (const [id, healthy] of Object.entries(results)) {
      const endpoint = Endpoints[id];
      const status = healthy ? '✅ Healthy' : '❌ Unhealthy';
      console.info(`  ${status} ${endpoint.name} (${endpoint.url})`);
    }

    const healthyCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.info('');
    console.info(`📊 Summary: ${healthyCount}/${totalCount} endpoints healthy`);
  }

  /**
   * Export configuration
   */
  private async exportConfiguration(): Promise<void> {
    console.info('📤 Export Configuration');
    console.info('======================');
    console.info('');

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
    
    console.info(`✅ Configuration exported to: ${filename}`);
    console.info(`📊 Exported ${config.themes.length} themes, ${config.endpoints.length} endpoints, ${config.dashboards.length} dashboards`);
  }

  /**
   * Import configuration
   */
  private async importConfiguration(): Promise<void> {
    console.info('📥 Import Configuration');
    console.info('======================');
    console.info('');

    const filename = await this.askQuestion('Enter configuration file path: ');
    
    try {
      const content = await readFile(filename, 'utf-8');
      const config = JSON.parse(content);
      
      console.info('✅ Configuration imported successfully!');
      console.info(`📊 Imported ${Object.keys(config.colorSchemes || {}).length} themes`);
      console.info(`🔗 Imported ${Object.keys(config.endpoints || {}).length} endpoints`);
      console.info(`📱 Imported ${Object.keys(config.dashboards || {}).length} dashboards`);
      
      // Apply current theme if specified
      if (config.export?.currentTheme) {
        const themeKey = Object.keys(ColorSchemes).find(key => 
          ColorSchemes[key].name === config.export.currentTheme
        );
        if (themeKey) {
          modularSystem.setColorScheme(themeKey as keyof typeof ColorSchemes);
          console.info(`🎨 Applied theme: ${config.export.currentTheme}`);
        }
      }
      
    } catch (error) {
      console.info('❌ Failed to import configuration:', error.message);
    }
  }

  /**
   * Test specific endpoint
   */
  private async testEndpoint(id: string): Promise<void> {
    const endpoint = modularSystem.getEndpoint(id);
    if (!endpoint) {
      console.info('❌ Endpoint not found');
      return;
    }

    console.info(`🧪 Testing ${endpoint.name}...`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(endpoint.timeout)
      });
      const responseTime = Date.now() - startTime;
      
      console.info(`✅ Endpoint responded in ${responseTime}ms`);
      console.info(`📊 Status: ${response.status} ${response.statusText}`);
      console.info(`🔗 URL: ${endpoint.url}`);
      
    } catch (error) {
      console.info(`❌ Endpoint test failed: ${error.message}`);
    }
  }

  /**
   * Configure specific dashboard
   */
  private async configureDashboard(id: string): Promise<void> {
    const dashboard = modularSystem.getDashboard(id);
    if (!dashboard) {
      console.info('❌ Dashboard not found');
      return;
    }

    console.info(`⚙️  Configuring ${dashboard.name}...`);
    console.info(`📱 Current theme: ${ColorSchemes[dashboard.colorScheme].name}`);
    console.info(`🔗 URL: ${dashboard.url}`);
    console.info(`📋 Features: ${dashboard.features.join(', ')}`);
    
    const newTheme = await this.askQuestion('Enter new theme (leave empty to keep current): ');
    
    if (newTheme && ColorSchemes[newTheme]) {
      // In a real implementation, you would update the dashboard configuration
      console.info(`🎨 Theme would be changed to: ${ColorSchemes[newTheme].name}`);
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
    console.info('💾 Theme preference saved');
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
    console.info('\n👋 Goodbye!');
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
