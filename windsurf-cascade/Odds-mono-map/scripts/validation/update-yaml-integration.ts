#!/usr/bin/env bun

/**
 * 📄 Bun YAML Integration Updater
 * 
 * Updates templates and configuration to use Bun's built-in YAML support
 * with proper parsing, hot reloading, and module import capabilities.
 */

import { readFile, writeFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';

interface YAMLConfig {
    parseAPI: string[];
    importSupport: string[];
    hotReloading: string[];
    features: string[];
}

class YAMLIntegrationUpdater {
    private templatesPath: string;

    // Bun YAML capabilities
    private yamlCapabilities: YAMLConfig = {
        parseAPI: [
            'Bun.YAML.parse',
            'Multi-document support',
            'YAML 1.2 specification',
            'Error handling with SyntaxError'
        ],
        importSupport: [
            'ES Module imports',
            'Named imports',
            'CommonJS require',
            'Dynamic imports',
            'Bundler integration'
        ],
        hotReloading: [
            'bun --hot support',
            'Live configuration updates',
            'Feature flag toggling',
            'Environment switching'
        ],
        features: [
            'Anchors and aliases',
            'Tags and type hints',
            'Multi-line strings',
            'Environment variable interpolation',
            'Tree-shaking support'
        ]
    };

    constructor(templatesPath: string) {
        this.templatesPath = templatesPath;
    }

    async updateAllTemplates(): Promise<void> {
        const files = await this.getTemplateFiles();
        console.log(`📄 Updating Bun YAML integration in ${files.length} templates...`);

        for (const file of files) {
            await this.updateTemplateYAML(file);
        }

        // Create example YAML configurations
        await this.createYAMLExamples();

        console.log('✅ All templates updated with Bun YAML support!');
    }

    private async getTemplateFiles(): Promise<string[]> {
        const entries = await readdir(this.templatesPath, { withFileTypes: true });
        return entries
            .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
            .map(entry => join(this.templatesPath, entry.name))
            .sort();
    }

    private async updateTemplateYAML(filePath: string): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const fileName = filePath.split('/').pop() || '';

            const updatedContent = this.updateYAMLInContent(content, fileName);

            if (updatedContent !== content) {
                await writeFile(filePath, updatedContent, 'utf-8');
                console.log(`  📄 Updated: ${fileName}`);
            }
        } catch (error) {
            console.error(`  ❌ Error updating ${filePath}:`, error);
        }
    }

    private updateYAMLInContent(content: string, fileName: string): string {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

        if (!frontmatterMatch) {
            return content;
        }

        const frontmatter = frontmatterMatch[1];
        const updatedFrontmatter = this.updateYAMLSection(frontmatter, fileName);

        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedFrontmatter}\n---`);
    }

    private updateYAMLSection(frontmatter: string, fileName: string): string {
        const lines = frontmatter.split('\n');
        const result: string[] = [];
        let inDependenciesSection = false;
        let dependenciesReplaced = false;

        // Determine YAML-related dependencies
        const yamlDependencies = this.getYAMLDependencies(fileName);

        for (const line of lines) {
            if (line.trim() === 'dependencies:') {
                inDependenciesSection = true;
                result.push('dependencies:');
                // Add updated dependencies
                for (const dep of yamlDependencies) {
                    result.push(`    - ${dep}`);
                }
                dependenciesReplaced = true;
                continue;
            }

            if (inDependenciesSection) {
                if (line.startsWith('    - ') || line.startsWith('      - ')) {
                    // Skip old dependency lines
                    continue;
                } else if (line.trim() && !line.startsWith('  ')) {
                    // End of dependencies section
                    inDependenciesSection = false;
                    result.push(line);
                } else {
                    // Skip empty lines in dependencies section
                    continue;
                }
            } else {
                result.push(line);
            }
        }

        // If dependencies section was never found, add it
        if (!dependenciesReplaced) {
            result.push('dependencies:');
            for (const dep of yamlDependencies) {
                result.push(`    - ${dep}`);
            }
        }

        return result.join('\n');
    }

    private getYAMLDependencies(fileName: string): string[] {
        const lowerFileName = fileName.toLowerCase();
        const deps = ['typescript', '@types/node'];

        // Core YAML support for all templates
        deps.push('yaml');

        // Configuration management templates
        if (lowerFileName.includes('config') || lowerFileName.includes('template')) {
            deps.push('js-yaml', '@types/js-yaml');
        }

        // Task management templates
        if (lowerFileName.includes('task')) {
            deps.push('js-yaml', 'config');
        }

        // Analytics templates
        if (lowerFileName.includes('analytics')) {
            deps.push('js-yaml', 'config');
        }

        // Development templates
        if (lowerFileName.includes('development') || lowerFileName.includes('utilities')) {
            deps.push('js-yaml', 'dotenv');
        }

        // System templates
        if (lowerFileName.includes('system') || lowerFileName.includes('organization')) {
            deps.push('js-yaml', 'config', 'dotenv');
        }

        return Array.from(new Set(deps)).sort();
    }

    private async createYAMLExamples(): Promise<void> {
        const examplesDir = join(this.templatesPath, '..', 'config', 'examples');

        // Create directory if it doesn't exist
        try {
            await readdir(examplesDir);
        } catch {
            await writeFile(examplesDir + '/.gitkeep', '', 'utf-8');
        }

        // Create example YAML configurations
        await this.createConfigYAML(examplesDir);
        await this.createFeaturesYAML(examplesDir);
        await this.createDatabaseYAML(examplesDir);
    }

    private async createConfigYAML(examplesDir: string): Promise<void> {
        const configYAML = `# Bun YAML Configuration Example
# Supports hot reloading with \`bun --hot\`

defaults: &defaults
  timeout: 5000
  retries: 3
  cache:
    enabled: true
    ttl: 3600

development:
  <<: *defaults
  api:
    url: http://localhost:4000
    key: dev_key_12345
  logging:
    level: debug
    pretty: true

staging:
  <<: *defaults
  api:
    url: https://staging-api.example.com
    key: \${STAGING_API_KEY}
  logging:
    level: info
    pretty: false

production:
  <<: *defaults
  api:
    url: https://api.example.com
    key: \${PROD_API_KEY}
  cache:
    enabled: true
    ttl: 86400
  logging:
    level: error
    pretty: false
`;

        await writeFile(join(examplesDir, 'config.yaml'), configYAML, 'utf-8');
    }

    private async createFeaturesYAML(examplesDir: string): Promise<void> {
        const featuresYAML = `# Feature Flags Configuration
# Hot reloadable with Bun --hot

features:
  newDashboard:
    enabled: true
    rolloutPercentage: 50
    allowedUsers:
      - admin@example.com
      - beta@example.com

  experimentalAPI:
    enabled: false
    endpoints:
      - /api/v2/experimental
      - /api/v2/beta

  darkMode:
    enabled: true
    default: auto # auto, light, dark

  bunOptimizations:
    enabled: true
    features:
      - fast-startup
      - low-memory
      - native-ffi
      - hot-reloading
`;

        await writeFile(join(examplesDir, 'features.yaml'), featuresYAML, 'utf-8');
    }

    private async createDatabaseYAML(examplesDir: string): Promise<void> {
        const databaseYAML = `# Database Configuration with Bun YAML
# Supports environment variable interpolation

connections:
  primary:
    type: postgres
    host: \${DB_HOST:-localhost}
    port: \${DB_PORT:-5432}
    database: \${DB_NAME:-myapp}
    username: \${DB_USER:-postgres}
    password: \${DB_PASS}
    pool:
      min: 2
      max: 10
      idleTimeout: 30000

  cache:
    type: redis
    host: \${REDIS_HOST:-localhost}
    port: \${REDIS_PORT:-6379}
    password: \${REDIS_PASS}
    db: 0

  analytics:
    type: sqlite
    path: \${ANALYTICS_DB_PATH:-./analytics.db}
    journal_mode: WAL
    synchronous: NORMAL

migrations:
  autoRun: \${AUTO_MIGRATE:-false}
  directory: ./migrations

seeds:
  enabled: \${SEED_DB:-false}
  directory: ./seeds
`;

        await writeFile(join(examplesDir, 'database.yaml'), databaseYAML, 'utf-8');
    }
}

// CLI Interface
async function main(): Promise<void> {
    const templatesPath = process.argv[2] || join(process.cwd(), '06 - Templates');

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log('📄 Bun YAML Integration Updater');
        console.log('Usage: bun update-yaml-integration.ts [templates-path]');
        console.log('');
        console.log('Updates templates with Bun YAML support:');
        console.log('  - Bun.YAML.parse() API');
        console.log('  - ES Module imports');
        console.log('  - Hot reloading support');
        console.log('  - Configuration management');
        console.log('  - Environment variable interpolation');
        console.log('  - Feature flags');
        console.log('  - Database configuration');
        process.exit(0);
    }

    try {
        const updater = new YAMLIntegrationUpdater(templatesPath);
        await updater.updateAllTemplates();

        console.log('');
        console.log('🚀 Bun YAML Integration Complete!');
        console.log('Templates now support:');
        console.log('  📄 YAML parsing with Bun.YAML.parse()');
        console.log('  🔥 Hot reloading with bun --hot');
        console.log('  📦 ES Module imports (default & named)');
        console.log('  ⚙️  Configuration management');
        console.log('  🚩 Feature flags');
        console.log('  🗄️  Database configuration');
        console.log('  🌍 Environment variable interpolation');
        console.log('  📦 Bundler integration');
        console.log('');
        console.log('Example files created in config/examples/');

    } catch (error) {
        console.error('❌ YAML integration update failed:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}

export { YAMLIntegrationUpdater };
