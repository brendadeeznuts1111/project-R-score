#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard Pages Build System
 *
 * Builds static pages optimized for Cloudflare Pages deployment
 * Integrates with existing department structure and RSS feeds
 */

import { $ } from 'bun';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { join, basename, dirname } from 'path';

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
  members: any[];
}

interface BuildOptions {
  environment?: 'development' | 'staging' | 'production';
  department?: string;
  minify?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

class Fire22PagesBuildSystem {
  private readonly srcDir = join(process.cwd(), 'src');
  private readonly distDir = join(process.cwd(), 'dist', 'pages');
  private readonly teamDirectory: any;

  constructor() {
    // Load team directory configuration
    const teamDirectoryPath = join(this.srcDir, 'communications', 'team-directory.json');
    this.teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
  }

  /**
   * 🏗️ Main build entry point
   */
  async build(options: BuildOptions = {}): Promise<void> {
    const startTime = Bun.nanoseconds();

    console.log('🚀 Fire22 Dashboard Pages Build System');
    console.log('!==!==!==!==!==!=====');

    const env = options.environment || 'development';
    console.log(`\n📦 Environment: ${env}`);
    console.log(`🎯 Output Directory: ${this.distDir}`);

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be written');
    }

    try {
      // Setup build environment
      await this.setupBuildEnvironment(options);

      // Build department pages
      await this.buildDepartmentPages(options);

      // Build RSS feeds
      await this.buildFeeds(options);

      // Build main dashboard
      await this.buildMainDashboard(options);

      // Build assets and styles
      await this.buildAssets(options);

      // Generate deployment manifest
      await this.generateDeploymentManifest(options);

      const buildTime = (Bun.nanoseconds() - startTime) / 1_000_000;
      console.log(`\n✅ Build completed successfully in ${buildTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  /**
   * 📁 Setup build environment
   */
  private async setupBuildEnvironment(options: BuildOptions): Promise<void> {
    console.log('\n📁 Setting up build environment...');

    if (!options.dryRun) {
      // Create output directories
      if (existsSync(this.distDir)) {
        await $`rm -rf ${this.distDir}`;
      }
      mkdirSync(this.distDir, { recursive: true });

      // Create department-specific directories
      const departments = this.getDepartments();
      for (const dept of departments) {
        const deptDir = join(this.distDir, dept.id);
        mkdirSync(deptDir, { recursive: true });
        console.log(`  📂 Created ${dept.name} directory`);
      }

      // Create feeds directory
      mkdirSync(join(this.distDir, 'feeds'), { recursive: true });
      console.log('  📡 Created feeds directory');

      // Create assets directory
      mkdirSync(join(this.distDir, 'assets'), { recursive: true });
      console.log('  🎨 Created assets directory');
    }
  }

  /**
   * 🏢 Build department-specific pages
   */
  private async buildDepartmentPages(options: BuildOptions): Promise<void> {
    console.log('\n🏢 Building department pages...');

    const departments = this.getDepartments();

    for (const dept of departments) {
      if (options.department && dept.id !== options.department) {
        continue; // Skip if building specific department
      }

      console.log(`  🔨 Building ${dept.name}...`);

      // Get the correct HTML file name for this department
      const htmlFileName = this.getDepartmentHtmlFileName(dept.id);
      const deptHtmlPath = join(this.srcDir, 'departments', htmlFileName);

      if (existsSync(deptHtmlPath)) {
        const outputPath = join(this.distDir, dept.id, 'index.html');

        if (!options.dryRun) {
          // Process HTML with department variables
          let htmlContent = readFileSync(deptHtmlPath, 'utf-8');
          htmlContent = this.processHtmlTemplate(htmlContent, dept, options);
          writeFileSync(outputPath, htmlContent);
        }

        console.log(`    ✅ ${dept.name} page: index.html`);
      } else {
        console.log(`    ⚠️ ${dept.name} HTML file not found: ${deptHtmlPath}`);

        // Create missing department page from template
        if (!options.dryRun) {
          await this.createMissingDepartmentPage(dept, options);
          console.log(`    🔧 Created missing ${dept.name} page from template`);
        }
      }

      // Generate department navigation
      await this.generateDepartmentNavigation(dept, options);

      // Copy department-specific assets
      await this.copyDepartmentAssets(dept, options);
    }
  }

  /**
   * 📡 Build RSS feeds
   */
  private async buildFeeds(options: BuildOptions): Promise<void> {
    console.log('\n📡 Building RSS feeds...');

    const feedsSourceDir = join(this.srcDir, 'feeds');
    const feedsOutputDir = join(this.distDir, 'feeds');

    if (existsSync(feedsSourceDir)) {
      const feedFiles = ['error-codes-rss.xml', 'error-codes-atom.xml', 'index.html'];

      for (const feedFile of feedFiles) {
        const sourcePath = join(feedsSourceDir, feedFile);
        const outputPath = join(feedsOutputDir, feedFile);

        if (existsSync(sourcePath) && !options.dryRun) {
          let content = readFileSync(sourcePath, 'utf-8');

          // Process feed URLs for production
          if (options.environment === 'production') {
            content = content.replace(
              /https:\/\/brendadeeznuts1111\.github\.io\/fire22-dashboard-worker/g,
              'https://dashboard.fire22.ag'
            );
          }

          writeFileSync(outputPath, content);
        }

        console.log(`  📡 ${feedFile}`);
      }
    }
  }

  /**
   * 🏠 Build main dashboard
   */
  private async buildMainDashboard(options: BuildOptions): Promise<void> {
    console.log('\n🏠 Building main dashboard...');

    const dashboardFiles = ['dashboard.html', 'dashboard-index.html', 'unified-dashboard.html'];

    for (const file of dashboardFiles) {
      const sourcePath = join(this.srcDir, file);
      const outputPath = join(this.distDir, file);

      if (existsSync(sourcePath)) {
        if (!options.dryRun) {
          let content = readFileSync(sourcePath, 'utf-8');
          content = this.processDashboardTemplate(content, options);
          writeFileSync(outputPath, content);
        }
        console.log(`  🏠 ${file}`);
      }
    }

    // Create root index.html pointing to main dashboard
    if (!options.dryRun) {
      const indexContent = this.generateRootIndex(options);
      writeFileSync(join(this.distDir, 'index.html'), indexContent);
    }
    console.log('  🏠 index.html (root)');
  }

  /**
   * 🎨 Build assets and styles
   */
  private async buildAssets(options: BuildOptions): Promise<void> {
    console.log('\n🎨 Building assets and styles...');

    // Copy CSS files
    const stylesDir = join(this.srcDir, 'styles');
    if (existsSync(stylesDir)) {
      const cssFiles = this.findCSSFiles(stylesDir);

      for (const cssFile of cssFiles) {
        const sourcePath = join(stylesDir, cssFile);
        const outputPath = join(this.distDir, 'assets', cssFile);

        if (!options.dryRun) {
          mkdirSync(dirname(outputPath), { recursive: true });

          let cssContent = readFileSync(sourcePath, 'utf-8');
          if (options.minify) {
            // Simple CSS minification
            cssContent = cssContent
              .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
              .replace(/\s+/g, ' ') // Collapse whitespace
              .trim();
          }

          writeFileSync(outputPath, cssContent);
        }

        console.log(`  🎨 ${cssFile}`);
      }
    }

    // Copy JavaScript files
    const jsDir = join(this.srcDir, 'js');
    if (existsSync(jsDir)) {
      const jsFiles = this.findJSFiles(jsDir);

      for (const jsFile of jsFiles) {
        const sourcePath = join(jsDir, jsFile);
        const outputPath = join(this.distDir, 'assets', jsFile);

        if (!options.dryRun) {
          mkdirSync(dirname(outputPath), { recursive: true });
          copyFileSync(sourcePath, outputPath);
        }

        console.log(`  📜 ${jsFile}`);
      }
    }
  }

  /**
   * 📋 Generate deployment manifest
   */
  private async generateDeploymentManifest(options: BuildOptions): Promise<void> {
    console.log('\n📋 Generating deployment manifest...');

    const manifest = {
      buildTime: new Date().toISOString(),
      environment: options.environment || 'development',
      builtBy: 'Fire22 Dashboard Build System',
      version: '1.0.0',
      departments: this.getDepartments().map(d => ({
        id: d.id,
        name: d.name,
        path: `/${d.id}/`,
        admin: d.email,
      })),
      feeds: {
        rss: '/feeds/error-codes-rss.xml',
        atom: '/feeds/error-codes-atom.xml',
        index: '/feeds/index.html',
      },
      assets: {
        styles: '/assets/',
        scripts: '/assets/',
      },
    };

    if (!options.dryRun) {
      writeFileSync(join(this.distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    }

    console.log('  📋 manifest.json');
  }

  /**
   * 🏢 Get departments from team directory
   */
  private getDepartments(): Department[] {
    const departments: Department[] = [];

    for (const [key, dept] of Object.entries(this.teamDirectory.departments)) {
      if (dept && typeof dept === 'object' && 'name' in dept) {
        departments.push({
          id: key,
          name: dept.name,
          email: dept.email,
          domain: dept.domain,
          color: dept.color,
          members: dept.members || [],
        });
      }
    }

    return departments;
  }

  /**
   * 🔄 Process HTML template with department variables
   */
  private processHtmlTemplate(html: string, dept: Department, options: BuildOptions): string {
    return html
      .replace(/{{DEPARTMENT_NAME}}/g, dept.name)
      .replace(/{{DEPARTMENT_COLOR}}/g, dept.color)
      .replace(/{{DEPARTMENT_EMAIL}}/g, dept.email)
      .replace(/{{MEMBER_COUNT}}/g, dept.members.length.toString())
      .replace(/{{BUILD_TIME}}/g, new Date().toISOString())
      .replace(/{{ENVIRONMENT}}/g, options.environment || 'development');
  }

  /**
   * 🏠 Process dashboard template
   */
  private processDashboardTemplate(html: string, options: BuildOptions): string {
    const departments = this.getDepartments();

    // Generate department links
    const departmentLinks = departments
      .map(
        dept =>
          `<a href="/${dept.id}/" class="dept-link" style="border-left: 3px solid ${dept.color}">${dept.name}</a>`
      )
      .join('\n    ');

    return html
      .replace(/{{DEPARTMENT_LINKS}}/g, departmentLinks)
      .replace(/{{BUILD_TIME}}/g, new Date().toISOString())
      .replace(/{{ENVIRONMENT}}/g, options.environment || 'development');
  }

  /**
   * 🏠 Generate root index.html
   */
  private generateRootIndex(options: BuildOptions): string {
    const departments = this.getDepartments();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Dashboard</title>
    <link rel="alternate" type="application/rss+xml" title="Fire22 Error Codes" href="/feeds/error-codes-rss.xml">
    <link rel="alternate" type="application/atom+xml" title="Fire22 Error Codes" href="/feeds/error-codes-atom.xml">
    <style>
        body { font-family: 'SF Mono', monospace; background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); color: #e0e6ed; min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 1200px; margin: 0 auto; text-align: center; }
        h1 { font-size: 48px; background: linear-gradient(135deg, #ff6b35, #f7931e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
        .departments { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .dept-card { background: rgba(10, 14, 39, 0.7); border: 2px solid rgba(64, 224, 208, 0.2); border-radius: 15px; padding: 20px; text-decoration: none; color: inherit; transition: all 0.3s ease; }
        .dept-card:hover { transform: translateY(-5px); border-color: var(--dept-color); }
        .dept-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .dept-members { font-size: 14px; color: #9ca3af; }
        .feeds-section { margin: 40px 0; }
        .feed-link { display: inline-block; margin: 0 15px; padding: 10px 20px; background: rgba(64, 224, 208, 0.1); border: 1px solid rgba(64, 224, 208, 0.3); border-radius: 8px; color: #40e0d0; text-decoration: none; transition: all 0.3s ease; }
        .feed-link:hover { background: rgba(64, 224, 208, 0.2); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 Fire22 Dashboard</h1>
        <p>Enterprise Dashboard System with Department Access Control</p>
        
        <div class="departments">
            ${departments
              .map(
                dept => `
            <a href="/${dept.id}/" class="dept-card" style="--dept-color: ${dept.color};">
                <div class="dept-name" style="color: ${dept.color};">${dept.name}</div>
                <div class="dept-members">${dept.members.length} team members</div>
            </a>
            `
              )
              .join('')}
        </div>
        
        <div class="feeds-section">
            <h3>📡 RSS Feeds</h3>
            <a href="/feeds/error-codes-rss.xml" class="feed-link">📡 RSS Feed</a>
            <a href="/feeds/error-codes-atom.xml" class="feed-link">⚛️ Atom Feed</a>
            <a href="/feeds/" class="feed-link">📋 Feed Directory</a>
        </div>
        
        <div style="margin-top: 40px; font-size: 12px; color: #6b7280;">
            Built with Bun • Environment: ${options.environment || 'development'} • ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🧭 Generate department navigation
   */
  private async generateDepartmentNavigation(
    dept: Department,
    options: BuildOptions
  ): Promise<void> {
    const departments = this.getDepartments();

    const navContent = `
<!-- Department Navigation -->
<nav class="dept-navigation" style="background: rgba(10, 14, 39, 0.9); padding: 15px; border-bottom: 2px solid ${dept.color};">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <a href="/" style="color: #40e0d0; text-decoration: none;">🏠 Dashboard</a>
            <span style="margin: 0 10px; color: #6b7280;">›</span>
            <span style="color: ${dept.color};">${dept.name}</span>
        </div>
        <div style="display: flex; gap: 15px;">
            ${departments
              .map(
                d => `
                <a href="/${d.id}/" style="color: ${d.id === dept.id ? d.color : '#9ca3af'}; text-decoration: none; padding: 5px 10px; border-radius: 5px; ${d.id === dept.id ? `background: rgba(64, 224, 208, 0.1);` : ''}">${d.name}</a>
            `
              )
              .join('')}
        </div>
    </div>
</nav>
`;

    if (!options.dryRun) {
      const navPath = join(this.distDir, dept.id, 'navigation.html');
      writeFileSync(navPath, navContent);
    }
  }

  /**
   * 📁 Copy department-specific assets
   */
  private async copyDepartmentAssets(dept: Department, options: BuildOptions): Promise<void> {
    // Copy department-specific CSS if exists
    const deptCssPath = join(this.srcDir, 'styles', 'departments', `${dept.id}.css`);
    if (existsSync(deptCssPath) && !options.dryRun) {
      const outputPath = join(this.distDir, dept.id, 'style.css');
      copyFileSync(deptCssPath, outputPath);
    }

    // Copy department data files if they exist
    const deptDataDir = join(this.srcDir, 'departments', 'data', dept.id);
    if (existsSync(deptDataDir) && !options.dryRun) {
      const outputDir = join(this.distDir, dept.id, 'data');
      mkdirSync(outputDir, { recursive: true });

      const dataFiles = this.findAllFiles(deptDataDir);
      for (const file of dataFiles) {
        const sourcePath = join(deptDataDir, file);
        const outputPath = join(outputDir, file);
        mkdirSync(dirname(outputPath), { recursive: true });
        copyFileSync(sourcePath, outputPath);
      }
    }
  }

  /**
   * 🔍 Find CSS files recursively
   */
  private findCSSFiles(dir: string, relativePath = ''): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const itemRelativePath = relativePath ? join(relativePath, item) : item;

      if (statSync(fullPath).isDirectory()) {
        files.push(...this.findCSSFiles(fullPath, itemRelativePath));
      } else if (item.endsWith('.css')) {
        files.push(itemRelativePath);
      }
    }

    return files;
  }

  /**
   * 🔍 Find JavaScript files recursively
   */
  private findJSFiles(dir: string, relativePath = ''): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const itemRelativePath = relativePath ? join(relativePath, item) : item;

      if (statSync(fullPath).isDirectory()) {
        files.push(...this.findJSFiles(fullPath, itemRelativePath));
      } else if (item.endsWith('.js')) {
        files.push(itemRelativePath);
      }
    }

    return files;
  }

  /**
   * 🔍 Find all files recursively
   */
  private findAllFiles(dir: string, relativePath = ''): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const itemRelativePath = relativePath ? join(relativePath, item) : item;

      if (statSync(fullPath).isDirectory()) {
        files.push(...this.findAllFiles(fullPath, itemRelativePath));
      } else {
        files.push(itemRelativePath);
      }
    }

    return files;
  }

  /**
   * 🗂️ Get the correct HTML file name for a department
   */
  private getDepartmentHtmlFileName(departmentId: string): string {
    // Handle special cases where department ID doesn't match file name
    const fileNameMapping: Record<string, string> = {
      support: 'customer-support-department.html',
      contributors: 'team-contributors-department.html',
      'sportsbook-operations': 'sportsbook-operations-department.html',
    };

    return fileNameMapping[departmentId] || `${departmentId}-department.html`;
  }

  /**
   * 🔧 Create missing department page from template
   */
  private async createMissingDepartmentPage(
    dept: Department,
    options: BuildOptions
  ): Promise<void> {
    const templatePath = join(this.srcDir, 'departments', '_department-template.html');
    const outputPath = join(this.distDir, dept.id, 'index.html');

    if (existsSync(templatePath)) {
      // Use existing template
      let templateContent = readFileSync(templatePath, 'utf-8');
      templateContent = this.processHtmlTemplate(templateContent, dept, options);
      writeFileSync(outputPath, templateContent);
    } else {
      // Generate basic department page
      const basicTemplate = this.generateBasicDepartmentTemplate(dept, options);
      writeFileSync(outputPath, basicTemplate);
    }
  }

  /**
   * 📄 Generate basic department template
   */
  private generateBasicDepartmentTemplate(dept: Department, options: BuildOptions): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏢 Fire22 ${dept.name} - Dashboard</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            background: linear-gradient(135deg, #0a0e27 0%, #151932 50%, #1a1f3a 100%);
            color: #e0e6ed;
            min-height: 100vh;
            line-height: 1.6;
        }

        .header {
            background: rgba(10, 14, 39, 0.9);
            border-bottom: 2px solid ${dept.color};
            padding: 30px;
            text-align: center;
            backdrop-filter: blur(20px);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .header h1 {
            font-size: clamp(28px, 5vw, 42px);
            background: linear-gradient(135deg, ${dept.color} 0%, #f97316 30%, #eab308 60%, #22d3ee 100%);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 12px;
            animation: header-glow 4s ease-in-out infinite;
        }

        @keyframes header-glow {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .department-info {
            background: rgba(10, 14, 39, 0.7);
            border: 2px solid rgba(64, 224, 208, 0.2);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }

        .team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .team-member {
            background: rgba(10, 14, 39, 0.5);
            border: 1px solid rgba(64, 224, 208, 0.2);
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }

        .member-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${dept.color};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            font-weight: bold;
            font-size: 18px;
            color: white;
        }

        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #40e0d0;
            text-decoration: none;
            padding: 10px 20px;
            border: 1px solid rgba(64, 224, 208, 0.3);
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .back-link:hover {
            background: rgba(64, 224, 208, 0.1);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏢 ${dept.name}</h1>
        <p>Fire22 Dashboard System</p>
    </div>

    <div class="container">
        <a href="/" class="back-link">← Back to Dashboard</a>

        <div class="department-info">
            <h2>Welcome to ${dept.name}</h2>
            <p><strong>Email:</strong> ${dept.email}</p>
            <p><strong>Team Members:</strong> ${dept.members.length}</p>
            <p><strong>Department Color:</strong> <span style="color: ${dept.color};">${dept.color}</span></p>
        </div>

        <div class="team-grid">
            ${dept.members
              .map(
                member => `
            <div class="team-member">
                <div class="member-avatar">${
                  member.avatar ||
                  member.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                }</div>
                <h3>${member.name}</h3>
                <p>${member.role}</p>
                <p><small>${member.email}</small></p>
                <p><span style="color: ${this.getStatusColor(member.status)};">●</span> ${this.getStatusText(member.status)}</p>
            </div>
            `
              )
              .join('')}
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280;">
            Built with Fire22 Dashboard Build System • Environment: ${options.environment || 'development'} • {{BUILD_TIME}}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🎨 Get status color for team member
   */
  private getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      available: '#10b981',
      busy: '#ef4444',
      'in-meeting': '#f59e0b',
      'on-call': '#8b5cf6',
      coding: '#06b6d4',
      'creative-work': '#ec4899',
      'strategic-planning': '#6366f1',
      offline: '#6b7280',
      vacation: '#14b8a6',
      recruiting: '#f97316',
    };
    return statusColors[status] || '#6b7280';
  }

  /**
   * 📝 Get status text for team member
   */
  private getStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      available: 'Available',
      busy: 'Busy',
      'in-meeting': 'In Meeting',
      'on-call': 'On Call',
      coding: 'Deep Work',
      'creative-work': 'Creative Work',
      'strategic-planning': 'Strategic Planning',
      offline: 'Offline',
      vacation: 'On Vacation',
      recruiting: 'Position Open',
    };
    return statusTexts[status] || 'Unknown';
  }
}

// 🚀 CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    environment: 'development',
    minify: false,
    verbose: false,
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
      case '--minify':
        options.minify = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Fire22 Dashboard Pages Build System

Usage:
  bun run scripts/build-pages.ts [options]

Options:
  --env, --environment    Build environment (development|staging|production)
  --dept, --department    Build specific department only
  --minify               Minify CSS and optimize assets
  --verbose              Verbose logging
  --dry-run              Preview build without writing files
  --help                 Show this help

Examples:
  bun run scripts/build-pages.ts
  bun run scripts/build-pages.ts --env production --minify
  bun run scripts/build-pages.ts --dept finance --dry-run
  bun run scripts/build-pages.ts --env staging --verbose
`);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  const buildSystem = new Fire22PagesBuildSystem();
  await buildSystem.build(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { Fire22PagesBuildSystem };
