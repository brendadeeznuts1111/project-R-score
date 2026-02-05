#!/usr/bin/env bun

const inspectCustom = Symbol.for("Bun.inspect.custom");

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export interface SMSMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  direction: 'outbound' | 'inbound';
  dateCreated: string;
  dateSent?: string;
  dateUpdated: string;
  price?: number;
  priceUnit?: string;
  errorCode?: string;
  errorMessage?: string;
  numSegments: number;

  [inspectCustom]: () => string;
}

export interface SMSStatusCallback {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  Body?: string;
  NumSegments?: string;
  Price?: string;
  PriceUnit?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export class SMSGateway {
  private config: SMSConfig;
  private baseUrl: string;

  constructor(config: SMSConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.twilio.com/2010-04-01'
      : 'https://api.twilio.com/2010-04-01'; // Twilio doesn't have separate sandbox API
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, body: string, options: {
    statusCallback?: string;
    applicationSid?: string;
    maxPrice?: number;
    provideFeedback?: boolean;
  } = {}): Promise<SMSMessage> {
    const formData = new URLSearchParams({
      To: this.formatPhoneNumber(to),
      From: this.config.fromNumber,
      Body: body,
      ...(options.statusCallback && { StatusCallback: options.statusCallback }),
      ...(options.applicationSid && { ApplicationSid: options.applicationSid }),
      ...(options.maxPrice && { MaxPrice: options.maxPrice.toString() }),
      ...(options.provideFeedback && { ProvideFeedback: 'true' })
    });

    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SMS send failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return this.formatMessage(data);
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(recipients: string[], body: string, options: {
    statusCallback?: string;
    delay?: number; // milliseconds between messages
  } = {}): Promise<SMSMessage[]> {
    const messages: SMSMessage[] = [];
    const delay = options.delay || 100; // Default 100ms delay

    for (const recipient of recipients) {
      try {
        const message = await this.sendSMS(recipient, body, {
          statusCallback: options.statusCallback
        });
        messages.push(message);

        // Rate limiting delay
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Failed to send SMS to ${recipient}:`, error);
        // Continue with other recipients
      }
    }

    return messages;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<SMSMessage> {
    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}/Messages/${messageId}.json`, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get message: ${response.statusText}`);
    }

    const data = await response.json();
    return this.formatMessage(data);
  }

  /**
   * Get message list
   */
  async getMessages(options: {
    to?: string;
    from?: string;
    dateSent?: string;
    limit?: number;
    pageSize?: number;
  } = {}): Promise<SMSMessage[]> {
    const params = new URLSearchParams({
      ...(options.to && { To: options.to }),
      ...(options.from && { From: options.from }),
      ...(options.dateSent && { DateSent: options.dateSent }),
      ...(options.limit && { Limit: options.limit.toString() }),
      ...(options.pageSize && { PageSize: options.pageSize.toString() })
    });

    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json?${params}`, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages.map((msg: any) => this.formatMessage(msg));
  }

  /**
   * Update message (limited operations)
   */
  async updateMessage(messageId: string, body: string): Promise<SMSMessage> {
    const formData = new URLSearchParams({
      Body: body
    });

    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}/Messages/${messageId}.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Message update failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return this.formatMessage(data);
  }

  /**
   * Delete message (only possible for queued messages)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}/Messages/${messageId}.json`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`
      }
    });

    return response.ok;
  }

  /**
   * Get account usage
   */
  async getUsage(): Promise<{
    messagesSent: number;
    messagesReceived: number;
    price: number;
    currency: string;
  }> {
    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}/Usage/Records.json?Category=sms`, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get usage: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      messagesSent: parseInt(data.usage_records?.[0]?.count || '0'),
      messagesReceived: 0, // Would need separate API call
      price: parseFloat(data.usage_records?.[0]?.price || '0'),
      currency: data.usage_records?.[0]?.price_unit || 'USD'
    };
  }

  /**
   * Handle status callback from Twilio
   */
  handleStatusCallback(callback: SMSStatusCallback): SMSMessage | null {
    // This would be called by your webhook endpoint
    // Update local message status based on callback
    console.log(`SMS Status Update: ${callback.MessageSid} -> ${callback.MessageStatus}`);

    // In a real implementation, you'd update your database
    // For now, just return a formatted message
    return {
      id: callback.MessageSid,
      to: callback.To,
      from: callback.From,
      body: callback.Body || '',
      status: this.mapTwilioStatus(callback.MessageStatus),
      direction: 'outbound',
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
      numSegments: parseInt(callback.NumSegments || '1'),
      price: callback.Price ? parseFloat(callback.Price) : undefined,
      priceUnit: callback.PriceUnit,
      errorCode: callback.ErrorCode,
      errorMessage: callback.ErrorMessage,

      [inspectCustom]: function() {
        const statusColors = {
          sent: '\x1b[32m',
          delivered: '\x1b[32m',
          failed: '\x1b[31m',
          undelivered: '\x1b[31m',
          queued: '\x1b[33m',
          sending: '\x1b[33m'
        };

        const statusColor = statusColors[this.status as keyof typeof statusColors] || '\x1b[37m';

        return [
          `${statusColor}${this.status.toUpperCase()}`.padEnd(12),
          this.to.padEnd(15),
          this.body.substring(0, 30).padEnd(30),
          this.id.substring(0, 12).padEnd(12),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Format phone number for Twilio
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Add +1 for US numbers if not present
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    } else if (!phone.startsWith('+')) {
      return `+${digits}`;
    }

    return phone;
  }

  /**
   * Map Twilio status to our enum
   */
  private mapTwilioStatus(twilioStatus: string): SMSMessage['status'] {
    const statusMap: Record<string, SMSMessage['status']> = {
      'queued': 'queued',
      'sending': 'sending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'undelivered',
      'failed': 'failed'
    };

    return statusMap[twilioStatus] || 'failed';
  }

  /**
   * Format message data from Twilio API
   */
  private formatMessage(data: any): SMSMessage {
    return {
      id: data.sid,
      to: data.to,
      from: data.from,
      body: data.body,
      status: this.mapTwilioStatus(data.status),
      direction: data.direction,
      dateCreated: data.date_created,
      dateSent: data.date_sent,
      dateUpdated: data.date_updated,
      price: data.price ? parseFloat(data.price) : undefined,
      priceUnit: data.price_unit,
      errorCode: data.error_code,
      errorMessage: data.error_message,
      numSegments: parseInt(data.num_segments || '1'),

      [inspectCustom]: function() {
        const statusColors = {
          sent: '\x1b[32m',
          delivered: '\x1b[32m',
          failed: '\x1b[31m',
          undelivered: '\x1b[31m',
          queued: '\x1b[33m',
          sending: '\x1b[33m'
        };

        const directionIcon = this.direction === 'inbound' ? '📥' : '📤';
        const statusColor = statusColors[this.status as keyof typeof statusColors] || '\x1b[37m';

        return [
          directionIcon.padEnd(2),
          `${statusColor}${this.status.toUpperCase()}`.padEnd(12),
          this.to.padEnd(15),
          this.from.padEnd(15),
          this.body.substring(0, 25).padEnd(25),
          this.numSegments.toString().padStart(2),
          this.id.substring(0, 10).padEnd(10),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<{
    sid: string;
    friendlyName: string;
    status: string;
    type: string;
    balance: string;
    currency: string;
  }> {
    const response = await fetch(`${this.baseUrl}/Accounts/${this.config.accountSid}.json`, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get account info: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      sid: data.sid,
      friendlyName: data.friendly_name,
      status: data.status,
      type: data.type,
      balance: data.balance,
      currency: 'USD' // Twilio balance is always in USD
    };
  }
}