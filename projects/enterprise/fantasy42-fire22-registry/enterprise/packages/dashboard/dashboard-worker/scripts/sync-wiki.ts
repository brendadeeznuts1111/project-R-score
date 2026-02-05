#!/usr/bin/env bun

/**
 * 🔄 Wiki Synchronization Script
 * Syncs GitHub wiki repository with local wiki directory
 */

import { $ } from 'bun';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SyncOptions {
  source?: string;
  target?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

class WikiSynchronizer {
  private source: string;
  private target: string;
  private options: SyncOptions;

  constructor(options: SyncOptions = {}) {
    this.source = options.source || 'wiki-repo';
    this.target = options.target || 'wiki';
    this.options = options;
  }

  async sync(): Promise<void> {
    console.log('🔄 Wiki Synchronization');
    console.log('!==!==!==!===');
    console.log(`📂 Source: ${this.source}`);
    console.log(`📂 Target: ${this.target}`);

    if (this.options.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified');
    }

    try {
      // Ensure target directory exists
      if (!existsSync(this.target)) {
        console.log(`📁 Creating target directory: ${this.target}`);
        if (!this.options.dryRun) {
          mkdirSync(this.target, { recursive: true });
        }
      }

      // Sync wiki files
      await this.syncWikiFiles();

      // Generate department wikis
      await this.generateDepartmentWikis();

      // Update wiki index
      await this.updateWikiIndex();

      console.log('\n✅ Wiki synchronization completed successfully!');
    } catch (error) {
      console.error('❌ Wiki sync failed:', error);
      process.exit(1);
    }
  }

  private async syncWikiFiles(): Promise<void> {
    console.log('\n📄 Syncing wiki files...');

    if (!existsSync(this.source)) {
      console.log('⚠️ Source directory not found, skipping file sync');
      return;
    }

    const files = readdirSync(this.source);
    let syncedCount = 0;

    for (const file of files) {
      if (file.endsWith('.md')) {
        const sourcePath = join(this.source, file);
        const targetPath = join(this.target, file);

        if (this.options.verbose) {
          console.log(`  📝 ${file}`);
        }

        if (!this.options.dryRun) {
          const content = readFileSync(sourcePath, 'utf-8');

          // Process content (add metadata, fix links, etc.)
          const processedContent = this.processWikiContent(content, file);

          writeFileSync(targetPath, processedContent);
        }

        syncedCount++;
      }
    }

    console.log(`✅ Synced ${syncedCount} wiki files`);
  }

  private processWikiContent(content: string, filename: string): string {
    // Add metadata header if not present
    if (!content.startsWith('---')) {
      const metadata = `---
title: ${filename.replace('.md', '').replace(/-/g, ' ')}
last_updated: ${new Date().toISOString()}
source: github-wiki
---

`;
      content = metadata + content;
    }

    // Fix internal wiki links
    content = content.replace(/\[\[([^\]]+)\]\]/g, '[$1]($1.md)');

    // Fix GitHub wiki specific links
    content = content.replace(/\/wiki\//g, '/wiki/');

    return content;
  }

  private async generateDepartmentWikis(): Promise<void> {
    console.log('\n🏢 Generating department wiki pages...');

    const departments = [
      { id: 'finance', name: 'Finance Department' },
      { id: 'support', name: 'Customer Support' },
      { id: 'compliance', name: 'Compliance & Legal' },
      { id: 'operations', name: 'Operations' },
      { id: 'technology', name: 'Technology' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'management', name: 'Management' },
      { id: 'hr', name: 'Human Resources' },
      { id: 'qa', name: 'Quality Assurance' },
      { id: 'contributors', name: 'Team Contributors' },
    ];

    const deptDir = join(this.target, 'departments');

    if (!existsSync(deptDir)) {
      if (!this.options.dryRun) {
        mkdirSync(deptDir, { recursive: true });
      }
    }

    for (const dept of departments) {
      const wikiPath = join(deptDir, `${dept.id}.md`);

      if (!existsSync(wikiPath)) {
        const content = this.generateDepartmentWikiContent(dept);

        if (this.options.verbose) {
          console.log(`  📝 Creating: departments/${dept.id}.md`);
        }

        if (!this.options.dryRun) {
          writeFileSync(wikiPath, content);
        }
      }
    }

    console.log(`✅ Generated ${departments.length} department wiki pages`);
  }

  private generateDepartmentWikiContent(dept: { id: string; name: string }): string {
    return `---
title: ${dept.name}
department: ${dept.id}
last_updated: ${new Date().toISOString()}
---

# ${dept.name}

## Overview

Welcome to the ${dept.name} wiki page. This department is responsible for critical Fire22 operations.

## Quick Links

- [Department Dashboard](/departments/${dept.id}.html)
- [Team Directory](/team#${dept.id})
- [API Documentation](/api/departments/${dept.id})
- [RSS Feed](/feeds/${dept.id}-rss.xml)

## Contact Information

- **Email**: ${dept.id}@fire22.ag
- **Domain**: ${dept.id}.fire22.ag
- **Support**: support.${dept.id}@fire22.ag

## Responsibilities

1. Manage ${dept.id} operations
2. Coordinate with other departments
3. Ensure compliance and quality
4. Support Fire22 platform growth

## Team Structure

### Leadership
- Department Head
- Assistant Manager
- Team Leads

### Teams
- Operations Team
- Support Team
- Technical Team

## Resources

### Documentation
- [Process Guidelines](./processes/${dept.id}-processes.md)
- [Best Practices](./best-practices/${dept.id}.md)
- [Training Materials](./training/${dept.id}-training.md)

### Tools
- Department Dashboard
- Communication Platform
- Task Management System
- Reporting Tools

## Recent Updates

Check the [changelog](./changelog/${dept.id}-changelog.md) for recent updates.

---

*Last updated: ${new Date().toISOString()}*
*Generated by Fire22 Wiki System*`;
  }

  private async updateWikiIndex(): Promise<void> {
    console.log('\n📚 Updating wiki index...');

    const indexPath = join(this.target, 'README.md');
    const content = `# Fire22 Wiki

Welcome to the Fire22 Dashboard Wiki!

## 📚 Table of Contents

### Getting Started
- [Home](Home.md)
- [Getting Started](Getting-Started.md)
- [Installation](Installation.md)
- [Configuration](Configuration.md)

### Departments
- [Finance](departments/finance.md)
- [Customer Support](departments/support.md)
- [Compliance & Legal](departments/compliance.md)
- [Operations](departments/operations.md)
- [Technology](departments/technology.md)
- [Marketing](departments/marketing.md)
- [Management](departments/management.md)
- [Human Resources](departments/hr.md)
- [Quality Assurance](departments/qa.md)
- [Team Contributors](departments/contributors.md)

### API Documentation
- [REST API](api/rest-api.md)
- [WebSocket API](api/websocket-api.md)
- [Authentication](api/authentication.md)
- [Rate Limiting](api/rate-limiting.md)

### Development
- [Development Setup](development/setup.md)
- [Testing](development/testing.md)
- [Deployment](development/deployment.md)
- [Contributing](development/contributing.md)

### Architecture
- [System Overview](architecture/overview.md)
- [Database Schema](architecture/database.md)
- [Security Model](architecture/security.md)
- [Performance](architecture/performance.md)

### Operations
- [Monitoring](operations/monitoring.md)
- [Troubleshooting](operations/troubleshooting.md)
- [Maintenance](operations/maintenance.md)
- [Disaster Recovery](operations/disaster-recovery.md)

## 🔄 Synchronization

This wiki is automatically synchronized with:
- GitHub Wiki repository
- Cloudflare Pages deployment
- Department documentation

## 📅 Last Updated

${new Date().toISOString()}

## 📞 Support

For questions or issues, contact:
- Technical Support: tech@fire22.ag
- Documentation Team: docs@fire22.ag
- General Inquiries: info@fire22.ag

---

*Generated by Fire22 Wiki Synchronization System*`;

    if (this.options.verbose) {
      console.log('  📝 Updating: README.md');
    }

    if (!this.options.dryRun) {
      writeFileSync(indexPath, content);
    }

    console.log('✅ Wiki index updated');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SyncOptions = {};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--source':
      options.source = args[++i];
      break;
    case '--target':
      options.target = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
  }
}

// Run synchronization
const synchronizer = new WikiSynchronizer(options);
synchronizer.sync().catch(console.error);
