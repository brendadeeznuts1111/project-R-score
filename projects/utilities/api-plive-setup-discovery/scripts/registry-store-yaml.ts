// scripts/registry-store-yaml.ts - Registry YAML Store CLI
// Store YAML with zstd compression

import { file, YAML } from 'bun';

const args = process.argv.slice(2);

interface StoreOptions {
  filePath: string;
  compress: 'zstd' | 'gzip' | 'none';
}

async function storeYAML(options: StoreOptions): Promise<void> {
  console.info(`📦 Storing YAML to registry: ${options.filePath}`);
  console.info(`   Compression: ${options.compress}`);

  try {
    // Read file
    const content = await file(options.filePath).text();
    
    // Validate YAML
    const parsed = YAML.parse(content);
    console.info('✅ YAML validation passed');

    // Generate hash
    const contentBuffer = new TextEncoder().encode(content);
    const hash = Bun.hash(contentBuffer);
    const hashHex = typeof hash === 'bigint' ? hash.toString(16) : hash.toString(16);
    const shortHash = hashHex.substring(0, 8);

    // Compress if requested
    let finalContent: Uint8Array;
    let compressed = false;
    
    if (options.compress === 'zstd') {
      finalContent = Bun.zstdCompressSync(contentBuffer);
      compressed = true;
      console.info(`✅ Compressed with zstd: ${contentBuffer.length} → ${finalContent.length} bytes`);
    } else if (options.compress === 'gzip') {
      finalContent = Bun.gzipSync(contentBuffer);
      compressed = true;
      console.info(`✅ Compressed with gzip: ${contentBuffer.length} → ${finalContent.length} bytes`);
    } else {
      finalContent = contentBuffer;
    }

    // Store in registry
    const extension = options.compress === 'zstd' ? '.zst' : options.compress === 'gzip' ? '.gz' : '.yaml';
    const path = `registry/yaml-${shortHash}${extension}`;
    await Bun.write(path, finalContent);

    console.info(`\n✅ YAML stored:`);
    console.info(`   Hash: ${shortHash}`);
    console.info(`   Path: ${path}`);
    console.info(`   Original Size: ${contentBuffer.length} bytes`);
    if (compressed) {
      console.info(`   Compressed Size: ${finalContent.length} bytes`);
      const ratio = ((1 - finalContent.length / contentBuffer.length) * 100).toFixed(1);
      console.info(`   Compression Ratio: ${ratio}%`);
    }
    console.info(`   Format: ${parsed ? 'Valid YAML' : 'Invalid'}`);

    console.info(`\n💡 Retrieval:`);
    console.info(`   bun run registry:retrieve-yaml --hash=${shortHash}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse arguments
function parseArgs(): StoreOptions {
  const filePath = args.find(arg => !arg.startsWith('--')) || args[0];
  
  if (!filePath) {
    console.error('❌ Error: File path required');
    console.error('Usage: bun run registry:store-yaml <file> [--compress=zstd|gzip|none]');
    process.exit(1);
  }

  const compressArg = args.find(arg => arg.startsWith('--compress='));
  const compress = compressArg 
    ? (compressArg.split('=')[1] as 'zstd' | 'gzip' | 'none')
    : 'zstd';

  return {
    filePath,
    compress
  };
}

if (import.meta.main) {
  const options = parseArgs();
  storeYAML(options);
}

