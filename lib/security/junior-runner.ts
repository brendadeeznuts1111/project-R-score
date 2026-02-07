#!/usr/bin/env bun

/**
 * JuniorRunner Cookie Integration - v3.25
 * 
 * JuniorRunner integration with --cookie-inspect flag for
 * comprehensive cookie profiling and R2 telemetry storage.
 */

import { Cookie, CookieInspector, CSRFProtection, JuniorRunnerCookieIntegration } from './cookie-security';

// 📊 LEAD SPEC PROFILE INTERFACE
export interface LeadSpecProfile {
  timestamp: string;
  sessionId?: string;
  userId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
  cookies: {
    count: number;
    valid: number;
    invalid: number;
    averageScore: number;
    securityIssues: string[];
  };
  csrf?: {
    tokenGenerated: boolean;
    tokenValue?: string;
  };
  abTesting?: {
    variant?: 'A' | 'B';
    valid: boolean;
    userId?: string;
  };
  performance: {
    parseTime: number;
    inspectTime: number;
    totalTime: number;
  };
  security: {
    overallScore: number;
    criticalIssues: string[];
    recommendations: string[];
  };
}

// 🗄️ R2 STORAGE INTERFACE
export interface R2TelemetryStorage {
  saveProfile(sessionId: string, profile: LeadSpecProfile): Promise<void>;
  getProfile(sessionId: string): Promise<LeadSpecProfile | null>;
  getSessionHistory(sessionId: string, limit?: number): Promise<LeadSpecProfile[]>;
  deleteSession(sessionId: string): Promise<void>;
}

// 🚀 JUNIOR RUNNER COOKIE PROFILER
export class JuniorRunnerCookieProfiler {
  private static r2Storage: R2TelemetryStorage;

  static initialize(storage: R2TelemetryStorage): void {
    this.r2Storage = storage;
  }

  /**
   * Profile request with comprehensive cookie analysis
   * Performance target: <10ms total processing time
   */
  static async profileWithCookies(mdFile: string, req: Request): Promise<LeadSpecProfile> {
    const startTime = performance.now();
    const url = new URL(req.url);
    
    // Extract basic request info
    const sessionId = this.extractSessionId(req);
    const userId = this.extractUserId(req);
    
    // Profile cookies (main processing)
    const cookieProfileStart = performance.now();
    const cookieProfile = await JuniorRunnerCookieIntegration.profileCookies(req);
    const cookieProfileTime = performance.now() - cookieProfileStart;

    // Generate R2 telemetry
    const telemetry = JuniorRunnerCookieIntegration.generateR2Telemetry(cookieProfile);

    // Build comprehensive profile
    const profile: LeadSpecProfile = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      path: url.pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      cookies: {
        count: cookieProfile.cookies.length,
        valid: cookieProfile.validation.valid,
        invalid: cookieProfile.validation.invalid,
        averageScore: cookieProfile.validation.averageScore,
        securityIssues: cookieProfile.validation.securityIssues
      },
      csrf: cookieProfile.csrfToken ? {
        tokenGenerated: true,
        tokenValue: cookieProfile.csrfToken
      } : {
        tokenGenerated: false
      },
      abTesting: cookieProfile.abVariant ? {
        variant: cookieProfile.abVariant.variant,
        valid: cookieProfile.abVariant.valid,
        userId: cookieProfile.abVariant.userId
      } : undefined,
      performance: {
        parseTime: cookieProfileTime,
        inspectTime: 0, // Included in cookieProfileTime
        totalTime: performance.now() - startTime
      },
      security: {
        overallScore: cookieProfile.validation.averageScore,
        criticalIssues: cookieProfile.validation.securityIssues.filter(issue => 
          issue.includes('expired') || issue.includes('too large') || issue.includes('must be')
        ),
        recommendations: this.generateRecommendations(cookieProfile)
      }
    };

    // Save to R2 if storage is available
    if (this.r2Storage && sessionId) {
      try {
        await this.r2Storage.saveProfile(sessionId, profile);
      } catch (error) {
        console.warn('Failed to save profile to R2:', error);
      }
    }

    return profile;
  }

  /**
   * Extract session ID from request
   */
  private static extractSessionId(req: Request): string | undefined {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) return undefined;

    try {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.includes('session='));
      
      if (sessionCookie) {
        const cookie = Cookie.parse(sessionCookie);
        return cookie.value;
      }
    } catch {
      // Invalid cookie format
    }

    return undefined;
  }

  /**
   * Extract user ID from request
   */
  private static extractUserId(req: Request): string | undefined {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) return undefined;

    try {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const userCookie = cookies.find(c => c.includes('user_id=') || c.includes('userId='));
      
      if (userCookie) {
        const cookie = Cookie.parse(userCookie);
        return cookie.value;
      }
    } catch {
      // Invalid cookie format
    }

    return undefined;
  }

  /**
   * Generate security recommendations based on profile
   */
  private static generateRecommendations(profile: Awaited<ReturnType<typeof JuniorRunnerCookieIntegration.profileCookies>>): string[] {
    const recommendations: string[] = [];

    // Cookie security recommendations
    if (profile.validation.averageScore < 80) {
      recommendations.push('Improve overall cookie security configuration');
    }

    if (profile.validation.securityIssues.some(issue => issue.includes('secure'))) {
      recommendations.push('Enable secure flag for all cookies in production');
    }

    if (profile.validation.securityIssues.some(issue => issue.includes('httpOnly'))) {
      recommendations.push('Enable httpOnly flag for sensitive cookies');
    }

    if (profile.validation.securityIssues.some(issue => issue.includes('sameSite'))) {
      recommendations.push('Set appropriate sameSite attribute for CSRF protection');
    }

    // CSRF recommendations
    if (!profile.csrfToken) {
      recommendations.push('Implement CSRF protection for state-changing operations');
    }

    // A/B testing recommendations
    if (profile.abVariant && !profile.abVariant.valid) {
      recommendations.push('Fix A/B variant cookie signature or expiration');
    }

    return recommendations;
  }

  /**
   * Generate security report for dashboard
   */
  static generateSecurityReport(profiles: LeadSpecProfile[]): {
    totalSessions: number;
    averageSecurityScore: number;
    criticalIssuesCount: number;
    topIssues: Array<{ issue: string; count: number }>;
    recommendations: string[];
    csrfCoverage: number;
    abTestingCoverage: number;
  } {
    const totalSessions = profiles.length;
    const totalScore = profiles.reduce((sum, p) => sum + p.security.overallScore, 0);
    const averageSecurityScore = Math.round(totalScore / totalSessions);
    
    const allIssues = profiles.flatMap(p => p.security.criticalIssues);
    const issueCounts = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIssues = Object.entries(issueCounts)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sessionsWithCSRF = profiles.filter(p => p.csrf?.tokenGenerated).length;
    const csrfCoverage = Math.round((sessionsWithCSRF / totalSessions) * 100);

    const sessionsWithABTesting = profiles.filter(p => p.abTesting?.valid).length;
    const abTestingCoverage = Math.round((sessionsWithABTesting / totalSessions) * 100);

    const allRecommendations = [...new Set(profiles.flatMap(p => p.security.recommendations))];

    return {
      totalSessions,
      averageSecurityScore,
      criticalIssuesCount: allIssues.length,
      topIssues,
      recommendations: allRecommendations,
      csrfCoverage,
      abTestingCoverage
    };
  }
}

// 🗄️ R2 STORAGE IMPLEMENTATION
export class R2CookieTelemetryStorage implements R2TelemetryStorage {
  private bucket: any; // R2 bucket instance
  private keyPrefix = 'cookie-telemetry/';

  constructor(bucket: any) {
    this.bucket = bucket;
  }

  async saveProfile(sessionId: string, profile: LeadSpecProfile): Promise<void> {
    const key = `${this.keyPrefix}sessions/${sessionId}/profile-${Date.now()}.json`;
    const value = JSON.stringify(profile, null, 2);
    
    await this.bucket.put(key, value);
    
    // Also save latest profile for quick access
    const latestKey = `${this.keyPrefix}sessions/${sessionId}/latest.json`;
    await this.bucket.put(latestKey, value);
  }

  async getProfile(sessionId: string): Promise<LeadSpecProfile | null> {
    try {
      const key = `${this.keyPrefix}sessions/${sessionId}/latest.json`;
      const object = await this.bucket.get(key);
      
      if (!object) return null;
      
      const value = await object.text();
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async getSessionHistory(sessionId: string, limit: number = 10): Promise<LeadSpecProfile[]> {
    try {
      const prefix = `${this.keyPrefix}sessions/${sessionId}/`;
      const objects = await this.bucket.list({ prefix, limit });
      
      const profiles: LeadSpecProfile[] = [];
      for (const object of objects.objects) {
        if (object.key.includes('profile-')) {
          const obj = await this.bucket.get(object.key);
          if (obj) {
            const value = await obj.text();
            profiles.push(JSON.parse(value));
          }
        }
      }
      
      return profiles.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const prefix = `${this.keyPrefix}sessions/${sessionId}/`;
      const objects = await this.bucket.list({ prefix });
      
      for (const object of objects.objects) {
        await this.bucket.delete(object.key);
      }
    } catch {
      // Ignore deletion errors
    }
  }

  /**
   * Get aggregated telemetry for dashboard
   */
  async getAggregatedTelemetry(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalSessions: number;
    averageSecurityScore: number;
    topSecurityIssues: Array<{ issue: string; count: number }>;
    csrfCoverage: number;
    abTestingCoverage: number;
    performanceMetrics: {
      averageProcessingTime: number;
      p95ProcessingTime: number;
    };
  }> {
    try {
      const cutoffTime = this.getCutoffTime(timeRange);
      const prefix = `${this.keyPrefix}sessions/`;
      const objects = await this.bucket.list({ prefix });
      
      const profiles: LeadSpecProfile[] = [];
      for (const object of objects.objects) {
        if (object.key.includes('latest.json')) {
          const obj = await this.bucket.get(object.key);
          if (obj) {
            const value = await obj.text();
            const profile = JSON.parse(value);
            if (new Date(profile.timestamp).getTime() > cutoffTime) {
              profiles.push(profile);
            }
          }
        }
      }

      if (profiles.length === 0) {
        return {
          totalSessions: 0,
          averageSecurityScore: 0,
          topSecurityIssues: [],
          csrfCoverage: 0,
          abTestingCoverage: 0,
          performanceMetrics: {
            averageProcessingTime: 0,
            p95ProcessingTime: 0
          }
        };
      }

      const report = JuniorRunnerCookieProfiler.generateSecurityReport(profiles);
      const processingTimes = profiles.map(p => p.performance.totalTime);
      processingTimes.sort((a, b) => a - b);
      
      return {
        totalSessions: report.totalSessions,
        averageSecurityScore: report.averageSecurityScore,
        topSecurityIssues: report.topIssues,
        csrfCoverage: report.csrfCoverage,
        abTestingCoverage: report.abTestingCoverage,
        performanceMetrics: {
          averageProcessingTime: Math.round(
            processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length * 100
          ) / 100,
          p95ProcessingTime: Math.round(
            processingTimes[Math.floor(processingTimes.length * 0.95)] * 100
          ) / 100
        }
      };
    } catch (error) {
      console.error('Failed to get aggregated telemetry:', error);
      return {
        totalSessions: 0,
        averageSecurityScore: 0,
        topSecurityIssues: [],
        csrfCoverage: 0,
        abTestingCoverage: 0,
        performanceMetrics: {
          averageProcessingTime: 0,
          p95ProcessingTime: 0
        }
      };
    }
  }

  private getCutoffTime(timeRange: 'hour' | 'day' | 'week'): number {
    const now = Date.now();
    switch (timeRange) {
      case 'hour':
        return now - (60 * 60 * 1000);
      case 'day':
        return now - (24 * 60 * 60 * 1000);
      case 'week':
        return now - (7 * 24 * 60 * 60 * 1000);
      default:
        return now - (24 * 60 * 60 * 1000);
    }
  }
}

// 🚀 CLI INTEGRATION
export class JuniorRunnerCLI {
  static async handleCookieInspect(args: string[]): Promise<void> {
    if (args.includes('--help')) {
      this.showCookieInspectHelp();
      return;
    }

    console.log('🍪 JuniorRunner Cookie Inspector v3.25');
    console.log('='.repeat(50));

    // Simulate request profiling
    const testRequest = new Request('http://localhost:3000/test', {
      headers: {
        'cookie': 'session=test-session-123; Secure; HttpOnly; SameSite=Strict; user_id=user-456; ab_variant={"variant":"A","timestamp":' + Date.now() + ',"signature":"abc123"}',
        'user-agent': 'JuniorRunner/3.25'
      }
    });

    try {
      const profile = await JuniorRunnerCookieProfiler.profileWithCookies('test.md', testRequest);
      
      console.log('📊 Cookie Profile Results:');
      console.log(`Session ID: ${profile.sessionId || 'N/A'}`);
      console.log(`User ID: ${profile.userId || 'N/A'}`);
      console.log(`Cookie Count: ${profile.cookies.count}`);
      console.log(`Valid Cookies: ${profile.cookies.valid}`);
      console.log(`Security Score: ${profile.security.overallScore}/100`);
      console.log(`Processing Time: ${profile.performance.totalTime}ms`);
      
      if (profile.csrf?.tokenGenerated) {
        console.log(`CSRF Token: Generated (${profile.csrf.tokenValue?.substring(0, 8)}...)`);
      }
      
      if (profile.abTesting) {
        console.log(`A/B Variant: ${profile.abTesting.variant} (${profile.abTesting.valid ? 'Valid' : 'Invalid'})`);
      }
      
      if (profile.security.criticalIssues.length > 0) {
        console.log('\n🚨 Critical Issues:');
        profile.security.criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
      }
      
      if (profile.security.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        profile.security.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
      }

    } catch (error) {
      console.error('❌ Cookie inspection failed:', error);
    }
  }

  private static showCookieInspectHelp(): void {
    console.log(`
🍪 JuniorRunner Cookie Inspector

Usage: junior-runner --cookie-inspect [options]

Options:
  --help              Show this help message

Features:
  - Parse and validate incoming cookies
  - Generate CSRF tokens for sessions
  - Validate A/B testing variants
  - Profile cookie security posture
  - Generate R2 telemetry data
  - Performance benchmarking

Integration:
  The cookie inspector integrates with your existing middleware
  to provide real-time cookie security analysis and telemetry.

Example:
  junior-runner --cookie-inspect
  
  This will run a demo of the cookie inspection capabilities
  with sample data and performance metrics.
    `);
  }
}

// 📊 TELEMETRY DASHBOARD HELPER
export class CookieTelemetryDashboard {
  static generateDashboardHTML(telemetry: Awaited<ReturnType<R2CookieTelemetryStorage['getAggregatedTelemetry']>>): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Cookie Security Telemetry Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .metric-card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1976d2; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart-container { height: 300px; margin: 20px 0; }
        h1 { color: #1976d2; }
        h2 { color: #424242; }
        .status-good { color: #4CAF50; }
        .status-warning { color: #FF9800; }
        .status-bad { color: #f44336; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>🍪 Cookie Security Telemetry Dashboard</h1>
        
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${telemetry.totalSessions}</div>
                <div class="metric-label">Total Sessions</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${telemetry.averageSecurityScore >= 80 ? 'status-good' : telemetry.averageSecurityScore >= 60 ? 'status-warning' : 'status-bad'}">
                    ${telemetry.averageSecurityScore}/100
                </div>
                <div class="metric-label">Average Security Score</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${telemetry.csrfCoverage >= 90 ? 'status-good' : telemetry.csrfCoverage >= 70 ? 'status-warning' : 'status-bad'}">
                    ${telemetry.csrfCoverage}%
                </div>
                <div class="metric-label">CSRF Coverage</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${telemetry.abTestingCoverage >= 80 ? 'status-good' : telemetry.abTestingCoverage >= 60 ? 'status-warning' : 'status-bad'}">
                    ${telemetry.abTestingCoverage}%
                </div>
                <div class="metric-label">A/B Testing Coverage</div>
            </div>
        </div>

        <div class="metric-card">
            <h2>⚡ Performance Metrics</h2>
            <div class="metric-grid">
                <div>
                    <div class="metric-value">${telemetry.performanceMetrics.averageProcessingTime}ms</div>
                    <div class="metric-label">Average Processing Time</div>
                </div>
                <div>
                    <div class="metric-value">${telemetry.performanceMetrics.p95ProcessingTime}ms</div>
                    <div class="metric-label">95th Percentile Time</div>
                </div>
            </div>
        </div>

        ${telemetry.topSecurityIssues.length > 0 ? `
        <div class="metric-card">
            <h2>🚨 Top Security Issues</h2>
            <div class="chart-container">
                <canvas id="issuesChart"></canvas>
            </div>
        </div>
        ` : ''}
    </div>

    ${telemetry.topSecurityIssues.length > 0 ? `
    <script>
        const ctx = document.getElementById('issuesChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(telemetry.topSecurityIssues.map(i => i.issue))},
                datasets: [{
                    label: 'Occurrences',
                    data: ${JSON.stringify(telemetry.topSecurityIssues.map(i => i.count))},
                    backgroundColor: '#f44336'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    </script>
    ` : ''}
</body>
</html>`;
  }
}

// 🚀 RUN DEMO IF EXECUTED DIRECTLY
if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes('--cookie-inspect')) {
    JuniorRunnerCLI.handleCookieInspect(args);
  } else {
    console.log('Use --cookie-inspect to run cookie inspection demo');
  }
}
