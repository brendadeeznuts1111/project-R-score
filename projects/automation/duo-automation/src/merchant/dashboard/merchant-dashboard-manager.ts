// src/merchant/dashboard/dashboard-manager.ts
/**
 * 🏪 Merchant Dashboard Manager - Real-time Dashboard with AI Integration
 * 
 * [DOMAIN: financial-tech][SCOPE: dispute-resolution][TYPE: dashboard]
 * [META: {REAL-TIME, AI, SECURE}][CLASS: merchant-interface]
 */

import { Database } from "bun:sqlite";
import { BunNativeAIAnalyzer } from "../../ai/bun-native-ai-analyzer.ts";
import { safeFilename } from "../../native/safeFilename.bun.ts";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Timeframe = '7d' | '30d' | '90d' | '1y' | 'all';

export interface MerchantDashboard {
  merchantId: string;
  timeframe: Timeframe;
  lastUpdated: Date;
  overview: OverviewData;
  disputes: DisputesData;
  transactions: TransactionsData;
  analytics: AnalyticsData;
  aiInsights: AIInsights;
  recommendations: Recommendation[];
  alerts: Alert[];
}

export interface OverviewData {
  totalTransactions: number;
  totalVolume: number;
  avgTransaction: number;
  activeDisputes: number;
  disputeRate: number;
  winRate: number;
  avgResolutionDays: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trends: {
    volume: number;
    disputes: number;
    winRate: number;
  };
}

export interface DisputesData {
  all: Dispute[];
  byStatus: Record<string, Dispute[]>;
  counts: {
    total: number;
    submitted: number;
    under_review: number;
    escalated: number;
    resolved: number;
  };
  reasons: DisputeReason[];
  requiringAction: Dispute[];
  highRisk: Dispute[];
}

export interface Dispute {
  id: string;
  merchantId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  currency: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  evidence: Evidence[];
  createdAt: Date;
  updatedAt: Date;
  transactionDate: Date;
  qrCodeData?: string;
  customerEvidenceCount: number;
  merchantEvidenceCount: number;
  lastMessage?: string;
  lastMessageBy?: string;
  riskScore: number;
  aiRecommendation?: string;
  confidence: number;
}

export type DisputeStatus = 
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ESCALATED_TO_VENMO'
  | 'RESOLVED'
  | 'CLOSED';

export interface Evidence {
  id: string;
  disputeId: string;
  type: 'IMAGE' | 'RECEIPT' | 'TEXT' | 'PDF' | 'VIDEO' | 'AUDIO';
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: 'CUSTOMER' | 'MERCHANT';
  uploadedAt: Date;
  analysis?: EvidenceAnalysis;
}

export interface EvidenceAnalysis {
  authenticityScore: number;
  consistencyScore: number;
  findings: EvidenceFinding[];
  redFlags: RedFlag[];
  sentiment?: SentimentAnalysis;
}

export interface EvidenceFinding {
  type: string;
  value: string;
  confidence: number;
}

export interface RedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

export interface SentimentAnalysis {
  score: number;
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
}

export interface DisputeReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface TransactionsData {
  total: number;
  volume: number;
  averageAmount: number;
  trends: TransactionTrend[];
  recent: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  createdAt: Date;
  status: string;
  disputeId?: string;
}

export interface TransactionTrend {
  date: string;
  count: number;
  volume: number;
  disputeRate: number;
}

export interface AnalyticsData {
  disputeTrend: DataPoint[];
  volumeTrend: DataPoint[];
  winRateTrend: DataPoint[];
  reasonBreakdown: DataPoint[];
  riskDistribution: DataPoint[];
}

export interface DataPoint {
  label: string;
  value: number;
  timestamp?: Date;
}

export interface AIInsights {
  analyses: AIAnalysis[];
  patterns: DisputePattern[];
  fraudPredictions: FraudPrediction[];
  recommendations: AIRecommendation[];
  summary: {
    totalAnalyzed: number;
    highRiskCount: number;
    avgConfidence: number;
    topRiskFactors: string[];
  };
}

export interface AIAnalysis {
  disputeId: string;
  timestamp: Date;
  riskScore: number;
  confidence: number;
  evidenceSummary: string;
  keyFindings: string[];
  recommendations: string[];
  patterns: string[];
  fraudIndicators: FraudIndicator[];
  explainability: Explainability;
  metadata: {
    modelVersion: string;
    processingTime: number;
    analyzedItems: number;
  };
}

export interface FraudIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

export interface Explainability {
  riskFactors: RiskFactor[];
  evidenceWeight: EvidenceWeight[];
  reasoning: string;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  impact: 'POSITIVE' | 'NEGATIVE';
  description: string;
}

export interface EvidenceWeight {
  evidenceId: string;
  weight: number;
  reasoning: string;
}

export interface DisputePattern {
  type: string;
  confidence: number;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  frequency?: number;
}

export interface FraudPrediction {
  disputeId: string;
  fraudProbability: number;
  confidence: number;
  indicators: string[];
  recommendation: string;
}

export interface AIRecommendation {
  type: 'ACTION' | 'EVIDENCE' | 'COMMUNICATION' | 'RESOLUTION' | 'COMPROMISE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  confidence: number;
  actions: string[];
  reasoning: string;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate?: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

export interface Alert {
  id: string;
  type: 'DISPUTE' | 'AI' | 'SYSTEM' | 'VENMO';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
}

// ============================================================================
// MERCHANT DASHBOARD MANAGER
// ============================================================================

export class MerchantDashboardManager {
  private db: Database;
  private aiAnalyzer: BunNativeAIAnalyzer;
  private dashboards: Map<string, MerchantDashboard> = new Map();
  private realTimeSubscriptions: Map<string, WebSocket> = new Map();

  constructor() {
    this.db = new Database(":memory:");
    this.aiAnalyzer = new BunNativeAIAnalyzer();
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create tables
    this.db.exec(`
      CREATE TABLE disputes (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_email TEXT,
        customer_name TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        transaction_date DATETIME,
        qr_code_data TEXT,
        risk_score REAL DEFAULT 0.5,
        ai_recommendation TEXT,
        confidence REAL DEFAULT 0.0
      );

      CREATE TABLE dispute_messages (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id)
      );

      CREATE TABLE evidence (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        type TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        authenticity_score REAL DEFAULT 1.0,
        consistency_score REAL DEFAULT 1.0,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id)
      );

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        dispute_id TEXT
      );

      CREATE TABLE ai_analysis (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        risk_score REAL NOT NULL,
        confidence REAL NOT NULL,
        evidence_summary TEXT,
        key_findings TEXT,
        recommendations TEXT,
        patterns TEXT,
        fraud_indicators TEXT,
        explainability TEXT,
        model_version TEXT,
        processing_time INTEGER,
        analyzed_items INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id)
      );

      CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        dispute_count INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE merchants (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        total_transactions INTEGER DEFAULT 0,
        total_volume REAL DEFAULT 0.0,
        active_disputes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert sample data
    this.insertSampleData();
  }

  private insertSampleData(): void {
    // Insert sample merchants
    this.db.run(`
      INSERT INTO merchants (id, username, email, total_transactions, total_volume) VALUES
      ('merchant-1', 'coffee-shop', 'contact@coffee.com', 1250, 45670.50),
      ('merchant-2', 'restaurant-downtown', 'info@restaurant.com', 890, 32450.75),
      ('merchant-3', 'tech-store', 'sales@techstore.com', 450, 89320.00)
    `);

    // Insert sample customers
    this.db.run(`
      INSERT INTO customers (id, email, name, dispute_count, win_rate) VALUES
      ('customer-1', 'john.doe@email.com', 'John Doe', 2, 0.5),
      ('customer-2', 'jane.smith@email.com', 'Jane Smith', 1, 0.0),
      ('customer-3', 'bob.wilson@email.com', 'Bob Wilson', 3, 0.33)
    `);

    // Insert sample transactions
    this.db.run(`
      INSERT INTO transactions (id, merchant_id, amount, currency, status, created_at) VALUES
      ('txn-1', 'merchant-1', 25.50, 'USD', 'completed', datetime('now', '-7 days')),
      ('txn-2', 'merchant-1', 18.75, 'USD', 'completed', datetime('now', '-5 days')),
      ('txn-3', 'merchant-1', 32.00, 'USD', 'completed', datetime('now', '-3 days')),
      ('txn-4', 'merchant-1', 15.25, 'USD', 'completed', datetime('now', '-1 days')),
      ('txn-5', 'merchant-1', 28.90, 'USD', 'completed', datetime('now', '-12 hours'))
    `);

    // Insert sample disputes
    this.db.run(`
      INSERT INTO disputes (
        id, merchant_id, customer_id, customer_email, customer_name,
        amount, currency, reason, description, status, risk_score, ai_recommendation, confidence
      ) VALUES
      ('dispute-1', 'merchant-1', 'customer-1', 'john.doe@email.com', 'John Doe',
       25.50, 'USD', 'product_not_received', 'Customer claims they never received their order',
       'UNDER_REVIEW', 0.3, 'Request additional evidence', 0.75),
      ('dispute-2', 'merchant-1', 'customer-2', 'jane.smith@email.com', 'Jane Smith',
       18.75, 'USD', 'damaged_goods', 'Customer reports product arrived damaged',
       'SUBMITTED', 0.6, 'Offer partial refund', 0.82),
      ('dispute-3', 'merchant-1', 'customer-3', 'bob.wilson@email.com', 'Bob Wilson',
       32.00, 'USD', 'wrong_item', 'Customer received wrong item',
       'RESOLVED', 0.2, 'Rule in merchant favor', 0.91)
    `);

    // Insert sample dispute messages
    this.db.run(`
      INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_type, content, created_at) VALUES
      ('msg-1', 'dispute-1', 'customer-1', 'CUSTOMER', 'I never received my order!', datetime('now', '-2 days')),
      ('msg-2', 'dispute-1', 'merchant-1', 'MERCHANT', 'We apologize for the inconvenience. Can you provide your order details?', datetime('now', '-2 days')),
      ('msg-3', 'dispute-2', 'customer-2', 'CUSTOMER', 'The product arrived completely damaged!', datetime('now', '-1 day')),
      ('msg-4', 'dispute-2', 'merchant-1', 'MERCHANT', 'We are sorry to hear that. Please provide photos of the damage.', datetime('now', '-1 day'))
    `);

    // Insert sample evidence
    this.db.run(`
      INSERT INTO evidence (
        id, dispute_id, type, filename, url, mime_type, size, uploaded_by,
        authenticity_score, consistency_score
      ) VALUES
      ('ev-1', 'dispute-1', 'IMAGE', 'package-photo.jpg', 'https://cdn.factory-wager.com/ev-1.jpg',
       'image/jpeg', 1024000, 'CUSTOMER', 0.85, 0.90),
      ('ev-2', 'dispute-1', 'RECEIPT', 'order-receipt.pdf', 'https://cdn.factory-wager.com/ev-2.pdf',
       'application/pdf', 256000, 'MERCHANT', 0.95, 0.95),
      ('ev-3', 'dispute-2', 'IMAGE', 'damaged-product.jpg', 'https://cdn.factory-wager.com/ev-3.jpg',
       'image/jpeg', 2048000, 'CUSTOMER', 0.75, 0.80),
      ('ev-4', 'dispute-2', 'RECEIPT', 'purchase-receipt.pdf', 'https://cdn.factory-wager.com/ev-4.pdf',
       'application/pdf', 180000, 'MERCHANT', 0.92, 0.88)
    `);
  }

  async getMerchantDashboard(merchantId: string, timeframe: Timeframe = '30d'): Promise<MerchantDashboard> {
    // Check cache first
    const cacheKey = `${merchantId}:${timeframe}`;
    if (this.dashboards.has(cacheKey)) {
      return this.dashboards.get(cacheKey)!;
    }

    console.log(`📊 Loading dashboard for merchant ${merchantId} (${timeframe})`);

    // Fetch all data in parallel
    const [
      overview,
      disputes,
      transactions,
      analytics,
      aiInsights,
      recommendations
    ] = await Promise.all([
      this.getOverviewData(merchantId, timeframe),
      this.getDisputesData(merchantId, timeframe),
      this.getTransactionsData(merchantId, timeframe),
      this.getAnalyticsData(merchantId, timeframe),
      this.getAIInsights(merchantId, timeframe),
      this.getRecommendations(merchantId, timeframe)
    ]);

    const dashboard: MerchantDashboard = {
      merchantId,
      timeframe,
      lastUpdated: new Date(),
      overview,
      disputes,
      transactions,
      analytics,
      aiInsights,
      recommendations,
      alerts: await this.generateAlerts(merchantId, analytics, aiInsights)
    };

    // Cache for 5 minutes
    this.dashboards.set(cacheKey, dashboard);
    setTimeout(() => this.dashboards.delete(cacheKey), 300000);

    console.log(`✅ Dashboard loaded for ${merchantId}`);
    return dashboard;
  }

  private async getOverviewData(merchantId: string, timeframe: Timeframe): Promise<OverviewData> {
    const [startDate, endDate] = this.getDateRange(timeframe);

    const result = this.db.query(`
      SELECT 
        COUNT(DISTINCT t.id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as total_volume,
        COALESCE(AVG(t.amount), 0) as avg_transaction,
        COUNT(DISTINCT d.id) as active_disputes,
        COUNT(DISTINCT CASE WHEN d.status = 'RESOLVED' AND d.risk_score < 0.5 THEN d.id END) as won_disputes,
        COUNT(DISTINCT d.id) as total_disputes,
        AVG(CASE WHEN d.status = 'RESOLVED' THEN (julianday(d.updated_at) - julianday(d.created_at)) END) as avg_resolution_days
      FROM merchants m
      LEFT JOIN transactions t ON m.id = t.merchant_id AND t.created_at BETWEEN ? AND ?
      LEFT JOIN disputes d ON m.id = d.merchant_id AND d.created_at BETWEEN ? AND ?
      WHERE m.id = ?
    `).get(startDate, endDate, startDate, endDate, merchantId);

    const totalTransactions = result?.total_transactions || 0;
    const totalDisputes = result?.total_disputes || 0;
    const wonDisputes = result?.won_disputes || 0;

    return {
      totalTransactions,
      totalVolume: result?.total_volume || 0,
      avgTransaction: result?.avg_transaction || 0,
      activeDisputes: result?.active_disputes || 0,
      disputeRate: totalTransactions > 0 ? (totalDisputes / totalTransactions) * 100 : 0,
      winRate: totalDisputes > 0 ? (wonDisputes / totalDisputes) * 100 : 0,
      avgResolutionDays: result?.avg_resolution_days || 0,
      riskLevel: this.calculateRiskLevel(result?.active_disputes || 0, totalTransactions),
      trends: await this.calculateTrends(merchantId, timeframe)
    };
  }

  private async getDisputesData(merchantId: string, timeframe: Timeframe): Promise<DisputesData> {
    const [startDate, endDate] = this.getDateRange(timeframe);

    const disputes = this.db.query(`
      SELECT 
        d.*,
        c.email as customer_email,
        c.name as customer_name,
        d.created_at as transaction_date,
        (
          SELECT COUNT(*) FROM evidence 
          WHERE dispute_id = d.id AND uploaded_by = 'CUSTOMER'
        ) as customer_evidence_count,
        (
          SELECT COUNT(*) FROM evidence 
          WHERE dispute_id = d.id AND uploaded_by = 'MERCHANT'
        ) as merchant_evidence_count,
        (
          SELECT content FROM dispute_messages 
          WHERE dispute_id = d.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message
      FROM disputes d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.merchant_id = ? 
        AND d.created_at BETWEEN ? AND ?
      ORDER BY d.created_at DESC
      LIMIT 100
    `).all(merchantId, startDate, endDate) as Dispute[];

    // Group by status
    const byStatus = disputes.reduce((acc, dispute) => {
      acc[dispute.status] = acc[dispute.status] || [];
      acc[dispute.status].push(dispute);
      return acc;
    }, {} as Record<string, Dispute[]>);

    // Get dispute reasons breakdown
    const reasons = this.db.query(`
      SELECT reason, COUNT(*) as count
      FROM disputes
      WHERE merchant_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY reason
      ORDER BY count DESC
    `).all(merchantId, startDate, endDate) as DisputeReason[];

    const totalDisputes = disputes.length;
    return {
      all: disputes,
      byStatus,
      counts: {
        total: totalDisputes,
        submitted: byStatus.SUBMITTED?.length || 0,
        under_review: byStatus.UNDER_REVIEW?.length || 0,
        escalated: byStatus.ESCALATED_TO_VENMO?.length || 0,
        resolved: byStatus.RESOLVED?.length || 0
      },
      reasons: reasons.map(r => ({
        ...r,
        percentage: totalDisputes > 0 ? (r.count / totalDisputes) * 100 : 0
      })),
      requiringAction: disputes.filter(d => 
        d.status === 'SUBMITTED' || 
        (d.status === 'UNDER_REVIEW' && d.customerEvidenceCount > 0 && d.merchantEvidenceCount === 0)
      ),
      highRisk: disputes.filter(d => d.riskScore > 0.7)
    };
  }

  private async getTransactionsData(merchantId: string, timeframe: Timeframe): Promise<TransactionsData> {
    const [startDate, endDate] = this.getDateRange(timeframe);

    const transactions = this.db.query(`
      SELECT *
      FROM transactions
      WHERE merchant_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(merchantId, startDate, endDate) as Transaction[];

    const total = transactions.length;
    const volume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = total > 0 ? volume / total : 0;

    return {
      total,
      volume,
      averageAmount,
      trends: await this.calculateTransactionTrends(merchantId, timeframe),
      recent: transactions.slice(0, 10)
    };
  }

  private async getAnalyticsData(merchantId: string, timeframe: Timeframe): Promise<AnalyticsData> {
    const [startDate, endDate] = this.getDateRange(timeframe);

    return {
      disputeTrend: await this.getDisputeTrend(merchantId, startDate, endDate),
      volumeTrend: await this.getVolumeTrend(merchantId, startDate, endDate),
      winRateTrend: await this.getWinRateTrend(merchantId, startDate, endDate),
      reasonBreakdown: await this.getReasonBreakdown(merchantId, startDate, endDate),
      riskDistribution: await this.getRiskDistribution(merchantId, startDate, endDate)
    };
  }

  private async getAIInsights(merchantId: string, timeframe: Timeframe): Promise<AIInsights> {
    const [startDate, endDate] = this.getDateRange(timeframe);

    // Get AI analysis for all disputes
    const analyses = this.db.query(`
      SELECT 
        ai.*,
        d.reason,
        d.status,
        d.amount,
        c.email as customer_email
      FROM ai_analysis ai
      JOIN disputes d ON ai.dispute_id = d.id
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.merchant_id = ? 
        AND ai.created_at BETWEEN ? AND ?
      ORDER BY ai.risk_score DESC
    `).all(merchantId, startDate, endDate) as AIAnalysis[];

    // Analyze patterns
    const patterns = this.analyzeDisputePatterns(analyses);
    const fraudPredictions = await this.predictFraudTrends(merchantId, analyses);
    const recommendations = await this.generateAIRemediations(analyses);

    return {
      analyses,
      patterns,
      fraudPredictions,
      recommendations,
      summary: {
        totalAnalyzed: analyses.length,
        highRiskCount: analyses.filter(a => a.riskScore > 0.7).length,
        avgConfidence: analyses.length > 0 ? 
          analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length : 0,
        topRiskFactors: this.extractTopRiskFactors(analyses)
      }
    };
  }

  private async getRecommendations(merchantId: string, timeframe: Timeframe): Promise<Recommendation[]> {
    return [
      {
        id: 'rec-1',
        type: 'evidence',
        title: 'Upload Evidence for 2 Pending Disputes',
        description: 'You have 2 disputes waiting for your evidence',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        status: 'PENDING',
        createdAt: new Date()
      },
      {
        id: 'rec-2',
        type: 'ai',
        title: 'Review AI Recommendations',
        description: 'AI has identified 3 high-risk disputes requiring attention',
        priority: 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date()
      }
    ];
  }

  private async generateAlerts(merchantId: string, analytics: AnalyticsData, aiInsights: AIInsights): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // High dispute rate alert
    if (aiInsights.summary.highRiskCount > 0) {
      alerts.push({
        id: 'alert-1',
        type: 'AI',
        severity: 'WARNING',
        title: 'High-Risk Disputes Detected',
        message: `${aiInsights.summary.highRiskCount} disputes require immediate attention`,
        timestamp: new Date(),
        read: false,
        actionUrl: '/disputes?filter=high-risk'
      });
    }

    // New dispute alert
    const newDisputes = aiInsights.analyses.filter(a => 
      a.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    if (newDisputes.length > 0) {
      alerts.push({
        id: 'alert-2',
        type: 'DISPUTE',
        severity: 'INFO',
        title: 'New Dispute Filed',
        message: `${newDisputes.length} new dispute(s) filed in the last 24 hours`,
        timestamp: new Date(),
        read: false,
        actionUrl: '/disputes?filter=new'
      });
    }

    return alerts;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getDateRange(timeframe: Timeframe): [string, string] {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return [
      startDate.toISOString().split('T')[0],
      now.toISOString().split('T')[0]
    ];
  }

  private calculateRiskLevel(activeDisputes: number, totalTransactions: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const disputeRate = totalTransactions > 0 ? (activeDisputes / totalTransactions) * 100 : 0;

    if (disputeRate > 5) return 'CRITICAL';
    if (disputeRate > 3) return 'HIGH';
    if (disputeRate > 1) return 'MEDIUM';
    return 'LOW';
  }

  private async calculateTrends(merchantId: string, timeframe: Timeframe): Promise<any> {
    // Calculate trends compared to previous period
    const [startDate, endDate] = this.getDateRange(timeframe);
    
    // This would normally compare with previous period
    return {
      volume: 12.5, // % change
      disputes: -3.2, // % change
      winRate: 5.1 // % change
    };
  }

  private async calculateTransactionTrends(merchantId: string, timeframe: Timeframe): Promise<TransactionTrend[]> {
    // Generate sample trend data
    const trends: TransactionTrend[] = [];
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10,
        volume: Math.random() * 1000 + 500,
        disputeRate: Math.random() * 5
      });
    }

    return trends;
  }

  private async getDisputeTrend(merchantId: string, startDate: string, endDate: string): Promise<DataPoint[]> {
    // Generate sample dispute trend data
    return [
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 15 },
      { label: 'Wed', value: 8 },
      { label: 'Thu', value: 18 },
      { label: 'Fri', value: 22 },
      { label: 'Sat', value: 14 },
      { label: 'Sun', value: 9 }
    ];
  }

  private async getVolumeTrend(merchantId: string, startDate: string, endDate: string): Promise<DataPoint[]> {
    return [
      { label: 'Mon', value: 2500 },
      { label: 'Tue', value: 3200 },
      { label: 'Wed', value: 2800 },
      { label: 'Thu', value: 4100 },
      { label: 'Fri', value: 5500 },
      { label: 'Sat', value: 3800 },
      { label: 'Sun', value: 2200 }
    ];
  }

  private async getWinRateTrend(merchantId: string, startDate: string, endDate: string): Promise<DataPoint[]> {
    return [
      { label: 'Mon', value: 65 },
      { label: 'Tue', value: 72 },
      { label: 'Wed', value: 68 },
      { label: 'Thu', value: 75 },
      { label: 'Fri', value: 80 },
      { label: 'Sat', value: 70 },
      { label: 'Sun', value: 66 }
    ];
  }

  private async getReasonBreakdown(merchantId: string, startDate: string, endDate: string): Promise<DataPoint[]> {
    return [
      { label: 'Product Not Received', value: 35 },
      { label: 'Damaged Goods', value: 25 },
      { label: 'Wrong Item', value: 20 },
      { label: 'Quality Issues', value: 15 },
      { label: 'Other', value: 5 }
    ];
  }

  private async getRiskDistribution(merchantId: string, startDate: string, endDate: string): Promise<DataPoint[]> {
    return [
      { label: 'Low Risk', value: 65 },
      { label: 'Medium Risk', value: 25 },
      { label: 'High Risk', value: 8 },
      { label: 'Critical', value: 2 }
    ];
  }

  private analyzeDisputePatterns(analyses: AIAnalysis[]): DisputePattern[] {
    const patterns: DisputePattern[] = [];

    // Analyze common patterns
    if (analyses.length > 0) {
      const avgRiskScore = analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length;
      
      if (avgRiskScore > 0.6) {
        patterns.push({
          type: 'ELEVATED_RISK_PATTERN',
          confidence: 0.85,
          description: 'Dispute risk levels are elevated compared to baseline',
          impact: 'HIGH'
        });
      }
    }

    return patterns;
  }

  private async predictFraudTrends(merchantId: string, analyses: AIAnalysis[]): Promise<FraudPrediction[]> {
    return analyses
      .filter(a => a.riskScore > 0.7)
      .map(a => ({
        disputeId: a.disputeId,
        fraudProbability: a.riskScore,
        confidence: a.confidence,
        indicators: ['High risk score', 'Unusual pattern'],
        recommendation: 'Escalate to Venmo for review'
      }));
  }

  private async generateAIRemediations(analyses: AIAnalysis[]): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    const highRiskDisputes = analyses.filter(a => a.riskScore > 0.7);
    
    if (highRiskDisputes.length > 0) {
      recommendations.push({
        type: 'ACTION',
        priority: 'HIGH',
        title: 'Review High-Risk Disputes',
        description: `${highRiskDisputes.length} disputes have elevated risk scores`,
        confidence: 0.9,
        actions: ['REVIEW_EVIDENCE', 'ESCALATE_IF_NEEDED'],
        reasoning: 'AI analysis indicates elevated fraud risk'
      });
    }

    return recommendations;
  }

  private extractTopRiskFactors(analyses: AIAnalysis[]): string[] {
    // Extract common risk factors from analyses
    return [
      'Evidence inconsistencies',
      'Customer behavior patterns',
      'Transaction anomalies'
    ];
  }

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  async subscribeToRealTimeUpdates(merchantId: string, callback: (update: any) => void): Promise<void> {
    console.log(`📡 Subscribing to real-time updates for merchant ${merchantId}`);

    // In a real implementation, this would connect to WebSocket
    // For now, we'll simulate with periodic updates
    const interval = setInterval(() => {
      callback({
        type: 'HEARTBEAT',
        timestamp: new Date(),
        merchantId
      });
    }, 30000); // Every 30 seconds

    this.realTimeSubscriptions.set(merchantId, { close: () => clearInterval(interval) } as any);
  }

  async unsubscribeFromRealTimeUpdates(merchantId: string): Promise<void> {
    const subscription = this.realTimeSubscriptions.get(merchantId);
    if (subscription) {
      subscription.close();
      this.realTimeSubscriptions.delete(merchantId);
      console.log(`📡 Unsubscribed from real-time updates for merchant ${merchantId}`);
    }
  }

  // ============================================================================
  // DASHBOARD ACTIONS
  // ============================================================================

  async updateDisputeStatus(disputeId: string, status: DisputeStatus, merchantId: string): Promise<boolean> {
    try {
      this.db.run(
        'UPDATE disputes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND merchant_id = ?',
        [status, disputeId, merchantId]
      );

      // Clear cache for this merchant
      this.clearMerchantCache(merchantId);

      console.log(`✅ Updated dispute ${disputeId} status to ${status}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update dispute status:`, error);
      return false;
    }
  }

  async uploadEvidence(disputeId: string, evidence: Omit<Evidence, 'id' | 'uploadedAt'>): Promise<string> {
    const evidenceId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.db.run(`
        INSERT INTO evidence (
          id, dispute_id, type, filename, url, mime_type, size, uploaded_by,
          authenticity_score, consistency_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        evidenceId, evidence.disputeId, evidence.type, evidence.filename,
        evidence.url, evidence.mimeType, evidence.size, evidence.uploadedBy,
        evidence.authenticityScore || 1.0, evidence.consistencyScore || 1.0
      ]);

      console.log(`✅ Uploaded evidence ${evidenceId} for dispute ${disputeId}`);
      return evidenceId;
    } catch (error) {
      console.error(`❌ Failed to upload evidence:`, error);
      throw error;
    }
  }

  private clearMerchantCache(merchantId: string): void {
    // Clear all cached dashboards for this merchant
    for (const [key] of this.dashboards) {
      if (key.startsWith(`${merchantId}:`)) {
        this.dashboards.delete(key);
      }
    }
  }

  // ============================================================================
  // EXPORT AND REPORTING
  // ============================================================================

  async exportDashboardData(merchantId: string, timeframe: Timeframe, format: 'json' | 'csv' | 'pdf'): Promise<Uint8Array> {
    const dashboard = await this.getMerchantDashboard(merchantId, timeframe);
    
    switch (format) {
      case 'json':
        return new TextEncoder().encode(JSON.stringify(dashboard, null, 2));
      case 'csv':
        return this.generateCSVExport(dashboard);
      case 'pdf':
        return this.generatePDFExport(dashboard);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateCSVExport(dashboard: MerchantDashboard): Uint8Array {
    const headers = ['Dispute ID', 'Customer', 'Amount', 'Status', 'Risk Score', 'Created At'];
    const rows = dashboard.disputes.all.map(d => [
      d.id,
      d.customerEmail,
      d.amount.toString(),
      d.status,
      d.riskScore.toString(),
      d.createdAt.toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return new TextEncoder().encode(csvContent);
  }

  private generatePDFExport(dashboard: MerchantDashboard): Uint8Array {
    // In a real implementation, this would generate a PDF
    // For now, return a placeholder
    const content = `Merchant Dashboard Report\n\nMerchant: ${dashboard.merchantId}\nTimeframe: ${dashboard.timeframe}\nGenerated: ${dashboard.lastUpdated.toISOString()}`;
    return new TextEncoder().encode(content);
  }
}
