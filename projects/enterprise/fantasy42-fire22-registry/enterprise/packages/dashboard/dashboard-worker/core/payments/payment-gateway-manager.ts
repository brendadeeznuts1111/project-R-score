/**
 * Payment Gateway Manager
 * Unified payment processing system with multiple gateway support
 */

export interface PaymentGatewayConfig {
  stripe: {
    enabled: boolean;
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    supportedCurrencies: string[];
  };
  paypal: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'live';
    supportedCurrencies: string[];
  };
  square: {
    enabled: boolean;
    applicationId: string;
    accessToken: string;
    environment: 'sandbox' | 'production';
    locationId?: string;
  };
  braintree: {
    enabled: boolean;
    merchantId: string;
    publicKey: string;
    privateKey: string;
    environment: 'sandbox' | 'production';
  };
  adyen: {
    enabled: boolean;
    apiKey: string;
    merchantAccount: string;
    clientKey: string;
    environment: 'test' | 'live';
  };
  crypto: {
    enabled: boolean;
    supportedCurrencies: string[];
    exchangeRateApi: string;
    walletProviders: {
      coinbase: { enabled: boolean; apiKey: string; secretKey: string };
      binance: { enabled: boolean; apiKey: string; secretKey: string };
      kraken: { enabled: boolean; apiKey: string; secretKey: string };
    };
  };
  banking: {
    enabled: boolean;
    plaid: { enabled: boolean; clientId: string; secretKey: string };
    stripeTreasury: { enabled: boolean; apiKey: string };
    dwolla: { enabled: boolean; key: string; secret: string };
  };
}

export interface PaymentIntent {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gateway: 'stripe' | 'paypal' | 'square' | 'braintree' | 'adyen' | 'crypto' | 'banking';
  type: 'deposit' | 'withdrawal' | 'p2p' | 'subscription';
  status: 'created' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  gatewayIntentId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  failureReason?: string;
  riskScore: number;
  complianceFlags: string[];
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  type: 'card' | 'bank_account' | 'paypal' | 'crypto_wallet' | 'digital_wallet';
  gateway: string;
  gatewayMethodId: string;
  details: {
    last4?: string;
    brand?: string;
    bankName?: string;
    accountType?: string;
    cryptoAddress?: string;
    walletProvider?: string;
  };
  isDefault: boolean;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'expired' | 'failed';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface GatewayCapabilities {
  gateway: string;
  supportsDeposits: boolean;
  supportsWithdrawals: boolean;
  supportsRecurring: boolean;
  supportsRefunds: boolean;
  supportedCurrencies: string[];
  processingFees: {
    deposit: { fixed: number; percentage: number };
    withdrawal: { fixed: number; percentage: number };
    refund: { fixed: number; percentage: number };
  };
  settlementTime: string; // e.g., 'instant', '1-2 business days'
  riskLevel: 'low' | 'medium' | 'high';
  complianceRequirements: string[];
}

export class PaymentGatewayManager {
  private config: PaymentGatewayConfig;
  private activeGateways: Map<string, GatewayCapabilities> = new Map();
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private paymentMethods: Map<string, PaymentMethod[]> = new Map();

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
    this.initializeGateways();
  }

  /**
   * Initialize available payment gateways
   */
  private initializeGateways(): void {
    // Stripe
    if (this.config.stripe.enabled) {
      this.activeGateways.set('stripe', {
        gateway: 'stripe',
        supportsDeposits: true,
        supportsWithdrawals: true,
        supportsRecurring: true,
        supportsRefunds: true,
        supportedCurrencies: this.config.stripe.supportedCurrencies,
        processingFees: {
          deposit: { fixed: 0.3, percentage: 0.029 },
          withdrawal: { fixed: 0, percentage: 0 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: '2 business days',
        riskLevel: 'low',
        complianceRequirements: ['PCI DSS', 'SCA'],
      });
    }

    // PayPal
    if (this.config.paypal.enabled) {
      this.activeGateways.set('paypal', {
        gateway: 'paypal',
        supportsDeposits: true,
        supportsWithdrawals: true,
        supportsRecurring: true,
        supportsRefunds: true,
        supportedCurrencies: this.config.paypal.supportedCurrencies,
        processingFees: {
          deposit: { fixed: 0.49, percentage: 0.0349 },
          withdrawal: { fixed: 0, percentage: 0 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: 'instant',
        riskLevel: 'low',
        complianceRequirements: ['PCI DSS'],
      });
    }

    // Square
    if (this.config.square.enabled) {
      this.activeGateways.set('square', {
        gateway: 'square',
        supportsDeposits: true,
        supportsWithdrawals: false,
        supportsRecurring: false,
        supportsRefunds: true,
        supportedCurrencies: ['USD', 'CAD'],
        processingFees: {
          deposit: { fixed: 0, percentage: 0.026 },
          withdrawal: { fixed: 0, percentage: 0 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: '1 business day',
        riskLevel: 'medium',
        complianceRequirements: ['PCI DSS'],
      });
    }

    // Braintree
    if (this.config.braintree.enabled) {
      this.activeGateways.set('braintree', {
        gateway: 'braintree',
        supportsDeposits: true,
        supportsWithdrawals: true,
        supportsRecurring: true,
        supportsRefunds: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD'],
        processingFees: {
          deposit: { fixed: 0.3, percentage: 0.029 },
          withdrawal: { fixed: 0, percentage: 0 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: '2 business days',
        riskLevel: 'low',
        complianceRequirements: ['PCI DSS', 'SCA'],
      });
    }

    // Adyen
    if (this.config.adyen.enabled) {
      this.activeGateways.set('adyen', {
        gateway: 'adyen',
        supportsDeposits: true,
        supportsWithdrawals: true,
        supportsRecurring: true,
        supportsRefunds: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'],
        processingFees: {
          deposit: { fixed: 0.25, percentage: 0.029 },
          withdrawal: { fixed: 0, percentage: 0 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: '2 business days',
        riskLevel: 'low',
        complianceRequirements: ['PCI DSS', 'SCA'],
      });
    }

    // Crypto
    if (this.config.crypto.enabled) {
      this.activeGateways.set('crypto', {
        gateway: 'crypto',
        supportsDeposits: true,
        supportsWithdrawals: true,
        supportsRecurring: false,
        supportsRefunds: true,
        supportedCurrencies: this.config.crypto.supportedCurrencies,
        processingFees: {
          deposit: { fixed: 0, percentage: 0.01 },
          withdrawal: { fixed: 0, percentage: 0.01 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: 'instant',
        riskLevel: 'high',
        complianceRequirements: ['AML', 'KYC', 'Travel Rule'],
      });
    }

    // Banking
    if (this.config.banking.enabled) {
      this.activeGateways.set('banking', {
        gateway: 'banking',
        supportsDeposits: true,
        supportsWithdrawals: true,
        supportsRecurring: true,
        supportsRefunds: false,
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
        processingFees: {
          deposit: { fixed: 0, percentage: 0 },
          withdrawal: { fixed: 0, percentage: 0 },
          refund: { fixed: 0, percentage: 0 },
        },
        settlementTime: '1-3 business days',
        riskLevel: 'low',
        complianceRequirements: ['AML', 'KYC', 'OFAC'],
      });
    }
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(
    customerId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    type: PaymentIntent['type'],
    gateway?: string
  ): Promise<PaymentIntent> {
    // Select optimal gateway
    const selectedGateway = gateway || this.selectOptimalGateway(amount, currency, type);

    if (!selectedGateway) {
      throw new Error('No suitable payment gateway available');
    }

    const intentId = this.generateIntentId();
    const intent: PaymentIntent = {
      id: intentId,
      customerId,
      amount,
      currency,
      paymentMethod,
      gateway: selectedGateway as any,
      type,
      status: 'created',
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskScore: await this.calculateRiskScore(customerId, amount, type),
      complianceFlags: [],
    };

    // Create gateway-specific intent
    await this.createGatewayIntent(intent);

    this.paymentIntents.set(intentId, intent);
    return intent;
  }

  /**
   * Process payment
   */
  async processPayment(intentId: string): Promise<PaymentIntent> {
    const intent = this.paymentIntents.get(intentId);
    if (!intent) {
      throw new Error('Payment intent not found');
    }

    if (intent.status !== 'created') {
      throw new Error('Payment intent already processed');
    }

    intent.status = 'processing';
    intent.updatedAt = new Date().toISOString();

    try {
      // Process based on gateway
      const result = await this.processGatewayPayment(intent);

      if (result.success) {
        intent.status = 'succeeded';
        intent.gatewayIntentId = result.gatewayIntentId;
      } else {
        intent.status = 'failed';
        intent.failureReason = result.error;
      }
    } catch (error) {
      intent.status = 'failed';
      intent.failureReason = error instanceof Error ? error.message : 'Unknown error';
    }

    intent.updatedAt = new Date().toISOString();
    return intent;
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    customerId: string,
    type: PaymentMethod['type'],
    gateway: string,
    details: any
  ): Promise<PaymentMethod> {
    const methodId = this.generateMethodId();
    const method: PaymentMethod = {
      id: methodId,
      customerId,
      type,
      gateway,
      gatewayMethodId: '',
      details,
      isDefault: false,
      isVerified: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create gateway-specific payment method
    const gatewayMethodId = await this.createGatewayPaymentMethod(gateway, details);
    method.gatewayMethodId = gatewayMethodId;

    // Store payment method
    if (!this.paymentMethods.has(customerId)) {
      this.paymentMethods.set(customerId, []);
    }
    this.paymentMethods.get(customerId)!.push(method);

    return method;
  }

  /**
   * Get customer payment methods
   */
  getCustomerPaymentMethods(customerId: string): PaymentMethod[] {
    return this.paymentMethods.get(customerId) || [];
  }

  /**
   * Get available gateways for transaction
   */
  getAvailableGateways(
    amount: number,
    currency: string,
    type: PaymentIntent['type']
  ): GatewayCapabilities[] {
    return Array.from(this.activeGateways.values()).filter(gateway => {
      // Check currency support
      if (!gateway.supportedCurrencies.includes(currency)) {
        return false;
      }

      // Check transaction type support
      switch (type) {
        case 'deposit':
          return gateway.supportsDeposits;
        case 'withdrawal':
          return gateway.supportsWithdrawals;
        case 'p2p':
          return gateway.supportsDeposits && gateway.supportsWithdrawals;
        case 'subscription':
          return gateway.supportsRecurring;
        default:
          return false;
      }
    });
  }

  /**
   * Select optimal gateway
   */
  private selectOptimalGateway(
    amount: number,
    currency: string,
    type: PaymentIntent['type']
  ): string | null {
    const available = this.getAvailableGateways(amount, currency, type);

    if (available.length === 0) {
      return null;
    }

    // Prioritize by risk level, then fees, then settlement time
    return available.sort((a, b) => {
      // Risk level priority
      const riskOrder = { low: 0, medium: 1, high: 2 };
      const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (riskDiff !== 0) return riskDiff;

      // Fee comparison
      const feeA = a.processingFees.deposit.percentage * amount + a.processingFees.deposit.fixed;
      const feeB = b.processingFees.deposit.percentage * amount + b.processingFees.deposit.fixed;
      return feeA - feeB;
    })[0].gateway;
  }

  /**
   * Calculate risk score for transaction
   */
  private async calculateRiskScore(
    customerId: string,
    amount: number,
    type: PaymentIntent['type']
  ): Promise<number> {
    let score = 0;

    // Amount-based risk
    if (amount > 10000) score += 30;
    if (amount > 50000) score += 50;

    // Transaction type risk
    if (type === 'withdrawal') score += 10;

    // Customer history risk (simplified)
    // In real implementation, would check customer history

    return Math.min(score, 100);
  }

  /**
   * Create gateway-specific intent
   */
  private async createGatewayIntent(intent: PaymentIntent): Promise<void> {
    switch (intent.gateway) {
      case 'stripe':
        await this.createStripeIntent(intent);
        break;
      case 'paypal':
        await this.createPayPalIntent(intent);
        break;
      case 'crypto':
        await this.createCryptoIntent(intent);
        break;
      case 'banking':
        await this.createBankingIntent(intent);
        break;
      default:
        throw new Error(`Unsupported gateway: ${intent.gateway}`);
    }
  }

  /**
   * Process gateway-specific payment
   */
  private async processGatewayPayment(
    intent: PaymentIntent
  ): Promise<{ success: boolean; gatewayIntentId?: string; error?: string }> {
    switch (intent.gateway) {
      case 'stripe':
        return await this.processStripePayment(intent);
      case 'paypal':
        return await this.processPayPalPayment(intent);
      case 'crypto':
        return await this.processCryptoPayment(intent);
      case 'banking':
        return await this.processBankingPayment(intent);
      default:
        return { success: false, error: `Unsupported gateway: ${intent.gateway}` };
    }
  }

  /**
   * Create Stripe payment intent
   */
  private async createStripeIntent(intent: PaymentIntent): Promise<void> {
    if (!this.config.stripe.enabled) {
      throw new Error('Stripe not configured');
    }

    // In real implementation, would call Stripe API
    console.log(`Creating Stripe intent for ${intent.amount} ${intent.currency}`);
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    intent: PaymentIntent
  ): Promise<{ success: boolean; gatewayIntentId?: string; error?: string }> {
    // In real implementation, would confirm Stripe payment
    console.log(`Processing Stripe payment for intent ${intent.id}`);

    // Simulate processing
    return {
      success: Math.random() > 0.05, // 95% success rate
      gatewayIntentId: `pi_stripe_${intent.id}`,
      error: Math.random() > 0.05 ? undefined : 'Card declined',
    };
  }

  /**
   * Create PayPal intent
   */
  private async createPayPalIntent(intent: PaymentIntent): Promise<void> {
    if (!this.config.paypal.enabled) {
      throw new Error('PayPal not configured');
    }

    console.log(`Creating PayPal intent for ${intent.amount} ${intent.currency}`);
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(
    intent: PaymentIntent
  ): Promise<{ success: boolean; gatewayIntentId?: string; error?: string }> {
    console.log(`Processing PayPal payment for intent ${intent.id}`);

    return {
      success: Math.random() > 0.03, // 97% success rate
      gatewayIntentId: `paypal_${intent.id}`,
      error: Math.random() > 0.03 ? undefined : 'Payment failed',
    };
  }

  /**
   * Create crypto intent
   */
  private async createCryptoIntent(intent: PaymentIntent): Promise<void> {
    if (!this.config.crypto.enabled) {
      throw new Error('Crypto not configured');
    }

    console.log(`Creating crypto intent for ${intent.amount} ${intent.currency}`);
  }

  /**
   * Process crypto payment
   */
  private async processCryptoPayment(
    intent: PaymentIntent
  ): Promise<{ success: boolean; gatewayIntentId?: string; error?: string }> {
    console.log(`Processing crypto payment for intent ${intent.id}`);

    return {
      success: Math.random() > 0.1, // 90% success rate
      gatewayIntentId: `crypto_${intent.id}`,
      error: Math.random() > 0.1 ? undefined : 'Transaction failed',
    };
  }

  /**
   * Create banking intent
   */
  private async createBankingIntent(intent: PaymentIntent): Promise<void> {
    if (!this.config.banking.enabled) {
      throw new Error('Banking not configured');
    }

    console.log(`Creating banking intent for ${intent.amount} ${intent.currency}`);
  }

  /**
   * Process banking payment
   */
  private async processBankingPayment(
    intent: PaymentIntent
  ): Promise<{ success: boolean; gatewayIntentId?: string; error?: string }> {
    console.log(`Processing banking payment for intent ${intent.id}`);

    return {
      success: Math.random() > 0.02, // 98% success rate
      gatewayIntentId: `bank_${intent.id}`,
      error: Math.random() > 0.02 ? undefined : 'Bank transfer failed',
    };
  }

  /**
   * Create gateway payment method
   */
  private async createGatewayPaymentMethod(gateway: string, details: any): Promise<string> {
    // In real implementation, would create payment method with respective gateway
    return `${gateway}_pm_${Date.now()}`;
  }

  /**
   * Generate unique IDs
   */
  private generateIntentId(): string {
    return `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateMethodId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get gateway capabilities
   */
  getGatewayCapabilities(gateway: string): GatewayCapabilities | undefined {
    return this.activeGateways.get(gateway);
  }

  /**
   * Get all active gateways
   */
  getAllGateways(): GatewayCapabilities[] {
    return Array.from(this.activeGateways.values());
  }

  /**
   * Update gateway configuration
   */
  updateGatewayConfig(gateway: string, config: Partial<GatewayCapabilities>): void {
    const existing = this.activeGateways.get(gateway);
    if (existing) {
      Object.assign(existing, config);
    }
  }
}
