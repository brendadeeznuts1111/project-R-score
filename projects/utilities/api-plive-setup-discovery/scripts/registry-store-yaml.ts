// scripts/registry-store-yaml.ts - Registry YAML Store CLI
// Store YAML with zstd compression

import { file, YAML } from 'bun';

const args = process.argv.slice(2);

interface StoreOptions {
  filePath: string;
  compress: 'zstd' | 'gzip' | 'none';
}

async function storeYAML(options: StoreOptions): Promise<void> {
  console.log(`📦 Storing YAML to registry: ${options.filePath}`);
  console.log(`   Compression: ${options.compress}`);

  try {
    // Read file
    const content = await file(options.filePath).text();
    
    // Validate YAML
    const parsed = YAML.parse(content);
    console.log('✅ YAML validation passed');

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
      console.log(`✅ Compressed with zstd: ${contentBuffer.length} → ${finalContent.length} bytes`);
    } else if (options.compress === 'gzip') {
      finalContent = Bun.gzipSync(contentBuffer);
      compressed = true;
      console.log(`✅ Compressed with gzip: ${contentBuffer.length} → ${finalContent.length} bytes`);
    } else {
      finalContent = contentBuffer;
    }

    // Store in registry
    const extension = options.compress === 'zstd' ? '.zst' : options.compress === 'gzip' ? '.gz' : '.yaml';
    const path = `registry/yaml-${shortHash}${extension}`;
    await Bun.write(path, finalContent);

    console.log(`\n✅ YAML stored:`);
    console.log(`   Hash: ${shortHash}`);
    console.log(`   Path: ${path}`);
    console.log(`   Original Size: ${contentBuffer.length} bytes`);
    if (compressed) {
      console.log(`   Compressed Size: ${finalContent.length} bytes`);
      const ratio = ((1 - finalContent.length / contentBuffer.length) * 100).toFixed(1);
      console.log(`   Compression Ratio: ${ratio}%`);
    }
    console.log(`   Format: ${parsed ? 'Valid YAML' : 'Invalid'}`);

    console.log(`\n💡 Retrieval:`);
    console.log(`   bun run registry:retrieve-yaml --hash=${shortHash}`);

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

