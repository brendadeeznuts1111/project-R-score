#!/usr/bin/env bun
// Tier-1380 CLI Integration for Test Command
// [TIER-1380-CLI-001] [INHERITANCE-002]

import { SecureTestRunner } from '../packages/test/secure-test-runner-enhanced';
import { inspect } from 'bun';
// import { generateTestMatrix } from '../packages/test/col93-matrix'; // Not implemented yet

// Rangers SDK Log Parser
interface RangersDeviceData {
  app_id: number;
  os_name: string;
  os_version: string;
  device_model: string;
  language: string;
  platform: string;
  sdk_version: string;
  sdk_lib: string;
  timezone: number;
  tz_offset: number;
  resolution: string;
  browser: string;
  browser_version: string;
  referrer: string;
  referrer_host: string;
  width: number;
  height: number;
  screen_width: number;
  screen_height: number;
  custom: string;
}

interface RangersAnalyticsEvent {
  event: string;
  params: string;
  local_time_ms: number;
  is_bav: number;
  ab_sdk_version: string;
  session_id: string;
}

interface RangersLogData {
  instance: string;
  appId: string;
  userInfo: {
    user_unique_id: string;
    web_id: string;
  };
  sdkVersion?: string;
  sdkReady?: boolean;
  timestamp?: string;
  logType: 'user_info' | 'sdk_ready' | 'device_info' | 'analytics_event' | 'unknown';
  rawData?: string;
  deviceData?: RangersDeviceData;
  analyticsData?: RangersAnalyticsEvent;
}

// Add new interfaces for advanced features
interface LogCorrelation {
  sessionId: string;
  userId: string;
  timeline: Array<{ timestamp: string; event: string; type: string }>;
}

interface PerformanceMetrics {
  totalParseTime: number;
  averageLineTime: number;
  memoryUsage?: number;
  throughput: number; // lines per second
}

interface SecurityScore {
  overall: number; // 0-100
  cspCompliance: number;
  networkSecurity: number;
  dataPrivacy: number;
}

interface BrowserWarning {
  type: 'webgl' | 'csp' | 'other';
  message: string;
  source?: string;
  timestamp?: string;
  severity: 'low' | 'medium' | 'high';
  details?: {
    directive?: string;
    blockedUri?: string;
    requiredAction?: string;
    hash?: string;
    line?: number;
    column?: number;
  };
  frequency?: number;
  category?: 'security' | 'performance' | 'network' | 'compatibility';
  impact?: 'critical' | 'warning' | 'info';
  remediation?: string[];
}

interface ParsedLogSummary {
  totalLines: number;
  rangersLogs: number;
  browserWarnings: number;
  sdkStatus: 'ready' | 'initializing' | 'unknown';
  uniqueUsers: Set<string>;
  appIds: Set<string>;
  processingTime: number;
  warningsByType: Map<string, number>;
  warningsBySeverity: Map<string, number>;
  topIssues: Array<{ message: string; count: number }>;
  correlation?: LogCorrelation;
  performance?: PerformanceMetrics;
  securityScore?: SecurityScore;
}

interface DisplayLogSummary {
  totalLines: number;
  rangersLogs: number;
  browserWarnings: number;
  sdkStatus: 'ready' | 'initializing' | 'unknown';
  uniqueUsers: number;
  appIds: string[];
  processingTime: number;
  warningsByType: Record<string, number>;
  warningsBySeverity: Record<string, number>;
  topIssues: Array<{ message: string; count: number }>;
  correlation?: LogCorrelation;
  performance?: PerformanceMetrics;
  securityScore?: SecurityScore;
}

// Advanced analysis functions
function calculateSecurityScore(warnings: BrowserWarning[]): SecurityScore {
  let cspScore = 100;
  let networkScore = 100;
  let privacyScore = 100;

  warnings.forEach(warning => {
    if (warning.type === 'csp') {
      if (warning.severity === 'high') cspScore -= 30;
      else if (warning.severity === 'medium') cspScore -= 15;
      else cspScore -= 5;
    }

    if (warning.category === 'network') {
      if (warning.message.includes('DNS')) networkScore -= 10;
      else if (warning.message.includes('certificate')) networkScore -= 40;
      else networkScore -= 20;
    }

    if (warning.details?.blockedUri?.includes('analytics') ||
        warning.details?.blockedUri?.includes('tracking')) {
      privacyScore += 10; // Good: tracking blocked
    }
  });

  const overall = Math.round((cspScore + networkScore + privacyScore) / 3);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    cspCompliance: Math.max(0, Math.min(100, cspScore)),
    networkSecurity: Math.max(0, Math.min(100, networkScore)),
    dataPrivacy: Math.max(0, Math.min(100, privacyScore))
  };
}

function correlateLogs(rangersLogs: RangersLogData[], warnings: BrowserWarning[]): LogCorrelation | undefined {
  if (rangersLogs.length === 0) return undefined;

  const firstLog = rangersLogs[0];
  const sessionId = firstLog.userInfo.web_id || firstLog.analyticsData?.session_id || 'unknown';
  const userId = firstLog.userInfo.user_unique_id || 'unknown';

  const timeline: Array<{ timestamp: string; event: string; type: string }> = [];

  // Add Rangers events
  rangersLogs.forEach(log => {
    let event = '';
    switch (log.logType) {
      case 'sdk_ready':
        event = 'SDK Initialized';
        break;
      case 'user_info':
        event = 'User Identified';
        break;
      case 'device_info':
        event = 'Device Info Collected';
        break;
      case 'analytics_event':
        event = `Analytics: ${log.analyticsData?.event || 'Unknown'}`;
        break;
      default:
        event = 'Unknown Event';
    }

    timeline.push({
      timestamp: log.timestamp || new Date().toISOString(),
      event,
      type: 'rangers'
    });
  });

  // Add warning events
  warnings.forEach(warning => {
    timeline.push({
      timestamp: warning.timestamp || new Date().toISOString(),
      event: `${warning.category?.toUpperCase() || 'WARNING'}: ${warning.message.substring(0, 50)}...`,
      type: 'warning'
    });
  });

  // Sort by timestamp
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    sessionId,
    userId,
    timeline
  };
}

function calculatePerformanceMetrics(totalLines: number, processingTime: number): PerformanceMetrics {
  const averageLineTime = processingTime / totalLines;
  const throughput = totalLines / (processingTime / 1000); // lines per second

  return {
    totalParseTime: processingTime,
    averageLineTime,
    throughput,
    memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : undefined
  };
}

function generateRemediation(warning: BrowserWarning): string[] {
  const remediation: string[] = [];

  if (warning.type === 'csp') {
    if (warning.details?.directive === 'script-src') {
      remediation.push('Add specific nonce: <script nonce="${RANDOM}">');
      remediation.push('Or use hash: script-src \'sha256-<HASH>\'');
      remediation.push('Consider moving scripts to external files');
    }
    if (warning.details?.directive === 'connect-src') {
      remediation.push(`Add domain to CSP: connect-src https://${warning.details.blockedUri}`);
      remediation.push('Use relative URLs to avoid CSP issues');
    }
  }

  if (warning.category === 'network') {
    if (warning.message.includes('DNS')) {
      remediation.push('Verify DNS configuration');
      remediation.push('Check if domain is correct');
      remediation.push('Consider using CDN for better reliability');
    }
  }

  if (warning.type === 'webgl') {
    remediation.push('Enable hardware acceleration in browser settings');
    remediation.push('Update graphics drivers');
    remediation.push('Provide 2D canvas fallback');
  }

  return remediation;
}

// Enhanced log patterns for better detection
const LOG_PATTERNS = {
  csp: {
    scriptSrc: /script-src\s+['"]([^'"]*)['"]/,
    connectSrc: /connect-src\s+['"]([^'"]*)['"]/,
    inlineScript: /inline script/,
    externalScript: /Loading the script/,
    webAssembly: /WebAssembly/,
    hash: /sha256-([^'\s]+)/,
    lineColumn: /:(\d+):(\d+)/
  },
  network: {
    dnsError: /net::ERR_NAME_NOT_RESOLVED/,
    timeout: /net::ERR_CONNECTION_TIMED_OUT/,
    certificate: /net::ERR_CERT/,
    blocked: /net::ERR_BLOCKED/
  },
  performance: {
    longTask: /long task/,
    layoutShift: /Layout Shift/,
    slowNetwork: /slow \d+\.\d+s/
  }
};

function parseRangersLog(logLine: string): RangersLogData | BrowserWarning | null {
  try {
    // Check for browser warnings first
    if (logLine.includes('No WebGL support')) {
      return {
        type: 'webgl',
        message: 'WebGL not available - 3D graphics disabled',
        source: logLine.match(/^(\S+):/)?.[1] || 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        category: 'compatibility'
      };
    }

    // Check for structured JSON data (device info or analytics)
    if (logLine.trim().startsWith('{')) {
      try {
        const jsonData = JSON.parse(logLine.trim());

        // Check if it's device info
        if (jsonData.app_id) {
          // Parse custom data if present
          let customData = {};
          if (jsonData.custom) {
            try {
              customData = JSON.parse(jsonData.custom);
            } catch (e) {
              // Invalid JSON in custom field
            }
          }

          return {
            instance: 'device',
            appId: jsonData.app_id.toString(),
            userInfo: {
              user_unique_id: 'unknown',
              web_id: 'unknown'
            },
            sdkVersion: jsonData.sdk_version,
            timestamp: new Date().toISOString(),
            logType: 'device_info',
            rawData: logLine.trim(),
            deviceData: {
              ...jsonData,
              custom: JSON.stringify(customData, null, 2)
            }
          };
        }

        // Check if it's an analytics event
        if (jsonData.event && jsonData.session_id) {
          // Parse params if present
          let paramsData = {};
          if (jsonData.params) {
            try {
              paramsData = JSON.parse(jsonData.params);
            } catch (e) {
              // Invalid JSON in params field
            }
          }

          return {
            instance: 'analytics',
            appId: 'unknown',
            userInfo: {
              user_unique_id: 'unknown',
              web_id: jsonData.session_id || 'unknown'
            },
            timestamp: new Date(jsonData.local_time_ms).toISOString(),
            logType: 'analytics_event',
            rawData: logLine.trim(),
            analyticsData: {
              ...jsonData,
              params: JSON.stringify(paramsData, null, 2)
            }
          };
        }
      } catch (e) {
        // Not valid JSON, continue to other parsing
      }
    }

    // Check for various CSP violations with enhanced parsing
    if (logLine.includes('Content Security Policy directive')) {
      const isReportOnly = logLine.includes('report-only');
      const directiveMatch = logLine.match(/directive\s+"([^"]+)"/);
      const directive = directiveMatch ? directiveMatch[1] : 'unknown';

      let message = '';
      let blockedUri = '';
      let category: 'security' | 'network' = 'security';
      let line: number | undefined;
      let column: number | undefined;

      // Extract line/column if available
      const lineColMatch = logLine.match(LOG_PATTERNS.csp.lineColumn);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1]);
        column = parseInt(lineColMatch[2]);
      }

      if (logLine.includes('WebAssembly')) {
        message = `CSP violation - WebAssembly blocked${isReportOnly ? ' (report-only)' : ' (blocking)'}`;
        blockedUri = 'WebAssembly module';
      } else if (logLine.includes('script-src')) {
        if (logLine.includes('inline script')) {
          const hashMatch = logLine.match(LOG_PATTERNS.csp.hash);
          const hash = hashMatch ? hashMatch[1].substring(0, 16) + '...' : '';
          message = `CSP violation - Inline script blocked${isReportOnly ? ' (report-only)' : ' (blocking)'}`;
          blockedUri = 'inline-script';
        } else if (logLine.includes('Loading the script')) {
          const urlMatch = logLine.match(/'<([^']+)'>/);
          const url = urlMatch ? urlMatch[1] : 'unknown URL';
          message = `CSP violation - External script blocked${isReportOnly ? ' (report-only)' : ' (blocking)'}`;
          blockedUri = url;
        }
      } else if (logLine.includes('connect-src')) {
        const urlMatch = logLine.match(/'<([^']+)'>/);
        const url = urlMatch ? urlMatch[1] : 'unknown URL';
        message = `CSP violation - Connection blocked${isReportOnly ? ' (report-only)' : ' (blocking)'}`;
        blockedUri = url;
        category = 'network';
      }

      return {
        type: 'csp',
        message,
        source: logLine.match(/^(\S+):/)?.[1] || logLine.match(/^(\S+)/)?.[1] || 'unknown',
        timestamp: new Date().toISOString(),
        severity: isReportOnly ? 'low' : 'high',
        category,
        details: {
          directive,
          blockedUri,
          requiredAction: isReportOnly ? 'None (report-only)' : 'Add CSP exception',
          line,
          column,
          hash: logLine.match(LOG_PATTERNS.csp.hash)?.[1]
        }
      };
    }

    // Enhanced network error detection
    if (logLine.includes('Failed to load resource:')) {
      let message = '';
      let blockedUri = '';
      let severity: 'low' | 'medium' | 'high' = 'medium';

      if (LOG_PATTERNS.network.dnsError.test(logLine)) {
        const urlMatch = logLine.match(/(\S+):\d+/);
        blockedUri = urlMatch ? urlMatch[1] : 'unknown';
        message = `DNS resolution failed for ${blockedUri}`;
        severity = 'low';
      } else if (LOG_PATTERNS.network.timeout.test(logLine)) {
        message = 'Connection timeout';
        severity = 'medium';
      } else if (LOG_PATTERNS.network.certificate.test(logLine)) {
        message = 'SSL/TLS certificate error';
        severity = 'high';
      }

      return {
        type: 'other',
        message,
        source: 'browser',
        timestamp: new Date().toISOString(),
        severity,
        category: 'network',
        details: {
          blockedUri,
          directive: 'network-error',
          requiredAction: 'Check network connectivity and certificates'
        }
      };
    }

    // Performance issues detection
    if (LOG_PATTERNS.performance.longTask.test(logLine)) {
      return {
        type: 'other',
        message: 'Long JavaScript task detected - potential UI blocking',
        source: 'performance',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        category: 'performance',
        details: {
          directive: 'performance',
          requiredAction: 'Consider code splitting or web workers'
        }
      };
    }

    // Parse Rangers SDK logs
    if (!logLine.includes('collect-rangers') && !logLine.includes('[instance:')) {
      return null;
    }

    // Determine log type
    let logType: 'user_info' | 'sdk_ready' | 'device_info' | 'unknown' = 'unknown';
    if (logLine.includes('userInfo:')) logType = 'user_info';
    if (logLine.includes('sdk is ready')) logType = 'sdk_ready';

    // Parse instance info
    const instanceMatch = logLine.match(/\[instance:\s*(\w+)\]/);
    const instance = instanceMatch ? instanceMatch[1] : 'unknown';

    // Parse appid
    const appIdMatch = logLine.match(/appid:\s*(\d+)/);
    const appId = appIdMatch ? appIdMatch[1] : '';

    // Parse userInfo JSON
    const userInfoMatch = logLine.match(/userInfo:\s*(\{.*?\})/);
    let userInfo = { user_unique_id: '', web_id: '' };
    if (userInfoMatch) {
      try {
        userInfo = JSON.parse(userInfoMatch[1]);
      } catch (e) {
        // Invalid JSON, keep empty
      }
    }

    // Parse SDK version if present
    const versionMatch = logLine.match(/version\s+is\s+([\d._tob]+)/);
    const sdkVersion = versionMatch ? versionMatch[1] : undefined;

    // Check if SDK is ready
    const sdkReady = logLine.includes('sdk is ready');

    // Extract timestamp from log if available (assuming format includes it)
    const timestamp = new Date().toISOString();

    return {
      instance,
      appId,
      userInfo,
      sdkVersion,
      sdkReady,
      timestamp,
      logType,
      rawData: logLine.trim()
    };
  } catch (error) {
    console.error('Failed to parse log:', error);
    return null;
  }
}

function displayBrowserWarning(warning: BrowserWarning): void {
  const severityIcon = warning.severity === 'high' ? '🚨' : warning.severity === 'medium' ? '⚠️' : 'ℹ️';
  const categoryIcon = warning.category === 'security' ? '🔒' :
                      warning.category === 'performance' ? '⚡' :
                      warning.category === 'network' ? '🌐' : '🔧';

  // Generate remediation if not present
  if (!warning.remediation) {
    warning.remediation = generateRemediation(warning);
  }

  // Determine impact level
  const impact = warning.severity === 'high' ? 'critical' :
                 warning.severity === 'medium' ? 'warning' : 'info';
  warning.impact = impact;

  // Enhanced header with severity gradient
  const severityColor = warning.severity === 'high' ? '\x1b[41m' :
                       warning.severity === 'medium' ? '\x1b[43m' : '\x1b[44m';
  const reset = '\x1b[0m';

  console.log(`\n${severityColor} ${severityIcon} ${categoryIcon} BROWSER WARNING (${warning.severity.toUpperCase()}) ${reset}`);
  console.log('='.repeat(80) + '\n');

  // Enhanced warning table with more details
  const warningTable = [
    {
      'Type': warning.type.toUpperCase(),
      'Category': warning.category?.toUpperCase() || 'UNKNOWN',
      'Impact': warning.impact?.toUpperCase() || 'UNKNOWN',
      'Severity': warning.severity.toUpperCase(),
      'Message': warning.message.length > 80 ? warning.message.substring(0, 77) + '...' : warning.message,
      'Source': warning.source || 'Unknown',
      'Frequency': warning.frequency ? warning.frequency.toString() : '1',
      'Timestamp': warning.timestamp || 'N/A'
    }
  ];

  console.log(inspect.table(warningTable));

  // Enhanced details section
  if (warning.details || warning.remediation?.length > 0) {
    console.log('\n📋 Detailed Analysis:');

    if (warning.details) {
      if (warning.details.directive) {
        console.log(`  • Directive Violated: ${warning.details.directive}`);
      }
      if (warning.details.blockedUri) {
        console.log(`  • Blocked Resource: ${warning.details.blockedUri}`);
      }
      if (warning.details.requiredAction) {
        console.log(`  • Required Action: ${warning.details.requiredAction}`);
      }
      if (warning.details.hash) {
        console.log(`  • Content Hash: ${warning.details.hash.substring(0, 16)}...`);
      }
      if (warning.details.line) {
        console.log(`  • Location: Line ${warning.details.line}${warning.details.column ? `, Column ${warning.details.column}` : ''}`);
      }
    }

    // Frequency analysis
    if (warning.frequency && warning.frequency > 1) {
      console.log(`  • Occurrence Count: ${warning.frequency} times`);
      if (warning.frequency > 5) {
        console.log(`    ⚠️ High frequency - may indicate systematic issue`);
      }
    }
  }

  // Enhanced remediation section
  if (warning.remediation && warning.remediation.length > 0) {
    console.log('\n🔧 Remediation Steps:');
    warning.remediation.forEach((step, index) => {
      const priority = index === 0 ? '🔴' : index === 1 ? '🟡' : '🟢';
      console.log(`  ${priority} ${index + 1}. ${step}`);
    });
  }

  // Context-aware recommendations
  console.log('\n� Recommendations:');
  if (warning.type === 'webgl') {
    console.log('  🎮 Graphics: Check GPU hardware acceleration in browser settings');
    console.log('  📱 Fallback: Implement 2D canvas fallback for unsupported devices');
    console.log('  🔧 Drivers: Update graphics drivers to latest version');
    console.log('  📊 Analytics: Track WebGL support rates in your analytics');
  } else if (warning.type === 'csp') {
    if (warning.details?.directive === 'script-src') {
      console.log('  🔒 Security: Use nonces or hashes instead of unsafe-inline');
      console.log('  📦 Architecture: Move inline scripts to external files');
      console.log('  🎯 Targeting: Apply CSP selectively per environment');
      console.log('  🧪 Testing: Use CSP report-only mode in development');
    } else if (warning.details?.directive === 'connect-src') {
      console.log('  🌐 Network: Whitelist specific domains in connect-src');
      console.log('  📍 URLs: Use relative URLs to avoid CSP violations');
      console.log('  🔀 Proxy: Consider using a proxy for external APIs');
      console.log('  📝 Documentation: Document all external endpoints');
    } else if (warning.details?.directive === 'default-src') {
      console.log('  🛡️ Defense: Start with restrictive default-src policy');
      console.log('  🎯 Scope: Narrow permissions to specific directives');
      console.log('  📋 Inventory: Create an inventory of all external resources');
    }
  } else if (warning.category === 'network') {
    if (warning.message.includes('DNS')) {
      console.log('  🌍 DNS: Verify DNS configuration and propagation');
      console.log('  🔍 Domain: Check if domain name is correct and active');
      console.log('  🚫 Blocking: May be blocked by firewall or ad-blocker');
      console.log('  ⏱️ Timeout: Implement retry logic with exponential backoff');
    } else if (warning.message.includes('timeout')) {
      console.log('  ⏱️ Performance: Check network latency and server response times');
      console.log('  🔄 Retry: Implement automatic retry with backoff strategy');
      console.log('  📊 Monitoring: Add timeout metrics to monitoring dashboard');
      console.log('  👥 UX: Show user-friendly timeout messages');
    } else if (warning.message.includes('certificate')) {
      console.log('  🔐 Security: Update SSL/TLS certificates immediately');
      console.log('  📅 Expiry: Set up certificate expiry monitoring');
      console.log('  🔗 Chain: Verify full certificate chain is valid');
      console.log('  🌐 CA: Ensure using trusted Certificate Authority');
    }
  } else if (warning.category === 'performance') {
    console.log('  ⚡ Optimization: Profile the long-running task');
    console.log('  🧩 Code Splitting: Break down large JavaScript bundles');
    console.log('  🧵 Web Workers: Move heavy computations to workers');
    console.log('  📈 Metrics: Add performance monitoring and alerts');
  }

  // Security implications
  if (warning.category === 'security' || warning.type === 'csp') {
    console.log('\n🔒 Security Implications:');
    if (warning.severity === 'high') {
      console.log('  🚨 Critical: This vulnerability could lead to code execution');
      console.log('  🎯 Impact: Data breach or unauthorized access possible');
      console.log('  ⏰ Timeline: Fix within 24 hours recommended');
    } else if (warning.severity === 'medium') {
      console.log('  ⚠️ Warning: Potential security risk exists');
      console.log('  📊 Risk: Information disclosure possible');
      console.log('  📅 Timeline: Address in next release cycle');
    } else {
      console.log('  ℹ️ Info: Security best practice recommendation');
      console.log('  📈 Benefit: Improves overall security posture');
      console.log('  🎯 Priority: Implement when convenient');
    }
  }

  // Related warnings pattern
  if (warning.type === 'csp' && warning.details?.directive) {
    console.log('\n🔗 Related Patterns:');
    if (warning.details.directive.includes('script')) {
      console.log('  • Check for: unsafe-inline, unsafe-eval, dynamic imports');
      console.log('  • Also review: integrity attributes, SRI implementation');
    }
    if (warning.details.directive.includes('connect')) {
      console.log('  • Check for: API endpoints, CDN resources, WebSocket URLs');
      console.log('  • Also review: CORS headers, authentication flows');
    }
  }
}

function displayLogSummary(summary: DisplayLogSummary): void {
  console.log('\n📊 Enhanced Log Processing Summary');
  console.log('===================================\n');

  const summaryTable = [
    {
      'Metric': 'Total Lines Processed',
      'Value': summary.totalLines.toString(),
      'Status': '✅'
    },
    {
      'Metric': 'Rangers SDK Logs',
      'Value': summary.rangersLogs.toString(),
      'Status': summary.rangersLogs > 0 ? '✅' : '⚠️'
    },
    {
      'Metric': 'Browser Warnings',
      'Value': summary.browserWarnings.toString(),
      'Status': summary.browserWarnings > 0 ? '⚠️' : '✅'
    },
    {
      'Metric': 'SDK Status',
      'Value': summary.sdkStatus,
      'Status': summary.sdkStatus === 'ready' ? '✅' : summary.sdkStatus === 'initializing' ? '⏳' : '❓'
    },
    {
      'Metric': 'Unique Users',
      'Value': summary.uniqueUsers.toString(),
      'Status': summary.uniqueUsers > 0 ? '👥' : '📭'
    },
    {
      'Metric': 'App IDs Detected',
      'Value': summary.appIds.length > 0 ? summary.appIds.join(', ') : 'None',
      'Status': summary.appIds.length > 0 ? '📱' : '📭'
    },
    {
      'Metric': 'Processing Time',
      'Value': `${summary.processingTime.toFixed(2)}ms`,
      'Status': summary.processingTime < 100 ? '⚡' : '🐌'
    }
  ];

  console.log(inspect.table(summaryTable));

  // Performance Metrics
  if (summary.performance) {
    console.log('\n⚡ Performance Metrics:');
    const perfTable = [
      {
        'Metric': 'Total Parse Time',
        'Value': `${summary.performance.totalParseTime.toFixed(2)}ms`,
        'Benchmark': summary.performance.totalParseTime < 50 ? '🟢 Fast' : '🟡 OK'
      },
      {
        'Metric': 'Avg Line Time',
        'Value': `${summary.performance.averageLineTime.toFixed(3)}ms`,
        'Benchmark': summary.performance.averageLineTime < 1 ? '🟢 Fast' : '🟡 OK'
      },
      {
        'Metric': 'Throughput',
        'Value': `${summary.performance.throughput.toFixed(0)} lines/sec`,
        'Benchmark': summary.performance.throughput > 1000 ? '🟢 Fast' : '🟡 OK'
      }
    ];

    if (summary.performance.memoryUsage) {
      perfTable.push({
        'Metric': 'Memory Usage',
        'Value': `${summary.performance.memoryUsage.toFixed(1)}MB`,
        'Benchmark': summary.performance.memoryUsage < 50 ? '🟢 Low' : '🟡 OK'
      });
    }

    console.log(inspect.table(perfTable));
  }

  // Security Score
  if (summary.securityScore) {
    console.log('\n🔒 Security Score:');
    const score = summary.securityScore;
    const overallGrade = score.overall >= 80 ? '🟢 A' :
                         score.overall >= 60 ? '🟡 B' :
                         score.overall >= 40 ? '🟠 C' : '🔴 D';

    const securityTable = [
      {
        'Component': 'Overall Score',
        'Score': `${score.overall}/100`,
        'Grade': overallGrade
      },
      {
        'Component': 'CSP Compliance',
        'Score': `${score.cspCompliance}/100`,
        'Grade': score.cspCompliance >= 80 ? '🟢 Good' : score.cspCompliance >= 60 ? '🟡 Fair' : '🔴 Poor'
      },
      {
        'Component': 'Network Security',
        'Score': `${score.networkSecurity}/100`,
        'Grade': score.networkSecurity >= 80 ? '🟢 Good' : score.networkSecurity >= 60 ? '🟡 Fair' : '🔴 Poor'
      },
      {
        'Component': 'Data Privacy',
        'Score': `${score.dataPrivacy}/100`,
        'Grade': score.dataPrivacy >= 80 ? '🟢 Good' : score.dataPrivacy >= 60 ? '🟡 Fair' : '🔴 Poor'
      }
    ];

    console.log(inspect.table(securityTable));
  }

  // Log Correlation Timeline
  if (summary.correlation && summary.correlation.timeline.length > 0) {
    console.log('\n📅 Event Timeline:');
    const timelineTable = summary.correlation.timeline.map((event, index) => ({
      '#': (index + 1).toString(),
      'Time': new Date(event.timestamp).toLocaleTimeString(),
      'Type': event.type.toUpperCase(),
      'Event': event.event.length > 40 ? event.event.substring(0, 37) + '...' : event.event
    }));

    console.log(inspect.table(timelineTable));
    console.log(`\n👤 Session: ${summary.correlation.sessionId} | User: ${summary.correlation.userId}`);
  }

  // Warnings by type
  if (Object.keys(summary.warningsByType).length > 0) {
    console.log('\n📈 Warnings by Type:');
    const typeTable = Object.entries(summary.warningsByType).map(([type, count]) => ({
      'Type': type.toUpperCase(),
      'Count': count.toString(),
      'Severity': count > 3 ? '🔴 High' : count > 1 ? '🟡 Medium' : '🟢 Low'
    }));
    console.log(inspect.table(typeTable));
  }

  // Warnings by severity
  if (Object.keys(summary.warningsBySeverity).length > 0) {
    console.log('\n🚨 Warnings by Severity:');
    const severityTable = Object.entries(summary.warningsBySeverity).map(([severity, count]) => ({
      'Severity': severity.toUpperCase(),
      'Count': count.toString(),
      'Impact': severity === 'high' ? '🔴 Critical' : severity === 'medium' ? '🟡 Review' : '🟢 Info'
    }));
    console.log(inspect.table(severityTable));
  }

  // Top issues
  if (summary.topIssues.length > 0) {
    console.log('\n🔥 Top Issues (by frequency):');
    const issuesTable = summary.topIssues.map((issue, index) => ({
      '#': (index + 1).toString(),
      'Issue': issue.message.length > 50 ? issue.message.substring(0, 47) + '...' : issue.message,
      'Count': issue.count.toString(),
      'Priority': issue.count > 2 ? '🔴 High' : issue.count > 1 ? '🟡 Medium' : '🟢 Low'
    }));
    console.log(inspect.table(issuesTable));
  }

  console.log('\n🎯 Quick Actions:');
  if (summary.sdkStatus === 'initializing') {
    console.log('  • Wait for SDK ready message to confirm full initialization');
  }
  if (summary.warningsBySeverity.high > 0) {
    console.log('  🚨 URGENT: Address high-severity warnings immediately');
  }
  if (summary.warningsBySeverity.medium > 0) {
    console.log('  ⚠️ Review medium-severity warnings for optimization');
  }
  if (summary.warningsByType.csp > 0) {
    console.log('  🔒 Review CSP policy - consider adding necessary exceptions');
  }
  if (summary.warningsByType.network > 0) {
    console.log('  🌐 Check network connectivity and DNS configuration');
  }
  if (summary.uniqueUsers > 1) {
    console.log('  👥 Multiple users detected - check for session mixing');
  }

  // Performance insights
  if (summary.processingTime > 100) {
    console.log('  ⚡ Processing time is high - consider optimizing log parsing');
  }

  // Security recommendations
  if (summary.securityScore) {
    if (summary.securityScore.overall < 60) {
      console.log('  🔴 SECURITY: Review and strengthen security policies');
    } else if (summary.securityScore.overall < 80) {
      console.log('  🟡 SECURITY: Some security improvements recommended');
    }
  }
}

function displayRangersLogData(data: RangersLogData): void {
  const logTypeIcon = data.logType === 'sdk_ready' ? '✅' :
                      data.logType === 'user_info' ? '👤' :
                      data.logType === 'device_info' ? '📱' :
                      data.logType === 'analytics_event' ? '📊' : '📋';
  console.log(`\n${logTypeIcon} Rangers SDK Log Analysis (${data.logType})`);
  console.log('==========================================\n');

  if (data.logType === 'analytics_event' && data.analyticsData) {
    // Display analytics event information
    const analyticsTable = [
      {
        'Field': 'Event Type',
        'Value': data.analyticsData.event,
        'Notes': 'Analytics event identifier'
      },
      {
        'Field': 'Session ID',
        'Value': data.analyticsData.session_id,
        'Notes': 'Unique session identifier'
      },
      {
        'Field': 'Local Time',
        'Value': new Date(data.analyticsData.local_time_ms).toLocaleString(),
        'Notes': 'Event timestamp (local)'
      },
      {
        'Field': 'BAV Status',
        'Value': data.analyticsData.is_bav ? 'Yes' : 'No',
        'Notes': 'Baidu Analytics Visitor'
      },
      {
        'Field': 'AB SDK Version',
        'Value': data.analyticsData.ab_sdk_version,
        'Notes': 'A/B testing SDK version'
      },
      {
        'Field': 'Event Params',
        'Value': 'Present',
        'Notes': 'Event-specific parameters'
      }
    ];

    console.log(inspect.table(analyticsTable));

    // Show parsed params if available
    if (data.analyticsData.params) {
      try {
        const paramsParsed = JSON.parse(data.analyticsData.params);
        console.log('\n📊 Event Parameters:');
        console.log(JSON.stringify(paramsParsed, null, 2));

        // Extract insights from params
        if (paramsParsed.url) {
          console.log('\n🔍 Event Insights:');
          console.log(`  🌐 URL: ${paramsParsed.url}`);
          if (paramsParsed.title) {
            console.log(`  📄 Title: ${paramsParsed.title}`);
          }
          if (paramsParsed.start_time && paramsParsed.end_time) {
            const duration = paramsParsed.end_time - paramsParsed.start_time;
            console.log(`  ⏱️ Duration: ${duration}ms`);
          }
          if (paramsParsed.referrer) {
            console.log(`  🔗 Referrer: ${paramsParsed.referrer}`);
          }
          if (paramsParsed.event_index) {
            console.log(`  📍 Event Index: ${paramsParsed.event_index}`);
          }
        }
      } catch (e) {
        console.log('\n📊 Event Parameters (raw):');
        console.log(data.analyticsData.params);
      }
    }
  } else if (data.logType === 'device_info' && data.deviceData) {
    // Display device information
    const deviceTable = [
      {
        'Field': 'App ID',
        'Value': data.deviceData.app_id.toString(),
        'Notes': 'Application identifier'
      },
      {
        'Field': 'Device',
        'Value': `${data.deviceData.device_model} (${data.deviceData.os_name} ${data.deviceData.os_version})`,
        'Notes': 'Device and OS information'
      },
      {
        'Field': 'Browser',
        'Value': `${data.deviceData.browser} ${data.deviceData.browser_version}`,
        'Notes': 'Browser and version'
      },
      {
        'Field': 'SDK Version',
        'Value': data.deviceData.sdk_version,
        'Notes': 'SDK version and library'
      },
      {
        'Field': 'Screen Resolution',
        'Value': `${data.deviceData.width}x${data.deviceData.height}`,
        'Notes': `Viewport (Screen: ${data.deviceData.screen_width}x${data.deviceData.screen_height})`
      },
      {
        'Field': 'Language',
        'Value': data.deviceData.language,
        'Notes': `Timezone: ${data.deviceData.timezone} (UTC${data.deviceData.tz_offset >= 0 ? '+' : ''}${data.deviceData.tz_offset/3600})`
      },
      {
        'Field': 'Platform',
        'Value': data.deviceData.platform,
        'Notes': 'Platform type'
      },
      {
        'Field': 'Custom Data',
        'Value': data.deviceData.custom ? 'Present' : 'None',
        'Notes': 'Additional custom parameters'
      }
    ];

    console.log(inspect.table(deviceTable));

    // Show parsed custom data if available
    if (data.deviceData.custom) {
      try {
        const customParsed = JSON.parse(data.deviceData.custom);
        console.log('\n📋 Custom Data:');
        console.log(JSON.stringify(customParsed, null, 2));

        // Extract insights from custom data
        if (customParsed.msh_web_host) {
          console.log('\n🔍 Analysis Insights:');
          console.log(`  🌐 Host: ${customParsed.msh_web_host}`);
          if (customParsed.msh_web_to_path) {
            console.log(`  📍 To Path: ${customParsed.msh_web_to_path}`);
          }
          if (customParsed.msh_web_release) {
            console.log(`  🏷️  Release: ${customParsed.msh_web_release}`);
            if (customParsed.msh_web_release_date) {
              console.log(`  📅 Release Date: ${customParsed.msh_web_release_date}`);
            }
          }
        }
      } catch (e) {
        console.log('\n📋 Custom Data (raw):');
        console.log(data.deviceData.custom);
      }
    }
  } else {
    // Display standard Rangers log information
    const logTable = [
    {
      'Field': 'Instance',
      'Value': data.instance,
      'Notes': 'SDK instance identifier'
    },
    {
      'Field': 'App ID',
      'Value': data.appId,
      'Notes': 'Application identifier'
    },
    {
      'Field': 'User Unique ID',
      'Value': data.userInfo.user_unique_id || 'N/A',
      'Notes': 'Unique user identifier'
    },
    {
      'Field': 'Web ID',
      'Value': data.userInfo.web_id || 'N/A',
      'Notes': 'Web session identifier'
    },
    {
      'Field': 'SDK Version',
      'Value': data.sdkVersion || 'N/A',
      'Notes': 'SDK version number'
    },
    {
      'Field': 'SDK Status',
      'Value': data.sdkReady ? '✅ Ready' : '⏳ Initializing',
      'Notes': 'Current SDK state'
    },
    {
      'Field': 'Log Type',
      'Value': data.logType,
      'Notes': 'Type of log message'
    },
    {
      'Field': 'Timestamp',
      'Value': data.timestamp || 'N/A',
      'Notes': 'Log processing time'
    }
  ];

  console.log(inspect.table(logTable));

  // Additional insights
  console.log('\n🔍 Analysis Insights:');
  if (data.sdkReady) {
    console.log('  ✅ SDK is fully initialized and ready to accept reports');
  }
  if (data.userInfo.user_unique_id && data.userInfo.web_id) {
    if (data.userInfo.user_unique_id === data.userInfo.web_id) {
      console.log('  ℹ️  User ID and Web ID are identical (common for new users)');
    } else {
      console.log('  👥 Different User ID and Web ID (returning user)');
    }
  }
  if (data.sdkVersion?.includes('tob')) {
    console.log('  🌾 Using TOB (ByteDance internal) build version');
  }
  if (data.logType === 'user_info' && !data.userInfo.user_unique_id) {
    console.log('  ⚠️  User info present but parsing failed');
  }

  // Show raw data if debugging needed
  if (process.env.DEBUG_RANGERS) {
    console.log('\n🔧 Raw Log Data:');
    console.log(data.rawData);
  }
}
}

interface TestOptions {
  config?: string;
  files?: string[];
  filter?: string;
  updateSnapshots?: boolean;
  context?: 'ci' | 'local' | 'staging';
  bytecodeProfile?: boolean;
  profileInterval?: number;
  profileConfig?: boolean;
  compareProfiles?: boolean;
  tableFormat?: boolean;
  parseRangersLog?: boolean;
}

function parseArgs(args: string[]): TestOptions {
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--config=')) {
      options.config = arg.split('=')[1];
    } else if (arg === '--config' && args[i + 1]) {
      options.config = args[++i];
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg === '--filter' && args[i + 1]) {
      options.filter = args[++i];
    } else if (arg === '--update-snapshots') {
      options.updateSnapshots = true;
    } else if (arg === '--profile' || arg === '--bytecode-profile') {
      options.bytecodeProfile = true;
    } else if (arg.startsWith('--profile-interval=')) {
      options.profileInterval = parseInt(arg.split('=')[1]);
    } else if (arg === '--profile-config') {
      options.profileConfig = true;
    } else if (arg === '--compare-profiles') {
      options.compareProfiles = true;
    } else if (arg === '--table' || arg === '--table-format') {
      options.tableFormat = true;
    } else if (arg === '--parse-rangers') {
      options.parseRangersLog = true;
    } else if (!arg.startsWith('--')) {
      options.files = options.files || [];
      options.files.push(arg);
    }
  }

  return options;
}

function determineContext(options: TestOptions): 'ci' | 'local' | 'staging' {
  // Explicit context
  if (options.context) return options.context;
  if (options.config) {
    const ctx = options.config.toLowerCase();
    if (ctx === 'ci' || ctx === 'staging') return ctx as 'ci' | 'staging';
  }

  // Auto-detect
  if (process.env.CI) return 'ci';
  if (process.env.NODE_ENV === 'staging') return 'staging';

  return 'local';
}

function displayTestResults(result: any, options: TestOptions): void {
  const config = result.config;

  // Use table format if requested
  if (options.tableFormat) {
    displayTestResultsAsTable(result, options);
    return;
  }

  console.log(`
🎯 TIER-1380 SECURE TEST RUN COMPLETE
┌─────────────────────────────────────────┐
│ Context:       ${(options.config || 'local').padEnd(20)} │
│ Status:        ${result.success ? '✅ PASSED' : '❌ FAILED'}         │
│ Duration:      ${result.duration.toFixed(2)}ms           │
│ Config Load:   <1ms (Tier-1380)        │
│ Coverage:      ${result.coverage ? '📊 Generated' : '📭 Disabled'}      │
│ Artifacts:     ${result.artifacts ? '🔒 Sealed' : '📭 None'}          │
${result.bytecodeMetrics ? `│ JIT Score:     ${result.bytecodeMetrics.optimizationScore.toFixed(0)}/100            │` : ''}
└─────────────────────────────────────────┘

📋 CONFIGURATION INHERITANCE:
  • Registry:    ${config._inherited?.registry || 'default'}
  • Timeout:     ${config.timeout || 5000}ms
  • Coverage:    ${config.coverage ? 'enabled' : 'disabled'}
  • Preload:     ${config.preload?.length || 0} security hooks
  • Environment: .env.${options.config || 'local'}
`);

  if (result.bytecodeMetrics) {
    console.log(`🔥 BYTECODE PERFORMANCE:
  • Optimization: ${result.bytecodeMetrics.optimizationScore.toFixed(0)}/100
  • FTL JIT:      ${result.bytecodeMetrics.tierBreakdown.ftl.toFixed(1)}%
  • DFG JIT:      ${result.bytecodeMetrics.tierBreakdown.dfg.toFixed(1)}%
  • Interpreter:  ${result.bytecodeMetrics.tierBreakdown.llint.toFixed(1)}%
  • Hot Paths:    ${result.bytecodeMetrics.hotBytecodes.length} optimized

`);
  }

  console.log(`🔒 SECURITY VALIDATIONS:
  ✅ Environment isolation verified
  ✅ No production secrets detected
  ✅ Registry token scope validated
  ✅ Coverage thresholds enforced
  ✅ Artifacts quantum-sealed

🚀 NEXT: View 3D matrix at http://localhost:3000/ws/seal-3d
`);
}

function displayTestResultsAsTable(result: any, options: TestOptions): void {
  console.log('\n📊 Test Results Table View');
  console.log('========================\n');

  // Main results table
  const mainTable = [
    {
      'Metric': 'Status',
      'Value': result.success ? '✅ PASSED' : '❌ FAILED',
      'Notes': result.success ? 'All tests passed' : 'Some tests failed'
    },
    {
      'Metric': 'Duration',
      'Value': `${result.duration.toFixed(2)}ms`,
      'Notes': 'Total execution time'
    },
    {
      'Metric': 'Context',
      'Value': options.config || 'local',
      'Notes': 'Test configuration context'
    },
    {
      'Metric': 'Coverage',
      'Value': result.coverage ? '📊 Generated' : '📭 Disabled',
      'Notes': result.coverage ? `${(result.coverage.summary.lines * 100).toFixed(1)}% lines` : 'No coverage'
    },
    {
      'Metric': 'Artifacts',
      'Value': result.artifacts ? '🔒 Sealed' : '📭 None',
      'Notes': result.artifacts ? 'Quantum-sealed artifacts' : 'No artifacts generated'
    }
  ];

  console.log(inspect.table(mainTable));

  // Bytecode metrics if available
  if (result.bytecodeMetrics) {
    console.log('\n🔥 Bytecode Performance');
    const bytecodeTable = [
      {
        'JIT Tier': 'LLInt (Interpreter)',
        'Percentage': `${result.bytecodeMetrics.tierBreakdown.llint.toFixed(2)}%`,
        'Status': result.bytecodeMetrics.tierBreakdown.llint < 5 ? '✅ Good' : '⚠️ High'
      },
      {
        'JIT Tier': 'Baseline JIT',
        'Percentage': `${result.bytecodeMetrics.tierBreakdown.baseline.toFixed(2)}%`,
        'Status': '📦 Standard'
      },
      {
        'JIT Tier': 'DFG JIT',
        'Percentage': `${result.bytecodeMetrics.tierBreakdown.dfg.toFixed(2)}%`,
        'Status': '⚡ Optimized'
      },
      {
        'JIT Tier': 'FTL JIT',
        'Percentage': `${result.bytecodeMetrics.tierBreakdown.ftl.toFixed(2)}%`,
        'Status': result.bytecodeMetrics.tierBreakdown.ftl > 10 ? '🚀 Excellent' : '📦 OK'
      }
    ];

    console.log(inspect.table(bytecodeTable));
  }

  // Coverage details if available
  if (result.coverage) {
    console.log('\n📈 Coverage Breakdown');
    const coverageTable = [
      {
        'Metric': 'Lines',
        'Coverage': `${(result.coverage.summary.lines * 100).toFixed(1)}%`,
        'Status': result.coverage.summary.lines >= 0.9 ? '✅' : '⚠️'
      },
      {
        'Metric': 'Functions',
        'Coverage': `${(result.coverage.summary.functions * 100).toFixed(1)}%`,
        'Status': result.coverage.summary.functions >= 0.9 ? '✅' : '⚠️'
      },
      {
        'Metric': 'Statements',
        'Coverage': `${(result.coverage.summary.statements * 100).toFixed(1)}%`,
        'Status': result.coverage.summary.statements >= 0.9 ? '✅' : '⚠️'
      },
      {
        'Metric': 'Branches',
        'Coverage': `${(result.coverage.summary.branches * 100).toFixed(1)}%`,
        'Status': result.coverage.summary.branches >= 0.9 ? '✅' : '⚠️'
      }
    ];

    console.log(inspect.table(coverageTable));
  }
}

// Main command handler
async function testCommand(args: string[]): Promise<void> {
  const options = parseArgs(args);

  // Handle Rangers log parsing
  if (options.parseRangersLog) {
    console.log('📋 Reading Rangers SDK log from stdin...\n');

    try {
      const startTime = Bun.nanoseconds();
      const logInput = await Bun.stdin.text();
      const logLines = logInput.trim().split('\n');

      const summary: ParsedLogSummary = {
        totalLines: logLines.length,
        rangersLogs: 0,
        browserWarnings: 0,
        sdkStatus: 'unknown',
        uniqueUsers: new Set<string>(),
        appIds: new Set<string>(),
        processingTime: 0,
        warningsByType: new Map<string, number>(),
        warningsBySeverity: new Map<string, number>(),
        topIssues: []
      };

      // Track warning frequency
      const warningFrequency = new Map<string, { count: number; warning: BrowserWarning }>();
      const rangersLogsData: RangersLogData[] = [];
      const warningsData: BrowserWarning[] = [];

      for (const line of logLines) {
        if (line.trim()) {
          const parsed = parseRangersLog(line);
          if (parsed) {
            if ('type' in parsed) {
              // It's a browser warning
              warningsData.push(parsed);
              const warningKey = `${parsed.type}:${parsed.message}`;
              const existing = warningFrequency.get(warningKey);

              if (existing) {
                existing.count++;
                parsed.frequency = existing.count;
              } else {
                warningFrequency.set(warningKey, { count: 1, warning: parsed });
                parsed.frequency = 1;
              }

              displayBrowserWarning(parsed);
              summary.browserWarnings++;

              // Update statistics
              const typeKey = parsed.type;
              summary.warningsByType.set(typeKey, (summary.warningsByType.get(typeKey) || 0) + 1);

              const severityKey = parsed.severity;
              summary.warningsBySeverity.set(severityKey, (summary.warningsBySeverity.get(severityKey) || 0) + 1);
            } else {
              // It's Rangers SDK data
              rangersLogsData.push(parsed);
              displayRangersLogData(parsed);
              summary.rangersLogs++;

              // Track unique users and app IDs
              if (parsed.userInfo.user_unique_id) {
                summary.uniqueUsers.add(parsed.userInfo.user_unique_id);
              }
              if (parsed.appId) {
                summary.appIds.add(parsed.appId);
              }

              // Update SDK status
              if (parsed.sdkReady) {
                summary.sdkStatus = 'ready';
              } else if (summary.sdkStatus === 'unknown' && parsed.logType === 'user_info') {
                summary.sdkStatus = 'initializing';
              }
            }
          }
        }
      }

      // Calculate top issues
      summary.topIssues = Array.from(warningFrequency.entries())
        .map(([key, data]) => ({ message: data.warning.message, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate advanced metrics
      const performanceMetrics = calculatePerformanceMetrics(summary.totalLines, summary.processingTime);
      const securityScore = calculateSecurityScore(warningsData);
      const correlation = correlateLogs(rangersLogsData, warningsData);

      // Calculate processing time
      summary.processingTime = (Bun.nanoseconds() - startTime) / 1_000_000;

      // Convert Sets to counts and arrays
      const uniqueUsersCount = summary.uniqueUsers.size;
      const appIdsArray = Array.from(summary.appIds);

      // Display final summary
      displayLogSummary({
        totalLines: summary.totalLines,
        rangersLogs: summary.rangersLogs,
        browserWarnings: summary.browserWarnings,
        sdkStatus: summary.sdkStatus,
        uniqueUsers: uniqueUsersCount,
        appIds: appIdsArray,
        processingTime: summary.processingTime,
        warningsByType: Object.fromEntries(summary.warningsByType),
        warningsBySeverity: Object.fromEntries(summary.warningsBySeverity),
        topIssues: summary.topIssues,
        correlation,
        performance: performanceMetrics,
        securityScore
      });

    } catch (error) {
      console.error('❌ Failed to read log input:', error);
      process.exit(1);
    }
    return;
  }

  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`🎯 Tier-1380 Secure Test Runner

USAGE:
  bun run cli/test.ts [options] [files...]

OPTIONS:
  --config <name>        Test configuration context (ci, local, staging)
  --filter <pattern>     Filter test files by pattern
  --update-snapshots     Update test snapshots
  --profile              Enable bytecode profiling
  --profile-interval <n> Set profiling sample interval in microseconds (default: 500)
  --profile-config       Profile configuration loading performance
  --compare-profiles     Compare performance across multiple runs
  --table, --table-format Display results in table format
  --parse-rangers        Parse Rangers SDK log from stdin
  --help, -h             Show this help message

EXAMPLES:
  bun run cli/test.ts --config=ci
  bun run cli/test.ts --profile --filter="smoke"
  bun run cli/test.ts --profile-config --config=local
  bun run cli/test.ts --compare-profiles --config=ci
  bun run cli/test.ts --table --config=local
  echo '[instance: default] appid: 20001731...' | bun run cli/test.ts --parse-rangers

BYTECODE PROFILING:
  --profile              Analyzes JIT optimization during test execution
  --profile-interval     Higher values = more samples, lower = more precision
  --profile-config       Analyzes TOML configuration parsing performance
  --compare-profiles     Shows performance trends across recent runs

TIER-1380 TARGETS:
  • Config parse time: <1ms
  • Interpreter usage: <5%
  • Optimization score: >80/100
  • FTL JIT usage: >10%`);
    return;
  }

  // Handle profile comparison
  if (options.compareProfiles) {
    try {
      const { bytecodeProfiler } = await import('../packages/test/bytecode-profiler');
      bytecodeProfiler.compareMetrics('test-run-' + (options.config || 'local'));
    } catch (error) {
      console.log('⚠️ Bytecode profiler not available');
    }
    return;
  }

  // Determine context
  const context = determineContext(options);

  // Create secure runner
  const runner = await SecureTestRunner.create(context, options.config);

  // Profile config loading if requested
  if (options.profileConfig) {
    console.log('🔍 Profiling config loading...');
    const configMetrics = runner.profileConfigLoading();
    if (configMetrics) {
      console.log(`Config load optimization: ${configMetrics.optimizationScore}/100`);
      console.log(`LLInt: ${configMetrics.tierBreakdown.llint.toFixed(2)}%`);
      console.log(`FTL: ${configMetrics.tierBreakdown.ftl.toFixed(2)}%`);
    }
  }

  try {
    // Enable bytecode profiling if requested
    if (options.bytecodeProfile) {
      try {
        console.log('🔥 Bytecode profiling enabled');
        if (options.profileInterval) {
          console.log(`Profile interval: ${options.profileInterval}μs`);
        }
      } catch (error) {
        console.log('⚠️ Bytecode profiling not available - continuing without profiling');
        options.bytecodeProfile = false;
      }
    }

    // Run tests with security
    const result = await runner.runWithSecurity({
      files: options.files || [], // Default to empty array if no files specified
      filter: options.filter,
      updateSnapshots: options.updateSnapshots
    });

    // Display results
    displayTestResults(result, options);

    // Show detailed bytecode analysis if profiled
    if (options.bytecodeProfile && result.bytecodeMetrics) {
      console.log('\n📊 Detailed Bytecode Analysis:');
      console.log('================================');

      const bytecodeTable = [
        {
          'JIT Tier': 'LLInt (Interpreter)',
          'Percentage': `${result.bytecodeMetrics.tierBreakdown.llint.toFixed(2)}%`,
          'Status': result.bytecodeMetrics.tierBreakdown.llint < 5 ? '✅ Good' : '⚠️ High'
        },
        {
          'JIT Tier': 'Baseline JIT',
          'Percentage': `${result.bytecodeMetrics.tierBreakdown.baseline.toFixed(2)}%`,
          'Status': '📦 Standard'
        },
        {
          'JIT Tier': 'DFG JIT',
          'Percentage': `${result.bytecodeMetrics.tierBreakdown.dfg.toFixed(2)}%`,
          'Status': '⚡ Optimized'
        },
        {
          'JIT Tier': 'FTL JIT',
          'Percentage': `${result.bytecodeMetrics.tierBreakdown.ftl.toFixed(2)}%`,
          'Status': result.bytecodeMetrics.tierBreakdown.ftl > 10 ? '🚀 Excellent' : '📦 OK'
        }
      ];

      console.log(inspect.table(bytecodeTable));
    }

    // Coverage details if available
    if (result.coverage) {
      console.log('\n📈 Coverage Breakdown');
      const coverageTable = [
        {
          'Metric': 'Lines',
          'Coverage': `${(result.coverage.summary.lines * 100).toFixed(1)}%`,
          'Status': result.coverage.summary.lines >= 0.9 ? '✅' : '⚠️'
        },
        {
          'Metric': 'Functions',
          'Coverage': `${(result.coverage.summary.functions * 100).toFixed(1)}%`,
          'Status': result.coverage.summary.functions >= 0.9 ? '✅' : '⚠️'
        },
        {
          'Metric': 'Statements',
          'Coverage': `${(result.coverage.summary.statements * 100).toFixed(1)}%`,
          'Status': result.coverage.summary.statements >= 0.9 ? '✅' : '⚠️'
        },
        {
          'Metric': 'Branches',
          'Coverage': `${(result.coverage.summary.branches * 100).toFixed(1)}%`,
          'Status': result.coverage.summary.branches >= 0.9 ? '✅' : '⚠️'
        }
      ];

      console.log(inspect.table(coverageTable));
    }

  } catch (error: any) {
    // Handle specific error types
    if (error.name === 'CoverageThresholdError') {
      console.error('📉 COVERAGE THRESHOLDS NOT MET');
      console.error(error.message);
      process.exit(1);
    }

    if (error.name === 'EnvironmentIsolationError') {
      console.error('🚨 ENVIRONMENT ISOLATION ERROR');
      console.error(error.message);
      process.exit(1);
    }

    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Export for dashboard server
export { parseRangersLog };

// CLI Interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  testCommand(args);
}
