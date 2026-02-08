/**
 * FreshCuts Deep Linking System - Type Definitions
 * Proper TypeScript interfaces for type safety
 */

// Core deep link interface
export interface FreshCutsDeepLink {
  scheme: 'freshcuts';
  action: 'payment' | 'booking' | 'tip' | 'shop' | 'barber' | 'review' | 'promotions' | 'profile';
  params: Record<string, string>;
  originalUrl: string;
}

// Parameter interfaces
export interface PaymentLinkParams {
  amount?: number;        // Amount in dollars (e.g., 45 for $45)
  shop?: string;         // Shop ID (e.g., nyc_01)
  service?: ServiceType; // Service type
  barber?: string;       // Barber ID
  appointment?: string;  // Appointment ID
  split?: boolean;       // Enable split payment
  private?: boolean;     // Private transaction
}

export interface BookingLinkParams {
  barber?: string;       // Barber ID (e.g., jb)
  shop?: string;         // Shop ID
  service?: ServiceType; // Service type
  datetime?: string;     // ISO datetime string
  duration?: number;     // Duration in minutes
  group?: boolean;       // Group booking
  participants?: number; // Number of participants
}

export interface TipLinkParams {
  barber?: string;       // Barber ID (e.g., jb)
  amount?: number;       // Tip amount in dollars
  percentage?: number;   // Tip percentage (e.g., 20 for 20%)
  appointment?: string;  // Appointment ID
  shop?: string;         // Shop ID
}

// Service types
export type ServiceType = 'haircut' | 'beard' | 'trim' | 'style' | 'color' | 'treatment';

// Venmo payment interfaces
export interface VenmoPaymentRequest {
  amount: number;                    // Amount in cents
  currency: string;                  // Currency code
  description: string;               // Payment description
  merchantNote?: string;             // Merchant note
  privateTransaction: boolean;      // Private transaction flag
  metadata?: Record<string, any>;    // Additional metadata
  splitPayment?: SplitPaymentDetails; // Split payment details
}

export interface SplitPaymentDetails {
  enabled: boolean;
  participants: string[];           // Participant IDs
}

export interface VenmoPaymentResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;                    // Amount in cents
  currency: string;
  description?: string;
  privateTransaction: boolean;
  createdAt: string;
  updatedAt?: string;
  transactionId?: string;
  splitDetails?: SplitPaymentResult;
  qrCode?: QRCodeDetails;
}

export interface SplitPaymentResult {
  totalParticipants: number;
  completedPayments: number;
  remainingAmount: number;           // Remaining amount in cents
}

export interface QRCodeDetails {
  data: string;
  expiresAt: string;
}

// Deep link handler result interfaces
export interface DeepLinkResult {
  type: string;
  action: string;
  data: any;
  params: Record<string, string>;
  deepLink?: FreshCutsDeepLink;
}

export interface PaymentResult extends DeepLinkResult {
  type: 'payment';
  action: 'created';
  data: VenmoPaymentResponse;
}

export interface BookingResult extends DeepLinkResult {
  type: 'booking';
  action: 'initiated';
  data: BookingData;
}

export interface BookingData {
  barber?: string;
  shop?: string;
  service?: ServiceType;
  datetime?: string;
  duration?: number;
  group?: boolean;
  participants?: number;
}

export interface TipResult extends DeepLinkResult {
  type: 'tip';
  action: 'created' | 'prompt';
  data: VenmoPaymentResponse | TipPromptData;
}

export interface TipPromptData {
  barber?: string;
  suggestedAmount?: number;
  percentage?: number;
}

export interface NavigationResult extends DeepLinkResult {
  type: 'shop' | 'barber' | 'profile' | 'review';
  action: 'navigate' | 'prompt';
  data: NavigationData;
}

export interface NavigationData {
  shopId?: string;
  barberId?: string;
  userId?: string;
  appointmentId?: string;
  url: string;
}

export interface PromotionResult extends DeepLinkResult {
  type: 'promotions';
  action: 'apply';
  data: PromotionData;
}

export interface PromotionData {
  promoCode?: string;
  url: string;
}

// Venmo Gateway interface
export interface VenmoGateway {
  createPayment(request: VenmoPaymentRequest): Promise<VenmoPaymentResponse>;
  // Add other Venmo methods as needed
  getPayment?(paymentId: string): Promise<VenmoPaymentResponse>;
  refundPayment?(paymentId: string, amount?: number): Promise<VenmoPaymentResponse>;
}

// Manager interfaces
export interface DeepLinkContextType {
  currentLink: FreshCutsDeepLink | null;
  isLoading: boolean;
  error: string | null;
  handleDeepLink: (url: string) => Promise<void>;
  clearLink: () => void;
  generateLink: (action: string, params: any) => string;
}

export interface FreshCutsDeepLinkManagerProps {
  venmoGateway: VenmoGateway;
  onPaymentCreated?: (payment: VenmoPaymentResponse) => void;
  onBookingInitiated?: (booking: BookingData) => void;
  onTipCreated?: (tip: VenmoPaymentResponse) => void;
  onNavigation?: (route: string, params: Record<string, any>) => void;
}

// Error types
export class DeepLinkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalUrl?: string
  ) {
    super(message);
    this.name = 'DeepLinkError';
  }
}

export class ValidationError extends DeepLinkError {
  constructor(message: string, originalUrl?: string) {
    super(message, 'VALIDATION_ERROR', originalUrl);
    this.name = 'ValidationError';
  }
}

export class ParseError extends DeepLinkError {
  constructor(message: string, originalUrl?: string) {
    super(message, 'PARSE_ERROR', originalUrl);
    this.name = 'ParseError';
  }
}

export class HandlerError extends DeepLinkError {
  constructor(message: string, originalUrl?: string) {
    super(message, 'HANDLER_ERROR', originalUrl);
    this.name = 'HandlerError';
  }
}

// Validation schemas
export interface ValidationRule<T = any> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: T[];
  transform?: (value: string) => T;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Analytics interfaces
export interface DeepLinkAnalytics {
  url: string;
  action: string;
  params: Record<string, string>;
  timestamp: string;
  userAgent?: string;
  source?: string;
  success: boolean;
  error?: string;
  processingTime: number; // in milliseconds
}

export interface AnalyticsProvider {
  track(event: DeepLinkAnalytics): Promise<void>;
  getMetrics?(timeRange?: { start: string; end: string }): Promise<AnalyticsMetrics>;
}

export interface AnalyticsMetrics {
  totalLinks: number;
  successRate: number;
  popularActions: Array<{ action: string; count: number }>;
  averageProcessingTime: number;
  errors: Array<{ error: string; count: number }>;
}

// Rate limiting interfaces
export interface RateLimiter {
  isAllowed(key: string, limit: number, windowMs: number): Promise<boolean>;
  getRemainingRequests(key: string): Promise<number>;
  getResetTime(key: string): Promise<number>;
}

export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  keyGenerator?: (url: string) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Configuration interfaces
export interface DeepLinkConfig {
  scheme: string;
  validActions: readonly string[];
  validation: {
    strict: boolean;
    sanitizeInput: boolean;
    maxUrlLength: number;
  };
  rateLimiting?: RateLimitConfig;
  analytics?: {
    enabled: boolean;
    provider?: AnalyticsProvider;
  };
  security: {
    allowedDomains?: string[];
    maxRedirects: number;
    timeout: number;
  };
}

export default {
  DeepLinkError,
  ValidationError,
  ParseError,
  HandlerError
};
