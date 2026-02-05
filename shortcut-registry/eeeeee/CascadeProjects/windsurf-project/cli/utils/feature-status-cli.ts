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
  console.log(colorize('\n🏗️ SYSTEM STATUS', 'cyan'));
  console.log('═'.repeat(50));
  
  console.log(`Environment: ${colorize(status.environment, 'yellow')}`);
  console.log(`Version: ${colorize(status.version, 'blue')}`);
  console.log(`Uptime: ${colorize(`${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`, 'green')}`);
  console.log(`Overall Health: ${formatHealth(status.overallHealth)} ${colorize(status.overallHealth.toUpperCase(), getStatusColor(status.overallHealth))}`);
  
  console.log(colorize('\n📊 FEATURE SUMMARY', 'cyan'));
  console.log('─'.repeat(30));
  console.log(`Total Features: ${colorize(status.totalFeatures.toString(), 'white')}`);
  console.log(`Active: ${colorize(status.activeFeatures.toString(), 'green')}`);
  console.log(`Inactive: ${colorize(status.inactiveFeatures.toString(), 'yellow')}`);
  console.log(`Error: ${colorize(status.errorFeatures.toString(), 'red')}`);
  console.log(`Maintenance: ${colorize(status.maintenanceFeatures.toString(), 'blue')}`);
}

function displayFeatures(features: any, detailed: boolean = false) {
  console.log(colorize('\n🔧 FEATURE REGISTRY', 'cyan'));
  console.log('═'.repeat(80));
  
  // Group by category
  const grouped = features.features.reduce((acc: any, feature: any) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([category, categoryFeatures]: [string, any]) => {
    console.log(colorize(`\n${category.toUpperCase()} (${categoryFeatures.length})`, 'yellow'));
    console.log('─'.repeat(40));
    
    categoryFeatures.forEach((feature: any) => {
      const statusIcon = feature.enabled ? '✓' : '✗';
      const statusColor = feature.enabled ? 'green' : 'red';
      
      console.log(`${formatHealth(feature.health)} ${colorize(statusIcon, statusColor)} ${colorize(feature.name, 'white')}`);
      console.log(`  ${colorize('ID:', 'gray')} ${feature.id}`);
      console.log(`  ${colorize('Status:', 'gray')} ${colorize(feature.status, getStatusColor(feature.status))}`);
      console.log(`  ${colorize('Version:', 'gray')} ${feature.version}`);
      
      if (detailed) {
        console.log(`  ${colorize('Description:', 'gray')} ${feature.description}`);
        if (feature.endpoints && feature.endpoints.length > 0) {
          console.log(`  ${colorize('Endpoints:', 'gray')} ${feature.endpoints.join(', ')}`);
        }
      }
      console.log();
    });
  });
}

function displayFeatureDetails(feature: any) {
  console.log(colorize('\n🔍 FEATURE DETAILS', 'cyan'));
  console.log('═'.repeat(50));
  
  console.log(`${colorize('Name:', 'yellow')} ${feature.name}`);
  console.log(`${colorize('ID:', 'yellow')} ${feature.id}`);
  console.log(`${colorize('Description:', 'yellow')} ${feature.description}`);
  console.log(`${colorize('Category:', 'yellow')} ${feature.category}`);
  console.log(`${colorize('Status:', 'yellow')} ${formatHealth(feature.health)} ${colorize(feature.status, getStatusColor(feature.status))}`);
  console.log(`${colorize('Enabled:', 'yellow')} ${feature.enabled ? colorize('Yes', 'green') : colorize('No', 'red')}`);
  console.log(`${colorize('Version:', 'yellow')} ${feature.version}`);
  console.log(`${colorize('Deployment:', 'yellow')} ${feature.deploymentStatus}`);
  console.log(`${colorize('Last Checked:', 'yellow')} ${new Date(feature.lastChecked).toLocaleString()}`);
  
  if (feature.dependencies && feature.dependencies.length > 0) {
    console.log(`${colorize('Dependencies:', 'yellow')} ${feature.dependencies.join(', ')}`);
  }
  
  if (feature.endpoints && feature.endpoints.length > 0) {
    console.log(`${colorize('Endpoints:', 'yellow')}`);
    feature.endpoints.forEach((endpoint: string) => {
      console.log(`  • ${endpoint}`);
    });
  }
  
  if (feature.metrics) {
    console.log(colorize('\n📈 Metrics:', 'yellow'));
    if (feature.metrics.performance !== undefined) {
      console.log(`  Performance: ${colorize(`${feature.metrics.performance.toFixed(1)}%`, 'green')}`);
    }
    if (feature.metrics.uptime !== undefined) {
      console.log(`  Uptime: ${colorize(`${feature.metrics.uptime}%`, 'green')}`);
    }
    if (feature.metrics.errorRate !== undefined) {
      console.log(`  Error Rate: ${colorize(`${feature.metrics.errorRate.toFixed(2)}%`, feature.metrics.errorRate > 1 ? 'red' : 'green')}`);
    }
    if (feature.metrics.lastError) {
      console.log(`  Last Error: ${colorize(feature.metrics.lastError, 'red')}`);
    }
  }
}

function displayServices(services: any[]) {
  console.log(colorize('\n🏃 SERVICE STATUS', 'cyan'));
  console.log('═'.repeat(60));
  
  services.forEach(service => {
    const healthIcon = service.health === 'healthy' ? '●' : service.health === 'degraded' ? '◐' : '○';
    const healthColor = service.health === 'healthy' ? 'green' : service.health === 'degraded' ? 'yellow' : 'red';
    
    console.log(`${colorize(healthIcon, healthColor)} ${colorize(service.name, 'white')} (${service.port})`);
    console.log(`  Status: ${colorize(service.status, getStatusColor(service.status))}`);
    console.log(`  Health: ${colorize(service.health, healthColor)}`);
    console.log(`  Last Check: ${new Date(service.lastCheck).toLocaleString()}`);
    console.log();
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
    console.log('Usage: feature-status feature <feature-id>');
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
    console.log(colorize('\n🏥 SYSTEM HEALTH', 'cyan'));
    console.log('═'.repeat(30));
    console.log(`Status: ${formatHealth(health.status)} ${colorize(health.status.toUpperCase(), getStatusColor(health.status))}`);
    console.log(`Uptime: ${colorize(`${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`, 'green')}`);
    console.log(`Active Features: ${colorize(`${health.activeFeatures}/${health.totalFeatures}`, 'blue')}`);
    console.log(`Timestamp: ${new Date(health.timestamp).toLocaleString()}`);
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
    console.log('Usage: feature-status toggle <feature-id>');
    process.exit(1);
  }

  try {
    const result = await client.toggleFeature(featureId);
    console.log(colorize(result.message, 'green'));
    console.log(`Feature: ${result.feature.id} - ${result.feature.enabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    console.error(colorize(`Error: ${(error as Error).message}`, 'red'));
    process.exit(1);
  }
}

async function cmdList(client: FeatureStatusClient) {
  try {
    const features = await client.getFeatures();
    console.log(colorize('\n📋 AVAILABLE FEATURES', 'cyan'));
    console.log('═'.repeat(50));
    
    features.features.forEach((feature: any) => {
      const status = feature.enabled ? colorize('ENABLED', 'green') : colorize('DISABLED', 'red');
      console.log(`${colorize(feature.id, 'blue')} - ${feature.name} (${status})`);
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
    console.log(colorize('\n🔧 Feature Status CLI Tool', 'cyan'));
    console.log('═'.repeat(40));
    console.log('Usage: feature-status <command> [options]');
    console.log();
    console.log(colorize('Commands:', 'yellow'));
    console.log('  status [--features] [--detailed]  Show system status');
    console.log('  features [--detailed]              List all features');
    console.log('  feature <id>                       Show feature details');
    console.log('  health                              Show system health');
    console.log('  services                            Show service status');
    console.log('  toggle <id>                        Enable/disable feature');
    console.log('  list                               List available features');
    console.log('  help                               Show this help');
    console.log();
    console.log(colorize('Options:', 'yellow'));
    console.log('  --features    Show features in status output');
    console.log('  --detailed    Show detailed information');
    console.log();
    console.log(colorize('Environment Variables:', 'yellow'));
    console.log(`  FEATURE_API_URL    API server URL (default: ${API_BASE_URL})`);
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
      console.log('Use --help for available commands');
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
