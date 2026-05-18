#!/usr/bin/env bun
// Feature Status CLI Tool - Interface to Feature Status API
// Provides command-line access to all feature registry information

import { fetch } from 'bun';

// CLI Configuration
const API_BASE_URL = process.env.FEATURE_API_URL || 'http://localhost:3010';
const API_TIMEOUT = 10000; // 10 seconds

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Helper functions
function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function getStatusColor(status: string): keyof typeof colors {
  switch (status.toLowerCase()) {
    case 'active':
    case 'healthy':
    case 'running':
      return 'green';
    case 'inactive':
    case 'stopped':
      return 'yellow';
    case 'error':
    case 'unhealthy':
      return 'red';
    case 'maintenance':
    case 'pending':
      return 'blue';
    default:
      return 'gray';
  }
}

function formatHealth(health: string): string {
  switch (health.toLowerCase()) {
    case 'healthy':
      return colorize('●', 'green');
    case 'degraded':
      return colorize('●', 'yellow');
    case 'unhealthy':
      return colorize('●', 'red');
    default:
      return colorize('●', 'gray');
  }
}

// API Client
class FeatureStatusClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FeatureStatusCLI/1.0.0',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getSystemStatus() {
    return this.request('/api/status');
  }

  async getFeatures() {
    return this.request('/api/features');
  }

  async getFeature(id: string) {
    return this.request(`/api/features/${id}`);
  }

  async getHealth() {
    return this.request('/api/health');
  }

  async getServices() {
    return this.request('/api/services');
  }

  async toggleFeature(id: string) {
    return this.request(`/api/features/${id}/toggle`, {
      method: 'POST'
    });
  }
}

// Display functions
function displaySystemStatus(status: any) {
  console.info(colorize('\n🏗️ SYSTEM STATUS', 'cyan'));
  console.info('═'.repeat(50));
  
  console.info(`Environment: ${colorize(status.environment, 'yellow')}`);
  console.info(`Version: ${colorize(status.version, 'blue')}`);
  console.info(`Uptime: ${colorize(`${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`, 'green')}`);
  console.info(`Overall Health: ${formatHealth(status.overallHealth)} ${colorize(status.overallHealth.toUpperCase(), getStatusColor(status.overallHealth))}`);
  
  console.info(colorize('\n📊 FEATURE SUMMARY', 'cyan'));
  console.info('─'.repeat(30));
  console.info(`Total Features: ${colorize(status.totalFeatures.toString(), 'white')}`);
  console.info(`Active: ${colorize(status.activeFeatures.toString(), 'green')}`);
  console.info(`Inactive: ${colorize(status.inactiveFeatures.toString(), 'yellow')}`);
  console.info(`Error: ${colorize(status.errorFeatures.toString(), 'red')}`);
  console.info(`Maintenance: ${colorize(status.maintenanceFeatures.toString(), 'blue')}`);
}

function displayFeatures(features: any, detailed: boolean = false) {
  console.info(colorize('\n🔧 FEATURE REGISTRY', 'cyan'));
  console.info('═'.repeat(80));
  
  // Group by category
  const grouped = features.features.reduce((acc: any, feature: any) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([category, categoryFeatures]: [string, any]) => {
    console.info(colorize(`\n${category.toUpperCase()} (${categoryFeatures.length})`, 'yellow'));
    console.info('─'.repeat(40));
    
    categoryFeatures.forEach((feature: any) => {
      const statusIcon = feature.enabled ? '✓' : '✗';
      const statusColor = feature.enabled ? 'green' : 'red';
      
      console.info(`${formatHealth(feature.health)} ${colorize(statusIcon, statusColor)} ${colorize(feature.name, 'white')}`);
      console.info(`  ${colorize('ID:', 'gray')} ${feature.id}`);
      console.info(`  ${colorize('Status:', 'gray')} ${colorize(feature.status, getStatusColor(feature.status))}`);
      console.info(`  ${colorize('Version:', 'gray')} ${feature.version}`);
      
      if (detailed) {
        console.info(`  ${colorize('Description:', 'gray')} ${feature.description}`);
        if (feature.endpoints && feature.endpoints.length > 0) {
          console.info(`  ${colorize('Endpoints:', 'gray')} ${feature.endpoints.join(', ')}`);
        }
      }
      console.info();
    });
  });
}

function displayFeatureDetails(feature: any) {
  console.info(colorize('\n🔍 FEATURE DETAILS', 'cyan'));
  console.info('═'.repeat(50));
  
  console.info(`${colorize('Name:', 'yellow')} ${feature.name}`);
  console.info(`${colorize('ID:', 'yellow')} ${feature.id}`);
  console.info(`${colorize('Description:', 'yellow')} ${feature.description}`);
  console.info(`${colorize('Category:', 'yellow')} ${feature.category}`);
  console.info(`${colorize('Status:', 'yellow')} ${formatHealth(feature.health)} ${colorize(feature.status, getStatusColor(feature.status))}`);
  console.info(`${colorize('Enabled:', 'yellow')} ${feature.enabled ? colorize('Yes', 'green') : colorize('No', 'red')}`);
  console.info(`${colorize('Version:', 'yellow')} ${feature.version}`);
  console.info(`${colorize('Deployment:', 'yellow')} ${feature.deploymentStatus}`);
  console.info(`${colorize('Last Checked:', 'yellow')} ${new Date(feature.lastChecked).toLocaleString()}`);
  
  if (feature.dependencies && feature.dependencies.length > 0) {
    console.info(`${colorize('Dependencies:', 'yellow')} ${feature.dependencies.join(', ')}`);
  }
  
  if (feature.endpoints && feature.endpoints.length > 0) {
    console.info(`${colorize('Endpoints:', 'yellow')}`);
    feature.endpoints.forEach((endpoint: string) => {
      console.info(`  • ${endpoint}`);
    });
  }
  
  if (feature.metrics) {
    console.info(colorize('\n📈 Metrics:', 'yellow'));
    if (feature.metrics.performance !== undefined) {
      console.info(`  Performance: ${colorize(`${feature.metrics.performance.toFixed(1)}%`, 'green')}`);
    }
    if (feature.metrics.uptime !== undefined) {
      console.info(`  Uptime: ${colorize(`${feature.metrics.uptime}%`, 'green')}`);
    }
    if (feature.metrics.errorRate !== undefined) {
      console.info(`  Error Rate: ${colorize(`${feature.metrics.errorRate.toFixed(2)}%`, feature.metrics.errorRate > 1 ? 'red' : 'green')}`);
    }
    if (feature.metrics.lastError) {
      console.info(`  Last Error: ${colorize(feature.metrics.lastError, 'red')}`);
    }
  }
}

function displayServices(services: any[]) {
  console.info(colorize('\n🏃 SERVICE STATUS', 'cyan'));
  console.info('═'.repeat(60));
  
  services.forEach(service => {
    const healthIcon = service.health === 'healthy' ? '●' : service.health === 'degraded' ? '◐' : '○';
    const healthColor = service.health === 'healthy' ? 'green' : service.health === 'degraded' ? 'yellow' : 'red';
    
    console.info(`${colorize(healthIcon, healthColor)} ${colorize(service.name, 'white')} (${service.port})`);
    console.info(`  Status: ${colorize(service.status, getStatusColor(service.status))}`);
    console.info(`  Health: ${colorize(service.health, healthColor)}`);
    console.info(`  Last Check: ${new Date(service.lastCheck).toLocaleString()}`);
    console.info();
  });
}

// CLI Commands
async function cmdStatus(client: FeatureStatusClient, args: string[]) {
  try {
    const status = await client.getSystemStatus();
    displaySystemStatus(status);
    
    if (args.includes('--features')) {
      displayFeatures(status, args.includes('--detailed'));
    }
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdFeatures(client: FeatureStatusClient, args: string[]) {
  try {
    const features = await client.getFeatures();
    displayFeatures(features, args.includes('--detailed'));
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdFeature(client: FeatureStatusClient, args: string[]) {
  const featureId = args[0];
  if (!featureId) {
    console.error(colorize('Error: Feature ID required', 'red'));
    console.info('Usage: feature-status feature <feature-id>');
    process.exit(1);
  }

  try {
    const feature = await client.getFeature(featureId);
    if (feature.error) {
      console.error(colorize(`Error: ${feature.error}`, 'red'));
      process.exit(1);
    }
    displayFeatureDetails(feature);
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdHealth(client: FeatureStatusClient) {
  try {
    const health = await client.getHealth();
    console.info(colorize('\n🏥 SYSTEM HEALTH', 'cyan'));
    console.info('═'.repeat(30));
    console.info(`Status: ${formatHealth(health.status)} ${colorize(health.status.toUpperCase(), getStatusColor(health.status))}`);
    console.info(`Uptime: ${colorize(`${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`, 'green')}`);
    console.info(`Active Features: ${colorize(`${health.activeFeatures}/${health.totalFeatures}`, 'blue')}`);
    console.info(`Timestamp: ${new Date(health.timestamp).toLocaleString()}`);
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdServices(client: FeatureStatusClient) {
  try {
    const services = await client.getServices();
    displayServices(services);
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdToggle(client: FeatureStatusClient, args: string[]) {
  const featureId = args[0];
  if (!featureId) {
    console.error(colorize('Error: Feature ID required', 'red'));
    console.info('Usage: feature-status toggle <feature-id>');
    process.exit(1);
  }

  try {
    const result = await client.toggleFeature(featureId);
    console.info(colorize(result.message, 'green'));
    console.info(`Feature: ${result.feature.id} - ${result.feature.enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdList(client: FeatureStatusClient) {
  try {
    const features = await client.getFeatures();
    console.info(colorize('\n📋 AVAILABLE FEATURES', 'cyan'));
    console.info('═'.repeat(50));
    
    features.features.forEach((feature: any) => {
      const status = feature.enabled ? colorize('ENABLED', 'green') : colorize('DISABLED', 'red');
      console.info(`${colorize(feature.id, 'blue')} - ${feature.name} (${status})`);
    });
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.info(colorize('\n🔧 Feature Status CLI Tool', 'cyan'));
    console.info('═'.repeat(40));
    console.info('Usage: feature-status <command> [options]');
    console.info();
    console.info(colorize('Commands:', 'yellow'));
    console.info('  status [--features] [--detailed]  Show system status');
    console.info('  features [--detailed]              List all features');
    console.info('  feature <id>                       Show feature details');
    console.info('  health                              Show system health');
    console.info('  services                            Show service status');
    console.info('  toggle <id>                        Enable/disable feature');
    console.info('  list                               List available features');
    console.info('  help                               Show this help');
    console.info();
    console.info(colorize('Options:', 'yellow'));
    console.info('  --features    Show features in status output');
    console.info('  --detailed    Show detailed information');
    console.info();
    console.info(colorize('Environment Variables:', 'yellow'));
    console.info(`  FEATURE_API_URL    API server URL (default: ${API_BASE_URL})`);
    return;
  }

  const client = new FeatureStatusClient();

  switch (command) {
    case 'status':
      await cmdStatus(client, args.slice(1));
      break;
    case 'features':
      await cmdFeatures(client, args.slice(1));
      break;
    case 'feature':
      await cmdFeature(client, args.slice(1));
      break;
    case 'health':
      await cmdHealth(client);
      break;
    case 'services':
      await cmdServices(client);
      break;
    case 'toggle':
      await cmdToggle(client, args.slice(1));
      break;
    case 'list':
      await cmdList(client);
      break;
    default:
      console.error(colorize(`Error: Unknown command '${command}'`, 'red'));
      console.info('Use --help for available commands');
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(colorize(`Uncaught error: ${(error as Error).message}`, 'red'));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(colorize(`Unhandled rejection: ${String(reason)}`, 'red'));
  process.exit(1);
});

// Run CLI
if (require.main === module) {
  main().catch((error) => {
    console.error(colorize(`CLI Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  });
}
