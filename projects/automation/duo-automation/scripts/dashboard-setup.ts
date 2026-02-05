#!/usr/bin/env bun
/**
 * Dashboard Setup Script
 * 
 * Creates new dashboards with proper headers, footers, and components
 * based on the component system.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const COMPONENTS_DIR = 'components';
const DASHBOARDS_DIR = 'dashboards';

// Type definitions
interface DashboardTemplate {
    title: string;
    description: string;
    userRole: string;
    permissions: string[];
    components: string[];
}

interface DashboardConfig {
    title?: string;
    description?: string;
    userRole?: string;
    permissions?: string[];
    apiBaseUrl?: string;
    components?: string[];
}

interface ComponentTemplate {
    url: string;
    permissions?: string[];
    dependencies?: string[];
    initFunction?: string;
    cssFiles?: string[];
    jsFiles?: string[];
}

// Dashboard templates
const DASHBOARD_TEMPLATES: Record<string, DashboardTemplate> = {
    admin: {
        title: 'Admin Dashboard',
        description: 'Full system administration and management',
        userRole: 'admin',
        permissions: ['*'],
        components: [
            'metrics-grid',
            'activity-log',
            'agent-management',
            'rbac-control',
            'log-management',
            'connection-pool',
            'system-config',
            'user-management',
            'system-backup',
            'security-audit'
        ]
    },
    operator: {
        title: 'Operator Dashboard',
        description: 'System operations and monitoring',
        userRole: 'operator',
        permissions: [
            'header.view', 'footer.view', 'sidebar.view',
            'dashboard.view', 'metrics.view', 'metrics.export',
            'logs.view', 'logs.export',
            'agents.view', 'agents.create',
            'rbac.view', 'connections.view',
            'analytics.view'
        ],
        components: [
            'metrics-grid',
            'activity-log',
            'agent-management',
            'connection-pool',
            'analytics'
        ]
    },
    user: {
        title: 'User Dashboard',
        description: 'Personal dashboard and basic monitoring',
        userRole: 'viewer',
        permissions: [
            'header.view', 'footer.view', 'sidebar.view',
            'dashboard.view', 'metrics.view',
            'logs.view'
        ],
        components: [
            'metrics-grid',
            'activity-log'
        ]
    },
    analytics: {
        title: 'Analytics Dashboard',
        description: 'Advanced analytics and reporting',
        userRole: 'auditor',
        permissions: [
            'header.view', 'footer.view', 'sidebar.view',
            'dashboard.view', 'metrics.view', 'metrics.export',
            'logs.view', 'logs.export', 'logs.advanced',
            'analytics.view'
        ],
        components: [
            'metrics-grid',
            'activity-log',
            'log-management',
            'analytics'
        ]
    }
};

/**
 * Create a new dashboard
 */
function createDashboard(type: string, name: string, customConfig: DashboardConfig = {}) {
    const template = DASHBOARD_TEMPLATES[type];
    if (!template) {
        console.error(`❌ Unknown dashboard type: ${type}`);
        console.log('Available types:', Object.keys(DASHBOARD_TEMPLATES).join(', '));
        return;
    }

    // Ensure directories exist
    if (!existsSync(DASHBOARDS_DIR)) {
        mkdirSync(DASHBOARDS_DIR, { recursive: true });
    }

    // Load base template
    const baseTemplate = readFileSync(join(COMPONENTS_DIR, 'templates', 'dashboard-base.html'), 'utf8');

    // Replace placeholders
    let dashboardHtml = baseTemplate
        .replace(/{DASHBOARD_TYPE}/g, type)
        .replace(/{PAGE_TITLE}/g, customConfig.title || template.title)
        .replace(/{PAGE_DESCRIPTION}/g, customConfig.description || template.description)
        .replace(/{USER_ROLE}/g, customConfig.userRole || template.userRole)
        .replace(/{USER_PERMISSIONS}/g, JSON.stringify(customConfig.permissions || template.permissions))
        .replace(/{API_BASE_URL}/g, customConfig.apiBaseUrl || 'http://localhost:3002');

    // Add custom components
    if (customConfig.components) {
        dashboardHtml = addCustomComponents(dashboardHtml, customConfig.components);
    }

    // Write dashboard file
    const dashboardPath = join(DASHBOARDS_DIR, `${name}.html`);
    writeFileSync(dashboardPath, dashboardHtml);

    console.log(`✅ Dashboard created: ${dashboardPath}`);
    console.log(`📊 Type: ${type}`);
    console.log(`👤 Role: ${template.userRole}`);
    console.log(`🔧 Components: ${template.components.length + (customConfig.components?.length || 0)}`);
    
    return dashboardPath;
}

/**
 * Add custom components to dashboard
 */
function addCustomComponents(html: string, components: string[]): string {
    const additionalComponentsHtml = components.map((component: string) => {
        return `
        <!-- ${component} Component -->
        <div id="${component}" data-component="${component}" data-permission="${getComponentPermission(component)}">
            <!-- Component will be loaded here -->
        </div>`;
    }).join('\n');

    return html.replace(
        '<!-- Additional Components -->\n                <div id="additional-components">\n                    <!-- Components will be loaded here based on dashboard type -->\n                </div>',
        '<!-- Additional Components -->\n                <div id="additional-components">\n' + additionalComponentsHtml + '\n                </div>'
    );
}

/**
 * Get permission for component
 */
function getComponentPermission(componentId: string): string {
    const componentPermissions: Record<string, string> = {
        'metrics-grid': 'metrics.view',
        'activity-log': 'logs.view',
        'agent-management': 'agents.view',
        'rbac-control': 'rbac.view',
        'log-management': 'logs.advanced',
        'connection-pool': 'connections.view',
        'system-config': 'system.config',
        'user-management': 'admin.users',
        'system-backup': 'admin.backup',
        'security-audit': 'admin.security',
        'analytics': 'analytics.view'
    };
    
    return componentPermissions[componentId] || 'dashboard.view';
}

/**
 * List available dashboard templates
 */
function listTemplates(): void {
    console.log('\n📋 Available Dashboard Templates:');
    console.log('=====================================');
    
    Object.entries(DASHBOARD_TEMPLATES).forEach(([type, config]: [string, DashboardTemplate]) => {
        console.log(`\n🏷️  ${type.toUpperCase()}`);
        console.log(`   Title: ${config.title}`);
        console.log(`   Description: ${config.description}`);
        console.log(`   Role: ${config.userRole}`);
        console.log(`   Components: ${config.components.length}`);
        console.log(`   Permissions: ${config.permissions.length}`);
    });
}

/**
 * Create component file
 */
function createComponent(name: string, type: string = 'widget', permissions: string[] = []): string {
    const componentDir = join(COMPONENTS_DIR, type);
    
    if (!existsSync(componentDir)) {
        mkdirSync(componentDir, { recursive: true });
    }

    const componentTemplate = generateComponentTemplate(name, permissions);
    const componentPath = join(componentDir, `${name}.html`);
    
    writeFileSync(componentPath, componentTemplate);
    
    console.log(`✅ Component created: ${componentPath}`);
    console.log(`🏷️  Type: ${type}`);
    console.log(`🔐 Permissions: ${permissions.join(', ')}`);
    
    return componentPath;
}

/**
 * Generate component template
 */
function generateComponentTemplate(name: string, permissions: string[]): string {
    const permissionAttr = permissions.length > 0 ? 
        ` data-permission="${permissions.join(',')}"` : '';
    
    return `<!-- ${name} Component -->
<!-- Permissions: ${permissions.join(', ') || 'None'} -->
<div class="card mb-6"${permissionAttr} data-component="${name}">
    <div class="card-header">
        <h3 class="card-title flex items-center">
            <i data-lucide="box" class="w-5 h-5 mr-2"></i>
            ${name.charAt(0).toUpperCase() + name.slice(1)} Component
        </h3>
    </div>
    <div class="card-body">
        <p class="text-gray-400 mb-4">
            This is the ${name} component. Add your content here.
        </p>
        
        <!-- Component content goes here -->
        <div class="space-y-4">
            <div class="bg-gray-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-2">Component Features</h4>
                <ul class="text-sm text-gray-400 space-y-1">
                    <li>• Feature 1</li>
                    <li>• Feature 2</li>
                    <li>• Feature 3</li>
                </ul>
            </div>
        </div>
    </div>
</div>

<script>
// ${name} Component Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('[data-component="${name}"]')) {
        console.log('🔧 Initializing ${name} component...');
        
        // Initialize component functionality here
        // Example: load data, setup event listeners, etc.
        
        console.log('✅ ${name} component initialized');
    }
});
</script>`;
}

/**
 * Setup component system
 */
function setupComponentSystem(): void {
    console.log('🔧 Setting up component system...');
    
    // Create directories if they don't exist
    const directories: string[] = [
        'components/shared',
        'components/widgets',
        'components/features',
        'components/styles',
        'components/scripts',
        'components/templates',
        'dashboards'
    ];
    
    directories.forEach((dir: string) => {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
    
    console.log('✅ Component system setup complete');
}

/**
 * Main CLI interface
 */
function main(): void {
    const args: string[] = process.argv.slice(2);
    const command: string = args[0];
    
    switch (command) {
        case 'create':
            if (args.length < 3) {
                console.log('Usage: bun run dashboard-setup.ts create <type> <name> [options]');
                console.log('Example: bun run dashboard-setup.ts create admin my-admin-dashboard');
                return;
            }
            
            const type: string = args[1];
            const name: string = args[2];
            const customConfig: Record<string, any> = {};
            
            // Parse custom options
            for (let i = 3; i < args.length; i++) {
                const [key, value] = args[i].split('=');
                if (key && value) {
                    if (key === 'permissions') {
                        customConfig[key] = value.split(',');
                    } else {
                        customConfig[key] = value;
                    }
                }
            }
            
            createDashboard(type, name, customConfig as DashboardConfig);
            break;
            
        case 'component':
            if (args.length < 2) {
                console.log('Usage: bun run dashboard-setup.ts component <name> [type] [permissions...]');
                console.log('Example: bun run dashboard-setup.ts component my-widget widget metrics.view logs.view');
                return;
            }
            
            const componentName: string = args[1];
            const componentType: string = args[2] || 'widget';
            const componentPermissions: string[] = args.slice(3);
            
            createComponent(componentName, componentType, componentPermissions);
            break;
            
        case 'list':
            listTemplates();
            break;
            
        case 'setup':
            setupComponentSystem();
            break;
            
        default:
            console.log('DuoPlus Dashboard Setup Script');
            console.log('================================');
            console.log('');
            console.log('Commands:');
            console.log('  create <type> <name>     Create a new dashboard');
            console.log('  component <name> [type] Create a new component');
            console.log('  list                      List available templates');
            console.log('  setup                     Setup component system');
            console.log('');
            console.log('Dashboard Types:');
            console.log('  admin     - Full system administration');
            console.log('  operator  - System operations and monitoring');
            console.log('  user      - Basic user dashboard');
            console.log('  analytics - Advanced analytics and reporting');
            console.log('');
            console.log('Component Types:');
            console.log('  shared    - Shared components (header, footer, sidebar)');
            console.log('  widget    - UI widgets and components');
            console.log('  feature   - Feature-specific components');
            console.log('');
            console.log('Examples:');
            console.log('  bun run dashboard-setup.ts create admin my-dashboard');
            console.log('  bun run dashboard-setup.ts component my-chart widget metrics.view');
            console.log('  bun run dashboard-setup.ts list');
            break;
    }
}

// Run CLI
if (import.meta.main) {
    main();
}

export { createDashboard, createComponent, listTemplates, setupComponentSystem };
