/**
 * 🔥 Fire22 OTC Order Matching Engine
 * Real-time order matching with P2P queue integration and Telegram coordination
 */

import { ServiceTierManager } from './service-tier-manager';
import { DynamicConfigManager } from '../config/dynamic-config';
import {
  PartyType,
  CustomerType,
  TransactionType,
  PaymentMethod,
  L_KEY_MAPPING,
  calculateTotalFee,
  getLKeyForValue,
  getValueForLKey,
} from '../types/fire22-otc-constants';
import {
  lKeyMapper,
  entityMapper,
  transactionFlowMapper,
  auditTrailMapper,
  MappedEntity,
} from '../utils/l-key-mapper';
import { getGlobalLogger } from '../utils/logger';
import type { MonitoringConfig } from '../types/enhanced-types';

// Order Types and Enums
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LOSS = 'stop_loss',
  OTC_BLOCK = 'otc_block',
  ICEBERG = 'iceberg',
  TWAP = 'twap',
  AON = 'all_or_nothing',
}

export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partial',
  MATCHING = 'matching',
  NEGOTIATING = 'negotiating',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum TradingAsset {
  BTC = 'BTC',
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
  EUR = 'EUR',
  GBP = 'GBP',
}

// Order Interfaces
export interface OTCOrder {
  id: string;
  customerId: string;
  telegramId: string;
  telegramUsername: string;

  // L-Key Integration
  orderLKey: string; // L-Key for order type
  customerLKey: string; // L-Key for customer type
  statusLKey: string; // L-Key for status
  mappedEntity?: MappedEntity; // Full entity mapping

  // Order Details
  type: OrderType;
  side: OrderSide;
  asset: TradingAsset;
  amount: number;
  price?: number; // For limit orders
  targetPrice?: number; // For OTC blocks

  // Order Configuration
  allowPartialFill: boolean;
  minFillSize?: number;
  maxSlippage?: number;
  timeInForce: 'IOC' | 'FOK' | 'GTC' | 'GTD'; // Immediate or Cancel, Fill or Kill, Good Till Cancel, Good Till Date
  expiresAt?: Date;

  // Hidden/Iceberg Orders
  isIceberg: boolean;
  visibleSize?: number;
  totalSize?: number;

  // Status & Tracking
  status: OrderStatus;
  filledAmount: number;
  remainingAmount: number;
  averagePrice: number;

  // Priority & Fees
  priority: number;
  serviceTier: number;
  commissionRate: number;

  // Telegram Integration
  dealRoomId?: string;
  negotiationHistory: NegotiationEntry[];

  // Audit Trail
  auditTrail: string[]; // Array of L-Keys for audit tracking

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastMatchAttempt?: Date;
}

export interface NegotiationEntry {
  timestamp: Date;
  party: string;
  message: string;
  priceOffered?: number;
  accepted: boolean;
}

export interface OrderMatch {
  id: string;
  buyOrder: OTCOrder;
  sellOrder: OTCOrder;

  // Match Details
  matchedAmount: number;
  matchedPrice: number;
  priceImprovement: number;

  // Execution Details
  executionTime: Date;
  settlementTime?: Date;
  transactionHash?: string;

  // Telegram Coordination
  dealRoomId: string;
  moderatorId: string;
  negotiationComplete: boolean;

  // Status
  status: 'proposed' | 'negotiating' | 'agreed' | 'executed' | 'settled' | 'disputed';

  // Fees
  buyerFee: number;
  sellerFee: number;
  platformRevenue: number;
}

export interface OrderBook {
  asset: TradingAsset;
  buyOrders: OTCOrder[];
  sellOrders: OTCOrder[];
  lastUpdate: Date;

  // Market Data
  bestBid: number;
  bestAsk: number;
  spread: number;
  depth: number;

  // Statistics
  dailyVolume: number;
  dailyTrades: number;
  averageTradeSize: number;
}

// Main OTC Matching Engine
export class OTCMatchingEngine {
  private orderBooks: Map<TradingAsset, OrderBook> = new Map();
  private activeOrders: Map<string, OTCOrder> = new Map();
  private pendingMatches: Map<string, OrderMatch> = new Map();
  private configManager = DynamicConfigManager.getInstance();
  private tierManager = ServiceTierManager.getInstance();
  private logger = getGlobalLogger({ logLevel: 'info' } as MonitoringConfig); // Initialize with a basic config

  constructor() {
    this.initializeOrderBooks();
    this.startMatchingLoop();
  }

  /**
   * Initialize order books for all trading assets
   */
  private initializeOrderBooks(): void {
    Object.values(TradingAsset).forEach(asset => {
      this.orderBooks.set(asset as TradingAsset, {
        asset: asset as TradingAsset,
        buyOrders: [],
        sellOrders: [],
        lastUpdate: new Date(),
        bestBid: 0,
        bestAsk: 0,
        spread: 0,
        depth: 0,
        dailyVolume: 0,
        dailyTrades: 0,
        averageTradeSize: 0,
      });
    });
  }

  /**
   * Place a new OTC order with L-Key mapping
   */
  public async placeOrder(
    orderRequest: Partial<OTCOrder> & {
      customerType: CustomerType;
      paymentMethod?: PaymentMethod;
      monthlyVolume?: number;
    }
  ): Promise<OTCOrder> {
    // Generate order ID
    const orderId = this.generateOrderId();

    // Generate L-Keys for order components
    const orderLKey =
      getLKeyForValue(orderRequest.type as string) || lKeyMapper.generateNextLKey('ORDERS');
    const customerLKey =
      getLKeyForValue(orderRequest.customerType) || lKeyMapper.generateNextLKey('CUSTOMERS');
    const statusLKey = getLKeyForValue(OrderStatus.PENDING) || 'L6001';

    // Create customer entity mapping
    const customerEntity = entityMapper.mapCustomer({
      id: orderRequest.customerId!,
      type: orderRequest.customerType,
      username: orderRequest.telegramUsername!,
      telegramId: orderRequest.telegramId!,
      serviceTier: orderRequest.serviceTier || 1,
      metadata: {
        orderCount: 1,
        totalVolume: orderRequest.amount!,
      },
    });

    // Calculate priority based on service tier
    const priority = await this.calculateOrderPriority(
      orderRequest.customerId!,
      orderRequest.serviceTier!,
      orderRequest.amount!
    );

    // Calculate enhanced fees using L-Key system
    const feeCalculation = calculateTotalFee({
      amount: orderRequest.amount!,
      customerType: orderRequest.customerType,
      paymentMethod: orderRequest.paymentMethod || PaymentMethod.BANK_WIRE,
      serviceTier: orderRequest.serviceTier || 1,
      monthlyVolume: orderRequest.monthlyVolume || 0,
    });

    // Create order object with L-Key integration
    const order: OTCOrder = {
      id: orderId,
      ...orderRequest,
      // L-Key Integration
      orderLKey,
      customerLKey,
      statusLKey,
      mappedEntity: customerEntity,
      // Status & Tracking
      status: OrderStatus.PENDING,
      filledAmount: 0,
      remainingAmount: orderRequest.amount!,
      averagePrice: 0,
      priority,
      commissionRate: feeCalculation.effectiveRate,
      // Audit Trail
      auditTrail: [orderLKey, customerLKey, statusLKey],
      negotiationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as OTCOrder;

    // Validate order
    const validation = await this.validateOrder(order);
    if (!validation.isValid) {
      order.status = OrderStatus.REJECTED;
      throw new Error(`Order rejected: ${validation.reasons.join(', ')}`);
    }

    // Add to order book with L-Key tracking
    order.status = OrderStatus.OPEN;
    order.statusLKey = getLKeyForValue(OrderStatus.OPEN) || 'L6002';
    order.auditTrail.push(order.statusLKey);

    // Log audit entry
    auditTrailMapper.logEntry({
      action: 'ORDER_PLACED',
      entityId: orderId,
      entityType: orderRequest.type as string,
      userId: orderRequest.customerId!,
      metadata: {
        amount: orderRequest.amount!,
        asset: orderRequest.asset,
        lKeys: order.auditTrail,
        feeCalculation,
      },
    });

    this.addToOrderBook(order);
    this.activeOrders.set(orderId, order);

    // Trigger immediate matching attempt
    await this.attemptMatch(order);

    // Send Telegram notification with L-Key context
    await this.sendOrderNotification(order);

    this.logger.info(`Order placed successfully: ${order.id}`, {
      orderId: order.id,
      customerId: order.customerId,
      amount: order.amount,
      asset: order.asset,
    });

    return order;
  }

  /**
   * Validate order before placement
   */
  private async validateOrder(order: OTCOrder): Promise<{ isValid: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Check minimum order size
    const minSize = this.getMinimumOrderSize(order.asset, order.type);
    if (order.amount < minSize) {
      reasons.push(`Order size below minimum: $${minSize}`);
    }

    // Check customer limits
    const customerLimits = await this.getCustomerTradingLimits(order.customerId);
    if (order.amount > customerLimits.maxOrderSize) {
      reasons.push(`Order exceeds maximum size: $${customerLimits.maxOrderSize}`);
    }

    // Check available balance
    const requiredBalance =
      order.side === OrderSide.BUY ? order.amount * (1 + order.commissionRate) : 0; // For sells, check asset balance separately

    // Add more validation rules as needed

    return {
      isValid: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Attempt to match an order
   */
  private async attemptMatch(order: OTCOrder): Promise<OrderMatch[]> {
    const matches: OrderMatch[] = [];
    const orderBook = this.orderBooks.get(order.asset);

    if (!orderBook) return matches;

    // Get counter orders (opposite side)
    const counterOrders = order.side === OrderSide.BUY ? orderBook.sellOrders : orderBook.buyOrders;

    // Sort counter orders by priority and price
    const sortedCounterOrders = this.sortCounterOrders(counterOrders, order);

    for (const counterOrder of sortedCounterOrders) {
      // Check if orders can match
      const canMatch = await this.canMatch(order, counterOrder);

      if (canMatch) {
        // Calculate match details
        const matchDetails = this.calculateMatchDetails(order, counterOrder);

        // Create match object
        const match: OrderMatch = {
          id: this.generateMatchId(),
          buyOrder: order.side === OrderSide.BUY ? order : counterOrder,
          sellOrder: order.side === OrderSide.SELL ? order : counterOrder,
          matchedAmount: matchDetails.amount,
          matchedPrice: matchDetails.price,
          priceImprovement: matchDetails.priceImprovement,
          executionTime: new Date(),
          dealRoomId: '',
          moderatorId: '',
          negotiationComplete: false,
          status: 'proposed',
          buyerFee: matchDetails.buyerFee,
          sellerFee: matchDetails.sellerFee,
          platformRevenue: matchDetails.buyerFee + matchDetails.sellerFee,
        };

        // For OTC blocks, initiate negotiation
        if (order.type === OrderType.OTC_BLOCK || counterOrder.type === OrderType.OTC_BLOCK) {
          match.status = 'negotiating';
          await this.initiateNegotiation(match);
        } else {
          // Direct execution for non-OTC orders
          await this.executeMatch(match);
        }

        matches.push(match);
        this.pendingMatches.set(match.id, match);

        // Update order fill status
        order.filledAmount += matchDetails.amount;
        order.remainingAmount -= matchDetails.amount;

        if (order.remainingAmount === 0) {
          order.status = OrderStatus.FILLED;
          break;
        } else {
          order.status = OrderStatus.PARTIALLY_FILLED;
        }
      }
    }

    return matches;
  }

  /**
   * Check if two orders can match
   */
  private async canMatch(order1: OTCOrder, order2: OTCOrder): Promise<boolean> {
    // Check basic compatibility
    if (order1.asset !== order2.asset) return false;
    if (order1.side === order2.side) return false;
    if (order1.status !== OrderStatus.OPEN && order1.status !== OrderStatus.PARTIALLY_FILLED)
      return false;
    if (order2.status !== OrderStatus.OPEN && order2.status !== OrderStatus.PARTIALLY_FILLED)
      return false;

    // Check price compatibility
    if (order1.type === OrderType.LIMIT && order2.type === OrderType.LIMIT) {
      const buyPrice = order1.side === OrderSide.BUY ? order1.price! : order2.price!;
      const sellPrice = order1.side === OrderSide.SELL ? order1.price! : order2.price!;

      if (buyPrice < sellPrice) return false;
    }

    // Check size compatibility
    const matchableSize = Math.min(order1.remainingAmount, order2.remainingAmount);

    if (!order1.allowPartialFill && matchableSize < order1.remainingAmount) return false;
    if (!order2.allowPartialFill && matchableSize < order2.remainingAmount) return false;

    if (order1.minFillSize && matchableSize < order1.minFillSize) return false;
    if (order2.minFillSize && matchableSize < order2.minFillSize) return false;

    // Check compliance
    const complianceCheck = await this.checkComplianceRules(order1, order2);
    if (!complianceCheck) return false;

    return true;
  }

  /**
   * Calculate match details including price and fees
   */
  private calculateMatchDetails(
    order1: OTCOrder,
    order2: OTCOrder
  ): {
    amount: number;
    price: number;
    priceImprovement: number;
    buyerFee: number;
    sellerFee: number;
  } {
    // Determine match amount
    const amount = Math.min(order1.remainingAmount, order2.remainingAmount);

    // Determine match price
    let price = 0;
    if (order1.type === OrderType.MARKET) {
      price = order2.price || this.getMarketPrice(order1.asset);
    } else if (order2.type === OrderType.MARKET) {
      price = order1.price || this.getMarketPrice(order1.asset);
    } else {
      // For limit orders, use mid-price or better price for taker
      const buyPrice = order1.side === OrderSide.BUY ? order1.price! : order2.price!;
      const sellPrice = order1.side === OrderSide.SELL ? order1.price! : order2.price!;
      price = (buyPrice + sellPrice) / 2;
    }

    // Calculate price improvement
    const marketPrice = this.getMarketPrice(order1.asset);
    const priceImprovement =
      order1.side === OrderSide.BUY
        ? Math.max(0, marketPrice - price)
        : Math.max(0, price - marketPrice);

    // Calculate fees based on service tier and order size
    const buyOrder = order1.side === OrderSide.BUY ? order1 : order2;
    const sellOrder = order1.side === OrderSide.SELL ? order1 : order2;

    const buyerFee = this.calculateOrderFee(buyOrder, amount);
    const sellerFee = this.calculateOrderFee(sellOrder, amount);

    return {
      amount,
      price,
      priceImprovement,
      buyerFee,
      sellerFee,
    };
  }

  /**
   * Calculate order fee based on tier and configuration
   */
  private calculateOrderFee(order: OTCOrder, amount: number): number {
    // Base fee calculation
    let baseFeeRate = 0.003; // 0.3% base

    // Adjust for order size (OTC discounts)
    if (amount >= 250000) {
      baseFeeRate = 0.0015; // 0.15% for institutional
    } else if (amount >= 25000) {
      baseFeeRate = 0.003; // 0.3% for professional
    } else {
      baseFeeRate = 0.005; // 0.5% for retail
    }

    // Apply service tier discount
    const tierDiscount = this.getTierDiscount(order.serviceTier);
    const effectiveRate = baseFeeRate * (1 - tierDiscount);

    // Calculate final fee
    const fee = amount * effectiveRate;

    // Apply minimum fee
    const minimumFee = 1; // $1 minimum

    return Math.max(fee, minimumFee);
  }

  /**
   * Get tier-based discount
   */
  private getTierDiscount(serviceTier: number): number {
    switch (serviceTier) {
      case 3:
        return 0.3; // 30% discount for VIP
      case 2:
        return 0.15; // 15% discount for Premium
      default:
        return 0; // No discount for Essential
    }
  }

  /**
   * Execute a matched trade
   */
  private async executeMatch(match: OrderMatch): Promise<void> {
    try {
      // Update order statuses
      match.buyOrder.status = OrderStatus.MATCHING;
      match.sellOrder.status = OrderStatus.MATCHING;

      // Process settlement
      const settlement = await this.processSettlement(match);

      if (settlement.success) {
        // Update match status
        match.status = 'executed';
        match.settlementTime = new Date();
        match.transactionHash = settlement.transactionHash;

        // Update order fills
        this.updateOrderFills(match);

        // Send confirmations via Telegram
        await this.sendExecutionNotifications(match);

        // Update order book
        this.updateOrderBook(match.buyOrder.asset);

        // Log trade for analytics
        await this.logTrade(match);
        this.logger.info(`Match executed successfully: ${match.id}`, {
          matchId: match.id,
          buyOrderId: match.buyOrder.id,
          sellOrderId: match.sellOrder.id,
          matchedAmount: match.matchedAmount,
        });
      } else {
        // Handle settlement failure
        match.status = 'disputed';
        await this.handleSettlementFailure(match, settlement.error);
        this.logger.error(`Settlement failed for match ${match.id}: ${settlement.error}`, {
          matchId: match.id,
          error: settlement.error,
        });
      }
    } catch (error) {
      this.logger.error('Match execution failed:', error);
      match.status = 'disputed';
      throw error;
    }
  }

  /**
   * Initiate negotiation for OTC block trades
   */
  private async initiateNegotiation(match: OrderMatch): Promise<void> {
    // Create private Telegram deal room
    const dealRoomId = await this.createTelegramDealRoom(match);
    match.dealRoomId = dealRoomId;

    // Assign moderator
    match.moderatorId = await this.assignModerator(match);

    // Send invitations to both parties
    await this.sendNegotiationInvitations(match);

    // Set negotiation timeout
    setTimeout(
      async () => {
        if (match.status === 'negotiating') {
          match.status = 'disputed';
          await this.closeNegotiation(match, 'Negotiation timeout');
        }
      },
      30 * 60 * 1000
    ); // 30 minutes timeout
  }

  /**
   * Process trade settlement
   */
  private async processSettlement(
    match: OrderMatch
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Deduct from buyer
      const buyerDebit = match.matchedAmount + match.buyerFee;

      // Credit to seller (minus fee)
      const sellerCredit = match.matchedAmount - match.sellerFee;

      // Process blockchain transaction if crypto
      if (['BTC', 'ETH', 'USDC', 'USDT'].includes(match.buyOrder.asset)) {
        // Blockchain settlement logic
        const txHash = await this.processBlockchainSettlement(
          match.buyOrder,
          match.sellOrder,
          match.matchedAmount
        );

        return { success: true, transactionHash: txHash };
      } else {
        // Fiat settlement logic
        const settlementId = await this.processFiatSettlement(
          match.buyOrder,
          match.sellOrder,
          buyerDebit,
          sellerCredit
        );

        return { success: true, transactionHash: settlementId };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current market price for asset
   */
  private getMarketPrice(asset: TradingAsset): number {
    // In production, fetch from price feed
    const marketPrices = {
      BTC: 65000,
      ETH: 2500,
      USDC: 1,
      USDT: 1,
      EUR: 1.08,
      GBP: 1.26,
    };

    return marketPrices[asset] || 0;
  }

  /**
   * Get minimum order size for asset and type
   */
  private getMinimumOrderSize(asset: TradingAsset, type: OrderType): number {
    if (type === OrderType.OTC_BLOCK) {
      return 25000; // $25K minimum for OTC blocks
    }

    // Standard minimums by asset
    const minimums = {
      BTC: 100,
      ETH: 100,
      USDC: 10,
      USDT: 10,
      EUR: 100,
      GBP: 100,
    };

    return minimums[asset] || 100;
  }

  /**
   * Get customer trading limits
   */
  private async getCustomerTradingLimits(
    customerId: string
  ): Promise<{ maxOrderSize: number; dailyLimit: number }> {
    // Fetch from database based on customer tier
    // This is placeholder logic
    return {
      maxOrderSize: 1000000,
      dailyLimit: 5000000,
    };
  }

  /**
   * Calculate order priority
   */
  private async calculateOrderPriority(
    customerId: string,
    serviceTier: number,
    orderSize: number
  ): Promise<number> {
    // Higher priority for VIP customers
    const tierPriority = serviceTier * 100;

    // Size-based priority
    const sizePriority = Math.min(100, Math.floor(orderSize / 10000));

    // Time priority (newer orders get slight advantage to prevent starvation)
    const timePriority = 10;

    return tierPriority + sizePriority + timePriority;
  }

  /**
   * Helper methods
   */
  private generateOrderId(): string {
    return `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMatchId(): string {
    return `MATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToOrderBook(order: OTCOrder): void {
    const orderBook = this.orderBooks.get(order.asset);
    if (!orderBook) return;

    if (order.side === OrderSide.BUY) {
      orderBook.buyOrders.push(order);
      orderBook.buyOrders.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      orderBook.sellOrders.push(order);
      orderBook.sellOrders.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    this.updateOrderBookStats(orderBook);
  }

  private updateOrderBookStats(orderBook: OrderBook): void {
    orderBook.bestBid = orderBook.buyOrders[0]?.price || 0;
    orderBook.bestAsk = orderBook.sellOrders[0]?.price || 0;
    orderBook.spread = orderBook.bestAsk - orderBook.bestBid;
    orderBook.depth = orderBook.buyOrders.length + orderBook.sellOrders.length;
    orderBook.lastUpdate = new Date();
  }

  private sortCounterOrders(orders: OTCOrder[], referenceOrder: OTCOrder): OTCOrder[] {
    return orders.sort((a, b) => {
      // Priority first
      if (b.priority !== a.priority) return b.priority - a.priority;

      // Then price
      if (referenceOrder.side === OrderSide.BUY) {
        return (a.price || 0) - (b.price || 0); // Lowest sell price first
      } else {
        return (b.price || 0) - (a.price || 0); // Highest buy price first
      }
    });
  }

  private async checkComplianceRules(order1: OTCOrder, order2: OTCOrder): Promise<boolean> {
    // Check for wash trading (same customer)
    if (order1.customerId === order2.customerId) return false;

    // Add more compliance checks as needed

    return true;
  }

  private updateOrderFills(match: OrderMatch): void {
    match.buyOrder.filledAmount += match.matchedAmount;
    match.buyOrder.remainingAmount -= match.matchedAmount;

    match.sellOrder.filledAmount += match.matchedAmount;
    match.sellOrder.remainingAmount -= match.matchedAmount;

    // Update average prices
    const buyTotalValue =
      match.buyOrder.averagePrice * (match.buyOrder.filledAmount - match.matchedAmount) +
      match.matchedPrice * match.matchedAmount;
    match.buyOrder.averagePrice = buyTotalValue / match.buyOrder.filledAmount;

    const sellTotalValue =
      match.sellOrder.averagePrice * (match.sellOrder.filledAmount - match.matchedAmount) +
      match.matchedPrice * match.matchedAmount;
    match.sellOrder.averagePrice = sellTotalValue / match.sellOrder.filledAmount;

    // Update statuses
    if (match.buyOrder.remainingAmount === 0) {
      match.buyOrder.status = OrderStatus.FILLED;
    } else {
      match.buyOrder.status = OrderStatus.PARTIALLY_FILLED;
    }

    if (match.sellOrder.remainingAmount === 0) {
      match.sellOrder.status = OrderStatus.FILLED;
    } else {
      match.sellOrder.status = OrderStatus.PARTIALLY_FILLED;
    }
  }

  private updateOrderBook(asset: TradingAsset): void {
    const orderBook = this.orderBooks.get(asset);
    if (!orderBook) return;

    // Remove filled orders
    orderBook.buyOrders = orderBook.buyOrders.filter(o => o.status !== OrderStatus.FILLED);
    orderBook.sellOrders = orderBook.sellOrders.filter(o => o.status !== OrderStatus.FILLED);

    this.updateOrderBookStats(orderBook);
  }

  // Telegram integration methods (placeholders)
  private async sendOrderNotification(order: OTCOrder): Promise<void> {
    // Send to main OTC hall
    const message = `🔵 NEW ${order.side.toUpperCase()} ORDER #${order.id}
Asset: ${order.asset}
Size: $${order.amount.toLocaleString()}
Type: ${order.type}
Status: ${order.status}
Contact: @Fire22OTCBot to match`;

    // await telegramBot.sendToChannel('@Fire22OTCHall', message);
  }

  private async sendExecutionNotifications(match: OrderMatch): Promise<void> {
    // Send to both parties
    // Implementation depends on Telegram bot integration
  }

  private async createTelegramDealRoom(match: OrderMatch): Promise<string> {
    // Create private group and return ID
    return `ROOM_${match.id}`;
  }

  private async assignModerator(match: OrderMatch): Promise<string> {
    // Assign available moderator
    return 'MOD_001';
  }

  private async sendNegotiationInvitations(match: OrderMatch): Promise<void> {
    // Send Telegram invites to deal room
  }

  private async closeNegotiation(match: OrderMatch, reason: string): Promise<void> {
    // Close deal room and notify parties
  }

  private async handleSettlementFailure(match: OrderMatch, error?: string): Promise<void> {
    // Handle settlement failures
  }

  private async processBlockchainSettlement(
    buyOrder: OTCOrder,
    sellOrder: OTCOrder,
    amount: number
  ): Promise<string> {
    // Process blockchain transaction
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }

  private async processFiatSettlement(
    buyOrder: OTCOrder,
    sellOrder: OTCOrder,
    buyerDebit: number,
    sellerCredit: number
  ): Promise<string> {
    // Process fiat settlement
    return `FIAT_${Date.now()}`;
  }

  private async logTrade(match: OrderMatch): Promise<void> {
    // Log trade for analytics and reporting
  }

  /**
   * Start the continuous matching loop
   */
  private startMatchingLoop(): void {
    setInterval(() => {
      this.runMatchingCycle();
    }, 1000); // Run every second
  }

  /**
   * Run a single matching cycle
   */
  private async runMatchingCycle(): Promise<void> {
    for (const [asset, orderBook] of this.orderBooks) {
      // Match orders for each asset
      await this.matchOrdersForAsset(asset, orderBook);
    }
  }

  /**
   * Match orders for a specific asset
   */
  private async matchOrdersForAsset(asset: TradingAsset, orderBook: OrderBook): Promise<void> {
    // Get matchable orders
    const openBuyOrders = orderBook.buyOrders.filter(
      o => o.status === OrderStatus.OPEN || o.status === OrderStatus.PARTIALLY_FILLED
    );

    const openSellOrders = orderBook.sellOrders.filter(
      o => o.status === OrderStatus.OPEN || o.status === OrderStatus.PARTIALLY_FILLED
    );

    // Try to match orders
    for (const buyOrder of openBuyOrders) {
      for (const sellOrder of openSellOrders) {
        if (await this.canMatch(buyOrder, sellOrder)) {
          await this.attemptMatch(buyOrder);
          break; // Move to next buy order after successful match
        }
      }
    }
  }

  /**
   * Get current order book for an asset
   */
  public getOrderBook(asset: TradingAsset): OrderBook | undefined {
    return this.orderBooks.get(asset);
  }

  /**
   * Get order by ID
   */
  public getOrder(orderId: string): OTCOrder | undefined {
    return this.activeOrders.get(orderId);
  }

  /**
   * Cancel an order
   */
  public async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);

    if (!order) return false;

    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      return false; // Cannot cancel filled or already cancelled orders
    }

    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();

    // Remove from order book
    this.removeFromOrderBook(order);

    // Refund any locked funds
    await this.refundLockedFunds(order);

    // Send cancellation notification
    await this.sendCancellationNotification(order, reason);

    return true;
  }

  private removeFromOrderBook(order: OTCOrder): void {
    const orderBook = this.orderBooks.get(order.asset);
    if (!orderBook) return;

    if (order.side === OrderSide.BUY) {
      orderBook.buyOrders = orderBook.buyOrders.filter(o => o.id !== order.id);
    } else {
      orderBook.sellOrders = orderBook.sellOrders.filter(o => o.id !== order.id);
    }

    this.updateOrderBookStats(orderBook);
  }

  private async refundLockedFunds(order: OTCOrder): Promise<void> {
    // Refund logic
  }

  private async sendCancellationNotification(order: OTCOrder, reason: string): Promise<void> {
    // Send Telegram notification
  }
}

export default OTCMatchingEngine;
