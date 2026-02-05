/**
 * Fantasy42-Fire22 Email Support Worker
 * Processes support ticket emails and creates automated responses
 */

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
}

interface SupportTicket {
  id: string;
  customer_email: string;
  subject: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'resolved';
  created_at: string;
  tags: string[];
}

export default {
  async email(message: EmailMessage, env: any) {
    console.log(`📧 Processing support email from: ${message.from}`);

    try {
      // Extract ticket information
      const ticket = await createSupportTicket(message, env);

      // Analyze priority based on keywords
      const priority = analyzePriority(message.subject + ' ' + (message.text || ''));

      // Update ticket with priority
      await updateTicketPriority(ticket.id, priority, env);

      // Send automated response
      await sendAutoResponse(message, ticket, env);

      // Log to analytics
      await logEmailAnalytics(message, ticket, env);

      console.log(`✅ Support ticket created: ${ticket.id}`);
    } catch (error) {
      console.error(`❌ Error processing support email:`, error);

      // Send error notification
      await sendErrorNotification(message, error, env);
    }
  },
};

async function createSupportTicket(message: EmailMessage, env: any): Promise<SupportTicket> {
  const ticketId = generateTicketId();

  const ticket: SupportTicket = {
    id: ticketId,
    customer_email: message.from,
    subject: message.subject,
    body: message.text || message.html || '',
    priority: 'medium',
    status: 'open',
    created_at: new Date().toISOString(),
    tags: extractTags(message.subject + ' ' + (message.text || '')),
  };

  // Store in D1 database
  await env.REGISTRY_DB.prepare(
    `
      INSERT INTO support_tickets (
        id, customer_email, subject, body, priority, status, created_at, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      ticket.id,
      ticket.customer_email,
      ticket.subject,
      ticket.body,
      ticket.priority,
      ticket.status,
      ticket.created_at,
      JSON.stringify(ticket.tags)
    )
    .run();

  return ticket;
}

async function updateTicketPriority(ticketId: string, priority: string, env: any) {
  await env.REGISTRY_DB.prepare('UPDATE support_tickets SET priority = ? WHERE id = ?')
    .bind(priority, ticketId)
    .run();
}

async function sendAutoResponse(message: EmailMessage, ticket: SupportTicket, env: any) {
  const responseSubject = `Support Ticket #${ticket.id} - ${message.subject}`;
  const responseBody = generateAutoResponse(ticket);

  // Here you would integrate with your email service
  // For now, we'll log the response
  console.log(`📤 Auto-response for ticket ${ticket.id}:`);
  console.log(`Subject: ${responseSubject}`);
  console.log(`Body: ${responseBody}`);
}

async function logEmailAnalytics(message: EmailMessage, ticket: SupportTicket, env: any) {
  // Log to analytics engine
  await env.ANALYTICS.writeDataPoint({
    indexes: [message.from],
    blobs: [
      JSON.stringify({
        ticket_id: ticket.id,
        timestamp: ticket.created_at,
        priority: ticket.priority,
        tags: ticket.tags,
      }),
    ],
  });
}

async function sendErrorNotification(message: EmailMessage, error: any, env: any) {
  console.error(`🚨 Support email processing error for ${message.from}:`, error);
  // Here you would send error notifications to your team
}

function generateTicketId(): string {
  return `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function analyzePriority(content: string): 'low' | 'medium' | 'high' | 'urgent' {
  const urgentKeywords = ['urgent', 'critical', 'emergency', 'security breach', 'system down'];
  const highKeywords = ['bug', 'error', 'issue', 'problem', 'broken'];
  const mediumKeywords = ['question', 'help', 'support', 'feature'];

  const lowerContent = content.toLowerCase();

  if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'urgent';
  }
  if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'high';
  }
  if (mediumKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'medium';
  }

  return 'low';
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();

  // Common tags based on content analysis
  if (lowerContent.includes('billing') || lowerContent.includes('payment')) {
    tags.push('billing');
  }
  if (lowerContent.includes('security') || lowerContent.includes('login')) {
    tags.push('security');
  }
  if (lowerContent.includes('api') || lowerContent.includes('integration')) {
    tags.push('api');
  }
  if (lowerContent.includes('dashboard') || lowerContent.includes('ui')) {
    tags.push('dashboard');
  }
  if (lowerContent.includes('performance') || lowerContent.includes('slow')) {
    tags.push('performance');
  }

  return tags.length > 0 ? tags : ['general'];
}

function generateAutoResponse(ticket: SupportTicket): string {
  const priorityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴',
  };

  return `
Dear Valued Customer,

Thank you for contacting Fantasy42-Fire22 Support.

Your support ticket has been created with the following details:
- Ticket ID: ${ticket.id}
- Priority: ${priorityEmoji[ticket.priority]} ${ticket.priority.toUpperCase()}
- Status: Open

Our support team will review your request and respond within:
- Urgent: 1 hour
- High: 4 hours
- Medium: 24 hours
- Low: 48 hours

You can track your ticket status at:
https://support.apexodds.net/ticket/${ticket.id}

If you have any additional information or urgent updates, please reply to this email.

Best regards,
Fantasy42-Fire22 Support Team
support@apexodds.net
  `.trim();
}
