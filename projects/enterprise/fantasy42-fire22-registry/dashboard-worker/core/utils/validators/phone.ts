/**
 * Phone Number Validation Utilities
 * Comprehensive phone number validation, formatting, and processing utilities
 */

export interface PhoneValidationResult {
  isValid: boolean;
  countryCode: string;
  nationalNumber: string;
  formatted: string;
  internationalFormat: string;
  country: string;
  type: 'mobile' | 'landline' | 'voip' | 'toll-free' | 'premium' | 'unknown';
  carrier?: string;
  timezone?: string;
  errors?: string[];
}

export interface PhoneValidationOptions {
  country?: string;
  strict?: boolean;
  allowLandline?: boolean;
  allowVoIP?: boolean;
  allowTollFree?: boolean;
  requireCountryCode?: boolean;
  formatOutput?: boolean;
}

// Country-specific phone number patterns
const COUNTRY_PATTERNS: Record<
  string,
  {
    regex: RegExp;
    length: number;
    format: string;
    name: string;
  }
> = {
  US: {
    regex: /^\+?1[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    length: 10,
    format: '(XXX) XXX-XXXX',
    name: 'United States',
  },
  CA: {
    regex: /^\+?1[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    length: 10,
    format: '(XXX) XXX-XXXX',
    name: 'Canada',
  },
  GB: {
    regex: /^\+?44\d{10}$/,
    length: 10,
    format: 'XXXX XXX XXX',
    name: 'United Kingdom',
  },
  AU: {
    regex: /^\+?61\d{9}$/,
    length: 9,
    format: 'XXXX XXX XXX',
    name: 'Australia',
  },
  DE: {
    regex: /^\+?49\d{10,11}$/,
    length: 10,
    format: 'XXXX XXXXXXX',
    name: 'Germany',
  },
  FR: {
    regex: /^\+?33\d{9}$/,
    length: 9,
    format: 'X XX XX XX XX',
    name: 'France',
  },
  JP: {
    regex: /^\+?81\d{9,10}$/,
    length: 9,
    format: 'XX-XXXX-XXXX',
    name: 'Japan',
  },
};

// Common invalid phone number patterns
const INVALID_PATTERNS = [
  /^1{8,}$/, // Too many 1s
  /^2{8,}$/, // Too many 2s
  /^0{8,}$/, // Too many 0s
  /^123456/, // Sequential numbers
  /^987654/, // Reverse sequential
  /(\d)\1{6,}/, // Same digit repeated 7+ times
];

/**
 * Validate phone number with comprehensive checks
 */
export function validatePhone(
  phone: string,
  options: PhoneValidationOptions = {}
): PhoneValidationResult {
  const result: PhoneValidationResult = {
    isValid: false,
    countryCode: '',
    nationalNumber: '',
    formatted: phone,
    internationalFormat: phone,
    country: 'Unknown',
    type: 'unknown',
    errors: [],
  };

  // Basic validation
  if (!phone || typeof phone !== 'string') {
    result.errors?.push('Phone number is required and must be a string');
    return result;
  }

  const cleanedPhone = cleanPhoneNumber(phone);

  if (cleanedPhone.length < 7) {
    result.errors?.push('Phone number is too short');
    return result;
  }

  if (cleanedPhone.length > 15) {
    result.errors?.push('Phone number is too long');
    return result;
  }

  // Check for invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(cleanedPhone)) {
      result.errors?.push('Phone number contains invalid pattern');
      return result;
    }
  }

  // Parse country code and number
  const { countryCode, nationalNumber } = parsePhoneNumber(cleanedPhone);
  result.countryCode = countryCode;
  result.nationalNumber = nationalNumber;

  // Determine country
  const countryInfo = getCountryInfo(countryCode);
  result.country = countryInfo?.name || 'Unknown';

  // Validate against country-specific pattern
  if (countryInfo) {
    const fullNumber = `+${countryCode}${nationalNumber}`;
    if (!countryInfo.regex.test(fullNumber)) {
      result.errors?.push(`Invalid phone number format for ${countryInfo.name}`);
      return result;
    }
  }

  // Determine phone type
  result.type = determinePhoneType(cleanedPhone, countryCode);

  // Check options
  if (options.allowLandline === false && result.type === 'landline') {
    result.errors?.push('Landline numbers are not allowed');
  }

  if (options.allowVoIP === false && result.type === 'voip') {
    result.errors?.push('VoIP numbers are not allowed');
  }

  if (options.allowTollFree === false && result.type === 'toll-free') {
    result.errors?.push('Toll-free numbers are not allowed');
  }

  if (options.requireCountryCode && !countryCode) {
    result.errors?.push('Country code is required');
  }

  // Format output
  if (options.formatOutput !== false) {
    result.formatted = formatPhoneNumber(cleanedPhone, countryCode);
    result.internationalFormat = formatInternational(cleanedPhone, countryCode);
  }

  // Set validity
  result.isValid = result.errors?.length === 0;

  return result;
}

/**
 * Clean phone number by removing non-numeric characters
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Parse phone number into country code and national number
 */
export function parsePhoneNumber(phone: string): { countryCode: string; nationalNumber: string } {
  const cleaned = cleanPhoneNumber(phone);

  // Handle numbers starting with +
  if (phone.startsWith('+')) {
    // Try to determine country code length
    for (let len = 1; len <= 4; len++) {
      const potentialCode = cleaned.substring(0, len);
      if (COUNTRY_PATTERNS[potentialCode]) {
        return {
          countryCode: potentialCode,
          nationalNumber: cleaned.substring(len),
        };
      }
    }
  }

  // Handle US/Canada numbers (assume +1)
  if (cleaned.length === 10) {
    return {
      countryCode: '1',
      nationalNumber: cleaned,
    };
  }

  // Handle international numbers without +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return {
      countryCode: '1',
      nationalNumber: cleaned.substring(1),
    };
  }

  // Default: assume no country code
  return {
    countryCode: '',
    nationalNumber: cleaned,
  };
}

/**
 * Get country information by country code
 */
function getCountryInfo(countryCode: string) {
  return COUNTRY_PATTERNS[countryCode];
}

/**
 * Determine phone number type
 */
function determinePhoneType(phone: string, countryCode: string): PhoneValidationResult['type'] {
  const cleaned = cleanPhoneNumber(phone);

  // US/Canada specific patterns
  if (countryCode === '1') {
    const areaCode = cleaned.substring(0, 3);
    const exchange = cleaned.substring(3, 6);

    // Toll-free numbers
    if (['800', '888', '877', '866', '855', '844'].includes(areaCode)) {
      return 'toll-free';
    }

    // Premium numbers
    if (areaCode.startsWith('9')) {
      return 'premium';
    }

    // VoIP numbers (common patterns)
    if (['555', '999'].includes(areaCode) || exchange === '555') {
      return 'voip';
    }

    // Mobile vs landline (simplified)
    const mobilePrefixes = ['2', '3', '4', '5', '6', '7', '8', '9'];
    if (mobilePrefixes.includes(areaCode.charAt(0))) {
      return 'mobile';
    }

    return 'landline';
  }

  // Default classification based on number patterns
  if (cleaned.length === 10) {
    return 'landline';
  }

  return 'unknown';
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string, countryCode?: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const { countryCode: detectedCode } = parsePhoneNumber(phone);
  const code = countryCode || detectedCode;

  const countryInfo = getCountryInfo(code);

  if (countryInfo && cleaned.length === countryInfo.length) {
    const nationalPart = cleaned.substring(code.length);
    let formatted = countryInfo.format;

    // Replace X placeholders with digits
    let digitIndex = 0;
    formatted = formatted.replace(/X/g, () => nationalPart[digitIndex++] || '');

    return code ? `+${code} ${formatted}` : formatted;
  }

  // Fallback formatting
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.substring(1);
    return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
  }

  return phone; // Return original if can't format
}

/**
 * Format phone number in international format
 */
export function formatInternational(phone: string, countryCode?: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const { countryCode: detectedCode } = parsePhoneNumber(phone);
  const code = countryCode || detectedCode;

  if (code) {
    return `+${code} ${cleaned.substring(code.length)}`;
  }

  return phone;
}

/**
 * Quick phone number validation (basic checks only)
 */
export function isValidPhoneFormat(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const cleaned = cleanPhoneNumber(phone);

  // Basic length check
  if (cleaned.length < 7 || cleaned.length > 15) {
    return false;
  }

  // Check for invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(cleaned)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize phone number to standard format
 */
export function normalizePhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const { countryCode, nationalNumber } = parsePhoneNumber(cleaned);

  if (countryCode) {
    return `+${countryCode}${nationalNumber}`;
  }

  return cleaned;
}

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string): string {
  const { countryCode } = parsePhoneNumber(phone);
  return countryCode;
}

/**
 * Check if phone number is mobile
 */
export function isMobileNumber(phone: string): boolean {
  const result = validatePhone(phone);
  return result.type === 'mobile';
}

/**
 * Check if phone number is toll-free
 */
export function isTollFreeNumber(phone: string): boolean {
  const result = validatePhone(phone);
  return result.type === 'toll-free';
}

/**
 * Generate phone number suggestions for common typos
 */
export function generatePhoneSuggestions(phone: string): string[] {
  if (!phone) return [];

  const cleaned = cleanPhoneNumber(phone);
  const suggestions: string[] = [];

  // If missing country code, suggest with +1
  if (cleaned.length === 10 && !phone.startsWith('+')) {
    suggestions.push(`+1${cleaned}`);
  }

  // If has extra digits, suggest trimming
  if (cleaned.length === 11 && cleaned.startsWith('1') && phone.startsWith('+')) {
    suggestions.push(cleaned.substring(1));
  }

  return suggestions;
}

/**
 * Validate phone number against a list of allowed country codes
 */
export function validatePhoneCountry(
  phone: string,
  allowedCountryCodes: string[]
): { isValid: boolean; countryCode: string; allowed: boolean } {
  const { countryCode } = parsePhoneNumber(phone);
  const allowed = allowedCountryCodes.includes(countryCode);

  return {
    isValid: isValidPhoneFormat(phone),
    countryCode,
    allowed,
  };
}

/**
 * Batch validate multiple phone numbers
 */
export function validatePhoneBatch(
  phones: string[],
  options: PhoneValidationOptions = {}
): PhoneValidationResult[] {
  return phones.map(phone => validatePhone(phone, options));
}

/**
 * Get phone validation statistics
 */
export function getPhoneValidationStats(results: PhoneValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  mobile: number;
  landline: number;
  voip: number;
  tollFree: number;
} {
  return {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    mobile: results.filter(r => r.type === 'mobile').length,
    landline: results.filter(r => r.type === 'landline').length,
    voip: results.filter(r => r.type === 'voip').length,
    tollFree: results.filter(r => r.type === 'toll-free').length,
  };
}

/**
 * Sanitize phone number for display (mask sensitive parts)
 */
export function sanitizePhoneForDisplay(
  phone: string,
  options: { maskLastDigits?: boolean; showCountryCode?: boolean } = {}
): string {
  const { maskLastDigits = false, showCountryCode = true } = options;

  if (!isValidPhoneFormat(phone)) {
    return phone;
  }

  const cleaned = cleanPhoneNumber(phone);
  const { countryCode, nationalNumber } = parsePhoneNumber(cleaned);

  let displayNumber = nationalNumber;

  if (maskLastDigits && displayNumber.length >= 4) {
    const visibleDigits = displayNumber.length - 4;
    const maskedDigits = '*'.repeat(4);
    displayNumber = displayNumber.substring(0, visibleDigits) + maskedDigits;
  }

  if (showCountryCode && countryCode) {
    return `+${countryCode} ${displayNumber}`;
  }

  return displayNumber;
}
