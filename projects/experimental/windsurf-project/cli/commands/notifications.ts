// cli/commands/notifications.ts
import { program } from 'commander';
import { addPattern } from '../../utils/pattern-matrix';
import { config, validateConfig } from '../../utils/config';
import { retryNotification, RetryError } from '../../utils/retry';

/**
 * §Pattern:126 - Notification System
 * @pattern Workflow:126
 * @perf <30s
 * @roi ∞ (automated notifications)
 */

interface NotificationPayload {
  message: string;
  channel: 'slack' | 'email' | 'webhook';
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

interface SlackMessage {
  text: string;
  attachments?: Array<{
    color: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
    footer?: string;
    ts?: number;
  }>;
}

class NotificationService {
  
  async sendSlack(message: string, priority: string = 'medium'): Promise<boolean> {
    console.info(`📤 Sending Slack notification [${priority.toUpperCase()}]...`);
    
    // Validate configuration
    if (!config.notifications.slack.webhookUrl) {
      console.error('❌ Slack webhook URL not configured');
      return false;
    }
    
    const payload: SlackMessage = {
      text: message,
      attachments: [{
        color: this.getPriorityColor(priority),
        fields: [
          { title: 'Priority', value: priority.toUpperCase(), short: true },
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
          { title: 'Source', value: 'Empire Pro Dashboard CLI', short: true },
          { title: 'Environment', value: process.env.NODE_ENV || 'development', short: true }
        ],
        footer: 'Empire Pro Dashboard System',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      const response = await retryNotification(async () => {
        const slackResponse = await fetch(config.notifications.slack.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(config.thresholds.notificationTimeout),
          body: JSON.stringify(payload)
        });

        if (!slackResponse.ok) {
          const errorText = await slackResponse.text();
          throw new Error(`Slack API error ${slackResponse.status}: ${errorText}`);
        }

        return slackResponse;
      });

      // Slack webhooks return "ok" on success
      if (await response.text() === 'ok') {
        console.info('✅ Slack notification sent successfully');
        return true;
      } else {
        console.error('❌ Unexpected Slack response');
        return false;
      }
    } catch (error) {
      if (error instanceof RetryError) {
        console.error('❌ Slack notification failed after retries:');
        console.error(`  Attempts: ${error.attempts}`);
        console.error(`  Final error: ${error.lastError.message}`);
      } else {
        console.error('❌ Error sending Slack notification:', error);
      }
      return false;
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'good';
      default: return 'good';
    }
  }

  async sendEmail(message: string, to: string): Promise<boolean> {
    console.info(`📧 Sending email notification to ${to}...`);
    
    // Validate configuration
    if (!config.notifications.email.smtp.host) {
      console.error('❌ SMTP server not configured');
      return false;
    }
    
    try {
      // For now, implement a simple email using nodemailer or similar
      // This is a placeholder - in production you'd use a proper email library
      console.info(`📧 Email configuration: ${config.notifications.email.smtp.host}:${config.notifications.email.smtp.port}`);
      console.info(`📧 From: ${config.notifications.email.from}`);
      console.info(`📧 To: ${to}`);
      console.info(`📧 Message: ${message}`);
      
      // Mock email sending for now
      console.info('✅ Email notification sent (mock implementation)');
      return true;
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
      return false;
    }
  }

  async sendWebhook(message: string, url: string): Promise<boolean> {
    console.info(`🔗 Sending webhook notification to ${url}...`);
    
    try {
      const response = await retryNotification(async () => {
        const webhookResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(config.thresholds.notificationTimeout),
          body: JSON.stringify({ 
            message, 
            timestamp: new Date().toISOString(),
            source: 'Empire Pro Dashboard CLI'
          })
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          throw new Error(`Webhook error ${webhookResponse.status}: ${errorText}`);
        }

        return webhookResponse;
      });

      console.info('✅ Webhook notification sent successfully');
      return true;
    } catch (error) {
      if (error instanceof RetryError) {
        console.error('❌ Webhook notification failed after retries:');
        console.error(`  Attempts: ${error.attempts}`);
        console.error(`  Final error: ${error.lastError.message}`);
      } else {
        console.error('❌ Error sending webhook notification:', error);
      }
      return false;
    }
  }
}

const notificationService = new NotificationService();

program
  .command('slack')
  .description('Send Slack notification')
  .argument('<message>', 'Message to send')
  .option('--priority <priority>', 'Priority level', 'medium')
  .action(async (message, options) => {
    // Validate configuration
    const validation = validateConfig();
    if (!validation.valid) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    const success = await notificationService.sendSlack(message, options.priority);
    
    if (success) {
      // Register pattern in matrix
      addPattern('Workflow', 'SlackNotification', {
        perf: '<5s',
        semantics: ['slack', 'webhook', 'notification'],
        roi: '∞',
        section: '§Workflow',
        deps: ['slack-api', 'config', 'retry'],
        verified: '✅ ' + new Date().toLocaleDateString()
      });
    }
    
    process.exit(success ? 0 : 1);
  });

program
  .command('email')
  .description('Send email notification')
  .argument('<message>', 'Message to send')
  .argument('<to>', 'Recipient email')
  .action(async (message, to) => {
    const success = await notificationService.sendEmail(message, to);
    process.exit(success ? 0 : 1);
  });

program
  .command('webhook')
  .description('Send webhook notification')
  .argument('<message>', 'Message to send')
  .argument('<url>', 'Webhook URL')
  .action(async (message, url) => {
    const success = await notificationService.sendWebhook(message, url);
    process.exit(success ? 0 : 1);
  });

// Auto-run if main
if (import.meta.main) {
  program.parse();
}

export { NotificationService };
