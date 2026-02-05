#!/usr/bin/env bun
/**
 * 📦 NPM Registry CLI (Bun v1.3.7+ Optimized)
 * 
 * Command-line interface for managing the private registry
 * Uses Bun.wrapAnsi() for 33-88x faster ANSI text wrapping
 */

import { styled, FW_COLORS } from '../theme/colors';
import { R2StorageAdapter } from './r2-storage';
import { NPMRegistryServer } from './server';
import { RegistryAuth, AuthConfigs } from './auth';
import { loadRegistryConfig } from './config-loader';

// Bun v1.3.7: ANSI-aware text wrapping helper
function wrapText(text: string, columns: number = 80): string {
  // Use Bun.wrapAnsi if available (Bun v1.3.7+)
  if (typeof Bun.wrapAnsi === 'function') {
    return Bun.wrapAnsi(text, columns, {
      hard: false,
      wordWrap: true,
      trim: true,
    });
  }
  // Fallback for older Bun versions
  return text;
}

const DEFAULT_REGISTRY_PORT = parseInt(process.env.REGISTRY_PORT || '4873', 10);
const DEFAULT_REGISTRY_HOST = process.env.REGISTRY_HOST || process.env.SERVER_HOST || 'localhost';
const DEFAULT_REGISTRY_URL = process.env.REGISTRY_URL || `http://${DEFAULT_REGISTRY_HOST}:${DEFAULT_REGISTRY_PORT}`;

const COMMANDS = {
  'start': 'Start the registry server',
  'publish': 'Publish a package to the registry',
  'unpublish': 'Remove a package from the registry',
  'info': 'Show package information',
  'search': 'Search for packages',
  'list': 'List all packages',
  'users': 'Manage registry users',
  'tokens': 'Manage auth tokens',
  'stats': 'Show registry statistics',
  'config': 'Show registry configuration',
  'help': 'Show this help',
};

class RegistryCLI {
  private storage: R2StorageAdapter;

  constructor() {
    this.storage = new R2StorageAdapter();
  }

  async run(args: string[]): Promise<void> {
    const command = args[0] || 'help';
    const subcommand = args[1];
    const options = this.parseOptions(args.slice(1));

    switch (command) {
      case 'start':
        await this.handleStart(options);
        break;
      case 'publish':
        await this.handlePublish(options);
        break;
      case 'unpublish':
        await this.handleUnpublish(options);
        break;
      case 'info':
        await this.handleInfo(options);
        break;
      case 'search':
        await this.handleSearch(options);
        break;
      case 'list':
      case 'ls':
        await this.handleList(options);
        break;
      case 'users':
        await this.handleUsers(subcommand, options);
        break;
      case 'tokens':
        await this.handleTokens(subcommand, options);
        break;
      case 'stats':
        await this.handleStats();
        break;
      case 'config':
        await this.handleConfig();
        break;
      case 'help':
      default:
        this.showHelp();
    }
  }

  /**
   * Start the registry server
   */
  private async handleStart(options: any): Promise<void> {
    console.log(styled('\n🚀 Starting NPM Registry...', 'accent'));

    const server = new NPMRegistryServer({
      port: parseInt(options.port || process.env.REGISTRY_PORT || '4873'),
      hostname: options.host || '0.0.0.0',
      auth: options.auth || process.env.REGISTRY_AUTH || 'none',
      authSecret: options.secret || process.env.REGISTRY_SECRET,
      storage: {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: options.bucket || process.env.R2_REGISTRY_BUCKET || 'npm-registry',
      },
      cdnUrl: options.cdn || process.env.REGISTRY_CDN_URL,
      allowProxy: options.proxy !== 'false',
    });

    await server.start();

    // Keep running
    await new Promise(() => {});
  }

  /**
   * Publish a package
   */
  private async handlePublish(options: any): Promise<void> {
    const packagePath = options._[0] || '.';
    const registry = options.registry || DEFAULT_REGISTRY_URL;

    console.log(styled(`\n📦 Publishing from ${packagePath}...`, 'accent'));

    try {
      // Read package.json
      const pkgPath = packagePath === '.' 
        ? './package.json' 
        : `${packagePath}/package.json`;
      
      const pkg = await Bun.file(pkgPath).json();
      
      console.log(styled(`Package: ${pkg.name}@${pkg.version}`, 'info'));
      console.log(styled(`Registry: ${registry}`, 'info'));

      // Create tarball
      const tarballData = await this.createTarball(packagePath, pkg);

      // Prepare publish data
      const publishData = {
        _id: pkg.name,
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        main: pkg.main,
        module: pkg.module,
        types: pkg.types,
        files: pkg.files,
        scripts: pkg.scripts,
        dependencies: pkg.dependencies,
        devDependencies: pkg.devDependencies,
        peerDependencies: pkg.peerDependencies,
        engines: pkg.engines,
        keywords: pkg.keywords,
        author: pkg.author,
        license: pkg.license,
        repository: pkg.repository,
        bugs: pkg.bugs,
        homepage: pkg.homepage,
        readme: pkg.readme || await this.readReadme(packagePath),
        readmeFilename: 'README.md',
        'dist-tags': {
          latest: pkg.version,
        },
        maintainers: pkg.maintainers || [{ name: 'admin', email: 'admin@factory-wager.com' }],
        dist: {
          shasum: await this.calculateShasum(tarballData),
          integrity: await this.calculateIntegrity(tarballData),
        },
        attachments: {
          [`${pkg.name.replace(/^@[^/]+\//, '')}-${pkg.version}.tgz`]: {
            content_type: 'application/octet-stream',
            data: Buffer.from(tarballData).toString('base64'),
          },
        },
      };

      // Publish to registry
      const response = await fetch(`${registry}/${pkg.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(options),
        },
        body: JSON.stringify(publishData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(styled(`\n✅ Published: ${result.id}@${result.version}`, 'success'));
      } else {
        const error = await response.json();
        console.error(styled(`\n❌ Failed: ${error.reason || error.error}`, 'error'));
        process.exit(1);
      }
    } catch (error) {
      console.error(styled(`\n❌ Error: ${error.message}`, 'error'));
      process.exit(1);
    }
  }

  /**
   * Unpublish a package
   */
  private async handleUnpublish(options: any): Promise<void> {
    const packageName = options._[0];
    const version = options.version;
    const registry = options.registry || DEFAULT_REGISTRY_URL;

    if (!packageName) {
      console.error(styled('❌ Package name required', 'error'));
      console.log(styled('Usage: registry unpublish <package> [--version <version>]', 'muted'));
      return;
    }

    console.log(styled(`\n🗑️ Unpublishing ${packageName}${version ? `@${version}` : ''}...`, 'warning'));

    try {
      if (version) {
        // Delete specific version
        const response = await fetch(`${registry}/${packageName}/-/${version}`, {
          method: 'DELETE',
          headers: {
            'Authorization': this.getAuthHeader(options),
          },
        });

        if (response.ok) {
          console.log(styled(`✅ Unpublished: ${packageName}@${version}`, 'success'));
        } else {
          const error = await response.json();
          console.error(styled(`❌ Failed: ${error.reason || error.error}`, 'error'));
        }
      } else {
        // Delete entire package
        const response = await fetch(`${registry}/${packageName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': this.getAuthHeader(options),
          },
        });

        if (response.ok) {
          console.log(styled(`✅ Unpublished: ${packageName}`, 'success'));
        } else {
          const error = await response.json();
          console.error(styled(`❌ Failed: ${error.reason || error.error}`, 'error'));
        }
      }
    } catch (error) {
      console.error(styled(`❌ Error: ${error.message}`, 'error'));
    }
  }

  /**
   * Show package info
   */
  private async handleInfo(options: any): Promise<void> {
    const packageName = options._[0];
    const registry = options.registry || DEFAULT_REGISTRY_URL;

    if (!packageName) {
      console.error(styled('❌ Package name required', 'error'));
      return;
    }

    try {
      const response = await fetch(`${registry}/${packageName}`);
      
      if (!response.ok) {
        console.error(styled(`❌ Package not found: ${packageName}`, 'error'));
        return;
      }

      const manifest = await response.json();

      console.log(styled(`\n📦 ${manifest.name}`, 'accent'));
      console.log(styled('='.repeat(50), 'accent'));
      
      console.log(styled(`\n📋 Description:`, 'info'));
      console.log(styled(`  ${manifest.description || 'N/A'}`, 'muted'));

      console.log(styled(`\n🏷️  Dist Tags:`, 'info'));
      for (const [tag, version] of Object.entries(manifest['dist-tags'])) {
        console.log(styled(`  ${tag}: ${version}`, 'muted'));
      }

      console.log(styled(`\n📦 Versions (${Object.keys(manifest.versions).length}):`, 'info'));
      const versions = Object.keys(manifest.versions).slice(-10);
      versions.forEach(v => console.log(styled(`  - ${v}`, 'muted')));

      if (manifest.keywords) {
        console.log(styled(`\n🔑 Keywords:`, 'info'));
        console.log(styled(`  ${manifest.keywords.join(', ')}`, 'muted'));
      }

      if (manifest.author) {
        const author = typeof manifest.author === 'string' 
          ? manifest.author 
          : manifest.author.name;
        console.log(styled(`\n👤 Author:`, 'info'));
        console.log(styled(`  ${author}`, 'muted'));
      }

      if (manifest.license) {
        console.log(styled(`\n📄 License:`, 'info'));
        console.log(styled(`  ${manifest.license}`, 'muted'));
      }

      if (manifest.repository) {
        console.log(styled(`\n🔗 Repository:`, 'info'));
        const repo = typeof manifest.repository === 'string' 
          ? manifest.repository 
          : manifest.repository.url;
        console.log(styled(`  ${repo}`, 'muted'));
      }

      console.log();
    } catch (error) {
      console.error(styled(`❌ Error: ${error.message}`, 'error'));
    }
  }

  /**
   * Search packages
   */
  private async handleSearch(options: any): Promise<void> {
    const query = options._[0];
    const registry = options.registry || DEFAULT_REGISTRY_URL;

    if (!query) {
      console.error(styled('❌ Search query required', 'error'));
      return;
    }

    try {
      const response = await fetch(`${registry}/-/search?text=${encodeURIComponent(query)}`);
      const results = await response.json();

      console.log(styled(`\n🔍 Search results for "${query}"`, 'accent'));
      console.log(styled('='.repeat(50), 'accent'));

      if (results.objects.length === 0) {
        console.log(styled('\nNo packages found.', 'muted'));
        return;
      }

      for (const result of results.objects) {
        const pkg = result.package;
        console.log(styled(`\n📦 ${pkg.name}@${pkg.version}`, 'info'));
        if (pkg.description) {
          console.log(styled(`  ${pkg.description}`, 'muted'));
        }
      }

      console.log(styled(`\n📊 Total: ${results.total} packages`, 'muted'));
    } catch (error) {
      console.error(styled(`❌ Error: ${error.message}`, 'error'));
    }
  }

  /**
   * List all packages
   */
  private async handleList(options: any): Promise<void> {
    const registry = options.registry || DEFAULT_REGISTRY_URL;

    try {
      const response = await fetch(`${registry}/-/all`);
      const data = await response.json();

      console.log(styled('\n📦 Registry Packages', 'accent'));
      console.log(styled('='.repeat(50), 'accent'));

      if (data.packages.length === 0) {
        console.log(styled('\nNo packages in registry.', 'muted'));
        return;
      }

      for (const pkg of data.packages) {
        console.log(styled(`  📦 ${pkg}`, 'muted'));
      }

      console.log(styled(`\n📊 Total: ${data.packages.length} packages`, 'info'));
    } catch (error) {
      console.error(styled(`❌ Error: ${error.message}`, 'error'));
    }
  }

  /**
   * Manage users
   */
  private async handleUsers(subcommand: string, options: any): Promise<void> {
    switch (subcommand) {
      case 'add':
        console.log(styled(`\n👤 Adding user: ${options._[1]}`, 'info'));
        console.log(styled('Feature: Implement user management with R2 storage', 'muted'));
        break;

      case 'list':
        console.log(styled('\n👤 Registry Users', 'accent'));
        console.log(styled('Feature: List users from R2', 'muted'));
        break;

      case 'remove':
        console.log(styled(`\n👤 Removing user: ${options._[1]}`, 'warning'));
        console.log(styled('Feature: Remove user from R2', 'muted'));
        break;

      default:
        console.log(styled('\n👤 User Commands:', 'accent'));
        console.log(styled('  registry users add <username> [--email <email>] [--password <pass>]', 'muted'));
        console.log(styled('  registry users list', 'muted'));
        console.log(styled('  registry users remove <username>', 'muted'));
    }
  }

  /**
   * Manage tokens
   */
  private async handleTokens(subcommand: string, options: any): Promise<void> {
    switch (subcommand) {
      case 'create':
        const auth = new RegistryAuth(AuthConfigs.jwt(options.secret || 'test'));
        const token = auth.createJwt(options._[1] || 'admin', options.readonly === 'true');
        console.log(styled('\n🔑 Token created:', 'success'));
        console.log(styled(`  ${token}`, 'muted'));
        console.log(styled('\nAdd to .npmrc:', 'info'));
        console.log(styled(`  //registry.factory-wager.com/:_authToken=${token}`, 'muted'));
        break;

      case 'list':
        console.log(styled('\n🔑 Active Tokens', 'accent'));
        console.log(styled('Feature: List active tokens', 'muted'));
        break;

      case 'revoke':
        console.log(styled(`\n🔑 Revoking token: ${options._[1]}`, 'warning'));
        break;

      default:
        console.log(styled('\n🔑 Token Commands:', 'accent'));
        console.log(styled('  registry tokens create <username> [--readonly]', 'muted'));
        console.log(styled('  registry tokens list', 'muted'));
        console.log(styled('  registry tokens revoke <token>', 'muted'));
    }
  }

  /**
   * Show registry stats
   */
  private async handleStats(): Promise<void> {
    const status = this.storage.getConfigStatus();
    
    console.log(styled('\n📊 Registry Statistics', 'accent'));
    console.log(styled('=====================', 'accent'));
    
    console.log(styled('\n🪣 Storage:', 'info'));
    console.log(styled(`  Bucket: ${status.bucket}`, 'muted'));
    console.log(styled(`  Configured: ${status.configured ? '✅' : '❌'}`, status.configured ? 'success' : 'error'));

    if (status.configured) {
      const connected = await this.storage.testConnection();
      console.log(styled(`  Connected: ${connected ? '✅' : '❌'}`, connected ? 'success' : 'error'));

      if (connected) {
        const packages = await this.storage.listPackages();
        const stats = await this.storage.getStats();

        console.log(styled('\n📦 Packages:', 'info'));
        console.log(styled(`  Total: ${stats.packages}`, 'muted'));
        console.log(styled(`  Versions: ${stats.versions}`, 'muted'));
        console.log(styled(`  Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`, 'muted'));
      }
    }
  }

  /**
   * Show registry configuration
   */
  private async handleConfig(): Promise<void> {
    console.log(styled('\n⚙️  Registry Configuration', 'accent'));
    console.log(styled('==========================', 'accent'));
    
    console.log(styled('\n🌐 Server:', 'info'));
    console.log(styled(`  Port: ${process.env.REGISTRY_PORT || '4873'}`, 'muted'));
    console.log(styled(`  Auth: ${process.env.REGISTRY_AUTH || 'none'}`, 'muted'));

    console.log(styled('\n🪣 R2 Storage:', 'info'));
    console.log(styled(`  Bucket: ${process.env.R2_REGISTRY_BUCKET || 'npm-registry'}`, 'muted'));
    console.log(styled(`  Account: ${process.env.R2_ACCOUNT_ID || 'not set'}`, 'muted'));

    console.log(styled('\n📡 CDN:', 'info'));
    console.log(styled(`  URL: ${process.env.REGISTRY_CDN_URL || 'not set'}`, 'muted'));

    console.log(styled('\n📝 Environment Variables:', 'info'));
    console.log(styled('  REGISTRY_PORT - Server port (default: 4873)', 'muted'));
    console.log(styled('  REGISTRY_AUTH - Auth type: none, basic, token, jwt', 'muted'));
    console.log(styled('  REGISTRY_SECRET - Auth secret/password', 'muted'));
    console.log(styled('  R2_ACCOUNT_ID - Cloudflare account ID', 'muted'));
    console.log(styled('  R2_ACCESS_KEY_ID - R2 access key', 'muted'));
    console.log(styled('  R2_SECRET_ACCESS_KEY - R2 secret key', 'muted'));
    console.log(styled('  R2_REGISTRY_BUCKET - R2 bucket name', 'muted'));
    console.log(styled('  REGISTRY_CDN_URL - CDN base URL', 'muted'));
  }

  /**
   * Show help
   */
  private showHelp(): void {
    console.log(styled('\n📦 NPM Registry CLI', 'accent'));
    console.log(styled('===================', 'accent'));
    console.log(styled('\nCommands:', 'info'));
    
    for (const [cmd, desc] of Object.entries(COMMANDS)) {
      console.log(styled(`  registry ${cmd.padEnd(12)} ${desc}`, 'muted'));
    }

    console.log(styled('\nExamples:', 'info'));
    console.log(styled('  registry start --port 4873 --auth basic', 'muted'));
    console.log(styled(`  registry publish ./my-package --registry ${DEFAULT_REGISTRY_URL}`, 'muted'));
    console.log(styled('  registry info my-package', 'muted'));
    console.log(styled('  registry search utils', 'muted'));
    console.log(styled('  registry tokens create admin', 'muted'));
  }

  /**
   * Create tarball from package directory
   */
  private async createTarball(packagePath: string, pkg: any): Promise<Uint8Array> {
    // Use tar command to create tarball
    const proc = Bun.spawn({
      cmd: ['tar', '-czf', '-', '--exclude=node_modules', '--exclude=.git', '.'],
      cwd: packagePath === '.' ? process.cwd() : packagePath,
      stdout: 'pipe',
    });

    const chunks: Uint8Array[] = [];
    const reader = proc.stdout.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Concatenate chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Read README file
   */
  private async readReadme(packagePath: string): Promise<string> {
    const readmePath = packagePath === '.' 
      ? './README.md' 
      : `${packagePath}/README.md`;
    
    try {
      return await Bun.file(readmePath).text();
    } catch {
      return '';
    }
  }

  /**
   * Calculate SHA-1 checksum
   */
  private async calculateShasum(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calculate SHA-512 integrity hash
   */
  private async calculateIntegrity(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    return `sha512-${hashBase64}`;
  }

  /**
   * Get auth header from options
   */
  private getAuthHeader(options: any): string {
    if (options.token) {
      return `Bearer ${options.token}`;
    }
    if (options.username && options.password) {
      return `Basic ${btoa(`${options.username}:${options.password}`)}`;
    }
    return '';
  }

  /**
   * Parse command line options
   */
  private parseOptions(args: string[]): any {
    const options: any = { _: [] };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
        options[key] = value;
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        const value = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : 'true';
        options[key] = value;
      } else {
        options._.push(arg);
      }
    }
    
    return options;
  }
}

// Run CLI
const cli = new RegistryCLI();
await cli.run(process.argv.slice(2));
