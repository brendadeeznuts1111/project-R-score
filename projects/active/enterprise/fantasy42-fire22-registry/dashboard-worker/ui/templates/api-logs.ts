/**
 * API Logs Template
 * Log viewing, filtering, and analysis functionality
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateApiLogsPage(employee: EmployeeData, pathname?: string): string {
  const content = generateApiLogsContent(employee);

  const html = `
    ${generateHtmlHead(
      `API Logs - ${employee.name}`,
      'View and analyze API activity logs and system events'
    )}
    ${generateHeader(employee, '/api/logs')}
    <main class="api-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateApiLogsContent(employee: EmployeeData): string {
  return `
    <div class="api-logs">
      <div class="logs-header">
        <h1>📋 API Logs & Activity</h1>
        <p>Monitor and analyze API activity with advanced filtering</p>
      </div>

      <div class="logs-controls">
        <div class="control-section">
          <h3>🔍 Filters</h3>
          <div class="filter-grid">
            <div class="filter-group">
              <label for="method-filter">HTTP Method:</label>
              <select id="method-filter" onchange="updateFilterCriteria('method', this.value)">
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="status-filter">Status Code:</label>
              <select id="status-filter" onchange="updateFilterCriteria('status', this.value)">
                <option value="">All Statuses</option>
                <option value="200">200 OK</option>
                <option value="201">201 Created</option>
                <option value="400">400 Bad Request</option>
                <option value="401">401 Unauthorized</option>
                <option value="404">404 Not Found</option>
                <option value="500">500 Server Error</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="endpoint-filter">Endpoint:</label>
              <input type="text" id="endpoint-filter" placeholder="e.g., /api/health"
                     oninput="updateFilterCriteria('endpoint', this.value)">
            </div>
            <div class="filter-group">
              <label for="search-filter">Search:</label>
              <input type="text" id="search-filter" placeholder="Search logs..."
                     oninput="updateFilterCriteria('searchTerm', this.value)">
            </div>
          </div>
        </div>

        <div class="control-section">
          <h3>⚙️ Options</h3>
          <div class="options-grid">
            <div class="option-group">
              <label for="time-range">Time Range:</label>
              <select id="time-range" onchange="updateFilterCriteria('timeRange', this.value)">
                <option value="1">Last Hour</option>
                <option value="24" selected>Last 24 Hours</option>
                <option value="168">Last 7 Days</option>
                <option value="720">Last 30 Days</option>
              </select>
            </div>
            <div class="option-group">
              <label for="limit-filter">Limit:</label>
              <select id="limit-filter" onchange="updateFilterCriteria('limit', this.value)">
                <option value="50">50 entries</option>
                <option value="100" selected>100 entries</option>
                <option value="250">250 entries</option>
                <option value="500">500 entries</option>
              </select>
            </div>
            <div class="option-group">
              <button class="btn-primary" onclick="applyLogFilters()">🔄 Apply Filters</button>
              <button class="btn-secondary" onclick="clearAllFilters()">🧹 Clear All</button>
            </div>
          </div>
        </div>
      </div>

      <div class="logs-statistics">
        <h2>📊 Log Statistics</h2>
        <div class="stats-container" id="log-statistics">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Total Filtered:</span>
              <span class="stat-value" id="filtered-count">--</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Success Rate:</span>
              <span class="stat-value success" id="success-rate">--</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Avg Response:</span>
              <span class="stat-value" id="avg-response">--</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Error Count:</span>
              <span class="stat-value error" id="error-count">--</span>
            </div>
          </div>
        </div>
      </div>

      <div class="logs-display">
        <h2>📋 Activity Logs</h2>
        <div class="log-streaming-status" id="streaming-status">🔴 OFFLINE</div>
        <div class="logs-container" id="filtered-log-container">
          <div class="log-entry-placeholder">
            <p>🔄 Loading logs... Click "Apply Filters" to refresh</p>
          </div>
        </div>
      </div>

      <div class="logs-actions">
        <h2>🚀 Actions</h2>
        <div class="actions-grid">
          <button class="action-btn" onclick="startLogStreaming()">
            <span class="action-icon">🟢</span>
            <span class="action-text">Start Live Stream</span>
          </button>
          <button class="action-btn" onclick="stopLogStreaming()">
            <span class="action-icon">🔴</span>
            <span class="action-text">Stop Streaming</span>
          </button>
          <button class="action-btn" onclick="generateLogAnalytics()">
            <span class="action-icon">📊</span>
            <span class="action-text">Analytics Report</span>
          </button>
          <button class="action-btn" onclick="exportLogs()">
            <span class="action-icon">📤</span>
            <span class="action-text">Export Logs</span>
          </button>
        </div>
      </div>

      <div class="log-details-modal" id="log-details-modal" style="display: none;">
        <div class="modal-overlay" onclick="closeLogDetailsModal()"></div>
        <div class="modal-content" id="log-details-content">
          <!-- Log details will be populated here -->
        </div>
      </div>
    </div>
  `;
}

// Log management functions
declare function updateFilterCriteria(criteria: string, value: string | number): void;
declare function applyLogFilters(): void;
declare function clearAllFilters(): void;
declare function startLogStreaming(): void;
declare function stopLogStreaming(): void;
declare function generateLogAnalytics(): void;
declare function exportLogs(): void;
declare function closeLogDetailsModal(): void;
