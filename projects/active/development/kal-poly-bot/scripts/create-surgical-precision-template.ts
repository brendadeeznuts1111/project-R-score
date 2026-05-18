#!/usr/bin/env bun
// scripts/create-surgical-precision-template.ts - Bun Template Creator for Surgical Precision Platform

import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, resolve } from 'path';
import { BunTemplateAPI } from './bun-template-api.ts';

// Template configuration for Surgical Precision Platform
const TEMPLATE_CONFIG = {
  name: 'surgical-precision',
  version: '1.0.0',
  description: 'Enterprise microservices platform with Bun-native architecture',
  author: 'Surgical Precision Team',
  license: 'MIT',
  repository: 'https://github.com/brendadeeznuts1111/kal-poly-bot',

  // Template variants
  variants: {
    'full-platform': {
      description: 'Complete surgical precision platform with all features',
      features: ['mcp', 'ab-testing', 'history-cli', 'benchmarks', 'cloudflare']
    },
    'mcp-only': {
      description: 'MCP server with ripgrep codebase search',
      features: ['mcp', 'benchmarks']
    },
    'ab-testing': {
      description: 'A/B testing infrastructure with feature flags',
      features: ['ab-testing', 'benchmarks']
    },
    'minimal': {
      description: 'Minimal setup with core features',
      features: ['benchmarks']
    }
  }
};

// Template scaffold implementation
export class SurgicalPrecisionTemplate implements BunTemplateAPI.Template {
  name = TEMPLATE_CONFIG.name;
  version = TEMPLATE_CONFIG.version;
  description = TEMPLATE_CONFIG.description;

  async scaffoldProject(dir: string, name: string, variant: string = 'full-platform'): Promise<void> {
    console.info(`🚀 Creating Surgical Precision Platform: ${name}`);
    console.info(`📁 Location: ${dir}`);
    console.info(`🎯 Variant: ${variant}`);
    console.info('');

    // Validate variant
    if (!TEMPLATE_CONFIG.variants[variant as keyof typeof TEMPLATE_CONFIG.variants]) {
      throw new Error(`Unknown variant: ${variant}. Available: ${Object.keys(TEMPLATE_CONFIG.variants).join(', ')}`);
    }

    const config = TEMPLATE_CONFIG.variants[variant as keyof typeof TEMPLATE_CONFIG.variants];
    console.info(`✨ Features: ${config.features.join(', ')}`);
    console.info('');

    // Create directory structure
    await this.createDirectories(dir);

    // Generate package.json
    await this.createPackageJson(dir, name, variant);

    // Create source files
    await this.createSourceFiles(dir, name, variant);

    // Create configuration files
    await this.createConfigFiles(dir, variant);

    // Create documentation
    await this.createDocumentation(dir, name, variant);

    // Initialize git
    await this.initializeGit(dir);

    console.info('✅ Surgical Precision Platform created successfully!');
    console.info('');
    console.info('🚀 Next steps:');
    console.info(`   cd ${dir}`);
    console.info('   bun install');
    console.info('   bun run dev');
    console.info('');
    console.info('📚 Documentation:');
    console.info('   bun run help');
    console.info('   README.md');
    console.info('');
  }

  private async createDirectories(dir: string): Promise<void> {
    const directories = [
      'src',
      'scripts',
      'mcp',
      'utils',
      '__tests__',
      'docs',
      'examples'
    ];

    for (const subdir of directories) {
      mkdirSync(join(dir, subdir), { recursive: true });
    }
    console.info('📁 Created directory structure');
  }

  private async createPackageJson(dir: string, name: string, variant: string): Promise<void> {
    const config = TEMPLATE_CONFIG.variants[variant as keyof typeof TEMPLATE_CONFIG.variants];
    const packageJson = {
      name,
      version: '1.0.0',
      description: `Surgical Precision Platform - ${config.description}`,
      main: 'src/index.ts',
      type: 'module',
      scripts: this.generateScripts(config.features),
      keywords: ['surgical-precision', 'bun', 'microservices', 'mcp'],
      author: TEMPLATE_CONFIG.author,
      license: TEMPLATE_CONFIG.license,
      repository: TEMPLATE_CONFIG.repository,
      dependencies: {},
      devDependencies: {
        'bun-types': 'latest'
      }
    };

    writeFileSync(join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));
    console.info('📦 Created package.json');
  }

  private generateScripts(features: string[]): Record<string, string> {
    const scripts: Record<string, string> = {
      'dev': 'bun run src/index.ts',
      'build': 'bun build src/index.ts',
      'test': 'bun test',
      'lint': 'bunx eslint src',
      'type-check': 'bunx tsc --noEmit',
      'help': 'bun run scripts/help.ts'
    };

    if (features.includes('mcp')) {
      scripts['mcp:start'] = 'bun mcp/server.ts';
      scripts['mcp:search'] = 'curl -X POST http://localhost:8787/mcp/codesearch -H "Content-Type: application/json" -d \'{"query":"function","type":"ts"}\'';
      scripts['mcp:health'] = 'curl http://localhost:8787/health';
    }

    if (features.includes('ab-testing')) {
      scripts['ab:build'] = 'bun run build:ab-variant-a && bun run build:ab-variant-b';
      scripts['ab:test'] = 'bun run test:ab-validation';
      scripts['ab:compare'] = 'bun run compare:bundles';
    }

    if (features.includes('benchmarks')) {
      scripts['bench:all'] = 'bun run bench:performance && bun run bench:search';
      scripts['bench:performance'] = 'bun test --reporter=verbose';
      scripts['bench:search'] = 'bun scripts/search-benchmark.ts';
    }

    if (features.includes('history-cli')) {
      scripts['history'] = 'bun scripts/enhanced-history-cli.ts';
    }

    return scripts;
  }

  private async createSourceFiles(dir: string, name: string, variant: string): Promise<void> {
    const config = TEMPLATE_CONFIG.variants[variant as keyof typeof TEMPLATE_CONFIG.variants];

    // Main entry point
    const mainContent = `#!/usr/bin/env bun
// src/index.ts - Surgical Precision Platform Entry Point

console.info('🔬 ${name} - Surgical Precision Platform');
console.info('🚀 Starting up...');
console.info('');

${config.features.includes('mcp') ? `
// Start MCP server if enabled
import './mcp-init.ts';
` : ''}

${config.features.includes('ab-testing') ? `
// Load A/B testing configuration
import './ab-config.ts';
` : ''}

console.info('✅ Platform initialized successfully!');
console.info('');
console.info('🎯 Available commands:');
console.info('   bun run help    - Show help');
${config.features.includes('mcp') ? 'console.info(\'   bun run mcp:start - Start MCP server\');' : ''}
${config.features.includes('ab-testing') ? 'console.info(\'   bun run ab:test   - Run A/B tests\');' : ''}
console.info('');

// Keep the process alive if MCP server is running
${config.features.includes('mcp') ? `
process.on('SIGINT', () => {
  console.info('\\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Keep alive
setInterval(() => {}, 1000);
` : ''}
`;

    writeFileSync(join(dir, 'src/index.ts'), mainContent);

    // MCP initialization if enabled
    if (config.features.includes('mcp')) {
      const mcpInitContent = `// src/mcp-init.ts - MCP Server Initialization
import { BunMCPServer } from '../mcp/server.ts';

console.info('🔍 Initializing MCP CodeSearch server...');

const server = new BunMCPServer();
server.start().catch(error => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});
`;
      writeFileSync(join(dir, 'src/mcp-init.ts'), mcpInitContent);
    }

    // A/B testing config if enabled
    if (config.features.includes('ab-testing')) {
      const abConfigContent = `// src/ab-config.ts - A/B Testing Configuration
export const AB_CONFIG = {
  variant: 'A', // This would be determined by feature flags at build time
  algorithm: 'conservative',
  riskThreshold: 0.1,
  features: ['basic-analytics', 'conservative-logging']
};

console.info('🧪 A/B Testing Config:', AB_CONFIG);
`;
      writeFileSync(join(dir, 'src/ab-config.ts'), abConfigContent);
    }

    console.info('📝 Created source files');
  }

  private async createConfigFiles(dir: string, variant: string): Promise<void> {
    const config = TEMPLATE_CONFIG.variants[variant as keyof typeof TEMPLATE_CONFIG.variants];

    // Create bunfig.toml
    const bunfigContent = `# bunfig.toml - Bun Configuration
[install]
# Use latest versions
registry = "https://registry.npmjs.org"

[build]
# Build configuration
target = "bun"
outdir = "dist"

${config.features.includes('mcp') ? `
[serve]
# MCP server configuration
port = 8787
hostname = "localhost"
` : ''}
`;

    writeFileSync(join(dir, 'bunfig.toml'), bunfigContent);

    // Create TypeScript config
    const tsconfigContent = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": [
    "src/**/*",
    "mcp/**/*",
    "utils/**/*",
    "__tests__/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}`;
    writeFileSync(join(dir, 'tsconfig.json'), tsconfigContent);

    // Create ESLint config
    const eslintContent = `{
  "extends": ["@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}`;
    writeFileSync(join(dir, 'eslint.config.js'), eslintContent);

    console.info('⚙️ Created configuration files');
  }

  private async createDocumentation(dir: string, name: string, variant: string): Promise<void> {
    const config = TEMPLATE_CONFIG.variants[variant as keyof typeof TEMPLATE_CONFIG.variants];

    // Create README.md
    const readmeContent = `# ${name}

${config.description}

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
bun install

# Start development
bun run dev

${config.features.includes('mcp') ? `# Start MCP server (in another terminal)
bun run mcp:start` : ''}
\`\`\`

## 📋 Features

${config.features.map(feature => `- ✅ ${feature}`).join('\n')}

## 🛠️ Available Scripts

${Object.entries(this.generateScripts(config.features)).map(([cmd, script]) =>
  `- \`bun run ${cmd}\` - ${script}`
).join('\n')}

## 📚 Documentation

- [Surgical Precision Platform](${TEMPLATE_CONFIG.repository})
- [Bun Documentation](https://bun.sh/docs)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

${TEMPLATE_CONFIG.license} - ${TEMPLATE_CONFIG.author}
`;

    writeFileSync(join(dir, 'README.md'), readmeContent);

    // Create help script
    const helpContent = `#!/usr/bin/env bun
// scripts/help.ts - Help system for ${name}

console.info('🖥️  ${name} - Surgical Precision Platform');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('');
console.info('${config.description}');
console.info('');
console.info('📋 Available Commands:');
console.info('');

// Group commands by category
const commands = {
  'Development': {
    'bun run dev': 'Start development server',
    'bun run build': 'Build for production',
    'bun run test': 'Run test suite'
  },
  'Code Quality': {
    'bun run lint': 'Check code style',
    'bun run type-check': 'Verify TypeScript types'
  }
};

${config.features.includes('mcp') ? `
commands['MCP Server'] = {
  'bun run mcp:start': 'Start MCP code search server',
  'bun run mcp:search': 'Test MCP search API',
  'bun run mcp:health': 'Check MCP server health'
};` : ''}

${config.features.includes('ab-testing') ? `
commands['A/B Testing'] = {
  'bun run ab:build': 'Build A/B test variants',
  'bun run ab:test': 'Run A/B validation tests',
  'bun run ab:compare': 'Compare bundle sizes'
};` : ''}

${config.features.includes('benchmarks') ? `
commands['Benchmarks'] = {
  'bun run bench:all': 'Run all benchmarks',
  'bun run bench:performance': 'Performance benchmarks',
  'bun run bench:search': 'Search speed benchmarks'
};` : ''}

for (const [category, cmds] of Object.entries(commands)) {
  console.info(\`\${category}:\`);
  for (const [cmd, desc] of Object.entries(cmds)) {
    console.info(\`  \${cmd.padEnd(20)} - \${desc}\`);
  }
  console.info('');
}

console.info('📚 For more information:');
console.info('  README.md          - Project documentation');
console.info('  docs/              - Additional documentation');
console.info('');
`;

    writeFileSync(join(dir, 'scripts/help.ts'), helpContent);

    console.info('📚 Created documentation');
  }

  private async initializeGit(dir: string): Promise<void> {
    try {
      const { exitCode } = await Bun.spawn(['git', 'init'], { cwd: dir });
      if (exitCode === 0) {
        console.info('📋 Initialized Git repository');
      }
    } catch (error) {
      console.warn('⚠️  Git initialization skipped (git not available)');
    }
  }
}

// Export for use in Bun.create()
export const surgicalPrecisionTemplate = new SurgicalPrecisionTemplate();

// Test the template (only runs when called directly)
if (import.meta.main) {
  const template = new SurgicalPrecisionTemplate();

  // Test scaffold
  const testDir = './test-surgical-precision-app';
  const testName = 'my-test-app';

  console.info('🧪 Testing template scaffold...');
  await template.scaffoldProject(testDir, testName, 'full-platform');

  // Verify creation
  const exists = await Bun.file(`${testDir}/src/index.ts`).exists();
  console.assert(exists, 'Template file should be created');

  console.info('✅ Template test passed!');
  console.info(`📁 Created test app in: ${testDir}`);
  console.info('💡 You can now cd into the directory and run: bun install && bun run dev');
}