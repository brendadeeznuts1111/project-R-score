// Enhanced dashboard with LSP integration

import { EventEmitter } from 'events';
import { LSPClient } from './LSPClient';
import { Diagnostic, CompletionItem, LSPPerformance, ThemeConfig } from './types';
import { Dashboard } from './Dashboard';
import styles from './LSPDashboard.module.css';

export interface LSPDashboardState {
  activeFile: string;
  diagnostics: Diagnostic[];
  completionItems: CompletionItem[];
  performance: LSPPerformance;
  theme: ThemeConfig;
}

export class LSPDashboard extends EventEmitter {
  private dashboard: Dashboard;
  private lspClient: LSPClient;
  private activeFile: string = '';
  private diagnostics: Diagnostic[] = [];
  private completionItems: CompletionItem[] = [];
  private performance: LSPPerformance;
  private theme: ThemeConfig;

  constructor(
    dashboard: Dashboard,
    lspClient: LSPClient,
    theme: ThemeConfig = { mode: 'dark', primaryColor: '#007acc' }
  ) {
    super();
    this.dashboard = dashboard;
    this.lspClient = lspClient;
    this.theme = theme;
    this.performance = {
      responseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      requestCount: 0,
      errorCount: 0
    };

    this.initializeLSP();
  }

  /**
   * Initialize LSP client and set up event listeners
   */
  private async initializeLSP(): Promise<void> {
    try {
      await this.lspClient.initialize();
      this.setupEventListeners();
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error('Failed to initialize LSP client:', error);
      this.renderError('LSP initialization failed');
    }
  }

  /**
   * Set up event listeners for LSP events
   */
  private setupEventListeners(): void {
    this.lspClient.on('diagnostic', (diagnostics: Diagnostic[]) => {
      this.diagnostics = diagnostics;
      this.updateRender();
    });

    this.lspClient.on('completion', (items: CompletionItem[]) => {
      this.completionItems = items;
      this.updateRender();
    });

    this.lspClient.on('performance', (metrics: LSPPerformance) => {
      this.performance = metrics;
      this.updateRender();
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    this.performance = {
      ...this.performance,
      responseTime: this.lspClient.getAverageResponseTime(),
      memoryUsage: this.lspClient.getMemoryUsage(),
      cpuUsage: this.lspClient.getCpuUsage(),
      requestCount: this.lspClient.getRequestCount(),
      errorCount: this.lspClient.getErrorCount()
    };
  }

  /**
   * Render the main dashboard
   */
  render(): string {
    return `
      <div class="${styles['lsp-dashboard']}" data-theme="${this.theme.mode}">
        <div class="${styles['header']}">
          <h2>LSP Development Dashboard</h2>
          <div class="${styles['status-bar']}">
            <span class="${styles['file-status']}">Active: ${this.activeFile || 'No file selected'}</span>
            <span class="${styles['lsp-status']} ${this.lspClient.isConnected() ? styles['connected'] : styles['disconnected']}">
              ${this.lspClient.isConnected() ? '🟢 LSP Connected' : '🔴 LSP Disconnected'}
            </span>
          </div>
        </div>
        
        <div class="${styles['main-content']}">
          <div class="${styles['code-editor']}">
            <div class="${styles['editor-header']}">
              <h3>Code Editor</h3>
              <div class="${styles['editor-controls']}">
                <button class="${styles['btn']}" onclick="formatDocument()">Format</button>
                <button class="${styles['btn']}" onclick="showCompletions()">Completions</button>
              </div>
            </div>
            <div id="monaco-editor" class="${styles['editor-container']}"></div>
          </div>
          
          <div class="${styles['side-panel']}">
            <div class="${styles['diagnostics-panel']}">
              <h3>Real-time Diagnostics</h3>
              <div class="${styles['diagnostics-summary']}">
                <span class="${styles['error-count']}">${this.getErrorCount()} Errors</span>
                <span class="${styles['warning-count']}">${this.getWarningCount()} Warnings</span>
                <span class="${styles['info-count']}">${this.getInfoCount()} Info</span>
              </div>
              <div class="${styles['diagnostics-list']}">
                ${this.renderDiagnostics()}
              </div>
            </div>
            
            <div class="${styles['performance-panel']}">
              <h3>LSP Performance</h3>
              <div class="${styles['metrics-grid']}">
                ${this.renderPerformanceMetrics()}
              </div>
            </div>
          </div>
        </div>
        
        <div class="${styles['footer']}">
          <div class="${styles['quick-actions']}">
            <button class="${styles['btn']}" onclick="applyAllQuickFixes()">Apply All Fixes</button>
            <button class="${styles['btn']}" onclick="clearDiagnostics()">Clear Diagnostics</button>
            <button class="${styles['btn']}" onclick="restartLSP()">Restart LSP</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render diagnostics list
   */
  private renderDiagnostics(): string {
    if (this.diagnostics.length === 0) {
      return `<div class="${styles['no-diagnostics']}">No diagnostics available</div>`;
    }

    const severityOrder: Record<string, number> = { 'error': 0, 'warning': 1, 'info': 2, 'hint': 3 };

    return this.diagnostics
      .sort((a, b) => {
        return (severityOrder[a.severity] || 999) - (severityOrder[b.severity] || 999);
      })
      .map(diagnostic => `
        <div class="${styles['diagnostic-item']} ${styles[diagnostic.severity]}" data-diagnostic-code="${diagnostic.code}">
          <div class="${styles['diagnostic-header']}">
            <span class="${styles['severity']} ${styles[diagnostic.severity]}">${this.getSeverityIcon(diagnostic.severity)}</span>
            <span class="${styles['line-number']}">Line ${diagnostic.range.start.line + 1}:${diagnostic.range.start.character + 1}</span>
            <span class="${styles['source']}">${diagnostic.source || 'LSP'}</span>
          </div>
          <div class="${styles['message']}">${this.escapeHtml(diagnostic.message)}</div>
          ${diagnostic.code ? `
            <div class="${styles['actions']}">
              <button class="${styles['quick-fix']}" onclick="applyQuickFix('${diagnostic.code}', ${JSON.stringify(diagnostic).replace(/"/g, '&quot;')})">
                Quick Fix
              </button>
              <button class="${styles['show-help']}" onclick="showHelp('${diagnostic.code}')">
                Help
              </button>
            </div>
          ` : ''}
        </div>
      `).join('');
  }

  /**
   * Render performance metrics
   */
  private renderPerformanceMetrics(): string {
    const metrics = [
      { label: 'Response Time', value: `${this.performance.responseTime.toFixed(1)}ms`, icon: '⚡' },
      { label: 'Memory Usage', value: `${(this.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB`, icon: '💾' },
      { label: 'CPU Usage', value: `${this.performance.cpuUsage.toFixed(1)}%`, icon: '🔥' },
      { label: 'Requests', value: this.performance.requestCount.toString(), icon: '📊' },
      { label: 'Errors', value: this.performance.errorCount.toString(), icon: '❌' }
    ];

    return metrics.map(metric => `
      <div class="${styles['metric-item']}">
        <span class="${styles['metric-icon']}">${metric.icon}</span>
        <div class="${styles['metric-details']}">
          <span class="${styles['metric-label']}">${metric.label}</span>
          <span class="${styles['metric-value']}">${metric.value}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️',
      'hint': '💡'
    };
    return icons[severity] || '❓';
  }

  /**
   * Get diagnostic counts by severity
   */
  private getErrorCount(): number {
    return this.diagnostics.filter(d => d.severity === 'error').length;
  }

  private getWarningCount(): number {
    return this.diagnostics.filter(d => d.severity === 'warning').length;
  }

  private getInfoCount(): number {
    return this.diagnostics.filter(d => d.severity === 'info' || d.severity === 'hint').length;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update render when data changes
   */
  private updateRender(): void {
    const dashboardElement = document.querySelector('.lsp-dashboard');
    if (dashboardElement) {
      dashboardElement.innerHTML = this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Attach event listeners to interactive elements
   */
  private attachEventListeners(): void {
    // Quick fix buttons
    document.querySelectorAll('.quick-fix').forEach(button => {
      button.addEventListener('click', (e) => {
        const code = (e.target as HTMLElement).getAttribute('data-diagnostic-code');
        if (code) {
          this.applyQuickFix(code);
        }
      });
    });

    // Help buttons
    document.querySelectorAll('.show-help').forEach(button => {
      button.addEventListener('click', (e) => {
        const code = (e.target as HTMLElement).getAttribute('data-diagnostic-code');
        if (code) {
          this.showHelp(code);
        }
      });
    });
  }

  /**
   * Apply quick fix for diagnostic
   */
  private async applyQuickFix(code: string): Promise<void> {
    try {
      await this.lspClient.applyQuickFix(code);
      this.showNotification('Quick fix applied successfully', 'success');
    } catch (error) {
      this.showNotification(`Failed to apply quick fix: ${error}`, 'error');
    }
  }

  /**
   * Show help for diagnostic code
   */
  private showHelp(code: string): void {
    const helpUrl = `https://example.com/help/${code}`;
    window.open(helpUrl, '_blank');
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Implementation would show a toast notification
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Render error state
   */
  private renderError(message: string): string {
    return `
      <div class="${styles['error-state']}">
        <div class="${styles['error-icon']}">❌</div>
        <div class="${styles['error-message']}">${message}</div>
        <button class="${styles['retry-btn']}" onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  /**
   * Set active file
   */
  public setActiveFile(filename: string): void {
    this.activeFile = filename;
    this.lspClient.openFile(filename);
    this.updateRender();
  }

  /**
   * Get current diagnostics
   */
  public getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  /**
   * Clear all diagnostics
   */
  public clearDiagnostics(): void {
    this.diagnostics = [];
    this.updateRender();
  }

  /**
   * Update theme
   */
  public updateTheme(theme: ThemeConfig): void {
    this.theme = theme;
    this.updateRender();
  }
}

// Global functions for onclick handlers
declare global {
  interface Window {
    applyQuickFix: (code: string) => void;
    showHelp: (code: string) => void;
    formatDocument: () => void;
    showCompletions: () => void;
    applyAllQuickFixes: () => void;
    clearDiagnostics: () => void;
    restartLSP: () => void;
  }
}

// Initialize global handlers
window.applyQuickFix = (code: string) => {
  console.log('Applying quick fix for:', code);
};

window.showHelp = (code: string) => {
  const helpUrl = `https://example.com/help/${code}`;
  window.open(helpUrl, '_blank');
};

window.formatDocument = () => {
  console.log('Formatting document...');
};

window.showCompletions = () => {
  console.log('Showing completions...');
};

window.applyAllQuickFixes = () => {
  console.log('Applying all quick fixes...');
};

window.clearDiagnostics = () => {
  console.log('Clearing diagnostics...');
};

window.restartLSP = () => {
  console.log('Restarting LSP...');
  location.reload();
};

export default LSPDashboard;
