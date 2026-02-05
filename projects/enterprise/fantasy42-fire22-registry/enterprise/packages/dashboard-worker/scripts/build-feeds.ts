#!/usr/bin/env bun

/**
 * 📡 Fire22 RSS Feed Build System
 *
 * Builds and optimizes RSS/Atom feeds for department error codes
 * Integrates with existing error code system and department structure
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface FeedOptions {
  environment?: 'development' | 'staging' | 'production';
  department?: string;
  validate?: boolean;
  minify?: boolean;
  dryRun?: boolean;
}

interface ErrorCode {
  code: string;
  name: string;
  message: string;
  severity: string;
  category: string;
  httpStatusCode: number;
  description: string;
  department?: string;
  escalationRequired?: boolean;
}

class Fire22FeedBuildSystem {
  private readonly srcDir = join(process.cwd(), 'src');
  private readonly distDir = join(process.cwd(), 'dist', 'pages', 'feeds');
  private readonly errorCodesPath = join(process.cwd(), 'docs', 'error-codes.json');

  /**
   * 📡 Build all RSS feeds
   */
  async buildFeeds(options: FeedOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    console.log('📡 Fire22 RSS Feed Build System');
    console.log('!==!==!==!==!==!==');

    const env = options.environment || 'development';
    console.log(`\n🎯 Environment: ${env}`);
    console.log(`🏢 Department: ${options.department || 'ALL'}`);

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be written');
    }

    try {
      // Setup feed environment
      await this.setupFeedEnvironment(options);

      // Load error codes
      const errorCodes = await this.loadErrorCodes();

      // Build RSS feed
      await this.buildRSSFeed(errorCodes, options);

      // Build Atom feed
      await this.buildAtomFeed(errorCodes, options);

      // Build feed index
      await this.buildFeedIndex(options);

      // Validate feeds if requested
      if (options.validate) {
        await this.validateFeeds(options);
      }

      const buildTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      console.log(`\n✅ Feed build completed in ${buildTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Feed build failed:', error);
      process.exit(1);
    }
  }

  /**
   * 📁 Setup feed build environment
   */
  private async setupFeedEnvironment(options: FeedOptions): Promise<void> {
    console.log('\n📁 Setting up feed environment...');

    if (!options.dryRun) {
      if (!existsSync(this.distDir)) {
        mkdirSync(this.distDir, { recursive: true });
      }
    }

    console.log('  ✅ Feed directory ready');
  }

  /**
   * 📋 Load error codes from JSON
   */
  private async loadErrorCodes(): Promise<ErrorCode[]> {
    console.log('\n📋 Loading error codes...');

    if (!existsSync(this.errorCodesPath)) {
      throw new Error(`Error codes file not found: ${this.errorCodesPath}`);
    }

    const errorCodesData = JSON.parse(readFileSync(this.errorCodesPath, 'utf-8'));
    const errorCodes: ErrorCode[] = [];

    // Extract error codes from the JSON structure
    if (errorCodesData.errorCodes) {
      for (const [code, data] of Object.entries(errorCodesData.errorCodes)) {
        errorCodes.push({
          code,
          ...(data as any),
          department: this.determineDepartment(code, data as any),
        });
      }
    }

    console.log(`  ✅ Loaded ${errorCodes.length} error codes`);
    return errorCodes;
  }

  /**
   * 🏢 Determine department from error code
   */
  private determineDepartment(code: string, errorData: any): string {
    // Map error categories to departments
    const categoryToDepartment: Record<string, string> = {
      SYSTEM: 'Technology',
      DATABASE: 'Technology',
      API: 'Technology',
      NETWORK: 'Technology',
      FIRE22: 'Operations',
      TELEGRAM: 'Customer Support',
      SECURITY: 'Security',
      COMPLIANCE: 'Compliance',
    };

    return categoryToDepartment[errorData.category] || 'Technology';
  }

  /**
   * 📡 Build RSS 2.0 feed
   */
  private async buildRSSFeed(errorCodes: ErrorCode[], options: FeedOptions): Promise<void> {
    console.log('\n📡 Building RSS 2.0 feed...');

    const baseUrl = this.getBaseUrl(options.environment);
    const buildDate = new Date().toUTCString();

    let rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Fire22 Dashboard - Error Code Registry</title>
  <description>Real-time updates for Fire22 Dashboard error codes, system alerts, and troubleshooting information</description>
  <link>${baseUrl}/feeds/error-codes-rss.xml</link>
  <atom:link href="${baseUrl}/feeds/error-codes-rss.xml" rel="self" type="application/rss+xml"/>
  <language>en-us</language>
  <lastBuildDate>${buildDate}</lastBuildDate>
  <pubDate>${buildDate}</pubDate>
  <generator>Fire22 Dashboard Error Code System v1.0.0</generator>
  <managingEditor>tech-team@fire22.ag (Fire22 Technology Department)</managingEditor>
  <webMaster>ops-manager@fire22.ag (Fire22 Operations Department)</webMaster>
  <category>Technology</category>
  <category>System Monitoring</category>
  <category>Error Tracking</category>
  <ttl>60</ttl>
  
  <image>
    <url>${baseUrl}/assets/fire22-logo.png</url>
    <title>Fire22 Dashboard</title>
    <link>${baseUrl}/</link>
    <width>144</width>
    <height>144</height>
    <description>Fire22 Dashboard Error Code Registry</description>
  </image>

`;

    // Filter error codes by department if specified
    let filteredCodes = errorCodes;
    if (options.department) {
      filteredCodes = errorCodes.filter(
        code => code.department?.toLowerCase() === options.department?.toLowerCase()
      );
    }

    // Add error code items
    for (const errorCode of filteredCodes) {
      const severity =
        errorCode.severity === 'CRITICAL'
          ? '🔴 CRITICAL'
          : errorCode.severity === 'ERROR'
            ? '🟡 ERROR'
            : '⚠️ WARNING';

      rssContent += `  <item>
    <title>${severity}: ${errorCode.code} - ${errorCode.name}</title>
    <description><![CDATA[
      <h3>${errorCode.message}</h3>
      <p><strong>Department:</strong> ${errorCode.department} Department</p>
      <p><strong>Severity:</strong> ${errorCode.severity}</p>
      <p><strong>HTTP Status:</strong> ${errorCode.httpStatusCode}</p>
      <p><strong>Description:</strong> ${errorCode.description}</p>
      
      ${errorCode.escalationRequired ? '<p><strong>🚨 Escalation Required</strong></p>' : ''}
      
      <p><strong>📞 Contact:</strong> ${this.getDepartmentContact(errorCode.department || 'Technology')}</p>
    ]]></description>
    <link>${baseUrl}/docs/error-codes.json#${errorCode.code}</link>
    <guid isPermaLink="true">${baseUrl}/docs/error-codes.json#${errorCode.code}</guid>
    <pubDate>${buildDate}</pubDate>
    <category>${errorCode.category}</category>
    <category>${errorCode.severity}</category>
    <category>${errorCode.department}</category>
    <dc:creator>Fire22 ${errorCode.department} Department</dc:creator>
  </item>

`;
    }

    rssContent += `</channel>
</rss>`;

    if (options.minify) {
      rssContent = rssContent.replace(/\n\s*/g, '').replace(/>\s+</g, '><');
    }

    if (!options.dryRun) {
      writeFileSync(join(this.distDir, 'error-codes-rss.xml'), rssContent);
    }

    console.log(`  ✅ RSS feed generated (${filteredCodes.length} items)`);
  }

  /**
   * ⚛️ Build Atom 1.0 feed
   */
  private async buildAtomFeed(errorCodes: ErrorCode[], options: FeedOptions): Promise<void> {
    console.log('\n⚛️ Building Atom 1.0 feed...');

    const baseUrl = this.getBaseUrl(options.environment);
    const buildDate = new Date().toISOString();

    let atomContent = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en-us">
  <title>Fire22 Dashboard - Error Code Registry</title>
  <subtitle>Real-time updates for Fire22 Dashboard error codes, system alerts, and troubleshooting information</subtitle>
  <link href="${baseUrl}/feeds/error-codes-atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${baseUrl}/" rel="alternate" type="text/html"/>
  <id>${baseUrl}/feeds/error-codes</id>
  <updated>${buildDate}</updated>
  <generator uri="https://fire22.ag" version="1.0.0">Fire22 Dashboard Error Code System</generator>
  <rights>© 2025 Fire22 Dashboard. All rights reserved.</rights>
  <author>
    <name>Fire22 Technology Department</name>
    <email>tech-team@fire22.ag</email>
  </author>
  <category term="Technology"/>
  <category term="System Monitoring"/>
  <category term="Error Tracking"/>
  <icon>${baseUrl}/assets/fire22-logo.png</icon>
  <logo>${baseUrl}/assets/fire22-logo.png</logo>

`;

    // Filter error codes by department if specified
    let filteredCodes = errorCodes;
    if (options.department) {
      filteredCodes = errorCodes.filter(
        code => code.department?.toLowerCase() === options.department?.toLowerCase()
      );
    }

    // Add error code entries
    for (const errorCode of filteredCodes) {
      const severity =
        errorCode.severity === 'CRITICAL'
          ? '🔴 CRITICAL'
          : errorCode.severity === 'ERROR'
            ? '🟡 ERROR'
            : '⚠️ WARNING';

      atomContent += `  <entry>
    <title>${severity}: ${errorCode.code} - ${errorCode.name}</title>
    <link href="${baseUrl}/docs/error-codes.json#${errorCode.code}" rel="alternate" type="text/html"/>
    <id>${baseUrl}/error-codes/${errorCode.code}</id>
    <published>${buildDate}</published>
    <updated>${buildDate}</updated>
    <summary type="text">${errorCode.message} - ${errorCode.description}</summary>
    <content type="html"><![CDATA[
      <h3>${errorCode.message}</h3>
      <p><strong>Department:</strong> ${errorCode.department} Department</p>
      <p><strong>Severity:</strong> ${errorCode.severity}</p>
      <p><strong>HTTP Status:</strong> ${errorCode.httpStatusCode}</p>
      <p><strong>Description:</strong> ${errorCode.description}</p>
      
      ${errorCode.escalationRequired ? '<p><strong>🚨 Escalation Required</strong></p>' : ''}
      
      <p><strong>📞 Contact:</strong> ${this.getDepartmentContact(errorCode.department || 'Technology')}</p>
    ]]></content>
    <author>
      <name>Fire22 ${errorCode.department} Department</name>
      <email>${this.getDepartmentContact(errorCode.department || 'Technology')}</email>
    </author>
    <category term="${errorCode.category}"/>
    <category term="${errorCode.severity}"/>
    <category term="${errorCode.department}"/>
  </entry>

`;
    }

    atomContent += `</feed>`;

    if (options.minify) {
      atomContent = atomContent.replace(/\n\s*/g, '').replace(/>\s+</g, '><');
    }

    if (!options.dryRun) {
      writeFileSync(join(this.distDir, 'error-codes-atom.xml'), atomContent);
    }

    console.log(`  ✅ Atom feed generated (${filteredCodes.length} entries)`);
  }

  /**
   * 📋 Build feed index page
   */
  private async buildFeedIndex(options: FeedOptions): Promise<void> {
    console.log('\n📋 Building feed index...');

    // Copy the existing feed index from src/feeds/index.html
    const srcIndexPath = join(this.srcDir, 'feeds', 'index.html');
    const destIndexPath = join(this.distDir, 'index.html');

    if (existsSync(srcIndexPath) && !options.dryRun) {
      let indexContent = readFileSync(srcIndexPath, 'utf-8');

      // Update URLs for production
      if (options.environment === 'production') {
        const baseUrl = this.getBaseUrl(options.environment);
        indexContent = indexContent.replace(
          /https:\/\/brendadeeznuts1111\.github\.io\/fire22-dashboard-worker/g,
          baseUrl
        );
      }

      writeFileSync(destIndexPath, indexContent);
    }

    console.log('  ✅ Feed index page generated');
  }

  /**
   * ✅ Validate generated feeds
   */
  private async validateFeeds(options: FeedOptions): Promise<void> {
    console.log('\n✅ Validating feeds...');

    const feedFiles = [
      { file: 'error-codes-rss.xml', type: 'RSS 2.0' },
      { file: 'error-codes-atom.xml', type: 'Atom 1.0' },
      { file: 'index.html', type: 'HTML Index' },
    ];

    for (const feed of feedFiles) {
      const feedPath = join(this.distDir, feed.file);

      if (existsSync(feedPath)) {
        const content = readFileSync(feedPath, 'utf-8');

        // Basic validation
        if (feed.type === 'RSS 2.0') {
          if (!content.includes('<rss version="2.0">') || !content.includes('</rss>')) {
            throw new Error(`Invalid RSS feed: ${feed.file}`);
          }
        } else if (feed.type === 'Atom 1.0') {
          if (
            !content.includes('<feed xmlns="http://www.w3.org/2005/Atom">') ||
            !content.includes('</feed>')
          ) {
            throw new Error(`Invalid Atom feed: ${feed.file}`);
          }
        }

        console.log(`  ✅ ${feed.file} (${feed.type}) - Valid`);
      } else {
        console.log(`  ❌ ${feed.file} - Missing`);
      }
    }
  }

  /**
   * 🔗 Get base URL for environment
   */
  private getBaseUrl(environment?: string): string {
    switch (environment) {
      case 'production':
        return 'https://dashboard.fire22.ag';
      case 'staging':
        return 'https://staging.fire22-dashboard.pages.dev';
      default:
        return 'https://fire22-dashboard.pages.dev';
    }
  }

  /**
   * 📧 Get department contact email
   */
  private getDepartmentContact(department: string): string {
    const contacts: Record<string, string> = {
      Technology: 'tech-team@fire22.ag',
      Operations: 'ops-manager@fire22.ag',
      'Customer Support': 'support@fire22.ag',
      Security: 'security@fire22.ag',
      Compliance: 'compliance@fire22.ag',
      Finance: 'finance@fire22.ag',
      Marketing: 'marketing@fire22.ag',
      Management: 'exec@fire22.ag',
    };

    return contacts[department] || 'tech-team@fire22.ag';
  }
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: FeedOptions = {
    environment: 'development',
    validate: false,
    minify: false,
    dryRun: false,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--env':
      case '--environment':
        options.environment = args[++i] as any;
        break;
      case '--dept':
      case '--department':
        options.department = args[++i];
        break;
      case '--validate':
        options.validate = true;
        break;
      case '--minify':
        options.minify = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Fire22 RSS Feed Build System

Usage:
  bun run scripts/build-feeds.ts [options]

Options:
  --env, --environment    Build environment (development|staging|production)
  --dept, --department    Filter feeds by department
  --validate             Validate generated feeds
  --minify               Minify feed XML content
  --dry-run              Preview build without writing files
  --help                 Show this help

Examples:
  bun run scripts/build-feeds.ts
  bun run scripts/build-feeds.ts --env production --minify --validate
  bun run scripts/build-feeds.ts --dept technology --dry-run
  bun run feeds:build --validate
`);
        process.exit(0);
    }
  }

  const feedBuilder = new Fire22FeedBuildSystem();
  await feedBuilder.buildFeeds(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22FeedBuildSystem };
