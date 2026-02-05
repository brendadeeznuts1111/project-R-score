#!/usr/bin/env bun
/**
 * Modular Dashboard Generator
 * Generates dashboards using the modular configuration system
 * 
 * Features:
 * - Theme-based dashboard generation
 * - Consistent styling across all dashboards
 * - Dynamic endpoint integration
 * - Unified component library
 * - Auto-generated navigation
 */

import { modularSystem, ColorSchemes, Endpoints, Dashboards } from '../config/modular-system.ts';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface DashboardTemplate {
  header: string;
  navigation: string;
  content: string;
  footer: string;
  styles: string;
  scripts: string;
}

class ModularDashboardGenerator {
  private outputDir: string;

  constructor(outputDir: string = './generated-dashboards') {
    this.outputDir = outputDir;
  }

  /**
   * Generate all dashboards using modular configuration
   */
  async generateAllDashboards(): Promise<void> {
    console.log('🏗️  Generating Modular Dashboards...');
    console.log('=====================================');

    // Ensure output directory exists
    await mkdir(this.outputDir, { recursive: true });

    // Generate each dashboard
    for (const [id, config] of Object.entries(Dashboards)) {
      await this.generateDashboard(id, config);
    }

    // Generate main index
    await this.generateMainIndex();

    console.log(`✅ Generated ${Object.keys(Dashboards).length} dashboards in ${this.outputDir}`);
  }

  /**
   * Generate individual dashboard
   */
  private async generateDashboard(id: string, config: any): Promise<void> {
    console.log(`📱 Generating ${config.name}...`);

    const colorScheme = ColorSchemes[config.colorScheme];
    const template = this.buildDashboardTemplate(id, config, colorScheme);
    
    const filename = `${id}.html`;
    const filepath = join(this.outputDir, filename);
    
    await writeFile(filepath, template);
    console.log(`   ✅ Generated: ${filename}`);
  }

  /**
   * Build dashboard template
   */
  private buildDashboardTemplate(id: string, config: any, colors: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title} | ${config.subtitle}</title>
    <meta name="description" content="${config.description}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.generateStyles(colors)}
    </style>
</head>
<body class="bg-gray-50">
    ${this.generateHeader(config, colors)}
    ${this.generateNavigation()}
    ${this.generateContent(id, config, colors)}
    ${this.generateFooter(colors)}
    ${this.generateScripts(id, config)}
</body>
</html>`;
  }

  /**
   * Generate dynamic styles
   */
  private generateStyles(colors: any): string {
    return `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
        .gradient-text {
            background: ${colors.gradient};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .btn-primary {
            background: ${colors.gradient};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        .btn-primary:hover {
            background: ${colors.gradientSecondary};
            transform: translateY(-1px);
        }
        .status-card {
            background: linear-gradient(135deg, ${colors.surface} 0%, ${colors.background} 100%);
            border: 1px solid ${colors.border};
            transition: all 0.3s ease;
        }
        .status-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
        }
        .status-operational { background-color: ${colors.success}; }
        .status-degraded { background-color: ${colors.warning}; }
        .status-outage { background-color: ${colors.error}; }
        .status-maintenance { background-color: ${colors.textSecondary}; }
        /* Dark mode support */
        .dark {
            background-color: #3b82f6;
            color: #3b82f6;
        }
        .dark .bg-white {
            background-color: #3b82f6 !important;
        }
        .dark .text-gray-900 {
            color: #3b82f6 !important;
        }
        .dark .border-gray-200 {
            border-color: #3b82f6 !important;
        }
        .dark .status-card {
            background: linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%);
            border-color: #3b82f6;
        }
        /* Theme transition */
        * {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
    `;
  }

  /**
   * Generate header
   */
  private generateHeader(config: any, colors: any): string {
    return `
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-3">
                    <i data-lucide="${config.icon}" class="w-8 h-8" style="color: ${colors.primary}"></i>
                    <h1 class="text-2xl font-bold gradient-text">${config.title}</h1>
                    <span class="text-sm text-gray-600 ml-2">${config.subtitle}</span>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <span class="status-indicator status-operational"></span>
                        <span class="text-sm text-gray-600">All Systems Operational</span>
                    </div>
                    <button onclick="toggleTheme()" class="p-2 rounded-lg hover:bg-gray-100" title="Toggle Theme">
                        <i data-lucide="moon" class="w-5 h-5"></i>
                    </button>
                    <button onclick="refreshDashboard()" class="btn-primary">
                        <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-2"></i>
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    </header>`;
  }

  /**
   * Generate navigation
   */
  private generateNavigation(): string {
    const navItems = Object.entries(Dashboards).map(([id, config]) => 
      `<a href="${config.url}" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
        ${config.name}
      </a>`
    ).join('');

    return `
    <!-- Navigation -->
    <nav class="bg-gray-100 border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex space-x-8 h-10 items-center">
                ${navItems}
            </div>
        </div>
    </nav>`;
  }

  /**
   * Generate content based on dashboard type
   */
  private generateContent(id: string, config: any, colors: any): string {
    const endpoint = Endpoints[id];
    
    let content = `
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Dashboard Info -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 mb-2">${config.name}</h2>
                    <p class="text-gray-600">${config.description}</p>
                    <div class="flex items-center space-x-4 mt-4">
                        <span class="text-sm text-gray-500">Version: ${config.version}</span>
                        <span class="text-sm text-gray-500">Updated: ${config.lastUpdated}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    ${endpoint ? `<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Connected</span>` : ''}
                    <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${config.category}</span>
                </div>
            </div>
        </div>`;

    // Add endpoint-specific content
    if (endpoint) {
      content += this.generateEndpointContent(endpoint, colors);
    }

    // Add features section
    content += this.generateFeaturesContent(config.features, colors);

    content += `
    </main>`;

    return content;
  }

  /**
   * Generate endpoint-specific content
   */
  private generateEndpointContent(endpoint: any, colors: any): string {
    return `
        <!-- Endpoint Status -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Endpoint Status</h3>
            <div class="space-y-4">
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                        <h4 class="font-medium text-gray-900">${endpoint.name}</h4>
                        <p class="text-sm text-gray-600">${endpoint.description}</p>
                        <code class="text-xs bg-gray-100 px-2 py-1 rounded">${endpoint.url}</code>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="status-indicator status-operational"></span>
                        <span class="text-sm text-gray-600">Online</span>
                    </div>
                </div>
            </div>
        </div>`;
  }

  /**
   * Generate features content
   */
  private generateFeaturesContent(features: string[], colors: any): string {
    const featureCards = features.map(feature => `
        <div class="status-card p-6 rounded-lg">
            <div class="flex items-center space-x-3">
                <i data-lucide="check-circle" class="w-5 h-5" style="color: ${colors.success}"></i>
                <span class="font-medium text-gray-900">${feature}</span>
            </div>
        </div>
    `).join('');

    return `
        <!-- Features -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Features</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${featureCards}
            </div>
        </div>`;
  }

  /**
   * Generate footer
   */
  private generateFooter(colors: any): string {
    return `
    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Powered by</span>
                    <span class="text-sm font-medium" style="color: ${colors.primary}">Modular System</span>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="text-sm text-gray-500">Generated: ${new Date().toISOString()}</span>
                    <button onclick="exportConfig()" class="text-sm text-gray-600 hover:text-gray-900">
                        Export Config
                    </button>
                </div>
            </div>
        </div>
    </footer>`;
  }

  /**
   * Generate scripts
   */
  private generateScripts(id: string, config: any): string {
    return `
    <script>
        // Theme Management
        function toggleTheme() {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        }

        // Load saved theme
        if (localStorage.getItem('theme') === 'dark' || 
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark');
        }

        // Refresh dashboard
        function refreshDashboard() {
            window.location.reload();
        }

        // Export configuration
        function exportConfig() {
            const config = ${JSON.stringify(config, null, 2)};
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '${id}-config.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        // Initialize Lucide icons
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    </script>`;
  }

  /**
   * Generate main index with all dashboards
   */
  private async generateMainIndex(): Promise<void> {
    console.log('📋 Generating main index...');

    const dashboardCards = Object.entries(Dashboards).map(([id, config]) => {
      const colors = ColorSchemes[config.colorScheme];
      return `
        <div class="status-card p-6 rounded-lg hover:shadow-lg transition-all cursor-pointer" onclick="window.open('${config.url}', '_blank')">
            <div class="flex items-start space-x-4">
                <div class="p-3 rounded-lg" style="background-color: ${colors.primary}20;">
                    <i data-lucide="${config.icon}" class="w-6 h-6" style="color: ${colors.primary}"></i>
                </div>
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">${config.name}</h3>
                    <p class="text-sm text-gray-600 mb-3">${config.description}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${config.category}</span>
                            <span class="text-xs text-gray-500">v${config.version}</span>
                        </div>
                        <button class="text-sm font-medium" style="color: ${colors.primary}">
                            Launch →
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modular Dashboard System | Enterprise Suite</title>
    <meta name="description" content="Enterprise modular dashboard system with unified theming and configuration">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        ${this.generateStyles(ColorSchemes.enterprise)}
    </style>
</head>
<body class="bg-gray-50">
    <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-3">
                    <i data-lucide="layout-dashboard" class="w-8 h-8 text-blue-500"></i>
                    <h1 class="text-2xl font-bold gradient-text">Modular Dashboard System</h1>
                    <span class="text-sm text-gray-600 ml-2">Enterprise Suite</span>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="flex items-center space-x-2">
                        <span class="status-indicator status-operational"></span>
                        <span class="text-sm text-gray-600">${Object.keys(Dashboards).length} Dashboards</span>
                    </span>
                    <button onclick="toggleTheme()" class="p-2 rounded-lg hover:bg-gray-100">
                        <i data-lucide="moon" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Overview Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="status-card p-6 rounded-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Total Dashboards</p>
                        <p class="text-3xl font-bold text-gray-900">${Object.keys(Dashboards).length}</p>
                        <p class="text-xs text-green-600 mt-1">All operational</p>
                    </div>
                    <i data-lucide="layout-dashboard" class="w-8 h-8 text-blue-500"></i>
                </div>
            </div>
            <div class="status-card p-6 rounded-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Endpoints</p>
                        <p class="text-3xl font-bold text-gray-900">${Object.keys(Endpoints).length}</p>
                        <p class="text-xs text-green-600 mt-1">Connected</p>
                    </div>
                    <i data-lucide="link" class="w-8 h-8 text-green-500"></i>
                </div>
            </div>
            <div class="status-card p-6 rounded-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Color Schemes</p>
                        <p class="text-3xl font-bold text-gray-900">${Object.keys(ColorSchemes).length}</p>
                        <p class="text-xs text-green-600 mt-1">Available</p>
                    </div>
                    <i data-lucide="palette" class="w-8 h-8 text-purple-500"></i>
                </div>
            </div>
            <div class="status-card p-6 rounded-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">Categories</p>
                        <p class="text-3xl font-bold text-gray-900">6</p>
                        <p class="text-xs text-green-600 mt-1">Covered</p>
                    </div>
                    <i data-lucide="folder" class="w-8 h-8 text-orange-500"></i>
                </div>
            </div>
        </div>

        <!-- Dashboard Grid -->
        <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900">Available Dashboards</h2>
                <button onclick="exportAllConfigs()" class="btn-primary">
                    <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
                    Export All
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${dashboardCards}
            </div>
        </div>
    </main>

    <script>
        function toggleTheme() {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        }

        function exportAllConfigs() {
            const configs = ${JSON.stringify(Dashboards, null, 2)};
            const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'all-dashboard-configs.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        // Load saved theme
        if (localStorage.getItem('theme') === 'dark' || 
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark');
        }

        // Initialize Lucide icons
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });
    </script>
</body>
</html>`;

    await writeFile(join(this.outputDir, 'index.html'), indexContent);
    console.log('   ✅ Generated: index.html');
  }
}

// CLI interface
async function main() {
  const generator = new ModularDashboardGenerator();
  
  try {
    await generator.generateAllDashboards();
    console.log('🎉 Modular Dashboard Generation Complete!');
    console.log('📱 Open: ./generated-dashboards/index.html');
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { ModularDashboardGenerator };
