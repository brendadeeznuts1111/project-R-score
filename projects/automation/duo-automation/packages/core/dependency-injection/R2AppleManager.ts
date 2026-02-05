// src/utils/R2AppleManager.ts
import { s3 } from "bun";  // Bun's S3 client (can proxy to R2)
import { performanceMonitor } from "./performance-monitor";

/**
 * Injectable dependencies for testability and production flexibility
 */
export type Dependencies = {
  feature: (flag: string) => boolean;
  s3Write: typeof s3.write;
  env: Record<string, string | undefined>;
};

/**
 * Default production dependencies
 */
export const PROD_DEPS: Dependencies = {
  feature: (flag) => globalThis.feature?.(flag) ?? false,
  s3Write: s3.write.bind(s3),
  env: process.env,
};

/**
 * Export Apple receipt with proper contentDisposition for file delivery
 */
export async function exportAppleReceipt(
  userId: string, 
  receiptData: string, 
  deps: Dependencies = PROD_DEPS
): Promise<void> {
  const start = Date.now();
  
  const isPremium = deps.feature("PREMIUM");
  
  const filename = isPremium
    ? `premium-apple-receipt-${Date.now()}.json`
    : `apple-receipt-${userId}.json`;

  await deps.s3Write(`receipts/${userId}/${filename}`, new TextEncoder().encode(receiptData), {
    contentType: "application/json",
    contentDisposition: `attachment; filename="${filename}"`,
    metadata: {
      userId,
      exportedAt: new Date().toISOString(),
      isPremium: isPremium.toString(),
    },
  });
  
  performanceMonitor.trackDIResolution('exportAppleReceipt', start);
}

/**
 * Export Apple Pay transaction logs with premium features
 */
export async function exportApplePayLogs(
  userId: string,
  transactionData: Array<{
    id: string;
    amount: number;
    currency: string;
    timestamp: string;
  }>,
  deps: Dependencies = PROD_DEPS
): Promise<void> {
  const start = Date.now();
  
  const isPremium = deps.feature("APPLE_PAY_PREMIUM");
  
  const filename = isPremium
    ? `premium-apple-pay-transactions-${Date.now()}.csv`
    : `apple-pay-transactions-${userId}.csv`;
  
  // Convert to CSV
  const csvHeaders = "id,amount,currency,timestamp\n";
  const csvRows = transactionData.map(t => 
    `${t.id},${t.amount},${t.currency},${t.timestamp}`
  ).join("\n");
  const csvData = csvHeaders + csvRows;
  
  await deps.s3Write(`transactions/${userId}/${filename}`, new TextEncoder().encode(csvData), {
    contentType: "text/csv",
    contentDisposition: `attachment; filename="${filename}"`,
    metadata: {
      userId,
      transactionCount: transactionData.length.toString(),
      exportedAt: new Date().toISOString(),
      isPremium: isPremium.toString(),
    },
  });
  
  performanceMonitor.trackDIResolution('exportApplePayLogs', start);
}

/**
 * Batch export multiple Apple-related files with consistent naming
 */
export async function exportApplePackage(
  userId: string,
  data: {
    receipt?: string;
    transactions?: Array<{
      id: string;
      amount: number;
      currency: string;
      timestamp: string;
    }>;
    metadata?: Record<string, any>;
  },
  deps: Dependencies = PROD_DEPS
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = `apple-package-${userId}-${timestamp}`;
  
  const uploads = [];
  
  if (data.receipt) {
    uploads.push(
      exportAppleReceipt(userId, data.receipt, deps)
    );
  }
  
  if (data.transactions) {
    uploads.push(
      exportApplePayLogs(userId, data.transactions, deps)
    );
  }
  
  if (data.metadata) {
    const metadataJson = JSON.stringify(data.metadata, null, 2);
    const isPremium = deps.feature("PREMIUM");
    const metadataFilename = isPremium
      ? `premium-metadata-${Date.now()}.json`
      : `${baseFilename}-metadata.json`;
    
    uploads.push(
      deps.s3Write(`metadata/${userId}/${metadataFilename}`, new TextEncoder().encode(metadataJson), {
        contentType: "application/json",
        contentDisposition: `attachment; filename="${metadataFilename}"`,
        metadata: {
          userId,
          exportedAt: new Date().toISOString(),
          isPremium: isPremium.toString(),
        },
      })
    );
  }
  
  await Promise.all(uploads);
}

/**
 * Get presigned URL for Apple receipt download
 */
export async function getAppleReceiptUrl(
  userId: string,
  filename: string,
  deps: Dependencies = PROD_DEPS
): Promise<string> {
  // Note: This would need to be implemented based on your S3 provider's presigned URL API
  // For Bun's S3 integration, you might need to use a different approach
  const key = `receipts/${userId}/${filename}`;
  
  // Presigned URL implementation would go here
  // For now, return a mock URL
  return `https://your-s3-bucket.s3.amazonaws.com/${key}`;
}
