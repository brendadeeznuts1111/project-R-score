// src/utils/s3Exports.ts
import { s3 } from "bun";
import { diMonitor } from "../monitoring/diPerformance";

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
 * Upload user report with proper contentDisposition for file delivery
 */
export async function uploadUserReport(
  userId: string,
  scope: string,
  buffer: Uint8Array,
  deps: Dependencies = PROD_DEPS
) {
  const start = performance.now();
  
  try {
    const isPremium = deps.feature("PREMIUM");
    const filename = isPremium 
      ? `premium-export-${Date.now()}.json`
      : `${scope}-user-${userId}-report.json`;
    
    await deps.s3Write(`exports/${scope}/${userId}/report.json`, buffer, {
      contentType: "application/json",
      contentDisposition: `attachment; filename="${filename}"`,
      // Optional: cache per scope
      cacheControl: scope === "PRODUCTION" ? "max-age=3600" : 
                    scope === "STAGING" ? "max-age=300" : "no-cache",
    });
    
    diMonitor.record('uploadUserReport', start);
  } catch (error) {
    diMonitor.record('uploadUserReport', start, error as Error);
    throw error;
  }
}

/**
 * Development scope: show logs inline in browser
 */
export async function uploadDebugLogs(logData: Uint8Array, deps: Dependencies = PROD_DEPS) {
  const start = Date.now();
  
  // In DEVELOPMENT scope, show logs inline
  if (deps.env.SCOPE === "DEVELOPMENT") {
    await deps.s3Write("debug.log", logData, {
      contentDisposition: "inline", // opens in browser tab
      contentType: "text/plain",
    });
  } else {
    await deps.s3Write("debug.log", logData, {
      contentDisposition: "attachment; filename=\"debug.log\"",
      contentType: "text/plain",
    });
  }
  
  performanceMonitor.trackDIResolution('uploadDebugLogs', start);
}

/**
 * Premium tenant export with custom filename
 */
export async function uploadTenantExport(
  csv: Uint8Array, 
  isPremium: boolean = false,
  deps: Dependencies = PROD_DEPS
) {
  const start = Date.now();
  
  if (isPremium && deps.feature("PREMIUM")) {
    await deps.s3Write("data.csv", csv, {
      contentType: "text/csv",
      contentDisposition: `attachment; filename="premium-export-${Date.now()}.csv"`,
    });
  } else {
    await deps.s3Write("data.csv", csv, {
      contentType: "text/csv",
      contentDisposition: "attachment",
    });
  }
  
  performanceMonitor.trackDIResolution('uploadTenantExport', start);
}

/**
 * Generic file upload with contentDisposition options
 */
export interface UploadOptions {
  contentType?: string;
  filename?: string;
  inline?: boolean;
  cacheControl?: string;
  expiresIn?: number;
}

export async function uploadFile(
  key: string,
  data: Uint8Array,
  options: UploadOptions = {},
  deps: Dependencies = PROD_DEPS
) {
  const {
    contentType = "application/octet-stream",
    filename,
    inline = false,
    cacheControl = "max-age=3600",
    expiresIn
  } = options;

  let contentDisposition: string;
  
  if (inline) {
    contentDisposition = "inline";
  } else if (filename) {
    contentDisposition = `attachment; filename="${filename}"`;
  } else {
    contentDisposition = "attachment";
  }

  const uploadOptions: any = {
    contentType,
    contentDisposition,
    cacheControl,
  };

  // Add expiration if specified
  if (expiresIn) {
    uploadOptions.expires = new Date(Date.now() + expiresIn * 1000).toISOString();
  }

  await deps.s3Write(key, data, uploadOptions);
}

/**
 * Batch upload multiple files with consistent naming
 */
export async function uploadBatch(
  files: Array<{
    key: string;
    data: Uint8Array;
    options?: UploadOptions;
  }>,
  deps: Dependencies = PROD_DEPS
) {
  const uploads = files.map(file => 
    uploadFile(file.key, file.data, file.options, deps)
  );
  
  await Promise.all(uploads);
}

/**
 * Export user data with proper contentDisposition based on scope
 */
export async function exportUserData(
  userId: string,
  data: {
    json?: Uint8Array;
    csv?: Uint8Array;
    pdf?: Uint8Array;
  },
  scope: string = "PRODUCTION",
  deps: Dependencies = PROD_DEPS
) {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = `user-${userId}-export-${timestamp}`;
  
  const uploads = [];
  
  if (data.json) {
    uploads.push(
      uploadFile(`exports/${scope}/${userId}/${baseFilename}.json`, data.json, {
        contentType: "application/json",
        filename: `${baseFilename}.json`,
        cacheControl: scope === "PRODUCTION" ? "max-age=3600" : "no-cache",
      }, deps)
    );
  }
  
  if (data.csv) {
    uploads.push(
      uploadFile(`exports/${scope}/${userId}/${baseFilename}.csv`, data.csv, {
        contentType: "text/csv",
        filename: `${baseFilename}.csv`,
        cacheControl: scope === "PRODUCTION" ? "max-age=3600" : "no-cache",
      }, deps)
    );
  }
  
  if (data.pdf) {
    uploads.push(
      uploadFile(`exports/${scope}/${userId}/${baseFilename}.pdf`, data.pdf, {
        contentType: "application/pdf",
        filename: `${baseFilename}.pdf`,
        cacheControl: scope === "PRODUCTION" ? "max-age=3600" : "no-cache",
      }, deps)
    );
  }
  
  await Promise.all(uploads);
}

/**
 * Create presigned URL with contentDisposition hint
 */
export async function getPresignedUrl(
  key: string,
  options: {
    expiresIn?: number;
    filename?: string;
    inline?: boolean;
  } = {}
) {
  const { expiresIn = 3600, filename, inline } = options;
  
  let contentDisposition: string;
  if (inline) {
    contentDisposition = "inline";
  } else if (filename) {
    contentDisposition = `attachment; filename="${filename}"`;
  } else {
    contentDisposition = "attachment";
  }
  
  // Note: This would need to be implemented based on your S3 provider's API
  // For Bun's S3 integration, you might need to use a different approach
  return {
    url: `https://your-s3-bucket.s3.amazonaws.com/${key}`,
    headers: {
      "Content-Disposition": contentDisposition,
    },
    expiresIn,
  };
}

/**
 * Scope-based upload strategies
 */
export const SCOPE_STRATEGIES = {
  DEVELOPMENT: {
    cacheControl: "no-cache",
    inline: true,
    expiresIn: 300, // 5 minutes
  },
  STAGING: {
    cacheControl: "max-age=300",
    inline: false,
    expiresIn: 3600, // 1 hour
  },
  PRODUCTION: {
    cacheControl: "max-age=3600",
    inline: false,
    expiresIn: 86400, // 24 hours
  },
} as const;

export async function uploadWithScopeStrategy(
  key: string,
  data: Uint8Array,
  scope: keyof typeof SCOPE_STRATEGIES,
  filename?: string,
  deps: Dependencies = PROD_DEPS
) {
  const strategy = SCOPE_STRATEGIES[scope];
  
  await uploadFile(key, data, {
    filename,
    inline: strategy.inline,
    cacheControl: strategy.cacheControl,
    expiresIn: strategy.expiresIn,
  }, deps);
}
