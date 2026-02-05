#!/usr/bin/env bun
import { YAML } from 'bun';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { BunYAMLRegistry } from './registry';

let config: any;
let registry: BunYAMLRegistry;

async function initialize() {
  config = YAML.parse(await Bun.file('bun.yaml').text());
  registry = new BunYAMLRegistry();
}

async function findFiles(dirs: string[], extensions: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = extensions.find(e => entry.name.endsWith(e));
          if (ext) {
            files.push(join(dir, entry.name));
          }
        }
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }
  }

  return files;
}

async function validateUnified(options: { glob?: string; schema?: boolean } = {}) {
  await initialize();
  const { header, dashboard } = config.rules;

  let files: string[];
  if (options.glob) {
    // Parse glob pattern like "{rules,dashboard}/*"
    const match = options.glob.match(/^\{([^}]+)\}\/\*$/);
    const dirs = match ? match[1].split(',') : ['rules', 'dashboards'];
    files = await findFiles(dirs, ['.md', '.yaml']);
  } else {
    files = await findFiles(['rules', 'dashboards'], ['.md', '.yaml']);
  }

  let valid = 0, errors: string[] = [];
  const startTime = performance.now();

  console.log(`🔍 Validating ${files.length} files with unified schema...\n`);

  for (const file of files) {
    const content = await Bun.file(file).text();
    const isValid = await validateFile(file, content, options.schema !== false, header, dashboard);
    if (isValid) {
      valid++;
      console.log(`🟢 ${file.split('/').pop()}: Validated`);
    } else {
      console.log(`❌ ${file.split('/').pop()}: Failed`);
    }
  }

  const duration = performance.now() - startTime;

  if (errors.length) {
    console.error('\n❌ Validation Errors:');
    errors.forEach(error => console.error(`  ${error}`));
    process.exit(1);
  }

  console.log(`\n🎉 All ${valid} files valid & unified! (${duration.toFixed(1)}ms)`);
  return { valid, total: files.length, duration };
}

async function validateFile(filePath: string, content: string, checkSchema = true, header: any, dashboard: any): Promise<boolean> {
  const isMarkdown = filePath.endsWith('.md');
  const isYAML = filePath.endsWith('.yaml');

  if (isMarkdown) {
    return validateGOVHeader(content, header);
  } else if (isYAML) {
    return await validateDashboardYAML(content, checkSchema, dashboard);
  }

  return true; // Skip unknown files
}

function validateGOVHeader(content: string, header: any): boolean {
  const headerMatch = content.match(/\[(.*?)\]/g);
  if (!headerMatch || headerMatch.length < 6) {
    console.error(`Missing/incomplete header in ${content.substring(0, 100)}...`);
    return false;
  }

  const [scope, type, variant, id, version, status] = headerMatch.slice(0, 6).map(tag => tag.slice(1, -1));

  // Validate schema
  if (!header.schema.scope.includes(scope)) {
    console.error(`Invalid scope '${scope}'`);
    return false;
  }
  if (!header.schema.type.includes(type)) {
    console.error(`Invalid type '${type}'`);
    return false;
  }
  if (!id.match(new RegExp(header.schema.id.pattern))) {
    console.error(`Invalid ID format '${id}'`);
    return false;
  }
  if (!version.match(new RegExp(header.schema.version.semver))) {
    console.error(`Invalid version format '${version}'`);
    return false;
  }
  if (!header.schema.status.includes(status)) {
    console.error(`Invalid status '${status}'`);
    return false;
  }

  // Validate grepable tag
  const grepTag = `[${scope.toLowerCase()}-${type.toLowerCase()}-${(variant || 'base').toLowerCase()}-${id.toLowerCase()}-${version.toLowerCase()}-${status.toLowerCase()}]`;
  if (!grepTag.match(new RegExp(header.grep.patterns['all-tags']))) {
    console.error(`Grepable tag validation failed`);
    return false;
  }

  return true;
}

async function validateDashboardYAML(content: string, checkSchema = true, dashboard: any): Promise<boolean> {
  try {
    const parsed = YAML.parse(content);

    if (checkSchema) {
      // Validate against dashboard schema
      if (dashboard.schema.filters && !Array.isArray(parsed.filters)) {
        console.error('Invalid filters schema');
        return false;
      }

      if (dashboard.schema.security && (!parsed.security?.csrf || !parsed.security?.cookies)) {
        console.error('Missing security configuration');
        return false;
      }
    }

    // Test interpolation (if content has interpolation markers)
    if (content.includes('${')) {
      const interpolated = interpolateYAML(content);
      if (interpolated === content && content.includes('${')) {
        console.error('Interpolation failed - unresolved variables');
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error(`YAML parse error: ${e.message}`);
    return false;
  }
}

function interpolateYAML(content: string): string {
  return content
    .replace(/\$\{DATE:ISO\}/g, new Date().toISOString())
    .replace(/\$\{DATE:YYYY-MM-DD\}/g, new Date().toISOString().split('T')[0])
    .replace(/\$\{ENV:(\w+)\}/g, (match, key) => process.env[key] || match);
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    glob: args.find(arg => arg.startsWith('--glob='))?.split('=')[1],
    schema: args.find(arg => arg.startsWith('--schema='))?.split('=')[1] === 'bun.yaml' || !args.includes('--no-schema')
  };

  await validateUnified(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { validateUnified, validateGOVHeader, validateDashboardYAML };
