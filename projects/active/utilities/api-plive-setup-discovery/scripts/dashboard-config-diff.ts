// scripts/dashboard-config-diff.ts - Dashboard Config Diff CLI
// Diff between two config versions using hash

import { file, YAML } from 'bun';

const args = process.argv.slice(2);

interface DiffOptions {
  fromHash: string;
  toHash: string;
}

interface DiffChange {
  path: string;
  oldValue?: any;
  newValue?: any;
  operation: 'add' | 'update' | 'delete';
}

function findConfigByHash(hash: string): string | null {
  // Search in configs directory
  const patterns = [
    `configs/dashboard-${hash}.yaml`,
    `configs/dashboard-${hash}.*`,
    `registry/yaml-${hash}.*`,
    `rules/ai-${hash}.yaml`
  ];

  for (const pattern of patterns) {
    try {
      // Use Bun's file system directly
      const glob = new Bun.Glob(pattern);
      for (const file of glob.scanSync('.')) {
        return file;
      }
    } catch (error) {
      // Continue searching
    }
  }

  return null;
}

async function loadConfig(hash: string): Promise<any> {
  const filePath = findConfigByHash(hash);
  
  if (!filePath) {
    throw new Error(`Config not found for hash: ${hash}`);
  }

  let content: string;
  
  // Handle compressed files
  if (filePath.endsWith('.zst')) {
    const compressed = await file(filePath).arrayBuffer();
    const decompressed = Bun.zstdDecompressSync(new Uint8Array(compressed));
    content = new TextDecoder().decode(decompressed);
  } else if (filePath.endsWith('.gz')) {
    const compressed = await file(filePath).arrayBuffer();
    const decompressed = Bun.gunzipSync(new Uint8Array(compressed));
    content = new TextDecoder().decode(decompressed);
  } else {
    content = await file(filePath).text();
  }

  return YAML.parse(content);
}

function diffObjects(oldObj: any, newObj: any, path = ''): DiffChange[] {
  const changes: DiffChange[] = [];

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {})
  ]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const oldValue = oldObj?.[key];
    const newValue = newObj?.[key];

    if (oldValue === undefined && newValue !== undefined) {
      // Added
      changes.push({
        path: currentPath,
        newValue,
        operation: 'add'
      });
    } else if (oldValue !== undefined && newValue === undefined) {
      // Deleted
      changes.push({
        path: currentPath,
        oldValue,
        operation: 'delete'
      });
    } else if (typeof oldValue === 'object' && typeof newValue === 'object' && 
               oldValue !== null && newValue !== null && 
               !Array.isArray(oldValue) && !Array.isArray(newValue)) {
      // Recursively diff nested objects
      changes.push(...diffObjects(oldValue, newValue, currentPath));
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      // Updated
      changes.push({
        path: currentPath,
        oldValue,
        newValue,
        operation: 'update'
      });
    }
  }

  return changes;
}

async function diffConfigs(options: DiffOptions): Promise<void> {
  console.info(`🔍 Diffing configs:`);
  console.info(`   From: ${options.fromHash}`);
  console.info(`   To: ${options.toHash}`);

  try {
    const fromConfig = await loadConfig(options.fromHash);
    const toConfig = await loadConfig(options.toHash);

    console.info('✅ Both configs loaded');

    const changes = diffObjects(fromConfig, toConfig);

    console.info(`\n📊 Diff Results:`);
    console.info(`   Total Changes: ${changes.length}`);

    if (changes.length === 0) {
      console.info('✅ No differences found');
      return;
    }

    const added = changes.filter(c => c.operation === 'add').length;
    const updated = changes.filter(c => c.operation === 'update').length;
    const deleted = changes.filter(c => c.operation === 'delete').length;

    console.info(`   Added: ${added}`);
    console.info(`   Updated: ${updated}`);
    console.info(`   Deleted: ${deleted}`);

    console.info(`\n📋 Changes:`);
    changes.forEach((change, index) => {
      const icon = change.operation === 'add' ? '➕' : 
                   change.operation === 'update' ? '🔄' : '➖';
      console.info(`\n${index + 1}. ${icon} ${change.path} (${change.operation})`);
      
      if (change.operation === 'add') {
        console.info(`   New: ${JSON.stringify(change.newValue)}`);
      } else if (change.operation === 'delete') {
        console.info(`   Old: ${JSON.stringify(change.oldValue)}`);
      } else {
        console.info(`   Old: ${JSON.stringify(change.oldValue)}`);
        console.info(`   New: ${JSON.stringify(change.newValue)}`);
      }
    });

    // Export diff as JSON
    const diffOutput = {
      fromHash: options.fromHash,
      toHash: options.toHash,
      timestamp: new Date().toISOString(),
      changes
    };

    const diffPath = `diffs/config-diff-${options.fromHash}-${options.toHash}.json`;
    await Bun.write(diffPath, JSON.stringify(diffOutput, null, 2));

    console.info(`\n💾 Diff saved to: ${diffPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse arguments
function parseArgs(): DiffOptions {
  const fromHashArg = args.find(arg => arg.startsWith('--from-hash='));
  const toHashArg = args.find(arg => arg.startsWith('--to-hash='));

  if (!fromHashArg || !toHashArg) {
    console.error('❌ Error: Both --from-hash and --to-hash required');
    console.error('Usage: bun run dashboard:config-diff --from-hash=<hash> --to-hash=<hash>');
    process.exit(1);
  }

  return {
    fromHash: fromHashArg.split('=')[1],
    toHash: toHashArg.split('=')[1]
  };
}

if (import.meta.main) {
  const options = parseArgs();
  diffConfigs(options);
}

