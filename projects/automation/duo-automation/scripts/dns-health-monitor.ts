// scripts/dns-health-monitor.ts [#REF:MONITOR]
export class DNSHealthMonitor {
  private readonly ENDPOINTS = [
    { subdomain: 'api.apple', path: '/api/status', expectedCode: 200 },
    { subdomain: 'qr.apple', path: '/qr/test', expectedCode: 200 },
    { subdomain: 'ws.apple', path: '/ws/health', expectedCode: 101 }, // WebSocket upgrade
    { subdomain: 'auth.apple', path: '/auth/.well-known/openid-configuration', expectedCode: 200 },
    { subdomain: 'monitor.apple', path: '/', expectedCode: 200 },
  ];

  async runHealthChecks(): Promise<HealthReport> {
    console.log('🏥 Running DNS Health Checks...\n');
    
    const report: HealthReport = {
      timestamp: new Date().toISOString(),
      checks: [],
      overallStatus: 'healthy',
    };

    for (const endpoint of this.ENDPOINTS) {
      const url = `https://${endpoint.subdomain}.factory-wager.com${endpoint.path}`;
      const check = await this.checkEndpoint(url, endpoint.expectedCode);
      
      report.checks.push({
        url,
        status: check.status,
        responseTime: check.responseTime,
        error: check.error,
      });
      
      if (check.status === 'failed') {
        report.overallStatus = 'unhealthy';
      }
    }

    // Send alert if unhealthy
    if (report.overallStatus === 'unhealthy') {
      await this.sendAlert(report);
    }

    return report;
  }

  private async checkEndpoint(url: string, expectedCode: number): Promise<HealthCheck> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'User-Agent': 'DuoPlus-Health-Check/1.0' },
        // Add timeout
        signal: AbortSignal.timeout(5000),
      });
      
      const responseTime = performance.now() - startTime;
      
      if (response.status === expectedCode) {
        return { 
          status: 'passed', 
          responseTime: Math.round(responseTime),
          error: null,
        };
      } else {
        return { 
          status: 'failed', 
          responseTime: Math.round(responseTime),
          error: `Expected ${expectedCode}, got ${response.status}`,
        };
      }
    } catch (error: any) {
      return { 
        status: 'failed', 
        responseTime: Math.round(performance.now() - startTime),
        error: error.message,
      };
    }
  }

  private async sendAlert(report: HealthReport): Promise<void> {
    // Send to Slack/Discord
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    const payload = {
      text: '🚨 DNS Health Alert',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*DuoPlus DNS Health Check Failed*\nTimestamp: ${report.timestamp}`,
          },
        },
        {
          type: 'divider',
        },
        ...report.checks.filter(c => c.status === 'failed').map(check => ({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ *${check.url}*\nError: ${check.error}\nResponse Time: ${check.responseTime}ms`,
          },
        })),
      ],
    };
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

// Schedule health checks every 5 minutes
const monitor = new DNSHealthMonitor();
setInterval(() => monitor.runHealthChecks(), 5 * 60 * 1000);
monitor.runHealthChecks(); // Initial check

