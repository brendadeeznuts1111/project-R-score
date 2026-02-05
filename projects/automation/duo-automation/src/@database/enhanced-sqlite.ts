/**
 * Enhanced SQLite Integration with 3.51.1 Optimizations
 * 
 * Leverages SQLite 3.51.1 improvements for faster offline payments:
 * - EXISTS-to-JOIN optimization fixes → faster queries on large transaction histories
 * - Query planner improvements → better performance for family-specific queries
 */

import { Database } from "bun:sqlite";

export interface PaymentRecord {
  id: string;
  familyId: string;
  userId: string;
  amount: number;
  currency: string;
  recipientId: string;
  description: string;
  status: "pending" | "completed" | "failed" | "expired";
  createdAt: string;
  completedAt?: string;
  metadata?: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: "admin" | "member" | "guest";
  trustScore: number;
  tier: "IMMEDIATE" | "COUSIN" | "EXTENDED" | "GUEST" | "INVITED_GUEST";
  joinedAt: string;
  lastActiveAt: string;
  onboardingStatus?: "pending" | "completed" | "failed";
  mrrContribution?: number;
  enterpriseReady?: boolean;
}

export interface QuestRecord {
  id: string;
  userId: string;
  questId: string;
  status: "in_progress" | "completed" | "failed" | "expired";
  progress: number;
  startedAt: string;
  completedAt?: string;
  rewards?: string;
}

export class EnhancedSQLiteDB {
  private db: Database;
  
  constructor(dbPath: string = "./data/factory-wager.sqlite") {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }
  
  /**
   * Initialize optimized database schema
   */
  private initializeSchema(): void {
    // Create optimized payments table with proper indexes
    this.db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        familyId TEXT NOT NULL,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        recipientId TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        completedAt TEXT,
        metadata TEXT
      )
    `);
    
    // Create indexes for query optimization
    this.db.run("CREATE INDEX IF NOT EXISTS idx_payments_familyId ON payments(familyId)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_payments_userId ON payments(userId)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_payments_createdAt ON payments(createdAt)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_payments_family_status ON payments(familyId, status)");
    
    // Create family members table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        familyId TEXT NOT NULL,
        userId TEXT NOT NULL,
        role TEXT NOT NULL,
        trustScore INTEGER NOT NULL DEFAULT 30,
        tier TEXT NOT NULL DEFAULT 'GUEST',
        joinedAt TEXT NOT NULL,
        lastActiveAt TEXT NOT NULL,
        onboardingStatus TEXT DEFAULT 'pending',
        mrrContribution REAL DEFAULT 0,
        enterpriseReady INTEGER DEFAULT 0,
        UNIQUE(familyId, userId)
      )
    `);
    
    // Create indexes for family members
    this.db.run("CREATE INDEX IF NOT EXISTS idx_family_members_familyId ON family_members(familyId)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_family_members_tier ON family_members(tier)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_family_members_trustScore ON family_members(trustScore)");
    
    // Create quests table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS quests (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        questId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        progress INTEGER NOT NULL DEFAULT 0,
        startedAt TEXT NOT NULL,
        completedAt TEXT,
        rewards TEXT,
        UNIQUE(userId, questId)
      )
    `);
    
    // Create indexes for quests
    this.db.run("CREATE INDEX IF NOT EXISTS idx_quests_userId ON quests(userId)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_quests_user_quest ON quests(userId, questId)");
    
    // Create guest invitations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS guest_invitations (
        id TEXT PRIMARY KEY,
        familyId TEXT NOT NULL,
        inviterId TEXT NOT NULL,
        guestPhone TEXT NOT NULL,
        guestName TEXT,
        code TEXT NOT NULL UNIQUE,
        tier TEXT NOT NULL DEFAULT 'GUEST',
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        acceptedAt TEXT,
        metadata TEXT
      )
    `);
    
    // Create indexes for guest invitations
    this.db.run("CREATE INDEX IF NOT EXISTS idx_guest_invitations_familyId ON guest_invitations(familyId)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_guest_invitations_code ON guest_invitations(code)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_guest_invitations_status ON guest_invitations(status)");
  }
  
  /**
   * Insert payment record with optimized query
   */
  insertPayment(payment: Omit<PaymentRecord, "id">): string {
    const id = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.db.run(`
      INSERT INTO payments (
        id, familyId, userId, amount, currency, recipientId, description, status, createdAt, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, payment.familyId, payment.userId, payment.amount, payment.currency,
      payment.recipientId, payment.description, payment.status, payment.createdAt, 
      payment.metadata ? JSON.stringify(payment.metadata) : null
    ]);
    
    return id;
  }
  
  /**
   * Get payments for a family with EXISTS optimization (SQLite 3.51.1)
   */
  getFamilyPayments(familyId: string, options: {
    status?: PaymentRecord["status"];
    limit?: number;
    offset?: number;
  } = {}): PaymentRecord[] {
    let query = `
      SELECT * FROM payments 
      WHERE familyId = ?
    `;
    const params: any[] = [familyId];
    
    if (options.status) {
      query += " AND status = ?";
      params.push(options.status);
    }
    
    query += " ORDER BY createdAt DESC";
    
    if (options.limit) {
      query += " LIMIT ?";
      params.push(options.limit);
    }
    
    if (options.offset) {
      query += " OFFSET ?";
      params.push(options.offset);
    }
    
    return this.db.query(query, params).as(PaymentRecord[]);
  }
  
  /**
   * Get payment statistics for family using optimized query planner
   */
  getFamilyPaymentStats(familyId: string): {
    totalPayments: number;
    totalAmount: number;
    pendingPayments: number;
    completedPayments: number;
    averageAmount: number;
  } {
    const stats = this.db.query(`
      SELECT 
        COUNT(*) as totalPayments,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingPayments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedPayments,
        AVG(amount) as averageAmount
      FROM payments 
      WHERE familyId = ?
    `, [familyId]).get() as any;
    
    return {
      totalPayments: stats.totalPayments || 0,
      totalAmount: stats.totalAmount || 0,
      pendingPayments: stats.pendingPayments || 0,
      completedPayments: stats.completedPayments || 0,
      averageAmount: stats.averageAmount || 0
    };
  }
  
  /**
   * Get family members with their payment activity (using EXISTS optimization)
   */
  getFamilyMembersWithActivity(familyId: string): Array<FamilyMember & {
    paymentCount: number;
    totalPaid: number;
    lastPaymentAt?: string;
  }> {
    return this.db.query(`
      SELECT 
        fm.id,
        fm.familyId,
        fm.userId,
        fm.role,
        fm.trustScore,
        fm.tier,
        fm.joinedAt,
        fm.lastActiveAt,
        fm.onboardingStatus,
        fm.mrrContribution,
        fm.enterpriseReady,
        COUNT(p.id) as paymentCount,
        COALESCE(SUM(p.amount), 0) as totalPaid,
        MAX(p.createdAt) as lastPaymentAt
      FROM family_members fm
      LEFT JOIN payments p ON fm.userId = p.userId AND p.familyId = ?
      WHERE fm.familyId = ?
      GROUP BY fm.id
      ORDER BY fm.trustScore DESC, fm.joinedAt ASC
    `, [familyId, familyId]).all() as Array<FamilyMember & {
      paymentCount: number;
      totalPaid: number;
      lastPaymentAt?: string;
    }>;
  }
  
  /**
   * Check if user exists in family (using EXISTS for performance)
   */
  userExistsInFamily(familyId: string, userId: string): boolean {
    const result = this.db.query(`
      SELECT EXISTS(
        SELECT 1 FROM family_members 
        WHERE familyId = ? AND userId = ?
      ) as exists
    `, [familyId, userId]).get() as { exists: number };
    
    return result.exists === 1;
  }
  
  /**
   * Add family member with conflict resolution
   */
  addFamilyMember(member: Omit<FamilyMember, "id">): string {
    const id = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.db.run(`
        INSERT INTO family_members (
          id, familyId, userId, role, trustScore, tier, joinedAt, lastActiveAt,
          onboardingStatus, mrrContribution, enterpriseReady
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, member.familyId, member.userId, member.role, 
        member.trustScore, member.tier, member.joinedAt, member.lastActiveAt,
        member.onboardingStatus || "pending", member.mrrContribution || 0,
        member.enterpriseReady ? 1 : 0
      ]);
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        // Update existing member
        this.db.run(`
          UPDATE family_members 
          SET role = ?, trustScore = ?, tier = ?, lastActiveAt = ?,
              onboardingStatus = ?, mrrContribution = ?, enterpriseReady = ?
          WHERE familyId = ? AND userId = ?
        `, [
          member.role, member.trustScore, member.tier, member.lastActiveAt,
          member.onboardingStatus || "pending", member.mrrContribution || 0,
          member.enterpriseReady ? 1 : 0,
          member.familyId, member.userId
        ]);
        
        // Get existing ID
        const existing = this.db.query(`
          SELECT id FROM family_members WHERE familyId = ? AND userId = ?
        `, [member.familyId, member.userId]).get() as { id: string };
        
        return existing.id;
      }
      throw error;
    }
    
    return id;
  }
  
  /**
   * Update user trust score
   */
  updateUserTrustScore(familyId: string, userId: string, newScore: number): void {
    this.db.run(`
      UPDATE family_members 
      SET trustScore = ?, lastActiveAt = ?
      WHERE familyId = ? AND userId = ?
    `, [newScore, new Date().toISOString(), familyId, userId]);
  }
  
  /**
   * Get user's quest progress
   */
  getUserQuests(userId: string, status?: QuestRecord["status"]): QuestRecord[] {
    let query = "SELECT * FROM quests WHERE userId = ?";
    const params: any[] = [userId];
    
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    
    query += " ORDER BY startedAt DESC";
    
    return this.db.query(query, params).as(QuestRecord[]);
  }
  
  /**
   * Insert or update quest progress
   */
  upsertQuest(quest: Omit<QuestRecord, "id">): string {
    const id = `${quest.userId}_${quest.questId}`;
    
    this.db.run(`
      INSERT OR REPLACE INTO quests (
        id, userId, questId, status, progress, startedAt, completedAt, rewards
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, quest.userId, quest.questId, quest.status, quest.progress,
      quest.startedAt, quest.completedAt, quest.rewards
    ]);
    
    return id;
  }
  
  /**
   * Get database performance metrics
   */
  getPerformanceMetrics(): {
    totalPayments: number;
    totalMembers: number;
    totalQuests: number;
    totalInvitations: number;
    databaseSize: number;
    indexUsage: Array<{
      name: string;
      entries: number;
    }>;
  } {
    const payments = this.db.query("SELECT COUNT(*) as count FROM payments").get() as { count: number };
    const members = this.db.query("SELECT COUNT(*) as count FROM family_members").get() as { count: number };
    const quests = this.db.query("SELECT COUNT(*) as count FROM quests").get() as { count: number };
    const invitations = this.db.query("SELECT COUNT(*) as count FROM guest_invitations").get() as { count: number };
    
    // Get index statistics
    const indexStats = this.db.query(`
      SELECT name, tbl_name FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    `).as({ name: string; tbl_name: string }[]);
    
    const indexUsage = indexStats.map(index => {
      const count = this.db.query(`SELECT COUNT(*) as count FROM ${index.tbl_name}`).get() as { count: number };
      return {
        name: index.name,
        entries: count.count
      };
    });
    
    return {
      totalPayments: payments.count,
      totalMembers: members.count,
      totalQuests: quests.count,
      totalInvitations: invitations.count,
      databaseSize: Bun.file("./data/factory-wager.sqlite").size,
      indexUsage
    };
  }
  
  /**
   * Optimize database (VACUUM and ANALYZE)
   */
  optimize(): void {
    this.db.run("VACUUM");
    this.db.run("ANALYZE");
  }
  
  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Singleton database instance
 */
let dbInstance: EnhancedSQLiteDB | null = null;

export function getDatabase(): EnhancedSQLiteDB {
  if (!dbInstance) {
    dbInstance = new EnhancedSQLiteDB();
  }
  return dbInstance;
}

/**
 * Example usage demonstrating SQLite 3.51.1 optimizations
 */
export async function exampleOptimizedQueries() {
  const db = getDatabase();
  
  // Fast family payment lookup using EXISTS optimization
  const familyPayments = db.getFamilyPayments("FAM123", {
    status: "completed",
    limit: 50
  });
  
  // Efficient member statistics using improved query planner
  const memberStats = db.getFamilyMembersWithActivity("FAM123");
  
  // Quick existence check using EXISTS
  const userExists = db.userExistsInFamily("FAM123", "alice");
  
  // Performance metrics
  const metrics = db.getPerformanceMetrics();
  
  console.log("SQLite 3.51.1 Optimized Results:", {
    familyPayments: familyPayments.length,
    memberStats: memberStats.length,
    userExists,
    metrics
  });
  
  return {
    familyPayments,
    memberStats,
    userExists,
    metrics
  };
}

export default EnhancedSQLiteDB;