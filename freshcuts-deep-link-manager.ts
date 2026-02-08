/**
 * FreshCuts Deep Link Manager - TypeScript Version
 * Handles deep link routing and state management for FreshCuts mobile app
 * Pure TypeScript implementation without JSX dependencies
 */

import {
  FreshCutsDeepLink,
  DeepLinkContextType,
  FreshCutsDeepLinkManagerProps,
  VenmoGateway,
  ServiceType,
  PaymentLinkParams,
  BookingLinkParams,
  TipLinkParams
} from './freshcuts-deep-linking-types';

import { 
  FreshCutsDeepLinkHandler,
  FreshCutsDeepLinkParser,
  FreshCutsDeepLinkGenerator
} from './freshcuts-deep-linking';

// Deep Link Manager Class
export class FreshCutsDeepLinkManager {
  private handler: FreshCutsDeepLinkHandler;
  private currentLink: FreshCutsDeepLink | null = null;
  private isLoading: boolean = false;
  private error: string | null = null;
  private callbacks: FreshCutsDeepLinkManagerProps;
  private deepLinkEventHandler: (event: any) => void;

  constructor(props: FreshCutsDeepLinkManagerProps) {
    this.handler = new FreshCutsDeepLinkHandler(props.venmoGateway);
    this.callbacks = props;
    this.deepLinkEventHandler = this.handleDeepLinkEvent.bind(this);
  }

  /**
   * Get current state
   */
  getState(): DeepLinkContextType {
    return {
      currentLink: this.currentLink,
      isLoading: this.isLoading,
      error: this.error,
      handleDeepLink: this.handleDeepLink.bind(this),
      clearLink: this.clearLink.bind(this),
      generateLink: this.generateLink.bind(this)
    };
  }

  /**
   * Handle deep link processing
   */
  async handleDeepLink(url: string): Promise<any> {
    console.log('🔗 Processing deep link:', url);
    
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.handler.handleDeepLink(url);
      // Use the already parsed deep link from result to avoid race condition
      this.currentLink = result.deepLink || FreshCutsDeepLinkParser.parse(url);

      // Route result to appropriate handler
      switch (result.type) {
        case 'payment':
          if (result.action === 'created' && this.callbacks.onPaymentCreated) {
            this.callbacks.onPaymentCreated(result.data);
          }
          break;
        
        case 'booking':
          if (this.callbacks.onBookingInitiated) {
            this.callbacks.onBookingInitiated(result.data);
          }
          break;
        
        case 'tip':
          if (result.action === 'created' && this.callbacks.onTipCreated) {
            this.callbacks.onTipCreated(result.data);
          } else if (result.action === 'prompt' && this.callbacks.onNavigation) {
            this.callbacks.onNavigation('/tip-prompt', result.data);
          }
          break;
        
        case 'shop':
        case 'barber':
        case 'profile':
          if (this.callbacks.onNavigation) {
            this.callbacks.onNavigation(result.data.url, result.params);
          }
          break;
        
        case 'review':
          if (this.callbacks.onNavigation) {
            this.callbacks.onNavigation(result.data.url, result.params);
          }
          break;
        
        case 'promotions':
          if (this.callbacks.onNavigation) {
            this.callbacks.onNavigation('/promotions', { code: result.data.promoCode });
          }
          break;
        
        default:
          console.log('Unhandled deep link type:', result.type);
      }

      console.log('✅ Deep link processed successfully:', result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      this.error = errorMessage;
      console.error('❌ Deep link processing failed:', errorMessage);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Clear current link
   */
  clearLink(): void {
    this.currentLink = null;
    this.error = null;
  }

  /**
   * Generate deep link
   */
  generateLink(action: string, params: any): string {
    switch (action) {
      case 'payment':
        const paymentParams = { ...params };
        if (paymentParams.service) {
          paymentParams.service = paymentParams.service as ServiceType;
        }
        return FreshCutsDeepLinkGenerator.payment(paymentParams);
      case 'booking':
        const bookingParams = { ...params };
        if (bookingParams.service) {
          bookingParams.service = bookingParams.service as ServiceType;
        }
        return FreshCutsDeepLinkGenerator.booking(bookingParams);
      case 'tip':
        return FreshCutsDeepLinkGenerator.tip(params);
      case 'shop':
        return FreshCutsDeepLinkGenerator.shop(params.shopId);
      case 'barber':
        return FreshCutsDeepLinkGenerator.barber(params.barberId);
      case 'review':
        return FreshCutsDeepLinkGenerator.review(params.appointmentId);
      case 'promotions':
        return FreshCutsDeepLinkGenerator.promotions(params.promoCode);
      case 'profile':
        return FreshCutsDeepLinkGenerator.profile(params.userId);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Initialize deep link listener
   */
  initialize(): void {
    // Handle initial URL if app was launched with deep link
    const handleInitialURL = () => {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage !== 'undefined') {
        const initialURL = localStorage.getItem('freshcuts_deep_link');
        if (initialURL) {
          this.handleDeepLink(initialURL);
          localStorage.removeItem('freshcuts_deep_link');
        }
      }
    };

    handleInitialURL();

    // Listen for deep link events (would come from native bridge)
    if (typeof window !== 'undefined') {
      window.addEventListener('freshcuts-deep-link', this.deepLinkEventHandler);
    }
  }

  /**
   * Handle deep link event from native bridge
   */
  private handleDeepLinkEvent = (event: any) => {
    if (event.detail && event.detail.url) {
      this.handleDeepLink(event.detail.url);
    }
  };

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('freshcuts-deep-link', this.deepLinkEventHandler);
    }
  }
}

// Deep Link Status Logger
export class DeepLinkStatusLogger {
  static logStatus(state: DeepLinkContextType): void {
    if (!state.currentLink && !state.isLoading && !state.error) {
      return;
    }

    if (state.isLoading) {
      console.log('🔄 Deep Link Status: Processing...');
    }

    if (state.error) {
      console.log(`❌ Deep Link Error: ${state.error}`);
    }

    if (state.currentLink && !state.isLoading && !state.error) {
      console.log(`✅ Deep Link Active: ${state.currentLink.action} - ${Object.keys(state.currentLink.params).length} parameters`);
    }
  }
}

// Deep Link Generator Utility
export class DeepLinkGeneratorUtil {
  /**
   * Generate payment link with validation
   */
  static generatePaymentLink(params: {
    amount: number;
    shop?: string;
    service?: string;
    barber?: string;
    private?: boolean;
  }): string {
    if (!params.amount || params.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    
    const paymentParams: PaymentLinkParams = {
      amount: params.amount,
      shop: params.shop,
      barber: params.barber,
      private: params.private
    };
    
    if (params.service) {
      paymentParams.service = params.service as ServiceType;
    }
    
    return FreshCutsDeepLinkGenerator.payment(paymentParams);
  }

  /**
   * Generate booking link with validation
   */
  static generateBookingLink(params: {
    barber?: string;
    shop?: string;
    service?: string;
    datetime?: string;
    duration?: number;
    group?: boolean;
    participants?: number;
  }): string {
    if (params.datetime) {
      const date = new Date(params.datetime);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid datetime format');
      }
    }
    
    if (params.duration && (params.duration < 1 || params.duration > 480)) {
      throw new Error('Duration must be between 1 and 480 minutes');
    }
    
    const bookingParams: BookingLinkParams = {
      barber: params.barber,
      shop: params.shop,
      datetime: params.datetime,
      duration: params.duration,
      group: params.group,
      participants: params.participants
    };
    
    if (params.service) {
      bookingParams.service = params.service as ServiceType;
    }
    
    return FreshCutsDeepLinkGenerator.booking(bookingParams);
  }

  /**
   * Generate tip link with validation
   */
  static generateTipLink(params: {
    barber?: string;
    amount?: number;
    percentage?: number;
    appointment?: string;
    shop?: string;
  }): string {
    if (params.amount && params.amount < 0) {
      throw new Error('Tip amount must be non-negative');
    }
    
    if (params.percentage && (params.percentage < 0 || params.percentage > 100)) {
      throw new Error('Tip percentage must be between 0 and 100');
    }
    
    return FreshCutsDeepLinkGenerator.tip(params);
  }
}

// Example usage and testing
export function demonstrateDeepLinkManager() {
  console.log('🔗 FreshCuts Deep Link Manager Demo\n');

  // Mock Venmo gateway for demonstration
  class MockVenmoGateway {
    async createPayment(request: any) {
      console.log('💳 Mock Venmo payment created:', request);
      return {
        paymentId: `payment_${Date.now()}`,
        status: 'pending' as const,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        privateTransaction: request.privateTransaction,
        createdAt: new Date().toISOString()
      };
    }
  }

  // Create manager with callbacks
  const manager = new FreshCutsDeepLinkManager({
    venmoGateway: new MockVenmoGateway(),
    onPaymentCreated: (payment) => {
      console.log('💰 Payment created callback:', payment.paymentId);
    },
    onBookingInitiated: (booking) => {
      console.log('📅 Booking initiated callback:', booking);
    },
    onTipCreated: (tip) => {
      console.log('💵 Tip created callback:', tip.paymentId);
    },
    onNavigation: (route, params) => {
      console.log('🧭 Navigation callback:', route, params);
    }
  });

  // Initialize manager
  manager.initialize();

  // Test deep links
  const testLinks = [
    'freshcuts://payment?amount=45&shop=nyc_01',
    'freshcuts://booking?barber=jb',
    'freshcuts://tip?barber=jb&amount=10',
    'freshcuts://shop?shop=nyc_01',
    'freshcuts://barber?barber=jb'
  ];

  // Process test links
  (async () => {
    for (const link of testLinks) {
      try {
        console.log(`\n🔗 Testing: ${link}`);
        const result = await manager.handleDeepLink(link);
        DeepLinkStatusLogger.logStatus(manager.getState());
      } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    // Test link generation
    console.log('\n🔗 Testing Link Generation:');
    
    const paymentLink = manager.generateLink('payment', {
      amount: 45,
      shop: 'nyc_01',
      service: 'haircut' as const,
      private: true
    });
    console.log('Payment:', paymentLink);

    const bookingLink = manager.generateLink('booking', {
      barber: 'jb',
      datetime: '2024-01-15T14:30:00Z',
      service: 'haircut' as const
    });
    console.log('Booking:', bookingLink);

    const tipLink = manager.generateLink('tip', {
      barber: 'jb',
      amount: 10
    });
    console.log('Tip:', tipLink);

    console.log('\n✅ Demo completed successfully!');
  })();
}

// Export for use in other modules
export default {
  FreshCutsDeepLinkManager,
  DeepLinkStatusLogger,
  DeepLinkGeneratorUtil,
  demonstrateDeepLinkManager
};
