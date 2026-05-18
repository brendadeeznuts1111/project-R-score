/**
 * 🔥 Fire22 L-Key Mapping Utility
 * Comprehensive L-Key mapping system for all entities and operations
 */

import {
  PartyType,
  CustomerType,
  TransactionType,
  PaymentMethod,
  ORDER_CONSTANTS,
  L_KEY_MAPPING,
  getLKeyForValue,
  getValueForLKey,
  getLKeyCategoryPrefix,
} from '../types/fire22-otc-constants';

// !==!==!==!==!==!==!==!===
// L-KEY MAPPER CLASS
// !==!==!==!==!==!==!==!===

export class LKeyMapper {
  private static instance: LKeyMapper;
  private reverseMap: Map<string, string> = new Map();
  private categoryMap: Map<string, Set<string>> = new Map();

  private constructor() {
    this.initializeMaps();
  }

  public static getInstance(): LKeyMapper {
    if (!LKeyMapper.instance) {
      LKeyMapper.instance = new LKeyMapper();
    }
    return LKeyMapper.instance;
  }

  /**
   * Initialize reverse lookup maps for performance
   */
  private initializeMaps(): void {
    // Build reverse map and category map
    for (const [category, mappings] of Object.entries(L_KEY_MAPPING)) {
      const categorySet = new Set<string>();

      for (const [lKey, value] of Object.entries(mappings)) {
        this.reverseMap.set(value as string, lKey);
        categorySet.add(lKey);
      }

      this.categoryMap.set(category, categorySet);
    }
  }

  /**
   * Get L-Key for a given value
   */
  public getLKey(value: string): string | undefined {
    return this.reverseMap.get(value) || getLKeyForValue(value);
  }

  /**
   * Get value for a given L-Key
   */
  public getValue(lKey: string): string | undefined {
    return getValueForLKey(lKey);
  }

  /**
   * Get all L-Keys for a category
   */
  public getCategoryLKeys(category: keyof typeof L_KEY_MAPPING): string[] {
    const categorySet = this.categoryMap.get(category);
    return categorySet ? Array.from(categorySet) : [];
  }

  /**
   * Generate next available L-Key for a category
   */
  public generateNextLKey(category: keyof typeof L_KEY_MAPPING): string {
    const existingKeys = this.getCategoryLKeys(category);
    if (existingKeys.length === 0) {
      return this.generateLKeyForCategory(category, 1);
    }

    // Find highest number in existing keys
    const numbers = existingKeys.map(key => parseInt(key.substring(2))).filter(n => !isNaN(n));

    const maxNumber = Math.max(...numbers);
    return this.generateLKeyForCategory(category, maxNumber + 1);
  }

  /**
   * Generate L-Key for category and number
   */
  private generateLKeyForCategory(category: keyof typeof L_KEY_MAPPING, number: number): string {
    const prefixMap: Record<string, string> = {
      PARTIES: 'L1',
      CUSTOMERS: 'L2',
      TRANSACTIONS: 'L3',
      PAYMENTS: 'L4',
      ORDERS: 'L5',
      STATUS: 'L6',
      FEES: 'L7',
      RISK: 'L8',
      SERVICE_TIERS: 'L9',
    };

    const prefix = prefixMap[category] || 'L0';
    return `${prefix}${String(number).padStart(3, '0')}`;
  }

  /**
   * Validate L-Key format
   */
  public isValidLKeyFormat(lKey: string): boolean {
    return /^L[1-9]\d{3}$/.test(lKey);
  }

  /**
   * Get category for L-Key
   */
  public getLKeyCategory(lKey: string): string {
    return getLKeyCategoryPrefix(lKey);
  }

  /**
   * Batch convert values to L-Keys
   */
  public batchToLKeys(values: string[]): Map<string, string | undefined> {
    const result = new Map<string, string | undefined>();

    for (const value of values) {
      result.set(value, this.getLKey(value));
    }

    return result;
  }

  /**
   * Batch convert L-Keys to values
   */
  public batchToValues(lKeys: string[]): Map<string, string | undefined> {
    const result = new Map<string, string | undefined>();

    for (const lKey of lKeys) {
      result.set(lKey, this.getValue(lKey));
    }

    return result;
  }
}

// !==!==!==!==!==!==!==!===
// ENTITY MAPPER
// !==!==!==!==!==!==!==!===

export interface MappedEntity {
  id: string;
  lKey: string;
  type: string;
  category: string;
  metadata: Record<string, any>;
}

export class EntityMapper {
  private mapper: LKeyMapper;
  private entities: Map<string, MappedEntity> = new Map();

  constructor() {
    this.mapper = LKeyMapper.getInstance();
  }

  /**
   * Map a party entity
   */
  public mapParty(params: {
    id: string;
    type: PartyType;
    name: string;
    telegramId?: string;
    metadata?: Record<string, any>;
  }): MappedEntity {
    const lKey = this.mapper.getLKey(params.type) || this.mapper.generateNextLKey('PARTIES');

    const entity: MappedEntity = {
      id: params.id,
      lKey,
      type: params.type,
      category: 'PARTY',
      metadata: {
        name: params.name,
        telegramId: params.telegramId,
        ...params.metadata,
      },
    };

    this.entities.set(params.id, entity);
    return entity;
  }

  /**
   * Map a customer entity
   */
  public mapCustomer(params: {
    id: string;
    type: CustomerType;
    username: string;
    telegramId: string;
    serviceTier: number;
    metadata?: Record<string, any>;
  }): MappedEntity {
    const lKey = this.mapper.getLKey(params.type) || this.mapper.generateNextLKey('CUSTOMERS');

    const entity: MappedEntity = {
      id: params.id,
      lKey,
      type: params.type,
      category: 'CUSTOMER',
      metadata: {
        username: params.username,
        telegramId: params.telegramId,
        serviceTier: params.serviceTier,
        ...params.metadata,
      },
    };

    this.entities.set(params.id, entity);
    return entity;
  }

  /**
   * Map a transaction entity
   */
  public mapTransaction(params: {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    fromParty: string;
    toParty: string;
    paymentMethod: PaymentMethod;
    metadata?: Record<string, any>;
  }): MappedEntity {
    const lKey = this.mapper.getLKey(params.type) || this.mapper.generateNextLKey('TRANSACTIONS');

    const entity: MappedEntity = {
      id: params.id,
      lKey,
      type: params.type,
      category: 'TRANSACTION',
      metadata: {
        amount: params.amount,
        currency: params.currency,
        fromParty: params.fromParty,
        toParty: params.toParty,
        paymentMethod: params.paymentMethod,
        paymentMethodLKey: this.mapper.getLKey(params.paymentMethod),
        ...params.metadata,
      },
    };

    this.entities.set(params.id, entity);
    return entity;
  }

  /**
   * Map an order entity
   */
  public mapOrder(params: {
    id: string;
    type: string;
    side: string;
    status: string;
    customerId: string;
    amount: number;
    price?: number;
    metadata?: Record<string, any>;
  }): MappedEntity {
    const lKey = this.mapper.getLKey(params.type) || this.mapper.generateNextLKey('ORDERS');
    const statusLKey = this.mapper.getLKey(params.status) || this.mapper.generateNextLKey('STATUS');

    const entity: MappedEntity = {
      id: params.id,
      lKey,
      type: params.type,
      category: 'ORDER',
      metadata: {
        side: params.side,
        status: params.status,
        statusLKey,
        customerId: params.customerId,
        amount: params.amount,
        price: params.price,
        ...params.metadata,
      },
    };

    this.entities.set(params.id, entity);
    return entity;
  }

  /**
   * Get entity by ID
   */
  public getEntity(id: string): MappedEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get entities by L-Key
   */
  public getEntitiesByLKey(lKey: string): MappedEntity[] {
    return Array.from(this.entities.values()).filter(e => e.lKey === lKey);
  }

  /**
   * Get entities by category
   */
  public getEntitiesByCategory(category: string): MappedEntity[] {
    return Array.from(this.entities.values()).filter(e => e.category === category);
  }

  /**
   * Export all mappings
   */
  public exportMappings(): {
    entities: MappedEntity[];
    lKeyIndex: Record<string, string[]>;
    categoryIndex: Record<string, string[]>;
  } {
    const entities = Array.from(this.entities.values());
    const lKeyIndex: Record<string, string[]> = {};
    const categoryIndex: Record<string, string[]> = {};

    for (const entity of entities) {
      // Build L-Key index
      if (!lKeyIndex[entity.lKey]) {
        lKeyIndex[entity.lKey] = [];
      }
      lKeyIndex[entity.lKey].push(entity.id);

      // Build category index
      if (!categoryIndex[entity.category]) {
        categoryIndex[entity.category] = [];
      }
      categoryIndex[entity.category].push(entity.id);
    }

    return { entities, lKeyIndex, categoryIndex };
  }
}

// !==!==!==!==!==!==!==!===
// TRANSACTION FLOW MAPPER
// !==!==!==!==!==!==!==!===

export class TransactionFlowMapper {
  private entityMapper: EntityMapper;
  private lKeyMapper: LKeyMapper;

  constructor() {
    this.entityMapper = new EntityMapper();
    this.lKeyMapper = LKeyMapper.getInstance();
  }

  /**
   * Map a complete P2P transaction flow
   */
  public mapP2PFlow(params: {
    transactionId: string;
    depositor: {
      id: string;
      type: CustomerType;
      username: string;
      telegramId: string;
    };
    withdrawer: {
      id: string;
      type: CustomerType;
      username: string;
      telegramId: string;
    };
    amount: number;
    paymentMethod: PaymentMethod;
    fee: number;
    commission?: {
      agentId: string;
      amount: number;
    };
  }): {
    transaction: MappedEntity;
    depositor: MappedEntity;
    withdrawer: MappedEntity;
    flow: string[];
  } {
    // Map depositor
    const depositor = this.entityMapper.mapCustomer({
      id: params.depositor.id,
      type: params.depositor.type,
      username: params.depositor.username,
      telegramId: params.depositor.telegramId,
      serviceTier: 1,
    });

    // Map withdrawer
    const withdrawer = this.entityMapper.mapCustomer({
      id: params.withdrawer.id,
      type: params.withdrawer.type,
      username: params.withdrawer.username,
      telegramId: params.withdrawer.telegramId,
      serviceTier: 1,
    });

    // Map transaction
    const transaction = this.entityMapper.mapTransaction({
      id: params.transactionId,
      type: TransactionType.P2P_TRANSFER,
      amount: params.amount,
      currency: 'USD',
      fromParty: depositor.id,
      toParty: withdrawer.id,
      paymentMethod: params.paymentMethod,
      metadata: {
        fee: params.fee,
        commission: params.commission,
      },
    });

    // Generate flow L-Keys
    const flow = [
      depositor.lKey, // Depositor initiates
      'L3001', // P2P Transfer type
      this.lKeyMapper.getLKey(params.paymentMethod)!, // Payment method
      withdrawer.lKey, // Withdrawer receives
      'L6004', // Status: FILLED
    ];

    if (params.commission) {
      flow.push('L7007'); // Commission fee type
    }

    return { transaction, depositor, withdrawer, flow };
  }

  /**
   * Map an OTC trade flow
   */
  public mapOTCFlow(params: {
    orderId: string;
    buyer: {
      id: string;
      type: CustomerType;
      username: string;
      telegramId: string;
    };
    seller: {
      id: string;
      type: CustomerType;
      username: string;
      telegramId: string;
    };
    orderType: string;
    amount: number;
    price: number;
    asset: string;
  }): {
    order: MappedEntity;
    buyer: MappedEntity;
    seller: MappedEntity;
    flow: string[];
  } {
    // Map buyer
    const buyer = this.entityMapper.mapCustomer({
      id: params.buyer.id,
      type: params.buyer.type,
      username: params.buyer.username,
      telegramId: params.buyer.telegramId,
      serviceTier: 2,
    });

    // Map seller
    const seller = this.entityMapper.mapCustomer({
      id: params.seller.id,
      type: params.seller.type,
      username: params.seller.username,
      telegramId: params.seller.telegramId,
      serviceTier: 2,
    });

    // Map order
    const order = this.entityMapper.mapOrder({
      id: params.orderId,
      type: params.orderType,
      side: 'BUY',
      status: ORDER_CONSTANTS.STATUS.FILLED,
      customerId: params.buyer.id,
      amount: params.amount,
      price: params.price,
      metadata: {
        asset: params.asset,
        counterparty: params.seller.id,
      },
    });

    // Generate OTC flow L-Keys
    const flow = [
      buyer.lKey, // Buyer initiates
      this.lKeyMapper.getLKey(params.orderType)!, // Order type
      'L6002', // Status: OPEN
      'L6007', // Status: MATCHING
      seller.lKey, // Seller matched
      'L6008', // Status: NEGOTIATING
      'L6004', // Status: FILLED
      'L3010', // INSTANT_SETTLEMENT
    ];

    return { order, buyer, seller, flow };
  }
}

// !==!==!==!==!==!==!==!===
// AUDIT TRAIL MAPPER
// !==!==!==!==!==!==!==!===

export interface AuditEntry {
  timestamp: Date;
  lKey: string;
  action: string;
  entityId: string;
  userId: string;
  metadata: Record<string, any>;
}

export class AuditTrailMapper {
  private entries: AuditEntry[] = [];
  private lKeyMapper: LKeyMapper;

  constructor() {
    this.lKeyMapper = LKeyMapper.getInstance();
  }

  /**
   * Log an audit entry with L-Key
   */
  public logEntry(params: {
    action: string;
    entityId: string;
    entityType: string;
    userId: string;
    metadata?: Record<string, any>;
  }): AuditEntry {
    const lKey =
      this.lKeyMapper.getLKey(params.entityType) ||
      this.lKeyMapper.generateNextLKey('TRANSACTIONS');

    const entry: AuditEntry = {
      timestamp: new Date(),
      lKey,
      action: params.action,
      entityId: params.entityId,
      userId: params.userId,
      metadata: params.metadata || {},
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Get audit trail for entity
   */
  public getEntityAudit(entityId: string): AuditEntry[] {
    return this.entries.filter(e => e.entityId === entityId);
  }

  /**
   * Get audit trail by L-Key
   */
  public getAuditByLKey(lKey: string): AuditEntry[] {
    return this.entries.filter(e => e.lKey === lKey);
  }

  /**
   * Generate audit report
   */
  public generateAuditReport(
    startDate: Date,
    endDate: Date
  ): {
    totalEntries: number;
    byLKey: Record<string, number>;
    byAction: Record<string, number>;
    timeline: AuditEntry[];
  } {
    const filteredEntries = this.entries.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );

    const byLKey: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    for (const entry of filteredEntries) {
      // Count by L-Key
      byLKey[entry.lKey] = (byLKey[entry.lKey] || 0) + 1;

      // Count by action
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
    }

    return {
      totalEntries: filteredEntries.length,
      byLKey,
      byAction,
      timeline: filteredEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };
  }
}

// !==!==!==!==!==!==!==!===
// EXPORT SINGLETON INSTANCES
// !==!==!==!==!==!==!==!===

export const lKeyMapper = LKeyMapper.getInstance();
export const entityMapper = new EntityMapper();
export const transactionFlowMapper = new TransactionFlowMapper();
export const auditTrailMapper = new AuditTrailMapper();

export default {
  LKeyMapper,
  EntityMapper,
  TransactionFlowMapper,
  AuditTrailMapper,
  lKeyMapper,
  entityMapper,
  transactionFlowMapper,
  auditTrailMapper,
};
