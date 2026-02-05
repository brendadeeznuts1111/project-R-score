// utils/scope-visualizer.ts - Scope visualization and UI integration components

import { ScopeDetector, ScopeConfig } from './scope-detector';
import { ScopedSecretsManager } from './scoped-secrets-manager';

export interface ScopeIndicator {
  scope: string;
  platformScope: string;
  domain: string;
  platform: string;
  storageType: string;
  encryptionType: string;
  team?: string;
  status: 'healthy' | 'warning' | 'error';
  lastUpdated: string;
}

export interface PerformanceColumn {
  name: string;
  scope: string;
  platform: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface HeaderDisplay {
  title: string;
  scope: string;
  platformScope: string;
  domain: string;
  team?: string;
  status: {
    scope: 'active' | 'inactive' | 'error';
    platform: 'supported' | 'limited' | 'unsupported';
    storage: 'connected' | 'disconnected' | 'error';
  };
}

/**
 * Scope visualization and UI integration system
 */
export class ScopeVisualizer {
  
  /**
   * Generate scope indicator for dashboard header
   */
  static generateScopeIndicator(team?: string): ScopeIndicator {
    const config = ScopeDetector.getScopeConfig();
    const platform = process.platform;
    
    // Determine status based on configuration
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    
    // Check platform support
    const platformValidation = this.validatePlatformSupport(platform, config.scope);
    if (!platformValidation.supported) {
      status = platformValidation.fallbackAvailable ? 'warning' : 'error';
    }
    
    return {
      scope: config.scope,
      platformScope: config.platformScope,
      domain: config.domain,
      platform,
      storageType: config.storageType,
      encryptionType: config.encryptionType,
      team,
      status,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate header display component data
   */
  static generateHeaderDisplay(team?: string): HeaderDisplay {
    const indicator = this.generateScopeIndicator(team);
    
    const status = {
      scope: indicator.status === 'healthy' ? 'active' as const : 
              indicator.status === 'warning' ? 'inactive' as const : 'error' as const,
      platform: indicator.platformScope === 'ENTERPRISE' ? 'supported' as const :
                indicator.platformScope === 'USER' ? 'supported' as const : 'limited' as const,
      storage: indicator.status === 'healthy' ? 'connected' as const : 
              indicator.status === 'warning' ? 'disconnected' as const : 'error' as const
    };

    const title = this.generateTitle(indicator.scope, team);

    return {
      title,
      scope: indicator.scope,
      platformScope: indicator.platformScope,
      domain: indicator.domain,
      team,
      status
    };
  }

  /**
   * Generate performance report columns
   */
  static generatePerformanceColumns(
    metrics: Array<{ name: string; value: number; unit: string }>,
    team?: string
  ): PerformanceColumn[] {
    const config = ScopeDetector.getScopeConfig();
    
    return metrics.map(metric => ({
      name: metric.name,
      scope: config.scope,
      platform: process.platform,
      value: metric.value,
      unit: metric.unit,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Generate HTML for scope indicator badge
   */
  static generateScopeBadge(indicator: ScopeIndicator): string {
    const statusColors = {
      healthy: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    };

    const statusIcons = {
      healthy: '✅',
      warning: '⚠️',
      error: '❌'
    };

    return `
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
        <span class="w-2 h-2 rounded-full ${statusColors[indicator.status]}"></span>
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          ${statusIcons[indicator.status]} ${indicator.scope}
        </span>
        ${indicator.team ? `<span class="text-xs text-gray-500 dark:text-gray-400">@${indicator.team}</span>` : ''}
        <span class="text-xs text-gray-400 dark:text-gray-500">
          ${indicator.platformScope}
        </span>
      </div>
    `;
  }

  /**
   * Generate HTML for platform status indicator
   */
  static generatePlatformIndicator(indicator: ScopeIndicator): string {
    const platformIcons = {
      win32: '🪟',
      darwin: '🍎',
      linux: '🐧'
    };

    const storageIcons = {
      'Credential Manager': '🔐',
      'Keychain': '🔑',
      'Secret Service': '🛡️',
      'Encrypted Local': '📁'
    };

    return `
      <div class="inline-flex items-center space-x-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <span class="text-lg">${platformIcons[indicator.platform as keyof typeof platformIcons] || '💻'}</span>
        <div class="text-sm">
          <div class="font-medium text-blue-900 dark:text-blue-100">
            ${indicator.platform}
          </div>
          <div class="text-blue-700 dark:text-blue-300">
            ${storageIcons[indicator.storageType as keyof typeof storageIcons]} ${indicator.storageType}
          </div>
        </div>
        <div class="text-xs text-blue-600 dark:text-blue-400">
          ${indicator.encryptionType}
        </div>
      </div>
    `;
  }

  /**
   * Generate HTML for storage backend status
   */
  static generateStorageStatus(indicator: ScopeIndicator): string {
    const statusColors = {
      healthy: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400'
    };

    return `
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 rounded-full bg-${indicator.status === 'healthy' ? 'green' : indicator.status === 'warning' ? 'yellow' : 'red'}-500"></div>
        <div class="text-sm">
          <div class="font-medium ${statusColors[indicator.status]}">
            Storage ${indicator.status === 'healthy' ? 'Connected' : indicator.status === 'warning' ? 'Limited' : 'Error'}
          </div>
          <div class="text-gray-500 dark:text-gray-400">
            ${indicator.storageType} • ${indicator.encryptionType}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate complete header HTML
   */
  static generateHeaderHTML(team?: string): string {
    const display = this.generateHeaderDisplay(team);
    const indicator = this.generateScopeIndicator(team);

    const statusColors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    return `
      <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div class="px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${display.title}
              </h1>
              ${this.generateScopeBadge(indicator)}
            </div>
            
            <div class="flex items-center space-x-4">
              ${this.generatePlatformIndicator(indicator)}
              ${this.generateStorageStatus(indicator)}
              
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500 dark:text-gray-400">Scope:</span>
                <span class="px-2 py-1 text-xs font-medium rounded ${statusColors[display.status.scope]}">
                  ${display.scope}
                </span>
              </div>
              
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500 dark:text-gray-400">Platform:</span>
                <span class="px-2 py-1 text-xs font-medium rounded ${display.status.platform === 'supported' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : display.status.platform === 'limited' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
                  ${display.platformScope}
                </span>
              </div>
            </div>
          </div>
          
          ${display.domain ? `
            <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Domain: ${display.domain} • Last updated: ${new Date().toLocaleString()}
            </div>
          ` : ''}
        </div>
      </header>
    `;
  }

  /**
   * Generate performance report table with scope columns
   */
  static generatePerformanceReportTable(columns: PerformanceColumn[]): string {
    const headers = `
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Metric</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Value</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Unit</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Scope</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Platform</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">Timestamp</th>
        </tr>
      </thead>
    `;

    const rows = columns.map(col => `
      <tr class="border-b border-gray-100 dark:border-gray-800">
        <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">${col.name}</td>
        <td class="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">${col.value}</td>
        <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">${col.unit}</td>
        <td class="px-4 py-2">
          <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ${col.scope}
          </span>
        </td>
        <td class="px-4 py-2">
          <span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ${col.platform}
          </span>
        </td>
        <td class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
          ${new Date(col.timestamp).toLocaleString()}
        </td>
      </tr>
    `).join('');

    return `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          ${headers}
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Validate platform support
   */
  private static validatePlatformSupport(platform: string, scope: string): {
    supported: boolean;
    fallbackAvailable: boolean;
  } {
    switch (platform) {
      case 'win32':
        return { supported: true, fallbackAvailable: false };
      case 'darwin':
      case 'linux':
        return { supported: scope !== 'ENTERPRISE', fallbackAvailable: scope === 'ENTERPRISE' };
      default:
        return { supported: false, fallbackAvailable: true };
    }
  }

  /**
   * Generate title based on scope and team
   */
  private static generateTitle(scope: string, team?: string): string {
    const scopeTitles = {
      'ENTERPRISE': 'Enterprise Dashboard',
      'DEVELOPMENT': 'Development Dashboard',
      'LOCAL-SANDBOX': 'Local Sandbox'
    };

    const baseTitle = scopeTitles[scope as keyof typeof scopeTitles] || 'Dashboard';
    return team ? `${baseTitle} - ${team}` : baseTitle;
  }

  /**
   * Export scope visualization data for debugging
   */
  static exportVisualizationData(team?: string): {
    indicator: ScopeIndicator;
    header: HeaderDisplay;
    html: {
      badge: string;
      platform: string;
      storage: string;
      header: string;
    };
  } {
    const indicator = this.generateScopeIndicator(team);
    const header = this.generateHeaderDisplay(team);

    return {
      indicator,
      header,
      html: {
        badge: this.generateScopeBadge(indicator),
        platform: this.generatePlatformIndicator(indicator),
        storage: this.generateStorageStatus(indicator),
        header: this.generateHeaderHTML(team)
      }
    };
  }

  /**
   * Get scope-specific CSS classes
   */
  static getScopeClasses(scope: string): {
    bg: string;
    text: string;
    border: string;
    badge: string;
  } {
    const scopeClasses = {
      'ENTERPRISE': {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-900 dark:text-purple-100',
        border: 'border-purple-200 dark:border-purple-800',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      },
      'DEVELOPMENT': {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-900 dark:text-blue-100',
        border: 'border-blue-200 dark:border-blue-800',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      },
      'LOCAL-SANDBOX': {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        text: 'text-gray-900 dark:text-gray-100',
        border: 'border-gray-200 dark:border-gray-800',
        badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      }
    };

    return scopeClasses[scope as keyof typeof scopeClasses] || scopeClasses['LOCAL-SANDBOX'];
  }
}
