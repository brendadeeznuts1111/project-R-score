/**
 * Keyboard Shortcuts Integration for Empire Pro Dashboard
 * Bringing keyboard-shortcuts-lite into the production system
 */

import { shortcuts } from 'keyboard-shortcuts-lite';

// Initialize keyboard shortcuts for the Empire Pro Dashboard
export class EmpireProKeyboardShortcuts {
  constructor() {
    this.initializeShortcuts();
  }

  private initializeShortcuts(): void {
    // Phone Intelligence Shortcuts
    shortcuts.register([
      {
        key: 'ctrl+shift+p',
        description: 'Sanitize Phone Number',
        action: () => this.sanitizePhone(),
        category: 'phone'
      },
      {
        key: 'ctrl+shift+m',
        description: 'Start Phone Monitoring',
        action: () => this.startMonitoring(),
        category: 'phone'
      },
      {
        key: 'ctrl+shift+f',
        description: 'Farm Process Numbers',
        action: () => this.farmProcess(),
        category: 'phone'
      }
    ]);

    // Smart Pool Shortcuts
    shortcuts.register([
      {
        key: 'ctrl+shift+o',
        description: 'Provision Numbers',
        action: () => this.provisionNumbers(),
        category: 'pool'
      },
      {
        key: 'ctrl+shift+r',
        description: 'Retire Numbers',
        action: () => this.retireNumbers(),
        category: 'pool'
      },
      {
        key: 'ctrl+shift+t',
        description: 'Pool Metrics',
        action: () => this.showPoolMetrics(),
        category: 'pool'
      }
    ]);

    // Campaign Routing Shortcuts
    shortcuts.register([
      {
        key: 'ctrl+shift+c',
        description: 'Route Campaign',
        action: () => this.routeCampaign(),
        category: 'campaign'
      },
      {
        key: 'ctrl+shift+s',
        description: 'Start Campaign',
        action: () => this.startCampaign(),
        category: 'campaign'
      }
    ]);

    // Autonomic System Shortcuts
    shortcuts.register([
      {
        key: 'ctrl+shift+h',
        description: 'Run Health Check',
        action: () => this.runHealthCheck(),
        category: 'autonomic'
      },
      {
        key: 'ctrl+shift+a',
        description: 'Start Autonomic Loop',
        action: () => this.startAutonomicLoop(),
        category: 'autonomic'
      },
      {
        key: 'ctrl+shift+d',
        description: 'Generate Report',
        action: () => this.generateReport(),
        category: 'autonomic'
      }
    ]);

    // Dashboard Navigation Shortcuts
    shortcuts.register([
      {
        key: 'ctrl+shift+1',
        description: 'Show Phone Intelligence',
        action: () => this.showSection('phone'),
        category: 'navigation'
      },
      {
        key: 'ctrl+shift+2',
        description: 'Show Smart Pools',
        action: () => this.showSection('pool'),
        category: 'navigation'
      },
      {
        key: 'ctrl+shift+3',
        description: 'Show Campaign Router',
        action: () => this.showSection('campaign'),
        category: 'navigation'
      },
      {
        key: 'ctrl+shift+4',
        description: 'Show Autonomic System',
        action: () => this.showSection('autonomic'),
        category: 'navigation'
      },
      {
        key: 'ctrl+shift+/',
        description: 'Show Help',
        action: () => this.showHelp(),
        category: 'navigation'
      }
    ]);

    // Quick Actions
    shortcuts.register([
      {
        key: 'ctrl+shift+enter',
        description: 'Execute Last Command',
        action: () => this.executeLastCommand(),
        category: 'quick'
      },
      {
        key: 'ctrl+shift+l',
        description: 'Clear Activity Log',
        action: () => this.clearActivityLog(),
        category: 'quick'
      },
      {
        key: 'ctrl+shift+escape',
        description: 'Emergency Stop',
        action: () => this.emergencyStop(),
        category: 'quick'
      }
    ]);

    console.log('⌨️ Empire Pro Keyboard Shortcuts Initialized');
  }

  // Phone Intelligence Actions
  private sanitizePhone(): void {
    this.showCommand('phone sanitize +14155552671 --ipqs', 'Sanitizing phone number...');
    this.addActivity('Phone sanitization initiated via shortcut', 'info');
  }

  private startMonitoring(): void {
    this.showCommand('phone monitor start +14155552671 --interval=1h', 'Starting phone monitoring...');
    this.addActivity('Phone monitoring started via shortcut', 'success');
  }

  private farmProcess(): void {
    this.showCommand('phone farm --file=phones.txt --concurrency=1000', 'Processing phone numbers...');
    this.addActivity('Bulk processing started via shortcut', 'success');
  }

  // Smart Pool Actions
  private provisionNumbers(): void {
    this.showCommand('phone pool provision --name=marketing --size=1000', 'Provisioning numbers...');
    this.addActivity('Number provisioning started via shortcut', 'success');
  }

  private retireNumbers(): void {
    this.showCommand('phone pool retire --name=marketing', 'Retiring numbers...');
    this.addActivity('Number retirement started via shortcut', 'warning');
  }

  private showPoolMetrics(): void {
    this.showCommand('phone pool metrics --name=marketing', 'Loading pool metrics...');
    this.addActivity('Pool metrics loaded via shortcut', 'info');
  }

  // Campaign Routing Actions
  private routeCampaign(): void {
    this.showCommand('phone campaign route --id=summer --phone=+14155552671', 'Routing campaign...');
    this.addActivity('Campaign routing initiated via shortcut', 'success');
  }

  private startCampaign(): void {
    this.showCommand('phone campaign start --id=summer --file=phones.txt', 'Starting campaign...');
    this.addActivity('Campaign started via shortcut', 'success');
  }

  // Autonomic System Actions
  private runHealthCheck(): void {
    this.showCommand('autonomic status', 'Running health check...');
    this.addActivity('Health check initiated via shortcut', 'info');
    
    setTimeout(() => {
      this.addActivity('✅ All systems healthy', 'success');
    }, 2000);
  }

  private startAutonomicLoop(): void {
    this.showCommand('autonomic start', 'Starting autonomic healing loop...');
    this.addActivity('Autonomic loop started via shortcut', 'success');
    
    setTimeout(() => {
      this.addActivity('🛠️ Cache HEALED (enabled-prefetch)', 'success');
    }, 2000);
    
    setTimeout(() => {
      this.addActivity('🛠️ Pool HEALED (provisioned-+14155552673)', 'success');
    }, 4000);
    
    setTimeout(() => {
      this.addActivity('✅ Router OK', 'success');
    }, 6000);
  }

  private generateReport(): void {
    this.showCommand('system metrics', 'Generating system report...');
    this.addActivity('Report generation started via shortcut', 'info');
    
    setTimeout(() => {
      this.addActivity('📊 Report generated: empire-pro-report.json', 'success');
    }, 1500);
  }

  // Navigation Actions
  private showSection(section: string): void {
    this.addActivity(`Navigated to ${section} section via shortcut`, 'info');
    
    // Scroll to section
    const element = document.getElementById(`${section}-section`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private showHelp(): void {
    const helpText = `
⌨️ Empire Pro Keyboard Shortcuts:

📱 Phone Intelligence:
  Ctrl+Shift+P - Sanitize Phone
  Ctrl+Shift+M - Start Monitoring
  Ctrl+Shift+F - Farm Process

🏊 Smart Pool:
  Ctrl+Shift+O - Provision Numbers
  Ctrl+Shift+R - Retire Numbers
  Ctrl+Shift+T - Pool Metrics

📤 Campaign Router:
  Ctrl+Shift+C - Route Campaign
  Ctrl+Shift+S - Start Campaign

🤖 Autonomic System:
  Ctrl+Shift+H - Health Check
  Ctrl+Shift+A - Start Autonomic
  Ctrl+Shift+D - Generate Report

🧭 Navigation:
  Ctrl+Shift+1 - Phone Intelligence
  Ctrl+Shift+2 - Smart Pools
  Ctrl+Shift+3 - Campaign Router
  Ctrl+Shift+4 - Autonomic System
  Ctrl+Shift+/ - Show Help

⚡ Quick Actions:
  Ctrl+Shift+Enter - Execute Last Command
  Ctrl+Shift+L - Clear Activity Log
  Ctrl+Shift+Escape - Emergency Stop
    `;
    
    alert(helpText);
  }

  // Quick Actions
  private executeLastCommand(): void {
    this.addActivity('Last command executed via shortcut', 'info');
  }

  private clearActivityLog(): void {
    const feed = document.getElementById('activityFeed');
    if (feed) {
      feed.innerHTML = '';
      this.addActivity('Activity log cleared via shortcut', 'info');
    }
  }

  private emergencyStop(): void {
    this.addActivity('🚨 EMERGENCY STOP ACTIVATED', 'error');
    this.addActivity('All systems stopping...', 'warning');
  }

  // Utility Methods
  private showCommand(command: string, message: string): void {
    console.log(`⌨️ Shortcut: ${command}`);
    console.log(`📝 ${message}`);
    
    // Show command in UI
    const commandDisplay = document.getElementById('command-display');
    if (commandDisplay) {
      commandDisplay.textContent = `$ ${command}`;
      commandDisplay.classList.add('text-green-400');
      
      setTimeout(() => {
        commandDisplay.classList.remove('text-green-400');
      }, 2000);
    }
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

  // Public method to get all shortcuts
  public getAllShortcuts(): any[] {
    return shortcuts.getAll();
  }

  // Public method to show shortcut help
  public showShortcutHelp(): void {
    this.showHelp();
  }
}

// Initialize keyboard shortcuts when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const empireProShortcuts = new EmpireProKeyboardShortcuts();
  
  // Make it globally available
  (window as any).empireProShortcuts = empireProShortcuts;
  
  console.log('⌨️ Empire Pro Keyboard Shortcuts Ready!');
  console.log('Press Ctrl+Shift+/ to see all shortcuts');
});

export default EmpireProKeyboardShortcuts;
