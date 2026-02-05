/**
 * [KYC][UTILITY][FUNCTION][META:{export}]
 * PII Redaction Utilities
 * Redacts personally identifiable information from logs and audit trails
 */

/**
 * [KYC][UTILITY][FUNCTION][META:{export}]
 * Redact email addresses
 */
export function redactEmail(text: string): string {
  return text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]");
}

/**
 * Redact phone numbers (US and international formats)
 */
export function redactPhone(text: string): string {
  return text
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]")
    .replace(/\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g, "[PHONE_REDACTED]");
}

/**
 * Redact SSN (US Social Security Numbers)
 */
export function redactSSN(text: string): string {
  return text.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[SSN_REDACTED]");
}

/**
 * Redact credit card numbers
 */
export function redactCreditCard(text: string): string {
  return text.replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, "[CC_REDACTED]");
}

/**
 * Redact passport numbers (common formats)
 */
export function redactPassport(text: string): string {
  return text.replace(/\b[A-Z]{1,2}\d{6,9}\b/g, "[PASSPORT_REDACTED]");
}

/**
 * Redact driver's license numbers (US formats)
 */
export function redactDriverLicense(text: string): string {
  return text.replace(/\b[A-Z]{1,2}\d{6,10}\b/g, "[DL_REDACTED]");
}

/**
 * Redact IP addresses (optional, may want to keep for security)
 */
export function redactIP(text: string, includeIP: boolean = false): string {
  if (includeIP) return text;
  return text.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP_REDACTED]");
}

/**
 * Redact all PII from a text string
 */
export function redactPII(text: string, options?: { includeIP?: boolean }): string {
  let redacted = text;
  redacted = redactEmail(redacted);
  redacted = redactPhone(redacted);
  redacted = redactSSN(redacted);
  redacted = redactCreditCard(redacted);
  redacted = redactPassport(redacted);
  redacted = redactDriverLicense(redacted);
  redacted = redactIP(redacted, options?.includeIP);
  return redacted;
}

/**
 * Redact PII from an object (recursively)
 */
export function redactPIIFromObject(obj: any, options?: { includeIP?: boolean }): any {
  if (typeof obj === "string") {
    return redactPII(obj, options);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactPIIFromObject(item, options));
  }
  
  if (obj && typeof obj === "object") {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip redaction for certain fields that are safe
      if (key === "traceId" || key === "status" || key === "riskScore" || key === "timestamp") {
        redacted[key] = value;
      } else {
        redacted[key] = redactPIIFromObject(value, options);
      }
    }
    return redacted;
  }
  
  return obj;
}

/**
 * [KYC][UTILITY][FUNCTION][META:{export}]
 * Redact PII from audit log entries
 * #REF:API-KYC-AUDIT-REDACT
 */
export function redactAuditLog(log: string | string[]): string | string[] {
  if (Array.isArray(log)) {
    return log.map(entry => redactPII(entry));
  }
  return redactPII(log);
}
