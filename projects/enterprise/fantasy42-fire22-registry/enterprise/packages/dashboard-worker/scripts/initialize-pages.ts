#!/usr/bin/env bun

/**
 * 🚀 Initialize GitHub Pages & Wiki System
 * Sets up all necessary directories and initial content
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

class PagesInitializer {
  async initialize(): Promise<void> {
    console.info('🚀 Initializing GitHub Pages & Wiki System');
    console.info('!==!==!==!==!==!==!==!==\n');

    // Create necessary directories
    await this.createDirectories();

    // Create initial wiki content
    await this.createInitialWiki();

    // Create initial department data
    await this.createDepartmentData();

    console.info('\n✅ Initialization complete!');
    console.info('\n📝 You can now run:');
    console.info('  1. bun run pages:build - Build GitHub Pages');
    console.info('  2. bun run wiki:mirror - Mirror wiki content');
    console.info('  3. bun run departments:generate - Generate department pages');
    console.info('  4. bun run validate:deployment - Validate deployments');
    console.info('  5. git add . && git commit -m "feat: add GitHub Pages & Wiki mirror system"');
    console.info('  6. git push origin main - Trigger GitHub Actions deployment');
  }

  private async createDirectories(): Promise<void> {
    console.info('📁 Creating directories...');

    const directories = [
      'wiki',
      'wiki/departments',
      'wiki/api',
      'wiki/development',
      'wiki/architecture',
      'wiki/operations',
      'dist/pages',
      'dist/pages/wiki',
      'dist/pages/departments',
      'reports',
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.info(`  ✅ Created: ${dir}`);
      } else {
        console.info(`  ⏭️ Exists: ${dir}`);
      }
    }
  }

  private async createInitialWiki(): Promise<void> {
    console.info('\n📚 Creating initial wiki content...');

    const wikiHome = `# Fire22 Dashboard Wiki

Welcome to the Fire22 Dashboard Wiki!

## Quick Links

- [Getting Started](Getting-Started.md)
- [Departments](departments/)
- [API Documentation](api/)
- [Development Guide](development/)
- [Architecture](architecture/)
- [Operations](operations/)

## About Fire22

Fire22 is a comprehensive dashboard system for managing sports betting operations, customer relationships, and agent hierarchies.

## Features

- 🏢 Multi-department management
- 📊 Real-time analytics
- 🔒 Secure authentication
- 🌍 Multi-language support
- 📱 Mobile-responsive design
- ⚡ High-performance architecture

## Getting Help

- 📧 Email: support@fire22.ag
- 📞 Phone: 1-800-FIRE-22
- 💬 Chat: Available in dashboard

---

*Last updated: ${new Date().toISOString()}*`;

    const gettingStarted = `# Getting Started

## Prerequisites

- Bun >= 1.2.20
- Node.js >= 18 (optional)
- Git

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/fire22-dashboard-worker.git

# Navigate to project directory
cd fire22-dashboard-worker

# Install dependencies
bun install --frozen-lockfile
\`\`\`

## Development

\`\`\`bash
# Start development server
bun run dev

# Start Express server
bun run dev-server

# Run tests
bun test
\`\`\`

## Building

\`\`\`bash
# Build for production
bun run build:production

# Build GitHub Pages
bun run pages:build

# Build executables
bun run build:executable
\`\`\`

## Deployment

\`\`\`bash
# Deploy to Cloudflare Workers
bun run deploy

# Deploy to GitHub Pages
git push origin main
\`\`\`

## Configuration

See [Configuration Guide](configuration.md) for detailed setup instructions.

---

*Last updated: ${new Date().toISOString()}*`;

    if (!existsSync('wiki/Home.md')) {
      writeFileSync('wiki/Home.md', wikiHome);
      console.info('  ✅ Created: wiki/Home.md');
    }

    if (!existsSync('wiki/Getting-Started.md')) {
      writeFileSync('wiki/Getting-Started.md', gettingStarted);
      console.info('  ✅ Created: wiki/Getting-Started.md');
    }
  }

  private async createDepartmentData(): Promise<void> {
    console.info('\n🏢 Creating department data...');

    const deptConfig = {
      departments: [
        {
          id: 'finance',
          name: 'Finance Department',
          email: 'finance@fire22.ag',
          domain: 'finance.fire22.ag',
          color: '#28a745',
          icon: '💰',
          description: 'Manages financial operations, transactions, and reporting.',
        },
        {
          id: 'support',
          name: 'Customer Support',
          email: 'support@fire22.ag',
          domain: 'support.fire22.ag',
          color: '#17a2b8',
          icon: '🎧',
          description: 'Provides 24/7 customer assistance and issue resolution.',
        },
        {
          id: 'compliance',
          name: 'Compliance & Legal',
          email: 'compliance@fire22.ag',
          domain: 'compliance.fire22.ag',
          color: '#6610f2',
          icon: '⚖️',
          description: 'Ensures regulatory compliance and legal requirements.',
        },
        {
          id: 'operations',
          name: 'Operations',
          email: 'operations@fire22.ag',
          domain: 'operations.fire22.ag',
          color: '#fd7e14',
          icon: '⚙️',
          description: 'Manages day-to-day operations and process optimization.',
        },
        {
          id: 'technology',
          name: 'Technology',
          email: 'tech@fire22.ag',
          domain: 'tech.fire22.ag',
          color: '#6f42c1',
          icon: '💻',
          description: 'Develops and maintains technical infrastructure.',
        },
        {
          id: 'marketing',
          name: 'Marketing',
          email: 'marketing@fire22.ag',
          domain: 'marketing.fire22.ag',
          color: '#e83e8c',
          icon: '📢',
          description: 'Handles marketing campaigns and brand management.',
        },
        {
          id: 'management',
          name: 'Management',
          email: 'management@fire22.ag',
          domain: 'management.fire22.ag',
          color: '#dc3545',
          icon: '👔',
          description: 'Executive leadership and strategic planning.',
        },
        {
          id: 'hr',
          name: 'Human Resources',
          email: 'hr@fire22.ag',
          domain: 'hr.fire22.ag',
          color: '#20c997',
          icon: '👥',
          description: 'Manages recruitment, training, and employee relations.',
        },
        {
          id: 'qa',
          name: 'Quality Assurance',
          email: 'qa@fire22.ag',
          domain: 'qa.fire22.ag',
          color: '#ffc107',
          icon: '✅',
          description: 'Ensures quality standards and testing processes.',
        },
        {
          id: 'contributors',
          name: 'Team Contributors',
          email: 'team@fire22.ag',
          domain: 'team.fire22.ag',
          color: '#795548',
          icon: '🤝',
          description: 'Community contributors and external partners.',
        },
      ],
    };

    const configPath = 'src/departments/config.json';
    const configDir = 'src/departments';

    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    if (!existsSync(configPath)) {
      writeFileSync(configPath, JSON.stringify(deptConfig, null, 2));
      console.info('  ✅ Created: src/departments/config.json');
    } else {
      console.info('  ⏭️ Exists: src/departments/config.json');
    }
  }
}

// Run initialization
const initializer = new PagesInitializer();
initializer.initialize().catch(console.error);
