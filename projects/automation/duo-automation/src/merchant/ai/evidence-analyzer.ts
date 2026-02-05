// AI Evidence Analysis System for Merchant Dispute Resolution

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Dispute {
  id: string;
  merchantId: string;
  customerId: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolutionOutcome?: string;
  evidenceUrls: Evidence[];
  messages: DisputeMessage[];
  transaction: Transaction;
  merchantUsername: string;
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

export interface Transaction {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  createdAt: Date;
  qrCodeData: string;
  status: string;
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

export interface AIRecommendation {
  type: 'ACTION' | 'EVIDENCE' | 'COMMUNICATION' | 'RESOLUTION' | 'COMPROMISE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  confidence: number;
  actions: string[];
  reasoning: string;
}

export interface DisputePattern {
  type: string;
  confidence: number;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  frequency?: number;
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

export interface EvidenceAnalysis {
  evidenceId: string;
  type: string;
  findings: KeyFinding[];
  authenticityScore: number;
  consistencyScore?: number;
  redFlags: FraudIndicator[];
  sentiment?: SentimentAnalysis;
}

export interface ImageAnalysis extends EvidenceAnalysis {
  findings: KeyFinding[];
  authenticityScore: number;
  redFlags: FraudIndicator[];
}

export interface ReceiptAnalysis extends EvidenceAnalysis {
  findings: KeyFinding[];
  authenticityScore: number;
  consistencyScore: number;
  redFlags: FraudIndicator[];
}

export interface TextAnalysis extends EvidenceAnalysis {
  findings: KeyFinding[];
  sentiment: SentimentAnalysis;
}

export interface SentimentAnalysis {
  score: number;
  magnitude: number;
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface ChatAnalysis {
  sentimentTrend: number[];
  keyTopics: string[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  redFlags: FraudIndicator[];
}

export interface CombinedAnalysis {
  evidenceAnalyses: EvidenceAnalysis[];
  chatAnalysis: ChatAnalysis;
  transactionAnalysis: TransactionAnalysis;
  customerHistory: CustomerHistory;
  merchantHistory: MerchantHistory;
  dispute: Dispute;
}

export interface TransactionAnalysis {
  isUnusual: boolean;
  redFlags: FraudIndicator[];
  patterns: string[];
}

export interface CustomerHistory {
  customerId: string;
  disputeCount: number;
  winRate: number;
  averageDisputeAmount: number;
  lastDisputeDate?: Date;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MerchantHistory {
  merchantId: string;
  totalDisputes: number;
  winRate: number;
  averageResponseTime: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============================================
// AI MODELS AND SERVICES
// ============================================

class VisionAI {
  async annotateImage(request: any): Promise<any[]> {
    // Mock Google Vision AI implementation
    console.log(`🔍 Analyzing image with Vision AI: ${request.image.source.imageUri}`);
    
    // Simulate API response
    return [{
      fullTextAnnotation: {
        text: this.extractMockText(request.image.source.imageUri)
      },
      labelAnnotations: [
        { description: 'receipt', score: 0.95 },
        { description: 'text', score: 0.88 },
        { description: 'document', score: 0.76 }
      ],
      faceAnnotations: [],
      imagePropertiesAnnotation: {
        dominantColors: {
          colors: [
            { color: { red: 255, green: 255, blue: 255 }, pixelFraction: 0.8, score: 0.9 }
          ]
        }
      }
    }];
  }
  
  private extractMockText(imageUrl: string): string {
    // Mock text extraction based on URL patterns
    if (imageUrl.includes('receipt')) {
      return 'COFFEE SHOP\nTotal: $12.50\nDate: 01/15/2026\nThank you!';
    }
    return 'Sample extracted text';
  }
}

class NLPProcessor {
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    // Mock sentiment analysis
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('angry') || lowerText.includes('frustrated') || lowerText.includes('terrible')) {
      return { score: -0.8, magnitude: 0.9, label: 'NEGATIVE' };
    } else if (lowerText.includes('happy') || lowerText.includes('great') || lowerText.includes('excellent')) {
      return { score: 0.8, magnitude: 0.7, label: 'POSITIVE' };
    } else {
      return { score: 0.1, magnitude: 0.2, label: 'NEUTRAL' };
    }
  }
  
  async extractTopics(text: string): Promise<string[]> {
    // Mock topic extraction
    const topics = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('refund')) topics.push('refund_request');
    if (lowerText.includes('quality')) topics.push('product_quality');
    if (lowerText.includes('delivery')) topics.push('delivery_issue');
    if (lowerText.includes('charge')) topics.push('billing_issue');
    if (lowerText.includes('service')) topics.push('customer_service');
    
    return topics.length > 0 ? topics : ['general_inquiry'];
  }
}

class FraudDetectionModel {
  async analyze(analysis: CombinedAnalysis): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];
    
    // Analyze evidence for fraud patterns
    analysis.evidenceAnalyses.forEach(evidence => {
      evidence.redFlags.forEach(flag => {
        if (flag.severity === 'HIGH' || flag.severity === 'CRITICAL') {
          indicators.push(flag);
        }
      });
    });
    
    // Check customer history
    if (analysis.customerHistory.disputeCount > 5) {
      indicators.push({
        type: 'FREQUENT_DISPUTER',
        severity: 'HIGH',
        description: `Customer has ${analysis.customerHistory.disputeCount} disputes`,
        confidence: 0.85
      });
    }
    
    // Check transaction patterns
    if (analysis.transactionAnalysis.isUnusual) {
      indicators.push({
        type: 'UNUSUAL_TRANSACTION',
        severity: 'MEDIUM',
        description: 'Transaction pattern differs from customer history',
        confidence: 0.72
      });
    }
    
    return indicators;
  }
}

class PatternRecognition {
  async detectPatterns(analysis: CombinedAnalysis): Promise<DisputePattern[]> {
    const patterns: DisputePattern[] = [];
    
    // Immediate dispute pattern
    const hoursToDispute = (analysis.dispute.createdAt.getTime() - 
      analysis.transaction.createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursToDispute < 1) {
      patterns.push({
        type: 'IMMEDIATE_DISPUTE',
        confidence: 0.75,
        description: `Dispute filed within ${hoursToDispute.toFixed(1)} hours`,
        impact: 'MEDIUM'
      });
    }
    
    // High amount pattern
    if (analysis.dispute.amount > 1000) {
      patterns.push({
        type: 'HIGH_VALUE_DISPUTE',
        confidence: 0.90,
        description: `Dispute amount ($${analysis.dispute.amount}) is unusually high`,
        impact: 'HIGH'
      });
    }
    
    // Evidence tampering pattern
    const tamperedEvidence = analysis.evidenceAnalyses.filter(e => 
      e.redFlags.some(f => f.type === 'EVIDENCE_TAMPERING')
    );
    
    if (tamperedEvidence.length > 0) {
      patterns.push({
        type: 'EVIDENCE_TAMPERING',
        confidence: 0.88,
        description: `${tamperedEvidence.length} evidence items show signs of tampering`,
        impact: 'HIGH'
      });
    }
    
    return patterns;
  }
}

class ReceiptParser {
  async parse(receiptUrl: string): Promise<ReceiptData | null> {
    console.log(`🧾 Parsing receipt: ${receiptUrl}`);
    
    // Mock receipt parsing
    if (receiptUrl.includes('valid')) {
      return {
        merchantName: 'Coffee Shop',
        totalAmount: 12.50,
        date: '2026-01-15',
        items: ['Coffee', 'Pastry'],
        tax: 1.00,
        confidence: 0.92
      };
    } else if (receiptUrl.includes('tampered')) {
      return {
        merchantName: 'Unknown Store',
        totalAmount: 999.99,
        date: '2026-01-15',
        items: ['Unknown'],
        tax: 0,
        confidence: 0.45
      };
    }
    
    return null;
  }
}

class SentimentAnalyzer {
  async analyze(text: string): Promise<SentimentAnalysis> {
    const nlp = new NLPProcessor();
    return nlp.analyzeSentiment(text);
  }
}

interface ReceiptData {
  merchantName: string;
  totalAmount: number;
  date: string;
  items: string[];
  tax: number;
  confidence: number;
}

// ============================================
// MAIN AI EVIDENCE ANALYZER CLASS
// ============================================

export class AIEvidenceAnalyzer {
  private visionModel: VisionAI;
  private nlpModel: NLPProcessor;
  private fraudDetector: FraudDetectionModel;
  private patternRecognizer: PatternRecognition;
  private receiptParser: ReceiptParser;
  private sentimentAnalyzer: SentimentAnalyzer;
  
  constructor() {
    this.visionModel = new VisionAI();
    this.nlpModel = new NLPProcessor();
    this.fraudDetector = new FraudDetectionModel();
    this.patternRecognizer = new PatternRecognition();
    this.receiptParser = new ReceiptParser();
    this.sentimentAnalyzer = new SentimentAnalyzer();
  }
  
  async analyzeDispute(dispute: Dispute): Promise<AIAnalysis> {
    const startTime = Date.now();
    console.log(`🤖 Starting AI analysis for dispute ${dispute.id}`);
    
    try {
      // Parallel analysis of all evidence
      const analysisTasks = dispute.evidenceUrls.map(evidence => 
        this.analyzeEvidence(evidence, dispute)
      );
      
      const evidenceAnalyses = await Promise.all(analysisTasks);
      
      // Analyze chat messages
      const chatAnalysis = await this.analyzeChatMessages(dispute.messages);
      
      // Analyze transaction pattern
      const transactionAnalysis = await this.analyzeTransactionPattern(dispute.transaction);
      
      // Get customer and merchant history
      const [customerHistory, merchantHistory] = await Promise.all([
        this.getCustomerHistory(dispute.customerId),
        this.getMerchantHistory(dispute.merchantId)
      ]);
      
      // Combine all analyses
      const combinedAnalysis: CombinedAnalysis = {
        evidenceAnalyses,
        chatAnalysis,
        transactionAnalysis,
        customerHistory,
        merchantHistory,
        dispute
      };
      
      // Generate risk score and recommendations
      const riskScore = await this.calculateRiskScore(combinedAnalysis);
      const recommendations = await this.generateRecommendations(combinedAnalysis, riskScore);
      const patterns = await this.detectPatterns(combinedAnalysis);
      const fraudIndicators = await this.fraudDetector.analyze(combinedAnalysis);
      
      const aiAnalysis: AIAnalysis = {
        disputeId: dispute.id,
        timestamp: new Date(),
        riskScore,
        confidence: this.calculateConfidence(combinedAnalysis),
        evidenceSummary: this.summarizeEvidence(evidenceAnalyses),
        keyFindings: this.extractKeyFindings(combinedAnalysis),
        recommendations,
        patterns,
        fraudIndicators,
        explainability: this.generateExplanation(combinedAnalysis, riskScore),
        metadata: {
          modelVersion: '2.3.1',
          processingTime: Date.now() - startTime,
          analyzedItems: evidenceAnalyses.length + chatAnalysis.redFlags.length
        }
      };
      
      console.log(`✅ AI analysis completed for dispute ${dispute.id} in ${aiAnalysis.metadata.processingTime}ms`);
      return aiAnalysis;
      
    } catch (error) {
      console.error(`❌ AI analysis failed for dispute ${dispute.id}:`, error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }
  
  private async analyzeEvidence(evidence: Evidence, dispute: Dispute): Promise<EvidenceAnalysis> {
    const analysis: EvidenceAnalysis = {
      evidenceId: evidence.id,
      type: evidence.type,
      findings: [],
      authenticityScore: 1.0,
      redFlags: []
    };
    
    switch (evidence.type) {
      case 'IMAGE':
        const imageAnalysis = await this.analyzeImage(evidence.url);
        analysis.findings.push(...imageAnalysis.findings);
        analysis.authenticityScore = imageAnalysis.authenticityScore;
        analysis.redFlags.push(...imageAnalysis.redFlags);
        break;
        
      case 'RECEIPT':
        const receiptAnalysis = await this.analyzeReceipt(evidence.url, dispute);
        analysis.findings.push(...receiptAnalysis.findings);
        analysis.authenticityScore = receiptAnalysis.authenticityScore;
        analysis.consistencyScore = receiptAnalysis.consistencyScore;
        analysis.redFlags.push(...receiptAnalysis.redFlags);
        break;
        
      case 'TEXT':
        const textAnalysis = await this.analyzeText(evidence.content || '');
        analysis.findings.push(...textAnalysis.findings);
        analysis.sentiment = textAnalysis.sentiment;
        break;
        
      case 'PDF':
        const pdfAnalysis = await this.analyzePDF(evidence.url);
        analysis.findings.push(...pdfAnalysis.findings);
        analysis.authenticityScore = pdfAnalysis.authenticityScore;
        break;
    }
    
    // Check for evidence tampering
    if (await this.checkForTampering(evidence)) {
      analysis.redFlags.push({
        type: 'EVIDENCE_TAMPERING',
        severity: 'HIGH',
        description: 'Signs of digital tampering detected',
        confidence: 0.89
      });
      analysis.authenticityScore *= 0.3;
    }
    
    return analysis;
  }
  
  private async analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
    console.log(`🖼️ Analyzing image: ${imageUrl}`);
    
    const analysis: ImageAnalysis = {
      evidenceId: '',
      type: 'IMAGE',
      findings: [],
      authenticityScore: 1.0,
      redFlags: []
    };
    
    try {
      // Use Vision AI for image analysis
      const [visionResult] = await this.visionModel.annotateImage({
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'LABEL_DETECTION' },
          { type: 'FACE_DETECTION' },
          { type: 'LOGO_DETECTION' },
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'IMAGE_PROPERTIES' }
        ]
      });
      
      // Extract text if present
      const extractedText = visionResult.fullTextAnnotation?.text || '';
      if (extractedText) {
        const textAnalysis = await this.analyzeText(extractedText);
        analysis.findings.push(...textAnalysis.findings);
      }
      
      // Analyze labels (objects in image)
      const labels = visionResult.labelAnnotations || [];
      if (labels.length > 0) {
        analysis.findings.push({
          type: 'OBJECTS_DETECTED',
          description: `Objects detected: ${labels.map(l => l.description).join(', ')}`,
          confidence: labels[0].score || 0.5,
          impact: 'LOW'
        });
      }
      
      // Check for faces (privacy concern)
      const faces = visionResult.faceAnnotations || [];
      if (faces.length > 0) {
        analysis.redFlags.push({
          type: 'FACE_DETECTED',
          severity: 'MEDIUM',
          description: `${faces.length} face(s) detected in evidence`,
          confidence: 0.95
        });
      }
      
      // Detect if image is screenshot
      if (await this.isScreenshot(imageUrl)) {
        analysis.redFlags.push({
          type: 'SCREENSHOT_DETECTED',
          severity: 'LOW',
          description: 'Evidence appears to be a screenshot',
          confidence: 0.76
        });
      }
      
    } catch (error) {
      console.error(`Image analysis failed: ${error.message}`);
      analysis.redFlags.push({
        type: 'ANALYSIS_ERROR',
        severity: 'MEDIUM',
        description: 'Failed to analyze image',
        confidence: 0.5
      });
    }
    
    return analysis;
  }
  
  private async analyzeReceipt(receiptUrl: string, dispute: Dispute): Promise<ReceiptAnalysis> {
    console.log(`🧾 Analyzing receipt: ${receiptUrl}`);
    
    const analysis: ReceiptAnalysis = {
      evidenceId: '',
      type: 'RECEIPT',
      findings: [],
      authenticityScore: 1.0,
      consistencyScore: 1.0,
      redFlags: []
    };
    
    try {
      // Parse receipt using OCR
      const receiptData = await this.receiptParser.parse(receiptUrl);
      
      if (!receiptData) {
        analysis.redFlags.push({
          type: 'RECEIPT_UNREADABLE',
          severity: 'MEDIUM',
          description: 'Could not extract data from receipt',
          confidence: 0.85
        });
        return analysis;
      }
      
      // Check receipt details against transaction
      analysis.findings.push({
        type: 'RECEIPT_AMOUNT',
        description: `Receipt shows $${receiptData.totalAmount}`,
        confidence: receiptData.confidence,
        impact: 'MEDIUM'
      });
      
      // Verify amount matches dispute
      if (receiptData.totalAmount) {
        const amountDiff = Math.abs(receiptData.totalAmount - dispute.amount);
        if (amountDiff > 0.01) {
          analysis.redFlags.push({
            type: 'AMOUNT_MISMATCH',
            severity: 'HIGH',
            description: `Receipt shows $${receiptData.totalAmount}, dispute is for $${dispute.amount}`,
            confidence: 1.0
          });
          analysis.consistencyScore *= 0.3;
        }
      }
      
      // Check date
      if (receiptData.date) {
        const receiptDate = new Date(receiptData.date);
        const transactionDate = new Date(dispute.transaction.createdAt);
        const dayDiff = Math.abs((receiptDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff > 1) {
          analysis.redFlags.push({
            type: 'DATE_MISMATCH',
            severity: 'MEDIUM',
            description: `Receipt date differs by ${dayDiff.toFixed(1)} days`,
            confidence: 0.9
          });
        }
      }
      
      // Check merchant name
      if (receiptData.merchantName) {
        const merchantMatch = this.compareMerchantNames(receiptData.merchantName, dispute.merchantUsername);
        if (merchantMatch.confidence < 0.7) {
          analysis.redFlags.push({
            type: 'MERCHANT_MISMATCH',
            severity: 'HIGH',
            description: `Receipt shows "${receiptData.merchantName}" not "${dispute.merchantUsername}"`,
            confidence: merchantMatch.confidence
          });
        }
      }
      
    } catch (error) {
      console.error(`Receipt analysis failed: ${error.message}`);
      analysis.redFlags.push({
        type: 'ANALYSIS_ERROR',
        severity: 'MEDIUM',
        description: 'Failed to analyze receipt',
        confidence: 0.5
      });
    }
    
    return analysis;
  }
  
  private async analyzeText(text: string): Promise<TextAnalysis> {
    const analysis: TextAnalysis = {
      evidenceId: '',
      type: 'TEXT',
      findings: [],
      sentiment: await this.sentimentAnalyzer.analyze(text)
    };
    
    // Extract topics
    const topics = await this.nlpModel.extractTopics(text);
    if (topics.length > 0) {
      analysis.findings.push({
        type: 'TOPICS_DETECTED',
        description: `Topics: ${topics.join(', ')}`,
        confidence: 0.8,
        impact: 'LOW'
      });
    }
    
    // Check for aggressive language
    if (this.containsAggressiveLanguage(text)) {
      analysis.findings.push({
        type: 'AGGRESSIVE_LANGUAGE',
        description: 'Aggressive language detected',
        confidence: 0.88,
        impact: 'MEDIUM'
      });
    }
    
    return analysis;
  }
  
  private async analyzePDF(pdfUrl: string): Promise<EvidenceAnalysis> {
    const analysis: EvidenceAnalysis = {
      evidenceId: '',
      type: 'PDF',
      findings: [],
      authenticityScore: 1.0,
      redFlags: []
    };
    
    // Mock PDF analysis
    analysis.findings.push({
      type: 'PDF_ANALYZED',
      description: 'PDF document processed',
      confidence: 0.9,
      impact: 'LOW'
    });
    
    return analysis;
  }
  
  private async analyzeChatMessages(messages: DisputeMessage[]): Promise<ChatAnalysis> {
    const analysis: ChatAnalysis = {
      sentimentTrend: [],
      keyTopics: [],
      urgencyLevel: 'LOW',
      redFlags: []
    };
    
    try {
      // Analyze sentiment over time
      const sentiments = await Promise.all(
        messages.map(msg => this.sentimentAnalyzer.analyze(msg.content))
      );
      
      analysis.sentimentTrend = sentiments.map(s => s.score);
      
      // Extract key topics using NLP
      const allText = messages.map(m => m.content).join(' ');
      const topics = await this.nlpModel.extractTopics(allText);
      analysis.keyTopics = topics.slice(0, 5);
      
      // Check for aggressive language
      const aggressiveMessages = messages.filter(msg => 
        this.containsAggressiveLanguage(msg.content)
      );
      
      if (aggressiveMessages.length > 0) {
        analysis.redFlags.push({
          type: 'AGGRESSIVE_LANGUAGE',
          severity: 'MEDIUM',
          description: `${aggressiveMessages.length} messages contain aggressive language`,
          confidence: 0.88
        });
        analysis.urgencyLevel = 'HIGH';
      }
      
      // Check for threats
      const threatMessages = messages.filter(msg => 
        this.containsThreats(msg.content)
      );
      
      if (threatMessages.length > 0) {
        analysis.redFlags.push({
          type: 'THREATS_DETECTED',
          severity: 'HIGH',
          description: 'Customer made threats in messages',
          confidence: 0.92
        });
        analysis.urgencyLevel = 'CRITICAL';
      }
      
    } catch (error) {
      console.error(`Chat analysis failed: ${error.message}`);
    }
    
    return analysis;
  }
  
  private async analyzeTransactionPattern(transaction: Transaction): Promise<TransactionAnalysis> {
    const analysis: TransactionAnalysis = {
      isUnusual: false,
      redFlags: [],
      patterns: []
    };
    
    // Mock transaction analysis
    if (transaction.amount > 1000) {
      analysis.isUnusual = true;
      analysis.redFlags.push({
        type: 'HIGH_AMOUNT',
        severity: 'MEDIUM',
        description: `Unusually high transaction amount: $${transaction.amount}`,
        confidence: 0.75
      });
    }
    
    return analysis;
  }
  
  private async calculateRiskScore(analysis: CombinedAnalysis): Promise<number> {
    let riskScore = 0.5; // Start at neutral
    
    // Adjust based on evidence authenticity
    const avgAuthenticity = analysis.evidenceAnalyses.reduce(
      (sum, e) => sum + (e.authenticityScore || 1), 0
    ) / analysis.evidenceAnalyses.length || 1;
    
    riskScore += (1 - avgAuthenticity) * 0.3;
    
    // Adjust based on red flags
    const allRedFlags = [
      ...analysis.evidenceAnalyses.flatMap(e => e.redFlags),
      ...analysis.chatAnalysis.redFlags,
      ...analysis.transactionAnalysis.redFlags
    ];
    
    const flagWeights = {
      LOW: 0.1,
      MEDIUM: 0.3,
      HIGH: 0.6,
      CRITICAL: 0.9
    };
    
    for (const flag of allRedFlags) {
      riskScore += flagWeights[flag.severity] * flag.confidence;
    }
    
    // Adjust based on customer history
    if (analysis.customerHistory.disputeCount > 3) {
      riskScore += 0.2;
    }
    
    if (analysis.customerHistory.winRate < 0.3) {
      riskScore += 0.15;
    }
    
    // Adjust based on transaction pattern
    if (analysis.transactionAnalysis.isUnusual) {
      riskScore += 0.25;
    }
    
    // Adjust based on chat sentiment
    const avgSentiment = analysis.chatAnalysis.sentimentTrend.length > 0
      ? analysis.chatAnalysis.sentimentTrend.reduce((a, b) => a + b, 0) / 
        analysis.chatAnalysis.sentimentTrend.length
      : 0;
    
    if (avgSentiment < -0.7) {
      riskScore += 0.2;
    }
    
    // Cap between 0 and 1
    return Math.min(Math.max(riskScore, 0), 1);
  }
  
  private async generateRecommendations(
    analysis: CombinedAnalysis, 
    riskScore: number
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    
    // High risk disputes
    if (riskScore > 0.7) {
      recommendations.push({
        type: 'ACTION',
        priority: 'HIGH',
        title: 'Escalate to Venmo',
        description: 'High risk of fraudulent dispute',
        confidence: 0.85,
        actions: ['ESCALATE_TO_VENMO', 'REQUEST_MORE_EVIDENCE'],
        reasoning: `Risk score of ${(riskScore * 100).toFixed(1)}% based on ${analysis.evidenceAnalyses.length} evidence items and ${analysis.chatAnalysis.redFlags.length} red flags` 
      });
    }
    
    // Evidence issues
    const lowAuthenticityEvidence = analysis.evidenceAnalyses.filter(
      e => (e.authenticityScore || 1) < 0.5
    );
    
    if (lowAuthenticityEvidence.length > 0) {
      recommendations.push({
        type: 'EVIDENCE',
        priority: 'MEDIUM',
        title: 'Request Original Evidence',
        description: `${lowAuthenticityEvidence.length} evidence items show signs of tampering`,
        confidence: 0.78,
        actions: ['REQUEST_ORIGINAL_EVIDENCE'],
        reasoning: 'Digital tampering detected in uploaded evidence'
      });
    }
    
    // Chat issues
    if (analysis.chatAnalysis.redFlags.some(f => f.type === 'THREATS_DETECTED')) {
      recommendations.push({
        type: 'COMMUNICATION',
        priority: 'HIGH',
        title: 'Monitor Communication',
        description: 'Threatening language detected in messages',
        confidence: 0.92,
        actions: ['RESTRICT_COMMUNICATION', 'NOTIFY_SECURITY'],
        reasoning: 'Customer made threats in dispute chat'
      });
    }
    
    // Merchant-favoring evidence
    if (riskScore < 0.3 && analysis.evidenceAnalyses.some(e => (e.consistencyScore || 1) > 0.8)) {
      recommendations.push({
        type: 'RESOLUTION',
        priority: 'LOW',
        title: 'Rule in Merchant Favor',
        description: 'Strong evidence supports merchant position',
        confidence: 0.88,
        actions: ['APPROVE_MERCHANT', 'DENY_CUSTOMER'],
        reasoning: 'Evidence consistency score above 80%'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  private async detectPatterns(analysis: CombinedAnalysis): Promise<DisputePattern[]> {
    return await this.patternRecognizer.detectPatterns(analysis);
  }
  
  private calculateConfidence(analysis: CombinedAnalysis): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on evidence quality
    const avgAuthenticity = analysis.evidenceAnalyses.reduce(
      (sum, e) => sum + (e.authenticityScore || 1), 0
    ) / analysis.evidenceAnalyses.length || 1;
    
    confidence *= avgAuthenticity;
    
    // Adjust based on analysis completeness
    if (analysis.evidenceAnalyses.length === 0) confidence *= 0.5;
    if (analysis.chatAnalysis.sentimentTrend.length === 0) confidence *= 0.9;
    
    return Math.min(Math.max(confidence, 0), 1);
  }
  
  private summarizeEvidence(evidenceAnalyses: EvidenceAnalysis[]): EvidenceSummary {
    const totalItems = evidenceAnalyses.length;
    const avgAuthenticity = evidenceAnalyses.reduce(
      (sum, e) => sum + (e.authenticityScore || 1), 0
    ) / totalItems || 1;
    
    const avgConsistency = evidenceAnalyses.reduce(
      (sum, e) => sum + (e.consistencyScore || 1), 0
    ) / totalItems || 1;
    
    const redFlagCount = evidenceAnalyses.reduce(
      (sum, e) => sum + e.redFlags.length, 0
    );
    
    const keyEvidence = evidenceAnalyses
      .filter(e => e.authenticityScore > 0.8)
      .map(e => e.type)
      .slice(0, 5);
    
    return {
      totalItems,
      authenticityScore: avgAuthenticity,
      consistencyScore: avgConsistency,
      redFlagCount,
      keyEvidence
    };
  }
  
  private extractKeyFindings(analysis: CombinedAnalysis): KeyFinding[] {
    const findings: KeyFinding[] = [];
    
    // Extract from evidence analyses
    analysis.evidenceAnalyses.forEach(evidence => {
      findings.push(...evidence.findings);
    });
    
    // Extract high-impact findings
    return findings
      .filter(f => f.impact === 'HIGH' || f.impact === 'CRITICAL')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }
  
  private generateExplanation(analysis: CombinedAnalysis, riskScore: number): ExplainabilityReport {
    const riskFactors: RiskFactor[] = [
      {
        factor: 'Evidence Authenticity',
        weight: 0.3,
        contribution: (1 - this.calculateAverageAuthenticity(analysis.evidenceAnalyses)) * 0.3,
        description: 'Quality and authenticity of uploaded evidence'
      },
      {
        factor: 'Customer History',
        weight: 0.2,
        contribution: analysis.customerHistory.disputeCount > 3 ? 0.2 : 0,
        description: 'Customer\'s past dispute behavior'
      },
      {
        factor: 'Communication Pattern',
        weight: 0.2,
        contribution: analysis.chatAnalysis.urgencyLevel === 'HIGH' ? 0.2 : 0.1,
        description: 'Tone and content of dispute communications'
      },
      {
        factor: 'Red Flags',
        weight: 0.3,
        contribution: this.calculateRedFlagImpact(analysis),
        description: 'Number and severity of detected issues'
      }
    ];
    
    return {
      riskFactors,
      evidenceWeight: this.calculateEvidenceWeights(analysis),
      modelConfidence: this.calculateConfidence(analysis),
      processingSteps: [
        { step: 'Evidence Analysis', duration: 2000, result: 'Completed', confidence: 0.9 },
        { step: 'Chat Analysis', duration: 500, result: 'Completed', confidence: 0.85 },
        { step: 'Pattern Detection', duration: 1000, result: 'Completed', confidence: 0.88 },
        { step: 'Risk Scoring', duration: 300, result: 'Completed', confidence: 0.89 }
      ]
    };
  }
  
  // Helper methods
  private async checkForTampering(evidence: Evidence): Promise<boolean> {
    // Mock tampering detection
    return evidence.url.includes('tampered');
  }
  
  private async isScreenshot(imageUrl: string): Promise<boolean> {
    // Mock screenshot detection
    return imageUrl.includes('screenshot');
  }
  
  private compareMerchantNames(receiptName: string, merchantName: string): { confidence: number } {
    // Simple string similarity
    const similarity = this.stringSimilarity(receiptName.toLowerCase(), merchantName.toLowerCase());
    return { confidence: similarity };
  }
  
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private containsAggressiveLanguage(text: string): boolean {
    const aggressiveWords = ['angry', 'furious', 'enraged', 'outraged', 'infuriated'];
    return aggressiveWords.some(word => text.toLowerCase().includes(word));
  }
  
  private containsThreats(text: string): boolean {
    const threatWords = ['sue', 'lawsuit', 'legal', 'court', 'attorney', 'police'];
    return threatWords.some(word => text.toLowerCase().includes(word));
  }
  
  private calculateAverageAuthenticity(evidenceAnalyses: EvidenceAnalysis[]): number {
    if (evidenceAnalyses.length === 0) return 1.0;
    return evidenceAnalyses.reduce((sum, e) => sum + (e.authenticityScore || 1), 0) / evidenceAnalyses.length;
  }
  
  private calculateRedFlagImpact(analysis: CombinedAnalysis): number {
    const allRedFlags = [
      ...analysis.evidenceAnalyses.flatMap(e => e.redFlags),
      ...analysis.chatAnalysis.redFlags,
      ...analysis.transactionAnalysis.redFlags
    ];
    
    const flagWeights = { LOW: 0.1, MEDIUM: 0.3, HIGH: 0.6, CRITICAL: 0.9 };
    
    return allRedFlags.reduce((sum, flag) => sum + (flagWeights[flag.severity] * flag.confidence), 0);
  }
  
  private calculateEvidenceWeights(analysis: CombinedAnalysis): EvidenceWeight[] {
    return analysis.evidenceAnalyses.map(evidence => ({
      evidenceId: evidence.evidenceId,
      weight: evidence.authenticityScore || 1.0,
      impact: evidence.authenticityScore > 0.7 ? 'POSITIVE' : 
              evidence.authenticityScore < 0.5 ? 'NEGATIVE' : 'NEUTRAL',
      reasoning: `Based on authenticity score of ${(evidence.authenticityScore || 1).toFixed(2)}`
    }));
  }
  
  // Mock methods for history
  private async getCustomerHistory(customerId: string): Promise<CustomerHistory> {
    return {
      customerId,
      disputeCount: 2,
      winRate: 0.6,
      averageDisputeAmount: 45.50,
      riskLevel: 'MEDIUM'
    };
  }
  
  private async getMerchantHistory(merchantId: string): Promise<MerchantHistory> {
    return {
      merchantId,
      totalDisputes: 15,
      winRate: 0.75,
      averageResponseTime: 2.5, // hours
      riskLevel: 'LOW'
    };
  }
}
