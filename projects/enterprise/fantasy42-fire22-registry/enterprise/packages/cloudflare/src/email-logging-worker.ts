/**
 * Fantasy42-Fire22 Email Logging Worker
 * Logs all incoming emails for analytics and compliance
 */

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
}

interface EmailLog {
  id: string;
  from: string;
  to: string;
  subject: string;
  size: number;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
  spam_score?: number;
  processed: boolean;
}

export default {
  async email(message: EmailMessage, env: any) {
    console.log(`📧 Logging email from: ${message.from} to: ${message.to}`);

    try {
      const emailLog: EmailLog = {
        id: generateEmailId(),
        from: message.from,
        to: message.to,
        subject: message.subject,
        size: calculateEmailSize(message),
        timestamp: new Date().toISOString(),
        user_agent: extractUserAgent(message.headers),
        ip_address: extractIPAddress(message.headers),
        spam_score: analyzeSpamScore(message),
        processed: true,
      };

      // Store in D1 database
      await storeEmailLog(emailLog, env);

      // Store in KV for quick access (expires in 30 days)
      await cacheEmailLog(emailLog, env);

      // Log to analytics
      await logEmailAnalytics(emailLog, env);

      // Check for security threats
      await analyzeSecurityThreats(emailLog, env);

      console.log(`✅ Email logged: ${emailLog.id}`);
    } catch (error) {
      console.error(`❌ Error logging email:`, error);

      // Store error log
      await logEmailError(message, error, env);
    }
  },
};

async function storeEmailLog(emailLog: EmailLog, env: any) {
  await env.REGISTRY_DB.prepare(
    `
      INSERT INTO email_logs (
        id, from_address, to_address, subject, size_bytes,
        timestamp, user_agent, ip_address, spam_score, processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      emailLog.id,
      emailLog.from,
      emailLog.to,
      emailLog.subject,
      emailLog.size,
      emailLog.timestamp,
      emailLog.user_agent,
      emailLog.ip_address,
      emailLog.spam_score,
      emailLog.processed
    )
    .run();
}

async function cacheEmailLog(emailLog: EmailLog, env: any) {
  const cacheKey = `email:${emailLog.id}`;
  await env.CACHE.put(cacheKey, JSON.stringify(emailLog), {
    expirationTtl: 30 * 24 * 60 * 60, // 30 days
  });
}

async function logEmailAnalytics(emailLog: EmailLog, env: any) {
  await env.ANALYTICS.writeDataPoint({
    indexes: [emailLog.from, emailLog.to],
    blobs: [
      JSON.stringify({
        email_id: emailLog.id,
        timestamp: emailLog.timestamp,
        size: emailLog.size,
        spam_score: emailLog.spam_score,
        processed: emailLog.processed,
      }),
    ],
  });
}

async function analyzeSecurityThreats(emailLog: EmailLog, env: any) {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /password/i,
    /security.*breach/i,
    /urgent.*action/i,
    /account.*suspended/i,
    /verify.*identity/i,
  ];

  const isSuspicious = suspiciousPatterns.some(
    pattern =>
      pattern.test(emailLog.subject) || (emailLog.subject + (emailLog.subject || '')).match(pattern)
  );

  if (isSuspicious) {
    console.warn(`🚨 Suspicious email detected: ${emailLog.id}`);

    // Store security alert
    await env.REGISTRY_DB.prepare(
      `
        INSERT INTO security_alerts (
          type, email_id, description, severity, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `
    )
      .bind(
        'suspicious_email',
        emailLog.id,
        `Suspicious email pattern detected: ${emailLog.subject}`,
        'medium',
        new Date().toISOString()
      )
      .run();
  }
}

async function logEmailError(message: EmailMessage, error: any, env: any) {
  await env.REGISTRY_DB.prepare(
    `
      INSERT INTO email_errors (
        from_address, to_address, subject, error_message, timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `
  )
    .bind(message.from, message.to, message.subject, error.message, new Date().toISOString())
    .run();
}

function generateEmailId(): string {
  return `EML-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function calculateEmailSize(message: EmailMessage): number {
  const text = message.text || '';
  const html = message.html || '';
  const headers = JSON.stringify(message.headers);

  return Buffer.byteLength(text + html + headers, 'utf8');
}

function extractUserAgent(headers: Record<string, string>): string | undefined {
  return headers['user-agent'] || headers['User-Agent'];
}

function extractIPAddress(headers: Record<string, string>): string | undefined {
  return (
    headers['x-forwarded-for'] ||
    headers['X-Forwarded-For'] ||
    headers['x-real-ip'] ||
    headers['X-Real-IP']
  );
}

function analyzeSpamScore(message: EmailMessage): number {
  let score = 0;

  // Check subject for spam indicators
  const subject = message.subject.toLowerCase();
  if (subject.includes('!!!') || subject.includes('urgent') || subject.includes('free')) {
    score += 10;
  }

  // Check for excessive caps
  const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
  if (capsRatio > 0.5) {
    score += 15;
  }

  // Check for suspicious words
  const suspiciousWords = ['viagra', 'casino', 'lottery', 'winner', 'million'];
  if (suspiciousWords.some(word => subject.includes(word))) {
    score += 25;
  }

  return Math.min(score, 100); // Cap at 100
}
