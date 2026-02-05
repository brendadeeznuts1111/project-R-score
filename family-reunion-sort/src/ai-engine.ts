// AI Evidence Analysis Engine for Venmo Dispute System

import { Dispute, AIEvidenceAnalysis, CreateDisputeRequest } from "./types";
import { STATUS_COLORS } from "./constants/colors";

export class AIEngine {
  constructor() {}

  // Main entry point for AI evidence analysis
  async analyzeEvidence(dispute: Dispute | CreateDisputeRequest): Promise<AIEvidenceAnalysis> {
    const disputeId = 'id' in dispute ? dispute.id : 'NEW_DISPUTE';
    const evidenceUrls = 'evidenceUrls' in dispute ? dispute.evidenceUrls : dispute.evidence;
    const description = dispute.description;

    console.log(`${Bun.color(STATUS_COLORS.info)}AI Engine: Analyzing evidence for ${disputeId}${Bun.color('reset')}`);
    
    const findings: string[] = [];
    const anomalies: string[] = [];
    
    // 1. Analyze description for sentiment and key facts
    const sentiment = this.analyzeSentiment(description);
    findings.push(`Customer describes issue as: ${description.substring(0, 50)}...`);
    
    // 2. Mock image/document analysis
    const evidenceValidation = evidenceUrls.map((url, index) => {
      const type = this.detectFileType(url);
      const authenticity = 0.85 + Math.random() * 0.1;
      const relevance = 0.7 + Math.random() * 0.2;
      
      if (type === 'PHOTO') {
        findings.push(`Evidence #${index + 1} appears to be a legitimate photo of the receipt/item.`);
      }
      
      return {
        url,
        type,
        authenticityScore: authenticity,
        relevanceScore: relevance,
        description: `Verified ${type.toLowerCase()} evidence`,
        extractedText: type === 'DOCUMENT' ? "MOCK EXTRACTED TEXT: Coffee Shop Transaction #12345" : undefined
      };
    });

    // 3. Detect anomalies
    if (description.length < 20) {
      anomalies.push("Brief description may lack necessary context for resolution");
    }
    
    if (evidenceUrls.length === 0) {
      anomalies.push("No visual evidence provided for physical item dispute");
    }

    // 4. Calculate overall score and recommendation
    const overallScore = this.calculateOverallScore(evidenceValidation, description);
    const recommendation = this.determineRecommendation(overallScore, anomalies);

    console.log(`${Bun.color(overallScore > 0.7 ? STATUS_COLORS.success : STATUS_COLORS.warning)}AI Engine: Analysis complete. Recommendation: ${recommendation}${Bun.color('reset')}`);

    return {
      disputeId,
      overallScore,
      recommendation,
      confidence: 0.88,
      detectedSentiment: {
        customer: sentiment
      },
      keyFindings: findings,
      anomaliesDetected: anomalies,
      evidenceValidation,
      complianceCheck: {
        regulationECompliant: description.length > 10 && evidenceUrls.length > 0,
        missingRequiredDocs: evidenceUrls.length === 0 ? ["Physical proof of item condition"] : []
      },
      analyzedAt: new Date()
    };
  }

  private analyzeSentiment(text: string): string {
    const keywords = {
      frustrated: ['angry', 'bad', 'wrong', 'never', 'terrible', 'unfair', 'scam'],
      informative: ['received', 'ordered', 'instead', 'latte', 'espresso', 'description'],
      urgent: ['immediately', 'now', 'help', 'stolen', 'emergency', 'asap']
    };

    const lowercase = text.toLowerCase();
    if (keywords.frustrated.some(k => lowercase.includes(k))) return 'Frustrated';
    if (keywords.urgent.some(k => lowercase.includes(k))) return 'Urgent/Distressed';
    return 'Neutral/Descriptive';
  }

  private detectFileType(url: string): 'PHOTO' | 'DOCUMENT' | 'VIDEO' | 'OTHER' {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return 'PHOTO';
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return 'DOCUMENT';
    if (['mp4', 'mov'].includes(ext || '')) return 'VIDEO';
    return 'OTHER';
  }

  private calculateOverallScore(validation: any[], description: string): number {
    let score = 0.5; // Baseline
    
    // Add points for evidence
    score += Math.min(validation.length * 0.1, 0.3);
    
    // Add points for description length
    if (description.length > 50) score += 0.1;
    if (description.length > 100) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private determineRecommendation(score: number, anomalies: string[]): 'APPROVE' | 'REJECT' | 'FURTHER_REVIEW' | 'COMPROMISE' {
    if (score > 0.8 && anomalies.length === 0) return 'APPROVE';
    if (score < 0.3) return 'REJECT';
    if (score > 0.5 && anomalies.length > 0) return 'FURTHER_REVIEW';
    return 'COMPROMISE';
  }
}

export const aiEngine = new AIEngine();
export default aiEngine;
