export class PhoneSanitizer {
  private static readonly COUNTRY_CODES = new Map([
    ['US', '1'], ['GB', '44'], ['DE', '49'], ['FR', '33'],
    ['JP', '81'], ['CN', '86'], ['IN', '91'], ['BR', '55'],
    ['RU', '7'], ['CA', '1'], ['AU', '61'], ['IT', '39']
  ]);

  sanitize(input: string | number): {
    raw: string;
    e164: string;
    national: string;
    isValid: boolean;
    countryCode?: string;
    country?: string;
  } {
    // Remove all non-digits
    const digits = String(input).replace(/\D/g, '');
    
    if (digits.length < 4) {
      return {
        raw: String(input),
        e164: '',
        national: '',
        isValid: false
      };
    }

    // Try to detect country
    let countryCode = '';
    let nationalNumber = '';
    let country = '';

    // Check for explicit country code
    if (String(input).startsWith('+')) {
      // Already in E.164 format
      return {
        raw: String(input),
        e164: digits,
        national: digits.substring(String(input).indexOf('+') + 1),
        isValid: true,
        countryCode: digits.substring(1, 3),
        country: this.getCountryByCode(digits.substring(1, 3))
      };
    }

    // Try to parse based on length and patterns
    for (const [countryName, code] of PhoneSanitizer.COUNTRY_CODES) {
      if (digits.startsWith(code)) {
        countryCode = code;
        country = countryName;
        nationalNumber = digits.substring(code.length);
        break;
      }
    }

    // If no country code detected, assume US/Canada
    if (!countryCode && digits.length === 10) {
      countryCode = '1';
      country = 'US';
      nationalNumber = digits;
    } else if (!countryCode) {
      // Can't determine format
      return {
        raw: String(input),
        e164: '',
        national: '',
        isValid: false
      };
    }

    const e164 = `+${countryCode}${nationalNumber}`;
    
    return {
      raw: String(input),
      e164,
      national: nationalNumber,
      isValid: this.validateE164(e164),
      countryCode,
      country
    };
  }

  private validateE164(phone: string): boolean {
    // E.164 regex: + followed by 1-15 digits
    const regex = /^\+\d{1,15}$/;
    if (!regex.test(phone)) return false;
    
    // Additional validation logic
    const digits = phone.substring(1);
    
    // Check for obvious invalid patterns
    if (/^0+$/.test(digits)) return false; // All zeros
    if (/^1234567890$/.test(digits)) return false; // Sequential
    
    // Check length by country (simplified)
    const countryCode = digits.substring(0, 3);
    const nationalNumber = digits.substring(3);
    
    // US/Canada: 10 digits total
    if (['1'].includes(countryCode) && nationalNumber.length !== 10) {
      return false;
    }
    
    return true;
  }

  private getCountryByCode(code: string): string {
    for (const [country, countryCode] of PhoneSanitizer.COUNTRY_CODES) {
      if (countryCode === code) return country;
    }
    return 'Unknown';
  }

  normalize(phone: string): string {
    const sanitized = this.sanitize(phone);
    return sanitized.isValid ? sanitized.e164 : '';
  }

  batchSanitize(phones: string[]): Map<string, ReturnType<PhoneSanitizer['sanitize']>> {
    const results = new Map();
    for (const phone of phones) {
      results.set(phone, this.sanitize(phone));
    }
    return results;
  }
}
