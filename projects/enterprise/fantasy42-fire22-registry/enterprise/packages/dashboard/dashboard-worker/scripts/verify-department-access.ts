#!/usr/bin/env bun

/**
 * Changelog and RSS Accessibility Verification Script
 * Ensures department heads can access changelog and RSS feed with proper notifications
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AccessibilityReport {
  changelog: {
    exists: boolean;
    readable: boolean;
    hasMikeHunt: boolean;
    path: string;
  };
  rssFeed: {
    exists: boolean;
    readable: boolean;
    validJson: boolean;
    hasMikeHunt: boolean;
    path: string;
  };
  sseEndpoint: {
    accessible: boolean;
    url: string;
  };
}

class DepartmentAccessVerifier {
  private changelogPath = 'CHANGELOG.md';
  private rssPath = 'src/notifications/department-updates.json';
  private sseUrl = 'http://localhost:3000/api/departments/stream';

  async verify(): Promise<AccessibilityReport> {
    console.info('🔍 Verifying changelog and RSS accessibility for department heads...\n');

    const report: AccessibilityReport = {
      changelog: await this.verifyChangelog(),
      rssFeed: await this.verifyRssFeed(),
      sseEndpoint: await this.verifySSE(),
    };

    this.printReport(report);
    this.generateRecommendations(report);

    return report;
  }

  private async verifyChangelog() {
    const changelog = {
      exists: existsSync(this.changelogPath),
      readable: false,
      hasMikeHunt: false,
      path: this.changelogPath,
    };

    if (changelog.exists) {
      try {
        const content = readFileSync(this.changelogPath, 'utf8');
        changelog.readable = true;
        changelog.hasMikeHunt =
          content.includes('Mike Hunt') && content.includes('Technology Department Head');

        console.info(`✅ Changelog is accessible at: ${this.changelogPath}`);

        if (changelog.hasMikeHunt) {
          console.info('✅ Mike Hunt assignment documented in changelog');
        } else {
          console.info('⚠️  Mike Hunt assignment not found in changelog - consider updating');
        }
      } catch (error) {
        console.info(`❌ Error reading changelog: ${error}`);
      }
    } else {
      console.info(`❌ Changelog not found at: ${this.changelogPath}`);
    }

    return changelog;
  }

  private async verifyRssFeed() {
    const rss = {
      exists: existsSync(this.rssPath),
      readable: false,
      validJson: false,
      hasMikeHunt: false,
      path: this.rssPath,
    };

    if (rss.exists) {
      try {
        const content = readFileSync(this.rssPath, 'utf8');
        rss.readable = true;

        // Validate JSON format
        const jsonData = JSON.parse(content);
        rss.validJson = true;
        console.info('✅ RSS feed has valid JSON format');

        rss.hasMikeHunt =
          content.includes('Mike Hunt') && content.includes('Technology Department Head');

        console.info(`✅ RSS feed is accessible at: ${this.rssPath}`);

        if (rss.hasMikeHunt) {
          console.info('✅ Mike Hunt assignment included in RSS feed');
        } else {
          console.info('⚠️  Mike Hunt assignment not found in RSS feed - consider updating');
        }
      } catch (error) {
        console.info(`❌ RSS feed has invalid JSON format or read error: ${error}`);
      }
    } else {
      console.info(`❌ RSS feed not found at: ${this.rssPath}`);
    }

    return rss;
  }

  private async verifySSE() {
    const sse = {
      accessible: false,
      url: this.sseUrl,
    };

    console.info('\n🌐 Testing SSE endpoint /api/departments/stream...');

    try {
      // Test SSE endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.sseUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      sse.accessible = response.ok;

      if (sse.accessible) {
        console.info('✅ SSE endpoint is accessible');
      } else {
        console.info(`⚠️  SSE endpoint returned status: ${response.status}`);
      }
    } catch (error) {
      console.info(
        '⚠️  Could not connect to SSE endpoint (might be expected if server not running)'
      );
    }

    return sse;
  }

  private printReport(report: AccessibilityReport) {
    console.info('\n📊 ACCESSIBILITY SUMMARY:');
    console.info('!==!==!==!=====');
    console.info(`Changelog: ${report.changelog.exists ? '✅ Accessible' : '❌ Missing'}`);
    console.info(`RSS Feed: ${report.rssFeed.exists ? '✅ Accessible' : '❌ Missing'}`);
    console.info(
      `Mike Hunt in Changelog: ${report.changelog.hasMikeHunt ? '✅ Found' : '❌ Missing'}`
    );
    console.info(`Mike Hunt in RSS: ${report.rssFeed.hasMikeHunt ? '✅ Found' : '❌ Missing'}`);
    console.info(
      `SSE Endpoint: ${report.sseEndpoint.accessible ? '✅ Accessible' : '❌ Not accessible'}`
    );
  }

  private generateRecommendations(report: AccessibilityReport) {
    console.info('\n📋 RECOMMENDED ACTIONS:');
    console.info('!==!==!==!====');

    const actions = [];

    if (!report.changelog.exists) {
      actions.push(`1. Create changelog at ${report.changelog.path}`);
    }

    if (!report.rssFeed.exists) {
      actions.push(`2. Create RSS feed at ${report.rssFeed.path}`);
    }

    if (!report.changelog.hasMikeHunt) {
      actions.push('3. Add Mike Hunt assignment to changelog');
    }

    if (!report.rssFeed.hasMikeHunt) {
      actions.push('4. Add Mike Hunt assignment to RSS feed');
    }

    if (!report.sseEndpoint.accessible) {
      actions.push('5. Ensure SSE endpoint is running and accessible');
    }

    if (actions.length === 0) {
      console.info('🎉 All systems are properly configured!');
    } else {
      actions.forEach(action => console.info(action));
    }

    console.info('\n6. Notify department heads about the updates via:');
    console.info('   - Email with links to changelog and RSS feed');
    console.info('   - Slack/Teams message with update highlights');
    console.info('   - Direct message to Technology Department Head (Mike Hunt)');

    console.info('\nTo manually test the SSE endpoint, run:');
    console.info(`  curl -N ${this.sseUrl}`);

    console.info('\n🚀 Verification completed!');
  }

  async generateNotificationTemplate() {
    const template = {
      email: {
        subject: 'Important Department Updates - Technology Leadership Assignment',
        to: 'department-heads@company.com',
        cc: 'mike.hunt@company.com',
        body: `Hello Department Heads,

This is to inform you that Mike Hunt has been assigned as the Technology Department Head.

The critical path status has improved from BLOCKED to ON_TRACK with this assignment.

Please review:
- Changelog: https://github.com/your-org/your-repo/blob/main/CHANGELOG.md
- Real-time updates: ${this.sseUrl}

The RSS feed includes:
- Complete assignment details
- Critical path status tracking
- Department status metrics
- Implementation timeline

Please ensure your teams are aware of these updates.

Best regards,
Platform Team`,
      },
      slack: {
        channel: '#department-heads',
        message: `🚀 *Department Update*: Mike Hunt has been assigned as Technology Department Head. Critical path status: BLOCKED → ON_TRACK. Check changelog and RSS feed for details.`,
      },
    };

    console.info('\n📧 NOTIFICATION TEMPLATE:');
    console.info('!==!==!==!=====');
    console.info('Email:');
    console.info(`To: ${template.email.to}`);
    console.info(`Cc: ${template.email.cc}`);
    console.info(`Subject: ${template.email.subject}`);
    console.info(`\n${template.email.body}`);

    console.info('\nSlack/Teams:');
    console.info(`Channel: ${template.slack.channel}`);
    console.info(`Message: ${template.slack.message}`);

    return template;
  }
}

// Main execution
async function main() {
  const verifier = new DepartmentAccessVerifier();

  try {
    await verifier.verify();
    await verifier.generateNotificationTemplate();
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
