#!/usr/bin/env bun
/**
 * Payment Routing CLI
 * Developer tools for managing payment routes, fallbacks, and splits
 */

import { parseArgs } from 'util';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

interface CommandOptions {
  json?: boolean;
  verbose?: boolean;
}

class PaymentCLI {
  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const url = `${API_BASE}${path}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    return response.json();
  }

  // Route commands
  async listRoutes(options: CommandOptions): Promise<void> {
    const data = await this.request('GET', '/payment/routes');
    this.print(data, options);
  }

  async createRoute(args: string[], options: CommandOptions): Promise<void> {
    const [name, barberId, ...rest] = args;
    if (!name || !barberId) {
      console.error('Usage: create-route <name> <barberId> [priority]');
      process.exit(1);
    }

    const priority = parseInt(rest[0]) || 100;
    
    const data = await this.request('POST', '/payment/routes', {
      name,
      barberId,
      priority,
      status: 'active',
      paymentMethods: ['card', 'cash'],
    });
    
    this.print(data, options);
  }

  async getRoute(id: string, options: CommandOptions): Promise<void> {
    const data = await this.request('GET', `/payment/routes/${id}`);
    this.print(data, options);
  }

  async updateRoute(id: string, updates: Record<string, unknown>, options: CommandOptions): Promise<void> {
    const data = await this.request('PUT', `/payment/routes/${id}`, updates);
    this.print(data, options);
  }

  async deleteRoute(id: string, options: CommandOptions): Promise<void> {
    const data = await this.request('DELETE', `/payment/routes/${id}`);
    this.print(data, options);
  }

  async reorderRoute(routeId: string, priority: number, options: CommandOptions): Promise<void> {
    const data = await this.request('PUT', '/payment/routes/reorder', {
      route_id: routeId,
      new_priority: priority,
    });
    this.print(data, options);
  }

  // Fallback commands
  async listFallbacks(options: CommandOptions): Promise<void> {
    const data = await this.request('GET', '/payment/fallbacks');
    this.print(data, options);
  }

  async createFallback(args: string[], options: CommandOptions): Promise<void> {
    const [name, primaryRouteId, ...fallbackRouteIds] = args;
    if (!name || !primaryRouteId) {
      console.error('Usage: create-fallback <name> <primaryRouteId> [fallbackRouteId...]');
      process.exit(1);
    }

    const data = await this.request('POST', '/payment/fallbacks', {
      name,
      primaryRouteId,
      fallbackRouteIds,
      trigger: 'primary_unavailable',
      retryCount: 3,
      status: 'active',
    });
    
    this.print(data, options);
  }

  // Config commands
  async getConfig(options: CommandOptions): Promise<void> {
    const data = await this.request('GET', '/payment/config');
    this.print(data, options);
  }

  async updateConfig(updates: Record<string, unknown>, options: CommandOptions): Promise<void> {
    const data = await this.request('PUT', '/payment/config', updates);
    this.print(data, options);
  }

  // Split commands
  async listPendingSplits(options: CommandOptions): Promise<void> {
    const data = await this.request('GET', '/payment/splits/pending');
    this.print(data, options);
  }

  async getSplit(id: string, options: CommandOptions): Promise<void> {
    const data = await this.request('GET', `/payment/splits/${id}`);
    this.print(data, options);
  }

  async processSplit(id: string, options: CommandOptions): Promise<void> {
    const data = await this.request('POST', `/payment/splits/${id}/process`);
    this.print(data, options);
  }

  // Health check
  async health(options: CommandOptions): Promise<void> {
    const data = await this.request('GET', '/health');
    this.print(data, options);
  }

  // Utility
  private print(data: unknown, options: CommandOptions): void {
    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
}

// CLI argument parsing
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: 'boolean', short: 'j' },
    verbose: { type: 'boolean', short: 'v' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Payment Routing CLI

Usage: bun run scripts/payment-cli.ts [options] <command> [args...]

Global Options:
  -j, --json      Output as JSON
  -v, --verbose   Verbose output
  -h, --help      Show this help

Commands:
  Routes:
    list-routes                    List all payment routes
    create-route <name> <barberId> [priority]
                                   Create a new route
    get-route <id>                 Get route details
    update-route <id> [key=value...]
                                   Update a route
    delete-route <id>              Delete a route
    reorder-route <routeId> <priority>
                                   Change route priority

  Fallbacks:
    list-fallbacks                 List all fallback plans
    create-fallback <name> <primaryRouteId> [fallbackRouteId...]
                                   Create a fallback plan

  Config:
    get-config                     Get routing configuration
    update-config [key=value...]   Update configuration

  Splits:
    list-pending-splits            List pending splits
    get-split <id>                 Get split details
    process-split <id>             Process a split

  System:
    health                         Check server health

Examples:
  bun run scripts/payment-cli.ts list-routes
  bun run scripts/payment-cli.ts create-route "Main Route" barber_123
  bun run scripts/payment-cli.ts reorder-route route_123 5
  bun run scripts/payment-cli.ts --json get-route route_123
`);
  process.exit(0);
}

const cli = new PaymentCLI();
const [command, ...args] = positionals;
const options: CommandOptions = {
  json: values.json,
  verbose: values.verbose,
};

// Parse key=value arguments
function parseKeyValues(args: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key && value !== undefined) {
      // Try to parse as number or boolean
      if (value === 'true') result[key] = true;
      else if (value === 'false') result[key] = false;
      else if (!isNaN(Number(value))) result[key] = Number(value);
      else result[key] = value;
    }
  }
  return result;
}

// Execute command
(async () => {
  try {
    switch (command) {
      case 'list-routes':
        await cli.listRoutes(options);
        break;
      case 'create-route':
        await cli.createRoute(args, options);
        break;
      case 'get-route':
        await cli.getRoute(args[0], options);
        break;
      case 'update-route':
        await cli.updateRoute(args[0], parseKeyValues(args.slice(1)), options);
        break;
      case 'delete-route':
        await cli.deleteRoute(args[0], options);
        break;
      case 'reorder-route':
        await cli.reorderRoute(args[0], parseInt(args[1]), options);
        break;
      case 'list-fallbacks':
        await cli.listFallbacks(options);
        break;
      case 'create-fallback':
        await cli.createFallback(args, options);
        break;
      case 'get-config':
        await cli.getConfig(options);
        break;
      case 'update-config':
        await cli.updateConfig(parseKeyValues(args), options);
        break;
      case 'list-pending-splits':
        await cli.listPendingSplits(options);
        break;
      case 'get-split':
        await cli.getSplit(args[0], options);
        break;
      case 'process-split':
        await cli.processSplit(args[0], options);
        break;
      case 'health':
        await cli.health(options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use --help for usage information');
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', (err as Error).message);
    if (options.verbose) {
      console.error((err as Error).stack);
    }
    process.exit(1);
  }
})();
