import type { FileSchema } from "./r2/enhanced-bun-client";

// Re-export FileSchema for external use
export type { FileSchema };

/**
 * Schema validation and synchronization utilities
 * Ensures consistent schema structure across different buckets and environments
 */

// Base schema definition that all buckets must follow
export const BASE_SCHEMA_VERSION = "1.0";
export const SUPPORTED_SCHEMA_VERSIONS = ["1.0"];

// Required fields for schema validation
export const REQUIRED_SCHEMA_FIELDS = [
  "id",
  "key",
  "originalName",
  "mimeType",
  "size",
  "checksum",
  "createdAt",
  "updatedAt",
  "lastAccessed",
  "category",
  "type",
  "bucket",
  "metadata",
  "processing",
  "access",
  "version"
] as const;

// Schema field types for validation
export const SCHEMA_FIELD_TYPES = {
  id: "string",
  key: "string",
  originalName: "string",
  mimeType: "string",
  size: "number",
  checksum: "string",
  createdAt: "string",
  updatedAt: "string",
  lastAccessed: "string",
  category: "string",
  type: "string",
  encoding: "string",
  bucket: "string",
  region: "string",
  storageClass: "string"
} as const;

// Valid values for enum fields
export const VALID_CATEGORIES = [
  "image",
  "document",
  "video",
  "audio",
  "archive",
  "code",
  "data",
  "other"
] as const;

export const VALID_STORAGE_CLASSES = ["standard", "infrequent-access", "archive"] as const;

export const VALID_PROCESSING_STATUSES = ["pending", "processing", "completed", "failed"] as const;

/**
 * Validates a schema against the base requirements
 */
export const validateSchema = (schema: FileSchema): SchemaValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of REQUIRED_SCHEMA_FIELDS) {
    if (!(field in schema)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check field types
  for (const [field, expectedType] of Object.entries(SCHEMA_FIELD_TYPES)) {
    const value = (schema as unknown as Record<string, unknown>)[field];
    if (value !== undefined && typeof value !== expectedType) {
      errors.push(`Field ${field} should be ${expectedType}, got ${typeof value}`);
    }
  }

  // Check enum values
  if (!VALID_CATEGORIES.includes(schema.category as (typeof VALID_CATEGORIES)[number])) {
    errors.push(
      `Invalid category: ${schema.category}. Must be one of: ${VALID_CATEGORIES.join(", ")}`
    );
  }

  if (
    schema.storageClass &&
    !VALID_STORAGE_CLASSES.includes(schema.storageClass as (typeof VALID_STORAGE_CLASSES)[number])
  ) {
    errors.push(
      `Invalid storageClass: ${schema.storageClass}. Must be one of: ${VALID_STORAGE_CLASSES.join(", ")}`
    );
  }

  if (
    !VALID_PROCESSING_STATUSES.includes(
      schema.processing.status as (typeof VALID_PROCESSING_STATUSES)[number]
    )
  ) {
    errors.push(
      `Invalid processing status: ${schema.processing.status}. Must be one of: ${VALID_PROCESSING_STATUSES.join(", ")}`
    );
  }

  // Check timestamp format (ISO 8601)
  const timestampFields = ["createdAt", "updatedAt", "lastAccessed"];
  for (const field of timestampFields) {
    const timestamp = (schema as unknown as Record<string, string>)[field];
    if (timestamp && !isValidISO8601(timestamp)) {
      errors.push(`Invalid timestamp format for ${field}: ${timestamp}. Must be ISO 8601 format.`);
    }
  }

  // Check checksum format
  if (schema.checksum && !isValidChecksum(schema.checksum)) {
    warnings.push(`Checksum format may be invalid: ${schema.checksum}`);
  }

  // Version checks
  if (!schema.version.current || schema.version.current < 1) {
    errors.push("Version number must be >= 1");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    schemaVersion: BASE_SCHEMA_VERSION
  };
};

/**
 * Compares two schemas and returns differences
 */
export const compareSchemas = (
  schema1: FileSchema,
  schema2: FileSchema
): SchemaComparisonResult => {
  const differences: SchemaDifference[] = [];

  // Compare basic fields
  const allFields = new Set([...Object.keys(schema1), ...Object.keys(schema2)]);

  for (const field of allFields) {
    const value1 = (schema1 as unknown as Record<string, unknown>)[field];
    const value2 = (schema2 as unknown as Record<string, unknown>)[field];

    if (value1 === undefined && value2 !== undefined) {
      differences.push({
        field,
        type: "missing_in_first",
        value: value2
      });
    } else if (value1 !== undefined && value2 === undefined) {
      differences.push({
        field,
        type: "missing_in_second",
        value: value1
      });
    } else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
      differences.push({
        field,
        type: "value_mismatch",
        value1,
        value2
      });
    }
  }

  return {
    areIdentical: differences.length === 0,
    differences,
    compatibility: checkCompatibility(schema1, schema2)
  };
};

/**
 * Merges two schemas, preferring the newer one
 */
export const mergeSchemas = (oldSchema: FileSchema, newSchema: FileSchema): FileSchema => {
  const merged: FileSchema = {
    ...oldSchema,
    ...newSchema,

    // Merge nested objects properly
    metadata: {
      ...oldSchema.metadata,
      ...newSchema.metadata
    },

    processing: {
      ...oldSchema.processing,
      ...newSchema.processing
    },

    access: {
      ...oldSchema.access,
      ...newSchema.access
    },

    // Update version
    version: {
      current: Math.max(oldSchema.version.current, newSchema.version.current) + 1,
      history: [...oldSchema.version.history, ...newSchema.version.history].sort(
        (a, b) => b.version - a.version
      )
    },

    // Update timestamps
    updatedAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString()
  };

  return merged;
};

/**
 * Creates a new schema with default values
 */
export const createDefaultSchema = (params: CreateSchemaParams): FileSchema => {
  const now = new Date().toISOString();

  return {
    // Core file information
    id: generateId(),
    key: params.key,
    originalName: params.originalName,
    mimeType: params.mimeType,
    size: params.size,
    checksum: params.checksum || "",

    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastAccessed: now,

    // File classification
    category: categorizeFile(params.mimeType),
    type: getFileExtension(params.originalName),
    encoding: params.encoding,

    // Storage information
    bucket: params.bucket,
    region: params.region,
    storageClass: params.storageClass || "standard",

    // Content analysis
    metadata: {
      title: extractTitle(params.originalName),
      description: params.description,
      keywords: []
    },

    // Processing information
    processing: {
      status: "pending",
      steps: [],
      originalSize: params.size
    },

    // Access control
    access: {
      isPublic: params.isPublic || false,
      downloadCount: 0
    },

    // Version information
    version: {
      current: 1,
      history: [
        {
          version: 1,
          size: params.size,
          checksum: params.checksum || "",
          createdAt: now
        }
      ]
    }
  };
};

/**
 * Utility functions
 */

const isValidISO8601 = (timestamp: string): boolean => {
  return !isNaN(Date.parse(timestamp));
};

const isValidChecksum = (checksum: string): boolean => {
  // Basic checksum validation (MD5, SHA1, SHA256)
  return /^[a-fA-F0-9]{32,64}$/.test(checksum);
};

const checkCompatibility = (
  schema1: FileSchema,
  schema2: FileSchema
): "compatible" | "warning" | "incompatible" => {
  const v1 = validateSchema(schema1);
  const v2 = validateSchema(schema2);

  if (!v1.isValid || !v2.isValid) {
    return "incompatible";
  }

  if (v1.warnings.length > 0 || v2.warnings.length > 0) {
    return "warning";
  }

  return "compatible";
};

const generateId = (): string => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const categorizeFile = (mimeType: string): FileSchema["category"] => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.includes("document") || mimeType.includes("pdf") || mimeType.includes("text")) {
    return "document";
  }
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip")) {
    return "archive";
  }
  if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("xml")) {
    return "code";
  }
  if (mimeType.includes("application/octet-stream") || mimeType.includes("data")) {
    return "data";
  }
  return "other";
};

const getFileExtension = (filename: string): string => {
  return filename.split(".").pop() || "";
};

const extractTitle = (filename: string): string => {
  return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
};

// Type definitions
export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  schemaVersion: string;
}

export interface SchemaDifference {
  field: string;
  type: "missing_in_first" | "missing_in_second" | "value_mismatch" | "type_mismatch";
  value?: unknown;
  value1?: unknown;
  value2?: unknown;
}

export interface SchemaComparisonResult {
  areIdentical: boolean;
  differences: SchemaDifference[];
  compatibility: "compatible" | "warning" | "incompatible";
}

export interface CreateSchemaParams {
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  bucket: string;
  region?: string;
  storageClass?: "standard" | "infrequent-access" | "archive";
  isPublic?: boolean;
  encoding?: string;
  description?: string;
}

/**
 * Schema migration utilities
 */
export const migrateSchema = (
  oldSchema: unknown,
  targetVersion: string = BASE_SCHEMA_VERSION
): FileSchema => {
  // Add migration logic here for different schema versions
  // TODO: Use targetVersion to handle version-specific migrations
  console.debug(`Migrating schema to version: ${targetVersion}`);
  const migrated = { ...(oldSchema as Record<string, unknown>) };

  // Ensure all required fields exist
  for (const field of REQUIRED_SCHEMA_FIELDS) {
    if (!(field in migrated)) {
      migrated[field] = getDefaultValue(field);
    }
  }

  return migrated as unknown as FileSchema;
};

const getDefaultValue = (field: string): unknown => {
  const defaults: Record<string, unknown> = {
    id: generateId(),
    checksum: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    category: "other",
    type: "",
    metadata: {},
    processing: { status: "pending", steps: [] },
    access: { isPublic: false },
    version: { current: 1, history: [] }
  };

  return defaults[field];
};
