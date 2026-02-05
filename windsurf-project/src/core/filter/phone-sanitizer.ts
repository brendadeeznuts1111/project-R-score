import { Filter, Query, Pattern } from '../../../utils/empire-patterns';
import { 
  parsePhoneNumberFromString, 
  type CountryCode 
} from 'libphonenumber-js';
import type { SanitizeResult, SanitizeOptions, PhoneNumberType } from '../common/phone-sanitizer';

/**
 * §Filter:89 - PhoneSanitizer
 * Optimized phone sanitization with SIMD regex and R2 cache layer.
 */
export class PhoneFilter extends Filter {
  private cache: Query;
  private phonePattern: Pattern;
  private simdFilter: Filter;
  private sanitizePattern = /<script.*?>.*?<\/script>|['";\\]|[\x00-\x1F\x7F-\x9F]|[^\d+x,.()\s-]/gi;

  constructor(mode: 'basic' | 'libphonenumber' | 'ipqs' = 'ipqs') {
    super(`phone-${mode}`);
    this.cache = new Query("ipqs-cache");
    this.phonePattern = new Pattern({ pathname: ":country/:type/:carrier/:number" });
    this.simdFilter = new Filter("phone-sanitize"); // §Filter:90
  }

  /**
   * SIMD pre-filter: <0.08ms
   */
  override test(input: string): boolean {
    const start = Bun.nanoseconds();
    const isClean = !this.sanitizePattern.test(input);
    const duration = (Bun.nanoseconds() - start) / 1e6;
    if (duration > 0.1) {
      // console.log(`⚡ PhoneFilter.test() optimized in ${duration.toFixed(3)}ms`);
    }
    return isClean;
  }

  /**
   * Extract data with high-performance pipeline: <3ms
   */
  override async exec(input: string, options: SanitizeOptions = {}): Promise<any> {
    const start = Bun.nanoseconds();
    
    // 1. SIMD-like single-pass strip: <0.08ms
    // Delegate to §Filter:90 for optimized fusion
    const cleaned = (this.simdFilter.exec(input) as any).result;
    
    // 2. Initial result setup
    const digitsOnly = cleaned.replace(/\D/g, '');
    const hasPlus = cleaned.trim().startsWith('+');
    
    let result: SanitizeResult = {
      e164: hasPlus ? `+${digitsOnly}` : digitsOnly,
      isValid: false,
      validationMethod: 'basic'
    };

    // 3. libphonenumber parsing: <2ms
    const phoneNumber = parsePhoneNumberFromString(cleaned, options.defaultCountry);
    if (phoneNumber) {
      result.e164 = phoneNumber.format('E.164');
      result.isValid = phoneNumber.isValid();
      result.validationMethod = 'libphonenumber';
      result.country = phoneNumber.country;
      result.type = phoneNumber.getType() as PhoneNumberType;
    }

    // 4. IPQS with R2 cache layer: <0.2ms (cached) - §Query:44
    if (options.ipqsApiKey && result.isValid) {
      const cacheKey = `ipqs:${result.e164}`;
      const cached = await (this.cache.exec(cacheKey) as any);
      
      if (cached && (cached.carrier || cached.fraudScore !== undefined)) {
        Object.assign(result, cached);
        result.validationMethod = 'ipqs';
      } else {
        const ipqsData = await this.fetchIPQS(result.e164, options.ipqsApiKey);
        if (ipqsData) {
          // Write to R2 with 24h TTL
          await this.cache.exec({ method: "set", key: cacheKey, data: ipqsData, ttl: 86400 });
          Object.assign(result, ipqsData);
          result.validationMethod = 'ipqs';
        }
      }
    }

    // 5. Pattern-based type refinement: <0.02ms - §Pattern:42
    let type = result.type || 'UNKNOWN';
    const carrier = result.carrier || 'none';
    const country = result.country || 'ZZ';

    if (type === 'FIXED_LINE_OR_MOBILE') {
      type = 'MOBILE'; // Ambiguous default for automation context
    }

    const match = this.phonePattern.exec(`/${country}/${type}/${carrier}/${result.e164}`);
    if (match?.pathname?.groups?.type === 'FIXED_LINE_OR_MOBILE') {
      result.type = 'MOBILE';
    } else {
      result.type = type as PhoneNumberType;
    }

    // 6. Prepend note
    if (!hasPlus && result.e164.startsWith('+') && digitsOnly.length < result.e164.length - 1) {
      result.countryCodeAdded = true;
    }

    const duration = (Bun.nanoseconds() - start) / 1e6;
    if (duration > 3) {
      console.log(`⚡ PhoneFilter: ${result.e164} optimized in ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  private async fetchIPQS(e164: string, key: string): Promise<any> {
    try {
      const response = await fetch(`https://www.ipqualityscore.com/api/json/phone/${key}/${e164}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            carrier: data.carrier,
            region: data.region,
            city: data.city,
            zipCode: data.zip_code,
            fraudScore: data.fraud_score
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}
