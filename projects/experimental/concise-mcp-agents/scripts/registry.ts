#!/usr/bin/env bun
import { file, YAML, crypto } from 'bun';
import { zstdCompress, zstdDecompress } from 'bun';
import { join } from 'path';

interface RegistryOptions {
  interpolate?: boolean;
  encrypt?: boolean;
  compress?: boolean;
  vault?: string[];
  env?: string;
  metadata?: Record<string, any>;
}

interface RegistryEntry {
  hash: string;
  content: string;
  compressed: Buffer;
  metadata: Record<string, any>;
  timestamp: number;
  size: number;
}

class BunYAMLRegistry {
  private registry = new Map<string, RegistryEntry>();
  private registryPath = './.registry';

  constructor() {
    this.ensureRegistryDir();
  }

  private ensureRegistryDir() {
    try {
      Bun.write(`${this.registryPath}/.gitkeep`, '');
    } catch (e) {
      // Directory exists
    }
  }

  async storeYAML(content: string, options: RegistryOptions = {}): Promise<string> {
    const { interpolate = true, encrypt = false, compress = true, vault = [], env = 'dev', metadata = {} } = options;

    let processedContent = content;

    // Interpolate environment variables
    if (interpolate) {
      processedContent = this.interpolateContent(processedContent, { env, vault });
    }

    // Encrypt if requested
    if (encrypt) {
      processedContent = await this.encryptContent(processedContent);
    }

    // Compress
    let compressed: Buffer;
    if (compress) {
      compressed = await zstdCompress(Buffer.from(processedContent));
    } else {
      compressed = Buffer.from(processedContent);
    }

    // Generate hash
    const hash = await this.generateHash(processedContent);

    // Store entry
    const entry: RegistryEntry = {
      hash,
      content: processedContent,
      compressed,
      metadata,
      timestamp: Date.now(),
      size: compressed.length
    };

    this.registry.set(hash, entry);

    // Persist to disk
    await this.persistEntry(hash, entry);

    return hash;
  }

  async storeStream(stream: ReadableStream, options: RegistryOptions = {}): Promise<string> {
    const content = await new Response(stream).text();
    return this.storeYAML(content, options);
  }

  async getYAML(hash: string, format: 'yaml' | 'json' = 'yaml'): Promise<string> {
    const entry = this.registry.get(hash) || await this.loadEntry(hash);
    if (!entry) throw new Error(`Registry entry not found: ${hash}`);

    let content = entry.content;

    // Decompress if needed
    if (entry.compressed && entry.compressed instanceof Buffer) {
      content = (await zstdDecompress(entry.compressed)).toString();
    }

    return format === 'json' ? JSON.stringify(YAML.parse(content), null, 2) : content;
  }

  async validateYAML(content: string, schema: any): Promise<boolean> {
    try {
      const parsed = YAML.parse(content);
      // Basic schema validation - could be enhanced with proper schema validator
      return this.validateAgainstSchema(parsed, schema);
    } catch (e) {
      console.error(`YAML validation failed: ${e.message}`);
      return false;
    }
  }

  private interpolateContent(content: string, context: { env: string; vault: string[] }): string {
    return content
      .replace(/\$\{DATE:ISO\}/g, new Date().toISOString())
      .replace(/\$\{DATE:YYYY-MM-DD\}/g, new Date().toISOString().split('T')[0])
      .replace(/\$\{ENV:(\w+)\}/g, (match, key) => process.env[key] || match)
      .replace(/\$\{VAULT:([^}]+)\}/g, (match, path) => {
        // Mock vault resolution - integrate with actual vault system
        return `vault://${path}`;
      });
  }

  private async encryptContent(content: string): Promise<string> {
    // Use Bun's built-in crypto for encryption
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(content)
    );

    return JSON.stringify({
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      key: await crypto.subtle.exportKey('jwk', key)
    });
  }

  private async generateHash(content: string): Promise<string> {
    // Simple hash for now - replace with proper crypto when available
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 16);
  }

  private async persistEntry(hash: string, entry: RegistryEntry): Promise<void> {
    const entryPath = join(this.registryPath, `${hash}.json`);
    await Bun.write(entryPath, JSON.stringify(entry, null, 2));
  }

  private async loadEntry(hash: string): Promise<RegistryEntry | null> {
    try {
      const entryPath = join(this.registryPath, `${hash}.json`);
      const data = await Bun.file(entryPath).json();
      this.registry.set(hash, data);
      return data;
    } catch (e) {
      return null;
    }
  }

  private validateAgainstSchema(data: any, schema: any): boolean {
    // Basic validation - enhance with proper JSON schema validator
    if (schema.type === 'object' && typeof data !== 'object') return false;
    if (schema.type === 'array' && !Array.isArray(data)) return false;
    return true;
  }

  async diffYAML(hash1: string, hash2: string): Promise<string> {
    const content1 = await this.getYAML(hash1);
    const content2 = await this.getYAML(hash2);

    // Simple diff - could use proper diff library
    return this.simpleDiff(content1, content2);
  }

  private simpleDiff(str1: string, str2: string): string {
    const lines1 = str1.split('\n');
    const lines2 = str2.split('\n');
    const diff = [];

    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 !== line2) {
        diff.push(`-${line1}`);
        diff.push(`+${line2}`);
      } else {
        diff.push(` ${line1}`);
      }
    }

    return diff.join('\n');
  }
}

// CLI Interface
const registry = new BunYAMLRegistry();

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'store':
      const filePath = args[0];
      if (!filePath) {
        console.error('Usage: bun run registry.ts store <file> [--scope=SCOPE] [--type=TYPE] [--interpolate] [--vault-sync] [--encrypt] [--compress]');
        process.exit(1);
      }

      const content = await Bun.file(filePath).text();
      const options: RegistryOptions = {
        interpolate: args.includes('--interpolate'),
        encrypt: args.includes('--encrypt'),
        compress: !args.includes('--no-compress'),
        env: args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'dev'
      };

      // Extract scope and type from flags or content
      const scopeFlag = args.find(arg => arg.startsWith('--scope='))?.split('=')[1];
      const typeFlag = args.find(arg => arg.startsWith('--type='))?.split('=')[1];
      const vaultSync = args.includes('--vault-sync');

      if (vaultSync) {
        // TODO: Implement vault synchronization
        console.log('🔐 Vault sync enabled (mock implementation)');
      }

      // Add metadata
      options.metadata = {
        scope: scopeFlag,
        type: typeFlag,
        vaultSynced: vaultSync,
        timestamp: new Date().toISOString()
      };

      const hash = await registry.storeYAML(content, options);
      console.log(`📦 Stored YAML with hash: ${hash}`);
      if (scopeFlag && typeFlag) {
        console.log(`🏷️  Tagged as: ${scopeFlag}/${typeFlag}`);
      }
      break;

    case 'get':
      const getHash = args[0];
      const format = (args.find(arg => arg.startsWith('--format='))?.split('=')[1] as 'yaml' | 'json') || 'yaml';
      if (!getHash) {
        console.error('Usage: bun run registry.ts get <hash> [--format=yaml|json]');
        process.exit(1);
      }

      const yaml = await registry.getYAML(getHash, format);
      console.log(yaml);
      break;

    case 'diff':
    case 'diff-yaml':
      const hash1 = args[0];
      const hash2 = args[1];
      const outputFormat = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'text';

      if (!hash1 || !hash2) {
        console.error('Usage: bun run registry.ts diff <hash1> <hash2> [--output=text|html]');
        process.exit(1);
      }

      const diff = await registry.diffYAML(hash1, hash2);

      if (outputFormat === 'html') {
        const htmlDiff = generateHTMLDiff(hash1, hash2, diff);
        console.log(htmlDiff);
      } else {
        console.log(diff);
      }
      break;

    case 'store-batch':
      const pattern = args[0];
      const parallel = args.includes('--parallel');
      const maxConcurrency = parseInt(args.find(arg => arg.startsWith('--max='))?.split('=')[1] || '5');
      const showProgress = args.includes('--progress');

      if (!pattern) {
        console.error('Usage: bun run registry.ts store-batch <pattern> [--parallel] [--max=N] [--progress]');
        process.exit(1);
      }

      // Find files matching pattern
      const files = await findFilesForBatch(pattern);
      console.log(`📦 Found ${files.length} files to process`);

      if (parallel) {
        await processBatchParallel(files, maxConcurrency, showProgress);
      } else {
        await processBatchSequential(files, showProgress);
      }
      break;

    default:
      console.log(`
Bun YAML Registry v3.0

Commands:
  store <file>       Store YAML file in registry
  get <hash>         Retrieve YAML by hash
  diff <h1> <h2>     Show diff between two hashes
  store-batch <pat>  Store multiple files in batch

Options:
  --interpolate      Interpolate variables
  --encrypt          Encrypt content
  --compress         Compress (default: true)
  --env=<env>        Environment (default: dev)
  --format=<fmt>     Output format (yaml/json)
  --scope=<scope>    Set scope metadata
  --type=<type>      Set type metadata
  --vault-sync       Sync with vault
  --output=<fmt>     Diff output format (text/html)
  --parallel         Process batch in parallel
  --max=<N>          Max parallel workers (default: 5)
  --progress         Show progress bar
      `);
  }
}

function generateHTMLDiff(hash1: string, hash2: string, diffText: string): string {
  const lines = diffText.split('\n');
  const htmlLines = lines.map(line => {
    if (line.startsWith('+')) {
      return `<div class="diff-added">+ ${line.substring(1)}</div>`;
    } else if (line.startsWith('-')) {
      return `<div class="diff-removed">- ${line.substring(1)}</div>`;
    } else {
      return `<div class="diff-context">${line}</div>`;
    }
  }).join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
    <title>YAML Diff: ${hash1} → ${hash2}</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        .diff-added { background-color: #e6ffe6; color: #006600; padding: 2px; }
        .diff-removed { background-color: #ffe6e6; color: #660000; padding: 2px; }
        .diff-context { background-color: #f8f8f8; padding: 2px; }
        .header { background-color: #e8f4f8; padding: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>YAML Configuration Diff</h2>
        <p><strong>From:</strong> ${hash1}</p>
        <p><strong>To:</strong> ${hash2}</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>
    <div class="diff-content">
        ${htmlLines}
    </div>
</body>
</html>`;
}

async function findFilesForBatch(pattern: string): Promise<string[]> {
  // Simple glob implementation
  try {
    const files: string[] = [];
    for await (const entry of new Bun.Glob(pattern).scan('.')) {
      files.push(entry);
    }
    return files;
  } catch (e) {
    console.warn('Glob not available, using fallback');
    return [pattern];
  }
}

async function processBatchSequential(files: string[], showProgress: boolean): Promise<void> {
  const results: Array<{file: string, hash?: string, error?: string}> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (showProgress) {
      console.log(`📄 Processing ${i + 1}/${files.length}: ${file}`);
    }

    try {
      const content = await Bun.file(file).text();
      const hash = await registry.storeYAML(content, { compress: true, interpolate: true });
      results.push({ file, hash });
    } catch (error) {
      results.push({ file, error: error.message });
    }
  }

  console.log('\n📊 Batch Results:');
  results.forEach(result => {
    if (result.hash) {
      console.log(`✅ ${result.file} → ${result.hash}`);
    } else {
      console.log(`❌ ${result.file} → ${result.error}`);
    }
  });
}

async function processBatchParallel(files: string[], maxConcurrency: number, showProgress: boolean): Promise<void> {
  const results: Array<{file: string, hash?: string, error?: string}> = [];
  const semaphore = new Semaphore(maxConcurrency);

  const promises = files.map(async (file, index) => {
    await semaphore.acquire();
    try {
      if (showProgress) {
        console.log(`📄 Processing ${index + 1}/${files.length}: ${file}`);
      }

      const content = await Bun.file(file).text();
      const hash = await registry.storeYAML(content, { compress: true, interpolate: true });
      results.push({ file, hash });
    } catch (error) {
      results.push({ file, error: error.message });
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(promises);

  console.log('\n📊 Batch Results:');
  results.forEach(result => {
    if (result.hash) {
      console.log(`✅ ${result.file} → ${result.hash}`);
    } else {
      console.log(`❌ ${result.file} → ${result.error}`);
    }
  });
}

class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { BunYAMLRegistry };
