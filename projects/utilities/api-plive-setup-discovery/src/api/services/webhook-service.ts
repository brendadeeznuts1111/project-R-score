// Bun-native: use fetch() instead of axios
import { logger } from '../utils/logger';

interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[];
  retryAttempts: number;
  timeout: number;
}

export class WebhookService {
  private webhooks: Map<string, WebhookConfig> = new Map();

  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config);
    logger.info('Webhook registered', { webhookId: id, url: config.url });
  }

  unregisterWebhook(id: string): void {
    this.webhooks.delete(id);
    logger.info('Webhook unregistered', { webhookId: id });
  }

  async triggerEvent(event: string, data: any): Promise<void> {
    const promises = Array.from(this.webhooks.values())
      .filter(webhook => webhook.events.includes(event) || webhook.events.includes('*'))
      .map(webhook => this.sendWebhook(webhook, event, data));

    await Promise.allSettled(promises);
  }

  private async sendWebhook(webhook: WebhookConfig, event: string, data: any): Promise<void> {
    const payload: any = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    // Add signature if secret is provided
    if (webhook.secret) {
      const signature = this.createSignature(payload, webhook.secret);
      payload.signature = signature;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

    for (let attempt = 1; attempt <= webhook.retryAttempts; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BettingWorkflowAPI-Webhook/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        logger.info('Webhook delivered successfully', {
          url: webhook.url,
          event,
          attempt
        });
        return;
      } catch (error: any) {
        logger.warn('Webhook delivery failed', {
          url: webhook.url,
          event,
          attempt,
          error: error.message
        });

        if (attempt === webhook.retryAttempts) {
          logger.error('Webhook delivery failed permanently', {
            url: webhook.url,
            event
          });
        }

        // Exponential backoff
        await Bun.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  private createSignature(payload: any, secret: string): string {
    // Bun-native HMAC using CryptoHasher
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(JSON.stringify(payload));
    const hasher = new Bun.CryptoHasher('sha256', keyData);
    hasher.update(msgData);
    return hasher.digest('hex');
  }

  getRegisteredWebhooks(): Array<{ id: string; config: WebhookConfig }> {
    return Array.from(this.webhooks.entries()).map(([id, config]) => ({ id, config }));
  }
}
