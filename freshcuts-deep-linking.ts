/**
 * FreshCuts Deep Linking System
 * Custom URL scheme support for freshcuts:// protocol
 * Handles payments, bookings, tips, and navigation
 */

import {
  FreshCutsDeepLink,
  PaymentLinkParams,
  BookingLinkParams,
  TipLinkParams,
  ServiceType,
  VenmoGateway,
  VenmoPaymentRequest,
  VenmoPaymentResponse,
  DeepLinkResult,
  ValidationError,
  ParseError,
  HandlerError,
  RateLimitConfig,
  AnalyticsProvider
} from './freshcuts-deep-linking-types';

import { RateLimitedDeepLinkHandler, RateLimitFactory } from './freshcuts-deep-linking-rate-limiter';
import { AnalyticsDecorator, AnalyticsFactory } from './freshcuts-deep-linking-analytics';

// Service type validation
export const VALID_SERVICES: ServiceType[] = ['haircut', 'beard', 'trim', 'style', 'color', 'treatment'];

// Business constants
export const DEFAULT_SERVICE_AMOUNT = 45; // Default service amount in USD
export const MAX_PARTICIPANTS = 20;
export const MAX_DURATION_MINUTES = 480;
export const MAX_URL_LENGTH = 2048;
export const MAX_QUERY_PARAMS = 50;

// Validation patterns and constants
export const VALIDATION_PATTERNS = {
  ID: /^[a-zA-Z0-9_-]+$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  PERCENTAGE: /^(100|[1-9]?\d)$/
} as const;

export const VALIDATION_MESSAGES = {
  INVALID_ID: 'Invalid ID format. Only alphanumeric characters, underscores, and hyphens are allowed.',
  INVALID_AMOUNT: 'Invalid amount format. Must be a positive number with up to 2 decimal places.',
  INVALID_DATETIME: 'Invalid datetime format. Use ISO 8601 format (e.g., 2024-01-15T14:30:00Z).',
  INVALID_PERCENTAGE: 'Invalid percentage. Must be between 0 and 100.',
  REQUIRED_FIELD: (field: string) => `${field} is required.`,
  INVALID_SERVICE: (services: string) => `Invalid service. Valid services: ${services}.`,
  EXCEEDS_MAX: (field: string, max: number) => `${field} cannot exceed ${max}.`
} as const;

// Input sanitization helpers
export const sanitizeInput = {
  id: (id: string): string => {
    if (!id) return '';
    return id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  },
  
  amount: (amount: string): string => {
    if (!amount) return '';
    return amount.trim().replace(/[^0-9.]/g, '');
  },
  
  text: (text: string): string => {
    if (!text) return '';
    return text.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
  },
  
  url: (url: string): string => {
    if (!url) return '';
    return url.trim().replace(/[<>"'\\]/g, ''); // Remove potentially dangerous characters
  },
  
  service: (service: string): string => {
    if (!service) return '';
    const sanitized = service.toLowerCase().trim().replace(/[^a-z]/g, '');
    return sanitized as ServiceType;
  }
};

// Structured logging helper
export const logger = {
  debug: (action: string, data: any, context?: string) => {
    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_DEEP_LINKS === 'true') {
      const prefix = context ? `[${context}]` : '';
      console.log(`🔗 ${prefix} ${action}:`, data);
    }
  },
  
  info: (action: string, data: any, context?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      const prefix = context ? `[${context}]` : '';
      console.log(`ℹ️ ${prefix} ${action}:`, data);
    }
  },
  
  warn: (action: string, data: any, context?: string) => {
    const prefix = context ? `[${context}]` : '';
    console.warn(`⚠️ ${prefix} ${action}:`, data);
  },
  
  error: (action: string, error: Error | string, context?: string) => {
    const prefix = context ? `[${context}]` : '';
    console.error(`❌ ${prefix} ${action}:`, error);
  }
};

// Performance timing helper
export const withTiming = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: string
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    
    // Log slow operations (>100ms)
    if (duration > 100) {
      logger.warn(`Slow operation detected`, {
        operation: operationName,
        duration: `${duration}ms`,
        threshold: '100ms'
      }, context || 'Performance');
    } else if (process.env.DEBUG_PERFORMANCE === 'true') {
      logger.debug(`Operation completed`, {
        operation: operationName,
        duration: `${duration}ms`
      }, context || 'Performance');
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Operation failed`, `${operationName} in ${duration}ms: ${error}`, context || 'Performance');
    throw error;
  }
};

// Deep link parser class
export class FreshCutsDeepLinkParser {
  private static readonly SCHEME = 'freshcuts';
  private static readonly VALID_ACTIONS = [
    'payment', 'booking', 'tip', 'shop', 'barber', 'review', 'promotions', 'profile'
  ] as const;

  /**
   * Parse a freshcuts:// URL into structured data
   */
  static parse(url: string): FreshCutsDeepLink {
    // Sanitize input URL for security
    const sanitizedUrl = sanitizeInput.url(url);
    
    if (!sanitizedUrl.startsWith(this.SCHEME + '://')) {
      throw new ParseError(`Invalid URL scheme. Expected ${this.SCHEME}://`);
    }

    const [schemeAndAction, queryString] = sanitizedUrl.substring(this.SCHEME.length + 3).split('?');
    
    if (!schemeAndAction) {
      throw new ParseError('Missing action in URL');
    }

    const action = schemeAndAction.toLowerCase();
    if (!this.VALID_ACTIONS.includes(action as any)) {
      throw new ParseError(`Invalid action: ${action}. Valid actions: ${this.VALID_ACTIONS.join(', ')}`);
    }

    const params = this.parseQueryString(queryString || '');

    return {
      scheme: this.SCHEME,
      action: action as FreshCutsDeepLink['action'],
      params,
      originalUrl: sanitizedUrl
    };
  }

  /**
   * Parse query string into parameter object
   */
  private static parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (!queryString) return params;

    queryString.split('&').forEach(param => {
      if (!param) return; // Skip empty parameters
      
      const parts = param.split('=');
      if (parts.length !== 2) {
        throw new Error(`Invalid query parameter format: ${param}. Expected key=value format.`);
      }
      
      const [key, value] = parts;
      if (key) {
        try {
          params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
        } catch (error) {
          throw new Error(`Invalid URL encoding in parameter: ${param}`);
        }
      }
    });

    return params;
  }

  /**
   * Validate and type-cast payment parameters
   */
  static validatePaymentParams(params: Record<string, string>): PaymentLinkParams {
    const paymentParams: PaymentLinkParams = {};

    // Amount validation
    if (params.amount) {
      const amount = parseFloat(params.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }
      paymentParams.amount = amount;
    }

    // Shop validation
    if (params.shop) {
      if (!VALIDATION_PATTERNS.ID.test(params.shop)) {
        throw new ValidationError(VALIDATION_MESSAGES.INVALID_ID);
      }
      paymentParams.shop = params.shop;
    }

    // Service validation
    if (params.service) {
      const service = params.service.toLowerCase() as ServiceType;
      if (!VALID_SERVICES.includes(service)) {
        throw new ValidationError(`Invalid service: ${params.service}. Valid services: ${VALID_SERVICES.join(', ')}`);
      }
      paymentParams.service = service;
    }

    // Barber validation
    if (params.barber) {
      if (!/^[a-zA-Z0-9_-]+$/.test(params.barber)) {
        throw new Error('Invalid barber ID format');
      }
      paymentParams.barber = params.barber;
    }

    // Boolean parameters
    paymentParams.split = params.split === 'true';
    paymentParams.private = params.private !== 'false'; // Default to true

    // Optional parameters
    if (params.appointment) paymentParams.appointment = params.appointment;

    return paymentParams;
  }

  /**
   * Validate and type-cast booking parameters
   */
  static validateBookingParams(params: Record<string, string>): BookingLinkParams {
    const bookingParams: BookingLinkParams = {};

    // Barber validation
    if (params.barber) {
      if (!/^[a-zA-Z0-9_-]+$/.test(params.barber)) {
        throw new Error('Invalid barber ID format');
      }
      bookingParams.barber = params.barber;
    }

    // Shop validation
    if (params.shop) {
      if (!/^[a-zA-Z0-9_-]+$/.test(params.shop)) {
        throw new Error('Invalid shop ID format');
      }
      bookingParams.shop = params.shop;
    }

    // Service validation
    if (params.service) {
      const service = params.service.toLowerCase() as ServiceType;
      if (!VALID_SERVICES.includes(service)) {
        throw new ValidationError(`Invalid service: ${params.service}. Valid services: ${VALID_SERVICES.join(', ')}`);
      }
      bookingParams.service = service;
    }

    // Datetime validation
    if (params.datetime) {
      const date = new Date(params.datetime);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid datetime format');
      }
      bookingParams.datetime = params.datetime;
    }

    // Duration validation
    if (params.duration) {
      const duration = parseInt(params.duration);
      if (isNaN(duration) || duration <= 0 || duration > 480) { // Max 8 hours
        throw new Error('Invalid duration: must be between 1 and 480 minutes');
      }
      bookingParams.duration = duration;
    }

    // Boolean parameters
    bookingParams.group = params.group === 'true';

    // Participants validation
    if (params.participants) {
      const participants = parseInt(params.participants);
      if (isNaN(participants) || participants < 1 || participants > 20) {
        throw new Error('Invalid participants: must be between 1 and 20');
      }
      bookingParams.participants = participants;
    }

    return bookingParams;
  }

  /**
   * Validate and type-cast tip parameters
   */
  static validateTipParams(params: Record<string, string>): TipLinkParams {
    const tipParams: TipLinkParams = {};

    // Barber validation
    if (params.barber) {
      if (!/^[a-zA-Z0-9_-]+$/.test(params.barber)) {
        throw new Error('Invalid barber ID format');
      }
      tipParams.barber = params.barber;
    }

    // Amount validation
    if (params.amount) {
      const amount = parseFloat(params.amount);
      if (isNaN(amount) || amount < 0) {
        throw new Error('Invalid tip amount: must be a non-negative number');
      }
      tipParams.amount = amount;
    }

    // Percentage validation
    if (params.percentage) {
      const percentage = parseFloat(params.percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        throw new Error('Invalid tip percentage: must be between 0 and 100');
      }
      tipParams.percentage = percentage;
    }

    // Optional parameters
    if (params.appointment) tipParams.appointment = params.appointment;
    if (params.shop) tipParams.shop = params.shop;

    return tipParams;
  }
}

// Deep link handler class
export class FreshCutsDeepLinkHandler {
  private venmoGateway: VenmoGateway;
  private rateLimitConfig?: RateLimitConfig;
  private analytics?: AnalyticsDecorator;

  constructor(
    venmoGateway: VenmoGateway,
    options: {
      rateLimit?: RateLimitConfig;
      analytics?: AnalyticsProvider;
    } = {}
  ) {
    this.venmoGateway = venmoGateway;
    this.rateLimitConfig = options.rateLimit;
    
    // Initialize analytics if configured
    if (options.analytics) {
      this.analytics = AnalyticsFactory.createDecorator(options.analytics);
    }
  }

  /**
   * Handle incoming deep link
   */
  async handleDeepLink(url: string): Promise<any> {
    const processLink = async (): Promise<any> => {
      try {
        const deepLink = FreshCutsDeepLinkParser.parse(url);
        
        let result;
        switch (deepLink.action) {
          case 'payment':
            result = await this.handlePaymentLink(deepLink);
            break;
          case 'booking':
            result = await this.handleBookingLink(deepLink);
            break;
          case 'tip':
            result = await this.handleTipLink(deepLink);
            break;
          case 'shop':
            result = await this.handleShopLink(deepLink);
            break;
          case 'barber':
            result = await this.handleBarberLink(deepLink);
            break;
          case 'review':
            result = await this.handleReviewLink(deepLink);
            break;
          case 'promotions':
            result = await this.handlePromotionsLink(deepLink);
            break;
          case 'profile':
            result = await this.handleProfileLink(deepLink);
            break;
          default:
            throw new HandlerError(`Unsupported action: ${deepLink.action}`, url);
        }
        
        // Return result with parsed deep link to avoid re-parsing
        return {
          ...result,
          deepLink
        };
      } catch (error) {
        logger.error('Deep link handling failed', error instanceof Error ? error : String(error), 'MainHandler');
        throw error;
      }
    };

    // Apply analytics if configured
    if (this.analytics) {
      return await this.analytics.withAnalytics(url, () => processLink());
    }

    // Default processing without analytics
    return await processLink();
  }

  /**
   * Handle payment deep link
   */
  private async handlePaymentLink(deepLink: FreshCutsDeepLink): Promise<any> {
    return await withTiming(async () => {
      const params = FreshCutsDeepLinkParser.validatePaymentParams(deepLink.params);
      
      logger.debug('Processing payment deep link', params, 'PaymentHandler');

    // Create Venmo payment request
    const paymentRequest: any = {
      amount: Math.round((params.amount || 0) * 100), // Convert to cents
      currency: 'USD',
      description: this.generatePaymentDescription(params),
      merchantNote: `Deep link payment from ${params.shop || 'unknown'}`,
      privateTransaction: params.private !== false,
      metadata: {
        source: 'deep_link',
        shop: params.shop,
        service: params.service,
        barber: params.barber,
        appointment: params.appointment,
      }
    };

    // Add split payment details if enabled
    if (params.split) {
      paymentRequest.splitPayment = {
        enabled: true,
        participants: [] // Would be populated with actual participant IDs
      };
    }

    // Create payment
    const payment = await this.venmoGateway.createPayment(paymentRequest);
    
    return {
      type: 'payment',
      action: 'created',
      data: payment,
      params
    };
    }, 'payment processing', 'PaymentHandler');
  }

  /**
   * Handle booking deep link
   */
  private async handleBookingLink(deepLink: FreshCutsDeepLink): Promise<any> {
    return await withTiming(async () => {
      const params = FreshCutsDeepLinkParser.validateBookingParams(deepLink.params);
      
      logger.debug('Processing booking deep link', params, 'BookingHandler');

      // Create booking logic would go here
      // For now, return booking information
      return {
        type: 'booking',
        action: 'initiated',
        data: {
          barber: params.barber,
          shop: params.shop,
          service: params.service,
          datetime: params.datetime,
          duration: params.duration,
          group: params.group,
          participants: params.participants
        },
        params
      };
    }, 'booking processing', 'BookingHandler');
  }

  /**
   * Handle tip deep link
   */
  private async handleTipLink(deepLink: FreshCutsDeepLink): Promise<any> {
    const params = FreshCutsDeepLinkParser.validateTipParams(deepLink.params);
    
    logger.debug('Processing tip deep link', params, 'TipHandler');

    // Create tip payment
    let tipAmount = params.amount;
    
    // Calculate tip from percentage if amount not provided
    if (!tipAmount && params.percentage) {
      // Would need to get service amount from appointment or default
      const serviceAmount = DEFAULT_SERVICE_AMOUNT;
      tipAmount = (serviceAmount * params.percentage) / 100;
    }

    if (tipAmount && tipAmount > 0) {
      const paymentRequest = {
        amount: Math.round(tipAmount * 100), // Convert to cents
        currency: 'USD',
        description: `Tip for barber ${params.barber}`,
        merchantNote: 'Tip via deep link',
        privateTransaction: true,
        metadata: {
          source: 'deep_link',
          type: 'tip',
          barber: params.barber,
          appointment: params.appointment,
          shop: params.shop
        }
      };

      const payment = await this.venmoGateway.createPayment(paymentRequest);
      
      return {
        type: 'tip',
        action: 'created',
        data: payment,
        params
      };
    }

    return {
      type: 'tip',
      action: 'prompt',
      data: {
        barber: params.barber,
        suggestedAmount: tipAmount,
        percentage: params.percentage
      },
      params
    };
  }

  /**
   * Handle shop deep link
   */
  private async handleShopLink(deepLink: FreshCutsDeepLink): Promise<any> {
    const shopId = deepLink.params.shop;
    
    if (!shopId) {
      throw new Error('Shop ID is required for shop deep links');
    }
    
    // Validate shop ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(shopId)) {
      throw new Error('Invalid shop ID format');
    }
    
    logger.debug('Processing shop deep link', shopId, 'NavigationHandler');

    return {
      type: 'shop',
      action: 'navigate',
      data: {
        shopId,
        url: `/shop/${encodeURIComponent(shopId)}`
      },
      params: deepLink.params
    };
  }

  /**
   * Handle barber deep link
   */
  private async handleBarberLink(deepLink: FreshCutsDeepLink): Promise<any> {
    const barberId = deepLink.params.barber;
    
    if (!barberId) {
      throw new Error('Barber ID is required for barber deep links');
    }
    
    // Validate barber ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(barberId)) {
      throw new Error('Invalid barber ID format');
    }
    
    logger.debug('Processing barber deep link', barberId, 'NavigationHandler');

    return {
      type: 'barber',
      action: 'navigate',
      data: {
        barberId,
        url: `/barber/${encodeURIComponent(barberId)}`
      },
      params: deepLink.params
    };
  }

  /**
   * Handle review deep link
   */
  private async handleReviewLink(deepLink: FreshCutsDeepLink): Promise<any> {
    const appointmentId = deepLink.params.appointment;
    
    // Validate appointment ID format if provided
    if (appointmentId && !/^[a-zA-Z0-9_-]+$/.test(appointmentId)) {
      throw new Error('Invalid appointment ID format');
    }
    
    logger.debug('Processing review deep link', appointmentId, 'NavigationHandler');

    return {
      type: 'review',
      action: 'prompt',
      data: {
        appointmentId,
        url: appointmentId ? `/review/${encodeURIComponent(appointmentId)}` : '/review'
      },
      params: deepLink.params
    };
  }

  /**
   * Handle promotions deep link
   */
  private async handlePromotionsLink(deepLink: FreshCutsDeepLink): Promise<any> {
    const promoCode = deepLink.params.code;
    
    // Validate promo code format if provided
    if (promoCode && !/^[a-zA-Z0-9_-]+$/.test(promoCode)) {
      throw new Error('Invalid promo code format');
    }
    
    logger.debug('Processing promotions deep link', promoCode, 'NavigationHandler');

    return {
      type: 'promotions',
      action: 'apply',
      data: {
        promoCode,
        url: '/promotions'
      },
      params: deepLink.params
    };
  }

  /**
   * Handle profile deep link
   */
  private async handleProfileLink(deepLink: FreshCutsDeepLink): Promise<any> {
    const userId = deepLink.params.user;
    
    // Validate user ID format if provided
    if (userId && !/^[a-zA-Z0-9_-]+$/.test(userId)) {
      throw new Error('Invalid user ID format');
    }
    
    logger.debug('Processing profile deep link', userId, 'NavigationHandler');

    return {
      type: 'profile',
      action: 'navigate',
      data: {
        userId,
        url: userId ? `/profile/${encodeURIComponent(userId)}` : '/profile'
      },
      params: deepLink.params
    };
  }

  /**
   * Generate payment description based on parameters
   */
  private generatePaymentDescription(params: PaymentLinkParams): string {
    const parts: string[] = [];
    
    if (params.service) {
      parts.push(params.service.charAt(0).toUpperCase() + params.service.slice(1));
    }
    
    if (params.barber) {
      parts.push(`with ${params.barber}`);
    }
    
    if (params.shop) {
      parts.push(`at ${params.shop}`);
    }
    
    return parts.length > 0 ? parts.join(' ') : 'FreshCuts Service';
  }
}

// Deep link generator utilities
export class FreshCutsDeepLinkGenerator {
  private static readonly BASE_URL = 'freshcuts://';

  /**
   * Generate payment deep link
   */
  static payment(params: PaymentLinkParams): string {
    const queryParams = new URLSearchParams();
    
    if (params.amount) queryParams.append('amount', params.amount.toString());
    if (params.shop) queryParams.append('shop', params.shop);
    if (params.service) queryParams.append('service', params.service);
    if (params.barber) queryParams.append('barber', params.barber);
    if (params.appointment) queryParams.append('appointment', params.appointment);
    if (params.split) queryParams.append('split', 'true');
    if (params.private !== undefined) queryParams.append('private', params.private.toString());

    return `${this.BASE_URL}payment?${queryParams.toString()}`;
  }

  /**
   * Generate booking deep link
   */
  static booking(params: BookingLinkParams): string {
    const queryParams = new URLSearchParams();
    
    if (params.barber) queryParams.append('barber', params.barber);
    if (params.shop) queryParams.append('shop', params.shop);
    if (params.service) queryParams.append('service', params.service);
    if (params.datetime) queryParams.append('datetime', params.datetime);
    if (params.duration) queryParams.append('duration', params.duration.toString());
    if (params.group) queryParams.append('group', 'true');
    if (params.participants) queryParams.append('participants', params.participants.toString());

    return `${this.BASE_URL}booking?${queryParams.toString()}`;
  }

  /**
   * Generate tip deep link
   */
  static tip(params: TipLinkParams): string {
    const queryParams = new URLSearchParams();
    
    if (params.barber) queryParams.append('barber', params.barber);
    if (params.amount) queryParams.append('amount', params.amount.toString());
    if (params.percentage) queryParams.append('percentage', params.percentage.toString());
    if (params.appointment) queryParams.append('appointment', params.appointment);
    if (params.shop) queryParams.append('shop', params.shop);

    return `${this.BASE_URL}tip?${queryParams.toString()}`;
  }

  /**
   * Generate shop deep link
   */
  static shop(shopId: string): string {
    return `${this.BASE_URL}shop?shop=${encodeURIComponent(shopId)}`;
  }

  /**
   * Generate barber deep link
   */
  static barber(barberId: string): string {
    return `${this.BASE_URL}barber?barber=${encodeURIComponent(barberId)}`;
  }

  /**
   * Generate review deep link
   */
  static review(appointmentId?: string): string {
    const base = `${this.BASE_URL}review`;
    if (appointmentId) {
      return `${base}?appointment=${encodeURIComponent(appointmentId)}`;
    }
    return base;
  }

  /**
   * Generate promotions deep link
   */
  static promotions(promoCode?: string): string {
    const base = `${this.BASE_URL}promotions`;
    if (promoCode) {
      return `${base}?code=${encodeURIComponent(promoCode)}`;
    }
    return base;
  }

  /**
   * Generate profile deep link
   */
  static profile(userId?: string): string {
    const base = `${this.BASE_URL}profile`;
    if (userId) {
      return `${base}?user=${encodeURIComponent(userId)}`;
    }
    return base;
  }
}

// Example usage and testing
export function demonstrateDeepLinking() {
  console.log('🔗 FreshCuts Deep Linking System Demo\n');

  // Example deep links from your request
  const exampleLinks = [
    'freshcuts://payment?amount=45&shop=nyc_01',
    'freshcuts://booking?barber=jb',
    'freshcuts://tip?barber=jb'
  ];

  console.log('📱 Example Deep Links:');
  exampleLinks.forEach(link => {
    console.log(`  ${link}`);
  });

  console.log('\n🔧 Parsing Examples:');
  
  // Parse payment link
  try {
    const paymentLink = FreshCutsDeepLinkParser.parse('freshcuts://payment?amount=45&shop=nyc_01&service=haircut&barber=jb');
    console.log('✅ Payment link parsed:', paymentLink);
    
    const paymentParams = FreshCutsDeepLinkParser.validatePaymentParams(paymentLink.params);
    console.log('✅ Payment params validated:', paymentParams);
  } catch (error) {
    console.log('❌ Payment link error:', error.message);
  }

  // Parse booking link
  try {
    const bookingLink = FreshCutsDeepLinkParser.parse('freshcuts://booking?barber=jb&service=haircut&datetime=2024-01-15T14:30:00Z');
    console.log('✅ Booking link parsed:', bookingLink);
    
    const bookingParams = FreshCutsDeepLinkParser.validateBookingParams(bookingLink.params);
    console.log('✅ Booking params validated:', bookingParams);
  } catch (error) {
    console.log('❌ Booking link error:', error.message);
  }

  // Parse tip link
  try {
    const tipLink = FreshCutsDeepLinkParser.parse('freshcuts://tip?barber=jb&amount=10');
    console.log('✅ Tip link parsed:', tipLink);
    
    const tipParams = FreshCutsDeepLinkParser.validateTipParams(tipLink.params);
    console.log('✅ Tip params validated:', tipParams);
  } catch (error) {
    console.log('❌ Tip link error:', error.message);
  }

  console.log('\n🔗 Generated Links:');
  
  // Generate example links
  console.log('Payment:', FreshCutsDeepLinkGenerator.payment({
    amount: 45,
    shop: 'nyc_01',
    service: 'haircut',
    barber: 'jb',
    private: true
  }));

  console.log('Booking:', FreshCutsDeepLinkGenerator.booking({
    barber: 'jb',
    shop: 'nyc_01',
    service: 'beard',
    datetime: '2024-01-15T14:30:00Z',
    duration: 30
  }));

  console.log('Tip:', FreshCutsDeepLinkGenerator.tip({
    barber: 'jb',
    amount: 10,
    appointment: 'apt_123'
  }));

  console.log('Shop:', FreshCutsDeepLinkGenerator.shop('nyc_01'));
  console.log('Barber:', FreshCutsDeepLinkGenerator.barber('jb'));
  console.log('Review:', FreshCutsDeepLinkGenerator.review('apt_123'));
  console.log('Promotions:', FreshCutsDeepLinkGenerator.promotions('SAVE20'));
  console.log('Profile:', FreshCutsDeepLinkGenerator.profile('user_456'));
}

// Export for use in other modules
export default {
  FreshCutsDeepLinkParser,
  FreshCutsDeepLinkHandler,
  FreshCutsDeepLinkGenerator,
  demonstrateDeepLinking
};
