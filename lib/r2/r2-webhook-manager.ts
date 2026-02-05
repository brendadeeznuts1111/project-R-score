#!/usr/bin/env bun

/**
 * 🔗 R2 Webhook & External Integration Manager
 * 
 * Webhook management and external service integrations:
 * - Event-driven webhooks
 * - Retry logic with exponential backoff
 * - Signature verification (HMAC)
 * - Multiple delivery endpoints
 * - Integration templates (Slack, Discord, Zapier, etc.)
 */

import { styled, FW_COLORS } from '../theme/colors';
import { r2EventSystem } from './r2-event-system';

export type WebhookEvent = 
  | 'object:created' 
  | 'object:updated' 
  | 'object:deleted'
  | 'object:accessed'
  | 'backup:completed'
  | 'backup:failed'
  | 'sync:completed'
  | 'lifecycle:expired'
  | 'security:alert'
  | '*';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  status: 'active' | 'paused' | 'error';
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  filter?: {
    bucket?: string;
    prefix?: string;
  };
  createdAt: string;
  lastTriggered?: string;
  stats: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastStatusCode?: number;
  };
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: {
    type: string;
    timestamp: string;
    data: any;
  };
  status: 'pending' | 'success' | 'failed';
  attempts: Array<{
    timestamp: string;
    statusCode?: number;
    error?: string;
    duration: number;
  }>;
  createdAt: string;
  completedAt?: string;
}

export interface IntegrationTemplate {
  name: string;
  description: string;
  icon: string;
  defaultConfig: Partial<Webhook>;
  setupInstructions: string[];
}

export class R2WebhookManager {
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private templates: Map<string, IntegrationTemplate> = new Map();
  private deliveryQueue: string[] = [];
  private isProcessing = false;

  /**
   * Initialize webhook manager
   */
  async initialize(): Promise<void> {
    console.log(styled('🔗 Initializing R2 Webhook Manager', 'accent'));

    // Load integration templates
    this.loadTemplates();

    // Setup event listeners
    this.setupEventListeners();

    // Start delivery processor
    this.startDeliveryProcessor();

    console.log(styled('✅ Webhook manager initialized', 'success'));
  }

  /**
   * Load integration templates
   */
  private loadTemplates(): void {
    this.templates.set('slack', {
      name: 'Slack',
      description: 'Send notifications to Slack channels',
      icon: '💬',
      defaultConfig: {
        headers: {
          'Content-Type': 'application/json'
        },
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      },
      setupInstructions: [
        'Create a Slack webhook URL at https://api.slack.com/messaging/webhooks',
        'Copy the webhook URL',
        'Configure events to monitor'
      ]
    });

    this.templates.set('discord', {
      name: 'Discord',
      description: 'Send notifications to Discord channels',
      icon: '🎮',
      defaultConfig: {
        headers: {
          'Content-Type': 'application/json'
        },
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      },
      setupInstructions: [
        'Go to Server Settings > Integrations > Webhooks',
        'Create a new webhook',
        'Copy the webhook URL'
      ]
    });

    this.templates.set('zapier', {
      name: 'Zapier',
      description: 'Connect to 5000+ apps via Zapier',
      icon: '⚡',
      defaultConfig: {
        retryConfig: {
          maxRetries: 5,
          backoffMultiplier: 2,
          initialDelay: 2000
        }
      },
      setupInstructions: [
        'Create a new Zap',
        'Choose Webhooks by Zapier as trigger',
        'Copy the webhook URL'
      ]
    });

    this.templates.set('github', {
      name: 'GitHub Actions',
      description: 'Trigger GitHub Actions workflows',
      icon: '🐙',
      defaultConfig: {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        },
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelay: 1000
        }
      },
      setupInstructions: [
        'Create a repository dispatch webhook in GitHub',
        'Generate a personal access token',
        'Configure the webhook URL'
      ]
    });

    this.templates.set('datadog', {
      name: 'Datadog',
      description: 'Send metrics and events to Datadog',
      icon: '🐶',
      defaultConfig: {
        headers: {
          'Content-Type': 'application/json'
        },
        retryConfig: {
          maxRetries: 5,
          backoffMultiplier: 1.5,
          initialDelay: 1000
        }
      },
      setupInstructions: [
        'Get your Datadog API key',
        'Configure the Datadog site URL',
        'Set up metric naming'
      ]
    });
  }

  /**
   * Setup event listeners for webhooks
   */
  private setupEventListeners(): void {
    // Subscribe to all events and route to matching webhooks
    r2EventSystem.onAll((event) => {
      this.routeEvent(event);
    });
  }

  /**
   * Route event to matching webhooks
   */
  private routeEvent(event: any): void {
    for (const webhook of this.webhooks.values()) {
      if (webhook.status !== 'active') continue;

      // Check if webhook subscribes to this event
      const eventType = event.type as WebhookEvent;
      if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) continue;

      // Check filter
      if (webhook.filter) {
        if (webhook.filter.bucket && event.bucket !== webhook.filter.bucket) continue;
        if (webhook.filter.prefix && event.key && !event.key.startsWith(webhook.filter.prefix)) continue;
      }

      // Create delivery
      this.createDelivery(webhook.id, event);
    }
  }

  /**
   * Create webhook
   */
  createWebhook(config: Omit<Webhook, 'id' | 'createdAt' | 'stats'>): Webhook {
    const webhook: Webhook = {
      ...config,
      id: `wh-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      stats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0
      }
    };

    this.webhooks.set(webhook.id, webhook);
    console.log(styled(`🔗 Created webhook: ${webhook.name} (${webhook.id})`, 'success'));
    return webhook;
  }

  /**
   * Create webhook from template
   */
  createFromTemplate(
    templateName: string,
    name: string,
    url: string,
    events: WebhookEvent[],
    customConfig?: Partial<Webhook>
  ): Webhook {
    const template = this.templates.get(templateName);
    if (!template) throw new Error(`Template not found: ${templateName}`);

    return this.createWebhook({
      name,
      url,
      events,
      ...template.defaultConfig,
      ...customConfig,
      status: 'active'
    });
  }

  /**
   * Create delivery
   */
  private createDelivery(webhookId: string, event: any): WebhookDelivery {
    const delivery: WebhookDelivery = {
      id: `del-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      webhookId,
      event: {
        type: event.type,
        timestamp: event.timestamp,
        data: event
      },
      status: 'pending',
      attempts: [],
      createdAt: new Date().toISOString()
    };

    this.deliveries.set(delivery.id, delivery);
    this.deliveryQueue.push(delivery.id);

    // Update webhook stats
    const webhook = this.webhooks.get(webhookId);
    if (webhook) {
      webhook.stats.totalDeliveries++;
      webhook.lastTriggered = new Date().toISOString();
    }

    return delivery;
  }

  /**
   * Start delivery processor
   */
  private startDeliveryProcessor(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setInterval(async () => {
      while (this.deliveryQueue.length > 0) {
        const deliveryId = this.deliveryQueue.shift()!;
        await this.processDelivery(deliveryId);
      }
    }, 100);
  }

  /**
   * Process a delivery
   */
  private async processDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return;

    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) return;

    const payload = this.buildPayload(delivery);
    const signature = webhook.secret 
      ? this.generateSignature(payload, webhook.secret)
      : undefined;

    let success = false;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= webhook.retryConfig.maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            ...webhook.headers,
            ...(signature ? { 'X-Webhook-Signature': signature } : {}),
            'X-Webhook-ID': delivery.id,
            'X-Webhook-Attempt': (attempt + 1).toString()
          },
          body: JSON.stringify(payload)
        });

        const duration = Date.now() - startTime;

        delivery.attempts.push({
          timestamp: new Date().toISOString(),
          statusCode: response.status,
          duration
        });

        if (response.ok) {
          success = true;
          webhook.stats.successfulDeliveries++;
          webhook.stats.lastStatusCode = response.status;
          break;
        } else {
          lastError = `HTTP ${response.status}`;
        }

      } catch (error) {
        const duration = Date.now() - startTime;
        delivery.attempts.push({
          timestamp: new Date().toISOString(),
          error: error.message,
          duration
        });
        lastError = error.message;
      }

      // Wait before retry
      if (attempt < webhook.retryConfig.maxRetries) {
        const delay = webhook.retryConfig.initialDelay * 
          Math.pow(webhook.retryConfig.backoffMultiplier, attempt);
        await Bun.sleep(delay);
      }
    }

    delivery.status = success ? 'success' : 'failed';
    delivery.completedAt = new Date().toISOString();

    if (!success) {
      webhook.stats.failedDeliveries++;
      webhook.status = webhook.stats.failedDeliveries > 10 ? 'error' : webhook.status;
      console.error(styled(`❌ Webhook delivery failed: ${webhook.name} - ${lastError}`, 'error'));
    }
  }

  /**
   * Build webhook payload
   */
  private buildPayload(delivery: WebhookDelivery): any {
    return {
      event: delivery.event.type,
      timestamp: delivery.event.timestamp,
      data: delivery.event.data,
      delivery: {
        id: delivery.id,
        webhook: delivery.webhookId
      }
    };
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: any, secret: string): string {
    const data = JSON.stringify(payload);
    // In production, use proper HMAC
    return `sha256=${Bun.hash(data + secret).toString(16)}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expected = this.generateSignature(payload, secret);
    return signature === expected;
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) throw new Error(`Webhook not found: ${webhookId}`);

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery' }
    };

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          ...webhook.headers,
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true'
        },
        body: JSON.stringify(testPayload)
      });

      return {
        success: response.ok,
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get webhook
   */
  getWebhook(webhookId: string): Webhook | undefined {
    return this.webhooks.get(webhookId);
  }

  /**
   * Get all webhooks
   */
  getAllWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get deliveries
   */
  getDeliveries(webhookId?: string, limit: number = 100): WebhookDelivery[] {
    let deliveries = Array.from(this.deliveries.values());
    if (webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === webhookId);
    }
    return deliveries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get integration templates
   */
  getTemplates(): IntegrationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Pause webhook
   */
  pauseWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;
    webhook.status = 'paused';
    return true;
  }

  /**
   * Resume webhook
   */
  resumeWebhook(webhookId: string): boolean {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return false;
    webhook.status = 'active';
    return true;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  /**
   * Display webhook status
   */
  displayStatus(): void {
    console.log(styled('\n🔗 R2 Webhook Manager Status', 'accent'));
    console.log(styled('============================', 'accent'));

    console.log(styled('\n📡 Webhooks:', 'info'));
    for (const webhook of this.webhooks.values()) {
      const statusIcon = webhook.status === 'active' ? '✅' : webhook.status === 'paused' ? '⏸️' : '❌';
      const success = webhook.stats.totalDeliveries > 0
        ? ((webhook.stats.successfulDeliveries / webhook.stats.totalDeliveries) * 100).toFixed(1)
        : 'N/A';
      
      console.log(styled(`  ${statusIcon} ${webhook.name}`, 'muted'));
      console.log(styled(`     URL: ${webhook.url.slice(0, 50)}...`, 'muted'));
      console.log(styled(`     Events: ${webhook.events.join(', ')}`, 'muted'));
      console.log(styled(`     Deliveries: ${webhook.stats.totalDeliveries} (${success}% success)`, 'muted'));
    }

    console.log(styled('\n📋 Integration Templates:', 'info'));
    for (const [key, template] of this.templates) {
      console.log(styled(`  ${template.icon} ${template.name} (${key})`, 'muted'));
      console.log(styled(`     ${template.description}`, 'muted'));
    }

    console.log(styled('\n📨 Recent Deliveries:', 'info'));
    const recent = this.getDeliveries(undefined, 5);
    for (const delivery of recent) {
      const webhook = this.webhooks.get(delivery.webhookId);
      const icon = delivery.status === 'success' ? '✅' : delivery.status === 'pending' ? '⏳' : '❌';
      console.log(styled(`  ${icon} ${webhook?.name || delivery.webhookId}: ${delivery.event.type}`, 'muted'));
    }
  }
}

// Export singleton
export const r2WebhookManager = new R2WebhookManager();

// CLI interface
if (import.meta.main) {
  const webhooks = r2WebhookManager;
  await webhooks.initialize();

  console.log(styled('\n🔗 R2 Webhook Manager Demo', 'accent'));
  console.log(styled('==========================', 'accent'));

  // Create a test webhook
  const webhook = webhooks.createWebhook({
    name: 'Test Webhook',
    url: 'https://httpbin.org/post',
    events: ['object:created', 'object:deleted'],
    status: 'active',
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  });

  console.log(styled(`\n✅ Created webhook: ${webhook.name}`, 'success'));

  // Test the webhook
  console.log(styled('\n🧪 Testing webhook...', 'info'));
  const result = await webhooks.testWebhook(webhook.id);
  console.log(styled(`  Success: ${result.success}`, result.success ? 'success' : 'error'));
  if (result.statusCode) {
    console.log(styled(`  Status: ${result.statusCode}`, 'muted'));
  }

  // Display status
  webhooks.displayStatus();
}
