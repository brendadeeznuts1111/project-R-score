/**
 * 🏭 Payment Builder Factory - FactoryWager Payment Methods Matrix
 * Type-safe factory system for creating payment builders
 */

export type PaymentMethod = 
  | 'cashapp' | 'venmo' | 'paypal' | 'zelle'
  | 'btc' | 'eth' | 'usdc' | 'usdt'
  | 'applepay' | 'googlepay' | 'bank' | 'card';

export interface PaymentRequest {
  id: string;
  type: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  recipient: string;
  sender: string;
  note: string;
  participants: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PaymentMethodDetails {
  name: string;
  type: 'fiat' | 'crypto';
  protocol: string;
  fees: number | string;
  limits: { min: number; max: number };
  processingTime: string;
  requiresWebhook?: boolean;
  requiresOAuth?: boolean;
  confirmationsRequired?: number;
}

export interface PaymentResult {
  id: string;
  status: string;
  transactionId?: string;
  requiresManualConfirmation?: boolean;
  qrCode?: string;
  instructions?: string;
  error?: string;
}

/**
 * 🏗️ Base Payment Builder
 */
export abstract class BasePaymentBuilder {
  protected payment: Partial<PaymentRequest> = {};
  
  constructor() {
    this.payment = {
      currency: 'USD',
      participants: [],
      metadata: {},
      createdAt: new Date(),
      status: 'pending'
    };
  }
  
  abstract setRecipient(recipient: string): this;
  abstract setAmount(amount: number): this;
  abstract setNote(note: string): this;
  abstract setParticipants(participants: string[]): this;
  abstract build(): PaymentRequest;
  abstract validate(): boolean;
  
  setSender(sender: string): this {
    this.payment.sender = sender;
    return this;
  }
  
  setCurrency(currency: string): this {
    this.payment.currency = currency;
    return this;
  }
  
  addMetadata(key: string, value: any): this {
    this.payment.metadata![key] = value;
    return this;
  }
  
  protected generateId(): string {
    return `${this.payment.method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 💚 Cash App Builder
 */
export class CashAppBuilder extends BasePaymentBuilder {
  constructor() {
    super();
    this.payment.method = 'cashapp';
    this.payment.type = 'fiat';
  }
  
  setRecipient(cashtag: string): this {
    if (!cashtag.startsWith('$')) {
      cashtag = '$' + cashtag;
    }
    this.payment.recipient = cashtag;
    return this;
  }
  
  setAmount(amount: number): this {
    this.payment.amount = amount;
    this.payment.metadata!.cashappAmount = amount * 100; // Convert to cents
    return this;
  }
  
  setNote(note: string): this {
    this.payment.note = note;
    this.payment.metadata!.cashappNote = note;
    return this;
  }
  
  setParticipants(participants: string[]): this {
    this.payment.participants = participants;
    this.payment.metadata!.cashappParticipants = participants;
    return this;
  }
  
  generateQRCode(): string {
    const baseUrl = 'https://cash.app/';
    const params = new URLSearchParams({
      amount: this.payment.amount!.toString()
    });
    return `${baseUrl}${this.payment.recipient!.substring(1)}?${params.toString()}`;
  }
  
  build(): PaymentRequest {
    this.validate();
    this.payment.id = this.generateId();
    this.payment.metadata!.qrCode = this.generateQRCode();
    this.payment.metadata!.deepLink = `cashapp://pay/${this.payment.recipient!.substring(1)}?amount=${this.payment.amount}`;
    return this.payment as PaymentRequest;
  }
  
  validate(): boolean {
    if (!this.payment.recipient?.startsWith('$')) {
      throw new Error('Cash App recipient must start with $');
    }
    if (!this.payment.amount || this.payment.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }
}

/**
 * 💙 Venmo Builder
 */
export class VenmoBuilder extends BasePaymentBuilder {
  private oauthToken?: string;
  
  constructor() {
    super();
    this.payment.method = 'venmo';
    this.payment.type = 'fiat';
  }
  
  setRecipient(username: string): this {
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    this.payment.recipient = username;
    return this;
  }
  
  setAmount(amount: number): this {
    this.payment.amount = amount;
    this.payment.metadata!.venmoAmount = amount;
    return this;
  }
  
  setNote(note: string): this {
    this.payment.note = note;
    this.payment.metadata!.venmoNote = note;
    return this;
  }
  
  setParticipants(participants: string[]): this {
    this.payment.participants = participants;
    this.payment.metadata!.venmoParticipants = participants;
    return this;
  }
  
  setOAuthToken(token: string): this {
    this.oauthToken = token;
    this.payment.metadata!.venmoOAuth = true;
    return this;
  }
  
  generateQRCode(): string {
    return `venmo://pay?recipients=${this.payment.recipient!.substring(1)}&amount=${this.payment.amount}&note=${encodeURIComponent(this.payment.note || '')}`;
  }
  
  async executePayment(): Promise<PaymentResult> {
    if (this.oauthToken) {
      return await this.executeOAuthPayment();
    } else {
      return await this.createManualPayment();
    }
  }
  
  private async executeOAuthPayment(): Promise<PaymentResult> {
    const response = await fetch('https://api.venmo.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.oauthToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: this.payment.recipient!.substring(1),
        amount: this.payment.amount,
        note: this.payment.note,
        audience: 'private'
      })
    });
    
    const result = await response.json();
    return {
      id: result.data?.id || `venmo_${Date.now()}`,
      status: 'completed',
      transactionId: result.data?.id,
      ...result
    };
  }
  
  private async createManualPayment(): Promise<PaymentResult> {
    return {
      id: `venmo_manual_${Date.now()}`,
      status: 'pending_confirmation',
      requiresManualConfirmation: true,
      qrCode: this.generateQRCode(),
      instructions: 'Ask recipient to confirm payment in Venmo app'
    };
  }
  
  build(): PaymentRequest {
    this.validate();
    this.payment.id = this.generateId();
    this.payment.metadata!.qrCode = this.generateQRCode();
    this.payment.metadata!.deepLink = this.generateQRCode();
    return this.payment as PaymentRequest;
  }
  
  validate(): boolean {
    if (!this.payment.recipient?.startsWith('@')) {
      throw new Error('Venmo recipient must start with @');
    }
    if (!this.payment.amount || this.payment.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }
}

/**
 * ⛓️ Bitcoin Builder
 */
export class BitcoinBuilder extends BasePaymentBuilder {
  private network: 'mainnet' | 'testnet' = 'mainnet';
  private address: string = '';
  
  constructor() {
    super();
    this.payment.method = 'btc';
    this.payment.type = 'crypto';
  }
  
  setRecipient(address: string): this {
    this.address = address;
    this.payment.recipient = address;
    return this;
  }
  
  setAmount(amount: number): this {
    this.payment.amount = amount;
    this.payment.metadata!.btcAmount = this.usdToBtc(amount);
    return this;
  }
  
  setNetwork(network: 'mainnet' | 'testnet'): this {
    this.network = network;
    this.payment.metadata!.btcNetwork = network;
    return this;
  }
  
  setParticipants(participants: string[]): this {
    this.payment.participants = participants;
    return this;
  }
  
  generateQRCode(): string {
    const btcAddress = this.address;
    const btcAmount = this.payment.metadata!.btcAmount;
    return `bitcoin:${btcAddress}?amount=${btcAmount}&label=FactoryWagerPayment`;
  }
  
  private usdToBtc(usdAmount: number): number {
    // This would use real-time price API
    const btcPrice = 42000; // Example price
    return usdAmount / btcPrice;
  }
  
  async generateAddress(): Promise<string> {
    // Generate new Bitcoin address for payment
    const response = await fetch('/api/crypto/generate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: 'BTC', network: this.network })
    });
    
    const { address } = await response.json();
    this.address = address;
    this.payment.recipient = address;
    return address;
  }
  
  build(): PaymentRequest {
    this.validate();
    this.payment.id = this.generateId();
    this.payment.metadata!.qrCode = this.generateQRCode();
    this.payment.metadata!.blockchainExplorer = `https://blockstream.info/address/${this.address}`;
    this.payment.metadata!.confirmationsRequired = 1;
    return this.payment as PaymentRequest;
  }
  
  validate(): boolean {
    if (!this.address || !this.isValidBitcoinAddress(this.address)) {
      throw new Error('Invalid Bitcoin address');
    }
    if (!this.payment.amount || this.payment.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }
  
  private isValidBitcoinAddress(address: string): boolean {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
  }
}

/**
 * 🔷 Ethereum Builder
 */
export class EthereumBuilder extends BasePaymentBuilder {
  private tokenAddress?: string;
  private network: 'mainnet' | 'sepolia' = 'mainnet';
  
  constructor() {
    super();
    this.payment.method = 'eth';
    this.payment.type = 'crypto';
  }
  
  setRecipient(address: string): this {
    this.payment.recipient = address;
    return this;
  }
  
  setAmount(amount: number): this {
    this.payment.amount = amount;
    this.payment.metadata!.ethAmount = this.usdToEth(amount);
    this.payment.metadata!.weiAmount = this.usdToWei(amount);
    return this;
  }
  
  setToken(tokenAddress: string, symbol: string): this {
    this.tokenAddress = tokenAddress;
    this.payment.method = symbol.toLowerCase() as PaymentMethod;
    this.payment.metadata!.tokenAddress = tokenAddress;
    this.payment.metadata!.tokenSymbol = symbol;
    return this;
  }
  
  setNetwork(network: 'mainnet' | 'sepolia'): this {
    this.network = network;
    this.payment.metadata!.ethNetwork = network;
    return this;
  }
  
  setParticipants(participants: string[]): this {
    this.payment.participants = participants;
    return this;
  }
  
  generateQRCode(): string {
    const address = this.payment.recipient!;
    const value = this.payment.metadata!.weiAmount;
    const baseUrl = `ethereum:${address}`;
    
    if (this.tokenAddress) {
      // ERC-20 token
      return `${baseUrl}?value=0&data=${this.encodeTokenTransfer()}`;
    } else {
      // Native ETH
      return `${baseUrl}?value=${value}`;
    }
  }
  
  private usdToEth(usdAmount: number): number {
    const ethPrice = 2500; // Example price
    return usdAmount / ethPrice;
  }
  
  private usdToWei(usdAmount: number): string {
    const ethAmount = this.usdToEth(usdAmount);
    return (ethAmount * 1e18).toString();
  }
  
  private encodeTokenTransfer(): string {
    // ERC-20 transfer function signature: 0xa9059cbb
    const transferSignature = '0xa9059cbb';
    const amount = this.payment.metadata!.weiAmount;
    return transferSignature + this.payment.recipient!.substring(2).padStart(64, '0') + amount.padStart(64, '0');
  }
  
  build(): PaymentRequest {
    this.validate();
    this.payment.id = this.generateId();
    this.payment.metadata!.qrCode = this.generateQRCode();
    this.payment.metadata!.blockchainExplorer = `https://etherscan.io/address/${this.payment.recipient}`;
    this.payment.metadata!.confirmationsRequired = 12;
    return this.payment as PaymentRequest;
  }
  
  validate(): boolean {
    if (!this.payment.recipient || !this.isValidEthereumAddress(this.payment.recipient)) {
      throw new Error('Invalid Ethereum address');
    }
    if (!this.payment.amount || this.payment.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    return true;
  }
  
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

/**
 * 🏭 Payment Builder Factory
 */
export class PaymentBuilderFactory {
  private static methodDetails: Record<PaymentMethod, PaymentMethodDetails> = {
    cashapp: {
      name: 'Cash App',
      type: 'fiat',
      protocol: 'Square API',
      fees: 0,
      limits: { min: 1, max: 7000 },
      processingTime: 'instant',
      requiresWebhook: true
    },
    venmo: {
      name: 'Venmo',
      type: 'fiat',
      protocol: 'Venmo API',
      fees: 0,
      limits: { min: 1, max: 4000 },
      processingTime: 'instant',
      requiresOAuth: true
    },
    paypal: {
      name: 'PayPal',
      type: 'fiat',
      protocol: 'PayPal API',
      fees: 2.9,
      limits: { min: 0.01, max: 10000 },
      processingTime: 'instant',
      requiresWebhook: true,
      requiresOAuth: true
    },
    zelle: {
      name: 'Zelle',
      type: 'fiat',
      protocol: 'Zelle Network',
      fees: 0,
      limits: { min: 1, max: 1000 },
      processingTime: 'minutes'
    },
    btc: {
      name: 'Bitcoin',
      type: 'crypto',
      protocol: 'Bitcoin Network',
      fees: 'variable',
      limits: { min: 0.00001, max: Infinity },
      processingTime: '10-60 minutes',
      confirmationsRequired: 1
    },
    eth: {
      name: 'Ethereum',
      type: 'crypto',
      protocol: 'Ethereum Network',
      fees: 'variable',
      limits: { min: 0.001, max: Infinity },
      processingTime: '15 seconds - 5 minutes',
      confirmationsRequired: 12
    },
    usdc: {
      name: 'USDC',
      type: 'crypto',
      protocol: 'Ethereum (ERC-20)',
      fees: 'variable',
      limits: { min: 0.01, max: Infinity },
      processingTime: '15 seconds - 5 minutes',
      confirmationsRequired: 12
    },
    usdt: {
      name: 'USDT',
      type: 'crypto',
      protocol: 'Ethereum (ERC-20)',
      fees: 'variable',
      limits: { min: 0.01, max: Infinity },
      processingTime: '15 seconds - 5 minutes',
      confirmationsRequired: 12
    },
    applepay: {
      name: 'Apple Pay',
      type: 'fiat',
      protocol: 'Apple Pay API',
      fees: 2.9,
      limits: { min: 0.01, max: 10000 },
      processingTime: 'instant'
    },
    googlepay: {
      name: 'Google Pay',
      type: 'fiat',
      protocol: 'Google Pay API',
      fees: 2.9,
      limits: { min: 0.01, max: 10000 },
      processingTime: 'instant'
    },
    bank: {
      name: 'Bank Transfer',
      type: 'fiat',
      protocol: 'ACH/Wire',
      fees: 'variable',
      limits: { min: 1, max: 25000 },
      processingTime: '1-3 business days'
    },
    card: {
      name: 'Credit Card',
      type: 'fiat',
      protocol: 'Stripe API',
      fees: 2.9,
      limits: { min: 0.01, max: 10000 },
      processingTime: 'instant',
      requiresWebhook: true
    }
  };
  
  static createBuilder(method: PaymentMethod): BasePaymentBuilder {
    switch (method) {
      case 'cashapp':
        return new CashAppBuilder();
      case 'venmo':
        return new VenmoBuilder();
      case 'paypal':
        return new PayPalBuilder();
      case 'zelle':
        return new ZelleBuilder();
      case 'btc':
        return new BitcoinBuilder();
      case 'eth':
        return new EthereumBuilder();
      case 'usdc':
        return new USDCBuilder();
      case 'usdt':
        return new USDTBuilder();
      case 'applepay':
        return new ApplePayBuilder();
      case 'googlepay':
        return new GooglePayBuilder();
      case 'bank':
        return new BankBuilder();
      case 'card':
        return new CardBuilder();
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }
  
  static getAvailableMethods(): PaymentMethod[] {
    return Object.keys(this.methodDetails) as PaymentMethod[];
  }
  
  static getMethodDetails(method: PaymentMethod): PaymentMethodDetails | null {
    return this.methodDetails[method] || null;
  }
  
  static getMethodsByType(type: 'fiat' | 'crypto'): PaymentMethod[] {
    return Object.entries(this.methodDetails)
      .filter(([_, details]) => details.type === type)
      .map(([method]) => method as PaymentMethod);
  }
  
  static getMethodsByAvailability(availability: 'instant' | 'fast' | 'slow'): PaymentMethod[] {
    return Object.entries(this.methodDetails)
      .filter(([_, details]) => {
        if (availability === 'instant') return details.processingTime === 'instant';
        if (availability === 'fast') return details.processingTime.includes('minutes') || details.processingTime.includes('seconds');
        if (availability === 'slow') return details.processingTime.includes('hour') || details.processingTime.includes('day');
        return false;
      })
      .map(([method]) => method as PaymentMethod);
  }
}

// Placeholder builders for other payment methods
class PayPalBuilder extends BasePaymentBuilder {
  setRecipient(recipient: string): this { return this; }
  setAmount(amount: number): this { return this; }
  setNote(note: string): this { return this; }
  setParticipants(participants: string[]): this { return this; }
  build(): PaymentRequest { return {} as PaymentRequest; }
  validate(): boolean { return true; }
}

class ZelleBuilder extends BasePaymentBuilder {
  setRecipient(recipient: string): this { return this; }
  setAmount(amount: number): this { return this; }
  setNote(note: string): this { return this; }
  setParticipants(participants: string[]): this { return this; }
  build(): PaymentRequest { return {} as PaymentRequest; }
  validate(): boolean { return true; }
}

class USDCBuilder extends EthereumBuilder {
  constructor() {
    super();
    this.setToken('0xA0b86a33E6441b8e8C7C7b0b8e8e8e8e8e8e8e8e', 'USDC');
  }
}

class USDTBuilder extends EthereumBuilder {
  constructor() {
    super();
    this.setToken('0xdAC17F958D2ee523a2206206994597C13D831ec7', 'USDT');
  }
}

class ApplePayBuilder extends BasePaymentBuilder {
  setRecipient(recipient: string): this { return this; }
  setAmount(amount: number): this { return this; }
  setNote(note: string): this { return this; }
  setParticipants(participants: string[]): this { return this; }
  build(): PaymentRequest { return {} as PaymentRequest; }
  validate(): boolean { return true; }
}

class GooglePayBuilder extends BasePaymentBuilder {
  setRecipient(recipient: string): this { return this; }
  setAmount(amount: number): this { return this; }
  setNote(note: string): this { return this; }
  setParticipants(participants: string[]): this { return this; }
  build(): PaymentRequest { return {} as PaymentRequest; }
  validate(): boolean { return true; }
}

class BankBuilder extends BasePaymentBuilder {
  setRecipient(recipient: string): this { return this; }
  setAmount(amount: number): this { return this; }
  setNote(note: string): this { return this; }
  setParticipants(participants: string[]): this { return this; }
  build(): PaymentRequest { return {} as PaymentRequest; }
  validate(): boolean { return true; }
}

class CardBuilder extends BasePaymentBuilder {
  setRecipient(recipient: string): this { return this; }
  setAmount(amount: number): this { return this; }
  setNote(note: string): this { return this; }
  setParticipants(participants: string[]): this { return this; }
  build(): PaymentRequest { return {} as PaymentRequest; }
  validate(): boolean { return true; }
}
