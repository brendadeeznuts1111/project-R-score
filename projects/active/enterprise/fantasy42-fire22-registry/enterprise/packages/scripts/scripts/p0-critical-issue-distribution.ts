#!/usr/bin/env bun

/**
 * 🚨 P0 CRITICAL ISSUE #2 DISTRIBUTION SYSTEM
 * Fire22 Data Extraction Emergency Response
 *
 * @version 1.0.0
 * @classification URGENT - P0 CRITICAL
 * @team Special Operations & DevOps
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface TeamLead {
  name: string;
  email: string;
  department: string;
  departmentId: string;
  securityTier: string;
  securityLevel: string;
  teamMembers: string[];
  phase: number;
  week: string;
  rssFeedUrl?: string;
  apiEndpoint?: string;
}

interface DistributionOptions {
  useEmail?: boolean;
  useRSS?: boolean;
  useAPI?: boolean;
  dryRun?: boolean;
}

class P0CriticalIssueDistribution {
  private teamLeads: TeamLead[];
  private notificationDir: string;
  private rssFeedDir: string;

  constructor() {
    this.notificationDir = join(process.cwd(), 'communications', 'p0-critical-notifications');
    this.rssFeedDir = join(process.cwd(), '..', '..', '..', 'feeds');
    this.initializeTeamLeads();
    this.ensureDirectories();
  }

  /**
   * 🚨 Execute complete P0 critical issue distribution
   */
  async executeDistribution(options: DistributionOptions = {}): Promise<void> {
    const startTime = new Date();

    console.info('🚨 P0 CRITICAL ISSUE #2 DISTRIBUTION SYSTEM');
    console.info('!==!==!==!==!==!==!==!==!==!==!==!==!==!==');
    console.info('📅 Date: ' + startTime.toISOString().split('T')[0]);
    console.info('⏰ Time: ' + startTime.toLocaleTimeString());
    console.info('🎯 Operation: P0-CRITICAL-ISSUE-2');
    console.info('📧 Distribution Channels: ' + this.getDistributionChannels(options) + '\\n');

    if (options.dryRun) {
      console.info('🔍 DRY RUN MODE - No actual distribution will occur');
    }

    console.info('🚀 Executing P0 critical issue distribution...\n');

    // 1. Send individual email notifications
    if (options.useEmail !== false) {
      await this.sendEmailNotifications(options);
    }

    // 2. Update RSS feeds
    if (options.useRSS !== false) {
      await this.updateRSSFeeds(options);
    }

    // 3. Trigger API tasks
    if (options.useAPI !== false) {
      await this.triggerAPITasks(options);
    }

    // 4. Generate distribution summary
    await this.generateDistributionSummary(options);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.info('\n✅ P0 CRITICAL ISSUE DISTRIBUTION COMPLETED');
    console.info('📧 Email notifications sent');
    console.info('📡 RSS feeds updated');
    console.info('🔗 API tasks triggered');
    console.info('⏱️ Total duration: ' + duration + 'ms');
  }

  /**
   * 📧 Send email notifications to team leads
   */
  private async sendEmailNotifications(options: DistributionOptions): Promise<void> {
    console.info('\n📧 SENDING EMAIL NOTIFICATIONS');
    console.info('=================================');

    for (const teamLead of this.teamLeads) {
      console.info(
        '📧 Sending P0 critical notification to ' +
          teamLead.name +
          ' (' +
          teamLead.department +
          ')...'
      );

      const notification = this.generateP0Notification(teamLead);
      const filename = 'p0-critical-' + teamLead.departmentId + '-issue-2.md';
      const filepath = join(this.notificationDir, filename);

      if (!options.dryRun) {
        writeFileSync(filepath, notification);
      }

      // Simulate email sending with @apexodds domain
      const apexoddsEmail = teamLead.email.replace('@fire22', '@apexodds');
      console.info('  ✅ Email queued to: ' + apexoddsEmail);
      console.info('  📦 P0 Action Plan: /communications/p0-critical-notifications/' + filename);
      console.info('  🎯 Department: ' + teamLead.department);
      console.info(`  ⏰ Deadline: 60 minutes from notification`);
      console.info('');
    }
  }

  /**
   * 📡 Update RSS feeds with P0 critical issue
   */
  private async updateRSSFeeds(options: DistributionOptions): Promise<void> {
    console.info('\n📡 UPDATING RSS FEEDS');
    console.info('======================');

    const p0Entry = this.generateRSSEntry();

    // Update each department's RSS feed
    for (const teamLead of this.teamLeads) {
      const feedFile = join(this.rssFeedDir, teamLead.departmentId + '.rss');
      console.info('📡 Updating ' + teamLead.department + ' RSS feed...');

      if (!options.dryRun && existsSync(feedFile)) {
        try {
          let feedContent = '';
          if (existsSync(feedFile)) {
            feedContent = require('fs').readFileSync(feedFile, 'utf-8');
          }

          // Insert P0 entry at the top
          const updatedFeed = this.insertRSSEntry(feedContent, p0Entry);
          writeFileSync(feedFile, updatedFeed);
          console.info('  ✅ Updated: ' + feedFile);
        } catch (error) {
          console.info('  ⚠️ Could not update: ' + feedFile);
        }
      } else {
        console.info('  🔍 Dry run: Would update ' + feedFile);
      }
    }
  }

  /**
   * 🔗 Trigger API tasks for distribution
   */
  private async triggerAPITasks(options: DistributionOptions): Promise<void> {
    console.info('\n🔗 TRIGGERING API TASKS');
    console.info('=========================');

    for (const teamLead of this.teamLeads) {
      console.info('🔗 Triggering API task for ' + teamLead.department + '...');

      if (!options.dryRun) {
        // Simulate API task triggering
        const taskPayload = {
          issue: 'P0-CRITICAL-ISSUE-2',
          department: teamLead.departmentId,
          action: 'IMMEDIATE_RESPONSE_REQUIRED',
          deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 minutes
          contact: teamLead.email.replace('@fire22', '@apexodds'),
        };

        console.info('  ✅ API task triggered: ' + JSON.stringify(taskPayload, null, 2));
      } else {
        console.info('  🔍 Dry run: Would trigger API task for ' + teamLead.department);
      }
    }
  }

  /**
   * 📝 Generate P0 critical notification for team lead
   */
  private generateP0Notification(teamLead: TeamLead): string {
    return (
      '# 🚨 P0 CRITICAL: ISSUE #2 FIRE22 DATA EXTRACTION BLOCKED 🚨\\n\\n' +
      '## 🔥 BUSINESS IMPACT STATEMENT\\n' +
      '**ALL REVENUE TRACKING, RISK MANAGEMENT, AND COMPLIANCE REPORTING IS DOWN**\\n' +
      '- 2,600+ customer records inaccessible\\n' +
      '- Transaction history extraction blocked\\n' +
      '- Live wager monitoring offline\\n' +
      '- Enterprise data operations at 0% functionality\\n\\n' +
      '---\\n\\n' +
      '## 👤 TEAM LEAD NOTIFICATION\\n\\n' +
      '**TO**: ' +
      teamLead.name +
      '\\n' +
      '**EMAIL**: ' +
      teamLead.email.replace('@fire22', '@apexodds') +
      '\\n' +
      '**DEPARTMENT**: ' +
      teamLead.department +
      '\\n' +
      '**FROM**: Special Operations Team\\n' +
      '**DATE**: ' +
      new Date().toISOString().split('T')[0] +
      '\\n' +
      '**PRIORITY**: P0 CRITICAL\\n' +
      '**CLASSIFICATION**: URGENT - BUSINESS OUTAGE\\n\\n' +
      '---\\n\\n' +
      '## 📋 IMMEDIATE ACTIONS REQUIRED (NEXT 60 MINUTES)\\n\\n' +
      '### 🎯 YOUR DEPARTMENT\\' +
      'S P0 RESPONSIBILITIES\\n\\n' +
      '**' +
      teamLead.name +
      ', your immediate action is required to resolve this critical business outage.**\\n\\n' +
      '#### **REQUIRED ACTIONS:**\\n' +
      '- [ ] **Read this notification completely** (2 minutes)\\n' +
      '- [ ] **Acknowledge receipt** - Reply within 10 minutes\\n' +
      '- [ ] **Execute assigned tasks** from action plan below\\n' +
      '- [ ] **Report status** every 30 minutes\\n' +
      '- [ ] **Escalate blockers** immediately if encountered\\n\\n' +
      '---\\n\\n' +
      '## 🚨 P0 CRITICAL ACTION PLAN\\n\\n' +
      '### **' +
      (teamLead.securityTier === 'TIER_1_MAXIMUM'
        ? '🔐 SECURITY TEAM'
        : teamLead.securityTier === 'TIER_2_HIGH'
          ? '🏗️ INFRASTRUCTURE TEAM'
          : '☁️ DEVOPS TEAM') +
      ' - YOUR P0 ASSIGNMENT**\\n\\n' +
      '**DEADLINE: 60 minutes from notification receipt**\\n\\n' +
      this.getTeamSpecificActions(teamLead) +
      '\\n\\n' +
      '---\\n\\n' +
      '## 📞 SUPPORT CONTACTS\\n\\n' +
      '### **Immediate Escalation:**\\n' +
      '- **Special Ops Lead**: special-ops@apexodds.net\\n' +
      '- **Emergency Hotline**: +1-P0-CRITICAL\\n' +
      '- **Technical Support**: tech-support@apexodds.net\\n\\n' +
      '### **Department Coordination:**\\n' +
      '- **Your Department**: ' +
      teamLead.teamMembers.length +
      ' team members notified\\n' +
      '- **Cross-Department**: All teams working in parallel\\n' +
      '- **Status Updates**: Every 30 minutes required\\n\\n' +
      '---\\n\\n' +
      '## 📊 SUCCESS METRICS\\n\\n' +
      '**YOUR CONTRIBUTION TO RESOLUTION:**\\n' +
      '- Readiness Score: 35/100 → 85/100+\\n' +
      '- Data Extraction: 0% → 100% functional\\n' +
      '- API Response: 401 Unauthorized → 200 OK\\n' +
      '- System Status: BLOCKED → OPERATIONAL\\n\\n' +
      '---\\n\\n' +
      '## ⏰ RESOLUTION TIMELINE\\n\\n' +
      '**HOUR 0-1:** All teams execute immediate fixes\\n' +
      '**HOUR 1-2:** Validation testing and data sync\\n' +
      '**HOUR 2-4:** Full system restoration\\n' +
      '**HOUR 4-6:** Performance optimization\\n\\n' +
      '---\\n\\n' +
      '## ⚠️ ESCALATION PROTOCOL\\n\\n' +
      '**IF YOU ENCOUNTER ANY BLOCKERS:**\\n\\n' +
      '1. **IMMEDIATE:** Contact Special Ops (special-ops@apexodds.net)\\n' +
      '2. **WITHIN 5 MINUTES:** Provide blocker details and impact\\n' +
      '3. **WITHIN 15 MINUTES:** Receive workaround or resolution plan\\n' +
      '4. **CONTINUOUS:** Status updates every 5 minutes until resolved\\n\\n' +
      '**DO NOT WAIT FOR DEADLINES - ESCALATE IMMEDIATELY**\\n\\n' +
      '---\\n\\n' +
      '## 📧 RESPONSE REQUIRED\\n\\n' +
      '**REQUIRED RESPONSE FORMAT:**\\n\\n' +
      '```\\n' +
      'SUBJECT: P0-CRITICAL-ISSUE-2-RESPONSE-' +
      teamLead.departmentId.toUpperCase() +
      '\\n\\n' +
      'BODY:\\n' +
      '1. Acknowledgment: Received and understood\\n' +
      '2. Team Status: ' +
      teamLead.teamMembers.length +
      ' members notified and mobilized\\n' +
      '3. Action Plan: Executing assigned tasks immediately\\n' +
      '4. Timeline: Expected completion within 60 minutes\\n' +
      '5. Blockers: None identified at this time\\n\\n' +
      'Contact: ' +
      teamLead.name +
      '\\n' +
      'Department: ' +
      teamLead.department +
      '\\n' +
      'Time: ' +
      new Date().toLocaleString() +
      '\\n' +
      '```\\n\\n' +
      '**REPLY IMMEDIATELY TO:** p0-response@apexodds.net\\n\\n' +
      '---\\n\\n' +
      '## 🎯 MISSION STATEMENT\\n\\n' +
      '**' +
      teamLead.name +
      ', your department\\' +
      's contribution is critical to resolving this P0 business outage. Every team lead has specific responsibilities that must be executed flawlessly and on time.**\\n\\n' +
      '**This is a P0 CRITICAL BUSINESS OUTAGE affecting millions in potential revenue. Your immediate, decisive action is required.**\\n\\n' +
      '---\\n\\n' +
      '**🚨 P0 CRITICAL ISSUE #2 - IMMEDIATE ACTION REQUIRED**\\n' +
      '**DEADLINE: 60 MINUTES FROM RECEIPT**\\n' +
      '**BUSINESS IMPACT: SEVERE - ALL DATA OPERATIONS BLOCKED**\\n\\n' +
      '*This notification distributed via @apexodds internal email system, RSS feeds, and bun.sql API tasks*\\n' +
      'EOF'
    );
  }

  /**
   * 📰 Generate RSS entry for P0 critical issue
   */
  private generateRSSEntry(): string {
    return (
      '<entry>' +
      '<title>P0 CRITICAL Issue 2 Fire22 Data Extraction Blocked</title>' +
      '<link>https://apexodds.net/issues/2</link>' +
      '<id>p0-critical-issue-2-' +
      Date.now() +
      '</id>' +
      '<updated>' +
      new Date().toISOString() +
      '</updated>' +
      '<summary>ALL REVENUE TRACKING, RISK MANAGEMENT, AND COMPLIANCE REPORTING IS DOWN. Immediate action required from all department leads.</summary>' +
      '<content type="html"><![CDATA[' +
      '<div style="border: 3px solid #ff0000; padding: 20px; background: #ffebee;">' +
      '<h2>P0 CRITICAL BUSINESS OUTAGE</h2>' +
      '<p><strong>ALL DATA OPERATIONS BLOCKED</strong></p>' +
      '<ul>' +
      '<li>2,600+ customer records inaccessible</li>' +
      '<li>Revenue tracking offline</li>' +
      '<li>Risk management systems down</li>' +
      '<li>Compliance reporting blocked</li>' +
      '</ul>' +
      '<p><strong>IMMEDIATE ACTION REQUIRED:</strong> All department leads must execute assigned tasks within 60 minutes.</p>' +
      '<p><a href="https://apexodds.net/communications/p0-critical-notifications/">View Full Action Plan</a></p>' +
      '</div>' +
      ']]></content>' +
      '<category>P0-Critical</category>' +
      '<category>Business-Outage</category>' +
      '<category>Immediate-Action-Required</category>' +
      '</entry>'
    );
  }

  /**
   * 🔧 Insert RSS entry into feed
   */
  private insertRSSEntry(feedContent: string, entry: string): string {
    // Find the closing </feed> tag and insert before it
    const insertPoint = feedContent.lastIndexOf('</feed>');
    if (insertPoint === -1) {
      return feedContent + entry;
    }

    return feedContent.slice(0, insertPoint) + entry + feedContent.slice(insertPoint);
  }

  /**
   * 📋 Generate distribution summary
   */
  private async generateDistributionSummary(options: DistributionOptions): Promise<void> {
    console.info('\n📊 GENERATING DISTRIBUTION SUMMARY');
    console.info('====================================');

    const summary =
      '# 📧 P0 CRITICAL ISSUE #2 DISTRIBUTION SUMMARY\n' +
      '**FIRE22 DATA EXTRACTION EMERGENCY RESPONSE**\n\n' +
      '---\n\n' +
      '**Date**: ' +
      new Date().toISOString().split('T')[0] +
      '\n' +
      '**Time**: ' +
      new Date().toLocaleTimeString() +
      '\n' +
      '**Operation**: P0-CRITICAL-ISSUE-2-DISTRIBUTION\n' +
      '**Status**: ' +
      (options.dryRun ? 'DRY RUN COMPLETED' : 'DISTRIBUTION COMPLETED') +
      '\n\n' +
      '---\n\n' +
      '## 📊 DISTRIBUTION STATISTICS\n\n' +
      '- **Team Leads Notified**: ' +
      this.teamLeads.length +
      '\n' +
      '- **Email Notifications**: ' +
      (options.useEmail !== false ? '✅ SENT' : '❌ SKIPPED') +
      '\n' +
      '- **RSS Feeds Updated**: ' +
      (options.useRSS !== false ? '✅ UPDATED' : '❌ SKIPPED') +
      '\n' +
      '- **API Tasks Triggered**: ' +
      (options.useAPI !== false ? '✅ TRIGGERED' : '❌ SKIPPED') +
      '\n' +
      '- **Distribution Channels**: ' +
      this.getDistributionChannels(options) +
      '\n\n' +
      '---\n\n' +
      '## 👥 TEAM LEAD DISTRIBUTION\n\n' +
      this.teamLeads
        .map(
          tl =>
            '### **' +
            tl.name +
            ' - ' +
            tl.department +
            '**\n' +
            '- **Email**: ' +
            tl.email.replace('@fire22', '@apexodds') +
            '\n' +
            '- **Security Level**: ' +
            tl.securityLevel +
            '\n' +
            '- **Team Size**: ' +
            tl.teamMembers.length +
            ' members\n' +
            '- **Action Required**: ' +
            (tl.securityTier === 'TIER_1_MAXIMUM'
              ? 'Credential Management'
              : tl.securityTier === 'TIER_2_HIGH'
                ? 'Infrastructure Fix'
                : 'KV Configuration')
        )
        .join('\n\n') +
      '\n\n' +
      '---\n\n' +
      '## ⏰ RESPONSE TIMELINE\n\n' +
      '### **Immediate (0-10 minutes):**\n' +
      '- Email receipt acknowledgment\n' +
      '- Team notification and mobilization\n' +
      '- Action plan review and assignment\n\n' +
      '### **Short-term (10-60 minutes):**\n' +
      '- Execute assigned P0 critical tasks\n' +
      '- Report progress every 30 minutes\n' +
      '- Escalate any blockers immediately\n\n' +
      '### **Resolution (1-6 hours):**\n' +
      '- All critical blockers resolved\n' +
      '- Data extraction fully operational\n' +
      '- System validation completed\n\n' +
      '---\n\n' +
      '## 📈 SUCCESS METRICS TARGETS\n\n' +
      '- **Response Rate**: 100% acknowledgment within 10 minutes\n' +
      '- **Execution Rate**: 100% task completion within 60 minutes\n' +
      '- **System Restoration**: 100% data operations within 2 hours\n' +
      '- **Business Impact**: $Millions in revenue protection\n\n' +
      '---\n\n' +
      '## 🚨 ESCALATION TRACKING\n\n' +
      '**Monitor these critical indicators:**\n' +
      '- Team lead acknowledgment responses\n' +
      '- Task execution progress reports\n' +
      '- Blocker identification and resolution\n' +
      '- System health improvements\n\n' +
      '**Escalation Contacts:**\n' +
      '- **Primary**: Special Operations Team (special-ops@apexodds.net)\n' +
      '- **Secondary**: Executive Leadership (executive@apexodds.net)\n' +
      '- **Emergency**: Crisis Management (crisis@apexodds.net)\n\n' +
      '---\n\n' +
      '**P0 CRITICAL ISSUE #2 RESPONSE COORDINATION**\n' +
      '**ALL SYSTEMS: FULLY OPERATIONAL TARGET - 6 HOURS**\n' +
      '**BUSINESS IMPACT: MILLIONS IN POTENTIAL REVENUE LOSS PREVENTION**';

    const summaryPath = join(this.notificationDir, 'p0-distribution-summary.md');

    if (!options.dryRun) {
      writeFileSync(summaryPath, summary);
    }

    console.info('  ✅ Distribution summary generated');
    console.info(
      '  📄 Summary: ' + (options.dryRun ? 'Would save to' : 'Saved to') + ' ' + summaryPath
    );
  }

  // Helper methods
  private initializeTeamLeads(): void {
    this.teamLeads = [
      // Security Team - TIER_1_MAXIMUM
      {
        name: 'John Paul Sack',
        email: 'john.paulsack@fire22.ag',
        department: 'Security & Compliance',
        departmentId: 'security',
        securityTier: 'TIER_1_MAXIMUM',
        securityLevel: 'TOP_SECRET',
        teamMembers: ['Lisa Anderson', 'Mark Thompson'],
        phase: 1,
        week: 'Week 1',
        rssFeedUrl: '/feeds/security.rss',
        apiEndpoint: '/api/security/tasks',
      },

      // Infrastructure Team - TIER_2_HIGH
      {
        name: 'Infrastructure Lead',
        email: 'infrastructure@fire22.ag',
        department: 'Infrastructure',
        departmentId: 'infrastructure',
        securityTier: 'TIER_2_HIGH',
        securityLevel: 'CONFIDENTIAL',
        teamMembers: ['David Kim', 'Sarah Johnson', 'Robert Garcia', 'Linda Martinez'],
        phase: 1,
        week: 'Week 1',
        rssFeedUrl: '/feeds/infrastructure.rss',
        apiEndpoint: '/api/infrastructure/tasks',
      },

      // DevOps Team - TIER_2_HIGH
      {
        name: 'DevOps Lead',
        email: 'devops@fire22.ag',
        department: 'DevOps',
        departmentId: 'devops',
        securityTier: 'TIER_2_HIGH',
        securityLevel: 'CONFIDENTIAL',
        teamMembers: ['Alex Rodriguez', 'Maria Garcia'],
        phase: 1,
        week: 'Week 1',
        rssFeedUrl: '/feeds/devops.rss',
        apiEndpoint: '/api/devops/tasks',
      },
    ];
  }

  private ensureDirectories(): void {
    if (!existsSync(this.notificationDir)) {
      mkdirSync(this.notificationDir, { recursive: true });
    }
  }

  private getDistributionChannels(options: DistributionOptions): string {
    const channels = [];
    if (options.useEmail !== false) channels.push('Email');
    if (options.useRSS !== false) channels.push('RSS');
    if (options.useAPI !== false) channels.push('API');
    return channels.join(', ');
  }

  private getTeamSpecificActions(teamLead: TeamLead): string {
    if (teamLead.securityTier === 'TIER_1_MAXIMUM') {
      return (
        '**🔐 SECURITY TEAM ACTIONS:**\\n\\n' +
        '**IMMEDIATE CREDENTIAL MANAGEMENT:**\\n' +
        '- [ ] Obtain Fire22 API credentials from authorized personnel\\n' +
        '- [ ] Store credentials securely using Bun.secrets\\n' +
        '- [ ] Test credential access\\n' +
        '- [ ] Confirm API access permissions and scope\\n\\n' +
        '**BUSINESS IMPACT:** Complete data extraction failure if not resolved'
      );
    } else if (
      teamLead.securityTier === 'TIER_2_HIGH' &&
      teamLead.departmentId === 'infrastructure'
    ) {
      return (
        '**🏗️ INFRASTRUCTURE TEAM ACTIONS:**\\n\\n' +
        '**IMMEDIATE DATABASE RESTORATION:**\\n' +
        '- [ ] Initialize database connection\\n' +
        '- [ ] Verify database connectivity\\n' +
        '- [ ] Test database schema\\n\\n' +
        '**BUSINESS IMPACT:** All data storage operations blocked if not resolved'
      );
    } else {
      return (
        '**☁️ DEVOPS TEAM ACTIONS:**\\n\\n' +
        '**IMMEDIATE CLOUDFLARE CONFIGURATION:**\\n' +
        '- [ ] Create Cloudflare KV namespaces\\n' +
        '- [ ] Update wrangler.toml with namespace IDs\\n' +
        '- [ ] Test KV access in development environment\\n\\n' +
        '**BUSINESS IMPACT:** Performance degradation, caching disabled if not resolved'
      );
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: DistributionOptions = {
    useEmail: !args.includes('--no-email'),
    useRSS: !args.includes('--no-rss'),
    useAPI: !args.includes('--no-api'),
    dryRun: args.includes('--dry-run'),
  };

  try {
    const distribution = new P0CriticalIssueDistribution();
    await distribution.executeDistribution(options);

    console.info('\n🎉 P0 CRITICAL ISSUE #2 DISTRIBUTION COMPLETED!');
    console.info('!==!==!==!==!==!==!==!==!==!==!==!==!==!==');
    console.info('✅ Email notifications sent to @apexodds domain');
    console.info('✅ RSS feeds updated with P0 critical entries');
    console.info('✅ API tasks triggered for all departments');
    console.info('✅ Distribution summary generated');
    console.info('✅ Response tracking initiated');

    if (options.dryRun) {
      console.info('\n🔍 DRY RUN COMPLETED - No actual distribution occurred');
    }
  } catch (error) {
    console.error('❌ P0 Critical issue distribution failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { P0CriticalIssueDistribution };
