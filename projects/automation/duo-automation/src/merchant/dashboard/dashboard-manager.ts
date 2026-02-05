import { Database } from "bun:sqlite";
import { AIEvidenceAnalyzer } from "../ai/evidence-analyzer";
import { NotificationService } from "../services/notification-service";
import { AnalyticsEngine } from "../services/analytics-engine";

// ============================================
// TYPE DEFINITIONS
// ============================================

export type Timeframe = '7d' | '30d' | '90d' | '1y';

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
  transactionId: string;
  amount: number;
  reason: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ESCALATED_TO_VENMO' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolutionOutcome?: string;
  customerEmail: string;
  customerName: string;
  transactionDate: Date;
  qrCodeData: string;
  customerEvidenceCount: number;
  merchantEvidenceCount: number;
  lastMessage?: string;
  lastMessageBy?: string;
  riskScore: number;
  recommendation: string;
  confidence: number;
  evidenceUrls: Evidence[];
  messages: DisputeMessage[];
}

export interface Evidence {
  id: string;
  disputeId: string;
  type: 'IMAGE' | 'RECEIPT' | 'TEXT' | 'PDF';
  url: string;
  uploadedBy: 'CUSTOMER' | 'MERCHANT';
  uploadedAt: Date;
  content?: string;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM';
  content: string;
  createdAt: Date;
  readAt?: Date;
}

export interface DisputeReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface TransactionsData {
  total: number;
  volume: number;
  average: number;
  trend: number[];
  byAmount: TransactionBucket[];
  byTime: TransactionTimeSeries[];
}

export interface TransactionBucket {
  range: string;
  count: number;
  volume: number;
}

export interface TransactionTimeSeries {
  date: string;
  count: number;
  volume: number;
}

export interface AnalyticsData {
  disputeTrend: DataPoint[];
  winRateTrend: DataPoint[];
  volumeTrend: DataPoint[];
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
  evidenceSummary: EvidenceSummary;
  keyFindings: KeyFinding[];
  recommendations: AIRecommendation[];
  patterns: DisputePattern[];
  fraudIndicators: FraudIndicator[];
  explainability: ExplainabilityReport;
  metadata: {
    modelVersion: string;
    processingTime: number;
    analyzedItems: number;
  };
}

export interface EvidenceSummary {
  totalItems: number;
  authenticityScore: number;
  consistencyScore: number;
  redFlagCount: number;
  keyEvidence: string[];
}

export interface KeyFinding {
  type: string;
  description: string;
  confidence: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DisputePattern {
  type: string;
  confidence: number;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  frequency?: number;
}

export interface FraudPrediction {
  probability: number;
  indicators: string[];
  confidence: number;
  reasoning: string;
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

export interface FraudIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

export interface ExplainabilityReport {
  riskFactors: RiskFactor[];
  evidenceWeight: EvidenceWeight[];
  modelConfidence: number;
  processingSteps: ProcessingStep[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  contribution: number;
  description: string;
}

export interface EvidenceWeight {
  evidenceId: string;
  weight: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  reasoning: string;
}

export interface ProcessingStep {
  step: string;
  duration: number;
  result: string;
  confidence: number;
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate?: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
}

export interface Alert {
  id: string;
  type: 'DISPUTE' | 'AI' | 'VENMO' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface RealtimeUpdate {
  type: 'NEW_DISPUTE' | 'DISPUTE_UPDATED' | 'AI_ANALYSIS_READY' | 'VENMO_DECISION';
  timestamp: Date;
  data: any;
}

// ============================================
// DASHBOARD MANAGER CLASS
// ============================================

export class MerchantDashboardManager {
  private db: Database;
  private aiAnalyzer: AIEvidenceAnalyzer;
  private notificationService: NotificationService;
  private analyticsEngine: AnalyticsEngine;
  
  // Dashboard data cache
  private dashboards = new Map<string, MerchantDashboard>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.db = new Database("merchant_dashboard.db");
    this.aiAnalyzer = new AIEvidenceAnalyzer();
    this.notificationService = new NotificationService();
    this.analyticsEngine = new AnalyticsEngine();
    this.initializeDatabase();
  }
  
  private initializeDatabase(): void {
    // Create tables if they don't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        transaction_id TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        resolved_at DATETIME,
        resolution_outcome TEXT,
        customer_email TEXT,
        customer_name TEXT,
        transaction_date DATETIME,
        qr_code_data TEXT,
        last_message TEXT,
        last_message_by TEXT,
        risk_score REAL DEFAULT 0.5,
        recommendation TEXT,
        confidence REAL DEFAULT 0.5
      );
      
      CREATE TABLE IF NOT EXISTS dispute_evidence (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at DATETIME NOT NULL,
        content TEXT,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id)
      );
      
      CREATE TABLE IF NOT EXISTS dispute_messages (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        read_at DATETIME,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id)
      );
      
      CREATE TABLE IF NOT EXISTS ai_analysis (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        risk_score REAL NOT NULL,
        confidence REAL NOT NULL,
        evidence_summary TEXT,
        key_findings TEXT,
        recommendations TEXT,
        patterns TEXT,
        fraud_indicators TEXT,
        explainability TEXT,
        metadata TEXT,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id)
      );
      
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        dispute_count INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0.5,
        created_at DATETIME NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME NOT NULL,
        qr_code_data TEXT,
        status TEXT NOT NULL
      );
    `);
  }
  
  async getMerchantDashboard(merchantId: string, timeframe: Timeframe = '30d'): Promise<MerchantDashboard> {
    // Check cache first
    const cacheKey = `${merchantId}:${timeframe}`;
    const cached = this.dashboards.get(cacheKey);
    
    if (cached && (Date.now() - cached.lastUpdated.getTime()) < this.cacheTimeout) {
      return cached;
    }
    
    console.log(`🔍 Building dashboard for merchant ${merchantId} (${timeframe})`);
    
    try {
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
      
      // Cache the dashboard
      this.dashboards.set(cacheKey, dashboard);
      
      // Auto-expire cache
      setTimeout(() => {
        this.dashboards.delete(cacheKey);
      }, this.cacheTimeout);
      
      console.log(`✅ Dashboard built for merchant ${merchantId}`);
      return dashboard;
      
    } catch (error) {
      console.error(`❌ Error building dashboard for ${merchantId}:`, error);
      throw new Error(`Failed to build dashboard: ${error.message}`);
    }
  }
  
  private async getOverviewData(merchantId: string, timeframe: Timeframe): Promise<OverviewData> {
    const [startDate, endDate] = this.getDateRange(timeframe);
    
    const result = this.db.query(`
      SELECT 
        COUNT(DISTINCT t.id) as total_transactions,
        COALESCE(SUM(t.amount), 0) as total_volume,
        COALESCE(AVG(t.amount), 0) as avg_transaction,
        COUNT(DISTINCT CASE WHEN d.status IN ('SUBMITTED', 'UNDER_REVIEW') THEN d.id END) as active_disputes,
        COUNT(DISTINCT CASE WHEN d.status = 'RESOLVED' AND d.resolution_outcome = 'MERCHANT_WINS' THEN d.id END) as won_disputes,
        COUNT(DISTINCT CASE WHEN d.status = 'RESOLVED' AND d.resolution_outcome LIKE 'CUSTOMER_WINS%' THEN d.id END) as lost_disputes,
        AVG(CASE WHEN d.status = 'RESOLVED' THEN (julianday(d.resolved_at) - julianday(d.created_at)) END) as avg_resolution_days
      FROM transactions t
      LEFT JOIN disputes d ON t.id = d.transaction_id
      WHERE t.merchant_id = ? 
        AND t.created_at BETWEEN ? AND ?
    `).get(merchantId, startDate, endDate) as any;
    
    const totalTransactions = result.total_transactions || 0;
    const activeDisputes = result.active_disputes || 0;
    const wonDisputes = result.won_disputes || 0;
    const totalDisputes = wonDisputes + (result.lost_disputes || 0);
    
    return {
      totalTransactions,
      totalVolume: result.total_volume || 0,
      avgTransaction: result.avg_transaction || 0,
      activeDisputes,
      disputeRate: totalTransactions > 0 ? (activeDisputes / totalTransactions) * 100 : 0,
      winRate: totalDisputes > 0 ? (wonDisputes / totalDisputes) * 100 : 0,
      avgResolutionDays: result.avg_resolution_days || 0,
      riskLevel: this.calculateRiskLevel(activeDisputes, totalTransactions)
    };
  }
  
  private async getDisputesData(merchantId: string, timeframe: Timeframe): Promise<DisputesData> {
    const [startDate, endDate] = this.getDateRange(timeframe);
    
    // Get disputes with related data
    const disputes = this.db.query(`
      SELECT 
        d.*,
        c.email as customer_email,
        c.name as customer_name,
        t.amount,
        t.created_at as transaction_date,
        t.qr_code_data,
        (
          SELECT COUNT(*) FROM dispute_evidence 
          WHERE dispute_id = d.id AND uploaded_by = 'CUSTOMER'
        ) as customer_evidence_count,
        (
          SELECT COUNT(*) FROM dispute_evidence 
          WHERE dispute_id = d.id AND uploaded_by = 'MERCHANT'
        ) as merchant_evidence_count,
        (
          SELECT message FROM dispute_messages 
          WHERE dispute_id = d.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT sender_type FROM dispute_messages 
          WHERE dispute_id = d.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_by,
        COALESCE(ai.risk_score, 0.5) as risk_score,
        COALESCE(ai.recommendation, 'REVIEW_MANUALLY') as recommendation,
        COALESCE(ai.confidence, 0.5) as confidence
      FROM disputes d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN transactions t ON d.transaction_id = t.id
      LEFT JOIN ai_analysis ai ON d.id = ai.dispute_id
      WHERE d.merchant_id = ? 
        AND d.created_at BETWEEN ? AND ?
      ORDER BY d.created_at DESC
      LIMIT 100
    `).all(merchantId, startDate, endDate) as any[];
    
    // Group by status
    const byStatus = disputes.reduce((acc, dispute) => {
      const status = dispute.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(dispute);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Get dispute reasons breakdown
    const reasons = this.db.query(`
      SELECT reason, COUNT(*) as count
      FROM disputes
      WHERE merchant_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY reason
      ORDER BY count DESC
    `).all(merchantId, startDate, endDate) as any[];
    
    const totalDisputes = disputes.length;
    const reasonBreakdown = reasons.map(r => ({
      reason: r.reason,
      count: r.count,
      percentage: totalDisputes > 0 ? (r.count / totalDisputes) * 100 : 0
    }));
    
    return {
      all: disputes,
      byStatus,
      counts: {
        total: disputes.length,
        submitted: byStatus.SUBMITTED?.length || 0,
        under_review: byStatus.UNDER_REVIEW?.length || 0,
        escalated: byStatus.ESCALATED_TO_VENMO?.length || 0,
        resolved: byStatus.RESOLVED?.length || 0
      },
      reasons: reasonBreakdown,
      requiringAction: disputes.filter(d => 
        d.status === 'SUBMITTED' || 
        (d.status === 'UNDER_REVIEW' && d.last_message_by === 'CUSTOMER')
      ),
      highRisk: disputes.filter(d => d.risk_score > 0.7)
    };
  }
  
  private async getTransactionsData(merchantId: string, timeframe: Timeframe): Promise<TransactionsData> {
    const [startDate, endDate] = this.getDateRange(timeframe);
    
    const result = this.db.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(amount), 0) as volume,
        COALESCE(AVG(amount), 0) as average
      FROM transactions
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
    `).get(merchantId, startDate, endDate) as any;
    
    // Get trend data
    const trend = this.db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume
      FROM transactions
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(merchantId, startDate, endDate) as any[];
    
    // Get amount buckets
    const buckets = this.db.query(`
      SELECT 
        CASE 
          WHEN amount < 10 THEN 'Under $10'
          WHEN amount < 50 THEN '$10-$50'
          WHEN amount < 100 THEN '$50-$100'
          WHEN amount < 500 THEN '$100-$500'
          ELSE 'Over $500'
        END as range,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as volume
      FROM transactions
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY range
      ORDER BY MIN(amount)
    `).all(merchantId, startDate, endDate) as any[];
    
    return {
      total: result.total || 0,
      volume: result.volume || 0,
      average: result.average || 0,
      trend: trend.map(t => t.count),
      byAmount: buckets,
      byTime: trend.map(t => ({
        date: t.date,
        count: t.count,
        volume: t.volume
      }))
    };
  }
  
  private async getAnalyticsData(merchantId: string, timeframe: Timeframe): Promise<AnalyticsData> {
    const [startDate, endDate] = this.getDateRange(timeframe);
    
    // Get dispute trend
    const disputeTrend = this.db.query(`
      SELECT 
        DATE(created_at) as label,
        COUNT(*) as value
      FROM disputes
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY label
    `).all(merchantId, startDate, endDate) as any[];
    
    // Get win rate trend
    const winRateTrend = this.db.query(`
      SELECT 
        DATE(created_at) as label,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COUNT(CASE WHEN resolution_outcome = 'MERCHANT_WINS' THEN 1 END) * 100.0 / COUNT(*))
          ELSE 0
        END as value
      FROM disputes
      WHERE merchant_id = ? 
        AND status = 'RESOLVED'
        AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY label
    `).all(merchantId, startDate, endDate) as any[];
    
    // Get volume trend
    const volumeTrend = this.db.query(`
      SELECT 
        DATE(created_at) as label,
        COALESCE(SUM(amount), 0) as value
      FROM transactions
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY label
    `).all(merchantId, startDate, endDate) as any[];
    
    // Get reason breakdown
    const reasonBreakdown = this.db.query(`
      SELECT reason as label, COUNT(*) as value
      FROM disputes
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
      GROUP BY reason
      ORDER BY value DESC
    `).all(merchantId, startDate, endDate) as any[];
    
    // Get risk distribution
    const riskDistribution = [
      { label: 'Low Risk (0-0.3)', value: this.db.query("SELECT COUNT(*) FROM disputes WHERE merchant_id = ? AND risk_score < 0.3 AND created_at BETWEEN ? AND ?").get(merchantId, startDate, endDate).value },
      { label: 'Medium Risk (0.3-0.7)', value: this.db.query("SELECT COUNT(*) FROM disputes WHERE merchant_id = ? AND risk_score >= 0.3 AND risk_score < 0.7 AND created_at BETWEEN ? AND ?").get(merchantId, startDate, endDate).value },
      { label: 'High Risk (0.7-1.0)', value: this.db.query("SELECT COUNT(*) FROM disputes WHERE merchant_id = ? AND risk_score >= 0.7 AND created_at BETWEEN ? AND ?").get(merchantId, startDate, endDate).value }
    ];
    
    return {
      disputeTrend,
      winRateTrend,
      volumeTrend,
      reasonBreakdown,
      riskDistribution
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
    `).all(merchantId, startDate, endDate) as any[];
    
    // Parse JSON fields
    const parsedAnalyses = analyses.map(analysis => ({
      ...analysis,
      keyFindings: JSON.parse(analysis.key_findings || '[]'),
      recommendations: JSON.parse(analysis.recommendations || '[]'),
      patterns: JSON.parse(analysis.patterns || '[]'),
      fraudIndicators: JSON.parse(analysis.fraud_indicators || '[]'),
      explainability: JSON.parse(analysis.explainability || '{}')
    }));
    
    // Analyze patterns
    const patterns = this.analyzeDisputePatterns(parsedAnalyses);
    const fraudPredictions = await this.predictFraudTrends(merchantId, parsedAnalyses);
    const recommendations = await this.generateAIRemediations(parsedAnalyses);
    
    return {
      analyses: parsedAnalyses,
      patterns,
      fraudPredictions,
      recommendations,
      summary: {
        totalAnalyzed: parsedAnalyses.length,
        highRiskCount: parsedAnalyses.filter(a => a.risk_score > 0.7).length,
        avgConfidence: parsedAnalyses.length > 0 ? 
          parsedAnalyses.reduce((sum, a) => sum + a.confidence, 0) / parsedAnalyses.length : 0,
        topRiskFactors: this.extractTopRiskFactors(parsedAnalyses)
      }
    };
  }
  
  private async getRecommendations(merchantId: string, timeframe: Timeframe): Promise<Recommendation[]> {
    const [startDate, endDate] = this.getDateRange(timeframe);
    
    // Get pending recommendations
    const recommendations = this.db.query(`
      SELECT * FROM recommendations
      WHERE merchant_id = ? 
        AND created_at BETWEEN ? AND ?
        AND status = 'PENDING'
      ORDER BY priority DESC, created_at ASC
      LIMIT 20
    `).all(merchantId, startDate, endDate) as any[];
    
    return recommendations.map(rec => ({
      ...rec,
      dueDate: rec.due_date ? new Date(rec.due_date) : undefined
    }));
  }
  
  private async generateAlerts(merchantId: string, analytics: AnalyticsData, aiInsights: AIInsights): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // High dispute rate alert
    const recentDisputeCount = analytics.disputeTrend.slice(-7).reduce((sum, point) => sum + point.value, 0);
    if (recentDisputeCount > 10) {
      alerts.push({
        id: `alert-${Date.now()}-1`,
        type: 'DISPUTE',
        severity: 'WARNING',
        title: 'High Dispute Activity',
        message: `${recentDisputeCount} disputes in the last 7 days`,
        createdAt: new Date(),
        read: false,
        actionUrl: '/disputes'
      });
    }
    
    // High risk disputes alert
    if (aiInsights.summary.highRiskCount > 0) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        type: 'AI',
        severity: 'ERROR',
        title: 'High-Risk Disputes Detected',
        message: `${aiInsights.summary.highRiskCount} disputes flagged as high risk by AI`,
        createdAt: new Date(),
        read: false,
        actionUrl: '/ai-insights'
      });
    }
    
    // Win rate decline alert
    const recentWinRate = analytics.winRateTrend.slice(-7);
    if (recentWinRate.length > 1) {
      const currentRate = recentWinRate[recentWinRate.length - 1].value;
      const previousRate = recentWinRate[0].value;
      if (currentRate < previousRate - 10) {
        alerts.push({
          id: `alert-${Date.now()}-3`,
          type: 'SYSTEM',
          severity: 'WARNING',
          title: 'Win Rate Declining',
          message: `Win rate dropped from ${previousRate.toFixed(1)}% to ${currentRate.toFixed(1)}%`,
          createdAt: new Date(),
          read: false,
          actionUrl: '/analytics'
        });
      }
    }
    
    return alerts;
  }
  
  private getDateRange(timeframe: Timeframe): [string, string] {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
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
  
  private analyzeDisputePatterns(analyses: any[]): DisputePattern[] {
    const patterns: DisputePattern[] = [];
    
    // Common patterns detection
    const patternCounts = analyses.reduce((acc, analysis) => {
      analysis.patterns.forEach((pattern: any) => {
        acc[pattern.type] = (acc[pattern.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(patternCounts).forEach(([type, count]) => {
      if (count > 2) {
        patterns.push({
          type,
          confidence: Math.min(count / analyses.length, 0.95),
          description: `Detected in ${count} disputes`,
          impact: count > analyses.length * 0.3 ? 'HIGH' : count > analyses.length * 0.1 ? 'MEDIUM' : 'LOW',
          frequency: count
        });
      }
    });
    
    return patterns;
  }
  
  private async predictFraudTrends(merchantId: string, analyses: any[]): Promise<FraudPrediction[]> {
    const predictions: FraudPrediction[] = [];
    
    // High-risk disputes prediction
    const highRiskDisputes = analyses.filter(a => a.risk_score > 0.7);
    if (highRiskDisputes.length > 0) {
      const avgFraudProbability = highRiskDisputes.reduce((sum, a) => 
        sum + (a.fraudIndicators?.length || 0), 0) / highRiskDisputes.length;
      
      predictions.push({
        probability: Math.min(avgFraudProbability / 10, 0.95),
        indicators: this.extractCommonIndicators(highRiskDisputes),
        confidence: 0.85,
        reasoning: `Based on ${highRiskDisputes.length} high-risk disputes with multiple fraud indicators`
      });
    }
    
    return predictions;
  }
  
  private async generateAIRemediations(analyses: any[]): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    
    // Collect all AI recommendations
    const allRecs = analyses.flatMap(a => a.recommendations || []);
    
    // Group by type and priority
    const groupedRecs = allRecs.reduce((acc, rec) => {
      const key = `${rec.type}:${rec.priority}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Generate consolidated recommendations
    Object.entries(groupedRecs).forEach(([key, recs]) => {
      const [type, priority] = key.split(':');
      const avgConfidence = recs.reduce((sum, rec) => sum + rec.confidence, 0) / recs.length;
      
      recommendations.push({
        type: type as any,
        priority: priority as any,
        title: `${recs.length} ${type.toLowerCase()} actions needed`,
        description: `AI recommends ${recs.length} actions based on dispute analysis`,
        confidence: avgConfidence,
        actions: [...new Set(recs.flatMap((r: any) => r.actions))],
        reasoning: `Based on analysis of ${recs.length} disputes`
      });
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  private extractTopRiskFactors(analyses: any[]): string[] {
    const factorCounts = analyses.reduce((acc, analysis) => {
      analysis.fraudIndicators?.forEach((indicator: any) => {
        acc[indicator.type] = (acc[indicator.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(factorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([factor]) => factor);
  }
  
  private extractCommonIndicators(disputes: any[]): string[] {
    const indicatorCounts = disputes.reduce((acc, dispute) => {
      dispute.fraudIndicators?.forEach((indicator: any) => {
        acc[indicator.type] = (acc[indicator.type] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(indicatorCounts)
      .filter(([, count]) => count > disputes.length * 0.3)
      .map(([indicator]) => indicator);
  }
  
  // Public utility methods
  async refreshDashboard(merchantId: string, timeframe: Timeframe): Promise<void> {
    const cacheKey = `${merchantId}:${timeframe}`;
    this.dashboards.delete(cacheKey);
    await this.getMerchantDashboard(merchantId, timeframe);
  }
  
  async getDisputeDetail(disputeId: string): Promise<Dispute> {
    const dispute = this.db.query(`
      SELECT 
        d.*,
        c.email as customer_email,
        c.name as customer_name,
        t.amount,
        t.created_at as transaction_date,
        t.qr_code_data,
        (
          SELECT COUNT(*) FROM dispute_evidence 
          WHERE dispute_id = d.id AND uploaded_by = 'CUSTOMER'
        ) as customer_evidence_count,
        (
          SELECT COUNT(*) FROM dispute_evidence 
          WHERE dispute_id = d.id AND uploaded_by = 'MERCHANT'
        ) as merchant_evidence_count,
        (
          SELECT message FROM dispute_messages 
          WHERE dispute_id = d.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT sender_type FROM dispute_messages 
          WHERE dispute_id = d.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_by,
        COALESCE(ai.risk_score, 0.5) as risk_score,
        COALESCE(ai.recommendation, 'REVIEW_MANUALLY') as recommendation,
        COALESCE(ai.confidence, 0.5) as confidence
      FROM disputes d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN transactions t ON d.transaction_id = t.id
      LEFT JOIN ai_analysis ai ON d.id = ai.dispute_id
      WHERE d.id = ?
    `).get(disputeId) as any;
    
    if (!dispute) {
      throw new Error(`Dispute ${disputeId} not found`);
    }
    
    // Get evidence and messages
    dispute.evidenceUrls = this.db.query(`
      SELECT * FROM dispute_evidence WHERE dispute_id = ? ORDER BY uploaded_at DESC
    `).all(disputeId) as Evidence[];
    
    dispute.messages = this.db.query(`
      SELECT * FROM dispute_messages WHERE dispute_id = ? ORDER BY created_at ASC
    `).all(disputeId) as DisputeMessage[];
    
    return dispute;
  }
  
  async updateDisputeStatus(disputeId: string, status: string, resolutionOutcome?: string): Promise<void> {
    this.db.run(`
      UPDATE disputes 
      SET status = ?, resolution_outcome = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, status, resolutionOutcome, disputeId);
    
    // Clear relevant dashboard caches
    for (const [key] of this.dashboards) {
      if (key.includes(':')) {
        this.dashboards.delete(key);
      }
    }
  }
}
