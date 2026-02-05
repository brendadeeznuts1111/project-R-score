// scripts/validate-api.ts - API validation with ripgrep-powered cross-checks
// Validates bun.yaml routes against handler exports and schema consistency

import { file, YAML } from 'bun';
import { spawn } from 'child_process';

interface RouteDecl {
  path: string;
  method: string | 'WS';
  id: string;
  handler: string;
  auth?: string;
  request?: { schema: string; required?: boolean };
  response: Record<string, { schema: string; example?: any }>;
  tags: string[];
  summary: string;
  sourcemap?: boolean;
}

async function validateAPI() {
  console.log('🔍 Validating API consistency...');

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Load bun.yaml configuration
    const config = YAML.parse(await file('bun.yaml').text());
    const routes: RouteDecl[] = config.api.routes;

    // Build route index using ripgrep
    console.log('📄 Building route index...');
    const rgResult = await runRipgrep('export const handle', 'routes/', ['--files-with-matches']);
    const foundHandlers = rgResult.trim().split('\n').filter(Boolean);

    console.log(`📄 Found ${foundHandlers.length} handler files`);

    // Cross-check each route
    for (const route of routes) {
      console.log(`🔍 Checking route: ${route.id}`);

      // Check if handler file exists (normalize path)
      const normalizedHandler = route.handler.startsWith('./') ? route.handler.substring(2) : route.handler;
      if (!foundHandlers.includes(normalizedHandler)) {
        errors.push(`Handler file not found: ${route.handler} (referenced by route ${route.id})`);
        continue;
      }

      // Read handler file
      const handlerCode = await file(route.handler).text();

      // Check for handle export
      if (!handlerCode.includes('export const handle')) {
        errors.push(`Handler file ${route.handler} does not export 'handle' function`);
      }

      // Check for Zod schemas mentioned in bun.yaml
      if (route.request) {
        const schemaName = route.request.schema;
        if (!handlerCode.includes(`const ${schemaName}`) && !handlerCode.includes(`export const ${schemaName}`)) {
          warnings.push(`Schema '${schemaName}' referenced in bun.yaml but not found in ${route.handler}`);
        }
      }

      // Check response schemas
      if (route.response) {
        for (const response of Object.values(route.response)) {
          const schemaName = (response as any).schema;
          if (!handlerCode.includes(`const ${schemaName}`) && !handlerCode.includes(`export const ${schemaName}`)) {
            warnings.push(`Schema '${schemaName}' referenced in bun.yaml but not found in ${route.handler}`);
          }
        }
      }

      // Check for Zod import
      if (!handlerCode.includes("from 'zod'") && !handlerCode.includes('import { z }')) {
        warnings.push(`Handler ${route.handler} uses schemas but doesn't import Zod`);
      }
    }

    // Check for orphaned handlers (handlers not referenced in bun.yaml)
    const configuredHandlers = routes.map(r => r.handler.startsWith('./') ? r.handler.substring(2) : r.handler);
    const orphanedHandlers = foundHandlers.filter(h => !configuredHandlers.includes(h));

    if (orphanedHandlers.length > 0) {
      warnings.push(`Found ${orphanedHandlers.length} orphaned handler files: ${orphanedHandlers.join(', ')}`);
    }

    // Check route ID uniqueness
    const routeIds = routes.map(r => r.id);
    const duplicateIds = routeIds.filter((id, index) => routeIds.indexOf(id) !== index);

    if (duplicateIds.length > 0) {
      errors.push(`Duplicate route IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Check path uniqueness per method
    const pathMethodCombos = routes.map(r => `${r.method}:${r.path}`);
    const duplicatePaths = pathMethodCombos.filter((combo, index) => pathMethodCombos.indexOf(combo) !== index);

    if (duplicatePaths.length > 0) {
      errors.push(`Duplicate path+method combinations found: ${[...new Set(duplicatePaths)].join(', ')}`);
    }

  } catch (error) {
    errors.push(`Validation failed: ${error.message}`);
  }

  // Report results
  if (errors.length > 0) {
    console.error('❌ API validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  API validation warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ API validation passed - all routes consistent!');
  }
}

async function runRipgrep(pattern: string, path: string = '.', args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const rg = spawn('rg', [pattern, path, ...args], { stdio: 'pipe' });

    let stdout = '';
    let stderr = '';

    rg.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    rg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    rg.on('close', (code) => {
      if (code === 0 || code === 1) { // 1 is OK for rg (no matches found)
        resolve(stdout);
      } else {
        reject(new Error(`ripgrep failed: ${stderr}`));
      }
    });

    rg.on('error', reject);
  });
}

if (import.meta.main) {
  validateAPI().catch(console.error);
}
