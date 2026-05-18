/**
 * API Dashboard Template
 * Main dashboard overview and navigation
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

export function generateApiDashboardPage(employee: EmployeeData, pathname?: string): string {
  const content = generateApiOverviewContent(employee);

  const html = `
    ${generateHtmlHead(
      `API Management - ${employee.name}`,
      'Comprehensive API endpoints for system integration, data access, and automation'
    )}
    ${generateHeader(employee, '/api')}
    <main class="api-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateApiOverviewContent(employee: EmployeeData): string {
  const realTimeMetrics = [
    { label: 'Total APIs', value: '28', change: '+16', trend: 'up' },
    { label: 'Active Calls', value: '47.2K', change: '+8.3%', trend: 'up' },
    { label: 'Success Rate', value: '99.9%', change: '+0.1%', trend: 'up' },
    { label: 'Avg Response', value: '142ms', change: '-12ms', trend: 'up' },
  ];

  const apiCategories = [
    // System & Core APIs
    {
      icon: '🏥',
      title: 'System Health',
      description: 'Health checks, status monitoring, and system diagnostics',
      endpoint: '/api/health',
      status: 'online',
      metrics: { endpoints: '4', checks: '24/7', uptime: '99.9%' },
    },
    {
      icon: '👤',
      title: 'Employee Profile',
      description: 'Employee data, profile information, and organizational details',
      endpoint: '/api/profile',
      status: 'online',
      metrics: { profiles: '1', fields: '15', updates: '2.1K' },
    },
    {
      icon: '📊',
      title: 'Analytics & Metrics',
      description: 'Usage analytics, performance metrics, and business intelligence',
      endpoint: '/api/analytics',
      status: 'online',
      metrics: { reports: '247', metrics: '15', trends: '↗️' },
    },

    // Sportsbook Admin APIs
    {
      icon: '📊',
      title: 'Dashboard',
      description: 'Sportsbook admin dashboard with key metrics and alerts',
      endpoint: '/api/dashboard',
      status: 'online',
      metrics: { customers: '45K', revenue: '$125K', alerts: '3' },
    },
    {
      icon: '💬',
      title: 'Messaging',
      description: 'Internal messaging and communication system',
      endpoint: '/api/messaging',
      status: 'online',
      metrics: { unread: '25', conversations: '500', today: '45' },
    },
    {
      icon: '📈',
      title: 'Weekly Figures',
      description: 'Weekly performance and financial reporting',
      endpoint: '/api/weekly-figures',
      status: 'online',
      metrics: { revenue: '$200K', growth: '+15%', bets: '5K' },
    },
    {
      icon: '⏳',
      title: 'Pending Items',
      description: 'Pending approvals, reviews, and escalations',
      endpoint: '/api/pending',
      status: 'online',
      metrics: { approvals: '30', reviews: '15', urgent: '5' },
    },
    {
      icon: '👥',
      title: 'Customer Admin',
      description: 'Customer management and administration',
      endpoint: '/api/customer-admin',
      status: 'online',
      metrics: { total: '50K', active: '30K', new: '200' },
    },
    {
      icon: '👔',
      title: 'Agent Admin',
      description: 'Agent hierarchy and management (Admin Only)',
      endpoint: '/api/agent-admin',
      status: 'online',
      metrics: { agents: '1K', active: '800', commissions: '$450K' },
    },
    {
      icon: '⚽',
      title: 'Game Admin',
      description: 'Game and odds management',
      endpoint: '/api/game-admin',
      status: 'online',
      metrics: { games: '1K', active: '200', sports: '8' },
    },
    {
      icon: '💰',
      title: 'Cashier',
      description: 'Transaction and cashier management',
      endpoint: '/api/cashier',
      status: 'online',
      metrics: { transactions: '1K', volume: '$500K', pending: '50' },
    },

    // Business Tools
    {
      icon: '📊',
      title: 'Reporting',
      description: 'Business intelligence and comprehensive reporting',
      endpoint: '/api/reporting',
      status: 'online',
      metrics: { reports: '50', data: '1M', exports: '25' },
    },
    {
      icon: '🛠️',
      title: 'Admin Tools',
      description: 'Administrative tools and system utilities',
      endpoint: '/api/admin-tools',
      status: 'online',
      metrics: { tools: '8', integrations: '5', usage: '2K' },
    },
    {
      icon: '📄',
      title: 'Billing',
      description: 'Agent billing and commission management',
      endpoint: '/api/billing',
      status: 'online',
      metrics: { invoices: '500', paid: '$150K', pending: '$50K' },
    },

    // Advanced Features
    {
      icon: '📇',
      title: 'Contact Management',
      description: 'Business contacts, relationships, and communication data',
      endpoint: '/api/contacts',
      status: 'online',
      metrics: { contacts: '450', categories: '4', recent: '25' },
    },
    {
      icon: '📅',
      title: 'Schedule & Calendar',
      description: 'Appointments, meetings, and time management (Premium)',
      endpoint: '/api/schedule',
      status: 'online',
      metrics: { appointments: '12', thisWeek: '8', today: '3' },
    },
    {
      icon: '📋',
      title: 'System Logs',
      description: 'Activity logs, audit trails, and system events (Admin)',
      endpoint: '/api/logs',
      status: 'online',
      metrics: { entries: '8.5K', today: '234', retention: '90d' },
    },
    {
      icon: '⚙️',
      title: 'System Administration',
      description: 'Cache management, system configuration, and maintenance',
      endpoint: '/api/cache/clear',
      status: 'online',
      metrics: { operations: '12', cache: '2.1MB', efficiency: '94%' },
    },
  ];

  const activeEndpoints = [
    // Core System APIs
    { method: 'GET', path: '/api/health', calls: '892', status: '200' },
    { method: 'GET', path: '/api/status', calls: '1.2K', status: '200' },
    { method: 'GET', path: '/api/profile', calls: '756', status: '200' },
    { method: 'GET', path: '/api/analytics', calls: '12.4K', status: '200' },
    { method: 'GET', path: '/api/monitoring', calls: '3.1K', status: '200' },
    { method: 'GET', path: '/api/endpoints', calls: '345', status: '200' },

    // Sportsbook Admin APIs
    { method: 'GET', path: '/api/dashboard', calls: '2.1K', status: '200' },
    { method: 'GET', path: '/api/messaging', calls: '1.8K', status: '200' },
    { method: 'GET', path: '/api/weekly-figures', calls: '856', status: '200' },
    { method: 'GET', path: '/api/pending', calls: '1.3K', status: '200' },
    { method: 'GET', path: '/api/customer-admin', calls: '2.4K', status: '200' },
    { method: 'GET', path: '/api/agent-admin', calls: '567', status: '200' },
    { method: 'GET', path: '/api/game-admin', calls: '1.9K', status: '200' },
    { method: 'GET', path: '/api/cashier', calls: '3.2K', status: '200' },
    { method: 'GET', path: '/api/reporting', calls: '987', status: '200' },
    { method: 'GET', path: '/api/admin-tools', calls: '654', status: '200' },
    { method: 'GET', path: '/api/billing', calls: '432', status: '200' },
    { method: 'GET', path: '/api/rules', calls: '321', status: '200' },
    { method: 'GET', path: '/api/settings', calls: '123', status: '200' },

    // Advanced Features
    { method: 'GET', path: '/api/tools', calls: '543', status: '200' },
    { method: 'GET', path: '/api/contacts', calls: '423', status: '200' },
    { method: 'GET', path: '/api/schedule', calls: '234', status: '200' },
    { method: 'GET', path: '/api/logs', calls: '89', status: '200' },
    { method: 'POST', path: '/api/cache/clear', calls: '12', status: '200' },
    { method: 'GET', path: '/api/batch', calls: '45', status: '200' },
    { method: 'GET', path: '/api/versions', calls: '67', status: '200' },
  ];

  return `
    <div class="api-overview">
      <div class="api-header">
        <h1>🔗 API Management Platform</h1>
        <p>Comprehensive API gateway, monitoring, and management system</p>
      </div>

      <div class="metrics-overview">
        <h2>📊 Real-Time Metrics</h2>
        <div class="metrics-grid">
          ${realTimeMetrics
            .map(
              metric => `
            <div class="metric-card ${metric.trend}">
              <div class="metric-value">${metric.value}</div>
              <div class="metric-label">${metric.label}</div>
              <div class="metric-change">${metric.change}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="api-categories">
        <h2>🏗️ API Categories</h2>
        <div class="categories-grid">
          ${apiCategories
            .map(
              category => `
            <div class="category-card ${category.status}" onclick="navigateToEndpoint('${category.endpoint}')">
              <div class="category-icon">${category.icon}</div>
              <div class="category-content">
                <h3>${category.title}</h3>
                <p>${category.description}</p>
                <div class="category-metrics">
                  ${Object.entries(category.metrics)
                    .map(([key, value]) => `<span class="metric-item">${key}: ${value}</span>`)
                    .join('')}
                </div>
              </div>
              <div class="category-status">${category.status === 'online' ? '🟢' : '🔴'}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="active-endpoints">
        <h2>⚡ Active Endpoints</h2>
        <div class="endpoints-table">
          <div class="table-header">
            <span>Method</span>
            <span>Endpoint</span>
            <span>Calls</span>
            <span>Status</span>
          </div>
          ${activeEndpoints
            .map(
              endpoint => `
            <div class="table-row">
              <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
              <span class="endpoint">${endpoint.path}</span>
              <span class="calls">${endpoint.calls}</span>
              <span class="status ${endpoint.status === '200' ? 'success' : 'error'}">${endpoint.status}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="quick-actions">
        <h2>🚀 Quick Actions</h2>
        <div class="actions-grid">
          <!-- Core System Actions -->
          <button class="action-btn" onclick="fetchApiEndpoint('/api/health')">
            <span class="action-icon">💚</span>
            <span class="action-text">Health Check</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/profile')">
            <span class="action-icon">👤</span>
            <span class="action-text">View Profile</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/analytics')">
            <span class="action-icon">📊</span>
            <span class="action-text">Analytics</span>
          </button>

          <!-- Sportsbook Admin Actions -->
          <button class="action-btn" onclick="fetchApiEndpoint('/api/dashboard')">
            <span class="action-icon">📊</span>
            <span class="action-text">Dashboard</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/messaging')">
            <span class="action-icon">💬</span>
            <span class="action-text">Messages</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/weekly-figures')">
            <span class="action-icon">📈</span>
            <span class="action-text">Weekly Figures</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/pending')">
            <span class="action-icon">⏳</span>
            <span class="action-text">Pending</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/customer-admin')">
            <span class="action-icon">👥</span>
            <span class="action-text">Customers</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/agent-admin')">
            <span class="action-icon">👔</span>
            <span class="action-text">Agents</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/game-admin')">
            <span class="action-icon">⚽</span>
            <span class="action-text">Games</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/cashier')">
            <span class="action-icon">💰</span>
            <span class="action-text">Cashier</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/reporting')">
            <span class="action-icon">📊</span>
            <span class="action-text">Reports</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/admin-tools')">
            <span class="action-icon">🛠️</span>
            <span class="action-text">Admin Tools</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/billing')">
            <span class="action-icon">📄</span>
            <span class="action-text">Billing</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/settings')">
            <span class="action-icon">⚙️</span>
            <span class="action-text">Settings</span>
          </button>

          <!-- Advanced Actions -->
          <button class="action-btn" onclick="fetchApiEndpoint('/api/endpoints')">
            <span class="action-icon">📋</span>
            <span class="action-text">API Docs</span>
          </button>
          <button class="action-btn" onclick="fetchApiEndpoint('/api/schedule')">
            <span class="action-icon">📅</span>
            <span class="action-text">Schedule</span>
          </button>
          <button class="action-btn" onclick="clearCache()">
            <span class="action-icon">🧹</span>
            <span class="action-text">Clear Cache</span>
          </button>
        </div>
      </div>
    </div>
  `;
}
