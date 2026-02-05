/**
 * API Monitoring Template
 * Real-time monitoring, analytics, and performance tracking
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateApiMonitoringPage(employee: EmployeeData, pathname?: string): string {
  const content = generateApiMonitoringContent(employee);

  const html = `
    ${generateHtmlHead(
      `API Monitoring - ${employee.name}`,
      'Real-time API monitoring, analytics, and performance tracking'
    )}
    ${generateHeader(employee, '/api/monitoring')}
    <main class="api-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateApiMonitoringContent(employee: EmployeeData): string {
  return `
    <div class="api-monitoring">
      <div class="monitoring-header">
        <h1>📊 API Monitoring Dashboard</h1>
        <p>Real-time performance monitoring and analytics</p>
      </div>

      <div class="monitoring-controls">
        <div class="control-group">
          <label for="time-range">Time Range:</label>
          <select id="time-range" onchange="updateTimeRange(this.value)">
            <option value="1h">Last Hour</option>
            <option value="24h" selected>Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        <div class="control-group">
          <label for="refresh-rate">Refresh:</label>
          <select id="refresh-rate" onchange="updateRefreshRate(this.value)">
            <option value="5000">5 seconds</option>
            <option value="10000" selected>10 seconds</option>
            <option value="30000">30 seconds</option>
            <option value="60000">1 minute</option>
          </select>
        </div>
        <div class="control-group">
          <button class="btn-primary" onclick="generateLogAnalytics()">📊 Generate Analytics</button>
          <button class="btn-secondary" onclick="exportMonitoringData()">📤 Export Data</button>
        </div>
      </div>

      <div class="monitoring-overview">
        <h2>📈 Real-Time Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">⚡</div>
            <div class="metric-content">
              <div class="metric-value">47,231</div>
              <div class="metric-label">Total Requests</div>
              <div class="metric-change positive">+8.3%</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">✅</div>
            <div class="metric-content">
              <div class="metric-value">99.9%</div>
              <div class="metric-label">Success Rate</div>
              <div class="metric-change positive">+0.1%</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-content">
              <div class="metric-value">142ms</div>
              <div class="metric-label">Avg Response Time</div>
              <div class="metric-change positive">-12ms</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🕐</div>
            <div class="metric-content">
              <div class="metric-value">8:00 PM</div>
              <div class="metric-label">Peak Hour</div>
              <div class="metric-change neutral">↗️</div>
            </div>
          </div>
        </div>
      </div>

      <div class="monitoring-charts">
        <h2>📊 Performance Charts</h2>
        <div class="charts-grid">
          <div class="chart-container">
            <h3>Response Time Distribution</h3>
            <div class="chart-placeholder">
              <div class="bar-chart">
                <div class="bar" style="height: 20%"></div>
                <div class="bar" style="height: 35%"></div>
                <div class="bar" style="height: 65%"></div>
                <div class="bar" style="height: 85%"></div>
                <div class="bar" style="height: 60%"></div>
                <div class="bar" style="height: 45%"></div>
              </div>
              <div class="chart-labels">
                <span>0-50ms</span>
                <span>50-100ms</span>
                <span>100-150ms</span>
                <span>150-200ms</span>
                <span>200-250ms</span>
                <span>250ms+</span>
              </div>
            </div>
          </div>

          <div class="chart-container">
            <h3>Requests by Endpoint</h3>
            <div class="chart-placeholder">
              <div class="pie-chart">
                <div class="pie-segment" style="background: #3b82f6; flex: 25"></div>
                <div class="pie-segment" style="background: #10b981; flex: 20"></div>
                <div class="pie-segment" style="background: #f59e0b; flex: 15"></div>
                <div class="pie-segment" style="background: #ef4444; flex: 10"></div>
                <div class="pie-segment" style="background: #8b5cf6; flex: 30"></div>
              </div>
              <div class="chart-legend">
                <div class="legend-item">
                  <span class="legend-color" style="background: #3b82f6"></span>
                  <span>/api/analytics</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background: #10b981"></span>
                  <span>/api/health</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background: #f59e0b"></span>
                  <span>/api/profile</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background: #ef4444"></span>
                  <span>/api/tools</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background: #8b5cf6"></span>
                  <span>Others</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="recent-activity">
        <h2>📋 Recent API Activity</h2>
        <div class="activity-feed">
          <div class="activity-item success">
            <div class="activity-time">[14:32:15]</div>
            <div class="activity-method">GET</div>
            <div class="activity-endpoint">/api/clients</div>
            <div class="activity-status">200 OK</div>
            <div class="activity-duration">142ms</div>
          </div>
          <div class="activity-item success">
            <div class="activity-time">[14:31:42]</div>
            <div class="activity-method">POST</div>
            <div class="activity-endpoint">/api/bets</div>
            <div class="activity-status">201 Created</div>
            <div class="activity-duration">156ms</div>
          </div>
          <div class="activity-item success">
            <div class="activity-time">[14:30:18]</div>
            <div class="activity-method">GET</div>
            <div class="activity-endpoint">/api/analytics</div>
            <div class="activity-status">200 OK</div>
            <div class="activity-duration">89ms</div>
          </div>
          <div class="activity-item success">
            <div class="activity-time">[14:29:55]</div>
            <div class="activity-method">PUT</div>
            <div class="activity-endpoint">/api/profiles</div>
            <div class="activity-status">200 OK</div>
            <div class="activity-duration">203ms</div>
          </div>
          <div class="activity-item success">
            <div class="activity-time">[14:28:33]</div>
            <div class="activity-method">GET</div>
            <div class="activity-endpoint">/api/health</div>
            <div class="activity-status">200 OK</div>
            <div class="activity-duration">67ms</div>
          </div>
        </div>
      </div>

      <div class="alerts-section">
        <h2>🚨 Active Alerts</h2>
        <div class="alerts-list">
          <div class="alert-item warning">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <div class="alert-title">High Response Time</div>
              <div class="alert-description">/api/analytics response time > 200ms for 5 minutes</div>
              <div class="alert-time">2 minutes ago</div>
            </div>
            <div class="alert-actions">
              <button onclick="acknowledgeAlert('high-response')">✅ Acknowledge</button>
            </div>
          </div>
          <div class="alert-item info">
            <div class="alert-icon">ℹ️</div>
            <div class="alert-content">
              <div class="alert-title">Traffic Spike</div>
              <div class="alert-description">Request volume increased by 35% in last hour</div>
              <div class="alert-time">15 minutes ago</div>
            </div>
            <div class="alert-actions">
              <button onclick="acknowledgeAlert('traffic-spike')">✅ Acknowledge</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Monitoring functions
declare function updateTimeRange(range: string): void;
declare function updateRefreshRate(rate: string): void;
declare function generateLogAnalytics(): void;
declare function exportMonitoringData(): void;
declare function acknowledgeAlert(alertId: string): void;
