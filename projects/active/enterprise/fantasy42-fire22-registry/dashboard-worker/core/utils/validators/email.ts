/**
 * Email Validation Utilities
 * Comprehensive email validation and processing utilities
 */

export interface EmailValidationResult {
  isValid: boolean;
  isDisposable: boolean;
  domain: string;
  localPart: string;
  riskLevel: 'low' | 'medium' | 'high';
  suggestions?: string[];
  errors?: string[];
}

export interface EmailValidationOptions {
  checkDisposable?: boolean;
  checkMX?: boolean;
  allowUnicode?: boolean;
  allowPlus?: boolean;
  maxLength?: number;
  customDomains?: string[];
  blockedDomains?: string[];
}

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'maildrop.cc',
  'tempail.com',
  'getnada.com',
  'tempmail.net',
  'fakeinbox.com',
  'mail-temporaire.fr',
  'mytemp.email',
  'temp-mail.io',
  'dispostable.com',
  'tempinbox.co',
]);

// High-risk domains (often associated with spam/fraud)
const HIGH_RISK_DOMAINS = new Set([
  'yahoo.com',
  'aol.com',
  'hotmail.com',
  'outlook.com',
  'gmail.com',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
  'mail.ru',
]);

// RFC 5322 compliant email regex (simplified)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validate email address with comprehensive checks
 */
export function validateEmail(
  email: string,
  options: EmailValidationOptions = {}
): EmailValidationResult {
  const result: EmailValidationResult = {
    isValid: false,
    isDisposable: false,
    domain: '',
    localPart: '',
    riskLevel: 'low',
    errors: [],
    suggestions: [],
  };

  // Basic validation
  if (!email || typeof email !== 'string') {
    result.errors?.push('Email is required and must be a string');
    return result;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Length validation
  const maxLength = options.maxLength || 254;
  if (trimmedEmail.length > maxLength) {
    result.errors?.push(`Email exceeds maximum length of ${maxLength} characters`);
    return result;
  }

  if (trimmedEmail.length === 0) {
    result.errors?.push('Email cannot be empty');
    return result;
  }

  // Basic format validation
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    result.errors?.push('Invalid email format');
    result.suggestions?.push('Check for typos in the email address');
    return result;
  }

  // Split email into parts
  const [localPart, domain] = trimmedEmail.split('@');

  if (!localPart || !domain) {
    result.errors?.push('Invalid email format - missing @ symbol');
    return result;
  }

  result.domain = domain;
  result.localPart = localPart;

  // Local part validation
  if (localPart.length > 64) {
    result.errors?.push('Local part of email is too long (max 64 characters)');
  }

  // Check for consecutive dots
  if (localPart.includes('..')) {
    result.errors?.push('Local part cannot contain consecutive dots');
  }

  // Unicode validation
  if (!options.allowUnicode && /[^\x00-\x7F]/.test(trimmedEmail)) {
    result.errors?.push('Unicode characters are not allowed in email');
  }

  // Plus sign validation
  if (!options.allowPlus && localPart.includes('+')) {
    result.errors?.push('Plus signs are not allowed in email local part');
  }

  // Domain validation
  if (domain.length > 253) {
    result.errors?.push('Domain part is too long');
  }

  // Check for blocked domains
  if (options.blockedDomains?.includes(domain)) {
    result.errors?.push('Email domain is not allowed');
    result.riskLevel = 'high';
  }

  // Check for custom allowed domains
  if (options.customDomains && !options.customDomains.includes(domain)) {
    result.errors?.push('Email domain is not in allowed list');
  }

  // Disposable email check
  if (options.checkDisposable !== false) {
    result.isDisposable = DISPOSABLE_DOMAINS.has(domain);
    if (result.isDisposable) {
      result.riskLevel = 'high';
      result.errors?.push('Disposable email addresses are not allowed');
    }
  }

  // Risk assessment
  if (HIGH_RISK_DOMAINS.has(domain)) {
    result.riskLevel = 'medium';
  }

  // Set validity
  result.isValid = result.errors?.length === 0;

  return result;
}

/**
 * Quick email validation (basic format only)
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Extract domain from email
 */
export function extractEmailDomain(email: string): string {
  if (!isValidEmailFormat(email)) {
    throw new Error('Invalid email format');
  }

  return email.trim().toLowerCase().split('@')[1];
}

/**
 * Extract local part from email
 */
export function extractEmailLocalPart(email: string): string {
  if (!isValidEmailFormat(email)) {
    throw new Error('Invalid email format');
  }

  return email.trim().toLowerCase().split('@')[0];
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  if (!isValidEmailFormat(email)) {
    throw new Error('Invalid email format');
  }

  return email.trim().toLowerCase();
}

/**
 * Check if email is from a free provider
 */
export function isFreeEmailProvider(email: string): boolean {
  const domain = extractEmailDomain(email);
  return HIGH_RISK_DOMAINS.has(domain);
}

/**
 * Generate email suggestions for typos
 */
export function generateEmailSuggestions(email: string): string[] {
  if (!email || !email.includes('@')) {
    return [];
  }

  const [localPart, domain] = email.toLowerCase().split('@');
  const suggestions: string[] = [];

  // Common domain typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domainCorrections: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'yahoo.co': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'hotmail.co': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'outlook.co': 'outlook.com',
    'outlok.com': 'outlook.com',
  };

  // Check for domain corrections
  if (domainCorrections[domain]) {
    suggestions.push(`${localPart}@${domainCorrections[domain]}`);
  }

  // Suggest common domains if domain is uncommon
  if (!commonDomains.includes(domain) && !HIGH_RISK_DOMAINS.has(domain)) {
    commonDomains.slice(0, 2).forEach(commonDomain => {
      suggestions.push(`${localPart}@${commonDomain}`);
    });
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Validate email against a list of allowed domains
 */
export function validateEmailDomain(
  email: string,
  allowedDomains: string[]
): { isValid: boolean; domain: string; allowed: boolean } {
  const domain = extractEmailDomain(email);
  const allowed = allowedDomains.includes(domain);

  return {
    isValid: isValidEmailFormat(email),
    domain,
    allowed,
  };
}

/**
 * Batch validate multiple emails
 */
export function validateEmailBatch(
  emails: string[],
  options: EmailValidationOptions = {}
): EmailValidationResult[] {
  return emails.map(email => validateEmail(email, options));
}

/**
 * Get email validation statistics
 */
export function getEmailValidationStats(results: EmailValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  disposable: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
} {
  return {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    disposable: results.filter(r => r.isDisposable).length,
    highRisk: results.filter(r => r.riskLevel === 'high').length,
    mediumRisk: results.filter(r => r.riskLevel === 'medium').length,
    lowRisk: results.filter(r => r.riskLevel === 'low').length,
  };
}

/**
 * Sanitize email for display (mask sensitive parts)
 */
export function sanitizeEmailForDisplay(
  email: string,
  options: { maskLocal?: boolean; maskDomain?: boolean } = {}
): string {
  if (!isValidEmailFormat(email)) {
    return email;
  }

  const { maskLocal = false, maskDomain = false } = options;
  const [localPart, domain] = email.split('@');

  let maskedLocal = localPart;
  let maskedDomain = domain;

  if (maskLocal && localPart.length > 2) {
    maskedLocal = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2);
  }

  if (maskDomain) {
    const [domainName, tld] = domain.split('.');
    if (domainName.length > 2) {
      maskedDomain = domainName.substring(0, 2) + '*'.repeat(domainName.length - 2) + '.' + tld;
    }
  }

  return `${maskedLocal}@${maskedDomain}`;
}
