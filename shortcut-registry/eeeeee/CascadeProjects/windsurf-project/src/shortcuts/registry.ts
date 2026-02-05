/**
 * WindSurf Project - ShortcutRegistry Integration
 * 
 * Integrates ShortcutRegistry system with WindSurf dashboards and applications.
 * Provides keyboard shortcut management for all WindSurf components.
 */

// Define ShortcutConfig type locally since external import doesn't exist
export interface ShortcutConfig {
  id: string;
  action: string;
  description: string;
  category: string;
  default: {
    primary: string;
    macOS?: string;
  };
  enabled: boolean;
  scope: string;
}

// Event interface for shortcut triggers
interface ShortcutEvent {
  shortcutId: string;
  data?: unknown;
}

// Interface for ShortcutRegistry instance
export interface IShortcutRegistry {
  register(config: ShortcutConfig): void;
  unregister(id: string): void;
  getAllShortcuts(): ShortcutConfig[];
  getAllProfiles(): unknown[];
  getActiveProfile(): unknown;
  createProfile(name: string, description: string, basedOn?: string): unknown;
  setActiveProfile(profileId: string): void;
  detectConflicts(profileId?: string): unknown[];
  getUsageStatistics(days?: number): unknown;
  on(event: string, callback: (event: ShortcutEvent) => void): void;
  getShortcutByKey(key: string): ShortcutConfig | null;
  trigger(shortcutId: string): void;
}

// Create type for the registry class
type ShortcutRegistryClass = new () => IShortcutRegistry;

// Import ShortcutRegistry from the wind project (will be mocked for testing)
// Use mock implementation when external dependency is not available
let ShortcutRegistry: ShortcutRegistryClass;
try {
  ShortcutRegistry = require('../../../../wind/src/core/registry').ShortcutRegistry;
} catch {
  // Use mock implementation
  ShortcutRegistry = require('./mock-registry').ShortcutRegistry;
}

// Export ShortcutRegistry for use in other modules
export { ShortcutRegistry };
export const WINDSURF_SHORTCUTS: ShortcutConfig[] = [
  {
    id: 'dashboard.refresh',
    action: 'refresh',
    description: 'Refresh dashboard data',
    category: 'general',
    default: {
      primary: 'Ctrl+R',
      macOS: 'Cmd+R'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'dashboard.export',
    action: 'export',
    description: 'Export dashboard data',
    category: 'data',
    default: {
      primary: 'Ctrl+E',
      macOS: 'Cmd+E'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'risk.analyze',
    action: 'analyze',
    description: 'Run risk analysis',
    category: 'compliance',
    default: {
      primary: 'Ctrl+A',
      macOS: 'Cmd+A'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'admin.config',
    action: 'config',
    description: 'Open admin configuration',
    category: 'developer',
    default: {
      primary: 'Ctrl+,',
      macOS: 'Cmd+,'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'financial.process',
    action: 'process',
    description: 'Process financial transaction',
    category: 'payment',
    default: {
      primary: 'Ctrl+P',
      macOS: 'Cmd+P'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'kyc.validate',
    action: 'validate',
    description: 'Validate KYC information',
    category: 'compliance',
    default: {
      primary: 'Ctrl+K',
      macOS: 'Cmd+K'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'fraud.detect',
    action: 'detect',
    description: 'Run fraud detection',
    category: 'compliance',
    default: {
      primary: 'Ctrl+F',
      macOS: 'Cmd+F'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'pool.rebalance',
    action: 'rebalance',
    description: 'Rebalance pool',
    category: 'payment',
    default: {
      primary: 'Ctrl+B',
      macOS: 'Cmd+B'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'monitor.start',
    action: 'monitor',
    description: 'Start monitoring',
    category: 'logs',
    default: {
      primary: 'Ctrl+M',
      macOS: 'Cmd+M'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nexus.dashboard',
    action: 'dashboard',
    description: 'Show Citadel dashboard',
    category: 'nexus',
    default: {
      primary: 'Ctrl+D',
      macOS: 'Cmd+D'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nexus.metrics',
    action: 'metrics',
    description: 'Show advanced metrics',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+M',
      macOS: 'Cmd+Shift+M'
    },
    enabled: true,
    scope: 'global'
  },
  {
    id: 'nexus.telemetry.start',
    action: 'telemetry',
    description: 'Start telemetry streaming',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+T',
      macOS: 'Cmd+Shift+T'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'nexus.vault.profiles',
    action: 'vault',
    description: 'Show vault profiles',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+V',
      macOS: 'Cmd+Shift+V'
    },
    enabled: true,
    scope: 'panel'
  },
  {
    id: 'nexus.profile.create',
    action: 'create',
    description: 'Create device profile',
    category: 'nexus',
    default: {
      primary: 'Ctrl+Shift+N',
      macOS: 'Cmd+Shift+N'
    },
    enabled: true,
    scope: 'panel'
  }
];

/**
 * Initialize ShortcutRegistry for WindSurf project
 */
export function initializeWindSurfShortcuts(): IShortcutRegistry {
  const registry = new ShortcutRegistry();
  
  // Register all WindSurf-specific shortcuts
  WINDSURF_SHORTCUTS.forEach(shortcut => {
    registry.register(shortcut);
  });
  
  return registry;
}

/**
 * Get the global ShortcutRegistry instance
 */
let registryInstance: IShortcutRegistry | null = null;

export function getShortcutRegistry(): IShortcutRegistry {
  if (!registryInstance) {
    registryInstance = initializeWindSurfShortcuts();
  }
  return registryInstance;
}

/**
 * Register keyboard event handlers for WindSurf dashboards
 * Now uses API endpoints for all actions
 */
export function registerWindSurfKeyboardHandlers(registry: IShortcutRegistry): void {
  if (typeof window === 'undefined') return;

  // Helper function to call API endpoint
  async function callActionAPI(endpoint: string, method: string = 'POST', body?: Record<string, unknown>) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        return { success: false, error: error.error || 'Request failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: errorMessage };
    }
  }

  // Dashboard refresh
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'dashboard.refresh') {
      const result = await callActionAPI('/api/actions/dashboard/refresh');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('dashboard:refresh', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('dashboard:error', { detail: result.error }));
      }
    }
  });
  
  // Dashboard export
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'dashboard.export') {
      const result = await callActionAPI('/api/actions/dashboard/export?format=json');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('dashboard:export', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('dashboard:error', { detail: result.error }));
      }
    }
  });
  
  // Risk analysis
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'risk.analyze') {
      const result = await callActionAPI('/api/actions/risk/analyze', 'POST', {});
      if (result.success) {
        window.dispatchEvent(new CustomEvent('risk:analyze', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('risk:error', { detail: result.error }));
      }
    }
  });
  
  // Admin config
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'admin.config') {
      const result = await callActionAPI('/api/actions/admin/config', 'GET');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('admin:config', { detail: result.data }));
        // Optionally redirect to config page
        if (typeof window.location !== 'undefined') {
          window.location.href = '/config';
        }
      } else {
        window.dispatchEvent(new CustomEvent('admin:error', { detail: result.error }));
      }
    }
  });
  
  // Financial process
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'financial.process') {
      const result = await callActionAPI('/api/actions/financial/process', 'POST', {});
      if (result.success) {
        window.dispatchEvent(new CustomEvent('financial:process', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('financial:error', { detail: result.error }));
      }
    }
  });
  
  // KYC validate
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'kyc.validate') {
      const result = await callActionAPI('/api/actions/compliance/kyc/validate', 'POST', { userId: 'current' });
      if (result.success) {
        window.dispatchEvent(new CustomEvent('kyc:validate', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('kyc:error', { detail: result.error }));
      }
    }
  });

  // Fraud detect
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'fraud.detect') {
      const result = await callActionAPI('/api/actions/compliance/fraud/detect', 'POST', {});
      if (result.success) {
        window.dispatchEvent(new CustomEvent('fraud:detect', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('fraud:error', { detail: result.error }));
      }
    }
  });

  // Pool rebalance
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'pool.rebalance') {
      const result = await callActionAPI('/api/actions/pools/rebalance', 'POST');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('pool:rebalance', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('pool:error', { detail: result.error }));
      }
    }
  });

  // Monitor start
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'monitor.start') {
      const result = await callActionAPI('/api/actions/monitoring/start', 'POST');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('monitor:start', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('monitor:error', { detail: result.error }));
      }
    }
  });

  // Nexus dashboard
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'nexus.dashboard') {
      const result = await callActionAPI('/api/nexus/dashboard', 'GET');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('nexus:dashboard', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('nexus:error', { detail: result.error }));
      }
    }
  });

  // Nexus metrics
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'nexus.metrics') {
      const result = await callActionAPI('/api/nexus/metrics/advanced', 'GET');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('nexus:metrics', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('nexus:error', { detail: result.error }));
      }
    }
  });

  // Nexus telemetry start
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'nexus.telemetry.start') {
      // Default device ID - could be enhanced to prompt or use current device
      const result = await callActionAPI('/api/nexus/telemetry/start', 'POST', { 
        deviceId: 'default-device',
        outputPath: './logs/telemetry.log'
      });
      if (result.success) {
        window.dispatchEvent(new CustomEvent('nexus:telemetry:started', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('nexus:error', { detail: result.error }));
      }
    }
  });

  // Nexus vault profiles
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'nexus.vault.profiles') {
      const result = await callActionAPI('/api/nexus/vault/profiles', 'GET');
      if (result.success) {
        window.dispatchEvent(new CustomEvent('nexus:vault:profiles', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('nexus:error', { detail: result.error }));
      }
    }
  });

  // Nexus profile create
  registry.on('shortcut:triggered', async (event: ShortcutEvent) => {
    if (event.shortcutId === 'nexus.profile.create') {
      // Default values - could be enhanced to prompt for input
      const result = await callActionAPI('/api/nexus/profile/create', 'POST', {
        deviceId: `device-${Date.now()}`,
        simData: {
          iccid: '00000000000000000000',
          number: '+1234567890',
          carrier: 'default',
          country: 'US'
        },
        options: {}
      });
      if (result.success) {
        window.dispatchEvent(new CustomEvent('nexus:profile:created', { detail: result.data }));
      } else {
        window.dispatchEvent(new CustomEvent('nexus:error', { detail: result.error }));
      }
    }
  });
}

/**
 * Browser-side keyboard handler setup
 */
export function setupBrowserKeyboardHandlers(registry: IShortcutRegistry): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('keydown', (event) => {
    const key = getKeyCombination(event);
    const shortcut = registry.getShortcutByKey(key);
    
    if (shortcut) {
      event.preventDefault();
      registry.trigger(shortcut.id);
    }
  });
}

/**
 * Convert keyboard event to key combination string
 */
function getKeyCombination(event: KeyboardEvent): string {
  const parts: string[] = [];
  
  if (event.metaKey) parts.push('Cmd');
  else if (event.ctrlKey) parts.push('Ctrl');
  
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  
  if (event.key && event.key.length === 1) {
    parts.push(event.key.toUpperCase());
  } else if (event.key) {
    // Handle special keys
    const keyMap: Record<string, string> = {
      'Enter': 'Enter',
      'Escape': 'Escape',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
    };
    parts.push(keyMap[event.key] || event.key);
  }
  
  return parts.join('+');
}
