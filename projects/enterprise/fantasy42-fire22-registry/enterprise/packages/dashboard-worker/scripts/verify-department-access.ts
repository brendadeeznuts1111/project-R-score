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
    console.log('🔍 Verifying changelog and RSS accessibility for department heads...\n');

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

        console.log(`✅ Changelog is accessible at: ${this.changelogPath}`);

        if (changelog.hasMikeHunt) {
          console.log('✅ Mike Hunt assignment documented in changelog');
        } else {
          console.log('⚠️  Mike Hunt assignment not found in changelog - consider updating');
        }
      } catch (error) {
        console.log(`❌ Error reading changelog: ${error}`);
      }
    } else {
      console.log(`❌ Changelog not found at: ${this.changelogPath}`);
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
        console.log('✅ RSS feed has valid JSON format');

        rss.hasMikeHunt =
          content.includes('Mike Hunt') && content.includes('Technology Department Head');

        console.log(`✅ RSS feed is accessible at: ${this.rssPath}`);

        if (rss.hasMikeHunt) {
          console.log('✅ Mike Hunt assignment included in RSS feed');
        } else {
          console.log('⚠️  Mike Hunt assignment not found in RSS feed - consider updating');
        }
      } catch (error) {
        console.log(`❌ RSS feed has invalid JSON format or read error: ${error}`);
      }
    } else {
      console.log(`❌ RSS feed not found at: ${this.rssPath}`);
    }

    return rss;
  }

  private async verifySSE() {
    const sse = {
      accessible: false,
      url: this.sseUrl,
    };

    console.log('\n🌐 Testing SSE endpoint /api/departments/stream...');

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
        console.log('✅ SSE endpoint is accessible');
      } else {
        console.log(`⚠️  SSE endpoint returned status: ${response.status}`);
      }
    } catch (error) {
      console.log(
        '⚠️  Could not connect to SSE endpoint (might be expected if server not running)'
      );
    }

    return sse;
  }

  private printReport(report: AccessibilityReport) {
    console.log('\n📊 ACCESSIBILITY SUMMARY:');
    console.log('!==!==!==!=====');
    console.log(`Changelog: ${report.changelog.exists ? '✅ Accessible' : '❌ Missing'}`);
    console.log(`RSS Feed: ${report.rssFeed.exists ? '✅ Accessible' : '❌ Missing'}`);
    console.log(
      `Mike Hunt in Changelog: ${report.changelog.hasMikeHunt ? '✅ Found' : '❌ Missing'}`
    );
    console.log(`Mike Hunt in RSS: ${report.rssFeed.hasMikeHunt ? '✅ Found' : '❌ Missing'}`);
    console.log(
      `SSE Endpoint: ${report.sseEndpoint.accessible ? '✅ Accessible' : '❌ Not accessible'}`
    );
  }

  private generateRecommendations(report: AccessibilityReport) {
    console.log('\n📋 RECOMMENDED ACTIONS:');
    console.log('!==!==!==!====');

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
      console.log('🎉 All systems are properly configured!');
    } else {
      actions.forEach(action => console.log(action));
    }

    console.log('\n6. Notify department heads about the updates via:');
    console.log('   - Email with links to changelog and RSS feed');
    console.log('   - Slack/Teams message with update highlights');
    console.log('   - Direct message to Technology Department Head (Mike Hunt)');

    console.log('\nTo manually test the SSE endpoint, run:');
    console.log(`  curl -N ${this.sseUrl}`);

    console.log('\n🚀 Verification completed!');
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

    console.log('\n📧 NOTIFICATION TEMPLATE:');
    console.log('!==!==!==!=====');
    console.log('Email:');
    console.log(`To: ${template.email.to}`);
    console.log(`Cc: ${template.email.cc}`);
    console.log(`Subject: ${template.email.subject}`);
    console.log(`\n${template.email.body}`);

    console.log('\nSlack/Teams:');
    console.log(`Channel: ${template.slack.channel}`);
    console.log(`Message: ${template.slack.message}`);

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
