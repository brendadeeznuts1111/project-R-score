import { 
  parsePhoneNumberFromString, 
  getCountries, 
  getCountryCallingCode,
  type CountryCode 
} from 'libphonenumber-js';

/** Phone number types supported by the system */
export type PhoneNumberType = 
  | 'FIXED_LINE'
  | 'MOBILE'
  | 'FIXED_LINE_OR_MOBILE'
  | 'TOLL_FREE'
  | 'PREMIUM_RATE'
  | 'SHARED_COST'
  | 'VOIP'
  | 'PERSONAL_NUMBER'
  | 'PAGER'
  | 'UAN'
  | 'VOICEMAIL'
  | 'UNKNOWN';

/** Result of a phone sanitization process */
export interface SanitizeResult {
  /** E.164 formatted number */
  e164: string;
  /** Whether the number is valid */
  isValid: boolean;
  /** Method used for validation */
  validationMethod: 'basic' | 'libphonenumber' | 'ipqs';
  /** Detected country (ISO 3166-1 alpha-2) */
  country?: string;
  /** Detected number type */
  type?: PhoneNumberType;
  /** Carrier name (from IPQS) */
  carrier?: string;
  /** Region/State (from IPQS) */
  region?: string;
  /** City (from IPQS) */
  city?: string;
  /** Zip/Postal code (from IPQS) */
  zipCode?: string;
  /** Fraud/Risk score (0-100, from IPQS) */
  fraudScore?: number;
  /** Whether a country code was added during sanitization */
  countryCodeAdded?: boolean;
}

/** Options for sanitization */
export interface SanitizeOptions {
  /** Default country code if not provided in number */
  defaultCountry?: CountryCode;
  /** Skip validation and just format */
  skipValidation?: boolean;
  /** IPQS API Key for advanced intel */
  ipqsApiKey?: string;
}

/**
 * Phone Sanitizer Utility
 */
export const phoneSanitizer = {
  /** Check if libphonenumber is available */
  hasLibPhoneNumber: () => true,

  /** Get all supported country codes */
  getSupportedCountries: () => getCountries() as string[],

  /** Get calling code for a country */
  getCountryCode: (country: string) => {
    try {
      return getCountryCallingCode(country as CountryCode);
    } catch {
      return null;
    }
  },

  /**
   * Sanitize a phone number to E.164
   */
  sanitize: async (input: string, options: SanitizeOptions = {}): Promise<SanitizeResult> => {
    const start = Bun.nanoseconds();
    // 1. Basic Cleaning & Security stripping
    let cleaned = input
      .replace(/<script.*?>.*?<\/script>/gi, '') // Simple XSS strip
      .replace(/['";\\]/g, '')               // Simple SQLi strip
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')    // Null bytes / Control chars
      .replace(/[^\d+x,.()\s-]/g, '');         // Only allowed chars

    // 2. Extract digits and check for leading +
    const digitsOnly = cleaned.replace(/\D/g, '');
    const hasPlus = cleaned.trim().startsWith('+');

    let result: SanitizeResult = {
      e164: hasPlus ? `+${digitsOnly}` : digitsOnly,
      isValid: false,
      validationMethod: 'basic'
    };

    // 3. LibPhoneNumber Processing
    const phoneNumber = parsePhoneNumberFromString(input, options.defaultCountry);
    
    if (phoneNumber) {
      result.e164 = phoneNumber.format('E.164');
      result.isValid = phoneNumber.isValid();
      result.validationMethod = 'libphonenumber';
      result.country = phoneNumber.country;
      
      let type = phoneNumber.getType();
      // Refine FIXED_LINE_OR_MOBILE for countries where they are indistinguishable by prefix
      // but we often want to treat them as MOBILE for automation (Sms reception)
      if (type === 'FIXED_LINE_OR_MOBILE') {
        type = 'MOBILE'; // Default to MOBILE for our automation context if ambiguous
      }
      result.type = type as PhoneNumberType;
    }

    // 4. IPQS Intelligence if key provided
    if (options.ipqsApiKey && result.isValid) {
      try {
        const response = await fetch(
          `https://www.ipqualityscore.com/api/json/phone/${options.ipqsApiKey}/${result.e164}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            result.validationMethod = 'ipqs';
            result.carrier = data.carrier;
            result.region = data.region;
            result.city = data.city;
            result.zipCode = data.zip_code;
            result.fraudScore = data.fraud_score;
          }
        }
      } catch (err) {
        // Silently fail IPQS and keep libphonenumber results
      }
    }

    // Handle country code prepending note
    if (!hasPlus && result.e164.startsWith('+') && digitsOnly.length < result.e164.length - 1) {
      result.countryCodeAdded = true;
    }

    const duration = (Bun.nanoseconds() - start) / 1e6;
    if (duration > 10) {
      console.log(`⚡ PhoneSanitizer: ${result.e164} optimized in ${duration.toFixed(2)}ms`);
    }

    return result;
  }
};
