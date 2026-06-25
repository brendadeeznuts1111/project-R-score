// Modular Dashboard System - Enterprise Suite with Scope & Type Management
export interface DashboardScope {
  id: string;
  name: string;
  level: 'ENTERPRISE' | 'DEVELOPMENT' | 'PRODUCTION' | 'LOCAL-SANDBOX';
  permissions: string[];
  features: string[];
  timezone: string;
}

export interface DashboardModule {
  id: string;
  name: string;
  type: 'analytics' | 'merchant' | 'developer' | 'security' | 'revenue' | 'monitoring';
  scope: DashboardScope;
  components: ModuleComponent[];
  config: ModuleConfig;
  status: 'active' | 'inactive' | 'loading';
}

export interface ModuleComponent {
  id: string;
  name: string;
  type: 'chart' | 'metric' | 'table' | 'form' | 'widget';
  data: any;
  config: ComponentConfig;
  dependencies: string[];
}

export interface ModuleConfig {
  refreshInterval: number;
  autoLoad: boolean;
  cacheEnabled: boolean;
  permissions: string[];
  apiEndpoints: string[];
}

export interface ComponentConfig {
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number };
  draggable: boolean;
  resizable: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface EnterpriseSuite {
  modules: DashboardModule[];
  scopes: DashboardScope[];
  layout: LayoutConfig;
  theme: ThemeConfig;
  permissions: PermissionConfig;
}

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  breakpoints: Record<string, number>;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customCSS: string;
}

export interface PermissionConfig {
  roles: Record<string, string[]>;
  permissions: string[];
  accessControl: 'RBAC' | 'ABAC' | 'CUSTOM';
}

export class ModularDashboardSystem {
  private enterpriseSuite: EnterpriseSuite;
  private activeModules: Map<string, DashboardModule> = new Map();
  private componentRegistry: Map<string, ModuleComponent> = new Map();

  constructor() {
    this.enterpriseSuite = this.initializeEnterpriseSuite();
  }

  private initializeEnterpriseSuite(): EnterpriseSuite {
    return {
      modules: this.createDefaultModules(),
      scopes: this.createDefaultScopes(),
      layout: this.createDefaultLayout(),
      theme: this.createDefaultTheme(),
      permissions: this.createDefaultPermissions()
    };
  }

  private createDefaultScopes(): DashboardScope[] {
    return [
      {
        id: 'enterprise',
        name: 'Enterprise Scope',
        level: 'ENTERPRISE',
        permissions: ['admin', 'read', 'write', 'delete', 'manage'],
        features: ['analytics', 'security', 'revenue', 'monitoring', 'merchant', 'developer'],
        timezone: 'America/New_York'
      },
      {
        id: 'development',
        name: 'Development Scope',
        level: 'DEVELOPMENT',
        permissions: ['read', 'write', 'debug'],
        features: ['analytics', 'monitoring', 'developer'],
        timezone: 'Europe/London'
      },
      {
        id: 'production',
        name: 'Production Scope',
        level: 'PRODUCTION',
        permissions: ['read', 'monitor', 'alert'],
        features: ['monitoring', 'security', 'analytics'],
        timezone: 'UTC'
      },
      {
        id: 'local-sandbox',
        name: 'Local Sandbox Scope',
        level: 'LOCAL-SANDBOX',
        permissions: ['read', 'write', 'test'],
        features: ['developer', 'analytics'],
        timezone: 'UTC'
      }
    ];
  }

  private createDefaultModules(): DashboardModule[] {
    return [
      // Enterprise Analytics Module
      {
        id: 'enterprise-analytics',
        name: 'Enterprise Analytics',
        type: 'analytics',
        scope: this.createDefaultScopes()[0],
        components: [
          {
            id: 'revenue-chart',
            name: 'Revenue Growth Chart',
            type: 'chart',
            data: { type: 'line', datasets: [] },
            config: {
              size: 'large',
              position: { x: 0, y: 0 },
              draggable: true,
              resizable: true,
              theme: 'auto'
            },
            dependencies: ['revenue-api', 'analytics-service']
          },
          {
            id: 'merchant-metrics',
            name: 'Merchant Metrics',
            type: 'metric',
            data: { merchants: 19, mrr: 7000, growth: '+26.7%' },
            config: {
              size: 'medium',
              position: { x: 2, y: 0 },
              draggable: true,
              resizable: false,
              theme: 'auto'
            },
            dependencies: ['merchant-api']
          }
        ],
        config: {
          refreshInterval: 30000,
          autoLoad: true,
          cacheEnabled: true,
          permissions: ['admin', 'read'],
          apiEndpoints: ['/api/analytics/revenue', '/api/merchants/metrics']
        },
        status: 'active'
      },

      // Merchant Dashboard Module
      {
        id: 'merchant-dashboard',
        name: 'Merchant Dashboard',
        type: 'merchant',
        scope: this.createDefaultScopes()[0],
        components: [
          {
            id: 'dispute-resolution',
            name: 'Dispute Resolution',
            type: 'table',
            data: { cases: [], total: 1247 },
            config: {
              size: 'large',
              position: { x: 0, y: 2 },
              draggable: true,
              resizable: true,
              theme: 'auto'
            },
            dependencies: ['dispute-api']
          },
          {
            id: 'identity-verification',
            name: 'Identity Verification',
            type: 'metric',
            data: { successRate: 90.2, verified: '$johnsmith' },
            config: {
              size: 'medium',
              position: { x: 2, y: 2 },
              draggable: true,
              resizable: false,
              theme: 'auto'
            },
            dependencies: ['identity-api']
          }
        ],
        config: {
          refreshInterval: 15000,
          autoLoad: true,
          cacheEnabled: true,
          permissions: ['admin', 'read', 'write'],
          apiEndpoints: ['/api/merchants/disputes', '/api/identity/verification']
        },
        status: 'active'
      },

      // Developer Portal Module
      {
        id: 'developer-portal',
        name: 'Developer Portal',
        type: 'developer',
        scope: this.createDefaultScopes()[1],
        components: [
          {
            id: 'sdk-metrics',
            name: 'SDK Metrics',
            type: 'chart',
            data: { downloads: 50000, platforms: ['js', 'py', 'php', 'go'] },
            config: {
              size: 'medium',
              position: { x: 0, y: 0 },
              draggable: true,
              resizable: true,
              theme: 'auto'
            },
            dependencies: ['sdk-api']
          },
          {
            id: 'api-usage',
            name: 'API Usage',
            type: 'metric',
            data: { requests: 60, rate: '60/day', success: '99.2%' },
            config: {
              size: 'medium',
              position: { x: 1, y: 0 },
              draggable: true,
              resizable: false,
              theme: 'auto'
            },
            dependencies: ['api-analytics']
          }
        ],
        config: {
          refreshInterval: 60000,
          autoLoad: true,
          cacheEnabled: true,
          permissions: ['read', 'write', 'debug'],
          apiEndpoints: ['/api/developers/sdk', '/api/developers/usage']
        },
        status: 'active'
      },

      // Security Monitoring Module
      {
        id: 'security-monitoring',
        name: 'Security Monitoring',
        type: 'security',
        scope: this.createDefaultScopes()[0],
        components: [
          {
            id: 'threat-detection',
            name: 'Threat Detection',
            type: 'chart',
            data: { threats: 0, blocked: 0, level: 'low' },
            config: {
              size: 'medium',
              position: { x: 0, y: 0 },
              draggable: true,
              resizable: true,
              theme: 'auto'
            },
            dependencies: ['security-api']
          },
          {
            id: 'access-logs',
            name: 'Access Logs',
            type: 'table',
            data: { logs: [], total: 0 },
            config: {
              size: 'large',
              position: { x: 1, y: 0 },
              draggable: true,
              resizable: true,
              theme: 'auto'
            },
            dependencies: ['logging-api']
          }
        ],
        config: {
          refreshInterval: 10000,
          autoLoad: true,
          cacheEnabled: false,
          permissions: ['admin', 'read'],
          apiEndpoints: ['/api/security/threats', '/api/security/logs']
        },
        status: 'active'
      },

      // Revenue Tracking Module
      {
        id: 'revenue-tracking',
        name: 'Revenue Tracking',
        type: 'revenue',
        scope: this.createDefaultScopes()[0],
        components: [
          {
            id: 'mrr-breakdown',
            name: 'MRR Breakdown',
            type: 'chart',
            data: { factoryWager: 7000, duoPlus: 15500, total: 22500 },
            config: {
              size: 'large',
              position: { x: 0, y: 0 },
              draggable: true,
              resizable: true,
              theme: 'auto'
            },
            dependencies: ['revenue-api']
          },
          {
            id: 'projections',
            name: 'Revenue Projections',
            type: 'metric',
            data: { current: 22500, projected: 28500000, growth: '+26.7%' },
            config: {
              size: 'medium',
              position: { x: 2, y: 0 },
              draggable: true,
              resizable: false,
              theme: 'auto'
            },
            dependencies: ['analytics-api']
          }
        ],
        config: {
          refreshInterval: 300000,
          autoLoad: true,
          cacheEnabled: true,
          permissions: ['admin', 'read'],
          apiEndpoints: ['/api/revenue/mrr', '/api/revenue/projections']
        },
        status: 'active'
      },

      // System Monitoring Module
      {
        id: 'system-monitoring',
        name: 'System Monitoring',
        type: 'monitoring',
        scope: this.createDefaultScopes()[2],
        components: [
          {
            id: 'performance-metrics',
            name: 'Performance Metrics',
            type: 'metric',
            data: { uptime: '99.9%', response: '87ms', cache: '85%' },
            config: {
              size: 'medium',
              position: { x: 0, y: 0 },
              draggable: true,
              resizable: false,
              theme: 'auto'
            },
            dependencies: ['performance-api']
          },
          {
            id: 'health-status',
            name: 'Health Status',
            type: 'widget',
            data: { status: 'healthy', services: 5, active: 5 },
            config: {
              size: 'medium',
              position: { x: 1, y: 0 },
              draggable: true,
              resizable: false,
              theme: 'auto'
            },
            dependencies: ['health-api']
          }
        ],
        config: {
          refreshInterval: 5000,
          autoLoad: true,
          cacheEnabled: false,
          permissions: ['read', 'monitor'],
          apiEndpoints: ['/api/monitoring/performance', '/api/monitoring/health']
        },
        status: 'active'
      }
    ];
  }

  private createDefaultLayout(): LayoutConfig {
    return {
      columns: 12,
      rowHeight: 100,
      margin: [16, 16],
      containerPadding: [16, 16],
      breakpoints: {
        lg: 1200,
        md: 996,
        sm: 768,
        xs: 480,
        xxs: 0
      }
    };
  }

  private createDefaultTheme(): ThemeConfig {
    return {
      mode: 'auto',
      primaryColor: '#3b82f6',
      secondaryColor: '#3b82f6',
      accentColor: '#3b82f6',
      customCSS: `
        .enterprise-suite {
          --enterprise-primary: #3b82f6;
          --enterprise-secondary: #3b82f6;
          --enterprise-accent: #3b82f6;
          --enterprise-success: #10b981;
          --enterprise-warning: #f59e0b;
          --enterprise-error: #ef4444;
        }
      `
    };
  }

  private createDefaultPermissions(): PermissionConfig {
    return {
      roles: {
        admin: ['admin', 'read', 'write', 'delete', 'manage', 'debug'],
        developer: ['read', 'write', 'debug'],
        analyst: ['read'],
        monitor: ['read', 'monitor'],
        merchant: ['read', 'write']
      },
      permissions: [
        'admin', 'read', 'write', 'delete', 'manage', 'debug', 'monitor', 'alert'
      ],
      accessControl: 'RBAC'
    };
  }

  // Public API Methods
  public getModule(moduleId: string): DashboardModule | undefined {
    return this.enterpriseSuite.modules.find(m => m.id === moduleId);
  }

  public getModulesByType(type: string): DashboardModule[] {
    return this.enterpriseSuite.modules.filter(m => m.type === type);
  }

  public getModulesByScope(scopeLevel: string): DashboardModule[] {
    return this.enterpriseSuite.modules.filter(m => m.scope.level === scopeLevel);
  }

  public addModule(module: DashboardModule): void {
    this.enterpriseSuite.modules.push(module);
    this.activeModules.set(module.id, module);
  }

  public removeModule(moduleId: string): boolean {
    const index = this.enterpriseSuite.modules.findIndex(m => m.id === moduleId);
    if (index > -1) {
      this.enterpriseSuite.modules.splice(index, 1);
      this.activeModules.delete(moduleId);
      return true;
    }
    return false;
  }

  public updateModule(moduleId: string, updates: Partial<DashboardModule>): boolean {
    const module = this.getModule(moduleId);
    if (module) {
      Object.assign(module, updates);
      this.activeModules.set(moduleId, module);
      return true;
    }
    return false;
  }

  public getScope(scopeId: string): DashboardScope | undefined {
    return this.enterpriseSuite.scopes.find(s => s.id === scopeId);
  }

  public addScope(scope: DashboardScope): void {
    this.enterpriseSuite.scopes.push(scope);
  }

  public updateLayout(layout: Partial<LayoutConfig>): void {
    Object.assign(this.enterpriseSuite.layout, layout);
  }

  public updateTheme(theme: Partial<ThemeConfig>): void {
    Object.assign(this.enterpriseSuite.theme, theme);
  }

  public getEnterpriseSuite(): EnterpriseSuite {
    return this.enterpriseSuite;
  }

  public async loadModule(moduleId: string): Promise<boolean> {
    const module = this.getModule(moduleId);
    if (!module) return false;

    module.status = 'loading';
    
    try {
      // Simulate module loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load components
      for (const component of module.components) {
        this.componentRegistry.set(component.id, component);
      }
      
      module.status = 'active';
      this.activeModules.set(moduleId, module);
      return true;
    } catch (error) {
      module.status = 'inactive';
      console.error(`Failed to load module ${moduleId}:`, error);
      return false;
    }
  }

  public async unloadModule(moduleId: string): Promise<boolean> {
    const module = this.getModule(moduleId);
    if (!module) return false;

    try {
      // Unload components
      for (const component of module.components) {
        this.componentRegistry.delete(component.id);
      }
      
      module.status = 'inactive';
      this.activeModules.delete(moduleId);
      return true;
    } catch (error) {
      console.error(`Failed to unload module ${moduleId}:`, error);
      return false;
    }
  }

  public getComponent(componentId: string): ModuleComponent | undefined {
    return this.componentRegistry.get(componentId);
  }

  public getComponentsByType(type: string): ModuleComponent[] {
    return Array.from(this.componentRegistry.values()).filter(c => c.type === type);
  }

  public renderDashboard(): string {
    const activeModules = Array.from(this.activeModules.values());
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Enterprise Suite - Modular Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/lucide@latest"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          ${this.enterpriseSuite.theme.customCSS}
        </style>
      </head>
      <body class="bg-gray-900 text-white">
        <div class="min-h-screen p-4">
          <header class="mb-6">
            <h1 class="text-3xl font-bold">Enterprise Suite - Modular Dashboard</h1>
            <p class="text-gray-400">Scope: ${this.enterpriseSuite.scopes.map(s => s.name).join(', ')}</p>
          </header>
          
          <main class="grid grid-cols-12 gap-4">
            ${activeModules.map(module => this.renderModule(module)).join('')}
          </main>
        </div>
        
        <script>
          // Initialize Lucide icons
          lucide.createIcons();
          
          // Initialize dashboard
          const dashboard = new ModularDashboardSystem();
          dashboard.initializeComponents();
        </script>
      </body>
      </html>
    `;
  }

  private renderModule(module: DashboardModule): string {
    const scopeClass = `scope-${module.scope.level.toLowerCase()}`;
    const typeClass = `type-${module.type}`;
    
    return `
      <div class="col-span-6 bg-gray-800 rounded-lg p-4 ${scopeClass} ${typeClass}">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">${module.name}</h3>
          <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
            ${module.status}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          ${module.components.map(component => this.renderComponent(component)).join('')}
        </div>
      </div>
    `;
  }

  private renderComponent(component: ModuleComponent): string {
    const sizeClass = `size-${component.config.size}`;
    
    switch (component.type) {
      case 'metric':
        return `
          <div class="bg-gray-700 rounded p-3 ${sizeClass}">
            <h4 class="text-sm text-gray-400 mb-1">${component.name}</h4>
            <div class="text-xl font-bold">${JSON.stringify(component.data)}</div>
          </div>
        `;
      case 'chart':
        return `
          <div class="bg-gray-700 rounded p-3 ${sizeClass}">
            <h4 class="text-sm text-gray-400 mb-2">${component.name}</h4>
            <canvas id="chart-${component.id}" width="200" height="150"></canvas>
          </div>
        `;
      case 'table':
        return `
          <div class="bg-gray-700 rounded p-3 ${sizeClass}">
            <h4 class="text-sm text-gray-400 mb-2">${component.name}</h4>
            <div class="text-sm">Table data: ${JSON.stringify(component.data)}</div>
          </div>
        `;
      default:
        return `
          <div class="bg-gray-700 rounded p-3 ${sizeClass}">
            <h4 class="text-sm text-gray-400 mb-1">${component.name}</h4>
            <div class="text-sm">Component data: ${JSON.stringify(component.data)}</div>
          </div>
        `;
    }
  }

  public initializeComponents(): void {
    // Initialize chart components
    const chartComponents = this.getComponentsByType('chart');
    chartComponents.forEach(component => {
      const canvas = document.getElementById(`chart-${component.id}`);
      if (canvas) {
        new Chart(canvas, {
          type: component.data.type || 'line',
          data: component.data,
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    });
  }
}

export default ModularDashboardSystem;
