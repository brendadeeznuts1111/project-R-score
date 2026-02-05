#!/usr/bin/env bun
import { file, YAML } from 'bun';
import { BunYAMLRegistry } from '../scripts/registry';

let config: any;
let registry: BunYAMLRegistry;

async function initialize() {
  config = YAML.parse(await Bun.file('bun.yaml').text());
  registry = new BunYAMLRegistry();
}

interface UnifiedParams {
  scope?: string;
  type?: string;
  variant?: string;
  id?: string;
  version?: string;
  status?: string;
  title?: string;
  dashboardConfig?: any;
}

async function generateUnified(params: UnifiedParams = {}) {
  await initialize();
  const { header: headerConfig, dashboard: dashboardConfigSchema } = config.rules;

  const {
    scope = headerConfig.defaults.scope,
    type = headerConfig.defaults.type,
    variant = '',
    id = generateID(scope, type),
    version = headerConfig.defaults.version,
    status = headerConfig.defaults.status,
    title = '',
    dashboardConfig = {}
  } = params;

  // Validate GOV header
  if (!headerConfig.schema.scope.includes(scope)) {
    throw new Error(`❌ Scope invalid: ${scope}`);
  }
  if (!headerConfig.schema.type.includes(type)) {
    throw new Error(`❌ Type invalid: ${type}`);
  }

  // Generate GOV header tags
  const readable = `[${scope}][${type}][${variant.toUpperCase() || ''}][${id}][${version}][${status}]`;
  const grepable = `[${scope.toLowerCase()}-${type.toLowerCase()}-${(variant || 'base').toLowerCase()}-${id.toLowerCase()}-${version.toLowerCase()}-${status.toLowerCase()}]`;

  // Generate dashboard YAML config
  const dashboardYAML = YAML.stringify({
    ...dashboardConfig,
    security: {
      csrf: await generateCSRF(),
      cookies: { secure: true, sameSite: 'strict' }
    },
    metadata: {
      scope,
      type,
      id,
      version,
      status,
      generated: new Date().toISOString()
    },
    filters: dashboardConfig.filters || [],
    deployed: '${DATE:ISO}',
  });

  // Store in registry
  const hash = await registry.storeYAML(dashboardYAML, {
    metadata: { id, scope, type, version },
    compress: true,
    encrypt: false, // Disable encryption for now
    interpolate: true
  });

  return {
    header: `# ${title}\n\n${readable}\n# Grepable: ${grepable}\n\n## Trigger\n[Rule logic]\n\n## Action\n[Enforce via Bun]\n\n## Priority\n${status}\n\n## Example\n[Usage example]`,
    dashboard: dashboardYAML,
    hash,
    grepable
  };
}

function generateID(scope: string, type: string): string {
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${scope}-${type.toUpperCase()}-${randomNum}`;
}

async function generateCSRF(): Promise<string> {
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// CLI Interface
async function main() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=');
      args.set(key, value || true);
    }
  }
  const params: UnifiedParams = {
    scope: args.get('--scope'),
    type: args.get('--type'),
    variant: args.get('--variant'),
    title: args.get('--title'),
    version: args.get('--version'),
    status: args.get('--status'),
  };

  try {
    const result = await generateUnified(params);
    console.log('=== GOV Header ===');
    console.log(result.header);
    console.log('\n=== Dashboard YAML ===');
    console.log(result.dashboard);
    console.log('\n=== Metadata ===');
    console.log(`Hash: ${result.hash}`);
    console.log(`Grepable: ${result.grepable}`);

    // Optionally save files
    if (args.has('--save')) {
      const baseName = `${params.scope?.toLowerCase()}-${params.type?.toLowerCase()}-${Date.now()}`;
      await Bun.write(`rules/${baseName}.md`, result.header);
      await Bun.write(`dashboard/${baseName}.yaml`, result.dashboard);
      console.log(`\n💾 Saved to: rules/${baseName}.md, dashboard/${baseName}.yaml`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { generateUnified };
