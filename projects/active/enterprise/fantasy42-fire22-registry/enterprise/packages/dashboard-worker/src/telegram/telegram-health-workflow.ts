#!/usr/bin/env bun

/**
 * 🩺 Health Check Workflow Integration for Telegram
 *
 * Integrates the Fire22 Health Check CLI with Telegram workflow system
 * Provides automated health monitoring and alerting capabilities
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { Context, InlineKeyboard } from 'grammy';
import { HealthMonitor, HealthUtils } from '../monitoring/health-check';
import { WorkflowStep, WorkflowContext } from './telegram-workflow';
import { UI_ELEMENTS, LANGUAGE_CODES, ACCESS_LEVELS } from './telegram-constants';

export interface HealthCheckWorkflowContext extends WorkflowContext {
  healthMonitor?: HealthMonitor;
  lastHealthCheck?: Date;
  alertThresholds?: {
    responseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface HealthAlert {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🩺 HEALTH CHECK WORKFLOW STEPS
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export class HealthCheckWorkflowSteps {
  /**
   * System Health Check Step
   */
  static systemHealthCheck(): WorkflowStep {
    return {
      id: 'health_system_check',
      name: 'System Health Check',
      description: 'Perform comprehensive system health check',
      handler: async (ctx: Context, workflow: HealthCheckWorkflowContext) => {
        try {
          const healthMonitor =
            workflow.healthMonitor ||
            new HealthMonitor(['database', 'api', 'authentication', 'cache', 'monitoring']);

          const healthStatus = await healthMonitor.getSystemHealth();
          workflow.lastHealthCheck = new Date();

          const healthMessage = HealthCheckWorkflowSteps.formatHealthStatus(healthStatus);

          const keyboard = new InlineKeyboard()
            .text(`${UI_ELEMENTS.EMOJIS.LOADING} Refresh`, 'health_refresh')
            .text(`${UI_ELEMENTS.EMOJIS.CHART} Details`, 'health_details')
            .row()
            .text(`${UI_ELEMENTS.EMOJIS.SHIELD} Alerts`, 'health_alerts')
            .text(`${UI_ELEMENTS.EMOJIS.TARGET} Components`, 'health_components');

          await ctx.reply(healthMessage, {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          });
        } catch (error) {
          await ctx.reply(
            `❌ Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      },
      permissions: [
        ACCESS_LEVELS.OPS_ANALYST,
        ACCESS_LEVELS.QUEUE_MANAGER,
        ACCESS_LEVELS.OPS_DIRECTOR,
      ],
      nextSteps: ['health_component_check', 'health_alert_config', 'health_monitoring'],
    };
  }

  /**
   * Component-Specific Health Check Step
   */
  static componentHealthCheck(): WorkflowStep {
    return {
      id: 'health_component_check',
      name: 'Component Health Check',
      description: 'Check specific system component health',
      handler: async (ctx: Context, workflow: HealthCheckWorkflowContext) => {
        const components = ['database', 'api', 'authentication', 'cache', 'monitoring'];

        const keyboard = new InlineKeyboard();

        components.forEach((component, index) => {
          const emoji = HealthCheckWorkflowSteps.getComponentEmoji(component);
          keyboard.text(
            `${emoji} ${component.charAt(0).toUpperCase() + component.slice(1)}`,
            `health_component_${component}`
          );

          if ((index + 1) % 2 === 0) {
            keyboard.row();
          }
        });

        keyboard
          .row()
          .text(`${UI_ELEMENTS.EMOJIS.LOADING} Check All`, 'health_check_all')
          .text(`${UI_ELEMENTS.EMOJIS.BACK} Back`, 'health_back');

        await ctx.reply(
          `${UI_ELEMENTS.EMOJIS.TARGET} **Select Component to Check**\n\nChoose a system component to perform detailed health analysis:`,
          {
            reply_markup: keyboard,
            parse_mode: 'Markdown',
          }
        );
      },
      permissions: [
        ACCESS_LEVELS.OPS_ANALYST,
        ACCESS_LEVELS.QUEUE_MANAGER,
        ACCESS_LEVELS.OPS_DIRECTOR,
      ],
    };
  }

  /**
   * Health Alert Configuration Step
   */
  static healthAlertConfig(): WorkflowStep {
    return {
      id: 'health_alert_config',
      name: 'Health Alert Configuration',
      description: 'Configure health monitoring alerts',
      handler: async (ctx: Context, workflow: HealthCheckWorkflowContext) => {
        const currentThresholds = workflow.alertThresholds || {
          responseTime: 200,
          errorRate: 5.0,
          uptime: 99.5,
        };

        const configMessage = `
${UI_ELEMENTS.EMOJIS.SHIELD} **Health Alert Configuration**

${UI_ELEMENTS.EMOJIS.CLOCK} Response Time Threshold: ${currentThresholds.responseTime}ms
${UI_ELEMENTS.EMOJIS.WARNING} Error Rate Threshold: ${currentThresholds.errorRate}%
${UI_ELEMENTS.EMOJIS.CHART} Uptime Threshold: ${currentThresholds.uptime}%

Configure alert thresholds to receive notifications when system health degrades:
        `;

        const keyboard = new InlineKeyboard()
          .text(`${UI_ELEMENTS.EMOJIS.CLOCK} Response Time`, 'alert_response_time')
          .text(`${UI_ELEMENTS.EMOJIS.WARNING} Error Rate`, 'alert_error_rate')
          .row()
          .text(`${UI_ELEMENTS.EMOJIS.CHART} Uptime`, 'alert_uptime')
          .text(`${UI_ELEMENTS.EMOJIS.LOADING} Test Alerts`, 'alert_test')
          .row()
          .text(`${UI_ELEMENTS.EMOJIS.BACK} Back`, 'health_back');

        await ctx.reply(configMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      },
      permissions: [ACCESS_LEVELS.OPS_DIRECTOR],
    };
  }

  /**
   * Continuous Health Monitoring Step
   */
  static continuousMonitoring(): WorkflowStep {
    return {
      id: 'health_monitoring',
      name: 'Continuous Health Monitoring',
      description: 'Set up automated health monitoring',
      handler: async (ctx: Context, workflow: HealthCheckWorkflowContext) => {
        const monitoringMessage = `
${UI_ELEMENTS.EMOJIS.TARGET} **Continuous Health Monitoring**

${UI_ELEMENTS.STATUS_ICONS.PROCESSING} Status: Active
${UI_ELEMENTS.EMOJIS.CLOCK} Check Interval: 5 minutes
${UI_ELEMENTS.EMOJIS.SHIELD} Alert Threshold: Configured

Automated health monitoring is running in the background and will alert you of any system issues.

**Monitoring Features:**
${UI_ELEMENTS.EMOJIS.CHART} Real-time component health
${UI_ELEMENTS.EMOJIS.WARNING} Performance degradation alerts
${UI_ELEMENTS.EMOJIS.SHIELD} Security status monitoring
${UI_ELEMENTS.EMOJIS.TARGET} Automatic recovery attempts
        `;

        const keyboard = new InlineKeyboard()
          .text(`${UI_ELEMENTS.EMOJIS.LOADING} Pause Monitoring`, 'monitoring_pause')
          .text(`${UI_ELEMENTS.EMOJIS.PLAY} Resume Monitoring`, 'monitoring_resume')
          .row()
          .text(`${UI_ELEMENTS.EMOJIS.CHART} View Logs`, 'monitoring_logs')
          .text(`${UI_ELEMENTS.EMOJIS.BACK} Back`, 'health_back');

        await ctx.reply(monitoringMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        });
      },
      permissions: [
        ACCESS_LEVELS.OPS_ANALYST,
        ACCESS_LEVELS.QUEUE_MANAGER,
        ACCESS_LEVELS.OPS_DIRECTOR,
      ],
    };
  }

  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====
  // 🛠️ UTILITY METHODS
  // !==!==!==!==!==!==!==!==!==!==!==!==!==!====

  /**
   * Format health status for Telegram message
   */
  private static formatHealthStatus(healthStatus: any): string {
    const { status, components } = healthStatus;

    let message = `${UI_ELEMENTS.EMOJIS.SHIELD} **System Health Status**\n\n`;

    // Overall status
    const overallEmoji =
      status === 'healthy'
        ? UI_ELEMENTS.STATUS_ICONS.COMPLETED
        : status === 'degraded'
          ? UI_ELEMENTS.EMOJIS.WARNING
          : '❌';
    message += `Overall: ${overallEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n`;

    // Component status
    message += `**Components:**\n`;

    const componentChecks = [
      { name: 'API Gateway', key: 'api', emoji: '🌐' },
      { name: 'Authentication', key: 'authentication', emoji: '🔒' },
      { name: 'Database', key: 'database', emoji: '🗄️' },
      { name: 'Cache', key: 'cache', emoji: '⚡' },
      { name: 'Monitoring', key: 'monitoring', emoji: '📊' },
    ];

    componentChecks.forEach(check => {
      const component = components[check.key];
      const statusEmoji =
        component?.status === 'healthy' ? '✅' : component?.status === 'degraded' ? '⚠️' : '❌';
      message += `${statusEmoji} ${check.emoji} ${check.name}: ${component?.status || 'unknown'}\n`;
    });

    message += `\n${UI_ELEMENTS.EMOJIS.CLOCK} Last checked: ${new Date().toLocaleTimeString()}`;

    return message;
  }

  /**
   * Get component emoji
   */
  private static getComponentEmoji(component: string): string {
    const emojiMap: Record<string, string> = {
      database: '🗄️',
      api: '🌐',
      authentication: '🔒',
      cache: '⚡',
      monitoring: '📊',
    };
    return emojiMap[component] || '🔧';
  }

  /**
   * Create health alert from component status
   */
  static createHealthAlert(component: string, healthStatus: any): HealthAlert {
    const componentHealth = healthStatus.components[component];
    let severity: 'info' | 'warning' | 'critical' = 'info';
    let message = `${component} is ${componentHealth?.status || 'unknown'}`;

    if (componentHealth?.status === 'unhealthy') {
      severity = 'critical';
      message = `🚨 CRITICAL: ${component} is unhealthy - ${componentHealth.message}`;
    } else if (componentHealth?.status === 'degraded') {
      severity = 'warning';
      message = `⚠️ WARNING: ${component} is degraded - ${componentHealth.message}`;
    }

    return {
      component,
      status: componentHealth?.status || 'unknown',
      message,
      timestamp: new Date(),
      severity,
    };
  }
}

// !==!==!==!==!==!==!==!==!==!==!==!==!==!====
// 🤖 HEALTH CHECK COMMAND HANDLER
// !==!==!==!==!==!==!==!==!==!==!==!==!==!====

export class HealthCheckCommandHandler {
  private healthMonitor: HealthMonitor;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.healthMonitor = new HealthMonitor([
      'database',
      'api',
      'authentication',
      'cache',
      'monitoring',
    ]);
  }

  /**
   * Handle /health command
   */
  async handleHealthCommand(ctx: Context, workflow: HealthCheckWorkflowContext): Promise<void> {
    // Check if we have session data (from callback queries)
    if (workflow.sessionData?.command) {
      const { command, args = [] } = workflow.sessionData;

      switch (command) {
        case 'component':
          await this.checkSpecificComponent(ctx, args[0] || 'database');
          break;
        case 'monitor':
          await this.handleMonitoringCommand(ctx, args);
          break;
        default:
          await this.performQuickHealthCheck(ctx);
      }
      return;
    }

    // Handle regular command arguments
    const args = ctx.message?.text?.split(' ').slice(1) || [];

    if (args.length === 0) {
      // Default health check
      await this.performQuickHealthCheck(ctx);
    } else if (args[0] === 'component' && args[1]) {
      // Component-specific check
      await this.checkSpecificComponent(ctx, args[1]);
    } else if (args[0] === 'monitor') {
      // Start/stop monitoring
      await this.handleMonitoringCommand(ctx, args.slice(1));
    } else {
      await ctx.reply('Usage: /health [component <name>] [monitor <start|stop>]');
    }
  }

  /**
   * Perform quick health check
   */
  private async performQuickHealthCheck(ctx: Context): Promise<void> {
    try {
      const healthStatus = await this.healthMonitor.getSystemHealth();

      const message = this.formatQuickHealthMessage(healthStatus);

      const keyboard = new InlineKeyboard()
        .text(`${UI_ELEMENTS.EMOJIS.LOADING} Refresh`, 'health_quick_refresh')
        .text(`${UI_ELEMENTS.EMOJIS.CHART} Full Check`, 'health_full_check')
        .row()
        .text(`${UI_ELEMENTS.EMOJIS.SHIELD} Monitor`, 'health_start_monitor')
        .text(`${UI_ELEMENTS.EMOJIS.TARGET} Components`, 'health_component_menu');

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      await ctx.reply(
        `❌ Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check specific component
   */
  private async checkSpecificComponent(ctx: Context, componentName: string): Promise<void> {
    try {
      const health = await this.healthMonitor.checkComponent(componentName);

      const emoji = HealthCheckWorkflowSteps.getComponentEmoji(componentName);
      const statusEmoji =
        health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';

      const message = `
${statusEmoji} **${componentName.charAt(0).toUpperCase() + componentName.slice(1)} Health Check**

${emoji} Status: ${health.status.toUpperCase()}
📝 Message: ${health.message}

${
  health.metrics
    ? `📊 Metrics:
• Response Time: ${health.metrics.responseTime}ms
• CPU Usage: ${health.metrics.cpuUsage.toFixed(1)}%
• Memory Usage: ${health.metrics.memoryUsage.toFixed(1)}%
• Active Connections: ${health.metrics.activeConnections}
• Timestamp: ${new Date(health.metrics.timestamp).toLocaleTimeString()}`
    : ''
}
      `;

      const keyboard = new InlineKeyboard()
        .text(`${UI_ELEMENTS.EMOJIS.LOADING} Recheck`, `health_recheck_${componentName}`)
        .text(`${UI_ELEMENTS.EMOJIS.BACK} Back to Health`, 'health_main_menu');

      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      await ctx.reply(
        `❌ Component check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle monitoring commands
   */
  private async handleMonitoringCommand(ctx: Context, args: string[]): Promise<void> {
    const action = args[0];
    const userId = ctx.from?.id.toString() || '';

    if (action === 'start') {
      if (this.activeMonitors.has(userId)) {
        await ctx.reply('📊 Monitoring is already active for you.');
        return;
      }

      // Start monitoring every 5 minutes
      const monitorInterval = setInterval(
        async () => {
          try {
            const healthStatus = await this.healthMonitor.getSystemHealth();

            // Check for alerts
            const alerts = this.checkForAlerts(healthStatus);
            if (alerts.length > 0) {
              const alertMessage = alerts.map(alert => alert.message).join('\n');
              await ctx.reply(`🚨 **Health Alerts**\n\n${alertMessage}`, {
                parse_mode: 'Markdown',
              });
            }
          } catch (error) {
            console.error('Monitoring error:', error);
          }
        },
        5 * 60 * 1000
      ); // 5 minutes

      this.activeMonitors.set(userId, monitorInterval);

      await ctx.reply(
        '✅ Health monitoring started!\n\n📊 Monitoring every 5 minutes\n🔔 You will receive alerts for health issues\n\nUse `/health monitor stop` to stop monitoring.',
        { parse_mode: 'Markdown' }
      );
    } else if (action === 'stop') {
      const monitorInterval = this.activeMonitors.get(userId);
      if (monitorInterval) {
        clearInterval(monitorInterval);
        this.activeMonitors.delete(userId);
        await ctx.reply('🛑 Health monitoring stopped.');
      } else {
        await ctx.reply('📊 No active monitoring found for you.');
      }
    } else {
      await ctx.reply('Usage: /health monitor <start|stop>');
    }
  }

  /**
   * Format quick health message
   */
  private formatQuickHealthMessage(healthStatus: any): string {
    const { status, components } = healthStatus;

    const overallEmoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';

    let message = `${overallEmoji} **System Health: ${status.charAt(0).toUpperCase() + status.slice(1)}**\n\n`;

    // Quick component status
    const quickComponents = [
      { name: 'API', key: 'api', emoji: '🌐' },
      { name: 'DB', key: 'database', emoji: '🗄️' },
      { name: 'Auth', key: 'authentication', emoji: '🔒' },
      { name: 'Cache', key: 'cache', emoji: '⚡' },
    ];

    quickComponents.forEach(comp => {
      const component = components[comp.key];
      const statusEmoji =
        component?.status === 'healthy' ? '✅' : component?.status === 'degraded' ? '⚠️' : '❌';
      message += `${statusEmoji} ${comp.emoji} ${comp.name}: ${component?.status || 'unknown'}\n`;
    });

    message += `\n${UI_ELEMENTS.EMOJIS.CLOCK} ${new Date().toLocaleTimeString()}`;

    return message;
  }

  /**
   * Check for health alerts
   */
  private checkForAlerts(healthStatus: any): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const components = healthStatus.components;

    Object.keys(components).forEach(componentName => {
      const component = components[componentName];
      if (component.status !== 'healthy') {
        alerts.push(HealthCheckWorkflowSteps.createHealthAlert(componentName, healthStatus));
      }
    });

    return alerts;
  }

  /**
   * Clean up monitoring
   */
  cleanup(userId?: string): void {
    if (userId) {
      const monitorInterval = this.activeMonitors.get(userId);
      if (monitorInterval) {
        clearInterval(monitorInterval);
        this.activeMonitors.delete(userId);
      }
    } else {
      // Clean up all monitors
      this.activeMonitors.forEach(interval => clearInterval(interval));
      this.activeMonitors.clear();
    }
  }
}

export default HealthCheckCommandHandler;
