/**
 * Empire Pro Advanced Dashboard - Power Features & Profile Routes
 * Unleashing the full power of shortcuts and profile-based routing
 */

import { shortcuts } from 'keyboard-shortcuts-lite';

// Advanced Profile-based Routing System
export class ProfileRouteManager {
  private profiles: Map<string, ProfileConfig> = new Map();
  private currentProfile: string = 'default';
  private shortcuts: any;

  constructor() {
    this.initializeProfiles();
    this.shortcuts = shortcuts;
    this.setupProfileShortcuts();
  }

  private initializeProfiles(): void {
    // Define powerful profiles for different user types
    this.profiles.set('admin', {
      name: 'System Administrator',
      permissions: ['*'],
      shortcuts: this.getAdminShortcuts(),
      theme: 'dark-pro',
      layout: 'advanced',
      features: ['system-control', 'user-management', 'advanced-metrics']
    });

    this.profiles.set('operator', {
      name: 'Phone Intelligence Operator',
      permissions: ['phone:read', 'phone:write', 'pool:manage', 'campaign:route'],
      shortcuts: this.getOperatorShortcuts(),
      theme: 'dark-blue',
      layout: 'operational',
      features: ['phone-intelligence', 'smart-pools', 'campaign-router']
    });

    this.profiles.set('analyst', {
      name: 'Business Intelligence Analyst',
      permissions: ['metrics:read', 'reports:generate', 'analytics:view'],
      shortcuts: this.getAnalystShortcuts(),
      theme: 'dark-purple',
      layout: 'analytics',
      features: ['advanced-analytics', 'roi-tracking', 'performance-metrics']
    });

    this.profiles.set('developer', {
      name: 'System Developer',
      permissions: ['patterns:read', 'workflows:manage', 'debug:tools'],
      shortcuts: this.getDeveloperShortcuts(),
      theme: 'dark-green',
      layout: 'development',
      features: ['pattern-editor', 'workflow-designer', 'debug-console']
    });

    this.profiles.set('power-user', {
      name: 'Power User',
      permissions: ['phone:read', 'pool:view', 'campaign:view', 'metrics:read'],
      shortcuts: this.getPowerUserShortcuts(),
      theme: 'dark-orange',
      layout: 'simplified',
      features: ['quick-actions', 'dashboard-widgets', 'custom-reports']
    });
  }

  private setupProfileShortcuts(): void {
    // Profile switching shortcuts
    this.shortcuts.register([
      {
        key: 'ctrl+shift+1',
        description: 'Switch to Admin Profile',
        action: () => this.switchProfile('admin'),
        category: 'profile'
      },
      {
        key: 'ctrl+shift+2',
        description: 'Switch to Operator Profile',
        action: () => this.switchProfile('operator'),
        category: 'profile'
      },
      {
        key: 'ctrl+shift+3',
        description: 'Switch to Analyst Profile',
        action: () => this.switchProfile('analyst'),
        category: 'profile'
      },
      {
        key: 'ctrl+shift+4',
        description: 'Switch to Developer Profile',
        action: () => this.switchProfile('developer'),
        category: 'profile'
      },
      {
        key: 'ctrl+shift+5',
        description: 'Switch to Power User Profile',
        action: () => this.switchProfile('power-user'),
        category: 'profile'
      }
    ]);
  }

  switchProfile(profileId: string): void {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      console.error(`Profile ${profileId} not found`);
      return;
    }

    this.currentProfile = profileId;
    this.applyProfile(profile);
    this.showNotification(`Switched to ${profile.name} profile`, 'success');
  }

  private applyProfile(profile: ProfileConfig): void {
    // Apply theme
    document.body.className = `${profile.theme} theme-transition`;
    
    // Apply layout
    this.updateLayout(profile.layout);
    
    // Update shortcuts
    this.updateShortcuts(profile.shortcuts);
    
    // Show/hide features based on permissions
    this.updateFeatures(profile.features, profile.permissions);
    
    // Update UI
    this.updateProfileUI(profile);
  }

  private updateLayout(layout: string): void {
    const main = document.querySelector('main');
    if (main) {
      main.className = `max-w-7xl mx-auto px-6 py-8 layout-${layout}`;
    }
  }

  private updateShortcuts(shortcuts: any[]): void {
    // Clear existing shortcuts and register new ones
    this.shortcuts.clear();
    shortcuts.forEach(shortcut => {
      this.shortcuts.register(shortcut);
    });
  }

  private updateFeatures(features: string[], permissions: string[]): void {
    features.forEach(feature => {
      const element = document.getElementById(`feature-${feature}`);
      if (element) {
        element.style.display = 'block';
      }
    });
  }

  private updateProfileUI(profile: ProfileConfig): void {
    const profileDisplay = document.getElementById('current-profile');
    if (profileDisplay) {
      profileDisplay.textContent = profile.name;
      profileDisplay.className = `text-lg font-bold profile-${profile.id}`;
    }
  }

  // Profile-specific shortcuts
  private getAdminShortcuts(): any[] {
    return [
      ...this.getBaseShortcuts(),
      {
        key: 'ctrl+alt+s',
        description: 'System Control Panel',
        action: () => this.openSystemControl(),
        category: 'admin'
      },
      {
        key: 'ctrl+alt+u',
        description: 'User Management',
        action: () => this.openUserManagement(),
        category: 'admin'
      },
      {
        key: 'ctrl+alt+c',
        description: 'Configuration Manager',
        action: () => this.openConfigManager(),
        category: 'admin'
      }
    ];
  }

  private getOperatorShortcuts(): any[] {
    return [
      ...this.getBaseShortcuts(),
      {
        key: 'ctrl+alt+b',
        description: 'Bulk Phone Operations',
        action: () => this.openBulkOperations(),
        category: 'operator'
      },
      {
        key: 'ctrl+alt+r',
        description: 'Advanced Routing Rules',
        action: () => this.openRoutingRules(),
        category: 'operator'
      },
      {
        key: 'ctrl+alt+m',
        description: 'Monitoring Dashboard',
        action: () => this.openMonitoringDashboard(),
        category: 'operator'
      }
    ];
  }

  private getAnalystShortcuts(): any[] {
    return [
      ...this.getBaseShortcuts(),
      {
        key: 'ctrl+alt+a',
        description: 'Advanced Analytics',
        action: () => this.openAdvancedAnalytics(),
        category: 'analyst'
      },
      {
        key: 'ctrl+alt+f',
        description: 'Financial Reports',
        action: () => this.openFinancialReports(),
        category: 'analyst'
      },
      {
        key: 'ctrl+alt+t',
        description: 'Trend Analysis',
        action: () => this.openTrendAnalysis(),
        category: 'analyst'
      }
    ];
  }

  private getDeveloperShortcuts(): any[] {
    return [
      ...this.getBaseShortcuts(),
      {
        key: 'ctrl+alt+d',
        description: 'Pattern Designer',
        action: () => this.openPatternDesigner(),
        category: 'developer'
      },
      {
        key: 'ctrl+alt+w',
        description: 'Workflow Builder',
        action: () => this.openWorkflowBuilder(),
        category: 'developer'
      },
      {
        key: 'ctrl+alt+e',
        description: 'Debug Console',
        action: () => this.openDebugConsole(),
        category: 'developer'
      }
    ];
  }

  private getPowerUserShortcuts(): any[] {
    return [
      ...this.getBaseShortcuts(),
      {
        key: 'ctrl+alt+q',
        description: 'Quick Actions Panel',
        action: () => this.openQuickActions(),
        category: 'power-user'
      },
      {
        key: 'ctrl+alt+w',
        description: 'Custom Widgets',
        action: () => this.openCustomWidgets(),
        category: 'power-user'
      },
      {
        key: 'ctrl+alt+r',
        description: 'Custom Reports',
        action: () => this.openCustomReports(),
        category: 'power-user'
      }
    ];
  }

  private getBaseShortcuts(): any[] {
    return [
      {
        key: 'ctrl+shift+p',
        description: 'Sanitize Phone',
        action: () => this.sanitizePhone(),
        category: 'phone'
      },
      {
        key: 'ctrl+shift+m',
        description: 'Start Monitoring',
        action: () => this.startMonitoring(),
        category: 'phone'
      },
      {
        key: 'ctrl+shift+h',
        description: 'Health Check',
        action: () => this.runHealthCheck(),
        category: 'system'
      },
      {
        key: 'ctrl+shift+a',
        description: 'Autonomic Loop',
        action: () => this.startAutonomicLoop(),
        category: 'system'
      }
    ];
  }

  // Action methods
  private sanitizePhone(): void {
    this.executeCommand('phone sanitize +14155552671 --ipqs', 'Phone sanitization initiated');
  }

  private startMonitoring(): void {
    this.executeCommand('phone monitor start +14155552671 --interval=1h', 'Phone monitoring started');
  }

  private runHealthCheck(): void {
    this.executeCommand('autonomic status', 'Health check running...');
  }

  private startAutonomicLoop(): void {
    this.executeCommand('autonomic start', 'Autonomic loop starting...');
  }

  // Admin actions
  private openSystemControl(): void {
    this.showFeaturePanel('System Control', ['System Status', 'Performance Tuning', 'Security Settings']);
  }

  private openUserManagement(): void {
    this.showFeaturePanel('User Management', ['User List', 'Role Assignment', 'Permission Manager']);
  }

  private openConfigManager(): void {
    this.showFeaturePanel('Configuration', ['System Config', 'Pattern Settings', 'Workflow Rules']);
  }

  // Operator actions
  private openBulkOperations(): void {
    this.showFeaturePanel('Bulk Operations', ['Bulk Sanitize', 'Pool Management', 'Campaign Routing']);
  }

  private openRoutingRules(): void {
    this.showFeaturePanel('Routing Rules', ['Provider Rules', 'Cost Optimization', 'Quality Filters']);
  }

  private openMonitoringDashboard(): void {
    this.showFeaturePanel('Monitoring', ['Real-time Metrics', 'Alert Management', 'System Health']);
  }

  // Analyst actions
  private openAdvancedAnalytics(): void {
    this.showFeaturePanel('Advanced Analytics', ['ROI Analysis', 'Performance Trends', 'Cost Breakdown']);
  }

  private openFinancialReports(): void {
    this.showFeaturePanel('Financial Reports', ['Revenue Reports', 'Cost Analysis', 'Profit Margins']);
  }

  private openTrendAnalysis(): void {
    this.showFeaturePanel('Trend Analysis', ['Usage Patterns', 'Growth Metrics', 'Forecasting']);
  }

  // Developer actions
  private openPatternDesigner(): void {
    this.showFeaturePanel('Pattern Designer', ['Create Pattern', 'Test Pattern', 'Deploy Pattern']);
  }

  private openWorkflowBuilder(): void {
    this.showFeaturePanel('Workflow Builder', ['Design Workflow', 'Test Workflow', 'Deploy Workflow']);
  }

  private openDebugConsole(): void {
    this.showFeaturePanel('Debug Console', ['System Logs', 'Error Tracking', 'Performance Profiler']);
  }

  // Power user actions
  private openQuickActions(): void {
    this.showFeaturePanel('Quick Actions', ['Favorite Commands', 'Recent Tasks', 'Custom Shortcuts']);
  }

  private openCustomWidgets(): void {
    this.showFeaturePanel('Custom Widgets', ['Add Widget', 'Configure Layout', 'Save Dashboard']);
  }

  private openCustomReports(): void {
    this.showFeaturePanel('Custom Reports', ['Create Report', 'Schedule Reports', 'Export Data']);
  }

  // Utility methods
  private executeCommand(command: string, message: string): void {
    console.log(`🚀 Executing: ${command}`);
    this.showNotification(message, 'info');
    this.addActivity(message, 'info');
    
    // Update command display
    const commandDisplay = document.getElementById('command-display');
    if (commandDisplay) {
      commandDisplay.textContent = `$ ${command}`;
      commandDisplay.classList.add('text-green-400');
      setTimeout(() => {
        commandDisplay.classList.remove('text-green-400');
      }, 2000);
    }
  }

  private showFeaturePanel(title: string, features: string[]): void {
    const panel = document.createElement('div');
    panel.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    panel.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">${title}</h3>
        <div class="space-y-2">
          ${features.map(feature => `
            <button class="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded text-left transition-all">
              ${feature}
            </button>
          `).join('')}
        </div>
        <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-red-600 hover:bg-red-700 p-3 rounded transition-all">
          Close
        </button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-600' : 
      type === 'warning' ? 'bg-yellow-600' : 
      type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    }`;
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${
          type === 'success' ? 'fa-check-circle' : 
          type === 'warning' ? 'fa-exclamation-triangle' : 
          type === 'error' ? 'fa-times-circle' : 'fa-info-circle'
        } mr-2"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

  private addActivity(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = `flex items-center space-x-3 p-2 rounded-lg ${
      type === 'success' ? 'bg-green-900/30' : 
      type === 'warning' ? 'bg-yellow-900/30' : 
      type === 'error' ? 'bg-red-900/30' : 
      'bg-blue-900/30'
    }`;
    
    item.innerHTML = `
      <i class="fas ${
        type === 'success' ? 'fa-check-circle text-green-400' : 
        type === 'warning' ? 'fa-exclamation-triangle text-yellow-400' : 
        type === 'error' ? 'fa-times-circle text-red-400' : 
        'fa-info-circle text-blue-400'
      }"></i>
      <span class="flex-1">${message}</span>
      <span class="text-xs text-gray-500">Just now</span>
      <span class="text-xs text-purple-400">⌨️</span>
    `;
    
    feed.insertBefore(item, feed.firstChild);
    
    // Keep only last 10 items
    while (feed.children.length > 10) {
      feed.removeChild(feed.lastChild);
    }
  }

  public getCurrentProfile(): ProfileConfig {
    return this.profiles.get(this.currentProfile) || this.profiles.get('default')!;
  }

  public getAllProfiles(): Map<string, ProfileConfig> {
    return this.profiles;
  }
}

// Type definitions
interface ProfileConfig {
  id: string;
  name: string;
  permissions: string[];
  shortcuts: any[];
  theme: string;
  layout: string;
  features: string[];
}

export default ProfileRouteManager;
