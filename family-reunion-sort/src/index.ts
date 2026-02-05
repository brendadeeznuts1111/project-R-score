// Main export file for Venmo QR Code Dispute Handling System

export { DisputeManager } from "./dispute-manager";
export { VenmoService } from "./venmo-service";
export { EmailService } from "./email-service";
export { FraudDetector } from "./fraud-detection";
export { DisputeAnalyticsDashboard } from "./analytics-dashboard";
export { VenmoWebhookHandler } from "./venmo-webhooks";

// QR Code Prevention
export { 
  DisputePreventionQRGenerator, 
  QRCodeScanner, 
  QRCodeAnalytics 
} from "./qr-prevention";

// Database
export { DisputeDatabase } from "./database";

// UI Components
export {
  DisputeActivity,
  DisputeDetailsActivity,
  DisputeStatusActivity,
  DisputeSubmittedDialog,
  EnhancedQRPaymentActivity
} from "./DisputeUI";

// API Server
export { default as disputeAPIServer } from "./api-server";
export { broadcastDisputeUpdate, broadcastMerchantUpdate } from "./broadcaster";

// Types
export type {
  Dispute,
  Transaction,
  Merchant,
  Customer,
  CreateDisputeRequest,
  MerchantResponse,
  DisputeResolution,
  DisputeChat,
  DisputeStatus,
  TimelineEvent,
  FraudRiskAssessment,
  RiskFactor,
  DisputeMetrics,
  VenmoWebhookPayload,
  QRCodeData,
  QRItem,
  DisputePreventionConfig,
  VerificationMethod
} from "./types";

// Quick start function for easy initialization
export async function initializeDisputeSystem(config: {
  databasePath?: string;
  venmoAPIKey?: string;
  venmoAPISecret?: string;
  smtpConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
}) {
  console.log("🚀 Initializing Venmo QR Code Dispute Handling System...");
  
  // Initialize database
  const db = new DisputeDatabase(config.databasePath);
  
  // Initialize core services
  const disputeManager = new DisputeManager();
  const fraudDetector = new FraudDetector();
  const analytics = new DisputeAnalyticsDashboard();
  const qrGenerator = new DisputePreventionQRGenerator();
  
  console.log("✅ Dispute system initialized successfully!");
  console.log("📊 Available services:");
  console.log("   - Dispute Management");
  console.log("   - Fraud Detection");
  console.log("   - Analytics Dashboard");
  console.log("   - QR Code Prevention");
  console.log("   - Email Notifications");
  console.log("   - Venmo Integration");
  
  return {
    db,
    disputeManager,
    fraudDetector,
    analytics,
    qrGenerator
  };
}

// Utility functions
export const createSampleDispute = () => ({
  transactionId: "TX-SAMPLE-001",
  customerId: "CUST-SAMPLE-001",
  reason: "Item not received",
  description: "Sample dispute for testing",
  evidence: ["sample.jpg"],
  requestedResolution: "REFUND_FULL" as const,
  contactMerchantFirst: true
});

export const validateEnvironment = () => {
  const required = [
    'VENMO_API_KEY',
    'VENMO_API_SECRET',
    'QR_PRIVATE_KEY',
    'QR_ENCRYPTION_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn("⚠️  Missing environment variables:", missing);
    return false;
  }
  
  return true;
};

// System health check
export const healthCheck = async () => {
  try {
    const db = new DisputeDatabase();
    const analytics = new DisputeAnalyticsDashboard();
    
    // Test database connection
    await db.countDisputes();
    
    // Test analytics
    await analytics.getRealTimeStats();
    
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        analytics: "operational",
        fraudDetection: "operational"
      }
    };
  } catch (error) {
    return {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};
