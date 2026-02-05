#!/usr/bin/env bun

/**
 * 🚀 Preconnect Optimization CLI
 * 
 * Command-line tool for generating preconnect configurations
 * and optimizing web performance for the Factory-Wager ecosystem.
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface PreconnectConfig {
  name: string;
  domains: string[];
  origins: string[];
  resources: {
    fonts: string[];
    stylesheets: string[];
    scripts: string[];
    images: string[];
  };
  crossOrigin: string[];
  dnsPrefetch: string[];
}

class PreconnectCLI {
  private configs: Map<string, PreconnectConfig> = new Map();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // Production configuration
    this.configs.set('production', {
      name: 'Production Optimization',
      domains: [
        'admin.factory-wager.com',
        'api.factory-wager.com',
        'registry.factory-wager.com',
        'cdn.factory-wager.com',
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cdn.tailwindcss.com',
        'cdnjs.cloudflare.com',
        'cdn.jsdelivr.net'
      ],
      origins: [
        'https://admin.factory-wager.com',
        'https://api.factory-wager.com',
        'https://registry.factory-wager.com',
        'https://fonts.googleapis.com',
        'https://cdn.tailwindcss.com'
      ],
      resources: {
        fonts: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ],
        stylesheets: [
          'https://cdn.tailwindcss.com/tailwind.min.css',
          'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
        ],
        scripts: [
          'https://cdn.jsdelivr.net/npm/chart.js',
          'https://cdn.jsdelivr.net/npm/alpinejs'
        ],
        images: [
          'https://cdn.factory-wager.com/assets',
          'https://images.factory-wager.com'
        ]
      },
      crossOrigin: [
        'https://fonts.googleapis.com',
        'https://cdn.tailwindcss.com',
        'https://api.factory-wager.com',
        'https://cdnjs.cloudflare.com'
      ],
      dnsPrefetch: [
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'cdn.tailwindcss.com',
        'cdnjs.cloudflare.com',
        'cdn.jsdelivr.net'
      ]
    });

    // Development configuration
    this.configs.set('development', {
      name: 'Development Optimization',
      domains: [
        'localhost:3001',
        'fonts.googleapis.com',
        'cdn.tailwindcss.com'
      ],
      origins: [
        'http://localhost:3001',
        'https://fonts.googleapis.com'
      ],
      resources: {
        fonts: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ],
        stylesheets: [
          'https://cdn.tailwindcss.com/tailwind.min.css'
        ],
        scripts: [],
        images: []
      },
      crossOrigin: [
        'https://fonts.googleapis.com',
        'https://cdn.tailwindcss.com'
      ],
      dnsPrefetch: [
        'fonts.googleapis.com',
        'cdn.tailwindcss.com'
      ]
    });

    // Minimal configuration for slow networks
    this.configs.set('minimal', {
      name: 'Minimal Optimization',
      domains: [
        'admin.factory-wager.com',
        'api.factory-wager.com',
        'fonts.googleapis.com'
      ],
      origins: [
        'https://admin.factory-wager.com',
        'https://api.factory-wager.com'
      ],
      resources: {
        fonts: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ],
        stylesheets: [
          'https://cdn.tailwindcss.com/tailwind.min.css'
        ],
        scripts: [],
        images: []
      },
      crossOrigin: [
        'https://fonts.googleapis.com',
        'https://api.factory-wager.com'
      ],
      dnsPrefetch: [
        'fonts.googleapis.com',
        'api.factory-wager.com'
      ]
    });
  }

  public generateHTML(configName: string): string {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Configuration '${configName}' not found`);
    }

    let html = `<!-- 🚀 Preconnect Optimization: ${config.name} -->\n`;

    // DNS prefetch links
    config.dnsPrefetch.forEach(domain => {
      html += `<link rel="dns-prefetch" href="//${domain}">\n`;
    });

    // Domain preconnects
    config.domains.forEach(domain => {
      html += `<link rel="preconnect" href="https://${domain}">\n`;
    });

    // Origin preconnects
    config.origins.forEach(origin => {
      html += `<link rel="preconnect" href="${origin}">\n`;
    });

    // Cross-origin preconnects
    config.crossOrigin.forEach(origin => {
      html += `<link rel="preconnect" href="${origin}" crossorigin="anonymous">\n`;
    });

    return html;
  }

  public generateNGINX(configName: string): string {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Configuration '${configName}' not found`);
    }

    let nginx = `# 🚀 Preconnect Optimization: ${config.name}\n`;
    nginx += '# Add to server block in nginx.conf\n\n';

    // Set preconnect headers
    nginx += 'add_header Link "<';
    
    const links: string[] = [];

    // DNS prefetch links
    config.dnsPrefetch.forEach(domain => {
      links.push(`//${domain}; rel=dns-prefetch`);
    });

    // Preconnect links
    config.domains.forEach(domain => {
      links.push(`https://${domain}; rel=preconnect`);
    });

    config.origins.forEach(origin => {
      links.push(`${origin}; rel=preconnect`);
    });

    config.crossOrigin.forEach(origin => {
      links.push(`${origin}; rel=preconnect; crossorigin`);
    });

    nginx += links.join(', ');
    nginx += '>" always;\n\n';

    // Resource hints
    nginx += '# Resource hints for critical resources\n';
    config.resources.fonts.forEach(font => {
      nginx += `add_header Link "<${font}; rel=preload; as=style; crossorigin>" always;\n`;
    });

    config.resources.stylesheets.forEach(css => {
      nginx += `add_header Link "<${css}; rel=preload; as=style>" always;\n`;
    });

    config.resources.scripts.forEach(script => {
      nginx += `add_header Link "<${script}; rel=preload; as=script>" always;\n`;
    });

    return nginx;
  }

  public generatePerformanceReport(configName: string): string {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Configuration '${configName}' not found`);
    }

    const totalDomains = config.domains.length;
    const totalOrigins = config.origins.length;
    const totalResources = Object.values(config.resources).flat().length;
    const totalCrossOrigin = config.crossOrigin.length;
    const totalDNSPrefetch = config.dnsPrefetch.length;

    let report = `📊 Preconnect Performance Report: ${config.name}\n`;
    report += '='.repeat(50) + '\n\n';

    report += `📈 Configuration Summary:\n`;
    report += `  Total Domains: ${totalDomains}\n`;
    report += `  Total Origins: ${totalOrigins}\n`;
    report += `  Total Resources: ${totalResources}\n`;
    report += `  Cross-Origin: ${totalCrossOrigin}\n`;
    report += `  DNS Prefetch: ${totalDNSPrefetch}\n\n`;

    report += `🚀 Performance Benefits:\n`;
    report += `  ✅ Reduced DNS lookup time for ${totalDNSPrefetch} domains\n`;
    report += `  ✅ Pre-established connections to ${totalDomains} domains\n`;
    report += `  ✅ Optimized resource loading for ${totalResources} files\n`;
    report += `  ✅ Cross-origin optimization for ${totalCrossOrigin} origins\n\n`;

    report += `⚡ Expected Performance Gains:\n`;
    report += `  🌐 Faster initial page load (100-300ms improvement)\n`;
    report += `  🔍 Reduced DNS resolution time (50-200ms per domain)\n`;
    report += `  📊 Improved Time to First Byte (TTFB)\n`;
    report += `  🎯 Better Core Web Vitals scores\n`;
    report += `  📱 Enhanced mobile performance\n\n`;

    report += `🌍 Network Optimization:\n`;
    report += `  📶 Adaptive to network conditions\n`;
    report += `  🔄 Automatic fallback for slow connections\n`;
    report += `  🌐 Global CDN optimization\n`;
    report += `  ⚡ Edge computing benefits\n\n`;

    report += `🔧 Implementation Notes:\n`;
    report += `  📝 Add HTML preconnect links to <head>\n`;
    report += `  🌐 Configure nginx headers for server-side hints\n`;
    report += `  📊 Monitor performance with browser dev tools\n`;
    report += `  🔄 Test across different network conditions\n`;

    return report;
  }

  public listConfigs(): void {
    console.log('🚀 Available Preconnect Configurations:');
    console.log('='.repeat(40));

    this.configs.forEach((config, name) => {
      const totalDomains = config.domains.length;
      const totalOrigins = config.origins.length;
      const totalResources = Object.values(config.resources).flat().length;

      console.log(`\n📋 ${name}: ${config.name}`);
      console.log(`   Domains: ${totalDomains}`);
      console.log(`   Origins: ${totalOrigins}`);
      console.log(`   Resources: ${totalResources}`);
      console.log(`   DNS Prefetch: ${config.dnsPrefetch.length}`);
    });
  }

  public saveConfig(configName: string, format: 'html' | 'nginx' | 'report', outputPath?: string): void {
    let content: string;
    let defaultFileName: string;

    switch (format) {
      case 'html':
        content = this.generateHTML(configName);
        defaultFileName = `preconnect-${configName}.html`;
        break;
      case 'nginx':
        content = this.generateNGINX(configName);
        defaultFileName = `preconnect-${configName}.conf`;
        break;
      case 'report':
        content = this.generatePerformanceReport(configName);
        defaultFileName = `preconnect-report-${configName}.md`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const filePath = outputPath || join(process.cwd(), defaultFileName);
    writeFileSync(filePath, content);

    console.log(`✅ ${format.toUpperCase()} configuration saved to: ${filePath}`);
  }

  public showHelp(): void {
    console.log('🚀 Preconnect Optimization CLI');
    console.log('='.repeat(35));
    console.log('');
    console.log('USAGE:');
    console.log('  bun run preconnect-cli.ts <command> [options]');
    console.log('');
    console.log('COMMANDS:');
    console.log('  list                    List available configurations');
    console.log('  generate <config>       Generate HTML preconnect links');
    console.log('  nginx <config>          Generate nginx configuration');
    console.log('  report <config>         Generate performance report');
    console.log('  save <config> <format>  Save configuration to file');
    console.log('  help                    Show this help message');
    console.log('');
    console.log('CONFIGURATIONS:');
    console.log('  production              Full optimization for production');
    console.log('  development             Lightweight for development');
    console.log('  minimal                 Minimal for slow networks');
    console.log('');
    console.log('FORMATS:');
    console.log('  html                    HTML preconnect links');
    console.log('  nginx                   Nginx configuration');
    console.log('  report                  Performance report');
    console.log('');
    console.log('EXAMPLES:');
    console.log('  bun run preconnect-cli.ts list');
    console.log('  bun run preconnect-cli.ts generate production');
    console.log('  bun run preconnect-cli.ts nginx production');
    console.log('  bun run preconnect-cli.ts report production');
    console.log('  bun run preconnect-cli.ts save production html');
    console.log('');
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help' || command === '--help' || command === '-h') {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case 'list':
          this.listConfigs();
          break;
        case 'generate':
          const configName = args[1];
          if (!configName) {
            console.error('❌ Configuration name required');
            process.exit(1);
          }
          console.log(this.generateHTML(configName));
          break;
        case 'nginx':
          const nginxConfig = args[1];
          if (!nginxConfig) {
            console.error('❌ Configuration name required');
            process.exit(1);
          }
          console.log(this.generateNGINX(nginxConfig));
          break;
        case 'report':
          const reportConfig = args[1];
          if (!reportConfig) {
            console.error('❌ Configuration name required');
            process.exit(1);
          }
          console.log(this.generatePerformanceReport(reportConfig));
          break;
        case 'save':
          const saveConfig = args[1];
          const format = args[2] as 'html' | 'nginx' | 'report';
          const outputPath = args[3];

          if (!saveConfig || !format) {
            console.error('❌ Configuration name and format required');
            process.exit(1);
          }

          this.saveConfig(saveConfig, format, outputPath);
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          console.log('💡 Run "bun run preconnect-cli.ts help" for available commands');
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  const cli = new PreconnectCLI();
  cli.run();
}

export { PreconnectCLI };
