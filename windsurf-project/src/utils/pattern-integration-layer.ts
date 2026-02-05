/**
 * Empire Pro Pattern Integration Layer
 * Connects the advanced dashboard with the complete pattern ecosystem
 */

import { MASTER_MATRIX } from '../utils/master-matrix';

export class PatternIntegrationLayer {
  private dashboard: any;
  private profileManager: any;
  private patterns: Map<string, any> = new Map();
  private activeWorkflows: Map<string, any> = new Map();

  constructor(dashboard: any, profileManager: any) {
    this.dashboard = dashboard;
    this.profileManager = profileManager;
    this.initializePatterns();
    this.setupPatternShortcuts();
    this.startPatternMonitoring();
  }

  private initializePatterns(): void {
    // Load all patterns from MASTER_MATRIX
    const rows = MASTER_MATRIX.getRows().filter(r => 
      r.section && parseInt(r.section.split(':')[1]) >= 89
    );

    rows.forEach(row => {
      this.patterns.set(row.section, {
        id: row.section,
        name: row.name,
        performance: row.perf,
        roi: row.roi,
        category: this.getPatternCategory(row.section),
        status: 'active',
        metrics: {
          executions: 0,
          avgLatency: 0,
          successRate: 100,
          lastExecution: null
        }
      });
    });

    console.log(`🧠 Loaded ${this.patterns.size} patterns into integration layer`);
  }

  private getPatternCategory(section: string): string {
    const sectionNum = parseInt(section.split(':')[1]);
    if (sectionNum >= 89 && sectionNum <= 93) return 'core';
    if (sectionNum >= 97 && sectionNum <= 100) return 'workflow';
    return 'utility';
  }

  private setupPatternShortcuts(): void {
    // Pattern execution shortcuts
    const patternShortcuts = [
      {
        key: 'ctrl+shift+8',
        description: 'Execute Phone Sanitizer',
        action: () => this.executePattern('§Filter:89'),
        category: 'pattern'
      },
      {
        key: 'ctrl+shift+9',
        description: 'Execute Number Qualifier',
        action: () => this.executePattern('§Pattern:90'),
        category: 'pattern'
      },
      {
        key: 'ctrl+shift+0',
        description: 'Execute IPQS Query',
        action: () => this.executePattern('§Query:91'),
        category: 'pattern'
      },
      {
        key: 'ctrl+alt+8',
        description: 'Execute Health Monitor',
        action: () => this.executeWorkflow('§Workflow:97'),
        category: 'workflow'
      },
      {
        key: 'ctrl+alt+9',
        description: 'Execute Smart Pool',
        action: () => this.executeWorkflow('§Workflow:98'),
        category: 'workflow'
      },
      {
        key: 'ctrl+alt+0',
        description: 'Execute Campaign Router',
        action: () => this.executeWorkflow('§Workflow:99'),
        category: 'workflow'
      },
      {
        key: 'ctrl+shift+f1',
        description: 'Show Pattern Status',
        action: () => this.showPatternStatus(),
        category: 'pattern'
      },
      {
        key: 'ctrl+shift+f2',
        description: 'Show Workflow Status',
        action: () => this.showWorkflowStatus(),
        category: 'workflow'
      },
      {
        key: 'ctrl+shift+f3',
        description: 'Generate Pattern Report',
        action: () => this.generatePatternReport(),
        category: 'pattern'
      }
    ];

    // Register shortcuts with current profile
    patternShortcuts.forEach(shortcut => {
      this.registerShortcut(shortcut);
    });
  }

  private registerShortcut(shortcut: any): void {
    document.addEventListener('keydown', (e) => {
      if (this.matchesShortcut(e, shortcut.key)) {
        e.preventDefault();
        shortcut.action();
        this.addActivity(`Pattern shortcut: ${shortcut.description}`, 'success');
      }
    });
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
    const parts = shortcut.toLowerCase().split('+');
    return parts.every(part => {
      switch(part) {
        case 'ctrl': return event.ctrlKey;
        case 'shift': return event.shiftKey;
        case 'alt': return event.altKey;
        case 'f1': return event.key === 'F1';
        case 'f2': return event.key === 'F2';
        case 'f3': return event.key === 'F3';
        default: return event.key.toLowerCase() === part;
      }
    });
  }

  async executePattern(patternId: string): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      this.addActivity(`Pattern ${patternId} not found`, 'error');
      return;
    }

    const startTime = Date.now();
    this.addActivity(`Executing ${pattern.name}...`, 'info');

    try {
      // Simulate pattern execution
      await this.simulatePatternExecution(pattern);
      
      const executionTime = Date.now() - startTime;
      pattern.metrics.executions++;
      pattern.metrics.avgLatency = (pattern.metrics.avgLatency + executionTime) / 2;
      pattern.metrics.lastExecution = new Date();

      this.addActivity(`✅ ${pattern.name} executed in ${executionTime}ms`, 'success');
      this.updatePatternDisplay(pattern);
      
    } catch (error) {
      this.addActivity(`❌ Failed to execute ${pattern.name}: ${error}`, 'error');
      pattern.metrics.successRate = Math.max(0, pattern.metrics.successRate - 5);
    }
  }

  async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.patterns.get(workflowId);
    if (!workflow) {
      this.addActivity(`Workflow ${workflowId} not found`, 'error');
      return;
    }

    const startTime = Date.now();
    this.addActivity(`Starting workflow ${workflow.name}...`, 'info');

    try {
      // Simulate workflow execution with sub-patterns
      await this.simulateWorkflowExecution(workflow);
      
      const executionTime = Date.now() - startTime;
      workflow.metrics.executions++;
      workflow.metrics.avgLatency = (workflow.metrics.avgLatency + executionTime) / 2;
      workflow.metrics.lastExecution = new Date();

      this.activeWorkflows.set(workflowId, {
        ...workflow,
        startTime: new Date(),
        status: 'running'
      });

      this.addActivity(`✅ Workflow ${workflow.name} started in ${executionTime}ms`, 'success');
      this.updateWorkflowDisplay(workflow);
      
    } catch (error) {
      this.addActivity(`❌ Failed to start workflow ${workflow.name}: ${error}`, 'error');
      workflow.metrics.successRate = Math.max(0, workflow.metrics.successRate - 5);
    }
  }

  private async simulatePatternExecution(pattern: any): Promise<void> {
    // Simulate different execution times based on pattern type
    const baseTime = this.getBaseExecutionTime(pattern.id);
    const variance = Math.random() * baseTime * 0.3;
    await new Promise(resolve => setTimeout(resolve, baseTime + variance));
  }

  private async simulateWorkflowExecution(workflow: any): Promise<void> {
    // Workflows take longer and involve multiple steps
    const baseTime = this.getBaseExecutionTime(workflow.id) * 2;
    const variance = Math.random() * baseTime * 0.2;
    await new Promise(resolve => setTimeout(resolve, baseTime + variance));
  }

  private getBaseExecutionTime(patternId: string): number {
    const times: { [key: string]: number } = {
      '§Filter:89': 80,    // Phone Sanitizer
      '§Pattern:90': 1500, // Validator
      '§Query:91': 200,    // IPQS Query
      '§Filter:92': 20,    // Qualifier
      '§Pattern:93': 300,  // Router
      '§Workflow:97': 5000, // Health Monitor
      '§Workflow:98': 2000, // Smart Pool
      '§Workflow:99': 3000, // Campaign Router
      '§Workflow:100': 100 // Autonomic Controller
    };
    return times[patternId] || 1000;
  }

  private updatePatternDisplay(pattern: any): void {
    const patternElement = document.getElementById(`pattern-${pattern.id}`);
    if (patternElement) {
      patternElement.innerHTML = this.generatePatternCard(pattern);
    }
  }

  private updateWorkflowDisplay(workflow: any): void {
    const workflowElement = document.getElementById(`workflow-${workflow.id}`);
    if (workflowElement) {
      workflowElement.innerHTML = this.generateWorkflowCard(workflow);
    }
  }

  private generatePatternCard(pattern: any): string {
    return `
      <div class="bg-gray-700 rounded-lg p-4 border border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-semibold">${pattern.name}</h4>
          <span class="text-xs text-green-400">Active</span>
        </div>
        <div class="text-sm text-gray-400 space-y-1">
          <div>Performance: ${pattern.performance}</div>
          <div>ROI: ${pattern.roi}</div>
          <div>Executions: ${pattern.metrics.executions}</div>
          <div>Avg Latency: ${pattern.metrics.avgLatency.toFixed(1)}ms</div>
        </div>
      </div>
    `;
  }

  private generateWorkflowCard(workflow: any): string {
    const isActive = this.activeWorkflows.has(workflow.id);
    return `
      <div class="bg-gray-700 rounded-lg p-4 border ${isActive ? 'border-green-500' : 'border-gray-600'}">
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-semibold">${workflow.name}</h4>
          <span class="text-xs ${isActive ? 'text-green-400' : 'text-gray-400'}">
            ${isActive ? 'Running' : 'Idle'}
          </span>
        </div>
        <div class="text-sm text-gray-400 space-y-1">
          <div>Performance: ${workflow.performance}</div>
          <div>ROI: ${workflow.roi}</div>
          <div>Executions: ${workflow.metrics.executions}</div>
          <div>Avg Latency: ${workflow.metrics.avgLatency.toFixed(1)}ms</div>
        </div>
      </div>
    `;
  }

  private showPatternStatus(): void {
    const corePatterns = Array.from(this.patterns.values())
      .filter(p => p.category === 'core');
    
    this.showStatusPanel('Core Patterns Status', corePatterns);
  }

  private showWorkflowStatus(): void {
    const workflows = Array.from(this.patterns.values())
      .filter(p => p.category === 'workflow');
    
    this.showStatusPanel('Workflow Status', workflows);
  }

  private showStatusPanel(title: string, items: any[]): void {
    const panel = document.createElement('div');
    panel.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    panel.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
        <h3 class="text-xl font-bold mb-4">${title}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${items.map(item => `
            <div class="bg-gray-700 rounded-lg p-4">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-semibold">${item.name}</h4>
                <span class="text-xs text-green-400">${item.status}</span>
              </div>
              <div class="text-sm text-gray-400 space-y-1">
                <div>Performance: ${item.performance}</div>
                <div>ROI: ${item.roi}</div>
                <div>Executions: ${item.metrics.executions}</div>
                <div>Success Rate: ${item.metrics.successRate}%</div>
                <div>Avg Latency: ${item.metrics.avgLatency.toFixed(1)}ms</div>
              </div>
            </div>
          `).join('')}
        </div>
        <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-red-600 hover:bg-red-700 p-3 rounded transition-all">
          Close
        </button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  private generatePatternReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      totalPatterns: this.patterns.size,
      categories: {
        core: Array.from(this.patterns.values()).filter(p => p.category === 'core').length,
        workflow: Array.from(this.patterns.values()).filter(p => p.category === 'workflow').length,
        utility: Array.from(this.patterns.values()).filter(p => p.category === 'utility').length
      },
      performance: {
        totalExecutions: Array.from(this.patterns.values()).reduce((sum, p) => sum + p.metrics.executions, 0),
        avgLatency: Array.from(this.patterns.values()).reduce((sum, p) => sum + p.metrics.avgLatency, 0) / this.patterns.size,
        overallSuccessRate: Array.from(this.patterns.values()).reduce((sum, p) => sum + p.metrics.successRate, 0) / this.patterns.size
      },
      activeWorkflows: this.activeWorkflows.size,
      patterns: Array.from(this.patterns.values()).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        performance: p.performance,
        roi: p.roi,
        metrics: p.metrics
      }))
    };

    console.log('📊 Pattern Report Generated:', report);
    this.addActivity('📊 Pattern report generated and logged to console', 'success');
    
    // Show summary
    alert(`Pattern Report Generated:
Total Patterns: ${report.totalPatterns}
Core Patterns: ${report.categories.core}
Workflows: ${report.categories.workflow}
Total Executions: ${report.performance.totalExecutions}
Avg Latency: ${report.performance.avgLatency.toFixed(1)}ms
Active Workflows: ${report.activeWorkflows}

Full report available in console.`);
  }

  private startPatternMonitoring(): void {
    // Start real-time monitoring of patterns
    setInterval(() => {
      this.updatePatternMetrics();
    }, 5000);
  }

  private updatePatternMetrics(): void {
    // Simulate metric updates
    this.patterns.forEach(pattern => {
      // Random metric fluctuations
      if (Math.random() > 0.8) {
        pattern.metrics.executions += Math.floor(Math.random() * 5);
        pattern.metrics.successRate = Math.min(100, Math.max(95, pattern.metrics.successRate + (Math.random() - 0.5) * 2));
      }
    });
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
      <span class="text-xs text-purple-400">🧠</span>
    `;
    
    feed.insertBefore(item, feed.firstChild);
    
    // Keep only last 10 items
    while (feed.children.length > 10) {
      feed.removeChild(feed.lastChild);
    }
  }

  public getPatternStatus(): any {
    return {
      totalPatterns: this.patterns.size,
      activeWorkflows: this.activeWorkflows.size,
      categories: {
        core: Array.from(this.patterns.values()).filter(p => p.category === 'core').length,
        workflow: Array.from(this.patterns.values()).filter(p => p.category === 'workflow').length,
        utility: Array.from(this.patterns.values()).filter(p => p.category === 'utility').length
      }
    };
  }

  public getAllPatterns(): any[] {
    return Array.from(this.patterns.values());
  }

  public getActiveWorkflows(): any[] {
    return Array.from(this.activeWorkflows.values());
  }
}

export default PatternIntegrationLayer;
