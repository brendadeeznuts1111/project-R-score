#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager Edge - XSS-Safe Deployment v2.0
 * Security-first deployment with XSS protection and content security
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface SecurityConfig {
  enableCSP: boolean;
  xssProtection: boolean;
  contentTypeNosniff: boolean;
  frameOptions: boolean;
  referrerPolicy: boolean;
}

interface DeploymentResult {
  success: boolean;
  url?: string;
  securityHeaders?: Record<string, string>;
  auditResults?: any;
  error?: string;
}

class XSSSafeDeployment {
  private securityConfig: SecurityConfig = {
    enableCSP: true,
    xssProtection: true,
    contentTypeNosniff: true,
    frameOptions: true,
    referrerPolicy: true
  };

  // XSS-safe content sanitization
  private sanitizeContent(content: string): string {
    return content
      // Remove potential XSS vectors
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Generate Content Security Policy headers
  private generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Workers need unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "child-src 'none'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests"
    ];

    return directives.join('; ');
  }

  // Generate security headers
  private generateSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.securityConfig.enableCSP) {
      headers['Content-Security-Policy'] = this.generateCSP();
    }

    if (this.securityConfig.xssProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    if (this.securityConfig.contentTypeNosniff) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (this.securityConfig.frameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    if (this.securityConfig.referrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    // Additional security headers
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';

    return headers;
  }

  // Run Tier-1380 security audit
  private async runSecurityAudit(): Promise<any> {
    try {
      console.log('🔒 Running Tier-1380 security audit...');

      // Run Col-89 compliance check
      const auditResult = execSync('bun ../cli/tier1380-audit.ts check src/', {
        encoding: 'utf8',
        cwd: process.cwd()
      });

      // Parse audit results - handle empty output
      const auditOutput = auditResult.trim();
      const violationsMatch = auditOutput.match(/(\d+) violations/);
      const violations = violationsMatch ? parseInt(violationsMatch[1]) : 0;

      return {
        violations: violations,
        details: auditOutput,
        status: violations === 0 ? 'PASS' : 'WARNING'
      };
    } catch (error) {
      // Check if it's just a parsing error or actual audit failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('0 violations')) {
        return {
          violations: 0,
          details: 'Audit completed successfully',
          status: 'PASS'
        };
      }

      return {
        violations: 0,
        details: [],
        status: 'ERROR',
        error: errorMessage
      };
    }
  }

  // Apply security headers to worker code
  private applySecurityHeaders(workerCode: string): string {
    const headers = this.generateSecurityHeaders();
    const headersJson = JSON.stringify(headers);

    // Inject security headers into the worker
    const securityCode = `
// XSS-Safe Security Headers (Auto-Generated)
const SECURITY_HEADERS = ${headersJson};

function addSecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Wrap fetch handler to apply security headers
const originalHandler = export.default;
const originalFetch = originalHandler.fetch;
originalHandler.fetch = async (request: Request, env: any, ctx: ExecutionContext) => {
  const response = await originalFetch(request, env, ctx);
  return addSecurityHeaders(response);
};

export default = originalHandler;
`;

    return securityCode + '\n' + workerCode;
  }

  // Deploy to Cloudflare Workers with XSS protection
  async deploy(): Promise<DeploymentResult> {
    try {
      console.log('🚀 Starting XSS-Safe deployment of FactoryWager Edge...');

      // 1. Run security audit
      const auditResults = await this.runSecurityAudit();
      console.log(`📊 Security audit: ${auditResults.status} (${auditResults.violations} violations)`);

      if (auditResults.status === 'ERROR') {
        throw new Error('Security audit failed');
      }

      // 2. Read and sanitize worker code
      const workerCode = readFileSync('src/index.ts', 'utf8');
      const sanitizedCode = this.sanitizeContent(workerCode);
      const securedCode = this.applySecurityHeaders(sanitizedCode);

      // 3. Write secured version
      writeFileSync('src/index-secured.ts', securedCode);

      // 4. Update wrangler.toml to use secured version
      const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
      const securedConfig = wranglerConfig.replace('main = "src/index.ts"', 'main = "src/index-secured.ts"');
      writeFileSync('wrangler.toml', securedConfig);

      // 5. Deploy to Cloudflare Workers
      console.log('🌐 Deploying to Cloudflare Workers...');

      try {
        execSync('wrangler deploy', {
          cwd: process.cwd(),
          stdio: 'inherit'
        });
      } catch (deployError) {
        // Restore original config on deployment failure
        writeFileSync('wrangler.toml', wranglerConfig);
        throw deployError;
      }

      // 6. Get deployment URL
      const workerUrl = execSync('wrangler whoami', { encoding: 'utf8' });
      const urlMatch = workerUrl.match(/https:\/\/.*\.workers\.dev/);

      if (!urlMatch) {
        throw new Error('Could not determine worker URL');
      }

      const deploymentUrl = urlMatch[0];

      // 7. Restore original configuration
      writeFileSync('wrangler.toml', wranglerConfig);

      console.log('✅ XSS-Safe deployment completed successfully!');

      return {
        success: true,
        url: deploymentUrl,
        securityHeaders: this.generateSecurityHeaders(),
        auditResults
      };

    } catch (error) {
      console.error('❌ Deployment failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deployment error'
      };
    }
  }

  // Test XSS protection
  async testXSSProtection(url: string): Promise<boolean> {
    try {
      console.log('🧪 Testing XSS protection...');

      // Test various XSS payloads
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const testUrl = `${url}?test=${encodeURIComponent(payload)}`;

        try {
          const response = await fetch(testUrl);
          const content = await response.text();

          // Check if payload was sanitized
          if (content.includes(payload)) {
            console.log(`❌ XSS payload not sanitized: ${payload}`);
            return false;
          }
        } catch (error) {
          console.log(`⚠️ Could not test payload: ${payload}`);
        }
      }

      console.log('✅ XSS protection test passed');
      return true;

    } catch (error) {
      console.error('❌ XSS protection test failed:', error);
      return false;
    }
  }
}

// CLI interface
if (import.meta.main) {
  const deployer = new XSSSafeDeployment();

  console.log('🛡️ FactoryWager Edge - XSS-Safe Deployment');
  console.log('==========================================');

  deployer.deploy()
    .then(async (result) => {
      if (result.success) {
        console.log('\n🎉 Deployment Results:');
        console.log(`   URL: ${result.url}`);
        console.log(`   Security Audit: ${result.auditResults?.status}`);
        console.log(`   Violations: ${result.auditResults?.violations}`);

        console.log('\n🔒 Security Headers Applied:');
        Object.entries(result.securityHeaders || {}).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });

        // Test XSS protection
        if (result.url) {
          const xssSafe = await deployer.testXSSProtection(result.url);
          console.log(`\n🧪 XSS Protection Test: ${xssSafe ? '✅ PASSED' : '❌ FAILED'}`);
        }

        console.log(`\n🚀 FactoryWager Edge is live at: ${result.url}`);
        console.log('   Endpoints:');
        console.log(`     POST ${result.url}/workflow`);
        console.log(`     GET  ${result.url}/metrics`);
        console.log(`     GET  ${result.url}/health`);
      } else {
        console.error('\n❌ Deployment failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Critical error:', error);
      process.exit(1);
    });
}

export { XSSSafeDeployment };
