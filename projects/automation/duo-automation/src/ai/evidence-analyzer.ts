// src/ai/evidence-analyzer.ts
/**
 * 🤖 AI Evidence Analyzer - Multi-modal Evidence Analysis System
 * 
 * [DOMAIN: financial-tech][SCOPE: dispute-resolution][TYPE: ai-engine]
 * [META: {AI, SECURE, SCALABLE}][CLASS: evidence-analysis]
 */

import { BunNativeAIAnalyzer, Evidence, EvidenceAnalysis } from "./bun-native-ai-analyzer.ts";

// ============================================================================
// EXTENDED TYPE DEFINITIONS
// ============================================================================

export interface Dispute {
  id: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: string;
  reason: string;
  description: string;
  status: string;
  evidenceUrls: string[];
  messages: DisputeMessage[];
  transaction: Transaction;
  createdAt: Date;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM';
  content: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  createdAt: Date;
  merchantId: string;
  customerId: string;
  status: string;
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

export interface CombinedAnalysis {
  dispute: Dispute;
  evidenceAnalyses: EvidenceAnalysis[];
  chatAnalysis: ChatAnalysis;
  transactionAnalysis: TransactionAnalysis;
  customerHistory: CustomerHistory;
  merchantHistory: MerchantHistory;
}

export interface ChatAnalysis {
  sentimentTrend: number[];
  keyTopics: string[];
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  redFlags: ChatRedFlag[];
  messages: {
    count: number;
    averageLength: number;
    responseTime: number;
  };
}

export interface ChatRedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
  messageId?: string;
}

export interface TransactionAnalysis {
  isUnusual: boolean;
  riskFactors: string[];
  patterns: string[];
  redFlags: TransactionRedFlag[];
}

export interface TransactionRedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

export interface CustomerHistory {
  disputeCount: number;
  winRate: number;
  averageDisputeAmount: number;
  reasons: string[];
  patterns: string[];
  riskScore: number;
}

export interface MerchantHistory {
  totalTransactions: number;
  totalVolume: number;
  disputeRate: number;
  winRate: number;
  averageTransactionAmount: number;
}

export interface ImageAnalysis {
  findings: ImageFinding[];
  authenticityScore: number;
  redFlags: ImageRedFlag[];
  metadata: ImageMetadata;
}

export interface ImageFinding {
  type: string;
  value: string;
  confidence: number;
}

export interface ImageRedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace: string;
  fileSize: number;
  compression?: string;
}

export interface ReceiptAnalysis {
  findings: ReceiptFinding[];
  authenticityScore: number;
  consistencyScore: number;
  redFlags: ReceiptRedFlag[];
  parsedData?: ReceiptData;
}

export interface ReceiptFinding {
  type: string;
  value: string;
  confidence: number;
}

export interface ReceiptRedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

export interface ReceiptData {
  merchantName: string;
  totalAmount: number;
  date: string;
  items: ReceiptItem[];
  tax: number;
  confidence: number;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface TextAnalysis {
  findings: TextFinding[];
  sentiment: SentimentAnalysis;
  entities: TextEntity[];
  redFlags: TextRedFlag[];
}

export interface TextFinding {
  type: string;
  value: string;
  confidence: number;
}

export interface SentimentAnalysis {
  score: number;
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
}

export interface TextEntity {
  text: string;
  type: string;
  confidence: number;
}

export interface TextRedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number;
}

// ============================================================================
// AI EVIDENCE ANALYZER
// ============================================================================

export class AIEvidenceAnalyzer {
  private visionModel: VisionAI;
  private nlpModel: NLPProcessor;
  private fraudDetector: FraudDetectionModel;
  private patternRecognizer: PatternRecognition;
  private receiptParser: ReceiptParser;
  private sentimentAnalyzer: SentimentAnalyzer;
  private bunAIAnalyzer: BunNativeAIAnalyzer;

  constructor() {
    this.visionModel = new GoogleVisionAI();
    this.nlpModel = new OpenAIProcessor();
    this.fraudDetector = new FraudDetectionModel();
    this.patternRecognizer = new PatternRecognition();
    this.receiptParser = new ReceiptParser();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.bunAIAnalyzer = new BunNativeAIAnalyzer();
  }

  async analyzeDispute(dispute: Dispute): Promise<AIAnalysis> {
    console.log(`🤖 Starting AI analysis for dispute ${dispute.id}`);
    const startTime = Date.now();

    try {
      // Parallel analysis of all evidence
      const analysisTasks = dispute.evidenceUrls.map((url, index) => 
        this.analyzeEvidence({
          id: `ev-${index}`,
          disputeId: dispute.id,
          type: this.inferEvidenceType(url),
          filename: url.split('/').pop() || 'unknown',
          url,
          mimeType: this.inferMimeType(url),
          size: 0, // Would be determined in real implementation
          uploadedBy: 'CUSTOMER'
        }, dispute)
      );

      const evidenceAnalyses = await Promise.all(analysisTasks);

      // Analyze chat messages
      const chatAnalysis = await this.analyzeChatMessages(dispute.messages);

      // Analyze transaction pattern
      const transactionAnalysis = await this.analyzeTransactionPattern(dispute.transaction);

      // Get customer and merchant history
      const customerHistory = await this.getCustomerHistory(dispute.customerId);
      const merchantHistory = await this.getMerchantHistory(dispute.merchantId);

      // Combine all analyses
      const combinedAnalysis: CombinedAnalysis = {
        dispute,
        evidenceAnalyses,
        chatAnalysis,
        transactionAnalysis,
        customerHistory,
        merchantHistory
      };

      // Generate risk score and recommendations
      const riskScore = await this.calculateRiskScore(combinedAnalysis);
      const recommendations = await this.generateRecommendations(combinedAnalysis, riskScore);
      const patterns = await this.detectPatterns(combinedAnalysis);

      const aiAnalysis: AIAnalysis = {
        disputeId: dispute.id,
        timestamp: new Date(),
        riskScore,
        confidence: this.calculateConfidence(combinedAnalysis),
        evidenceSummary: this.summarizeEvidence(evidenceAnalyses),
        keyFindings: this.extractKeyFindings(combinedAnalysis),
        recommendations,
        patterns,
        fraudIndicators: await this.detectFraudIndicators(combinedAnalysis),
        explainability: this.generateExplanation(combinedAnalysis, riskScore),
        metadata: {
          modelVersion: '2.3.1',
          processingTime: Date.now() - startTime,
          analyzedItems: evidenceAnalyses.length + chatAnalysis.messages.count
        }
      };

      console.log(`✅ AI analysis completed for dispute ${dispute.id} in ${Date.now() - startTime}ms`);
      return aiAnalysis;

    } catch (error) {
      console.error(`❌ AI analysis failed for dispute ${dispute.id}:`, error);
      throw error;
    }
  }

  private async analyzeEvidence(evidence: Evidence, dispute: Dispute): Promise<EvidenceAnalysis> {
    const analysis: EvidenceAnalysis = {
      evidenceId: evidence.id,
      type: evidence.type,
      findings: [],
      authenticityScore: 1.0,
      consistencyScore: 1.0,
      redFlags: []
    };

    switch (evidence.type) {
      case 'IMAGE':
        const imageAnalysis = await this.analyzeImage(evidence.url);
        analysis.findings.push(...imageAnalysis.findings.map(f => ({
          type: f.type,
          value: f.value,
          confidence: f.confidence
        })));
        analysis.authenticityScore = imageAnalysis.authenticityScore;
        analysis.redFlags.push(...imageAnalysis.redFlags.map(r => ({
          type: r.type,
          severity: r.severity,
          description: r.description,
          confidence: r.confidence
        })));
        break;

      case 'RECEIPT':
        const receiptAnalysis = await this.analyzeReceipt(evidence.url, dispute);
        analysis.findings.push(...receiptAnalysis.findings.map(f => ({
          type: f.type,
          value: f.value,
          confidence: f.confidence
        })));
        analysis.authenticityScore = receiptAnalysis.authenticityScore;
        analysis.consistencyScore = receiptAnalysis.consistencyScore;
        analysis.redFlags.push(...receiptAnalysis.redFlags.map(r => ({
          type: r.type,
          severity: r.severity,
          description: r.description,
          confidence: r.confidence
        })));
        break;

      case 'TEXT':
        const textAnalysis = await this.analyzeText(evidence.url);
        analysis.findings.push(...textAnalysis.findings.map(f => ({
          type: f.type,
          value: f.value,
          confidence: f.confidence
        })));
        analysis.sentiment = textAnalysis.sentiment;
        analysis.redFlags.push(...textAnalysis.redFlags.map(r => ({
          type: r.type,
          severity: r.severity,
          description: r.description,
          confidence: r.confidence
        })));
        break;

      case 'PDF':
        const pdfAnalysis = await this.analyzePDF(evidence.url);
        analysis.findings.push(...pdfAnalysis.findings.map(f => ({
          type: f.type,
          value: f.value,
          confidence: f.confidence
        })));
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
      findings: [],
      authenticityScore: 1.0,
      redFlags: [],
      metadata: {
        width: 0,
        height: 0,
        format: 'JPEG',
        colorSpace: 'RGB',
        fileSize: 0
      }
    };

    try {
      // Use Google Vision AI for image analysis
      const visionResult = await this.visionModel.annotateImage({
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
        const textAnalysis = await this.analyzeTextContent(extractedText);
        analysis.findings.push(...textAnalysis.findings);
      }

      // Analyze labels (objects in image)
      const labels = visionResult.labelAnnotations || [];
      if (labels.length > 0) {
        analysis.findings.push({
          type: 'OBJECTS_DETECTED',
          value: labels.map(l => l.description).join(', '),
          confidence: labels[0].score || 0.5
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

      // Check image metadata
      const metadata = visionResult.imagePropertiesAnnotation;
      if (metadata) {
        const colorAnalysis = this.analyzeColors(metadata.dominantColors);
        analysis.findings.push({
          type: 'COLOR_ANALYSIS',
          value: colorAnalysis.description,
          confidence: colorAnalysis.confidence
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

      // Calculate authenticity score based on analysis
      analysis.authenticityScore = this.calculateImageAuthenticity(analysis);

    } catch (error) {
      console.error(`❌ Image analysis failed:`, error);
      analysis.authenticityScore = 0.5;
      analysis.redFlags.push({
        type: 'ANALYSIS_FAILED',
        severity: 'MEDIUM',
        description: 'Unable to analyze image',
        confidence: 1.0
      });
    }

    return analysis;
  }

  private async analyzeReceipt(receiptUrl: string, dispute: Dispute): Promise<ReceiptAnalysis> {
    console.log(`🧾 Analyzing receipt: ${receiptUrl}`);

    const analysis: ReceiptAnalysis = {
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

      analysis.parsedData = receiptData;

      // Check receipt details against transaction
      analysis.findings.push({
        type: 'RECEIPT_AMOUNT',
        value: `$${receiptData.totalAmount}`,
        confidence: receiptData.confidence
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
        const merchantMatch = this.compareMerchantNames(receiptData.merchantName, dispute.merchantId);
        if (merchantMatch.confidence < 0.7) {
          analysis.redFlags.push({
            type: 'MERCHANT_MISMATCH',
            severity: 'HIGH',
            description: `Receipt shows "${receiptData.merchantName}" not expected merchant`,
            confidence: merchantMatch.confidence
          });
        }
      }

      // Check for receipt tampering
      const tamperingScore = await this.checkReceiptTampering(receiptUrl, receiptData);
      if (tamperingScore < 0.5) {
        analysis.redFlags.push({
          type: 'RECEIPT_TAMPERING',
          severity: 'CRITICAL',
          description: 'Signs of digital tampering detected on receipt',
          confidence: 1 - tamperingScore
        });
        analysis.authenticityScore *= tamperingScore;
      }

      // Verify receipt format
      const formatValidation = await this.validateReceiptFormat(receiptData);
      if (!formatValidation.valid) {
        analysis.redFlags.push({
          type: 'UNUSUAL_RECEIPT_FORMAT',
          severity: 'LOW',
          description: formatValidation.issue,
          confidence: 0.7
        });
      }

    } catch (error) {
      console.error(`❌ Receipt analysis failed:`, error);
      analysis.authenticityScore = 0.5;
      analysis.redFlags.push({
        type: 'ANALYSIS_FAILED',
        severity: 'MEDIUM',
        description: 'Unable to analyze receipt',
        confidence: 1.0
      });
    }

    return analysis;
  }

  private async analyzeText(textUrl: string): Promise<TextAnalysis> {
    console.log(`📝 Analyzing text: ${textUrl}`);

    const analysis: TextAnalysis = {
      findings: [],
      sentiment: { score: 0, label: 'NEUTRAL', confidence: 0.5 },
      entities: [],
      redFlags: []
    };

    try {
      // Extract text from URL/file
      const text = await this.extractTextFromUrl(textUrl);

      // Sentiment analysis
      analysis.sentiment = await this.sentimentAnalyzer.analyze(text);
      analysis.findings.push({
        type: 'SENTIMENT',
        value: `${analysis.sentiment.label} (${(analysis.sentiment.score * 100).toFixed(1)}%)`,
        confidence: analysis.sentiment.confidence
      });

      // Entity extraction
      analysis.entities = await this.nlpModel.extractEntities(text);
      if (analysis.entities.length > 0) {
        analysis.findings.push({
          type: 'ENTITIES',
          value: analysis.entities.map(e => e.text).join(', '),
          confidence: 0.8
        });
      }

      // Check for problematic language
      if (this.containsAggressiveLanguage(text)) {
        analysis.redFlags.push({
          type: 'AGGRESSIVE_LANGUAGE',
          severity: 'MEDIUM',
          description: 'Aggressive or threatening language detected',
          confidence: 0.88
        });
      }

      if (this.containsThreats(text)) {
        analysis.redFlags.push({
          type: 'THREATS_DETECTED',
          severity: 'HIGH',
          description: 'Threatening language detected',
          confidence: 0.92
        });
      }

    } catch (error) {
      console.error(`❌ Text analysis failed:`, error);
      analysis.redFlags.push({
        type: 'ANALYSIS_FAILED',
        severity: 'MEDIUM',
        description: 'Unable to analyze text',
        confidence: 1.0
      });
    }

    return analysis;
  }

  private async analyzePDF(pdfUrl: string): Promise<ImageAnalysis> {
    console.log(`📄 Analyzing PDF: ${pdfUrl}`);

    const analysis: ImageAnalysis = {
      findings: [],
      authenticityScore: 1.0,
      redFlags: [],
      metadata: {
        width: 0,
        height: 0,
        format: 'PDF',
        colorSpace: 'RGB',
        fileSize: 0
      }
    };

    try {
      // Extract text from PDF
      const text = await this.extractTextFromPDF(pdfUrl);
      
      if (text) {
        const textAnalysis = await this.analyzeTextContent(text);
        analysis.findings.push(...textAnalysis.findings);
      }

      // Check for PDF manipulation
      if (await this.checkPDFManipulation(pdfUrl)) {
        analysis.redFlags.push({
          type: 'PDF_MANIPULATION',
          severity: 'HIGH',
          description: 'Signs of PDF manipulation detected',
          confidence: 0.85
        });
        analysis.authenticityScore *= 0.4;
      }

    } catch (error) {
      console.error(`❌ PDF analysis failed:`, error);
      analysis.authenticityScore = 0.5;
      analysis.redFlags.push({
        type: 'ANALYSIS_FAILED',
        severity: 'MEDIUM',
        description: 'Unable to analyze PDF',
        confidence: 1.0
      });
    }

    return analysis;
  }

  private async analyzeChatMessages(messages: DisputeMessage[]): Promise<ChatAnalysis> {
    const analysis: ChatAnalysis = {
      sentimentTrend: [],
      keyTopics: [],
      urgencyLevel: 'LOW',
      redFlags: [],
      messages: {
        count: messages.length,
        averageLength: 0,
        responseTime: 0
      }
    };

    if (messages.length === 0) return analysis;

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

      // Calculate message statistics
      analysis.messages.averageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;

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
        analysis.urgencyLevel = 'HIGH';
      }

      // Analyze response patterns
      const responsePattern = this.analyzeResponsePatterns(messages);
      if (responsePattern === 'ESCALATING') {
        analysis.redFlags.push({
          type: 'ESCALATING_TONE',
          severity: 'MEDIUM',
          description: 'Customer tone is escalating over time',
          confidence: 0.75
        });
      }

    } catch (error) {
      console.error(`❌ Chat analysis failed:`, error);
    }

    return analysis;
  }

  private async analyzeTransactionPattern(transaction: Transaction): Promise<TransactionAnalysis> {
    const analysis: TransactionAnalysis = {
      isUnusual: false,
      riskFactors: [],
      patterns: [],
      redFlags: []
    };

    try {
      // Check for unusual transaction patterns
      if (transaction.amount > 1000) {
        analysis.redFlags.push({
          type: 'HIGH_VALUE_TRANSACTION',
          severity: 'MEDIUM',
          description: `Transaction amount ($${transaction.amount}) is unusually high`,
          confidence: 0.9
        });
        analysis.isUnusual = true;
      }

      // Check timing patterns
      const hoursSinceTransaction = (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceTransaction < 1) {
        analysis.redFlags.push({
          type: 'IMMEDIATE_DISPUTE',
          severity: 'MEDIUM',
          description: `Dispute filed within ${hoursSinceTransaction.toFixed(1)} hours of transaction`,
          confidence: 0.75
        });
      }

    } catch (error) {
      console.error(`❌ Transaction analysis failed:`, error);
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
      ...analysis.evidenceAnalyses.flatMap(e => e.redFlags || []),
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
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // High risk disputes
    if (riskScore > 0.7) {
      recommendations.push('ESCALATE_TO_VENMO');
      recommendations.push('REQUEST_MORE_EVIDENCE');
    }

    // Evidence issues
    const lowAuthenticityEvidence = analysis.evidenceAnalyses.filter(
      e => (e.authenticityScore || 1) < 0.5
    );

    if (lowAuthenticityEvidence.length > 0) {
      recommendations.push('REQUEST_ORIGINAL_EVIDENCE');
    }

    // Chat issues
    if (analysis.chatAnalysis.redFlags.some(f => f.type === 'THREATS_DETECTED')) {
      recommendations.push('RESTRICT_COMMUNICATION');
      recommendations.push('NOTIFY_SECURITY');
    }

    // Merchant-favoring evidence
    if (riskScore < 0.3 && analysis.evidenceAnalyses.some(e => (e.consistencyScore || 1) > 0.8)) {
      recommendations.push('APPROVE_MERCHANT');
      recommendations.push('DENY_CUSTOMER');
    }

    // Compromise recommendations
    if (riskScore >= 0.3 && riskScore <= 0.7) {
      recommendations.push('OFFER_50_PERCENT_REFUND');
      recommendations.push('PROPOSE_EXCHANGE');
    }

    return recommendations;
  }

  private async detectPatterns(analysis: CombinedAnalysis): Promise<string[]> {
    const patterns: string[] = [];

    // Check for common fraud patterns
    if (analysis.customerHistory.disputeCount > 5) {
      patterns.push('FREQUENT_DISPUTER');
    }

    // Check for timing patterns
    if (analysis.transaction && analysis.transaction.createdAt) {
      const hoursToDispute = (analysis.dispute.createdAt.getTime() - 
        analysis.transaction.createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursToDispute < 1) {
        patterns.push('IMMEDIATE_DISPUTE');
      }
    }

    // Check for amount patterns
    if (analysis.dispute.amount > 1000) {
      patterns.push('HIGH_VALUE_DISPUTE');
    }

    return patterns;
  }

  private async detectFraudIndicators(analysis: CombinedAnalysis): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    // Evidence tampering
    const tamperingFlags = analysis.evidenceAnalyses.flatMap(e => 
      (e.redFlags || []).filter(f => f.type.includes('TAMPERING') || f.type.includes('MANIPULATION'))
    );

    for (const flag of tamperingFlags) {
      indicators.push({
        type: flag.type,
        severity: flag.severity,
        description: flag.description,
        confidence: flag.confidence
      });
    }

    // Customer behavior patterns
    if (analysis.customerHistory.disputeCount > 3 && analysis.customerHistory.winRate < 0.3) {
      indicators.push({
        type: 'SUSPICIOUS_CUSTOMER_PATTERN',
        severity: 'HIGH',
        description: `Customer has ${analysis.customerHistory.disputeCount} disputes with ${analysis.customerHistory.winRate * 100}% win rate`,
        confidence: 0.85
      });
    }

    return indicators;
  }

  private generateExplanation(analysis: CombinedAnalysis, riskScore: number): Explainability {
    const riskFactors: RiskFactor[] = [];
    const evidenceWeight: EvidenceWeight[] = [];

    // Evidence factors
    analysis.evidenceAnalyses.forEach((evidence, index) => {
      const authenticity = evidence.authenticityScore || 1;
      evidenceWeight.push({
        evidenceId: evidence.evidenceId,
        weight: authenticity,
        reasoning: `Evidence ${index + 1} authenticity score: ${(authenticity * 100).toFixed(1)}%`
      });

      if (authenticity < 0.7) {
        riskFactors.push({
          factor: `Low authenticity evidence ${index + 1}`,
          weight: 1 - authenticity,
          impact: 'NEGATIVE',
          description: `Evidence shows signs of manipulation or inconsistency`
        });
      }
    });

    // Customer history factors
    if (analysis.customerHistory.disputeCount > 3) {
      riskFactors.push({
        factor: 'Frequent disputing',
        weight: 0.2,
        impact: 'NEGATIVE',
        description: `Customer has filed ${analysis.customerHistory.disputeCount} disputes`
      });
    }

    const reasoning = `Risk score of ${(riskScore * 100).toFixed(1)}% based on ${analysis.evidenceAnalyses.length} evidence items, ${analysis.chatAnalysis.redFlags.length} chat red flags, and customer history patterns.`;

    return {
      riskFactors,
      evidenceWeight,
      reasoning
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private inferEvidenceType(url: string): Evidence['type'] {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'IMAGE';
      case 'pdf':
        return url.toLowerCase().includes('receipt') ? 'RECEIPT' : 'PDF';
      case 'txt':
      case 'md':
        return 'TEXT';
      default:
        return 'IMAGE';
    }
  }

  private inferMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'md': 'text/markdown'
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  private async checkForTampering(evidence: Evidence): Promise<boolean> {
    // In a real implementation, this would use sophisticated image analysis
    // For now, return false (no tampering detected)
    return false;
  }

  private async isScreenshot(imageUrl: string): Promise<boolean> {
    // In a real implementation, this would analyze image characteristics
    // For now, return false (not a screenshot)
    return false;
  }

  private calculateImageAuthenticity(analysis: ImageAnalysis): number {
    let score = 1.0;

    // Reduce score based on red flags
    for (const flag of analysis.redFlags) {
      const penalty = {
        LOW: 0.1,
        MEDIUM: 0.2,
        HIGH: 0.4,
        CRITICAL: 0.6
      }[flag.severity];
      
      score *= (1 - penalty * flag.confidence);
    }

    return Math.max(score, 0);
  }

  private compareMerchantNames(receiptName: string, merchantId: string): { confidence: number } {
    // In a real implementation, this would use fuzzy matching
    // For now, return a moderate confidence
    return { confidence: 0.8 };
  }

  private async checkReceiptTampering(receiptUrl: string, receiptData: ReceiptData): Promise<number> {
    // In a real implementation, this would analyze the receipt for manipulation
    // For now, return 1.0 (no tampering)
    return 1.0;
  }

  private async validateReceiptFormat(receiptData: ReceiptData): Promise<{ valid: boolean; issue?: string }> {
    // Basic validation
    if (!receiptData.merchantName || !receiptData.totalAmount || !receiptData.date) {
      return { valid: false, issue: 'Missing required receipt fields' };
    }
    return { valid: true };
  }

  private containsAggressiveLanguage(text: string): boolean {
    const aggressiveWords = ['angry', 'furious', 'outrageded', 'livid', 'enraged'];
    return aggressiveWords.some(word => text.toLowerCase().includes(word));
  }

  private containsThreats(text: string): boolean {
    const threatWords = ['sue', 'lawsuit', 'lawyer', 'legal action', 'report', 'complaint'];
    return threatWords.some(word => text.toLowerCase().includes(word));
  }

  private analyzeResponsePatterns(messages: DisputeMessage[]): 'NORMAL' | 'ESCALATING' | 'DE_ESCALATING' {
    if (messages.length < 3) return 'NORMAL';

    // Simple escalation detection based on message length and sentiment
    const recentMessages = messages.slice(-3);
    const avgLength = recentMessages.reduce((sum, m) => sum + m.content.length, 0) / recentMessages.length;
    
    if (avgLength > 200) return 'ESCALATING';
    return 'NORMAL';
  }

  private async extractTextFromUrl(url: string): Promise<string> {
    // In a real implementation, this would download and extract text
    // For now, return sample text
    return 'Sample text content for analysis';
  }

  private async extractTextFromPDF(pdfUrl: string): Promise<string> {
    // In a real implementation, this would use PDF parsing library
    // For now, return sample text
    return 'Sample PDF content for analysis';
  }

  private async analyzeTextContent(text: string): Promise<TextAnalysis> {
    return {
      findings: [
        {
          type: 'TEXT_LENGTH',
          value: `${text.length} characters`,
          confidence: 1.0
        }
      ],
      sentiment: await this.sentimentAnalyzer.analyze(text),
      entities: await this.nlpModel.extractEntities(text),
      redFlags: []
    };
  }

  private async checkPDFManipulation(pdfUrl: string): Promise<boolean> {
    // In a real implementation, this would analyze PDF for manipulation
    // For now, return false (no manipulation)
    return false;
  }

  private analyzeColors(dominantColors: any): { description: string; confidence: number } {
    // In a real implementation, this would analyze color distribution
    return { description: 'Normal color distribution', confidence: 0.8 };
  }

  private calculateConfidence(analysis: CombinedAnalysis): number {
    // Calculate overall confidence based on available data
    let confidence = 0.5;

    if (analysis.evidenceAnalyses.length > 0) {
      const avgEvidenceConfidence = analysis.evidenceAnalyses.reduce((sum, e) => {
        return sum + (e.authenticityScore || 0.5);
      }, 0) / analysis.evidenceAnalyses.length;
      confidence += avgEvidenceConfidence * 0.3;
    }

    if (analysis.chatAnalysis.messages.count > 0) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private summarizeEvidence(evidenceAnalyses: EvidenceAnalysis[]): string {
    const totalEvidence = evidenceAnalyses.length;
    const authenticEvidence = evidenceAnalyses.filter(e => (e.authenticityScore || 0) > 0.7).length;
    const redFlags = evidenceAnalyses.reduce((sum, e) => sum + (e.redFlags?.length || 0), 0);

    return `Analyzed ${totalEvidence} evidence items. ${authenticEvidence} appear authentic. ${redFlags} red flags detected.`;
  }

  private extractKeyFindings(analysis: CombinedAnalysis): string[] {
    const findings: string[] = [];

    // Evidence findings
    const highRiskEvidence = analysis.evidenceAnalyses.filter(e => (e.authenticityScore || 1) < 0.5);
    if (highRiskEvidence.length > 0) {
      findings.push(`${highRiskEvidence.length} evidence items show signs of manipulation`);
    }

    // Chat findings
    if (analysis.chatAnalysis.urgencyLevel === 'HIGH') {
      findings.push('Customer communication shows high urgency/aggression');
    }

    // Transaction findings
    if (analysis.transactionAnalysis.isUnusual) {
      findings.push('Transaction pattern is unusual for this merchant');
    }

    // Customer history findings
    if (analysis.customerHistory.disputeCount > 3) {
      findings.push(`Customer has filed ${analysis.customerHistory.disputeCount} previous disputes`);
    }

    return findings;
  }

  private async getCustomerHistory(customerId: string): Promise<CustomerHistory> {
    // In a real implementation, this would query the database
    return {
      disputeCount: 2,
      winRate: 0.5,
      averageDisputeAmount: 50.0,
      reasons: ['product_not_received', 'damaged_goods'],
      patterns: ['occasional_disputer'],
      riskScore: 0.4
    };
  }

  private async getMerchantHistory(merchantId: string): Promise<MerchantHistory> {
    // In a real implementation, this would query the database
    return {
      totalTransactions: 1250,
      totalVolume: 45670.50,
      disputeRate: 2.4,
      winRate: 75.0,
      averageTransactionAmount: 36.54
    };
  }
}

// ============================================================================
// MOCK IMPLEMENTATIONS (for demonstration)
// ============================================================================

class GoogleVisionAI {
  async annotateImage(request: any): Promise<any> {
    // Mock implementation
    return {
      fullTextAnnotation: { text: 'Sample extracted text' },
      labelAnnotations: [
        { description: 'receipt', score: 0.9 },
        { description: 'document', score: 0.8 }
      ],
      faceAnnotations: [],
      imagePropertiesAnnotation: {
        dominantantColors: []
      }
    };
  }
}

class OpenAIProcessor {
  async extractTopics(text: string): Promise<string[]> {
    // Mock implementation
    return ['product', 'service', 'quality', 'delivery', 'price'];
  }

  async extractEntities(text: string): Promise<any[]> {
    // Mock implementation
    return [
      { text: 'product', type: 'PRODUCT', confidence: 0.9 },
      { text: 'merchant', type: 'ORGANIZATION', confidence: 0.8 }
    ];
  }
}

class FraudDetectionModel {
  // Mock implementation
}

class PatternRecognition {
  // Mock implementation
}

class ReceiptParser {
  async parse(receiptUrl: string): Promise<ReceiptData | null> {
    // Mock implementation
    return {
      merchantName: 'Sample Store',
      totalAmount: 25.50,
      date: '2024-01-15',
      items: [
        { name: 'Coffee', quantity: 2, price: 12.75 }
      ],
      tax: 2.55,
      confidence: 0.9
    };
  }
}

class SentimentAnalyzer {
  async analyze(text: string): Promise<SentimentAnalysis> {
    // Mock implementation
    return {
      score: 0.1,
      label: 'NEGATIVE',
      confidence: 0.85
    };
  }
}
