#!/usr/bin/env bun
/**
 * 🎫 Automated Issue Creation for Critical Errors
 * Intelligent ticket creation with context and priority routing
 * Integrates with GitHub Issues, Jira, and Linear
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { color } from 'bun' with { type: 'macro' };

interface IssueTemplate {
  id: string;
  name: string;
  errorCode?: string;
  category?: string;
  severity?: string;
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  provider: 'github' | 'jira' | 'linear' | 'slack';
  metadata?: Record<string, unknown>;
}

interface IssueCreationRule {
  id: string;
  name: string;
  enabled: boolean;
  errorCode?: string;
  category?: string;
  severity?: string;
  conditions: IssueCondition[];
  template: string;
  cooldown: string; // Prevent duplicate issues
  autoAssign: boolean;
  escalation?: {
    afterHours: number;
    escalateTo: string[];
    actions: string[];
  };
}

interface IssueCondition {
  type: 'occurrence_count' | 'time_window' | 'context_match' | 'user_impact' | 'business_hours';
  operator: 'greater_than' | 'equals' | 'contains' | 'regex';
  value: string | number;
  timeWindow?: string;
}

interface CreatedIssue {
  id: string;
  externalId: string;
  provider: 'github' | 'jira' | 'linear';
  errorCode: string;
  title: string;
  url: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  assignees: string[];
  labels: string[];
  priority: string;
  metadata?: Record<string, unknown>;
}

interface GitHubIssueProvider {
  type: 'github';
  config: {
    owner: string;
    repo: string;
    token: string;
    apiUrl?: string;
  };
}

interface JiraIssueProvider {
  type: 'jira';
  config: {
    baseUrl: string;
    projectKey: string;
    username: string;
    apiToken: string;
    issueType: string;
  };
}

interface LinearIssueProvider {
  type: 'linear';
  config: {
    apiKey: string;
    teamId: string;
    apiUrl?: string;
  };
}

type IssueProvider = GitHubIssueProvider | JiraIssueProvider | LinearIssueProvider;

class AutomatedIssueCreator {
  private templates: Map<string, IssueTemplate> = new Map();
  private rules: Map<string, IssueCreationRule> = new Map();
  private createdIssues: Map<string, CreatedIssue> = new Map();
  private providers: Map<string, IssueProvider> = new Map();
  private errorRegistry: any;
  private configPath: string;
  private dataPath: string;

  constructor() {
    this.configPath = join(process.cwd(), 'config', 'issue-creation.json');
    this.dataPath = join(process.cwd(), 'data', 'created-issues.json');
    this.loadErrorRegistry();
    this.loadConfiguration();
    this.loadCreatedIssues();
  }

  /**
   * Load error registry for context
   */
  private loadErrorRegistry(): void {
    const registryPath = join(process.cwd(), 'docs', 'error-codes.json');

    if (existsSync(registryPath)) {
      const content = readFileSync(registryPath, 'utf-8');
      this.errorRegistry = JSON.parse(content);
    }
  }

  /**
   * Load configuration
   */
  private loadConfiguration(): void {
    if (existsSync(this.configPath)) {
      try {
        const config = JSON.parse(readFileSync(this.configPath, 'utf-8'));

        // Load templates
        config.templates?.forEach((template: IssueTemplate) => {
          this.templates.set(template.id, template);
        });

        // Load rules
        config.rules?.forEach((rule: IssueCreationRule) => {
          this.rules.set(rule.id, rule);
        });

        // Load providers
        config.providers?.forEach((provider: IssueProvider & { id: string }) => {
          this.providers.set(provider.id, provider);
        });

        console.log(
          `✅ Loaded ${this.templates.size} templates, ${this.rules.size} rules, ${this.providers.size} providers`
        );
      } catch (error) {
        console.warn(`⚠️ Failed to load issue configuration: ${error.message}`);
        this.createDefaultConfiguration();
      }
    } else {
      this.createDefaultConfiguration();
    }
  }

  /**
   * Load created issues history
   */
  private loadCreatedIssues(): void {
    if (existsSync(this.dataPath)) {
      try {
        const data = JSON.parse(readFileSync(this.dataPath, 'utf-8'));

        Object.entries(data).forEach(([id, issue]: [string, any]) => {
          this.createdIssues.set(id, {
            ...issue,
            createdAt: new Date(issue.createdAt),
            updatedAt: new Date(issue.updatedAt),
          });
        });

        console.log(`✅ Loaded ${this.createdIssues.size} created issues`);
      } catch (error) {
        console.warn(`⚠️ Failed to load created issues: ${error.message}`);
      }
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfiguration(): void {
    const defaultTemplates: IssueTemplate[] = [
      {
        id: 'critical-system-failure',
        name: 'Critical System Failure',
        severity: 'CRITICAL',
        category: 'SYSTEM',
        title: '🚨 CRITICAL: {{errorCode}} - {{errorName}}',
        body: `## Critical System Failure Detected

**Error Code:** \`{{errorCode}}\`
**Error Name:** {{errorName}}
**Category:** {{category}}
**Severity:** {{severity}}

### Description
{{description}}

### Occurrence Details
- **Count:** {{occurrenceCount}} times in {{timeWindow}}
- **First Seen:** {{firstSeen}}
- **Last Seen:** {{lastSeen}}
- **Affected Users:** {{affectedUsers}}

### Recent Context
\`\`\`json
{{recentContext}}
\`\`\`

### Common Causes
{{#each causes}}
- {{this}}
{{/each}}

### Suggested Solutions
{{#each solutions}}
1. {{this}}
{{/each}}

### Documentation
{{#each documentationLinks}}
- [{{title}}]({{url}})
{{/each}}

### System Impact
- **Business Impact:** HIGH - Core system functionality affected
- **User Impact:** {{userImpact}}
- **Estimated Resolution Time:** {{estimatedResolutionTime}}

---
*This issue was automatically created by the Fire22 Error Management System*
*Alert ID: {{alertId}}*
*Created: {{createdAt}}*`,
        labels: ['critical', 'system-failure', 'auto-created'],
        assignees: ['platform-team'],
        priority: 'critical',
        provider: 'github',
      },
      {
        id: 'database-connectivity-issue',
        name: 'Database Connectivity Issue',
        errorCode: 'E2001',
        category: 'DATABASE',
        title: '🗄️ Database Connection Issue: {{errorCode}}',
        body: `## Database Connectivity Problem

**Error:** {{errorCode}} - {{errorName}}
**Occurrences:** {{occurrenceCount}} in {{timeWindow}}

### Recent Failures
{{#each recentOccurrences}}
- **{{timestamp}}**: {{context.query}} (Duration: {{context.duration}}ms)
{{/each}}

### Troubleshooting Steps
1. Check database server status and connectivity
2. Verify connection pool configuration
3. Review network connectivity
4. Check database server resources (CPU, memory, disk)
5. Validate connection string and credentials

### Monitoring
- **Database Health Dashboard:** [Link to monitoring dashboard]
- **Recent Performance:** [Link to performance metrics]

### Escalation
If this issue persists for more than 30 minutes, escalate to:
- Database Team (database-team@company.com)
- Platform Engineering (platform-engineering@company.com)

---
*Auto-created from Fire22 Error Management System*`,
        labels: ['database', 'connectivity', 'infrastructure'],
        assignees: ['database-team'],
        priority: 'high',
        provider: 'github',
      },
      {
        id: 'security-incident',
        name: 'Security Incident',
        category: 'SECURITY',
        title: '🔒 SECURITY ALERT: {{errorCode}} - {{errorName}}',
        body: `## Security Incident Detected

**⚠️ SECURITY ALERT - IMMEDIATE ATTENTION REQUIRED**

**Error Code:** \`{{errorCode}}\`
**Incident Type:** {{errorName}}
**Severity:** {{severity}}

### Incident Summary
{{description}}

### Threat Details
- **Detection Time:** {{detectionTime}}
- **Affected Systems:** {{affectedSystems}}
- **Source IPs:** {{sourceIPs}}
- **Attack Pattern:** {{attackPattern}}

### Immediate Actions Taken
- [x] Automated alerting triggered
- [ ] Security team notified
- [ ] Incident response initiated
- [ ] Threat containment assessed

### Investigation Required
{{#each investigationSteps}}
- [ ] {{this}}
{{/each}}

### Recommended Response
{{#each responseActions}}
1. **{{action}}**: {{description}}
{{/each}}

**🚨 This is a security incident requiring immediate response**

### Contact Information
- **Security Team:** security@company.com
- **Incident Commander:** @security-lead
- **Emergency Escalation:** security-emergency@company.com

---
*Security Alert Auto-Generated by Fire22 Error Management System*
*Incident ID: {{incidentId}}*
*Classification: {{classification}}*`,
        labels: ['security', 'incident', 'urgent', 'auto-created'],
        assignees: ['security-team'],
        priority: 'critical',
        provider: 'github',
      },
      {
        id: 'fire22-integration-failure',
        name: 'Fire22 Integration Failure',
        errorCode: 'E7001',
        category: 'FIRE22',
        title: '🏈 Fire22 Integration Failure: {{errorCode}}',
        body: `## Fire22 Sportsbook Integration Issue

**Error:** {{errorCode}} - {{errorName}}
**Integration Status:** FAILED
**Business Impact:** HIGH

### Failure Details
- **Service:** Fire22 Sportsbook API
- **Endpoint:** {{failedEndpoint}}
- **Error Count:** {{occurrenceCount}} in {{timeWindow}}
- **Last Successful Call:** {{lastSuccessfulCall}}

### Impact Assessment
- **Betting Operations:** {{bettingImpact}}
- **Customer Experience:** {{customerImpact}}
- **Revenue Impact:** {{revenueImpact}}

### Integration Health
- **API Status:** {{apiStatus}}
- **Authentication:** {{authStatus}}
- **Rate Limits:** {{rateLimitStatus}}
- **Network Connectivity:** {{networkStatus}}

### Recovery Actions
1. **Immediate:**
   - [ ] Check Fire22 API status page
   - [ ] Verify authentication tokens
   - [ ] Test network connectivity to fire22.ag
   
2. **Short-term:**
   - [ ] Implement circuit breaker if not already active
   - [ ] Enable fallback mechanisms
   - [ ] Contact Fire22 technical support
   
3. **Long-term:**
   - [ ] Review integration monitoring
   - [ ] Update error handling
   - [ ] Improve resilience patterns

### Fire22 Support
- **Technical Support:** technical-support@fire22.ag
- **API Documentation:** https://docs.fire22.ag/api
- **Status Page:** https://status.fire22.ag

---
*Fire22 Integration Monitoring - Auto-Generated Issue*`,
        labels: ['fire22', 'integration', 'sportsbook', 'revenue-impact'],
        assignees: ['fire22-integration-team'],
        priority: 'high',
        provider: 'github',
      },
    ];

    const defaultRules: IssueCreationRule[] = [
      {
        id: 'critical-error-immediate-issue',
        name: 'Critical Errors - Immediate Issue Creation',
        enabled: true,
        severity: 'CRITICAL',
        conditions: [
          {
            type: 'occurrence_count',
            operator: 'greater_than',
            value: 1,
            timeWindow: '5m',
          },
        ],
        template: 'critical-system-failure',
        cooldown: '30m',
        autoAssign: true,
        escalation: {
          afterHours: 2,
          escalateTo: ['engineering-manager', 'cto'],
          actions: ['slack-ping', 'email-alert'],
        },
      },
      {
        id: 'database-connection-failures',
        name: 'Database Connection Failures',
        enabled: true,
        errorCode: 'E2001',
        conditions: [
          {
            type: 'occurrence_count',
            operator: 'greater_than',
            value: 3,
            timeWindow: '10m',
          },
        ],
        template: 'database-connectivity-issue',
        cooldown: '1h',
        autoAssign: true,
      },
      {
        id: 'security-incidents',
        name: 'Security Incidents',
        enabled: true,
        category: 'SECURITY',
        conditions: [
          {
            type: 'occurrence_count',
            operator: 'greater_than',
            value: 5,
            timeWindow: '5m',
          },
        ],
        template: 'security-incident',
        cooldown: '15m',
        autoAssign: true,
        escalation: {
          afterHours: 1,
          escalateTo: ['security-lead', 'ciso'],
          actions: ['page-security-team', 'create-incident'],
        },
      },
      {
        id: 'fire22-integration-failures',
        name: 'Fire22 Integration Failures',
        enabled: true,
        category: 'FIRE22',
        conditions: [
          {
            type: 'occurrence_count',
            operator: 'greater_than',
            value: 10,
            timeWindow: '15m',
          },
          {
            type: 'business_hours',
            operator: 'equals',
            value: 'true',
          },
        ],
        template: 'fire22-integration-failure',
        cooldown: '2h',
        autoAssign: true,
      },
    ];

    const defaultProviders: (IssueProvider & { id: string })[] = [
      {
        id: 'github-main',
        type: 'github',
        config: {
          owner: 'fire22-company',
          repo: 'dashboard-worker',
          token: process.env.GITHUB_TOKEN || 'github_pat_xxx',
          apiUrl: 'https://api.github.com',
        },
      },
    ];

    // Save default configuration
    const config = {
      templates: defaultTemplates,
      rules: defaultRules,
      providers: defaultProviders,
    };

    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Load into memory
    defaultTemplates.forEach(t => this.templates.set(t.id, t));
    defaultRules.forEach(r => this.rules.set(r.id, r));
    defaultProviders.forEach(p => this.providers.set(p.id, p));

    console.log(
      `✅ Created default configuration with ${defaultTemplates.length} templates and ${defaultRules.length} rules`
    );
  }

  /**
   * Evaluate if an error should create an issue
   */
  evaluateIssueCreation(
    errorCode: string,
    occurrenceCount: number,
    timeWindow: string,
    context?: Record<string, unknown>
  ): string[] {
    const applicableRules: string[] = [];
    const errorDetails = this.errorRegistry?.errorCodes?.[errorCode];

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      // Check if rule applies to this error
      if (rule.errorCode && rule.errorCode !== errorCode) continue;
      if (rule.category && rule.category !== errorDetails?.category) continue;
      if (rule.severity && rule.severity !== errorDetails?.severity) continue;

      // Check cooldown - prevent duplicate issues
      const recentIssues = Array.from(this.createdIssues.values()).filter(issue => {
        const cooldownMs = this.parseTimeWindow(rule.cooldown);
        const cooldownEnd = new Date(issue.createdAt.getTime() + cooldownMs);
        return issue.errorCode === errorCode && new Date() < cooldownEnd;
      });

      if (recentIssues.length > 0) continue;

      // Evaluate conditions
      const conditionsMet = rule.conditions.every(condition =>
        this.evaluateCondition(condition, {
          errorCode,
          occurrenceCount,
          timeWindow,
          context,
          errorDetails,
        })
      );

      if (conditionsMet) {
        applicableRules.push(ruleId);
      }
    }

    return applicableRules;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: IssueCondition,
    data: {
      errorCode: string;
      occurrenceCount: number;
      timeWindow: string;
      context?: Record<string, unknown>;
      errorDetails?: any;
    }
  ): boolean {
    switch (condition.type) {
      case 'occurrence_count':
        switch (condition.operator) {
          case 'greater_than':
            return data.occurrenceCount > Number(condition.value);
          case 'equals':
            return data.occurrenceCount === Number(condition.value);
          default:
            return false;
        }

      case 'time_window':
        // Compare time windows (simplified)
        return condition.timeWindow === data.timeWindow;

      case 'context_match':
        if (!data.context) return false;
        const contextValue = String(data.context[String(condition.value)] || '');

        switch (condition.operator) {
          case 'contains':
            return contextValue.includes(String(condition.value));
          case 'equals':
            return contextValue === String(condition.value);
          case 'regex':
            return new RegExp(String(condition.value)).test(contextValue);
          default:
            return false;
        }

      case 'business_hours':
        const now = new Date();
        const hour = now.getHours();
        const isBusinessHours = hour >= 9 && hour <= 17 && now.getDay() >= 1 && now.getDay() <= 5;
        return condition.value === 'true' ? isBusinessHours : !isBusinessHours;

      case 'user_impact':
        // Simplified user impact assessment
        return (
          condition.operator === 'greater_than' && data.occurrenceCount > Number(condition.value)
        );

      default:
        return false;
    }
  }

  /**
   * Create issue for error
   */
  async createIssue(
    ruleId: string,
    errorCode: string,
    occurrenceCount: number,
    timeWindow: string,
    context?: {
      recentOccurrences?: any[];
      alertId?: string;
      affectedUsers?: number;
      businessImpact?: string;
    }
  ): Promise<CreatedIssue | null> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      console.error(`❌ Rule not found: ${ruleId}`);
      return null;
    }

    const template = this.templates.get(rule.template);
    if (!template) {
      console.error(`❌ Template not found: ${rule.template}`);
      return null;
    }

    const errorDetails = this.errorRegistry?.errorCodes?.[errorCode];
    const issueData = this.buildIssueFromTemplate(template, {
      errorCode,
      errorDetails,
      occurrenceCount,
      timeWindow,
      context,
      ruleId,
    });

    // Create issue using appropriate provider
    const providerId = this.getProviderForTemplate(template);
    const provider = this.providers.get(providerId);

    if (!provider) {
      console.error(`❌ Provider not found: ${providerId}`);
      return null;
    }

    try {
      const createdIssue = await this.createIssueWithProvider(provider, issueData);

      // Store created issue
      this.createdIssues.set(createdIssue.id, createdIssue);
      this.saveCreatedIssues();

      console.log(color('#10b981', 'css') + `✅ Issue created: ${createdIssue.title}`);
      console.log(`   URL: ${createdIssue.url}`);
      console.log(`   Provider: ${createdIssue.provider}`);
      console.log(`   Priority: ${createdIssue.priority}`);

      return createdIssue;
    } catch (error) {
      console.error(`❌ Failed to create issue: ${error.message}`);
      return null;
    }
  }

  /**
   * Build issue data from template
   */
  private buildIssueFromTemplate(
    template: IssueTemplate,
    data: {
      errorCode: string;
      errorDetails?: any;
      occurrenceCount: number;
      timeWindow: string;
      context?: any;
      ruleId: string;
    }
  ): any {
    const templateData = {
      errorCode: data.errorCode,
      errorName: data.errorDetails?.name || data.errorCode,
      category: data.errorDetails?.category || 'UNKNOWN',
      severity: data.errorDetails?.severity || 'ERROR',
      description: data.errorDetails?.description || 'Error description not available',
      occurrenceCount: data.occurrenceCount,
      timeWindow: data.timeWindow,
      causes: data.errorDetails?.causes || [],
      solutions: data.errorDetails?.solutions || [],
      documentationLinks: data.errorDetails?.documentation || [],
      createdAt: new Date().toISOString(),
      alertId: data.context?.alertId || `alert-${Date.now()}`,
      recentContext: JSON.stringify(data.context?.recentOccurrences?.slice(0, 3) || [], null, 2),
      recentOccurrences: data.context?.recentOccurrences || [],
      affectedUsers: data.context?.affectedUsers || 'Unknown',
      businessImpact: data.context?.businessImpact || 'To be determined',
      estimatedResolutionTime: this.estimateResolutionTime(data.errorDetails?.severity),
      firstSeen: data.context?.recentOccurrences?.[0]?.timestamp || new Date().toISOString(),
      lastSeen:
        data.context?.recentOccurrences?.slice(-1)[0]?.timestamp || new Date().toISOString(),
    };

    return {
      title: this.renderTemplate(template.title, templateData),
      body: this.renderTemplate(template.body, templateData),
      labels: template.labels,
      assignees: template.assignees || [],
      priority: template.priority,
    };
  }

  /**
   * Simple template rendering (in production, use a proper template engine)
   */
  private renderTemplate(template: string, data: any): string {
    let rendered = template;

    // Replace simple variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    // Handle arrays (simplified Handlebars-like syntax)
    rendered = rendered.replace(
      /{{#each (\w+)}}(.*?){{\/each}}/gs,
      (match, arrayKey, itemTemplate) => {
        const array = data[arrayKey];
        if (!Array.isArray(array)) return '';

        return array
          .map(item => {
            if (typeof item === 'object') {
              let itemRendered = itemTemplate;
              Object.entries(item).forEach(([prop, val]) => {
                itemRendered = itemRendered.replace(new RegExp(`{{${prop}}}`, 'g'), String(val));
              });
              return itemRendered;
            } else {
              return itemTemplate.replace(/{{this}}/g, String(item));
            }
          })
          .join('');
      }
    );

    return rendered;
  }

  /**
   * Estimate resolution time based on severity
   */
  private estimateResolutionTime(severity?: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '2-4 hours';
      case 'ERROR':
        return '4-8 hours';
      case 'WARNING':
        return '1-2 days';
      default:
        return '2-5 days';
    }
  }

  /**
   * Get provider for template
   */
  private getProviderForTemplate(template: IssueTemplate): string {
    // Simple logic - in production, make this configurable
    return 'github-main';
  }

  /**
   * Create issue with provider (mock implementation)
   */
  private async createIssueWithProvider(
    provider: IssueProvider,
    issueData: any
  ): Promise<CreatedIssue> {
    const issueId = `issue-${Date.now()}`;

    // Mock external API call
    console.log(color('#0088cc', 'css') + `🔗 Creating issue with ${provider.type} provider...`);
    console.log(`   Title: ${issueData.title}`);
    console.log(`   Labels: ${issueData.labels.join(', ')}`);
    console.log(`   Assignees: ${issueData.assignees.join(', ')}`);

    // In production, implement actual API calls:
    // - GitHub: POST to /repos/{owner}/{repo}/issues
    // - Jira: POST to /rest/api/2/issue
    // - Linear: GraphQL mutation createIssue

    const createdIssue: CreatedIssue = {
      id: issueId,
      externalId: `${provider.type}-${Math.random().toString(36).substr(2, 9)}`,
      provider: provider.type,
      errorCode: issueData.errorCode || 'UNKNOWN',
      title: issueData.title,
      url: `https://github.com/fire22-company/dashboard-worker/issues/${Math.floor(Math.random() * 1000)}`,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignees: issueData.assignees,
      labels: issueData.labels,
      priority: issueData.priority,
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return createdIssue;
  }

  /**
   * Parse time window to milliseconds
   */
  private parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([smhd])$/);
    if (!match) return 1800000; // Default 30 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
  }

  /**
   * Save created issues to file
   */
  private saveCreatedIssues(): void {
    try {
      const data: Record<string, any> = {};
      this.createdIssues.forEach((issue, id) => {
        data[id] = issue;
      });

      writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`❌ Failed to save created issues: ${error.message}`);
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalIssues: number;
    openIssues: number;
    issuesByProvider: Record<string, number>;
    issuesByPriority: Record<string, number>;
    issuesByErrorCode: Record<string, number>;
  } {
    const issues = Array.from(this.createdIssues.values());

    return {
      totalIssues: issues.length,
      openIssues: issues.filter(i => i.status === 'open').length,
      issuesByProvider: issues.reduce(
        (acc, issue) => {
          acc[issue.provider] = (acc[issue.provider] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      issuesByPriority: issues.reduce(
        (acc, issue) => {
          acc[issue.priority] = (acc[issue.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      issuesByErrorCode: issues.reduce(
        (acc, issue) => {
          acc[issue.errorCode] = (acc[issue.errorCode] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Display dashboard
   */
  displayDashboard(): void {
    const stats = this.getStatistics();

    console.log('\n🎫 AUTOMATED ISSUE CREATION DASHBOARD');
    console.log('='.repeat(80));

    console.log('\n📊 Overview:');
    console.log(`   Total Issues Created: ${stats.totalIssues}`);
    console.log(`   Open Issues: ${stats.openIssues}`);
    console.log(`   Issue Creation Rules: ${this.rules.size}`);
    console.log(`   Issue Templates: ${this.templates.size}`);

    if (Object.keys(stats.issuesByProvider).length > 0) {
      console.log('\n🔧 Issues by Provider:');
      Object.entries(stats.issuesByProvider).forEach(([provider, count]) => {
        console.log(`   ${provider}: ${count}`);
      });
    }

    if (Object.keys(stats.issuesByPriority).length > 0) {
      console.log('\n⚠️ Issues by Priority:');
      Object.entries(stats.issuesByPriority).forEach(([priority, count]) => {
        const priorityColor =
          priority === 'critical'
            ? color('#ef4444', 'css')
            : priority === 'high'
              ? color('#f97316', 'css')
              : priority === 'medium'
                ? color('#f59e0b', 'css')
                : color('#10b981', 'css');
        console.log(`   ${priorityColor}${priority}${color('#ffffff', 'css')}: ${count}`);
      });
    }

    if (Object.keys(stats.issuesByErrorCode).length > 0) {
      console.log('\n🔥 Issues by Error Code:');
      Object.entries(stats.issuesByErrorCode).forEach(([errorCode, count]) => {
        console.log(`   ${errorCode}: ${count} issues`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }
}

// CLI execution and demo
if (import.meta.main) {
  const issueCreator = new AutomatedIssueCreator();

  console.log('🎫 DEMO: Simulating automated issue creation...\n');

  // Test critical error issue creation
  const criticalRules = issueCreator.evaluateIssueCreation('E1001', 2, '5m', {
    systemComponent: 'database-connector',
    errorMessage: 'Failed to initialize connection pool',
  });

  if (criticalRules.length > 0) {
    await issueCreator.createIssue(criticalRules[0], 'E1001', 2, '5m', {
      alertId: 'alert-critical-001',
      affectedUsers: 500,
      businessImpact: 'Complete system outage',
    });
  }

  // Test database issue creation
  const databaseRules = issueCreator.evaluateIssueCreation('E2001', 5, '10m', {
    query: 'SELECT * FROM customers',
    duration: 30000,
  });

  if (databaseRules.length > 0) {
    await issueCreator.createIssue(databaseRules[0], 'E2001', 5, '10m', {
      alertId: 'alert-db-001',
      affectedUsers: 100,
      businessImpact: 'Customer data access impaired',
    });
  }

  // Test security incident creation
  const securityRules = issueCreator.evaluateIssueCreation('E6001', 15, '5m', {
    sourceIP: '203.0.113.42',
    attackType: 'brute_force',
  });

  if (securityRules.length > 0) {
    await issueCreator.createIssue(securityRules[0], 'E6001', 15, '5m', {
      alertId: 'alert-security-001',
      affectedUsers: 0,
      businessImpact: 'Potential security breach',
    });
  }

  // Display dashboard
  setTimeout(() => {
    issueCreator.displayDashboard();
  }, 2000);
}
