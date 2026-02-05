/**
 * API Endpoints Management Template
 * Endpoint creation, configuration, and management
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateApiEndpointsPage(employee: EmployeeData, pathname?: string): string {
  const content = generateApiEndpointsContent(employee);

  const html = `
    ${generateHtmlHead(
      `API Endpoints - ${employee.name}`,
      'Create, configure, and manage API endpoints'
    )}
    ${generateHeader(employee, '/api/endpoints')}
    <main class="api-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateApiEndpointsContent(employee: EmployeeData): string {
  const endpointTemplates = [
    { name: 'REST API', description: 'Standard REST endpoints with CRUD operations', icon: '🔗' },
    { name: 'GraphQL', description: 'Flexible query language for APIs', icon: '📊' },
    { name: 'Webhook', description: 'Real-time event notifications', icon: '🪝' },
    { name: 'WebSocket', description: 'Real-time bidirectional communication', icon: '🔌' },
    { name: 'gRPC', description: 'High-performance RPC framework', icon: '⚡' },
    { name: 'SOAP', description: 'XML-based protocol for web services', icon: '📦' },
  ];

  return `
    <div class="api-endpoints">
      <div class="page-header">
        <h1>🔗 API Endpoints Management</h1>
        <p>Create, configure, and manage your API endpoints</p>
      </div>

      <div class="endpoint-actions">
        <button class="primary-btn" onclick="createNewApi()">
          <span class="btn-icon">➕</span>
          Create New API
        </button>
        <button class="secondary-btn" onclick="importEndpoints()">
          <span class="btn-icon">📤</span>
          Import Endpoints
        </button>
        <button class="secondary-btn" onclick="exportEndpoints()">
          <span class="btn-icon">📥</span>
          Export Configuration
        </button>
      </div>

      <div class="endpoint-templates">
        <h2>📋 Endpoint Templates</h2>
        <div class="templates-grid">
          ${endpointTemplates
            .map(
              template => `
            <div class="template-card" onclick="selectTemplate('${template.name}')">
              <div class="template-icon">${template.icon}</div>
              <div class="template-content">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
              </div>
              <div class="template-arrow">→</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="endpoint-configuration">
        <h2>⚙️ Endpoint Configuration</h2>
        <div class="config-form">
          <div class="form-group">
            <label for="endpoint-name">Endpoint Name</label>
            <input type="text" id="endpoint-name" placeholder="e.g., User Management API">
          </div>
          <div class="form-group">
            <label for="endpoint-path">Base Path</label>
            <input type="text" id="endpoint-path" placeholder="e.g., /api/v1/users">
          </div>
          <div class="form-group">
            <label for="endpoint-method">HTTP Method</label>
            <select id="endpoint-method">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div class="form-group">
            <label for="endpoint-description">Description</label>
            <textarea id="endpoint-description" placeholder="Describe what this endpoint does..."></textarea>
          </div>
          <div class="form-group">
            <label for="endpoint-rate-limit">Rate Limit</label>
            <input type="text" id="endpoint-rate-limit" placeholder="e.g., 1000/min">
          </div>
          <div class="form-group">
            <label for="endpoint-auth">Authentication</label>
            <select id="endpoint-auth">
              <option value="none">None</option>
              <option value="basic">Basic Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="apikey">API Key</option>
              <option value="oauth">OAuth 2.0</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="primary-btn" onclick="saveEndpoint()">💾 Save Endpoint</button>
            <button class="secondary-btn" onclick="testEndpoint()">🧪 Test Endpoint</button>
            <button class="danger-btn" onclick="deleteEndpoint()">🗑️ Delete</button>
          </div>
        </div>
      </div>

      <div class="endpoint-list">
        <h2>📋 Existing Endpoints</h2>
        <div class="endpoints-table">
          <div class="table-header">
            <span>Name</span>
            <span>Method</span>
            <span>Path</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <div class="table-row">
            <span>User Profile API</span>
            <span class="method get">GET</span>
            <span>/api/profile</span>
            <span class="status online">🟢 Online</span>
            <span class="actions">
              <button onclick="editEndpoint('profile')">✏️</button>
              <button onclick="viewLogs('profile')">📊</button>
              <button onclick="deleteEndpoint('profile')">🗑️</button>
            </span>
          </div>
          <div class="table-row">
            <span>Health Check API</span>
            <span class="method get">GET</span>
            <span>/api/health</span>
            <span class="status online">🟢 Online</span>
            <span class="actions">
              <button onclick="editEndpoint('health')">✏️</button>
              <button onclick="viewLogs('health')">📊</button>
              <button onclick="deleteEndpoint('health')">🗑️</button>
            </span>
          </div>
          <div class="table-row">
            <span>Analytics API</span>
            <span class="method get">GET</span>
            <span>/api/analytics</span>
            <span class="status online">🟢 Online</span>
            <span class="actions">
              <button onclick="editEndpoint('analytics')">✏️</button>
              <button onclick="viewLogs('analytics')">📊</button>
              <button onclick="deleteEndpoint('analytics')">🗑️</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Template selection and creation functions
declare function createNewApi(): void;
declare function importEndpoints(): void;
declare function exportEndpoints(): void;
declare function selectTemplate(templateName: string): void;
declare function saveEndpoint(): void;
declare function testEndpoint(): void;
declare function deleteEndpoint(endpointId?: string): void;
declare function editEndpoint(endpointId: string): void;
declare function viewLogs(endpointId: string): void;
