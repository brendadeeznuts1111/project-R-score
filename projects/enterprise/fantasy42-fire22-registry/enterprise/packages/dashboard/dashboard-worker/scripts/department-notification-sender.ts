#!/usr/bin/env bun

/**
 * Department Notification Sender
 * Sends package assignment notifications to department heads with timezone-aware timestamps
 *
 * Timezone Behavior:
 * - Development: Uses system's local timezone
 * - Testing: Uses UTC (bun test automatically sets TZ=UTC)
 * - Production: Can be overridden with process.env.TZ
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface EmailTemplate {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

interface CriticalIssueNotification {
  issueNumber: number;
  title: string;
  labels: string[];
  department: string;
  emails: string[];
  timestamp: string;
  txTimestamp: string;
  priority: string;
  urgency: 'P0-critical' | 'P1-high' | 'P2-medium' | 'P3-low';
}

interface TaskNotification {
  taskId: string;
  taskUuid: string;
  title: string;
  department: string;
  assignee: string;
  assigneeEmail: string;
  priority: 'high' | 'medium' | 'low';
  status: 'in-progress' | 'active' | 'planning' | 'completed' | 'overdue';
  dueDate?: string;
  timestamp: string;
  txTimestamp: string;
  notificationType: 'assignment' | 'deadline_reminder' | 'status_change' | 'overdue_alert';
  actionRequired: string;
}

class DepartmentNotificationSender {
  private templatesPath = 'src/notifications/department-email-templates.json';
  private notificationsPath = 'src/notifications/department-notifications.json';
  private taskNotificationsPath = 'src/notifications/task-notifications.json';

  // Department email addresses for critical issue notifications
  private readonly departmentEmails: Record<string, string[]> = {
    'security-team': [
      'security@fire22.ag',
      'auth-team@fire22.ag',
      'head@security.fire22',
      'john.paulsack@fire22.ag', // Head of Policy
    ],
    'infrastructure-team': [
      'infrastructure@fire22.ag',
      'platform-team@fire22.ag',
      'head@technology.fire22',
      'mike.hunt@technology.fire22',
    ],
    'cloudflare-team': [
      'cloudflare-team@fire22.ag',
      'cloudflare-workers@fire22.ag',
      'cloudflare-r2@fire22.ag',
      'wrangler-support@fire22.ag',
      'edge-team@fire22.ag',
    ],
    'ci-team': [
      'ci@fire22.ag',
      'ci-cd@fire22.ag',
      'github-actions@fire22.ag',
      'build-team@fire22.ag',
      'release-automation@fire22.ag',
    ],
    'devops-team': ['devops@fire22.ag', 'cloudflare-team@fire22.ag', 'head@operations.fire22'],
    'data-team': ['data@fire22.ag', 'analytics-team@fire22.ag', 'head@finance.fire22'],
    'communications-team': ['communications@fire22.ag', 'pr@fire22.ag', 'head@marketing.fire22'],
    'recon-team': ['reconnaissance@fire22.ag', 'intelligence@fire22.ag', 'head@security.fire22'],
  };

  // Timezone configuration based on environment
  private readonly timezoneConfig = {
    development: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone, // System timezone
    testing: 'UTC', // Always UTC for deterministic tests
    production: process.env.TZ || 'America/New_York', // Default to ET for Fire22
  };

  constructor() {
    this.setupTimezone();
  }

  /**
   * Setup timezone based on environment
   */
  private setupTimezone(): void {
    const environment = this.detectEnvironment();
    const targetTimezone = this.timezoneConfig[environment];

    console.log(`🕒 Environment: ${environment}`);
    console.log(`🌍 Current TZ: ${process.env.TZ || 'system default'}`);
    console.log(`🎯 Target TZ: ${targetTimezone}`);

    // Set timezone if not already set (except for development which uses system default)
    if (!process.env.TZ && environment !== 'development') {
      process.env.TZ = targetTimezone;
      console.log(`✅ Set TZ to: ${targetTimezone}`);
    }
  }

  /**
   * Detect environment based on various signals
   */
  private detectEnvironment(): 'development' | 'testing' | 'production' {
    // bun test automatically sets TZ=UTC, but we can detect via other means
    if (process.env.NODE_ENV === 'test' || process.argv.includes('test')) {
      return 'testing';
    }
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }
    return 'development';
  }

  /**
   * Creates [TZ][DATE][NANOSECONDS] formatted timestamp with nanosecond precision
   * TZ = Timezone abbreviation, DATE = ISO date with timezone, NANOSECONDS = Bun nanosecond timing
   */
  private createTxTimestamp(): { tx: string; date: string; full: string; nanoseconds: number } {
    const now = new Date();
    const nanoseconds = Bun.nanoseconds();

    // Get timezone abbreviation
    const tzAbbr =
      now
        .toLocaleString('en-US', {
          timeZoneName: 'short',
        })
        .split(' ')
        .pop() || 'UTC';

    // Get full ISO string
    const isoDate = now.toISOString();

    // Format nanoseconds with microsecond precision (6 decimal places)
    const nanoFormatted = (nanoseconds / 1_000_000).toFixed(6);

    // Create [TZ][DATE][NANOSECONDS] format
    const txFormatted = `[${tzAbbr}][${isoDate}][${nanoFormatted}ns]`;

    return {
      tx: tzAbbr,
      date: isoDate,
      full: txFormatted,
      nanoseconds: nanoseconds,
    };
  }

  /**
   * Send notification for critical Fire22 issue with [TX][DATE] timestamps
   */
  async sendCriticalIssueNotification(issueNumber: number): Promise<void> {
    const timestamp = this.createTxTimestamp();

    console.log(`🚨 Sending CRITICAL issue notifications for #${issueNumber}`);
    console.log(`⏰ Timestamp: ${timestamp.full}`);
    console.log(`🕒 Environment: ${this.detectEnvironment()}`);
    console.log(
      `🌍 Timezone: ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}`
    );

    const notifications: CriticalIssueNotification[] = [];

    // Create notifications for each department
    Object.entries(this.departmentEmails).forEach(([department, emails]) => {
      const notification: CriticalIssueNotification = {
        issueNumber,
        title: '🚨 CRITICAL: Fire22 Data Extraction Completely Blocked - Multiple System Failures',
        labels: ['P0-critical', 'escalation', 'fire22-platform', 'auth-blocked', 'data-extraction'],
        department,
        emails,
        timestamp: new Date().toISOString(),
        txTimestamp: timestamp.full,
        priority: 'CRITICAL',
        urgency: 'P0-critical',
      };

      notifications.push(notification);

      console.log(`\n📧 ${department.toUpperCase()}:`);
      emails.forEach(email => {
        console.log(`   └─ ${email}`);
      });
    });

    // Save notifications to file
    const notificationsPath = join(process.cwd(), 'data', 'critical-issue-notifications.json');
    writeFileSync(notificationsPath, JSON.stringify(notifications, null, 2));

    console.log(`\n✅ Saved ${notifications.length} notifications to: ${notificationsPath}`);
    console.log(`🕐 Total emails to send: ${Object.values(this.departmentEmails).flat().length}`);

    // Generate email templates
    await this.generateCriticalEmailTemplates(notifications);

    console.log(`\n📊 CRITICAL NOTIFICATION SUMMARY ${timestamp.full}:`);
    console.log('='.repeat(60));
    console.log(`📧 Total notifications: ${notifications.length}`);
    console.log(`🏢 Departments alerted: ${Object.keys(this.departmentEmails).join(', ')}`);
    console.log(`🚨 Priority level: P0-CRITICAL`);
    console.log(`⏰ Timestamp format: ${timestamp.full}`);
    console.log(
      `🌍 Timezone: ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}`
    );
  }

  /**
   * Send task-related notifications based on department task data
   */
  async sendTaskNotification(
    taskId: string,
    department: string,
    notificationType: TaskNotification['notificationType'],
    additionalData?: any
  ): Promise<void> {
    const timestamp = this.createTxTimestamp();

    console.log(`📋 Sending task notification for task #${taskId}`);
    console.log(`🏢 Department: ${department}`);
    console.log(`📧 Notification type: ${notificationType}`);
    console.log(`⏰ Timestamp: ${timestamp.full}`);

    try {
      // Import department tasks data
      const { DEPARTMENT_TASKS_DATA } = await import('../src/api/departments');
      const tasks = DEPARTMENT_TASKS_DATA[department] || [];
      const task = tasks.find(t => t.id.toString() === taskId || t.uuid === taskId);

      if (!task) {
        console.error(`❌ Task not found: ${taskId} in department ${department}`);
        return;
      }

      // Get assignee email (use department emails as fallback)
      const assigneeEmail = this.getAssigneeEmail(task.assignee, department);

      const notification: TaskNotification = {
        taskId: task.id.toString(),
        taskUuid: task.uuid,
        title: task.title,
        department,
        assignee: task.assignee,
        assigneeEmail,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        timestamp: new Date().toISOString(),
        txTimestamp: timestamp.full,
        notificationType,
        actionRequired: this.getTaskActionRequired(task, notificationType),
      };

      // Save notification
      await this.saveTaskNotification(notification);

      // Generate email template
      await this.generateTaskEmailTemplate(notification);

      console.log(`✅ Task notification sent successfully`);
      console.log(`📧 Recipient: ${assigneeEmail}`);
      console.log(`🎯 Action: ${notification.actionRequired}`);
    } catch (error) {
      console.error('❌ Error sending task notification:', error);
    }
  }

  /**
   * Get assignee email address from department directory
   */
  private getAssigneeEmail(assignee: string, department: string): string {
    const emailMappings: Record<string, string> = {
      'Mike Hunt': 'mike.hunt@technology.fire22',
      'John Paulsack': 'john.paulsack@fire22.ag',
      'Lisa Anderson': 'lisa.anderson@compliance.fire22',
      'Mark Thompson': 'mark.thompson@compliance.fire22',
      'Sarah Lee': 'sarah.lee@compliance.fire22',
      'David Chen': 'david.chen@compliance.fire22',
      'Emma Wilson': 'emma.wilson@compliance.fire22',
      'Mike Johnson': 'mike.johnson@support.fire22',
      'Jennifer Smith': 'jennifer.smith@support.fire22',
      'Robert Brown': 'robert.brown@support.fire22',
      'Amanda Garcia': 'amanda.garcia@support.fire22',
      'Chris Martinez': 'chris.martinez@support.fire22',
      // Product Management Team
      'Alexandra Kim': 'alexandra.kim@product.fire22',
      'Daniel Wong': 'daniel.wong@product.fire22',
      'Samantha Rivera': 'samantha.rivera@product.fire22',
      'Ryan Thompson': 'ryan.thompson@product.fire22',
      // Onboarding Team
      'Natasha Cooper': 'natasha.cooper@onboarding.fire22',
      'Luis Martinez': 'luis.martinez@onboarding.fire22',
      'Karen Adams': 'karen.adams@onboarding.fire22',
      'Troy Williams': 'troy.williams@onboarding.fire22',
      // Design Team
      'Isabella Martinez': 'isabella.martinez@design.fire22',
      'Ethan Cooper': 'ethan.cooper@design.fire22',
      'Maya Patel': 'maya.patel@design.fire22',
    };

    return (
      emailMappings[assignee] || `${assignee.toLowerCase().replace(' ', '.')}@${department}.fire22`
    );
  }

  /**
   * Generate action required text based on task and notification type
   */
  private getTaskActionRequired(
    task: any,
    notificationType: TaskNotification['notificationType']
  ): string {
    switch (notificationType) {
      case 'assignment':
        return `Review and accept new task assignment: "${task.title}"`;
      case 'deadline_reminder':
        return `Complete task before deadline: ${task.dueDate || 'ASAP'}`;
      case 'status_change':
        return `Acknowledge task status change to: ${task.status}`;
      case 'overdue_alert':
        return `URGENT: Task is overdue and requires immediate attention`;
      default:
        return `Review task details and take appropriate action`;
    }
  }

  /**
   * Save task notification to file
   */
  private async saveTaskNotification(notification: TaskNotification): Promise<void> {
    const taskNotificationsDir = join(process.cwd(), 'src', 'notifications');
    const taskNotificationsPath = join(taskNotificationsDir, 'task-notifications.json');

    let notifications: TaskNotification[] = [];
    if (existsSync(taskNotificationsPath)) {
      notifications = JSON.parse(readFileSync(taskNotificationsPath, 'utf8'));
    }

    notifications.push(notification);
    writeFileSync(taskNotificationsPath, JSON.stringify(notifications, null, 2));

    console.log(`📝 Task notification saved to: ${taskNotificationsPath}`);
  }

  /**
   * Generate email template for task notifications
   */
  private async generateTaskEmailTemplate(notification: TaskNotification): Promise<void> {
    const timestamp = this.createTxTimestamp();
    const template = this.createTaskEmailTemplate(notification);
    const filename = `TASK-${notification.department}-${notification.taskId}-${notification.notificationType}-${timestamp.tx}.md`;
    const filepath = join(process.cwd(), 'src', 'notifications', filename);

    writeFileSync(filepath, template);
    console.log(`📧 Task email template created: ${filename}`);
  }

  /**
   * Create task notification email template
   */
  private createTaskEmailTemplate(notification: TaskNotification): string {
    const {
      department,
      title,
      assignee,
      assigneeEmail,
      priority,
      status,
      dueDate,
      notificationType,
      actionRequired,
      txTimestamp,
    } = notification;
    const timestamp = this.createTxTimestamp();

    const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
    const statusEmoji =
      status === 'in-progress'
        ? '🔄'
        : status === 'active'
          ? '✅'
          : status === 'planning'
            ? '📋'
            : status === 'completed'
              ? '✅'
              : '⚠️';

    return `# 📋 FIRE22 TASK NOTIFICATION ${txTimestamp}

## Task Assignment - ${department.toUpperCase()} Department

### 📧 Recipient: ${assignee} (${assigneeEmail})

### Task Details:
- **Task ID:** ${notification.taskId} (${notification.taskUuid})
- **Title:** ${title}
- **Priority:** ${priorityEmoji} ${priority.toUpperCase()}
- **Status:** ${statusEmoji} ${status}
- **Due Date:** ${dueDate || 'Not set'}
- **Notification Type:** ${notificationType.replace('_', ' ').toUpperCase()}

### 🎯 ACTION REQUIRED:
${actionRequired}

---

## Notification Details

**Timestamp:** ${txTimestamp}
**Environment:** ${this.detectEnvironment()}
**Timezone:** ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}
**Department:** ${department}

### Task API Integration:
- **API Endpoint:** \`GET /api/departments/${department}/tasks\`
- **Task UUID:** \`${notification.taskUuid}\`
- **Update Status:** \`POST /api/departments/${department}/tasks/${notification.taskId}/status\`

---

## Quick Actions:

### Via Fire22 Dashboard:
1. Navigate to Department Tasks: \`/dashboard#tasks-${department}\`
2. Update task progress or status
3. Add comments or notes
4. Set reminders for due dates

### Via API:
\`\`\`bash
# Get task details
curl -X GET "http://localhost:3000/api/departments/${department}/tasks"

# Update task status
curl -X POST "http://localhost:3000/api/departments/${department}/tasks/${notification.taskId}/status" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "in-progress", "progress": 50}'
\`\`\`

---

## Contact Information:
- **Department Head:** head@${department}.fire22
- **Task API Support:** api@fire22.ag
- **Dashboard Support:** dashboard@fire22.ag

## 🆘 Need Help? Contact Support:
- **Claude Code Assistant**: Available 24/7 for any questions or issues
- **System Admin**: admin@fire22.ag
- **Emergency**: emergency@fire22.ag
- **Slack**: #fire22-support
- **Telegram**: @Fire22SupportBot

**Note**: If you encounter ANY issues with tasks, notifications, or system access, please contact Claude Code Assistant immediately for support.

---

**⚡ This is a ${priority.toUpperCase()} priority task notification requiring attention from ${department} department.**

*Generated at: ${txTimestamp}*

🤖 Generated with [Claude Code](https://claude.ai/code)
`;
  }

  /**
   * Send demonstration task notifications for all departments
   */
  async sendTaskNotificationDemo(): Promise<void> {
    console.log('📋 Sending task notification demonstrations...\n');

    const demoTasks = [
      { taskId: '1', department: 'compliance', type: 'deadline_reminder' as const },
      { taskId: '2', department: 'technology', type: 'assignment' as const },
      { taskId: '1', department: 'finance', type: 'status_change' as const },
      { taskId: '3', department: 'marketing', type: 'overdue_alert' as const },
    ];

    console.log('🎯 TASK NOTIFICATION DEMO SUMMARY:');
    console.log('!==!==!==!==!==!====');

    for (const demo of demoTasks) {
      console.log(
        `\n📧 Sending ${demo.type} notification for task #${demo.taskId} in ${demo.department} department...`
      );
      await this.sendTaskNotification(demo.taskId, demo.department, demo.type);
    }

    console.log('\n✅ Task notification demo completed!');
    console.log('📂 Check src/notifications/ for generated email templates');
    console.log('📋 Check src/notifications/task-notifications.json for notification log');
  }

  /**
   * Generate email templates for critical issues
   */
  private async generateCriticalEmailTemplates(
    notifications: CriticalIssueNotification[]
  ): Promise<void> {
    const templatesDir = join(process.cwd(), 'src', 'notifications');

    for (const notification of notifications) {
      const template = this.createCriticalEmailTemplate(notification);
      const currentTimestamp = this.createTxTimestamp();
      const filename = `CRITICAL-${notification.department}-issue-${notification.issueNumber}-${currentTimestamp.tx}.md`;
      const filepath = join(templatesDir, filename);

      writeFileSync(filepath, template);
      console.log(`📝 Created critical email template: ${filename}`);
    }
  }

  /**
   * Create critical issue email template with [TX][DATE] format
   */
  private createCriticalEmailTemplate(notification: CriticalIssueNotification): string {
    const { department, txTimestamp, emails, issueNumber } = notification;
    const timestamp = this.createTxTimestamp();

    return `# 🚨 CRITICAL FIRE22 ISSUE NOTIFICATION ${txTimestamp}

## Department: ${department.toUpperCase()}
**Issue #${issueNumber}** - Fire22 Data Extraction Completely Blocked

### 📧 Recipients:
${emails.map(email => `- ${email}`).join('\n')}

### 🚨 URGENT ACTION REQUIRED - P0 CRITICAL

**Timestamp:** ${txTimestamp}
**Environment:** ${this.detectEnvironment()}
**Timezone:** ${process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone}
**Date.getHours():** ${new Date().getHours()}

---

## Issue Details

**Title:** 🚨 CRITICAL: Fire22 Data Extraction Completely Blocked - Multiple System Failures

**GitHub Issue:** https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues/${issueNumber}

**Labels:** ${notification.labels.join(', ')}

### Department-Specific Actions Required:

${this.getDepartmentActions(department)}

---

## Timezone Information

- **Current Environment:** ${this.detectEnvironment()}
- **Configured Timezone:** ${process.env.TZ || 'system default'}
- **System Timezone:** ${Intl.DateTimeFormat().resolvedOptions().timeZone}
- **Current Hour:** ${new Date().getHours()}
- **TX Format:** ${txTimestamp}

---

## Contact Information

- **Issue Tracker:** https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues
- **Emergency Escalation:** Head of Policy (john.paulsack@fire22.ag)
- **System Status:** Dashboard monitoring available

---

**⚠️ This is a P0 CRITICAL issue requiring immediate attention from ${department} team.**

*Generated at: ${txTimestamp}*
`;
  }

  /**
   * Get department-specific actions for critical issues
   */
  private getDepartmentActions(department: string): string {
    const actions: Record<string, string> = {
      'security-team': `
**🔐 SECURITY TEAM - P0 URGENT:**
- [ ] Provide Fire22 API authentication credentials immediately
- [ ] Verify Fire22 API access permissions and scope
- [ ] Test credentials against Fire22 staging environment
- [ ] Validate Bun.secrets credential storage policies`,

      'infrastructure-team': `
**🏗️ INFRASTRUCTURE TEAM - P0 URGENT:**
- [ ] Fix Bun.secrets access and OS credential manager integration
- [ ] Initialize SQLite database connection
- [ ] Verify database file permissions
- [ ] Test credential storage/retrieval functionality`,

      'devops-team': `
**☁️ DEVOPS TEAM - P1 HIGH:**
- [ ] Create Cloudflare KV namespaces for caching
- [ ] Update wrangler.toml with KV namespace IDs
- [ ] Test KV access in development environment`,

      'data-team': `
**📊 DATA TEAM - P2 MONITOR:**
- [ ] Confirm data extraction completion percentage target
- [ ] Validate retention strategy
- [ ] Provide expected total record count for capacity planning`,

      'communications-team': `
**📢 COMMUNICATIONS TEAM - P1 HIGH:**
- [ ] Coordinate response between all departments
- [ ] Provide regular status updates to stakeholders
- [ ] Manage external communications if needed`,

      'recon-team': `
**🔍 RECONNAISSANCE TEAM - P2 MONITOR:**
- [ ] Monitor for any security implications
- [ ] Investigate root cause of authentication failures
- [ ] Assess potential data exposure risks`,
    };

    return actions[department] || '- [ ] Review issue details and coordinate with other teams';
  }

  /**
   * Test timezone behavior across environments
   */
  testTimezoneConfiguration(): void {
    console.log('\n🧪 Testing Timezone Configuration\n');
    console.log('Bun Timezone Behavior:');
    console.log('- Development: Uses system timezone');
    console.log('- Testing (bun test): Automatically uses UTC');
    console.log('- Production: Uses process.env.TZ or America/New_York\n');

    const environments = ['development', 'testing', 'production'] as const;

    environments.forEach(env => {
      console.log(`\n--- ${env.toUpperCase()} ENVIRONMENT ---`);

      // Simulate environment
      const originalTZ = process.env.TZ;
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = env === 'testing' ? 'test' : env;
      if (env !== 'development') {
        process.env.TZ = this.timezoneConfig[env];
      }

      const now = new Date();
      const timestamp = this.createTxTimestamp();

      console.log(`TZ Setting: ${process.env.TZ || 'system default'}`);
      console.log(`Date.getHours(): ${now.getHours()}`);
      console.log(`TX Timestamp: ${timestamp.full}`);
      console.log(`Local String: ${now.toString()}`);

      // Restore original settings
      process.env.TZ = originalTZ;
      process.env.NODE_ENV = originalEnv;
    });

    console.log('\n✅ Timezone configuration test completed');

    // Test current environment
    console.log('\n🔍 Current Environment Test:');
    const currentTimestamp = this.createTxTimestamp();
    console.log(`Environment: ${this.detectEnvironment()}`);
    console.log(`Current TZ: ${process.env.TZ || 'system default'}`);
    console.log(`System TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`Date.getHours(): ${new Date().getHours()}`);
    console.log(`TX Format: ${currentTimestamp.full}`);
  }

  async sendNotifications() {
    console.log('📧 Sending department package assignment notifications...\n');

    if (!existsSync(this.templatesPath)) {
      console.error('❌ Email templates not found. Run: bun run deps:notify first');
      return;
    }

    const templates: EmailTemplate[] = JSON.parse(readFileSync(this.templatesPath, 'utf8'));
    const notifications = JSON.parse(readFileSync(this.notificationsPath, 'utf8'));

    console.log('🎯 DEPARTMENT NOTIFICATION SUMMARY:');
    console.log('!==!==!==!==!==!==!==');

    templates.forEach((template, index) => {
      const notification = notifications[index];
      const department = template.subject.match(/- (\w+) Department/)?.[1] || 'Unknown';
      const isUrgent = template.body.includes('🔴 **URGENT**');
      const packagesCount = template.body.match(/\((\d+) total\)/)?.[1] || '0';

      console.log(`\n📨 ${department.toUpperCase()} DEPARTMENT:`);
      console.log(`   To: ${template.to}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Packages: ${packagesCount}`);
      console.log(
        `   Priority: ${isUrgent ? '🔴 URGENT - Assign Department Head' : '✅ Review & Acknowledge'}`
      );
      console.log(`   Status: ${notification?.content?.actionRequired || 'Review assignments'}`);
    });

    console.log('\n📋 NEXT STEPS FOR DEPARTMENT HEADS:');
    console.log('!==!==!==!==!==!=====');

    console.log('\n1. 🔴 **URGENT ACTIONS REQUIRED:**');
    templates.forEach(template => {
      if (template.body.includes('🔴 **URGENT**')) {
        const department = template.subject.match(/- (\w+) Department/)?.[1];
        console.log(`   • ${department}: Assign department head immediately`);
      }
    });

    console.log('\n2. 📝 **DEPENDENCY SUBMISSIONS NEEDED:**');
    templates.forEach(template => {
      const department = template.subject.match(/- (\w+) Department/)?.[1];
      console.log(
        `   • ${department}: bun run deps:submit --department "${department}" --deps "list" --justification "reason"`
      );
    });

    console.log('\n3. 📊 **PACKAGE ASSIGNMENTS BY PRIORITY:**');

    // Critical packages
    const criticalDepts: string[] = [];
    templates.forEach(template => {
      if (
        template.body.includes('Critical: 1 packages') ||
        template.body.includes('Critical: 2 packages')
      ) {
        const department = template.subject.match(/- (\w+) Department/)?.[1];
        if (department) criticalDepts.push(department);
      }
    });
    if (criticalDepts.length > 0) {
      console.log(`   🔴 Critical: ${criticalDepts.join(', ')}`);
    }

    // High priority packages
    const highDepts: string[] = [];
    templates.forEach(template => {
      if (
        template.body.includes('High: 1 packages') ||
        template.body.includes('High: 2 packages')
      ) {
        const department = template.subject.match(/- (\w+) Department/)?.[1];
        if (department) highDepts.push(department);
      }
    });
    if (highDepts.length > 0) {
      console.log(`   🟡 High: ${highDepts.join(', ')}`);
    }

    console.log('\n4. 🛠️ **DEPARTMENT SETUP COMMANDS:**');
    console.log('   • Check status: bun run deps:status');
    console.log('   • Submit dependencies: bun run deps:submit --help');
    console.log('   • Health check: bun run packages:health-check');
    console.log('   • Verify access: bun run verify:department-access');

    console.log('\n📬 **EMAIL DELIVERY SIMULATION:**');
    console.log('!==!==!==!==!==!===');
    console.log('(In production, these emails would be sent via SMTP/SendGrid/etc.)');

    templates.forEach((template, index) => {
      const department = template.subject.match(/- (\w+) Department/)?.[1];
      console.log(`\n📮 Would send email to: ${template.to}`);
      console.log(`   CC: ${template.cc}`);
      console.log(`   Subject: ${template.subject}`);
      console.log(`   Department: ${department}`);
      console.log(`   Length: ${template.body.length} characters`);
      console.log(`   Status: ✅ Ready to send`);
    });

    console.log('\n🎉 **NOTIFICATION SUMMARY:**');
    console.log('!==!==!==!==!===');
    console.log(`📧 Total emails prepared: ${templates.length}`);
    console.log(`🏢 Departments notified: ${templates.length}`);
    console.log(`📦 Total packages assigned: ${this.getTotalPackages(templates)}`);
    console.log(
      `🔴 Urgent actions required: ${templates.filter(t => t.body.includes('🔴 **URGENT**')).length}`
    );
    console.log(`⚡ Technology Dept (Active): Mike Hunt - 4 packages (2 critical, 2 high)`);
    console.log(`⏳ Other departments: Need department head assignment`);

    console.log('\n💡 **RECOMMENDED ACTIONS:**');
    console.log('!==!==!==!==!===');
    console.log('1. Assign department heads for Security (critical package), Finance, Operations');
    console.log('2. Set up recurring dependency submission reminders');
    console.log('3. Create package health monitoring dashboard');
    console.log('4. Establish department maintenance workflows');
    console.log('5. Schedule regular package assignment reviews');

    return templates;
  }

  private getTotalPackages(templates: EmailTemplate[]): number {
    return templates.reduce((total, template) => {
      const match = template.body.match(/\((\d+) total\)/);
      return total + (match ? parseInt(match[1]) : 0);
    }, 0);
  }

  async displayPackageMatrix() {
    console.log('\n📊 PACKAGE MAINTENANCE RESPONSIBILITY MATRIX:');
    console.log('!==!==!==!==!==!==!==!=====');

    const packageAssignments = [
      {
        pkg: '@fire22/core-dashboard',
        dept: 'Technology',
        maintainer: 'Mike Hunt',
        email: 'mike.hunt@technology.fire22',
        employeeId: 'EMP-TECH-001',
        priority: 'CRITICAL',
      },
      {
        pkg: '@fire22/pattern-system',
        dept: 'Technology',
        maintainer: 'Mike Hunt',
        email: 'mike.hunt@technology.fire22',
        employeeId: 'EMP-TECH-001',
        priority: 'CRITICAL',
      },
      {
        pkg: '@fire22/security-scanner',
        dept: 'Security',
        maintainer: 'TBD',
        email: 'head@security.fire22',
        employeeId: 'TBD',
        priority: 'CRITICAL',
      },
      {
        pkg: '@fire22/api-client',
        dept: 'Technology',
        maintainer: 'Mike Hunt',
        email: 'mike.hunt@technology.fire22',
        employeeId: 'EMP-TECH-001',
        priority: 'HIGH',
      },
      {
        pkg: '@fire22/build-system',
        dept: 'Technology',
        maintainer: 'Mike Hunt',
        email: 'mike.hunt@technology.fire22',
        employeeId: 'EMP-TECH-001',
        priority: 'HIGH',
      },
      {
        pkg: '@fire22/sports-betting',
        dept: 'Operations',
        maintainer: 'TBD',
        email: 'head@operations.fire22',
        employeeId: 'TBD',
        priority: 'HIGH',
      },
      {
        pkg: '@fire22/financial-reporting',
        dept: 'Finance',
        maintainer: 'TBD',
        email: 'head@finance.fire22',
        employeeId: 'TBD',
        priority: 'HIGH',
      },
      {
        pkg: '@fire22/telegram-integration',
        dept: 'Marketing',
        maintainer: 'TBD',
        email: 'head@marketing.fire22',
        employeeId: 'TBD',
        priority: 'MEDIUM',
      },
      {
        pkg: '@fire22/compliance-tools',
        dept: 'Legal',
        maintainer: 'TBD',
        email: 'head@legal.fire22',
        employeeId: 'TBD',
        priority: 'MEDIUM',
      },
    ];

    console.log('| Package | Department | Maintainer | Email | Employee ID | Priority | Status |');
    console.log('|---------|------------|------------|-------|-------------|----------|--------|');

    packageAssignments.forEach(item => {
      const status = item.maintainer === 'TBD' ? '🔴 Need Head' : '✅ Assigned';
      const priority =
        item.priority === 'CRITICAL'
          ? '🔴 CRITICAL'
          : item.priority === 'HIGH'
            ? '🟡 HIGH'
            : '🟢 MEDIUM';
      console.log(
        `| ${item.pkg.padEnd(24)} | ${item.dept.padEnd(10)} | ${item.maintainer.padEnd(10)} | ${item.email.padEnd(25)} | ${item.employeeId.padEnd(11)} | ${priority.padEnd(12)} | ${status} |`
      );
    });

    console.log('\n📈 PRIORITY BREAKDOWN:');
    console.log('!==!==!==!===');
    const critical = packageAssignments.filter(p => p.priority === 'CRITICAL');
    const high = packageAssignments.filter(p => p.priority === 'HIGH');
    const medium = packageAssignments.filter(p => p.priority === 'MEDIUM');

    console.log(`🔴 Critical: ${critical.length} packages`);
    critical.forEach(p =>
      console.log(`   • ${p.pkg} (${p.dept} - ${p.maintainer} - ${p.email} - ${p.employeeId})`)
    );

    console.log(`🟡 High: ${high.length} packages`);
    high.forEach(p =>
      console.log(`   • ${p.pkg} (${p.dept} - ${p.maintainer} - ${p.email} - ${p.employeeId})`)
    );

    console.log(`🟢 Medium: ${medium.length} packages`);
    medium.forEach(p =>
      console.log(`   • ${p.pkg} (${p.dept} - ${p.maintainer} - ${p.email} - ${p.employeeId})`)
    );
  }

  async handleCommand(command: string, ...args: string[]) {
    switch (command) {
      case 'send':
        await this.sendNotifications();
        break;
      case 'matrix':
        await this.displayPackageMatrix();
        break;
      case 'both':
        await this.sendNotifications();
        await this.displayPackageMatrix();
        break;
      case 'critical':
        const issueNumber = parseInt(args[0]) || 2;
        await this.sendCriticalIssueNotification(issueNumber);
        break;
      case 'test-timezone':
        this.testTimezoneConfiguration();
        break;
      case 'task':
        const [taskId, department, notificationType] = args;
        if (!taskId || !department || !notificationType) {
          console.error('❌ Usage: task <taskId> <department> <notificationType>');
          console.log(
            '📧 Notification types: assignment, deadline_reminder, status_change, overdue_alert'
          );
          console.log(
            '🏢 Departments: compliance, customer-support, finance, management, marketing, operations, team-contributors, technology, product-management, onboarding, design'
          );
          return;
        }
        await this.sendTaskNotification(
          taskId,
          department,
          notificationType as TaskNotification['notificationType']
        );
        break;
      case 'task-demo':
        await this.sendTaskNotificationDemo();
        break;
      default:
        console.log(`
🏢 Fire22 Department Notification Sender with Task API Integration

Usage:
  bun run scripts/department-notification-sender.ts send                              # Send package assignment notifications
  bun run scripts/department-notification-sender.ts matrix                           # Display package responsibility matrix
  bun run scripts/department-notification-sender.ts both                             # Send notifications and show matrix
  bun run scripts/department-notification-sender.ts critical [n]                     # Send critical issue notifications for issue #n
  bun run scripts/department-notification-sender.ts test-timezone                    # Test timezone configuration
  bun run scripts/department-notification-sender.ts task <id> <dept> <type>          # Send task notification
  bun run scripts/department-notification-sender.ts task-demo                        # Send demo task notifications

Commands:
  send         - Prepare and simulate sending package assignment emails
  matrix       - Show package maintenance responsibility matrix
  both         - Execute both send and matrix commands
  critical     - Send critical issue notifications with [TX][DATE] timestamps
  test-timezone - Test timezone behavior across environments
  task         - Send task notification (requires task ID, department, and notification type)
  task-demo    - Send demonstration task notifications for all departments

Task Notification Types:
  assignment        - New task assignment notification
  deadline_reminder - Task deadline approaching reminder
  status_change     - Task status change notification
  overdue_alert     - Task overdue alert notification

Supported Departments:
  compliance, customer-support, finance, management, marketing, operations, team-contributors, technology, product-management, onboarding, design

Examples:
  bun run scripts/department-notification-sender.ts critical 2
  bun run scripts/department-notification-sender.ts task 1 compliance deadline_reminder
  bun run scripts/department-notification-sender.ts task 2 technology assignment
  bun run scripts/department-notification-sender.ts task-demo
  bun run scripts/department-notification-sender.ts test-timezone

Task API Integration:
  - Integrates with: /api/departments/{dept}/tasks
  - Uses department task data from src/api/departments.ts
  - Generates email templates with API endpoints and actions
  - Saves notifications to src/notifications/task-notifications.json

Timezone Behavior:
  - Development: Uses system timezone (${Intl.DateTimeFormat().resolvedOptions().timeZone})
  - Testing: Uses UTC (automatic with bun test)
  - Production: Uses America/New_York (or TZ env var)
        `);
    }
  }
}

async function main() {
  const sender = new DepartmentNotificationSender();
  const [command = 'help', ...args] = process.argv.slice(2);
  await sender.handleCommand(command, ...args);
}

if (import.meta.main) {
  main();
}
