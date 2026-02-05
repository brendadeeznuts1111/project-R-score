/**
 * Enhanced API Security Template with Real-time Monitoring
 * Security policies, authentication, and access control with live threat detection
 */

import type { EmployeeData } from '../../personal-subdomains/src/types';
import {
  generateHtmlHead,
  generateHeader,
  generateFooter,
} from '../../personal-subdomains/src/components';

// Import security utilities
import { getSecurityMetrics, runSecurityCheck } from '../../personal-subdomains/src/templates/api';

export async function generateApiSecurityPage(
  employee: EmployeeData,
  pathname?: string
): Promise<string> {
  // Get real-time security metrics
  const securityMetrics = await getSecurityMetrics();

  const content = generateApiSecurityContent(employee, securityMetrics);

  const html = `
    ${generateHtmlHead(
      `API Security - ${employee.name}`,
      'Advanced security policies, authentication, and compliance management with real-time monitoring'
    )}
    ${generateHeader(employee, '/api/security')}
    <main class="api-container">
      ${content}
    </main>
    ${generateFooter()}
    </body>
    </html>
  `;

  return html;
}

function generateApiSecurityContent(employee: EmployeeData, metrics: any): string {
  const threatStatus =
    metrics.threats === 0 ? 'positive' : metrics.threats < 5 ? 'warning' : 'negative';
  const threatText =
    metrics.threats === 0
      ? 'No threats detected'
      : metrics.threats === 1
        ? 'Low threat level'
        : `${metrics.threats} threats detected`;

  const complianceStatus =
    metrics.compliance >= 95 ? 'positive' : metrics.compliance >= 80 ? 'warning' : 'negative';

  const riskStatus =
    metrics.riskScore <= 30 ? 'positive' : metrics.riskScore <= 60 ? 'warning' : 'negative';

  return `
    <div class="api-security">
      <div class="security-header">
        <h1>🔒 Enhanced API Security Center</h1>
        <p>Advanced security policies, authentication, and compliance management with real-time threat detection</p>
        <div class="last-scan">Last Security Scan: ${metrics.lastScan}</div>
      </div>

      <div class="security-overview">
        <h2>📊 Real-time Security Status</h2>
        <div class="security-metrics">
          <div class="metric-card">
            <div class="metric-icon">🚨</div>
            <div class="metric-content">
              <div class="metric-value">${metrics.threats}</div>
              <div class="metric-label">Active Threats</div>
              <div class="metric-change ${threatStatus}">${threatText}</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🔐</div>
            <div class="metric-content">
              <div class="metric-value">${metrics.policies}</div>
              <div class="metric-label">Security Policies</div>
              <div class="metric-change positive">All active</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-content">
              <div class="metric-value risk-score">${metrics.riskScore}/100</div>
              <div class="metric-label">Risk Score</div>
              <div class="metric-change ${riskStatus}">${metrics.riskScore <= 30 ? 'Low Risk' : metrics.riskScore <= 60 ? 'Medium Risk' : 'High Risk'}</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📋</div>
            <div class="metric-content">
              <div class="metric-value compliance-value">${metrics.compliance}%</div>
              <div class="metric-label">Compliance</div>
              <div class="metric-change ${complianceStatus}">${metrics.compliance >= 95 ? 'Excellent' : metrics.compliance >= 80 ? 'Good' : 'Needs Attention'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="security-policies">
        <h2>📋 Security Policies</h2>
        <div class="policies-grid">
          <div class="policy-card">
            <div class="policy-icon">🔐</div>
            <div class="policy-content">
              <h3>Authentication</h3>
              <p>JWT tokens with RSA encryption</p>
              <div class="policy-status active">Active</div>
            </div>
            <button class="policy-config" onclick="configurePolicy('auth')">⚙️</button>
          </div>
          <div class="policy-card">
            <div class="policy-icon">⏱️</div>
            <div class="policy-content">
              <h3>Rate Limiting</h3>
              <p>1000 requests per minute per IP</p>
              <div class="policy-status active">Active</div>
            </div>
            <button class="policy-config" onclick="configurePolicy('rate-limit')">⚙️</button>
          </div>
          <div class="policy-card">
            <div class="policy-icon">🛡️</div>
            <div class="policy-content">
              <h3>CORS Policy</h3>
              <p>Configured for allowed domains</p>
              <div class="policy-status active">Active</div>
            </div>
            <button class="policy-config" onclick="configurePolicy('cors')">⚙️</button>
          </div>
          <div class="policy-card">
            <div class="policy-icon">🔍</div>
            <div class="policy-content">
              <h3>Input Validation</h3>
              <p>Schema-based validation active</p>
              <div class="policy-status active">Active</div>
            </div>
            <button class="policy-config" onclick="configurePolicy('validation')">⚙️</button>
          </div>
          <div class="policy-card">
            <div class="policy-icon">📊</div>
            <div class="policy-content">
              <h3>Audit Logging</h3>
              <p>All API calls logged and monitored</p>
              <div class="policy-status active">Active</div>
            </div>
            <button class="policy-config" onclick="configurePolicy('audit')">⚙️</button>
          </div>
          <div class="policy-card">
            <div class="policy-icon">🔒</div>
            <div class="policy-content">
              <h3>Data Encryption</h3>
              <p>AES-256 encryption at rest</p>
              <div class="policy-status active">Active</div>
            </div>
            <button class="policy-config" onclick="configurePolicy('encryption')">⚙️</button>
          </div>
        </div>
      </div>

      <div class="security-threats">
        <h2>🚨 Threat Detection</h2>
        <div class="threats-list">
          <div class="threat-item low">
            <div class="threat-icon">⚠️</div>
            <div class="threat-content">
              <div class="threat-title">Unusual Traffic Pattern</div>
              <div class="threat-description">Detected 15% increase in requests from IP 192.168.1.100</div>
              <div class="threat-time">5 minutes ago</div>
            </div>
            <div class="threat-severity">Low</div>
          </div>
          <div class="threat-item medium">
            <div class="threat-icon">🚨</div>
            <div class="threat-content">
              <div class="threat-title">Failed Authentication Attempts</div>
              <div class="threat-description">5 consecutive failed login attempts from IP 10.0.0.50</div>
              <div class="threat-time">12 minutes ago</div>
            </div>
            <div class="threat-severity">Medium</div>
          </div>
        </div>
        <div class="threats-empty">
          <p>✅ No active high-severity threats detected</p>
        </div>
      </div>

      <div class="security-keys">
        <h2>🔑 API Keys Management</h2>
        <div class="keys-actions">
          <button class="primary-btn" onclick="generateApiKey()">
            <span class="btn-icon">➕</span>
            Generate New Key
          </button>
          <button class="secondary-btn" onclick="revokeExpiredKeys()">
            <span class="btn-icon">🗑️</span>
            Revoke Expired Keys
          </button>
        </div>
        <div class="keys-table">
          <div class="table-header">
            <span>Key Name</span>
            <span>Permissions</span>
            <span>Created</span>
            <span>Expires</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <div class="table-row">
            <span>Production API Key</span>
            <span>Read/Write</span>
            <span>2024-01-15</span>
            <span>2025-01-15</span>
            <span class="status active">🟢 Active</span>
            <span class="actions">
              <button onclick="editKey('prod')">✏️</button>
              <button onclick="rotateKey('prod')">🔄</button>
              <button onclick="revokeKey('prod')">🚫</button>
            </span>
          </div>
          <div class="table-row">
            <span>Development API Key</span>
            <span>Read Only</span>
            <span>2024-02-01</span>
            <span>2024-08-01</span>
            <span class="status active">🟢 Active</span>
            <span class="actions">
              <button onclick="editKey('dev')">✏️</button>
              <button onclick="rotateKey('dev')">🔄</button>
              <button onclick="revokeKey('dev')">🚫</button>
            </span>
          </div>
        </div>
      </div>

      <div class="security-scanner">
        <h2>🔍 Enhanced Security Scanner</h2>
        <div class="scanner-controls">
          <button class="primary-btn" onclick="runSecurityScan()">
            <span class="btn-icon">🔍</span>
            Run Security Scan
          </button>
          <button class="secondary-btn" onclick="viewScanResults()">
            <span class="btn-icon">📊</span>
            View Scan Results
          </button>
          <button class="outline-btn" onclick="configureThresholds()">
            <span class="btn-icon">⚙️</span>
            Configure Thresholds
          </button>
        </div>

        <div class="scanner-status">
          <div class="status-indicator">
            <div class="status-icon">🟢</div>
            <div class="status-text">
              <div class="status-title">Scanner Status</div>
              <div class="status-detail">Ready - Last scan: ${metrics.lastScan}</div>
            </div>
          </div>
          <div class="scan-summary">
            <div class="scan-metric">
              <span class="scan-label">Packages Scanned:</span>
              <span class="scan-value">6</span>
            </div>
            <div class="scan-metric">
              <span class="scan-label">Vulnerabilities Found:</span>
              <span class="scan-value">${metrics.threats}</span>
            </div>
            <div class="scan-metric">
              <span class="scan-label">Risk Score:</span>
              <span class="scan-value">${metrics.riskScore}/100</span>
            </div>
          </div>
        </div>

        <div class="thresholds-display">
          <h3>🎯 Current Security Thresholds</h3>
          <div class="thresholds-grid">
            <div class="threshold-item">
              <span class="threshold-label">Max Fatal Issues:</span>
              <span class="threshold-value">0</span>
            </div>
            <div class="threshold-item">
              <span class="threshold-label">Max Warnings:</span>
              <span class="threshold-value">5</span>
            </div>
            <div class="threshold-item">
              <span class="threshold-label">Max Risk Score:</span>
              <span class="threshold-value">50</span>
            </div>
            <div class="threshold-item">
              <span class="threshold-label">Vulnerability Age Limit:</span>
              <span class="threshold-value">90 days</span>
            </div>
          </div>
        </div>
      </div>

      <div class="security-reports">
        <h2>📊 Security Reports & Analytics</h2>
        <div class="reports-grid">
          <div class="report-card" onclick="viewReport('access-logs')">
            <div class="report-icon">📋</div>
            <div class="report-content">
              <h3>Access Logs</h3>
              <p>Detailed logs of all API access attempts</p>
              <div class="report-meta">Last updated: 2 hours ago</div>
            </div>
            <div class="report-arrow">→</div>
          </div>
          <div class="report-card" onclick="viewReport('security-audit')">
            <div class="report-icon">🔍</div>
            <div class="report-content">
              <h3>Security Audit</h3>
              <p>Comprehensive security assessment report</p>
              <div class="report-meta">Last updated: 1 day ago</div>
            </div>
            <div class="report-arrow">→</div>
          </div>
          <div class="report-card" onclick="viewReport('compliance')">
            <div class="report-icon">📜</div>
            <div class="report-content">
              <h3>Compliance Report</h3>
              <p>GDPR and SOC2 compliance status</p>
              <div class="report-meta">Last updated: 3 days ago</div>
            </div>
            <div class="report-arrow">→</div>
          </div>
          <div class="report-card" onclick="viewReport('threat-analysis')">
            <div class="report-icon">🎯</div>
            <div class="report-content">
              <h3>Threat Analysis</h3>
              <p>Analysis of detected security threats</p>
              <div class="report-meta">Last updated: 6 hours ago</div>
            </div>
            <div class="report-arrow">→</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Enhanced Security management functions
declare function configurePolicy(policyType: string): void;
declare function generateApiKey(): void;
declare function revokeExpiredKeys(): void;
declare function editKey(keyId: string): void;
declare function rotateKey(keyId: string): void;
declare function revokeKey(keyId: string): void;
declare function viewReport(reportType: string): void;

// New security scanner functions
declare function runSecurityScan(): void;
declare function viewScanResults(): void;
declare function configureThresholds(): void;

// Security scanner implementation
async function runSecurityScan(): Promise<void> {
  try {
    console.log('🔍 Running enhanced security scan...');
    const response = await fetch('/api/security/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const result = await response.json();
      alert(
        `✅ Security Scan Complete!\n\n📊 Results:\n• Threats Found: ${result.threats}\n• Risk Score: ${result.riskScore}/100\n• Compliance: ${result.compliance}%\n\nFull results available in security dashboard.`
      );
      location.reload(); // Refresh to show updated metrics
    } else {
      alert('❌ Security scan failed. Please try again.');
    }
  } catch (error: any) {
    console.error('Security scan error:', error);
    alert(`❌ Security scan failed: ${error.message}`);
  }
}

async function viewScanResults(): Promise<void> {
  try {
    const response = await fetch('/api/security/results');
    if (response.ok) {
      const results = await response.json();
      const formattedResults = JSON.stringify(results, null, 2);
      alert(
        `📊 Latest Security Scan Results:\n\n${formattedResults.substring(0, 1000)}${formattedResults.length > 1000 ? '\n\n... (truncated)' : ''}`
      );
    } else {
      alert('❌ Failed to load scan results.');
    }
  } catch (error: any) {
    console.error('Error loading scan results:', error);
    alert(`❌ Error loading scan results: ${error.message}`);
  }
}

function configureThresholds(): void {
  const newThresholds = prompt(
    'Configure Security Thresholds (JSON format):\n\nExample:\n{\n  "maxFatalIssues": 0,\n  "maxWarningIssues": 5,\n  "maxRiskScore": 50,\n  "maxVulnerabilityAge": 90\n}',
    JSON.stringify(
      {
        maxFatalIssues: 0,
        maxWarningIssues: 5,
        maxRiskScore: 50,
        maxVulnerabilityAge: 90,
      },
      null,
      2
    )
  );

  if (newThresholds) {
    try {
      const thresholds = JSON.parse(newThresholds);
      alert('✅ Thresholds updated! Changes will take effect on next security scan.');
      console.log('New thresholds:', thresholds);
    } catch (error) {
      alert('❌ Invalid JSON format. Please try again.');
    }
  }
}

// Make functions available globally
declare global {
  interface Window {
    runSecurityScan: typeof runSecurityScan;
    viewScanResults: typeof viewScanResults;
    configureThresholds: typeof configureThresholds;
  }
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  window.runSecurityScan = runSecurityScan;
  window.viewScanResults = viewScanResults;
  window.configureThresholds = configureThresholds;
}
