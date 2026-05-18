/**
 * Domain Configurations and Implementations
 * Consolidated from medical-domain.ts, financial-domain.ts, ecommerce-domain.ts
 */

import { BaseDomainEnforcement, type DomainConfig } from './base-domain';

// ============================================================================
// DOMAIN CONFIGURATIONS
// ============================================================================

const MEDICAL_CONFIG: DomainConfig = {
  name: 'medical-records',
  compliance: ['hipaa', 'gdpr'],
  requiredColumnCount: 8,
  sensitiveColumns: ['patientId', 'diagnosis', 'treatment', 'medicalRecord'],
  colorScheme: 'hsl(120, 70%, 85%)',
  defaultSensitivity: 'high',
  accessLevel: 'medical-staff',
  dataRetention: '7-years',
  auditRequired: true,
  tableTypes: [
    {
      name: 'patient',
      detectPatterns: ['patientId', 'patient_id'],
      requiredColumns: ['patientId', 'name', 'dateOfBirth', 'gender', 'bloodType', 'allergies', 'medicalHistory', 'currentMedications'],
      suggestions: ['emergencyContact', 'insuranceInfo', 'primaryPhysician', 'createdAt', 'updatedAt']
    },
    {
      name: 'staff',
      detectPatterns: ['staffId', 'staff_id', 'licenseNumber'],
      requiredColumns: ['staffId', 'name', 'specialization', 'licenseNumber', 'department', 'contactInfo', 'schedule', 'credentials'],
      suggestions: ['onCallSchedule', 'specializationCert', 'yearsOfExperience']
    },
    {
      name: 'inventory',
      detectPatterns: ['itemId', 'item_id', 'sku'],
      requiredColumns: ['itemId', 'name', 'category', 'quantity', 'expirationDate', 'supplier', 'storageLocation', 'dosageInfo'],
      suggestions: ['batchNumber', 'storageTemperature', 'controlledSubstance']
    }
  ]
};

const FINANCIAL_CONFIG: DomainConfig = {
  name: 'financial-records',
  compliance: ['sox', 'gdpr', 'pci-dss'],
  requiredColumnCount: 10,
  sensitiveColumns: ['accountNumber', 'ssn', 'creditScore', 'income'],
  colorScheme: 'hsl(210, 70%, 85%)',
  defaultSensitivity: 'critical',
  accessLevel: 'financial-officer',
  dataRetention: '7-years',
  auditRequired: true,
  tableTypes: [
    {
      name: 'transaction',
      detectPatterns: ['transactionId', 'transaction_id', 'accountNumber'],
      requiredColumns: ['transactionId', 'accountNumber', 'amount', 'transactionType', 'timestamp', 'balance', 'referenceNumber', 'merchantInfo', 'processingFee', 'approvalCode'],
      suggestions: ['fraudScore', 'complianceFlags', 'riskAssessment']
    },
    {
      name: 'portfolio',
      detectPatterns: ['portfolioId', 'portfolio_id', 'assetName'],
      requiredColumns: ['portfolioId', 'assetName', 'assetType', 'quantity', 'purchasePrice', 'currentValue', 'gainLoss', 'purchaseDate', 'marketSector', 'riskRating'],
      suggestions: ['performanceMetrics', 'benchmarkComparison', 'dividendInfo']
    },
    {
      name: 'compliance',
      detectPatterns: ['auditId', 'audit_id', 'findingType'],
      requiredColumns: ['auditId', 'auditDate', 'auditor', 'findingType', 'severity', 'status', 'correctiveAction', 'dueDate', 'reviewDate', 'signOff'],
      suggestions: ['regulatoryReference', 'auditTrail', 'signatoryInfo']
    }
  ]
};

const ECOMMERCE_CONFIG: DomainConfig = {
  name: 'ecommerce-catalog',
  compliance: ['gdpr', 'ccpa'],
  requiredColumnCount: 8,
  sensitiveColumns: ['customerEmail', 'phone', 'address', 'paymentInfo'],
  colorScheme: 'hsl(270, 70%, 85%)',
  defaultSensitivity: 'medium',
  accessLevel: 'customer-service',
  dataRetention: '1-year',
  auditRequired: false,
  tableTypes: [
    {
      name: 'product',
      detectPatterns: ['productId', 'product_id', 'sku'],
      requiredColumns: ['productId', 'name', 'description', 'price', 'category', 'brand', 'availability', 'images', 'specifications', 'shippingInfo'],
      suggestions: ['customerReviews', 'relatedProducts', 'promotionalTags']
    },
    {
      name: 'order',
      detectPatterns: ['orderId', 'order_id', 'customerId'],
      requiredColumns: ['orderId', 'customerId', 'orderDate', 'status', 'totalAmount', 'shippingAddress', 'paymentMethod', 'trackingNumber', 'deliveryDate'],
      suggestions: ['giftOptions', 'loyaltyPoints', 'returnStatus']
    },
    {
      name: 'inventory',
      detectPatterns: ['currentStock', 'reorderLevel', 'warehouseLocation'],
      requiredColumns: ['sku', 'productName', 'currentStock', 'reorderLevel', 'supplier', 'warehouseLocation', 'lastRestocked', 'demandForecast', 'seasonality'],
      suggestions: ['seasonalDemand', 'competitorPricing', 'marketTrends']
    }
  ]
};

// ============================================================================
// DOMAIN ENFORCEMENT CLASSES
// ============================================================================

export class MedicalDomainEnforcement extends BaseDomainEnforcement {
  protected readonly config = MEDICAL_CONFIG;
}

export class FinancialDomainEnforcement extends BaseDomainEnforcement {
  protected readonly config = FINANCIAL_CONFIG;
}

export class EcommerceDomainEnforcement extends BaseDomainEnforcement {
  protected readonly config = ECOMMERCE_CONFIG;
}

// Export configs for direct access if needed
export const DOMAIN_CONFIGS = {
  medical: MEDICAL_CONFIG,
  financial: FINANCIAL_CONFIG,
  ecommerce: ECOMMERCE_CONFIG
} as const;

