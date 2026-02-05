#!/usr/bin/env bun

/**
 * CLI Interface for Inspection System
 * 
 * Command-line interface for interacting with the hierarchical inspection system.
 * Provides commands for viewing, querying, and managing the inspection tree.
 */

import { DomainContext } from "./contexts/DomainContext.js";
import * as config from "./config/scope.config.js";

// Type definitions for Bun and Node.js globals
declare const Bun: any;
declare const process: any;
declare const importMeta: any & { main: any };

class InspectionCLI {
  private domainCtx: DomainContext;

  constructor() {
    this.domainCtx = new DomainContext(config.DOMAIN);
  }

  async handleCommand(args: string[]): Promise<void> {
    const command = args[0];

    switch (command) {
      case 'tree':
        await this.showTree(args.slice(1));
        break;
      case 'scope':
        await this.showScope(args.slice(1));
        break;
      case 'type':
        await this.showType(args.slice(1));
        break;
      case 'property':
        await this.showProperty(args.slice(1));
        break;
      case 'class':
        await this.showClass(args.slice(1));
        break;
      case 'search':
        await this.search(args.slice(1));
        break;
      case 'serve':
        await this.startServer(args.slice(1));
        break;
      case 'metrics':
        await this.showMetrics();
        break;
      default:
        this.showHelp();
    }
  }

  private async showTree(args: string[]): Promise<void> {
    const depth = args[0] ? parseInt(args[0]) : 6;
    const useColors = args.includes('--color') || args.includes('-c');
    
    console.log('🧩 FactoryWager Inspection Tree');
    console.log('='.repeat(50));
    console.log(`Domain: ${config.DOMAIN}`);
    console.log(`Scope: ${config.SCOPE}`);
    console.log(`Platform: ${config.PLATFORM}`);
    console.log('');

    console.log(Bun.inspect(this.domainCtx, {
      depth,
      colors: useColors,
      maxArrayLength: 10,
    }));
  }

  private async showScope(args: string[]): Promise<void> {
    const scopeName = args[0] || config.SCOPE;
    const scope = this.domainCtx.getScope(scopeName);
    
    if (!scope) {
      console.error(`❌ Scope "${scopeName}" not found`);
      return;
    }

    console.log(`🎯 Scope: ${scopeName}`);
    console.log('='.repeat(30));
    console.log(Bun.inspect(scope, {
      depth: 4,
      colors: true,
      maxArrayLength: 10,
    }));
  }

  private async showType(args: string[]): Promise<void> {
    const [scopeName, typeName] = args;
    const scope = this.domainCtx.getScope(scopeName || config.SCOPE);
    
    if (!scope) {
      console.error(`❌ Scope "${scopeName || config.SCOPE}" not found`);
      return;
    }

    const type = scope.getType((typeName as any) || 'STORAGE');
    if (!type) {
      console.error(`❌ Type "${typeName || 'STORAGE'}" not found`);
      return;
    }

    console.log(`⚙️ Type: ${typeName || 'STORAGE'} (${scopeName || config.SCOPE})`);
    console.log('='.repeat(40));
    console.log(Bun.inspect(type, {
      depth: 3,
      colors: true,
      maxArrayLength: 10,
    }));
  }

  private async showProperty(args: string[]): Promise<void> {
    const [scopeName, typeName, propertyName] = args;
    const scope = this.domainCtx.getScope(scopeName || config.SCOPE);
    
    if (!scope) {
      console.error(`❌ Scope "${scopeName || config.SCOPE}" not found`);
      return;
    }

    const type = scope.getType((typeName as any) || 'STORAGE');
    if (!type) {
      console.error(`❌ Type "${typeName || 'STORAGE'}" not found`);
      return;
    }

    const property = type.getMetaProperty(propertyName || '{PROPERTY}');
    if (!property) {
      console.error(`❌ Property "${propertyName || '{PROPERTY}'}" not found`);
      return;
    }

    console.log(`📌 Property: ${propertyName || '{PROPERTY}'} (${typeName || 'STORAGE'} / ${scopeName || config.SCOPE})`);
    console.log('='.repeat(60));
    console.log(Bun.inspect(property, {
      depth: 2,
      colors: true,
      maxArrayLength: 10,
    }));
  }

  private async showClass(args: string[]): Promise<void> {
    const [scopeName, typeName, propertyName, className] = args;
    const scope = this.domainCtx.getScope(scopeName || config.SCOPE);
    
    if (!scope) {
      console.error(`❌ Scope "${scopeName || config.SCOPE}" not found`);
      return;
    }

    const type = scope.getType((typeName as any) || 'STORAGE');
    if (!type) {
      console.error(`❌ Type "${typeName || 'STORAGE'}" not found`);
      return;
    }

    const property = type.getMetaProperty(propertyName || '{PROPERTY}');
    if (!property) {
      console.error(`❌ Property "${propertyName || '{PROPERTY}'}" not found`);
      return;
    }

    const classRef = property.getClass(className || 'R2AppleManager');
    if (!classRef) {
      console.error(`❌ Class "${className || 'R2AppleManager'}" not found`);
      return;
    }

    console.log(`🏷️ Class: ${className || 'R2AppleManager'} (${propertyName || '{PROPERTY}'} / ${typeName || 'STORAGE'} / ${scopeName || config.SCOPE})`);
    console.log('='.repeat(80));
    console.log(Bun.inspect(classRef, {
      depth: 2,
      colors: true,
      maxArrayLength: 10,
    }));
  }

  private async search(args: string[]): Promise<void> {
    const query = args[0];
    if (!query) {
      console.error('❌ Search query required');
      return;
    }

    console.log(`🔍 Searching for: "${query}"`);
    console.log('='.repeat(30));

    const results: Array<{
      path: string;
      match: string;
      type: string;
    }> = [];

    // Search through the entire tree
    const searchInObject = (obj: any, path: string = '') => {
      if (obj && typeof obj === "object") {
        if (typeof obj[Symbol.for("Bun.inspect.custom")] === "function") {
          const custom = obj[Symbol.for("Bun.inspect.custom")]();
          searchInObject(custom, path);
        } else {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (key.toLowerCase().includes(query.toLowerCase()) || 
                (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase()))) {
              results.push({
                path: currentPath,
                match: key,
                type: typeof value
              });
            }
            
            searchInObject(value, currentPath);
          }
        }
      } else if (typeof obj === 'string' && obj.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          path,
          match: obj,
          type: 'string'
        });
      }
    };

    searchInObject(this.domainCtx);

    if (results.length === 0) {
      console.log('No results found.');
    } else {
      console.log(`Found ${results.length} results:`);
      results.forEach(result => {
        console.log(`  📍 ${result.path} (${result.type})`);
      });
    }
  }

  private async startServer(args: string[]): Promise<void> {
    const port = args[0] ? parseInt(args[0]) : 8765;
    
    console.log(`🚀 Starting inspection server on port ${port}`);
    
    // Import and start the server
    const { server } = await import('./server.js');
    console.log(`✅ Server started successfully`);
    console.log(`🌐 Open http://localhost:${port}/debug in your browser`);
  }

  private async showMetrics(): Promise<void> {
    const scope = this.domainCtx.getScope(config.SCOPE);
    
    const metrics = {
      domain: config.DOMAIN,
      scope: config.SCOPE,
      platform: config.PLATFORM,
      totalScopes: this.domainCtx.getScopeNames().length,
      totalTypes: scope?.getTypeNames().length || 0,
      totalProperties: 0,
      totalClasses: 0,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    // Count properties and classes
    if (scope) {
      scope.getTypeNames().forEach((typeName: string) => {
        const type = scope.getType(typeName);
        if (type) {
          metrics.totalProperties += type.getMetaPropertyNames().length;
          type.getMetaPropertyNames().forEach((propName: string) => {
            const meta = type.getMetaProperty(propName);
            if (meta) {
              metrics.totalClasses += meta.getClassNames().length;
            }
          });
        }
      });
    }

    console.log('📊 System Metrics');
    console.log('='.repeat(20));
    console.log(JSON.stringify(metrics, null, 2));
  }

  showHelp(): void {
    console.log(`
🧩 FactoryWager Inspection CLI
==========================

Commands:
  tree [depth] [--color]           Show full inspection tree
  scope [scopeName]                Show specific scope
  type [scopeName] [typeName]      Show specific type
  property [scope] [type] [prop]   Show specific property
  class [scope] [type] [prop] [class]  Show specific class
  search <query>                   Search inspection tree
  serve [port]                     Start inspection server
  metrics                          Show system metrics

Examples:
  inspection tree 4 --color        Show tree with 4 levels and colors
  inspection scope LOCAL-SANDBOX   Show LOCAL-SANDBOX scope
  inspection type LOCAL-SANDBOX STORAGE  Show STORAGE type
  inspection property LOCAL-SANDBOX STORAGE "{PROPERTY}"  Show property
  inspection class LOCAL-SANDBOX STORAGE "{PROPERTY}" R2AppleManager  Show class
  inspection search "R2AppleManager"  Search for R2AppleManager
  inspection serve 3000            Start server on port 3000

Navigation:
  Use the hierarchical structure: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*]
  
  Available scopes: ${this.domainCtx.getScopeNames().join(', ')}
  Available types: STORAGE, SECRETS, SERVICE
    `);
  }
}

// CLI entry point
// Check if this file is being run directly
if (process.argv[1] && process.argv[1].endsWith('cli.ts')) {
  const cli = new InspectionCLI();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    cli.showHelp();
  } else {
    cli.handleCommand(args).catch(console.error);
  }
}

export default InspectionCLI;
