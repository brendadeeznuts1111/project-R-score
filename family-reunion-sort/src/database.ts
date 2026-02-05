// Database service for dispute handling system using Bun's SQLite

import { Database } from "bun:sqlite";
import { 
  Dispute, 
  Transaction, 
  Merchant, 
  Customer, 
  DisputeChat,
  CreateDisputeRequest,
  DisputeStatus,
  DATABASE_SCHEMA 
} from "./types";

export class DisputeDatabase {
  private db: Database;

  constructor(dbPath: string = "disputes.db") {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create tables if they don't exist
    this.db.exec(DATABASE_SCHEMA);
  }

  // Transaction operations
  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO transactions (
        id, venmo_payment_id, amount, merchant_id, merchant_username,
        customer_id, items, created_at, location, requires_delivery, qr_code_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      transaction.venmoPaymentId,
      transaction.amount,
      transaction.merchantId,
      transaction.merchantUsername,
      transaction.customerId,
      JSON.stringify(transaction.items),
      transaction.createdAt.toISOString(),
      transaction.location ? JSON.stringify(transaction.location) : null,
      transaction.requiresDelivery,
      transaction.qrCodeData
    );

    return { ...transaction, id };
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const stmt = this.db.prepare("SELECT * FROM transactions WHERE id = ?");
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      venmoPaymentId: row.venmo_payment_id,
      amount: row.amount,
      merchantId: row.merchant_id,
      merchantUsername: row.merchant_username,
      customerId: row.customer_id,
      items: JSON.parse(row.items),
      createdAt: new Date(row.created_at),
      location: row.location ? JSON.parse(row.location) : undefined,
      requiresDelivery: Boolean(row.requires_delivery),
      qrCodeData: row.qr_code_data
    };
  }

  async getTransactionByVenmoPaymentId(venmoPaymentId: string): Promise<Transaction | null> {
    const stmt = this.db.prepare("SELECT * FROM transactions WHERE venmo_payment_id = ?");
    const row = stmt.get(venmoPaymentId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      venmoPaymentId: row.venmo_payment_id,
      amount: row.amount,
      merchantId: row.merchant_id,
      merchantUsername: row.merchant_username,
      customerId: row.customer_id,
      items: JSON.parse(row.items),
      createdAt: new Date(row.created_at),
      location: row.location ? JSON.parse(row.location) : undefined,
      requiresDelivery: Boolean(row.requires_delivery),
      qrCodeData: row.qr_code_data
    };
  }

  // Merchant operations
  async createMerchant(merchant: Omit<Merchant, 'id'>): Promise<Merchant> {
    const id = `MCH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO merchants (
        id, username, display_name, email, phone, is_verified,
        rating, total_transactions, dispute_rate, venmo_business_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      merchant.username,
      merchant.displayName,
      merchant.email,
      merchant.phone || null,
      merchant.isVerified,
      merchant.rating,
      merchant.totalTransactions,
      merchant.disputeRate,
      merchant.venmoBusinessId || null,
      merchant.createdAt.toISOString()
    );

    return { ...merchant, id };
  }

  async getMerchant(id: string): Promise<Merchant | null> {
    const stmt = this.db.prepare("SELECT * FROM merchants WHERE id = ?");
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      phone: row.phone,
      isVerified: Boolean(row.is_verified),
      rating: row.rating,
      totalTransactions: row.total_transactions,
      disputeRate: row.dispute_rate,
      venmoBusinessId: row.venmo_business_id,
      createdAt: new Date(row.created_at)
    };
  }

  async getMerchantByUsername(username: string): Promise<Merchant | null> {
    const stmt = this.db.prepare("SELECT * FROM merchants WHERE username = ?");
    const row = stmt.get(username) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      phone: row.phone,
      isVerified: Boolean(row.is_verified),
      rating: row.rating,
      totalTransactions: row.total_transactions,
      disputeRate: row.dispute_rate,
      venmoBusinessId: row.venmo_business_id,
      createdAt: new Date(row.created_at)
    };
  }

  // Customer operations
  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const id = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO customers (
        id, username, email, phone, total_disputes, dispute_win_rate, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      customer.username,
      customer.email,
      customer.phone || null,
      customer.totalDisputes,
      customer.disputeWinRate,
      customer.createdAt.toISOString()
    );

    return { ...customer, id };
  }

  async getCustomer(id: string): Promise<Customer | null> {
    const stmt = this.db.prepare("SELECT * FROM customers WHERE id = ?");
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      phone: row.phone,
      totalDisputes: row.total_disputes,
      disputeWinRate: row.dispute_win_rate,
      createdAt: new Date(row.created_at)
    };
  }

  // Dispute operations
  async createDispute(dispute: CreateDisputeRequest & { id: string; status: DisputeStatus; timeline: any[]; evidenceUrls: string[]; createdAt: Date; updatedAt: Date }): Promise<Dispute> {
    const stmt = this.db.prepare(`
      INSERT INTO disputes (
        id, transaction_id, customer_id, merchant_id, reason, description,
        status, requested_resolution, evidence_urls, timeline, contact_merchant_first,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dispute.id,
      dispute.transactionId,
      dispute.customerId,
      // We'll need to get merchant_id from transaction
      "", // This will be filled in after getting the transaction
      dispute.reason,
      dispute.description,
      dispute.status,
      dispute.requestedResolution,
      JSON.stringify(dispute.evidenceUrls),
      JSON.stringify(dispute.timeline),
      dispute.contactMerchantFirst,
      dispute.createdAt.toISOString(),
      dispute.updatedAt.toISOString()
    );

    return dispute as Dispute;
  }

  async getDispute(id: string): Promise<Dispute | null> {
    const stmt = this.db.prepare("SELECT * FROM disputes WHERE id = ?");
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      transactionId: row.transaction_id,
      customerId: row.customer_id,
      merchantId: row.merchant_id,
      reason: row.reason,
      description: row.description,
      status: row.status as DisputeStatus,
      requestedResolution: row.requested_resolution,
      evidenceUrls: JSON.parse(row.evidence_urls),
      merchantResponse: row.merchant_response ? JSON.parse(row.merchant_response) : undefined,
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
      venmoDisputeId: row.venmo_dispute_id,
      venmoStatus: row.venmo_status,
      venmoResolution: row.venmo_resolution,
      refundId: row.refund_id,
      timeline: JSON.parse(row.timeline),
      contactMerchantFirst: Boolean(row.contact_merchant_first),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined
    };
  }

  async getDisputeByTransaction(transactionId: string): Promise<Dispute | null> {
    const stmt = this.db.prepare("SELECT * FROM disputes WHERE transaction_id = ?");
    const row = stmt.get(transactionId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      transactionId: row.transaction_id,
      customerId: row.customer_id,
      merchantId: row.merchant_id,
      reason: row.reason,
      description: row.description,
      status: row.status as DisputeStatus,
      requestedResolution: row.requested_resolution,
      evidenceUrls: JSON.parse(row.evidence_urls),
      merchantResponse: row.merchant_response ? JSON.parse(row.merchant_response) : undefined,
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
      venmoDisputeId: row.venmo_dispute_id,
      venmoStatus: row.venmo_status,
      venmoResolution: row.venmo_resolution,
      refundId: row.refund_id,
      timeline: JSON.parse(row.timeline),
      contactMerchantFirst: Boolean(row.contact_merchant_first),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined
    };
  }

  async updateDispute(dispute: Partial<Dispute> & { id: string }): Promise<void> {
    const existingDispute = await this.getDispute(dispute.id);
    if (!existingDispute) throw new Error("Dispute not found");

    const updates = { ...existingDispute, ...dispute, updatedAt: new Date() };
    
    const stmt = this.db.prepare(`
      UPDATE disputes SET
        status = ?, evidence_urls = ?, merchant_response = ?, resolution = ?,
        venmo_dispute_id = ?, venmo_status = ?, venmo_resolution = ?,
        refund_id = ?, timeline = ?, updated_at = ?, resolved_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.status,
      JSON.stringify(updates.evidenceUrls),
      JSON.stringify(updates.merchantResponse),
      JSON.stringify(updates.resolution),
      updates.venmoDisputeId,
      updates.venmoStatus,
      updates.venmoResolution,
      updates.refundId,
      JSON.stringify(updates.timeline),
      updates.updatedAt.toISOString(),
      updates.resolvedAt?.toISOString() || null,
      dispute.id
    );
  }

  async getCustomerDisputes(customerId: string, limit: number = 50): Promise<Dispute[]> {
    let query = `SELECT * FROM disputes ORDER BY created_at DESC LIMIT ?`;
    let params: any[] = [limit];

    if (customerId && customerId.trim() !== "") {
      query = `SELECT * FROM disputes WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`;
      params = [customerId, limit];
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      transactionId: row.transaction_id,
      customerId: row.customer_id,
      merchantId: row.merchant_id,
      reason: row.reason,
      description: row.description,
      status: row.status as DisputeStatus,
      requestedResolution: row.requested_resolution,
      evidenceUrls: JSON.parse(row.evidence_urls),
      merchantResponse: row.merchant_response ? JSON.parse(row.merchant_response) : undefined,
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
      venmoDisputeId: row.venmo_dispute_id,
      venmoStatus: row.venmo_status,
      venmoResolution: row.venmo_resolution,
      refundId: row.refund_id,
      timeline: JSON.parse(row.timeline),
      contactMerchantFirst: Boolean(row.contact_merchant_first),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined
    }));
  }

  async findDisputeByVenmoPaymentId(venmoPaymentId: string): Promise<Dispute | null> {
    // First get the transaction, then the dispute
    const transaction = await this.getTransactionByVenmoPaymentId(venmoPaymentId);
    if (!transaction) return null;
    
    return this.getDisputeByTransaction(transaction.id);
  }

  async findDisputeByVenmoId(venmoDisputeId: string): Promise<Dispute | null> {
    const stmt = this.db.prepare("SELECT * FROM disputes WHERE venmo_dispute_id = ?");
    const row = stmt.get(venmoDisputeId) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      transactionId: row.transaction_id,
      customerId: row.customer_id,
      merchantId: row.merchant_id,
      reason: row.reason,
      description: row.description,
      status: row.status as DisputeStatus,
      requestedResolution: row.requested_resolution,
      evidenceUrls: JSON.parse(row.evidence_urls),
      merchantResponse: row.merchant_response ? JSON.parse(row.merchant_response) : undefined,
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
      venmoDisputeId: row.venmo_dispute_id,
      venmoStatus: row.venmo_status,
      venmoResolution: row.venmo_resolution,
      refundId: row.refund_id,
      timeline: JSON.parse(row.timeline),
      contactMerchantFirst: Boolean(row.contact_merchant_first),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined
    };
  }

  // Dispute chat operations
  async createDisputeChat(chat: Omit<DisputeChat, 'createdAt'>): Promise<DisputeChat> {
    const createdAt = new Date();
    
    const stmt = this.db.prepare(`
      INSERT INTO dispute_chats (
        dispute_id, encryption_key, messages, participants, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      chat.disputeId,
      chat.encryptionKey,
      JSON.stringify(chat.messages),
      JSON.stringify(chat.participants),
      chat.isActive,
      createdAt.toISOString()
    );

    return { ...chat, createdAt };
  }

  async getDisputeChat(disputeId: string): Promise<DisputeChat | null> {
    const stmt = this.db.prepare("SELECT * FROM dispute_chats WHERE dispute_id = ?");
    const row = stmt.get(disputeId) as any;
    
    if (!row) return null;

    return {
      disputeId: row.dispute_id,
      encryptionKey: row.encryption_key,
      messages: JSON.parse(row.messages),
      participants: JSON.parse(row.participants),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at)
    };
  }

  // Analytics methods
  async countDisputes(timeRange: string = 'ALL'): Promise<number> {
    let whereClause = "";
    if (timeRange === 'LAST_30_DAYS') {
      whereClause = "WHERE created_at >= datetime('now', '-30 days')";
    } else if (timeRange === 'LAST_7_DAYS') {
      whereClause = "WHERE created_at >= datetime('now', '-7 days')";
    }
    
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM disputes ${whereClause}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DisputeDatabase();
export default db;
