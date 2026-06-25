#!/usr/bin/env bun
/**
 * Water Dashboard with Bun Hot Module Replacement (HMR)
 * Features state persistence, hot updates, and development enhancements
 */

import { logger } from '../scripts/enhanced-logging-system';
import { errorTracker } from '../scripts/error-code-index';

// !==!==!===== HMR STATE MANAGEMENT !==!==!=====
interface DashboardState {
  metrics: {
    activeLogs: number;
    cacheHits: number;
    wsConnections: number;
    sqliteOps: number;
  };
  errors: Map<string, number>;
  timezone: string;
  logFilter: string;
  startTime: number;
  updateCount: number;
}

// **HMR STATE PERSISTENCE** - Using import.meta.hot.data
const dashboardState: DashboardState = (import.meta.hot.data.state ??= {
  metrics: {
    activeLogs: 1245789,
    cacheHits: 12456,
    wsConnections: 1247,
    sqliteOps: 89200,
  },
  errors: new Map(),
  timezone: 'America/New_York',
  logFilter: 'all',
  startTime: Date.now(),
  updateCount: 0,
});

// !==!==!===== HMR EVENT HANDLERS !==!==!=====
if (import.meta.hot) {
  logger.info('HMR', '2.0.0', 'Hot Module Replacement enabled for dashboard');

  // **BEFORE UPDATE** - Save current state
  import.meta.hot.on('bun:beforeUpdate', () => {
    dashboardState.updateCount++;
    logger.info('HMR', '2.0.0', `Saving state before update #${dashboardState.updateCount}`);

    // Save DOM state if running in browser environment
    if (typeof window !== 'undefined') {
      const errorCounter = document.getElementById('errorCounter');
      if (errorCounter) {
        const errorCount = parseInt(errorCounter.textContent?.match(/\d+/)?.[0] || '0');
        dashboardState.errors.set('total', errorCount);
      }

      const timezoneSelect = document.getElementById('timezoneSelect') as HTMLSelectElement;
      if (timezoneSelect) {
        dashboardState.timezone = timezoneSelect.value;
      }
    }
  });

  // **AFTER UPDATE** - Restore state and apply changes
  import.meta.hot.on('bun:afterUpdate', () => {
    logger.success('HMR', '2.0.0', `State restored after update #${dashboardState.updateCount}`);

    // Restore DOM state
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        restoreDashboardState();
        addHMRNotification('🔥 Hot reload applied - state preserved!');
      }, 100);
    }
  });

  // **CONNECTION EVENTS**
  import.meta.hot.on('bun:ws:connect', () => {
    logger.success('HMR', '2.0.0', 'HMR WebSocket connected');
    if (typeof window !== 'undefined') {
      addHMRNotification('🟢 HMR connected', 'success');
    }
  });

  import.meta.hot.on('bun:ws:disconnect', () => {
    logger.warning('HMR', '2.0.0', 'HMR WebSocket disconnected');
    if (typeof window !== 'undefined') {
      addHMRNotification('🔴 HMR disconnected', 'warning');
    }
  });

  // **ERROR HANDLING**
  import.meta.hot.on('bun:error', error => {
    logger.error('HMR', '2.0.0', `Build error: ${error.message}`, 'E1001');
    if (typeof window !== 'undefined') {
      addHMRNotification(`❌ Build error: ${error.message}`, 'error');
    }
  });

  // **CLEANUP ON DISPOSE**
  import.meta.hot.dispose(() => {
    logger.info('HMR', '2.0.0', 'Disposing dashboard module - cleaning up resources');

    // Clean up any intervals, event listeners, or other resources
    if (typeof window !== 'undefined') {
      const intervals = import.meta.hot.data.intervals || [];
      intervals.forEach((id: number) => clearInterval(id));
    }
  });
}

// !==!==!===== DASHBOARD CORE FUNCTIONALITY !==!==!=====
export class HMREnhancedDashboard {
  private updateIntervals: number[] = [];
  private wsConnection: WebSocket | null = null;

  constructor() {
    if (import.meta.hot) {
      // Store intervals for cleanup
      import.meta.hot.data.intervals = this.updateIntervals;
    }

    this.initializeDashboard();
  }

  private initializeDashboard(): void {
    logger.info('DASHBOARD', '2.0.0', 'Initializing HMR-enhanced dashboard');

    if (typeof window === 'undefined') return;

    // Restore state from HMR
    this.restoreState();

    // Start real-time updates
    this.startRealTimeUpdates();

    // Setup WebSocket if not preserved
    this.setupWebSocket();

    // Add HMR status indicator
    this.addHMRStatusIndicator();
  }

  private restoreState(): void {
    // Restore metrics
    this.updateMetricsFromState();

    // Restore error counts
    const errorCount = dashboardState.errors.get('total') || 0;
    const errorCounter = document.getElementById('errorCounter');
    if (errorCounter) {
      errorCounter.textContent = `Errors: ${errorCount}`;
    }

    // Restore timezone
    const timezoneSelect = document.getElementById('timezoneSelect') as HTMLSelectElement;
    if (timezoneSelect) {
      timezoneSelect.value = dashboardState.timezone;
    }

    logger.success('DASHBOARD', '2.0.0', 'Dashboard state restored from HMR');
  }

  private updateMetricsFromState(): void {
    const activeLogs = document.getElementById('activeLogs');
    const cacheHits = document.getElementById('cacheHits');
    const wsConnections = document.getElementById('wsConnections');
    const sqliteOps = document.getElementById('sqliteOps');

    if (activeLogs) activeLogs.textContent = dashboardState.metrics.activeLogs.toLocaleString();
    if (cacheHits) cacheHits.textContent = dashboardState.metrics.cacheHits.toLocaleString();
    if (wsConnections)
      wsConnections.textContent = dashboardState.metrics.wsConnections.toLocaleString();
    if (sqliteOps)
      sqliteOps.textContent = (dashboardState.metrics.sqliteOps / 1000).toFixed(1) + 'K';
  }

  private startRealTimeUpdates(): void {
    // Clear existing intervals
    this.updateIntervals.forEach(id => clearInterval(id));
    this.updateIntervals = [];

    // Metrics update interval
    const metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 2000);
    this.updateIntervals.push(metricsInterval);

    // Performance bars update interval
    const perfInterval = setInterval(() => {
      this.updatePerformanceBars();
    }, 3000);
    this.updateIntervals.push(perfInterval);

    // Log events interval
    const logInterval = setInterval(() => {
      this.addRandomLogEvent();
    }, 4000);
    this.updateIntervals.push(logInterval);

    logger.info(
      'DASHBOARD',
      '2.0.0',
      `Started ${this.updateIntervals.length} real-time update intervals`
    );
  }

  private updateMetrics(): void {
    // Update state and DOM
    dashboardState.metrics.activeLogs += Math.floor(Math.random() * 100);
    dashboardState.metrics.cacheHits += Math.floor(Math.random() * 10);
    dashboardState.metrics.wsConnections += Math.floor(Math.random() * 20) - 10;
    dashboardState.metrics.sqliteOps += Math.floor(Math.random() * 1000);

    // Keep connections in reasonable range
    dashboardState.metrics.wsConnections = Math.max(
      1000,
      Math.min(2000, dashboardState.metrics.wsConnections)
    );

    this.updateMetricsFromState();
  }

  private updatePerformanceBars(): void {
    const bars = document.querySelectorAll('.perf-fill');
    bars.forEach(bar => {
      const currentWidth = parseInt((bar as HTMLElement).style.width) || 50;
      const variation = Math.floor(Math.random() * 10) - 5;
      const newWidth = Math.max(10, Math.min(100, currentWidth + variation));
      (bar as HTMLElement).style.width = newWidth + '%';

      const valueSpan = bar.querySelector('.perf-value');
      if (valueSpan) {
        if (valueSpan.textContent?.includes('ms')) {
          valueSpan.textContent = Math.max(5, Math.floor(100 - newWidth)) + 'ms';
        } else if (valueSpan.textContent?.includes('%')) {
          valueSpan.textContent = newWidth + '%';
        }
      }
    });
  }

  private addRandomLogEvent(): void {
    const events = [
      { level: 'info', module: 'DASHBOARD', message: 'HMR update applied successfully' },
      { level: 'success', module: 'DATABASE', message: 'Connection pool optimized' },
      {
        level: 'warning',
        module: 'API',
        message: 'Rate limit threshold reached',
        errorCode: 'E3002',
      },
      {
        level: 'error',
        module: 'NETWORK',
        message: 'Timeout connecting to Fire22',
        errorCode: 'E4001',
      },
      {
        level: 'debug',
        module: 'HMR',
        message: `State preserved across ${dashboardState.updateCount} updates`,
      },
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    this.addLogEntry(event.level, event.module, '2.0.0', event.message, event.errorCode);
  }

  private addLogEntry(
    level: string,
    module: string,
    version: string,
    message: string,
    errorCode?: string
  ): void {
    const streamContent = document.getElementById('streamContent');
    if (!streamContent) return;

    const entry = document.createElement('div');
    entry.className = `stream-entry ${level}`;

    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    let html = `
      <span class="stream-timestamp">[${timestamp}]</span>
      <span class="stream-level ${level}">[${level.toUpperCase()}]</span>
      <span class="stream-module ${module.toLowerCase()}">[${module}]</span>
      <span class="stream-version">[v${version}]</span>
    `;

    if (errorCode) {
      html += `<span class="stream-error-code">[${errorCode}]</span>`;
      // Track error in state
      const currentCount = dashboardState.errors.get(errorCode) || 0;
      dashboardState.errors.set(errorCode, currentCount + 1);

      const totalErrors = dashboardState.errors.get('total') || 0;
      dashboardState.errors.set('total', totalErrors + 1);

      // Update error counter
      const errorCounter = document.getElementById('errorCounter');
      if (errorCounter) {
        errorCounter.textContent = `Errors: ${dashboardState.errors.get('total')}`;
      }
    }

    html += `<span class="stream-message">${message}</span>`;
    entry.innerHTML = html;

    streamContent.appendChild(entry);

    // Auto-scroll and cleanup
    const dataStream = document.getElementById('dataStream');
    if (dataStream) {
      dataStream.scrollTop = dataStream.scrollHeight;
    }

    // Keep only last 50 entries
    while (streamContent.children.length > 50) {
      streamContent.removeChild(streamContent.firstChild!);
    }
  }

  private setupWebSocket(): void {
    // Reuse existing WebSocket from HMR data
    this.wsConnection = import.meta.hot.data.wsConnection;

    if (!this.wsConnection || this.wsConnection.readyState === WebSocket.CLOSED) {
      // Create new WebSocket connection
      try {
        this.wsConnection = new WebSocket(`ws://${location.host}`);
        import.meta.hot.data.wsConnection = this.wsConnection;

        this.wsConnection.onopen = () => {
          logger.success('WEBSOCKET', '2.0.0', 'WebSocket connection established');
        };

        this.wsConnection.onmessage = event => {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        };

        this.wsConnection.onerror = error => {
          logger.error('WEBSOCKET', '2.0.0', 'WebSocket error occurred', 'E4001');
        };
      } catch (error) {
        logger.error('WEBSOCKET', '2.0.0', `Failed to create WebSocket: ${error}`, 'E4001');
      }
    }
  }

  private handleWebSocketMessage(data: any): void {
    if (data.type === 'metrics') {
      // Update metrics from server
      Object.assign(dashboardState.metrics, data.metrics);
      this.updateMetricsFromState();
    } else if (data.type === 'log') {
      // Add server log entry
      this.addLogEntry(data.level, data.module, data.version, data.message, data.errorCode);
    }
  }

  private addHMRStatusIndicator(): void {
    const header = document.querySelector('.header-content');
    if (!header) return;

    const hmrStatus = document.createElement('div');
    hmrStatus.id = 'hmrStatus';
    hmrStatus.className = 'hmr-status';
    hmrStatus.innerHTML = `
      <div class="hmr-indicator"></div>
      <span>HMR Ready</span>
    `;

    header.appendChild(hmrStatus);

    // Add CSS for HMR status
    const style = document.createElement('style');
    style.textContent = `
      .hmr-status {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(74, 222, 128, 0.1);
        border: 1px solid rgba(74, 222, 128, 0.3);
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        color: #4ade80;
        font-weight: bold;
      }
      .hmr-indicator {
        width: 8px;
        height: 8px;
        background: #4ade80;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      .hmr-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(10, 14, 39, 0.95);
        border: 1px solid rgba(64, 224, 208, 0.3);
        border-radius: 8px;
        padding: 12px 16px;
        color: #e0e6ed;
        font-size: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
      }
      .hmr-notification.success { border-color: rgba(74, 222, 128, 0.5); }
      .hmr-notification.warning { border-color: rgba(245, 158, 11, 0.5); }
      .hmr-notification.error { border-color: rgba(239, 68, 68, 0.5); }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// !==!==!===== UTILITY FUNCTIONS !==!==!=====
function restoreDashboardState(): void {
  const dashboard = new HMREnhancedDashboard();
}

function addHMRNotification(
  message: string,
  type: 'success' | 'warning' | 'error' = 'success'
): void {
  const notification = document.createElement('div');
  notification.className = `hmr-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// !==!==!===== MODULE EXPORTS !==!==!=====
export { dashboardState };

// **HMR SELF-ACCEPTANCE** - Enable hot replacement for this module
if (import.meta.hot) {
  // Accept hot updates without callback - most efficient approach
  import.meta.hot.accept();

  logger.info('HMR', '2.0.0', 'Dashboard module configured for hot replacement');
}

// !==!==!===== INITIALIZATION !==!==!=====
if (typeof window !== 'undefined') {
  // Initialize dashboard when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new HMREnhancedDashboard();
    });
  } else {
    new HMREnhancedDashboard();
  }
}
