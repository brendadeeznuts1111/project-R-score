#!/usr/bin/env bun
// MCP Manifest Exposure Script
// Exposes specific resources from the MCP manifest with tier filtering

import mcpManifest from './mcp-manifest.json';

interface Args {
  resource?: string;
  tier?: string;
  format?: 'json' | 'yaml';
}

function parseArgs(): Args {
  const args: Args = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('--resource=')) {
      args.resource = arg.split('=')[1];
    } else if (arg === '--resource' && process.argv[i + 1]) {
      args.resource = process.argv[++i];
    } else if (arg.startsWith('--tier=')) {
      args.tier = arg.split('=')[1];
    } else if (arg === '--tier' && process.argv[i + 1]) {
      args.tier = process.argv[++i];
    } else if (arg.startsWith('--format=')) {
      args.format = arg.split('=')[1] as 'json' | 'yaml';
    } else if (arg === '--format' && process.argv[i + 1]) {
      args.format = process.argv[++i] as 'json' | 'yaml';
    }
  }
  
  return args;
}

function filterByTier(manifest: any, tier?: string): any {
  if (!tier) return manifest;
  
  const filtered = { ...manifest };
  
  // Filter resources by tier
  if (filtered.resources) {
    filtered.resources = filtered.resources.filter((resource: any) => {
      return resource.attributes?.tier === parseInt(tier) || 
             resource.attributes?.tier === tier;
    });
  }
  
  // Filter handlers by tier if applicable
  if (filtered.schemes?.bun?.handlers) {
    const handlers = filtered.schemes.bun.handlers;
    Object.keys(handlers).forEach(key => {
      if (handlers[key].security?.tier && handlers[key].security.tier !== tier) {
        delete handlers[key];
      }
    });
  }
  
  return filtered;
}

function filterByResource(manifest: any, resource?: string): any {
  if (!resource) return manifest;
  
  const filtered = { ...manifest };
  
  // Filter specific resource
  if (filtered.resources) {
    filtered.resources = filtered.resources.filter((r: any) => 
      r.uri.includes(resource) || r.type.includes(resource)
    );
  }
  
  // Filter specific handler
  if (filtered.schemes?.bun?.handlers) {
    const handlers = filtered.schemes.bun.handlers;
    const handlerKey = resource.startsWith('test/') ? resource : `test/${resource}`;
    if (handlers[handlerKey]) {
      filtered.schemes.bun.handlers = { [handlerKey]: handlers[handlerKey] };
    } else {
      filtered.schemes.bun.handlers = {};
    }
  }
  
  return filtered;
}

function formatOutput(data: any, format: 'json' | 'yaml' = 'json'): string {
  if (format === 'yaml') {
    // Simple YAML conversion
    const yaml = require('js-yaml');
    return yaml.dump(data, { indent: 2 });
  }
  
  return JSON.stringify(data, null, 2);
}

async function main() {
  const args = parseArgs();
  
  let filtered = { ...mcpManifest };
  
  // Apply filters
  filtered = filterByTier(filtered, args.tier);
  filtered = filterByResource(filtered, args.resource);
  
  // Output
  console.log(formatOutput(filtered, args.format));
}

if (import.meta.main) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
