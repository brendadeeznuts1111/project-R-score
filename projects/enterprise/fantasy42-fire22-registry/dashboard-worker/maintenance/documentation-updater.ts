#!/usr/bin/env bun

/**
 * Fire22 Dashboard Documentation Updater
 * Automated documentation maintenance, validation, and synchronization
 *
 * @version 1.0.0
 * @author Fire22 Maintenance Team
 * @schedule Weekly on Wednesdays
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface DocumentationFile {
  path: string;
  type: 'api' | 'user-guide' | 'technical' | 'maintenance' | 'project';
  lastModified: Date;
  size: number;
  wordCount: number;
  issues: string[];
}

interface DocumentationReport {
  timestamp: string;
  totalFiles: number;
  totalWords: number;
  issues: string[];
  recommendations: string[];
  files: DocumentationFile[];
}

class DocumentationUpdater {
  private basePath: string;
  private documentationPaths: string[];

  constructor() {
    this.basePath = process.cwd();
    this.documentationPaths = ['docs', 'maintenance', 'projects', 'examples', 'README.md'];
  }

  /**
   * 📚 Run comprehensive documentation maintenance
   */
  async runDocumentationMaintenance(): Promise<DocumentationReport> {
    console.log('📚 Fire22 Documentation Maintenance');
    console.log('!==!==!==!==!==!=====');
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}\n`);

    const files = await this.scanDocumentationFiles();
    const report = await this.generateDocumentationReport(files);

    await this.validateDocumentation(files);
    await this.updateTableOfContents();
    await this.syncVersionNumbers();
    await this.checkLinkValidity(files);
    await this.generateDocumentationIndex();

    await this.saveDocumentationReport(report);

    console.log('\n✅ Documentation maintenance completed!');
    return report;
  }

  /**
   * 🔍 Scan all documentation files
   */
  private async scanDocumentationFiles(): Promise<DocumentationFile[]> {
    console.log('🔍 Scanning documentation files...');

    const files: DocumentationFile[] = [];

    for (const docPath of this.documentationPaths) {
      const fullPath = join(this.basePath, docPath);

      if (existsSync(fullPath)) {
        if (statSync(fullPath).isDirectory()) {
          files.push(...(await this.scanDirectory(fullPath, docPath)));
        } else if (docPath.endsWith('.md')) {
          files.push(await this.analyzeFile(fullPath, this.getDocumentationType(docPath)));
        }
      }
    }

    console.log(`  📄 Found ${files.length} documentation files`);
    return files;
  }

  /**
   * 📁 Scan directory for documentation files
   */
  private async scanDirectory(dirPath: string, relativePath: string): Promise<DocumentationFile[]> {
    const files: DocumentationFile[] = [];

    try {
      const items = readdirSync(dirPath);

      for (const item of items) {
        const itemPath = join(dirPath, item);
        const itemRelativePath = join(relativePath, item);

        if (statSync(itemPath).isDirectory()) {
          files.push(...(await this.scanDirectory(itemPath, itemRelativePath)));
        } else if (extname(item) === '.md') {
          files.push(await this.analyzeFile(itemPath, this.getDocumentationType(itemRelativePath)));
        }
      }
    } catch (error) {
      console.warn(`  ⚠️ Could not scan directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * 📄 Analyze individual documentation file
   */
  private async analyzeFile(
    filePath: string,
    type: DocumentationFile['type']
  ): Promise<DocumentationFile> {
    const stats = statSync(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const issues: string[] = [];

    // Check for common documentation issues
    if (wordCount < 50) {
      issues.push('Very short content (< 50 words)');
    }

    if (!content.includes('#')) {
      issues.push('No headers found');
    }

    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push('Contains TODO/FIXME items');
    }

    if (!content.includes('```') && type === 'api') {
      issues.push('API documentation missing code examples');
    }

    // Check for outdated version references
    const versionMatches = content.match(/\d+\.\d+\.\d+/g);
    if (versionMatches && versionMatches.length > 3) {
      issues.push('Multiple version references - may need updating');
    }

    return {
      path: filePath.replace(this.basePath + '/', ''),
      type,
      lastModified: stats.mtime,
      size: stats.size,
      wordCount,
      issues,
    };
  }

  /**
   * 🏷️ Determine documentation type from path
   */
  private getDocumentationType(path: string): DocumentationFile['type'] {
    if (path.includes('docs/api')) return 'api';
    if (path.includes('docs/user')) return 'user-guide';
    if (path.includes('docs/technical')) return 'technical';
    if (path.includes('maintenance')) return 'maintenance';
    if (path.includes('projects')) return 'project';
    return 'technical';
  }

  /**
   * ✅ Validate documentation content
   */
  private async validateDocumentation(files: DocumentationFile[]): Promise<void> {
    console.log('✅ Validating documentation content...');

    let validationIssues = 0;

    for (const file of files) {
      const content = readFileSync(join(this.basePath, file.path), 'utf-8');

      // Check for broken internal links
      const internalLinks = content.match(/\[.*?\]\((?!http).*?\)/g) || [];
      for (const link of internalLinks) {
        const linkPath = link.match(/\((.*?)\)/)?.[1];
        if (linkPath && !existsSync(join(this.basePath, linkPath))) {
          console.log(`  ⚠️ Broken link in ${file.path}: ${linkPath}`);
          validationIssues++;
        }
      }

      // Check for missing required sections in API docs
      if (file.type === 'api') {
        const requiredSections = ['Overview', 'Authentication', 'Endpoints', 'Examples'];
        for (const section of requiredSections) {
          if (!content.includes(section)) {
            console.log(`  ⚠️ Missing section in ${file.path}: ${section}`);
            validationIssues++;
          }
        }
      }
    }

    console.log(`  📊 Found ${validationIssues} validation issues`);
  }

  /**
   * 📋 Update table of contents
   */
  private async updateTableOfContents(): Promise<void> {
    console.log('📋 Updating table of contents...');

    const tocPath = join(this.basePath, 'docs', 'README.md');

    if (!existsSync(join(this.basePath, 'docs'))) {
      console.log('  ℹ️ No docs directory found, skipping TOC update');
      return;
    }

    const tocContent = this.generateTableOfContents();
    writeFileSync(tocPath, tocContent);

    console.log('  ✅ Table of contents updated');
  }

  /**
   * 📋 Generate table of contents content
   */
  private generateTableOfContents(): string {
    return `# Fire22 Dashboard Documentation

## 📚 Documentation Index

### API Documentation
- [Task Management API](api/TASK-MANAGEMENT-API.md) - Complete API reference for task management
- [Design Team Integration](../src/api/design-team-integration.ts) - Design team coordination API
- [RSS Feeds](../dashboard-worker/src/api/task-events.ts) - Real-time task events and RSS feeds

### User Guides
- [Dashboard Usage](user-guides/dashboard-usage.md) - How to use the Fire22 dashboard
- [Contact Directory](user-guides/contact-directory.md) - Managing department contacts
- [RSS Management](user-guides/rss-management.md) - RSS feed management guide

### Technical Documentation
- [Architecture](technical/architecture.md) - System architecture overview
- [Deployment](technical/deployment.md) - Deployment procedures and requirements
- [Troubleshooting](technical/troubleshooting.md) - Common issues and solutions

### Maintenance Documentation
- [Maintenance Framework](../maintenance/fire22-maintenance-framework.md) - Comprehensive maintenance procedures
- [Daily Tasks](../maintenance/daily-health-check.ts) - Automated daily maintenance
- [Version Management](../maintenance/version-manager.ts) - Version control and releases

### Project Documentation
- [Department Outreach Project](../projects/fire22-department-outreach-project.md) - Main project documentation
- [Phase 1 Scope](../projects/scopes/phase1-contact-infrastructure-scope.md) - Contact infrastructure
- [Phase 2 Scope](../projects/scopes/phase2-content-strategy-scope.md) - Content strategy
- [Phase 3 Scope](../projects/scopes/phase3-rss-implementation-scope.md) - RSS implementation
- [Phase 4 Scope](../projects/scopes/phase4-testing-closure-scope.md) - Testing and closure

## 🔧 Quick Links

- [Getting Started](getting-started.md) - New user onboarding
- [FAQ](faq.md) - Frequently asked questions
- [Support](support.md) - Getting help and support
- [Contributing](contributing.md) - How to contribute to the project

## 📊 Documentation Statistics

- **Last Updated**: ${new Date().toISOString().split('T')[0]}
- **Total Documents**: Auto-generated during maintenance
- **Coverage**: Comprehensive coverage of all system components

---

*This documentation is automatically maintained by the Fire22 Documentation Updater.*
*For issues or suggestions, contact the maintenance team.*`;
  }

  /**
   * 🔄 Sync version numbers across documentation
   */
  private async syncVersionNumbers(): Promise<void> {
    console.log('🔄 Syncing version numbers...');

    // Get current version from package.json
    const packagePath = join(this.basePath, 'package.json');
    if (!existsSync(packagePath)) {
      console.log('  ⚠️ package.json not found, skipping version sync');
      return;
    }

    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const currentVersion = packageJson.version;

    let updatedFiles = 0;

    // Update version in documentation files
    const versionFiles = [
      'docs/api/TASK-MANAGEMENT-API.md',
      'maintenance/fire22-maintenance-framework.md',
    ];

    for (const file of versionFiles) {
      const filePath = join(this.basePath, file);
      if (existsSync(filePath)) {
        let content = readFileSync(filePath, 'utf-8');
        const originalContent = content;

        // Update various version patterns
        content = content.replace(
          /\*\*API Version:\*\* \d+\.\d+\.\d+/g,
          `**API Version:** ${currentVersion}`
        );
        content = content.replace(
          /\*\*Version:\*\* \d+\.\d+\.\d+/g,
          `**Version:** ${currentVersion}`
        );
        content = content.replace(/@version \d+\.\d+\.\d+/g, `@version ${currentVersion}`);

        if (content !== originalContent) {
          writeFileSync(filePath, content);
          updatedFiles++;
        }
      }
    }

    console.log(`  ✅ Updated version in ${updatedFiles} files to ${currentVersion}`);
  }

  /**
   * 🔗 Check link validity
   */
  private async checkLinkValidity(files: DocumentationFile[]): Promise<void> {
    console.log('🔗 Checking link validity...');

    let brokenLinks = 0;

    for (const file of files) {
      const content = readFileSync(join(this.basePath, file.path), 'utf-8');

      // Find all markdown links
      const links = content.match(/\[.*?\]\(.*?\)/g) || [];

      for (const link of links) {
        const url = link.match(/\((.*?)\)/)?.[1];
        if (url && !url.startsWith('http') && !url.startsWith('#')) {
          // Check internal file links
          const linkPath = join(this.basePath, url);
          if (!existsSync(linkPath)) {
            console.log(`  ❌ Broken link in ${file.path}: ${url}`);
            brokenLinks++;
          }
        }
      }
    }

    console.log(`  📊 Found ${brokenLinks} broken internal links`);
  }

  /**
   * 📇 Generate documentation index
   */
  private async generateDocumentationIndex(): Promise<void> {
    console.log('📇 Generating documentation index...');

    const indexPath = join(this.basePath, 'docs', 'index.json');
    const files = await this.scanDocumentationFiles();

    const index = {
      generated: new Date().toISOString(),
      totalFiles: files.length,
      totalWords: files.reduce((sum, file) => sum + file.wordCount, 0),
      categories: {
        api: files.filter(f => f.type === 'api').length,
        userGuide: files.filter(f => f.type === 'user-guide').length,
        technical: files.filter(f => f.type === 'technical').length,
        maintenance: files.filter(f => f.type === 'maintenance').length,
        project: files.filter(f => f.type === 'project').length,
      },
      files: files.map(file => ({
        path: file.path,
        type: file.type,
        lastModified: file.lastModified,
        wordCount: file.wordCount,
        hasIssues: file.issues.length > 0,
      })),
    };

    writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`  ✅ Documentation index generated: ${indexPath}`);
  }

  /**
   * 📊 Generate documentation report
   */
  private async generateDocumentationReport(
    files: DocumentationFile[]
  ): Promise<DocumentationReport> {
    const allIssues = files.flatMap(file => file.issues.map(issue => `${file.path}: ${issue}`));

    const recommendations = [];

    // Generate recommendations based on analysis
    const oldFiles = files.filter(
      file => Date.now() - file.lastModified.getTime() > 30 * 24 * 60 * 60 * 1000 // 30 days
    );

    if (oldFiles.length > 0) {
      recommendations.push(`${oldFiles.length} files haven't been updated in 30+ days`);
    }

    const shortFiles = files.filter(file => file.wordCount < 100);
    if (shortFiles.length > 0) {
      recommendations.push(`${shortFiles.length} files have very short content`);
    }

    return {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      totalWords: files.reduce((sum, file) => sum + file.wordCount, 0),
      issues: allIssues,
      recommendations,
      files,
    };
  }

  /**
   * 💾 Save documentation report
   */
  private async saveDocumentationReport(report: DocumentationReport): Promise<void> {
    const reportsDir = join(this.basePath, 'maintenance', 'reports');
    const reportPath = join(
      reportsDir,
      `documentation-report-${new Date().toISOString().split('T')[0]}.json`
    );

    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Documentation report saved: ${reportPath}`);
    } catch (error) {
      console.error(`❌ Failed to save documentation report: ${error}`);
    }
  }
}

// CLI execution
async function main() {
  try {
    const updater = new DocumentationUpdater();
    const report = await updater.runDocumentationMaintenance();

    console.log('\n📋 Documentation Maintenance Summary:');
    console.log(`  📄 Total Files: ${report.totalFiles}`);
    console.log(`  📝 Total Words: ${report.totalWords.toLocaleString()}`);
    console.log(`  ⚠️ Issues Found: ${report.issues.length}`);
    console.log(`  💡 Recommendations: ${report.recommendations.length}`);

    if (report.issues.length > 0) {
      console.log('\n🔍 Issues Found:');
      report.issues.slice(0, 5).forEach(issue => console.log(`  - ${issue}`));
      if (report.issues.length > 5) {
        console.log(`  ... and ${report.issues.length - 5} more`);
      }
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  } catch (error) {
    console.error('❌ Documentation maintenance failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { DocumentationUpdater };
