/**
 * R2 configuration constants
 */
export const R2_CONFIG = {
  DEFAULT_BUCKET: "foxy-proxy-storage",
  PUBLIC_URL_TEMPLATE: "https://pub-{accountId}.r2.dev",
  CLOUDFLARE_ENDPOINT_TEMPLATE: "https://{accountId}.r2.cloudflarestorage.com",
  DEFAULT_EXPIRES_IN: 3600, // 1 hour
  MAX_FILE_SIZE: 100 * 1024 * 1024 // 100MB
} as const;

/**
 * File upload presets
 */
export const UPLOAD_PRESETS = {
  PROFILE_IMAGE: {
    contentType: "image/jpeg",
    maxSize: 5 * 1024 * 1024, // 5MB
    keyPrefix: "profiles/images/"
  },
  DOCUMENT: {
    contentType: "application/pdf",
    maxSize: 20 * 1024 * 1024, // 20MB
    keyPrefix: "documents/"
  },
  BACKUP: {
    contentType: "application/json",
    maxSize: 50 * 1024 * 1024, // 50MB
    keyPrefix: "backups/"
  },
  LOGS: {
    contentType: "text/plain",
    maxSize: 10 * 1024 * 1024, // 10MB
    keyPrefix: "logs/"
  }
} as const;

/**
 * Common file extensions and their content types
 */
export const CONTENT_TYPES = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",

  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  csv: "text/csv",

  // Archives
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",

  // Data
  json: "application/json",
  xml: "application/xml",

  // Default
  default: "application/octet-stream"
} as const;

/**
 * Get content type for file extension
 */
export const getContentType = (filename: string): string => {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension
    ? CONTENT_TYPES[extension as keyof typeof CONTENT_TYPES] || CONTENT_TYPES.default
    : CONTENT_TYPES.default;
};
