/**
 * 📦 Fire22 Package Review Grid API
 *
 * Comprehensive package analysis with property breakdown and review system
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Glob } from 'bun';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const app = new Hono();

// Enable CORS for package review access
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  main: string;
  type?: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  keywords: string[];
  author: string;
  license: string;
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  homepage?: string;
}

export interface PackageAnalysis {
  info: PackageInfo;
  path: string;
  size: {
    packageJson: number;
    totalFiles: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
  };
  structure: {
    hasTests: boolean;
    hasTypes: boolean;
    hasReadme: boolean;
    hasChangelog: boolean;
    hasLicense: boolean;
    hasGitignore: boolean;
    folders: string[];
    entryPoints: string[];
  };
  dependencies: {
    total: number;
    production: number;
    development: number;
    outdated: string[];
    vulnerable: string[];
    bundleSize: string;
  };
  scripts: {
    total: number;
    hasTest: boolean;
    hasBuild: boolean;
    hasStart: boolean;
    hasLint: boolean;
    custom: string[];
  };
  quality: {
    score: number;
    issues: string[];
    recommendations: string[];
    compliance: {
      hasVersion: boolean;
      hasDescription: boolean;
      hasLicense: boolean;
      hasAuthor: boolean;
      hasRepository: boolean;
    };
  };
  fire22Integration: {
    isIntegrated: boolean;
    patterns: string[];
    hubConnected: boolean;
    languageSupport: boolean;
    apiEndpoints: string[];
  };
}

export interface PackageReviewGrid {
  summary: {
    totalPackages: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    fire22Integrated: number;
    needsReview: number;
  };
  packages: PackageAnalysis[];
  recommendations: {
    immediate: string[];
    longTerm: string[];
    optimization: string[];
  };
  timestamp: string;
}

class PackageAnalyzer {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  /**
   * Discover all packages in the workspace
   */
  async discoverPackages(): Promise<string[]> {
    const packagePaths: string[] = [];

    // Check root package.json
    if (existsSync(join(this.rootPath, 'package.json'))) {
      packagePaths.push(this.rootPath);
    }

    // Find workspace packages
    const workspacePaths = ['packages/*', 'workspaces/*', 'apps/*', 'libs/*'];

    for (const pattern of workspacePaths) {
      const glob = new Glob(pattern);
      for await (const dir of glob.scan({ cwd: this.rootPath })) {
        const fullPath = join(this.rootPath, dir);
        if (existsSync(join(fullPath, 'package.json'))) {
          packagePaths.push(fullPath);
        }
      }
    }

    return packagePaths;
  }

  /**
   * Analyze a single package
   */
  async analyzePackage(packagePath: string): Promise<PackageAnalysis> {
    const packageJsonPath = join(packagePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      throw new Error(`Package.json not found in ${packagePath}`);
    }

    const packageInfo: PackageInfo = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Analyze package structure
    const structure = await this.analyzeStructure(packagePath);
    const size = await this.analyzeSize(packagePath);
    const dependencies = await this.analyzeDependencies(packageInfo);
    const scripts = this.analyzeScripts(packageInfo.scripts || {});
    const quality = this.analyzeQuality(packageInfo, structure);
    const fire22Integration = await this.analyzeFire22Integration(packagePath, packageInfo);

    return {
      info: packageInfo,
      path: packagePath,
      size,
      structure,
      dependencies,
      scripts,
      quality,
      fire22Integration,
    };
  }

  /**
   * Analyze package structure
   */
  private async analyzeStructure(packagePath: string): Promise<PackageAnalysis['structure']> {
    const files = await this.getAllFiles(packagePath);
    const folders = await this.getFolders(packagePath);

    return {
      hasTests:
        files.some(f => f.includes('test') || f.includes('spec')) ||
        folders.some(f => f.includes('test') || f.includes('spec')),
      hasTypes: files.some(f => f.endsWith('.d.ts')) || existsSync(join(packagePath, 'types')),
      hasReadme: files.some(f => f.toLowerCase().includes('readme')),
      hasChangelog: files.some(f => f.toLowerCase().includes('changelog')),
      hasLicense: files.some(f => f.toLowerCase().includes('license')),
      hasGitignore: files.includes('.gitignore'),
      folders: folders,
      entryPoints: this.findEntryPoints(packagePath, files),
    };
  }

  /**
   * Analyze package size
   */
  private async analyzeSize(packagePath: string): Promise<PackageAnalysis['size']> {
    const files = await this.getAllFiles(packagePath);

    return {
      packageJson: existsSync(join(packagePath, 'package.json'))
        ? statSync(join(packagePath, 'package.json')).size
        : 0,
      totalFiles: files.length,
      sourceFiles: files.filter(
        f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')
      ).length,
      testFiles: files.filter(
        f =>
          f.includes('test') || f.includes('spec') || f.includes('.test.') || f.includes('.spec.')
      ).length,
      configFiles: files.filter(
        f => f.includes('config') || f.startsWith('.') || f.endsWith('.json') || f.endsWith('.yml')
      ).length,
    };
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(
    packageInfo: PackageInfo
  ): Promise<PackageAnalysis['dependencies']> {
    const deps = packageInfo.dependencies || {};
    const devDeps = packageInfo.devDependencies || {};

    return {
      total: Object.keys(deps).length + Object.keys(devDeps).length,
      production: Object.keys(deps).length,
      development: Object.keys(devDeps).length,
    };
  }

  /**
   * Analyze scripts
   */
  private analyzeScripts(scripts: Record<string, string>): PackageAnalysis['scripts'] {
    const scriptNames = Object.keys(scripts);
    const commonScripts = ['test', 'build', 'start', 'dev', 'lint', 'format'];

    return {
      total: scriptNames.length,
      hasTest: scriptNames.some(s => s.includes('test')),
      hasBuild: scriptNames.some(s => s.includes('build')),
      hasStart: scriptNames.some(s => s.includes('start') || s.includes('dev')),
      hasLint: scriptNames.some(s => s.includes('lint')),
      custom: scriptNames.filter(s => !commonScripts.includes(s)),
    };
  }

  /**
   * Analyze package quality
   */
  private analyzeQuality(
    packageInfo: PackageInfo,
    structure: PackageAnalysis['structure']
  ): PackageAnalysis['quality'] {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const compliance = {
      hasVersion: !!packageInfo.version,
      hasDescription: !!packageInfo.description,
      hasLicense: !!packageInfo.license,
      hasAuthor: !!packageInfo.author,
      hasRepository: !!packageInfo.repository,
    };

    // Check compliance
    if (!compliance.hasVersion) {
      issues.push('Missing version');
      score -= 10;
    }
    if (!compliance.hasDescription) {
      issues.push('Missing description');
      score -= 5;
    }
    if (!compliance.hasLicense) {
      issues.push('Missing license');
      score -= 10;
    }
    if (!compliance.hasAuthor) {
      issues.push('Missing author');
      score -= 5;
    }
    if (!compliance.hasRepository) {
      issues.push('Missing repository URL');
      recommendations.push('Add repository field for better discoverability');
      score -= 5;
    }

    // Check structure
    if (!structure.hasReadme) {
      issues.push('Missing README');
      recommendations.push('Add comprehensive README documentation');
      score -= 15;
    }
    if (!structure.hasTests) {
      issues.push('No tests found');
      recommendations.push('Add test suite for better reliability');
      score -= 20;
    }
    if (!structure.hasTypes && packageInfo.main?.endsWith('.ts')) {
      recommendations.push('Consider adding TypeScript declaration files');
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      compliance,
    };
  }

  /**
   * Analyze Fire22 integration
   */
  private async analyzeFire22Integration(
    packagePath: string,
    packageInfo: PackageInfo
  ): Promise<PackageAnalysis['fire22Integration']> {
    const files = await this.getAllFiles(packagePath);

    const patterns = this.detectPatterns(files);
    const apiEndpoints = await this.detectApiEndpoints(packagePath, files);

    return {
      isIntegrated:
        patterns.length > 0 ||
        packageInfo.dependencies?.['@fire22/core'] !== undefined ||
        packageInfo.name?.includes('fire22') ||
        files.some(f => f.includes('fire22')),
      patterns,
      hubConnected: files.some(f => f.includes('hub') || f.includes('connection')),
      languageSupport: files.some(f => f.includes('language') || f.includes('i18n')),
      apiEndpoints,
    };
  }

  /**
   * Detect patterns in files
   */
  private detectPatterns(files: string[]): string[] {
    const patterns: string[] = [];

    const patternKeywords = [
      'pattern-weaver',
      'weaver',
      'observer',
      'factory',
      'singleton',
      'strategy',
      'command',
      'decorator',
      'adapter',
      'facade',
    ];

    for (const file of files) {
      for (const keyword of patternKeywords) {
        if (file.toLowerCase().includes(keyword)) {
          patterns.push(keyword);
          break;
        }
      }
    }

    return [...new Set(patterns)];
  }

  /**
   * Detect API endpoints
   */
  private async detectApiEndpoints(packagePath: string, files: string[]): Promise<string[]> {
    const endpoints: string[] = [];

    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        try {
          const filePath = join(packagePath, file);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');

            // Look for API route patterns
            const routePatterns = [
              /app\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g,
              /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g,
              /\.route\(['"`]([^'"`]+)['"`]/g,
            ];

            for (const pattern of routePatterns) {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                const endpoint = match[2] || match[1];
                if (endpoint && endpoint.startsWith('/')) {
                  endpoints.push(endpoint);
                }
              }
            }
          }
        } catch (error) {
          // Ignore file reading errors
        }
      }
    }

    return [...new Set(endpoints)];
  }

  /**
   * Get all files recursively
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const glob = new Glob('**/*');
      for await (const file of glob.scan({ cwd: dir })) {
        const fullPath = join(dir, file);
        if (existsSync(fullPath) && statSync(fullPath).isFile()) {
          files.push(file);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Get folders in directory
   */
  private async getFolders(dir: string): Promise<string[]> {
    const folders: string[] = [];

    try {
      const glob = new Glob('*');
      for await (const item of glob.scan({ cwd: dir })) {
        const fullPath = join(dir, item);
        if (existsSync(fullPath) && statSync(fullPath).isDirectory() && !item.startsWith('.')) {
          folders.push(item);
        }
      }
    } catch (error) {
      console.error(`Error scanning folders in ${dir}:`, error);
    }

    return folders;
  }

  /**
   * Find entry points
   */
  private findEntryPoints(packagePath: string, files: string[]): string[] {
    const entryPoints: string[] = [];

    const commonEntries = [
      'index.ts',
      'index.js',
      'main.ts',
      'main.js',
      'app.ts',
      'app.js',
      'server.ts',
      'server.js',
    ];

    for (const entry of commonEntries) {
      if (files.includes(entry)) {
        entryPoints.push(entry);
      }
    }

    return entryPoints;
  }

  /**
   * Generate complete package review grid
   */
  async generateReviewGrid(): Promise<PackageReviewGrid> {
    const packagePaths = await this.discoverPackages();
    const packages: PackageAnalysis[] = [];

    for (const path of packagePaths) {
      try {
        const analysis = await this.analyzePackage(path);
        packages.push(analysis);
      } catch (error) {
        console.error(`Error analyzing package at ${path}:`, error);
      }
    }

    const scores = packages.map(p => p.quality.score);
    const fire22Integrated = packages.filter(p => p.fire22Integration.isIntegrated).length;
    const needsReview = packages.filter(p => p.quality.score < 70).length;

    const recommendations = this.generateGlobalRecommendations(packages);

    return {
      summary: {
        totalPackages: packages.length,
        averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        highestScore: Math.max(...scores, 0),
        lowestScore: Math.min(...scores, 100),
        fire22Integrated,
        needsReview,
      },
      packages,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate global recommendations
   */
  private generateGlobalRecommendations(
    packages: PackageAnalysis[]
  ): PackageReviewGrid['recommendations'] {
    const immediate: string[] = [];
    const longTerm: string[] = [];
    const optimization: string[] = [];

    const missingReadme = packages.filter(p => !p.structure.hasReadme).length;
    const missingTests = packages.filter(p => !p.structure.hasTests).length;
    const lowQuality = packages.filter(p => p.quality.score < 50).length;

    if (missingReadme > 0) {
      immediate.push(`Add README files to ${missingReadme} packages`);
    }
    if (missingTests > 0) {
      immediate.push(`Add test suites to ${missingTests} packages`);
    }
    if (lowQuality > 0) {
      immediate.push(`Address quality issues in ${lowQuality} packages`);
    }

    longTerm.push('Standardize package.json fields across all packages');
    longTerm.push('Implement consistent testing and linting across workspace');

    optimization.push('Consider using workspace-level dependency management');
    optimization.push('Implement automated quality checks in CI/CD');
    optimization.push('Set up dependency vulnerability scanning');

    return { immediate, longTerm, optimization };
  }
}

// API Routes

// Get package review grid
app.get('/api/packages/review-grid', async c => {
  try {
    const analyzer = new PackageAnalyzer();
    const grid = await analyzer.generateReviewGrid();

    return c.json({
      success: true,
      data: grid,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Get specific package analysis
app.get('/api/packages/analyze/:path', async c => {
  try {
    const packagePath = decodeURIComponent(c.req.param('path'));
    const analyzer = new PackageAnalyzer();
    const analysis = await analyzer.analyzePackage(packagePath);

    return c.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Package analysis failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

// Discover packages in workspace
app.get('/api/packages/discover', async c => {
  try {
    const analyzer = new PackageAnalyzer();
    const packages = await analyzer.discoverPackages();

    return c.json({
      success: true,
      packages,
      count: packages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Package discovery failed',
        timestamp: new Date().toISOString(),
      },
      400
    );
  }
});

export default app;
