#!/usr/bin/env bun

/**
 * 🚀 Fire22 User-Agent Enhanced Build System
 *
 * Leverages Bun v1.2.18+ features:
 * - Programmatic Bun.build() API with compile support
 * - Custom user-agent configuration
 * - Embedded runtime flags (--compile-exec-argv)
 * - Windows metadata embedding
 * - SIMD-accelerated ANSI stripping
 * - Cross-platform executable generation
 * - Native Cookie and CookieMap APIs for session management
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { Cookie, CookieMap } from 'bun';

interface BuildConfig {
  environment: 'development' | 'staging' | 'production' | 'demo';
  userAgent?: string;
  target?: string;
  windowsMetadata?: WindowsMetadata;
  embedFlags?: string[];
  minify?: boolean;
  sourcemap?: boolean | 'external' | 'inline';
  bytecode?: boolean;
  stripAnsi?: boolean;
  cookieConfig?: CookieConfig;
}

interface CookieConfig {
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
  maxAge?: number;
}

interface WindowsMetadata {
  title?: string;
  publisher?: string;
  version?: string;
  description?: string;
  copyright?: string;
  icon?: string;
}

export class UserAgentBuildSystem {
  private readonly srcDir = join(process.cwd(), 'src');
  private readonly distDir = join(process.cwd(), 'dist');
  private readonly packageJson = require(join(process.cwd(), 'package.json'));

  /**
   * Get default cookie configuration based on environment
   */
  private getDefaultCookieConfig(env: BuildConfig['environment']): CookieConfig {
    switch (env) {
      case 'production':
        return {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 86400, // 1 day in seconds
        };
      case 'staging':
        return {
          secure: true,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 3600, // 1 hour in seconds
        };
      case 'development':
      case 'demo':
      default:
        return {
          secure: false,
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 7200, // 2 hours in seconds
        };
    }
  }

  /**
   * Create session cookies for Fire22 API
   */
  private createSessionCookies(config: BuildConfig): CookieMap {
    const cookies = new CookieMap();
    const cookieConfig = config.cookieConfig || this.getDefaultCookieConfig(config.environment);

    // Add Fire22 session cookie
    cookies.set({
      name: 'fire22_session',
      value: `${config.environment}_${Date.now()}`,
      ...cookieConfig,
      httpOnly: true, // Always httpOnly for session
    });

    // Add user agent tracking cookie
    cookies.set({
      name: 'fire22_ua',
      value: config.userAgent || this.getDefaultUserAgent(config.environment),
      ...cookieConfig,
      httpOnly: false, // Allow JS access for debugging
    });

    // Add build info cookie
    cookies.set({
      name: 'fire22_build',
      value: JSON.stringify({
        version: this.packageJson.version,
        env: config.environment,
        time: new Date().toISOString(),
      }),
      ...cookieConfig,
      httpOnly: false,
    });

    return cookies;
  }

  /**
   * Get default user agent based on environment
   */
  private getDefaultUserAgent(env: BuildConfig['environment']): string {
    const version = this.packageJson.version || '3.0.9';
    const baseAgent = `Fire22-Dashboard/${version}`;

    switch (env) {
      case 'development':
        return `${baseAgent} (Development; Bun/${Bun.version})`;
      case 'staging':
        return `${baseAgent} (Staging; Bun/${Bun.version})`;
      case 'production':
        return `${baseAgent} (Production)`;
      case 'demo':
        return `${baseAgent} (Demo; Bun/${Bun.version})`;
      default:
        return baseAgent;
    }
  }

  /**
   * Build executable with custom user agent using Bun.build() API
   */
  async buildWithUserAgent(config: BuildConfig): Promise<void> {
    console.log('🎯 Building Fire22 Dashboard with Custom User-Agent & Cookies');
    console.log('='.repeat(60));

    const userAgent = config.userAgent || this.getDefaultUserAgent(config.environment);
    console.log(`📱 User-Agent: ${userAgent}`);
    console.log(`🌍 Environment: ${config.environment}`);

    // Create and display cookie configuration
    const cookies = this.createSessionCookies(config);
    console.log(`🍪 Cookies configured: ${cookies.size} cookies`);
    for (const [name, value] of cookies) {
      console.log(`   - ${name}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    }

    // Ensure dist directory exists
    if (!existsSync(this.distDir)) {
      mkdirSync(this.distDir, { recursive: true });
    }

    // Prepare embedded runtime flags
    const embedFlags: string[] = [`--user-agent="${userAgent}"`, ...(config.embedFlags || [])];

    // Add environment-specific flags
    switch (config.environment) {
      case 'development':
        embedFlags.push('--smol', '--inspect', '--port=3000');
        break;
      case 'staging':
        embedFlags.push('--port=3001');
        break;
      case 'production':
        embedFlags.push('--optimize', '--port=8080');
        break;
      case 'demo':
        embedFlags.push('--demo-mode', '--port=3002');
        break;
    }

    // Prepare compile configuration
    const compileConfig: any = config.target
      ? {
          target: config.target,
          outfile: join(this.distDir, this.getOutputFileName(config)),
        }
      : true;

    // Add Windows metadata if provided
    if (config.windowsMetadata) {
      compileConfig.windows = {
        title: config.windowsMetadata.title || 'Fire22 Dashboard Worker',
        publisher: config.windowsMetadata.publisher || 'Fire22 Development Team',
        version: config.windowsMetadata.version || this.packageJson.version,
        description: config.windowsMetadata.description || this.packageJson.description,
        copyright: config.windowsMetadata.copyright || '© 2024 Fire22 Development Team',
        ...(config.windowsMetadata.icon && { icon: config.windowsMetadata.icon }),
      };
    }

    try {
      console.log('\n🔨 Building executable...');

      // Use programmatic Bun.build() API
      const result = await Bun.build({
        entrypoints: [join(this.srcDir, 'index.ts')],
        compile: compileConfig,
        // @ts-ignore - New in Bun v1.2.18+
        compileExecArgv: embedFlags.join(' '),
        minify: config.minify || config.environment === 'production',
        sourcemap: config.sourcemap || (config.environment === 'development' ? 'inline' : false),
        // Define compile-time constants
        define: {
          'process.env.ENVIRONMENT': JSON.stringify(config.environment),
          'process.env.USER_AGENT': JSON.stringify(userAgent),
          'process.env.VERSION': JSON.stringify(this.packageJson.version),
          'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
          'process.env.DEBUG_MODE': JSON.stringify(config.environment !== 'production'),
          'process.env.COOKIE_CONFIG': JSON.stringify(
            config.cookieConfig || this.getDefaultCookieConfig(config.environment)
          ),
          'process.env.DEFAULT_COOKIES': JSON.stringify(cookies.toJSON()),
        },
        // Enable bytecode compilation for production
        ...(config.bytecode && { bytecode: true }),
      });

      if (result.success) {
        console.log('✅ Build successful!');

        // Display build artifacts
        for (const output of result.outputs) {
          const size = (output.size / 1024 / 1024).toFixed(2);
          console.log(`   📦 ${output.path} (${size}MB)`);
        }
      } else {
        console.error('❌ Build failed:', result.logs);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Build error:', error);
      process.exit(1);
    }
  }

  /**
   * Get output file name based on configuration
   */
  private getOutputFileName(config: BuildConfig): string {
    const base = 'fire22-dashboard';
    const env = config.environment;

    // Check for Windows target
    if (config.target?.includes('windows')) {
      return `${base}-${env}.exe`;
    }

    // Check for specific platform targets
    if (config.target) {
      const platform = config.target.split('-')[1]; // Extract platform from bun-platform-arch
      return `${base}-${env}-${platform}`;
    }

    // Default naming
    return `${base}-${env}`;
  }

  /**
   * Build for all platforms
   */
  async buildAllPlatforms(config: Omit<BuildConfig, 'target'>): Promise<void> {
    const targets = [
      'bun-linux-x64',
      'bun-linux-x64-musl',
      'bun-linux-arm64',
      'bun-windows-x64',
      'bun-darwin-x64',
      'bun-darwin-arm64',
    ];

    console.log('🌍 Building for all platforms...\n');

    for (const target of targets) {
      console.log(`\n📦 Building for ${target}...`);
      await this.buildWithUserAgent({ ...config, target });
    }

    console.log('\n✅ All platform builds completed!');
  }

  /**
   * Test user agent and cookie configuration
   */
  async testUserAgent(executable?: string): Promise<void> {
    console.log('\n🧪 Testing User-Agent & Cookie Configuration');
    console.log('='.repeat(60));

    // Create test script
    const testScript = `
      import { Cookie, CookieMap } from 'bun';
      
      // Test user-agent
      try {
        const response = await fetch('https://echo.hoppscotch.io/', {
          headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        console.log('User-Agent sent:', data.headers?.['user-agent'] || 'Unknown');
      } catch (e) {
        console.log('User-Agent test skipped (service unavailable)');
      }
      
      // Test ANSI stripping (new Bun feature)
      const colored = "\\u001b[31mRed\\u001b[0m \\u001b[32mGreen\\u001b[0m";
      const stripped = Bun.stripANSI(colored);
      console.log('ANSI Stripping Test:', stripped === 'Red Green' ? '✅ Passed' : '❌ Failed');
      
      // Test Cookie APIs
      console.log('\\n🍪 Testing Cookie APIs:');
      
      // Test CookieMap
      const cookies = new CookieMap({
        session: 'test123',
        theme: 'dark'
      });
      console.log('  CookieMap size:', cookies.size);
      console.log('  Session cookie:', cookies.get('session'));
      
      // Test Cookie class
      const secureCookie = new Cookie('fire22_token', 'abc123', {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 3600
      });
      console.log('  Secure cookie:', secureCookie.toString().substring(0, 50) + '...');
      console.log('  Is expired:', secureCookie.isExpired());
      
      // Test cookie from environment
      if (process.env.DEFAULT_COOKIES) {
        const envCookies = new CookieMap(JSON.parse(process.env.DEFAULT_COOKIES));
        console.log('  Env cookies:', envCookies.size, 'cookies loaded');
      }
      
      // Display runtime flags
      if (process.execArgv?.length > 0) {
        console.log('\\nEmbedded runtime flags:', process.execArgv.join(' '));
      }
    `;

    const testFile = join(this.distDir, 'test-user-agent.ts');
    await Bun.write(testFile, testScript);

    if (executable && existsSync(executable)) {
      console.log(`\nTesting executable: ${executable}`);
      await $`${executable}`;
    } else {
      console.log('\nTesting with current Bun runtime:');
      await $`bun --user-agent="Fire22-Test/1.0" ${testFile}`;
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const builder = new UserAgentBuildSystem();

  const environment = (args[0] as BuildConfig['environment']) || 'development';
  const command = args[1] || 'build';

  const config: BuildConfig = {
    environment,
    minify: args.includes('--minify'),
    sourcemap: args.includes('--sourcemap'),
    bytecode: args.includes('--bytecode'),
    stripAnsi: args.includes('--strip-ansi'),
  };

  // Check for custom user agent
  const userAgentArg = args.find(arg => arg.startsWith('--user-agent='));
  if (userAgentArg) {
    config.userAgent = userAgentArg.split('=')[1];
  }

  // Check for target platform
  const targetArg = args.find(arg => arg.startsWith('--target='));
  if (targetArg) {
    config.target = targetArg.split('=')[1];
  }

  // Cookie configuration flags
  if (args.includes('--secure-cookies')) {
    config.cookieConfig = {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
    };
  }

  const cookieDomainArg = args.find(arg => arg.startsWith('--cookie-domain='));
  if (cookieDomainArg) {
    config.cookieConfig = {
      ...config.cookieConfig,
      domain: cookieDomainArg.split('=')[1],
    };
  }

  // Windows-specific build
  if (args.includes('--windows')) {
    config.target = 'bun-windows-x64';
    config.windowsMetadata = {
      icon: existsSync('./assets/icon.ico') ? './assets/icon.ico' : undefined,
    };
  }

  switch (command) {
    case 'all':
      await builder.buildAllPlatforms(config);
      break;
    case 'test':
      const testExe = args.find(arg => arg.startsWith('--exe='))?.split('=')[1];
      await builder.testUserAgent(testExe);
      break;
    default:
      await builder.buildWithUserAgent(config);
      // Test the built executable
      const outputFile = join(builder.distDir, builder.getOutputFileName(config));
      if (existsSync(outputFile)) {
        await builder.testUserAgent(outputFile);
      }
      break;
  }

  console.log('\n🎉 User-Agent Build System Complete!');
}
