// QR Code generation with dispute prevention features

import { Transaction, Merchant, Location } from "./types";

export interface QRCodeData {
  version: string;
  type: string;
  transactionId: string;
  amount: number;
  merchant: string;
  merchantVerified: boolean;
  merchantRating: number;
  items: QRItem[];
  timestamp: string;
  location?: Location;
  disputePrevention: DisputePreventionConfig;
  signature: string;
}

export interface QRItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  description?: string;
}

export interface DisputePreventionConfig {
  requiresPhotoConfirmation: boolean;
  requiresCustomerSignature: boolean;
  deliveryVerification: boolean;
  maxDisputeWindowHours: number;
  evidenceRequirements: string[];
  autoRefundThreshold: number;
  verificationMethods: VerificationMethod[];
}

export interface VerificationMethod {
  type: 'PHOTO' | 'SIGNATURE' | 'GPS' | 'TIME_STAMP' | 'ITEM_SCAN';
  required: boolean;
  description: string;
}

export class DisputePreventionQRGenerator {
  private privateKey: string;
  private encryptionKey: string;

  constructor() {
    this.privateKey = process.env.QR_PRIVATE_KEY || 'private-key';
    this.encryptionKey = process.env.QR_ENCRYPTION_KEY || 'encryption-key';
  }

  // Generate enhanced QR code with dispute prevention
  generateQRWithVerification(transaction: Transaction, merchant: Merchant): QRCodeData {
    const qrData: QRCodeData = {
      version: "2.0",
      type: "duoplus.verified.payment",
      transactionId: transaction.id,
      amount: transaction.amount,
      merchant: transaction.merchantUsername,
      merchantVerified: merchant.isVerified,
      merchantRating: merchant.rating,
      items: this.transformItems(transaction.items),
      timestamp: transaction.createdAt.toISOString(),
      location: transaction.location,
      disputePrevention: this.generateDisputePreventionConfig(transaction, merchant),
      signature: '' // Will be added below
    };

    // Add cryptographic signature
    qrData.signature = this.signQRData(qrData);

    return qrData;
  }

  // Generate QR code for delivery/online orders with enhanced verification
  generateDeliveryQRCode(transaction: Transaction, merchant: Merchant): QRCodeData {
    const baseQR = this.generateQRWithVerification(transaction, merchant);
    
    // Enhanced verification for delivery orders
    baseQR.disputePrevention = {
      ...baseQR.disputePrevention,
      requiresPhotoConfirmation: true,
      requiresCustomerSignature: true,
      deliveryVerification: true,
      evidenceRequirements: [
        'Delivery photo',
        'Customer signature',
        'Timestamp verification',
        'GPS location confirmation'
      ],
      verificationMethods: [
        {
          type: 'PHOTO',
          required: true,
          description: 'Photo of delivered items at doorstep'
        },
        {
          type: 'SIGNATURE',
          required: true,
          description: 'Customer signature upon delivery'
        },
        {
          type: 'GPS',
          required: true,
          description: 'GPS coordinates of delivery location'
        },
        {
          type: 'TIME_STAMP',
          required: true,
          description: 'Delivery timestamp verification'
        }
      ]
    };

    baseQR.signature = this.signQRData(baseQR);
    return baseQR;
  }

  // Generate QR code for high-value transactions with extra security
  generateHighValueQRCode(transaction: Transaction, merchant: Merchant): QRCodeData {
    const baseQR = this.generateQRWithVerification(transaction, merchant);
    
    if (transaction.amount > 1000) {
      baseQR.disputePrevention = {
        ...baseQR.disputePrevention,
        requiresCustomerSignature: true,
        evidenceRequirements: [
          'Customer ID verification',
          'Photo of customer with item',
          'Item serial number verification',
          'Detailed receipt'
        ],
        verificationMethods: [
          ...baseQR.disputePrevention.verificationMethods,
          {
            type: 'ITEM_SCAN',
            required: true,
            description: 'Scan item serial number or QR code'
          }
        ]
      };

      baseQR.signature = this.signQRData(baseQR);
    }

    return baseQR;
  }

  // Validate QR code data and signature
  validateQRCode(qrData: QRCodeData): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check signature
    if (!this.verifySignature(qrData)) {
      issues.push('Invalid QR code signature');
    }

    // Check version
    if (qrData.version !== "2.0") {
      issues.push('Unsupported QR code version');
    }

    // Check required fields
    const requiredFields = ['transactionId', 'amount', 'merchant', 'timestamp', 'signature'];
    for (const field of requiredFields) {
      if (!qrData[field as keyof QRCodeData]) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Check merchant verification
    if (!qrData.merchantVerified) {
      issues.push('Merchant is not verified');
    }

    // Check timestamp (should be recent)
    const qrTime = new Date(qrData.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - qrTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      issues.push('QR code is expired (older than 24 hours)');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Generate dispute prevention configuration based on transaction and merchant
  private generateDisputePreventionConfig(transaction: Transaction, merchant: Merchant): DisputePreventionConfig {
    const baseConfig: DisputePreventionConfig = {
      requiresPhotoConfirmation: false,
      requiresCustomerSignature: false,
      deliveryVerification: transaction.requiresDelivery,
      maxDisputeWindowHours: this.calculateDisputeWindow(transaction.amount, merchant),
      evidenceRequirements: this.getEvidenceRequirements(transaction),
      autoRefundThreshold: this.calculateAutoRefundThreshold(merchant),
      verificationMethods: this.getDefaultVerificationMethods(transaction)
    };

    // Adjust based on merchant risk
    if (merchant.disputeRate > 0.05) {
      baseConfig.requiresPhotoConfirmation = true;
      baseConfig.evidenceRequirements.push('Additional photo evidence');
    }

    // Adjust based on transaction amount
    if (transaction.amount > 500) {
      baseConfig.requiresCustomerSignature = true;
    }

    // Adjust based on merchant rating
    if (merchant.rating < 3.5) {
      baseConfig.requiresPhotoConfirmation = true;
      baseConfig.evidenceRequirements.push('Detailed item description');
    }

    return baseConfig;
  }

  // Transform transaction items to QR items
  private transformItems(items: any[]): QRItem[] {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: item.category || 'general',
      description: item.description || ''
    }));
  }

  // Calculate dispute window based on amount and merchant
  private calculateDisputeWindow(amount: number, merchant: Merchant): number {
    let baseHours = 24 * 60; // 60 days default
    
    // Reduce window for high-risk merchants
    if (merchant.disputeRate > 0.1) {
      baseHours = 24 * 30; // 30 days
    }
    
    // Extend window for high-value transactions
    if (amount > 1000) {
      baseHours = 24 * 90; // 90 days
    }
    
    return baseHours;
  }

  // Get evidence requirements based on transaction type
  private getEvidenceRequirements(transaction: Transaction): string[] {
    const requirements = ['Transaction receipt'];
    
    if (transaction.requiresDelivery) {
      requirements.push('Delivery confirmation');
    }
    
    if (transaction.amount > 100) {
      requirements.push('Photo of item(s)');
    }
    
    return requirements;
  }

  // Calculate auto-refund threshold based on merchant performance
  private calculateAutoRefundThreshold(merchant: Merchant): number {
    if (merchant.rating > 4.5 && merchant.disputeRate < 0.01) {
      return 100; // Auto-refund up to $100 for excellent merchants
    } else if (merchant.rating > 4.0 && merchant.disputeRate < 0.02) {
      return 50; // Auto-refund up to $50 for good merchants
    } else {
      return 0; // No auto-refund for risky merchants
    }
  }

  // Get default verification methods
  private getDefaultVerificationMethods(transaction: Transaction): VerificationMethod[] {
    const methods: VerificationMethod[] = [
      {
        type: 'TIME_STAMP',
        required: true,
        description: 'Transaction timestamp verification'
      }
    ];

    if (transaction.location) {
      methods.push({
        type: 'GPS',
        required: false,
        description: 'GPS location verification'
      });
    }

    return methods;
  }

  // Sign QR data with private key
  private signQRData(qrData: QRCodeData): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify({
      ...qrData,
      signature: '' // Remove signature before signing
    });
    
    return crypto
      .createHmac('sha256', this.privateKey)
      .update(dataString)
      .digest('hex');
  }

  // Verify QR data signature
  private verifySignature(qrData: QRCodeData): boolean {
    const crypto = require('crypto');
    const dataString = JSON.stringify({
      ...qrData,
      signature: '' // Remove signature before verification
    });
    
    const expectedSignature = crypto
      .createHmac('sha256', this.privateKey)
      .update(dataString)
      .digest('hex');
    
    return qrData.signature === expectedSignature;
  }

  // Convert QR data to JSON string for QR code generation
  qrDataToString(qrData: QRCodeData): string {
    return JSON.stringify(qrData);
  }

  // Parse QR data from string
  parseQRData(qrString: string): QRCodeData | null {
    try {
      return JSON.parse(qrString);
    } catch (error) {
      console.error('Failed to parse QR data:', error);
      return null;
    }
  }
}

// QR Code Scanner and Validator
export class QRCodeScanner {
  private qrGenerator: DisputePreventionQRGenerator;

  constructor() {
    this.qrGenerator = new DisputePreventionQRGenerator();
  }

  // Scan and validate QR code
  async scanAndValidateQRCode(qrString: string): Promise<{
    isValid: boolean;
    qrData?: QRCodeData;
    issues: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const qrData = this.qrGenerator.parseQRData(qrString);
    
    if (!qrData) {
      return {
        isValid: false,
        issues: ['Invalid QR code format'],
        riskLevel: 'HIGH'
      };
    }

    const validation = this.qrGenerator.validateQRCode(qrData);
    const riskLevel = this.assessRiskLevel(qrData, validation.issues);

    return {
      isValid: validation.isValid,
      qrData,
      issues: validation.issues,
      riskLevel
    };
  }

  // Assess risk level based on QR data and validation issues
  private assessRiskLevel(qrData: QRCodeData, issues: string[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Merchant-related risks
    if (!qrData.merchantVerified) riskScore += 0.3;
    if (qrData.merchantRating < 3.0) riskScore += 0.2;
    if (qrData.merchantRating < 2.0) riskScore += 0.3;

    // Transaction-related risks
    if (qrData.amount > 1000) riskScore += 0.1;
    if (qrData.amount > 5000) riskScore += 0.2;

    // Validation issues
    if (issues.includes('Invalid QR code signature')) riskScore += 0.4;
    if (issues.includes('QR code is expired')) riskScore += 0.2;
    if (issues.includes('Merchant is not verified')) riskScore += 0.2;

    // Dispute prevention requirements
    if (!qrData.disputePrevention.requiresPhotoConfirmation && qrData.amount > 100) {
      riskScore += 0.1;
    }

    if (riskScore >= 0.7) return 'HIGH';
    if (riskScore >= 0.4) return 'MEDIUM';
    return 'LOW';
  }

  // Get payment recommendations based on QR data
  getPaymentRecommendations(qrData: QRCodeData): {
    shouldProceed: boolean;
    warnings: string[];
    requiredActions: string[];
  } {
    const warnings: string[] = [];
    const requiredActions: string[] = [];
    let shouldProceed = true;

    if (!qrData.merchantVerified) {
      warnings.push('Merchant is not verified - proceed with caution');
      shouldProceed = false;
    }

    if (qrData.merchantRating < 3.0) {
      warnings.push(`Merchant has low rating (${qrData.merchantRating}/5.0)`);
    }

    if (qrData.amount > 1000) {
      warnings.push('High-value transaction - ensure you understand what you\'re paying for');
      requiredActions.push('Verify item details and condition');
    }

    if (qrData.disputePrevention.requiresPhotoConfirmation) {
      requiredActions.push('Be prepared to provide photo evidence if needed');
    }

    if (qrData.disputePrevention.requiresCustomerSignature) {
      requiredActions.push('Signature will be required for dispute resolution');
    }

    return {
      shouldProceed,
      warnings,
      requiredActions
    };
  }
}

// QR Code Analytics
export class QRCodeAnalytics {
  // Track QR code usage patterns
  async trackQRUsage(qrData: QRCodeData, outcome: 'completed' | 'disputed' | 'cancelled'): Promise<void> {
    // In a real implementation, this would store analytics data
    console.log(`QR Usage tracked: ${qrData.transactionId} - ${outcome}`);
  }

  // Generate QR code performance report
  async generateQRPerformanceReport(merchantId: string, timeRange: string): Promise<{
    totalQRCodes: number;
    disputeRate: number;
    averageValue: number;
    topIssues: Array<{ issue: string; count: number }>;
    recommendations: string[];
  }> {
    // Mock data - in real implementation, this would query analytics
    return {
      totalQRCodes: 1250,
      disputeRate: 0.032, // 3.2%
      averageValue: 85.50,
      topIssues: [
        { issue: 'Missing photo evidence', count: 15 },
        { issue: 'Customer claims wrong item', count: 12 },
        { issue: 'Delivery disputes', count: 8 }
      ],
      recommendations: [
        'Enable photo confirmation for all transactions over $50',
        'Implement itemized receipts with photos',
        'Add delivery tracking integration'
      ]
    };
  }
}
