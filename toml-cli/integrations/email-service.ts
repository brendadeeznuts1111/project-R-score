#!/usr/bin/env bun

const inspectCustom = Symbol.for("Bun.inspect.custom");

export interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'smtp' | 'sendgrid' | 'mailgun';
  credentials: {
    // OAuth2 for Gmail/Outlook
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;

    // SMTP credentials
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;

    // API keys for transactional services
    apiKey?: string;
    domain?: string;
  };
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export interface EmailMessage {
  id: string;
  threadId?: string;
  messageId: string;
  from: {
    name?: string;
    email: string;
  };
  to: Array<{
    name?: string;
    email: string;
  }>;
  cc?: Array<{
    name?: string;
    email: string;
  }>;
  bcc?: Array<{
    name?: string;
    email: string;
  }>;
  subject: string;
  body: {
    text?: string;
    html?: string;
  };
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: string; // base64 encoded
  }>;
  labels?: string[];
  isRead: boolean;
  isStarred: boolean;
  priority: 'low' | 'normal' | 'high';
  date: string;
  snippet?: string;

  [inspectCustom]: () => string;
}

export interface EmailDraft {
  id: string;
  message: Omit<EmailMessage, 'id' | 'threadId' | 'messageId' | 'date' | 'isRead' | 'isStarred'>;
}

export class EmailService {
  private config: EmailConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: EmailConfig) {
    this.config = config;
    if (config.credentials.accessToken) {
      this.accessToken = config.credentials.accessToken;
    }
  }

  /**
   * Send email
   */
  async sendEmail(email: {
    to: string | Array<{ name?: string; email: string }>;
    cc?: string | Array<{ name?: string; email: string }>;
    bcc?: string | Array<{ name?: string; email: string }>;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string; // base64
      type: string;
    }>;
    replyTo?: string;
  }): Promise<string> {
    switch (this.config.provider) {
      case 'gmail':
        return this.sendGmailEmail(email);
      case 'outlook':
        return this.sendOutlookEmail(email);
      case 'smtp':
        return this.sendSMTPEmail(email);
      case 'sendgrid':
        return this.sendSendGridEmail(email);
      case 'mailgun':
        return this.sendMailgunEmail(email);
      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }
  }

  /**
   * Send email via Gmail API
   */
  private async sendGmailEmail(email: any): Promise<string> {
    await this.ensureGmailAuth();

    const mimeMessage = this.buildMimeMessage(email);
    const encodedMessage = btoa(mimeMessage).replace(/\+/g, '-').replace(/\//g, '_');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!response.ok) {
      throw new Error(`Gmail send failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Send email via Outlook API
   */
  private async sendOutlookEmail(email: any): Promise<string> {
    await this.ensureOutlookAuth();

    const message = this.buildOutlookMessage(email);

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`Outlook send failed: ${response.statusText}`);
    }

    return 'sent'; // Outlook doesn't return message ID for sent emails
  }

  /**
   * Send email via SMTP
   */
  private async sendSMTPEmail(email: any): Promise<string> {
    // In a real implementation, you'd use a library like nodemailer
    // For now, simulate SMTP sending
    console.log('📧 Sending via SMTP:', {
      host: this.config.credentials.host,
      to: email.to,
      subject: email.subject
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));

    return `smtp-${Date.now()}`;
  }

  /**
   * Send email via SendGrid
   */
  private async sendSendGridEmail(email: any): Promise<string> {
    const sendGridMessage = {
      personalizations: [{
        to: this.normalizeRecipients(email.to),
        ...(email.cc && { cc: this.normalizeRecipients(email.cc) }),
        ...(email.bcc && { bcc: this.normalizeRecipients(email.bcc) })
      }],
      from: { email: this.config.credentials.username },
      subject: email.subject,
      content: [
        ...(email.text ? [{ type: 'text/plain', value: email.text }] : []),
        ...(email.html ? [{ type: 'text/html', value: email.html }] : [])
      ],
      ...(email.attachments && {
        attachments: email.attachments.map((att: any) => ({
          content: att.content,
          filename: att.filename,
          type: att.type
        }))
      })
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridMessage)
    });

    if (!response.ok) {
      throw new Error(`SendGrid send failed: ${response.statusText}`);
    }

    return `sg-${Date.now()}`;
  }

  /**
   * Send email via Mailgun
   */
  private async sendMailgunEmail(email: any): Promise<string> {
    const formData = new FormData();
    formData.append('from', `${this.config.credentials.username}@${this.config.credentials.domain}`);
    formData.append('to', this.formatRecipients(email.to));
    formData.append('subject', email.subject);

    if (email.cc) formData.append('cc', this.formatRecipients(email.cc));
    if (email.bcc) formData.append('bcc', this.formatRecipients(email.bcc));
    if (email.text) formData.append('text', email.text);
    if (email.html) formData.append('html', email.html);

    if (email.attachments) {
      email.attachments.forEach((att: any, index: number) => {
        const blob = new Blob([Buffer.from(att.content, 'base64')], { type: att.type });
        formData.append(`attachment`, blob, att.filename);
      });
    }

    const response = await fetch(`https://api.mailgun.net/v3/${this.config.credentials.domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${this.config.credentials.apiKey}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Mailgun send failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Get emails from inbox
   */
  async getEmails(options: {
    label?: string;
    maxResults?: number;
    q?: string; // Gmail search query
  } = {}): Promise<EmailMessage[]> {
    switch (this.config.provider) {
      case 'gmail':
        return this.getGmailEmails(options);
      case 'outlook':
        return this.getOutlookEmails(options);
      default:
        throw new Error(`Email retrieval not supported for ${this.config.provider}`);
    }
  }

  /**
   * Get emails from Gmail
   */
  private async getGmailEmails(options: any): Promise<EmailMessage[]> {
    await this.ensureGmailAuth();

    const params = new URLSearchParams({
      maxResults: (options.maxResults || 10).toString(),
      ...(options.label && { labelIds: options.label }),
      ...(options.q && { q: options.q })
    });

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Gmail fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    const messages: EmailMessage[] = [];

    for (const message of data.messages || []) {
      const fullMessage = await this.getGmailMessage(message.id);
      if (fullMessage) messages.push(fullMessage);
    }

    return messages;
  }

  /**
   * Get single Gmail message
   */
  private async getGmailMessage(messageId: string): Promise<EmailMessage | null> {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return this.parseGmailMessage(data);
  }

  /**
   * Get emails from Outlook
   */
  private async getOutlookEmails(options: any): Promise<EmailMessage[]> {
    await this.ensureOutlookAuth();

    const params = new URLSearchParams({
      $top: (options.maxResults || 10).toString(),
      ...(options.q && { $search: options.q })
    });

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Outlook fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map((msg: any) => this.parseOutlookMessage(msg));
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(messageId: string, read: boolean = true): Promise<void> {
    switch (this.config.provider) {
      case 'gmail':
        await this.markGmailAsRead(messageId, read);
        break;
      case 'outlook':
        await this.markOutlookAsRead(messageId, read);
        break;
      default:
        throw new Error(`Mark as read not supported for ${this.config.provider}`);
    }
  }

  /**
   * Delete email
   */
  async deleteEmail(messageId: string): Promise<void> {
    switch (this.config.provider) {
      case 'gmail':
        await this.deleteGmailEmail(messageId);
        break;
      case 'outlook':
        await this.deleteOutlookEmail(messageId);
        break;
      default:
        throw new Error(`Delete not supported for ${this.config.provider}`);
    }
  }

  /**
   * Ensure Gmail authentication
   */
  private async ensureGmailAuth(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && Date.now() > this.tokenExpiry)) {
      await this.refreshGmailToken();
    }
  }

  /**
   * Refresh Gmail OAuth token
   */
  private async refreshGmailToken(): Promise<void> {
    if (!this.config.credentials.refreshToken) {
      throw new Error('No refresh token available for Gmail');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.credentials.clientId!,
        client_secret: this.config.credentials.clientSecret!,
        refresh_token: this.config.credentials.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error(`Gmail token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
  }

  /**
   * Ensure Outlook authentication
   */
  private async ensureOutlookAuth(): Promise<void> {
    if (!this.accessToken || (this.tokenExpiry && Date.now() > this.tokenExpiry)) {
      await this.refreshOutlookToken();
    }
  }

  /**
   * Refresh Outlook OAuth token
   */
  private async refreshOutlookToken(): Promise<void> {
    if (!this.config.credentials.refreshToken) {
      throw new Error('No refresh token available for Outlook');
    }

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.credentials.clientId!,
        client_secret: this.config.credentials.clientSecret!,
        refresh_token: this.config.credentials.refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send'
      })
    });

    if (!response.ok) {
      throw new Error(`Outlook token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
  }

  /**
   * Build MIME message for Gmail
   */
  private buildMimeMessage(email: any): string {
    const boundary = `boundary_${Date.now()}`;
    const to = this.formatRecipients(email.to);
    const cc = email.cc ? `Cc: ${this.formatRecipients(email.cc)}\r\n` : '';
    const bcc = email.bcc ? `Bcc: ${this.formatRecipients(email.bcc)}\r\n` : '';

    let message = [
      `To: ${to}`,
      `Subject: ${email.subject}`,
      cc,
      bcc,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      email.text || '',
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      email.html || email.text || '',
      ``,
      `--${boundary}--`
    ].join('\r\n');

    return message;
  }

  /**
   * Build Outlook message
   */
  private buildOutlookMessage(email: any): any {
    return {
      subject: email.subject,
      body: {
        contentType: email.html ? 'HTML' : 'Text',
        content: email.html || email.text
      },
      toRecipients: this.normalizeRecipients(email.to).map((r: any) => ({
        emailAddress: { address: r.email, name: r.name }
      })),
      ...(email.cc && {
        ccRecipients: this.normalizeRecipients(email.cc).map((r: any) => ({
          emailAddress: { address: r.email, name: r.name }
        }))
      }),
      ...(email.attachments && {
        attachments: email.attachments.map((att: any) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.type,
          contentBytes: att.content
        }))
      })
    };
  }

  /**
   * Parse Gmail message
   */
  private parseGmailMessage(data: any): EmailMessage {
    const headers = data.payload.headers;
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

    return {
      id: data.id,
      threadId: data.threadId,
      messageId: getHeader('Message-ID'),
      from: this.parseEmailAddress(getHeader('From')),
      to: this.parseEmailAddresses(getHeader('To')),
      cc: getHeader('Cc') ? this.parseEmailAddresses(getHeader('Cc')) : undefined,
      bcc: getHeader('Bcc') ? this.parseEmailAddresses(getHeader('Bcc')) : undefined,
      subject: getHeader('Subject') || '',
      body: this.extractGmailBody(data.payload),
      labels: data.labelIds || [],
      isRead: !data.labelIds?.includes('UNREAD'),
      isStarred: data.labelIds?.includes('STARRED') || false,
      priority: 'normal', // Would need to parse X-Priority header
      date: new Date(parseInt(data.internalDate)).toISOString(),
      snippet: data.snippet,

      [inspectCustom]: function() {
        const readIcon = this.isRead ? '📖' : '📧';
        const starIcon = this.isStarred ? '⭐' : '☆';

        return [
          readIcon.padEnd(2),
          starIcon.padEnd(2),
          this.from.email.padEnd(25),
          this.subject.substring(0, 40).padEnd(40),
          new Date(this.date).toLocaleDateString().padEnd(12),
          this.id.substring(0, 10).padEnd(10),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Parse Outlook message
   */
  private parseOutlookMessage(data: any): EmailMessage {
    return {
      id: data.id,
      messageId: data.internetMessageId,
      from: {
        email: data.from.emailAddress.address,
        name: data.from.emailAddress.name
      },
      to: data.toRecipients?.map((r: any) => ({
        email: r.emailAddress.address,
        name: r.emailAddress.name
      })) || [],
      cc: data.ccRecipients?.map((r: any) => ({
        email: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      bcc: data.bccRecipients?.map((r: any) => ({
        email: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      subject: data.subject,
      body: {
        text: data.bodyPreview,
        html: data.body.contentType === 'HTML' ? data.body.content : undefined
      },
      isRead: data.isRead,
      isStarred: data.flag?.flagStatus === 'flagged',
      priority: data.importance?.toLowerCase() || 'normal',
      date: data.receivedDateTime,

      [inspectCustom]: function() {
        const readIcon = this.isRead ? '📖' : '📧';
        const starIcon = this.isStarred ? '⭐' : '☆';

        return [
          readIcon.padEnd(2),
          starIcon.padEnd(2),
          this.from.email.padEnd(25),
          this.subject.substring(0, 40).padEnd(40),
          new Date(this.date).toLocaleDateString().padEnd(12),
          this.id.substring(0, 10).padEnd(10),
          '\x1b[0m'
        ].join(' | ');
      }
    };
  }

  /**
   * Utility methods
   */
  private formatRecipients(recipients: any): string {
    const normalized = this.normalizeRecipients(recipients);
    return normalized.map(r => r.email).join(', ');
  }

  private normalizeRecipients(recipients: any): Array<{ email: string; name?: string }> {
    if (typeof recipients === 'string') {
      return [{ email: recipients }];
    }
    if (Array.isArray(recipients)) {
      return recipients.map(r =>
        typeof r === 'string' ? { email: r } : r
      );
    }
    return [recipients];
  }

  private parseEmailAddress(address: string): { email: string; name?: string } {
    const match = address.match(/^([^<]+)<([^>]+)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim()
      };
    }
    return { email: address.trim() };
  }

  private parseEmailAddresses(addresses: string): Array<{ email: string; name?: string }> {
    return addresses.split(',').map(addr => this.parseEmailAddress(addr));
  }

  private extractGmailBody(payload: any): { text?: string; html?: string } {
    // Simplified body extraction - would need more complex parsing for full implementation
    if (payload.body?.data) {
      return {
        text: atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      };
    }
    return {};
  }

  private async markGmailAsRead(messageId: string, read: boolean): Promise<void> {
    await this.ensureGmailAuth();

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        removeLabelIds: read ? ['UNREAD'] : [],
        addLabelIds: read ? [] : ['UNREAD']
      })
    });

    if (!response.ok) {
      throw new Error(`Gmail mark as read failed: ${response.statusText}`);
    }
  }

  private async markOutlookAsRead(messageId: string, read: boolean): Promise<void> {
    await this.ensureOutlookAuth();

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isRead: read
      })
    });

    if (!response.ok) {
      throw new Error(`Outlook mark as read failed: ${response.statusText}`);
    }
  }

  private async deleteGmailEmail(messageId: string): Promise<void> {
    await this.ensureGmailAuth();

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Gmail delete failed: ${response.statusText}`);
    }
  }

  private async deleteOutlookEmail(messageId: string): Promise<void> {
    await this.ensureOutlookAuth();

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Outlook delete failed: ${response.statusText}`);
    }
  }
}