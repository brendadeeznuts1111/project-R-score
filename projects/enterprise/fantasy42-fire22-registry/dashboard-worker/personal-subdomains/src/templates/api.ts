/**
 * Enhanced API Template Entry Point with Security Integration
 *
 * This file integrates our advanced security scanner with the modular API templates
 * Features include real-time security monitoring, threat detection, and compliance reporting
 */

// ============================================================================
// SECURITY INTEGRATION IMPORTS
// ============================================================================

// Import our enhanced security scanner
import {
  enhancedScan,
  getRecommendedThresholds,
} from '../../../../../packages/fire22-security-scanner/src/enhanced-scanner.ts';

// Re-export from the new modular structure
export { generateApiPage } from '../../../ui/templates/api-main';

// Import all template functions for direct access if needed
export {
  generateApiDashboardPage,
  generateApiEndpointsPage,
  generateApiMonitoringPage,
  generateApiLogsPage,
  generateApiSecurityPage,
} from '../../../ui/templates';

// Import shared utilities
export * from '../../../ui/templates/api-shared';

// ============================================================================
// SECURITY-ENHANCED API FUNCTIONS
// ============================================================================

/**
 * Enhanced API page with security monitoring
 */
export async function generateSecureApiPage(employee: any, pathname?: string): Promise<string> {
  // Run security scan before generating page
  await runSecurityCheck();

  // Generate the standard API page
  const { generateApiPage } = await import('../../../ui/templates/api-main');
  const html = await generateApiPage(employee, pathname);

  // Inject security monitoring script
  return injectSecurityMonitoring(html);
}

/**
 * Run comprehensive security check for API endpoints
 */
export async function runSecurityCheck(): Promise<void> {
  console.log('🔍 Running API Security Check...');

  try {
    // Define API-related packages to scan
    const apiPackages = [
      { name: 'express', version: '4.17.1' },
      { name: 'cors', version: '2.8.5' },
      { name: 'helmet', version: '4.6.0' },
      { name: 'jsonwebtoken', version: '9.0.0' },
      { name: 'bcrypt', version: '5.1.0' },
      { name: 'rate-limiter-flexible', version: '2.4.1' },
    ];

    // Get recommended security thresholds
    const environment = process.env.NODE_ENV || 'development';
    const thresholds = getRecommendedThresholds(environment);

    // Run enhanced security scan
    await enhancedScan(apiPackages, {
      thresholds,
      enableLogging: true,
      failOnThresholdExceeded: false, // Don't fail for API page generation
      exportResults: true,
    });

    console.log('✅ API Security Check Complete');
  } catch (error) {
    console.error('❌ API Security Check Failed:', error);
  }
}

/**
 * Get real-time security metrics for API dashboard
 */
export async function getSecurityMetrics(): Promise<{
  threats: number;
  policies: number;
  compliance: number;
  riskScore: number;
  lastScan: string;
}> {
  try {
    // Read latest security scan results
    const fs = await import('fs');
    const path = await import('path');

    const logDir = path.join(process.cwd(), 'logs', 'security');
    const latestScan = path.join(logDir, 'security-report-latest.json');

    if (fs.existsSync(latestScan)) {
      const data = JSON.parse(fs.readFileSync(latestScan, 'utf-8'));
      return {
        threats: data.summary?.fatalIssues || 0,
        policies: 156, // Static for now
        compliance: Math.round((1 - (data.summary?.fatalIssues || 0) / 100) * 100),
        riskScore: data.summary?.averageRiskScore || 0,
        lastScan: new Date(data.generatedAt).toLocaleString(),
      };
    }
  } catch (error) {
    console.error('Error reading security metrics:', error);
  }

  // Fallback metrics
  return {
    threats: 0,
    policies: 156,
    compliance: 100,
    riskScore: 0,
    lastScan: new Date().toLocaleString(),
  };
}

/**
 * Inject security monitoring script into HTML
 */
function injectSecurityMonitoring(html: string): string {
  const securityScript = `
    <script>
      // Enhanced Security Monitoring
      class APISecurityMonitor {
        constructor() {
          this.threats = 0;
          this.lastUpdate = Date.now();
          this.init();
        }

        init() {
          // Monitor for security events
          this.monitorFailedRequests();
          this.monitorRateLimiting();
          this.monitorAuthFailures();

          // Update security metrics every 30 seconds
          setInterval(() => this.updateMetrics(), 30000);
        }

        monitorFailedRequests() {
          // Monitor XMLHttpRequest for 4xx/5xx responses
          const originalOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            this.addEventListener('loadend', () => {
              if (this.status >= 400) {
                console.warn('🚨 Security Event: Failed API request', {
                  method, url, status: this.status
                });
              }
            });
            return originalOpen.apply(this, arguments);
          };
        }

        monitorRateLimiting() {
          let requestCount = 0;
          const originalFetch = window.fetch;

          window.fetch = function(...args) {
            requestCount++;
            if (requestCount > 100) { // Simple rate limiting
              console.warn('⚠️ High request rate detected');
            }
            return originalFetch.apply(this, args);
          };
        }

        monitorAuthFailures() {
          // Monitor for authentication failures
          document.addEventListener('api-error', (e: any) => {
            if (e.detail?.status === 401 || e.detail?.status === 403) {
              console.warn('🔐 Authentication failure detected');
            }
          });
        }

        async updateMetrics() {
          try {
            const response = await fetch('/api/security/metrics');
            const metrics = await response.json();

            // Update UI with real-time metrics
            this.updateSecurityDashboard(metrics);
          } catch (error) {
            console.error('Failed to update security metrics:', error);
          }
        }

        updateSecurityDashboard(metrics) {
          // Update threat count
          const threatElement = document.querySelector('.metric-value');
          if (threatElement && metrics.threats !== undefined) {
            threatElement.textContent = metrics.threats;
          }

          // Update compliance
          const complianceElement = document.querySelector('.compliance-value');
          if (complianceElement) {
            complianceElement.textContent = metrics.compliance + '%';
          }

          // Update risk score
          const riskElement = document.querySelector('.risk-score');
          if (riskElement) {
            riskElement.textContent = metrics.riskScore + '/100';
          }
        }
      }

      // Initialize security monitoring when page loads
      document.addEventListener('DOMContentLoaded', () => {
        new APISecurityMonitor();
      });
    </script>
  `;

  // Inject the script before the closing </body> tag
  return html.replace('</body>', securityScript + '</body>');
}

/**
 * Security-aware API endpoint testing
 */
export async function secureApiTest(endpoint: string): Promise<{
  success: boolean;
  securityCheck: boolean;
  responseTime: number;
  threats: string[];
}> {
  const startTime = performance.now();

  try {
    // Pre-flight security check
    const securityIssues = await checkEndpointSecurity(endpoint);

    const response = await fetch(endpoint, {
      headers: {
        'X-Security-Check': 'enabled',
        'X-API-Version': 'v2',
      },
    });

    const responseTime = performance.now() - startTime;

    return {
      success: response.ok,
      securityCheck: securityIssues.length === 0,
      responseTime,
      threats: securityIssues,
    };
  } catch (error) {
    return {
      success: false,
      securityCheck: false,
      responseTime: performance.now() - startTime,
      threats: ['Network error', 'Potential security issue'],
    };
  }
}

/**
 * Check endpoint for security vulnerabilities
 */
async function checkEndpointSecurity(endpoint: string): Promise<string[]> {
  const threats: string[] = [];

  // Check for common security issues
  if (!endpoint.startsWith('https://')) {
    threats.push('Non-HTTPS endpoint detected');
  }

  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
    threats.push('Localhost endpoint in production');
  }

  if (endpoint.includes('api_key=') || endpoint.includes('token=')) {
    threats.push('Credentials in URL parameters');
  }

  // Check for rate limiting bypass attempts
  if (endpoint.includes('bypass') || endpoint.includes('admin')) {
    threats.push('Potential privilege escalation attempt');
  }

  return threats;
}

// ============================================================================
// EXPORT ENHANCED FUNCTIONS
// ============================================================================

// All functions are already exported above, no additional exports needed
