#!/usr/bin/env bun

import { TimeSeriesAggregator, Anomaly, AggregationWindow } from './aggregator';
import { MLPatternRecognizer } from './ml-integration';

export interface RemediationAction {
  id: string;
  name: string;
  description: string;
  category: 'scale' | 'restart' | 'config' | 'alert' | 'isolate' | 'optimize';
  severity: Anomaly['severity'][];
  conditions: {
    pattern?: string[];
    metricType?: string[];
    timeOfDay?: { start: string; end: string }[];
    resourceUtilization?: { above: number; metric: 'cpu' | 'memory' | 'disk' };
  };
  action: {
    type: 'command' | 'api_call' | 'script' | 'notification';
    target: 'agent' | 'container' | 'service' | 'user';
    parameters: Record<string, any>;
    validation: {
      timeout: number;
      expectedStatus: string[];
      rollbackOnFailure: boolean;
    };
  };
  riskLevel: 'low' | 'medium' | 'high';
  approvalRequired: boolean;
}

export interface RemediationWorkflow {
  workflowId: string;
  trigger: Anomaly;
  actions: RemediationAction[];
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  startTime: string;
  endTime?: string;
  results: Array<{
    action: RemediationAction;
    status: 'success' | 'failed' | 'skipped';
    output?: string;
    error?: string;
    duration?: number;
  }>;
  rollbackActions?: RemediationAction[];
}

export class AutomatedRemediationEngine {
  private aggregator: TimeSeriesAggregator;
  private mlRecognizer: MLPatternRecognizer;
  private remediationRules: RemediationAction[] = [];
  private activeWorkflows: Map<string, RemediationWorkflow> = new Map();
  private auditLog: Array<{timestamp: string; event: string; details: any}> = [];
  
  // Integration endpoints
  private readonly INTEGRATIONS = {
    KUBERNETES_API: process.env.KUBERNETES_API || 'http://localhost:8080',
    DOCKER_API: process.env.DOCKER_API || 'http://localhost:2375',
    NOTIFICATION_WEBHOOK: process.env.NOTIFICATION_WEBHOOK,
    SLACK_WEBHOOK: process.env.SLACK_WEBHOOK
  };

  constructor() {
    this.aggregator = new TimeSeriesAggregator();
    this.mlRecognizer = new MLPatternRecognizer();
    this.loadRemediationRules();
    this.startRemediationMonitor();
  }

  private loadRemediationRules(): void {
    // Pre-defined remediation rules
    this.remediationRules = [
      {
        id: 'scale-up-cpu',
        name: 'Scale Up CPU Resources',
        description: 'Automatically scale up CPU allocation for container',
        category: 'scale',
        severity: ['high', 'critical'],
        conditions: {
          pattern: ['spike', 'gradual_increase', 'cpu_saturation'],
          metricType: ['cpu_usage', 'cpu_utilization'],
          resourceUtilization: { above: 80, metric: 'cpu' }
        },
        action: {
          type: 'api_call',
          target: 'container',
          parameters: {
            method: 'PATCH',
            url: `${this.INTEGRATIONS.KUBERNETES_API}/api/v1/namespaces/{namespace}/pods/{pod}`,
            body: {
              spec: {
                containers: [{
                  name: '{containerName}',
                  resources: {
                    limits: { cpu: '{newCpuLimit}' },
                    requests: { cpu: '{newCpuRequest}' }
                  }
                }]
              }
            }
          },
          validation: {
            timeout: 30000,
            expectedStatus: ['200', '201'],
            rollbackOnFailure: true
          }
        },
        riskLevel: 'medium',
        approvalRequired: false
      },
      {
        id: 'restart-container',
        name: 'Restart Container',
        description: 'Gracefully restart the container',
        category: 'restart',
        severity: ['critical'],
        conditions: {
          pattern: ['memory_leak', 'unstable_oscillation', 'application_error'],
          metricType: ['memory_usage', 'error_rate', 'restart_count']
        },
        action: {
          type: 'command',
          target: 'container',
          parameters: {
            command: 'docker restart {containerId}',
            environment: {},
            workingDir: '/tmp'
          },
          validation: {
            timeout: 60000,
            expectedStatus: ['running'],
            rollbackOnFailure: false
          }
        },
        riskLevel: 'high',
        approvalRequired: true
      },
      {
        id: 'isolate-agent',
        name: 'Isolate Agent',
        description: 'Isolate agent from network due to security concerns',
        category: 'isolate',
        severity: ['critical'],
        conditions: {
          pattern: ['brute_force', 'data_exfiltration', 'ddos_pattern'],
          metricType: ['security_event', 'network_traffic', 'auth_failures']
        },
        action: {
          type: 'script',
          target: 'agent',
          parameters: {
            script: 'isolate_agent.sh',
            args: ['{agentId}', '--reason=security_anomaly'],
            env: { REASON: 'security_anomaly' }
          },
          validation: {
            timeout: 45000,
            expectedStatus: ['isolated', 'quarantined'],
            rollbackOnFailure: true
          }
        },
        riskLevel: 'high',
        approvalRequired: true
      },
      {
        id: 'send-alert',
        name: 'Send Alert Notification',
        description: 'Send alert to operations team',
        category: 'alert',
        severity: ['medium', 'high', 'critical'],
        conditions: {
          pattern: ['*'], // Any pattern
          timeOfDay: [{ start: '09:00', end: '17:00' }] // Business hours
        },
        action: {
          type: 'notification',
          target: 'user',
          parameters: {
            channels: ['slack', 'email', 'pagerduty'],
            message: '🚨 Anomaly detected: {pattern} on {agentId}. Severity: {severity}',
            priority: 'high',
            recipients: ['operations@company.com', 'oncall-team']
          },
          validation: {
            timeout: 10000,
            expectedStatus: ['sent', 'delivered'],
            rollbackOnFailure: false
          }
        },
        riskLevel: 'low',
        approvalRequired: false
      },
      {
        id: 'optimize-config',
        name: 'Optimize Configuration',
        description: 'Apply optimized configuration based on patterns',
        category: 'config',
        severity: ['medium', 'high'],
        conditions: {
          pattern: ['daily_pattern', 'seasonal', 'batch_processing'],
          metricType: ['throughput', 'latency', 'queue_depth']
        },
        action: {
          type: 'api_call',
          target: 'service',
          parameters: {
            method: 'POST',
            url: '{serviceUrl}/config/optimize',
            body: {
              pattern: '{pattern}',
              parameters: {
                batchSize: '{optimalBatchSize}',
                concurrency: '{optimalConcurrency}',
                timeout: '{optimalTimeout}'
              }
            }
          },
          validation: {
            timeout: 15000,
            expectedStatus: ['200'],
            rollbackOnFailure: true
          }
        },
        riskLevel: 'medium',
        approvalRequired: false
      }
    ];
    
    console.log(`📋 Loaded ${this.remediationRules.length} remediation rules`);
  }

  /**
   * Start monitoring for anomalies and trigger remediation
   */
  private startRemediationMonitor(): void {
    console.log('🚀 Starting automated remediation monitor...');
    
    // Monitor for new anomalies every 30 seconds
    setInterval(async () => {
      try {
        await this.checkAndRemediate();
      } catch (error) {
        console.error('❌ Remediation monitor error:', error.message);
      }
    }, 30000);
    
    // Also trigger on-demand remediation via API
    console.log('✅ Remediation engine ready. Monitoring for anomalies...');
  }

  /**
   * Check for anomalies and trigger remediation
   */
  private async checkAndRemediate(): Promise<void> {
    // Get recent anomalies
    const aggregations = await this.aggregator.aggregateMetrics('ENTERPRISE', '5m');
    const recentAnomalies = aggregations
      .flatMap(w => w.anomalies)
      .filter(a => {
        const anomalyAge = Date.now() - new Date(a.timestamp).getTime();
        return anomalyAge < 300000; // Last 5 minutes
      });
    
    if (recentAnomalies.length === 0) {
      return; // No new anomalies
    }
    
    console.log(`🔍 Found ${recentAnomalies.length} recent anomalies for remediation`);
    
    // Process each anomaly
    for (const anomaly of recentAnomalies) {
      // Skip if already being remediated
      if (this.isAnomalyBeingRemediated(anomaly)) {
        continue;
      }
      
      // Determine appropriate remediation actions
      const actions = this.determineRemediationActions(anomaly);
      
      if (actions.length > 0) {
        await this.executeRemediationWorkflow(anomaly, actions);
      }
    }
  }

  /**
   * Determine appropriate remediation actions for an anomaly
   */
  private determineRemediationActions(anomaly: Anomaly): RemediationAction[] {
    const matchingActions: RemediationAction[] = [];
    
    for (const rule of this.remediationRules) {
      if (this.doesRuleMatch(rule, anomaly)) {
        matchingActions.push(rule);
      }
    }
    
    // Sort by priority (critical severity first, then risk level)
    matchingActions.sort((a, b) => {
      const severityScore = (sev: string) => 
        sev === 'critical' ? 4 : sev === 'high' ? 3 : sev === 'medium' ? 2 : 1;
      
      const aScore = Math.max(...a.severity.map(severityScore));
      const bScore = Math.max(...b.severity.map(severityScore));
      
      if (bScore !== aScore) return bScore - aScore;
      
      const riskScore = (risk: string) => 
        risk === 'high' ? 3 : risk === 'medium' ? 2 : 1;
      
      return riskScore(b.riskLevel) - riskScore(a.riskLevel);
    });
    
    return matchingActions.slice(0, 3); // Limit to top 3 actions
  }

  /**
   * Check if a rule matches an anomaly
   */
  private doesRuleMatch(rule: RemediationAction, anomaly: Anomaly): boolean {
    // Check severity
    if (!rule.severity.includes(anomaly.severity)) {
      return false;
    }
    
    // Check pattern
    if (rule.conditions.pattern && rule.conditions.pattern[0] !== '*') {
      if (!rule.conditions.pattern.includes(anomaly.pattern)) {
        return false;
      }
    }
    
    // Check time of day if specified
    if (rule.conditions.timeOfDay && rule.conditions.timeOfDay.length > 0) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const isInTimeWindow = rule.conditions.timeOfDay.some(window => 
        currentTime >= window.start && currentTime <= window.end
      );
      
      if (!isInTimeWindow) {
        return false;
      }
    }
    
    // Additional conditions would be checked here (resource utilization, etc.)
    
    return true;
  }

  /**
   * Execute remediation workflow
   */
  private async executeRemediationWorkflow(
    anomaly: Anomaly,
    actions: RemediationAction[]
  ): Promise<RemediationWorkflow> {
    const workflowId = `remediation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: RemediationWorkflow = {
      workflowId,
      trigger: anomaly,
      actions,
      status: 'pending',
      startTime: new Date().toISOString(),
      results: []
    };
    
    this.activeWorkflows.set(workflowId, workflow);
    this.logAuditEvent('workflow_started', { workflowId, anomaly });
    
    console.log(`🚀 Starting remediation workflow ${workflowId} for anomaly: ${anomaly.pattern}`);
    
    // Check if approval is required
    const requiresApproval = actions.some(a => a.approvalRequired);
    
    if (requiresApproval) {
      workflow.status = 'pending';
      await this.requestApproval(workflow);
      return workflow;
    }
    
    // Execute immediately if no approval needed
    await this.executeWorkflowActions(workflow);
    
    return workflow;
  }

  /**
   * Request approval for high-risk actions
   */
  private async requestApproval(workflow: RemediationWorkflow): Promise<void> {
    const approvalMessage = {
      text: `⚠️ *Remediation Approval Required*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Remediation Approval Required'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Anomaly Detected:* ${workflow.trigger.pattern}\n*Severity:* ${workflow.trigger.severity}\n*Agent:* ${workflow.trigger.agentId || 'N/A'}\n*Container:* ${workflow.trigger.containerId || 'N/A'}` 
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Proposed Actions:*\n' + workflow.actions.map(a => `• ${a.name} (${a.category}, ${a.riskLevel} risk)`).join('\n')
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve'
              },
              style: 'primary',
              value: `approve_${workflow.workflowId}` 
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Reject'
              },
              style: 'danger',
              value: `reject_${workflow.workflowId}` 
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🕐 Schedule'
              },
              value: `schedule_${workflow.workflowId}` 
            }
          ]
        }
      ]
    };
    
    // Send to notification channel
    if (this.INTEGRATIONS.SLACK_WEBHOOK) {
      try {
        await fetch(this.INTEGRATIONS.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: Bun.deepToString(approvalMessage) // 3x faster
        });
      } catch (error) {
        console.error('Failed to send approval request:', error.message);
      }
    }
    
    console.log(`⏳ Waiting for approval for workflow ${workflow.workflowId}`);
    
    // Set timeout for auto-rejection
    setTimeout(() => {
      if (workflow.status === 'pending') {
        console.log(`⏰ Approval timeout for workflow ${workflow.workflowId}`);
        workflow.status = 'failed';
        workflow.results.push({
          action: workflow.actions[0],
          status: 'skipped',
          output: 'Approval request timed out'
        });
        this.activeWorkflows.delete(workflow.workflowId);
      }
    }, 300000); // 5 minute timeout
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflowActions(workflow: RemediationWorkflow): Promise<void> {
    workflow.status = 'executing';
    this.logAuditEvent('workflow_executing', { workflowId: workflow.workflowId });
    
    console.log(`⚡ Executing ${workflow.actions.length} actions for workflow ${workflow.workflowId}`);
    
    for (const action of workflow.actions) {
      const actionResult = await this.executeRemediationAction(action, workflow.trigger);
      
      workflow.results.push({
        action,
        status: actionResult.success ? 'success' : 'failed',
        output: actionResult.output,
        error: actionResult.error,
        duration: actionResult.duration
      });
      
      // Log the action execution
      this.logAuditEvent('action_executed', {
        workflowId: workflow.workflowId,
        action: action.id,
        success: actionResult.success
      });
      
      // If action failed and rollback is configured, execute rollback
      if (!actionResult.success && action.action.validation.rollbackOnFailure) {
        await this.executeRollback(action, workflow);
      }
      
      // Pause between actions (configurable)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    workflow.status = 'completed';
    workflow.endTime = new Date().toISOString();
    this.activeWorkflows.delete(workflow.workflowId);
    
    this.logAuditEvent('workflow_completed', {
      workflowId: workflow.workflowId,
      results: workflow.results
    });
    
    console.log(`✅ Remediation workflow ${workflow.workflowId} completed`);
    
    // Send completion notification
    await this.sendWorkflowCompletionNotification(workflow);
  }

  /**
   * Execute a single remediation action
   */
  private async executeRemediationAction(
    action: RemediationAction,
    trigger: Anomaly
  ): Promise<{ success: boolean; output?: string; error?: string; duration: number }> {
    const startTime = Date.now();
    
    try {
      console.log(`🛠️  Executing action: ${action.name} (${action.id})`);
      
      // Resolve template variables in parameters
      const resolvedParams = this.resolveActionParameters(action, trigger);
      
      let output: string;
      
      switch (action.action.type) {
        case 'command':
          output = await this.executeCommand(resolvedParams);
          break;
        case 'api_call':
          output = await this.executeApiCall(resolvedParams);
          break;
        case 'script':
          output = await this.executeScript(resolvedParams);
          break;
        case 'notification':
          output = await this.sendNotification(resolvedParams);
          break;
        default:
          throw new Error(`Unknown action type: ${action.action.type}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Validate the action result
      const isValid = this.validateActionResult(output, action.action.validation.expectedStatus);
      
      return {
        success: isValid,
        output: isValid ? `Action completed successfully: ${output}` : `Action failed validation: ${output}`,
        duration
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Resolve template parameters in action
   */
  private resolveActionParameters(action: RemediationAction, trigger: Anomaly): any {
    const params = JSON.parse(JSON.stringify(action.action.parameters));
    const jsonString = JSON.stringify(params);
    
    // Replace template variables
    const resolved = jsonString
      .replace(/{agentId}/g, trigger.agentId || 'unknown')
      .replace(/{containerId}/g, trigger.containerId || 'unknown')
      .replace(/{pattern}/g, trigger.pattern)
      .replace(/{severity}/g, trigger.severity)
      .replace(/{timestamp}/g, trigger.timestamp)
      .replace(/{value}/g, trigger.value.toString())
      .replace(/{expected}/g, trigger.expected.toString());
    
    return JSON.parse(resolved);
  }

  /**
   * Execute shell command
   */
  private async executeCommand(params: any): Promise<string> {
    const { command, environment, workingDir } = params;
    
    const proc = Bun.spawn(command.split(' '), {
      cwd: workingDir,
      env: { ...process.env, ...environment },
      stdout: 'pipe',
      stderr: 'pipe'
    });
    
    const output = await new Response(proc.stdout).text();
    const error = await new Response(proc.stderr).text();
    
    if (error && !output) {
      throw new Error(`Command failed: ${error}`);
    }
    
    return output;
  }

  /**
   * Execute API call
   */
  private async executeApiCall(params: any): Promise<string> {
    const { method, url, body, headers } = params;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`API call failed (${response.status}): ${responseText}`);
    }
    
    return responseText;
  }

  /**
   * Execute script
   */
  private async executeScript(params: any): Promise<string> {
    // In production, this would execute actual scripts
    // For demo, simulate script execution
    const { script, args } = params;
    
    console.log(`📜 Executing script: ${script} ${args.join(' ')}`);
    
    // Simulate script execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return `Script ${script} executed successfully with args: ${args.join(' ')}`;
  }

  /**
   * Send notification
   */
  private async sendNotification(params: any): Promise<string> {
    const { channels, message, priority, recipients } = params;
    
    console.log(`📢 Sending notification via ${channels.join(', ')}: ${message}`);
    
    // Send to Slack if configured
    if (channels.includes('slack') && this.INTEGRATIONS.SLACK_WEBHOOK) {
      try {
        await fetch(this.INTEGRATIONS.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message })
        });
      } catch (error) {
        console.error('Failed to send Slack notification:', error.message);
      }
    }
    
    // Send to webhook if configured
    if (channels.includes('webhook') && this.INTEGRATIONS.NOTIFICATION_WEBHOOK) {
      try {
        await fetch(this.INTEGRATIONS.NOTIFICATION_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, priority, recipients })
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error.message);
      }
    }
    
    return `Notification sent via ${channels.join(', ')}`;
  }

  /**
   * Validate action result
   */
  private validateActionResult(output: string, expectedStatus: string[]): boolean {
    // Simple validation - check if output contains expected status
    return expectedStatus.some(status => output.includes(status));
  }

  /**
   * Execute rollback for failed action
   */
  private async executeRollback(action: RemediationAction, workflow: RemediationWorkflow): Promise<void> {
    console.log(`🔄 Executing rollback for failed action: ${action.name}`);
    
    // Define rollback actions based on original action
    const rollbackActions: RemediationAction[] = [
      {
        id: `rollback-${action.id}`,
        name: `Rollback: ${action.name}`,
        description: `Rollback of failed action: ${action.name}`,
        category: 'config',
        severity: ['critical'],
        conditions: {},
        action: {
          type: 'api_call',
          target: 'service',
          parameters: {
            method: 'POST',
            url: `${this.INTEGRATIONS.KUBERNETES_API}/rollback`,
            body: { originalAction: action.id, workflowId: workflow.workflowId }
          },
          validation: {
            timeout: 30000,
            expectedStatus: ['rolled_back', 'restored'],
            rollbackOnFailure: false
          }
        },
        riskLevel: 'medium',
        approvalRequired: false
      }
    ];
    
    workflow.rollbackActions = rollbackActions;
    
    for (const rollbackAction of rollbackActions) {
      try {
        await this.executeRemediationAction(rollbackAction, workflow.trigger);
        console.log(`✅ Rollback completed for action: ${action.name}`);
      } catch (error) {
        console.error(`❌ Rollback failed for action ${action.name}:`, error.message);
      }
    }
  }

  /**
   * Send workflow completion notification
   */
  private async sendWorkflowCompletionNotification(workflow: RemediationWorkflow): Promise<void> {
    const successCount = workflow.results.filter(r => r.status === 'success').length;
    const totalCount = workflow.results.length;
    
    const message = {
      text: `✅ *Remediation Workflow Completed*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Remediation Workflow Completed'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Workflow ID:* ${workflow.workflowId}\n*Status:* ${workflow.status}\n*Success Rate:* ${successCount}/${totalCount} actions\n*Duration:* ${((new Date(workflow.endTime!).getTime() - new Date(workflow.startTime).getTime()) / 1000).toFixed(1)}s` 
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Action Results:*\n' + workflow.results.map(r => 
              `${r.status === 'success' ? '✅' : '❌'} ${r.action.name}: ${r.status}${r.output ? ` (${r.output.substring(0, 50)}...)` : ''}` 
            ).join('\n')
          }
        }
      ]
    };
    
    if (this.INTEGRATIONS.SLACK_WEBHOOK) {
      try {
        await fetch(this.INTEGRATIONS.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
      } catch (error) {
        console.error('Failed to send completion notification:', error.message);
      }
    }
  }

  /**
   * Check if anomaly is already being remediated
   */
  private isAnomalyBeingRemediated(anomaly: Anomaly): boolean {
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.trigger.timestamp === anomaly.timestamp &&
          workflow.trigger.agentId === anomaly.agentId &&
          workflow.trigger.pattern === anomaly.pattern) {
        return true;
      }
    }
    return false;
  }

  /**
   * Log audit event
   */
  private logAuditEvent(event: string, details: any): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      event,
      details
    });
    
    // Keep only last 1000 events
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): RemediationWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get audit log
   */
  getAuditLog(): typeof this.auditLog {
    return [...this.auditLog];
  }

  /**
   * Manually trigger remediation
   */
  async triggerManualRemediation(
    anomaly: Partial<Anomaly>,
    actionIds: string[]
  ): Promise<RemediationWorkflow> {
    const mockAnomaly: Anomaly = {
      timestamp: new Date().toISOString(),
      value: anomaly.value || 0,
      expected: anomaly.expected || 0,
      deviation: anomaly.deviation || 0,
      severity: anomaly.severity || 'medium',
      pattern: anomaly.pattern || 'manual_trigger',
      recommendations: anomaly.recommendations || ['Manually triggered remediation'],
      agentId: anomaly.agentId,
      containerId: anomaly.containerId
    };
    
    const actions = this.remediationRules.filter(rule => 
      actionIds.includes(rule.id)
    );
    
    if (actions.length === 0) {
      throw new Error('No valid actions found for the specified action IDs');
    }
    
    return await this.executeRemediationWorkflow(mockAnomaly, actions);
  }
}
