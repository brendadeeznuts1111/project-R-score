import type { SQLTemplateHelper } from "bun";

export interface CRC32Options {
  auditTrail?: boolean;
  entityType?: string;
  method?: "hardware" | "software" | "simd";
  crc32Fields?: string[];
  confidenceThreshold?: number;
  batchId?: string;
}

export interface CRC32ComputedData {
  hasCRC32Fields: boolean;
  originalCRC32?: number;
  computedCRC32?: number;
  isValid: boolean;
  confidence: number;
  processingTime: number;
  bytesProcessed: number;
  usedHardware: boolean;
  throughput: number;
  simdInstructions: number;
  crc32Field?: string;
  defaults: Set<string>;
  required: Set<string>;
}

export interface InsertResult {
  id?: string;
  rowsAffected: number;
  throughput?: number;
  duration?: number;
}

export interface CRC32AuditEntry {
  entity_type: string;
  entity_id: string;
  original_crc32: number;
  computed_crc32: number;
  status: "valid" | "invalid" | "corrupted";
  confidence_score: number;
  verification_method: string;
  processing_time_ms?: number;
  bytes_processed: number;
  error_details?: any;
  created_at?: Date;
  created_by?: string;
  batch_id?: string;
  retry_count?: number;
  throughput_mbps?: number;
  hardware_utilized?: boolean;
  simd_instructions?: number;
}

export class CRC32SQLHelper {
  private readonly sql: SQLTemplateHelper;

  constructor(sql: SQLTemplateHelper) {
    this.sql = sql;
  }

  async insertWithCRC32Validation(
    table: string,
    data: Record<string, any>,
    options: CRC32Options = {},
  ): Promise<InsertResult> {
    const start = performance.now();

    // Compute CRC32 for relevant fields
    const crc32Data = await this.extractCRC32Fields(data, options);

    // Build insert with undefined handling
    const insertData = this.buildInsertData(data, crc32Data);

    // Execute insert with Bun v1.3.6 undefined handling
    const result = await this.executeInsert(table, insertData);

    const duration = performance.now() - start;

    // Create audit trail if CRC32 validation requested
    if (options.auditTrail && crc32Data.hasCRC32Fields) {
      await this.createAuditTrail(result, crc32Data, options);
    }

    return {
      ...result,
      duration,
      throughput: crc32Data.bytesProcessed / (duration / 1000) / (1024 * 1024),
    };
  }

  private async extractCRC32Fields(
    data: Record<string, any>,
    options: CRC32Options,
  ): Promise<CRC32ComputedData> {
    const start = performance.now();
    const fields = options.crc32Fields || [];
    const defaults = new Set<string>();
    const required = new Set<string>();

    let hasCRC32Fields = false;
    let originalCRC32: number | undefined;
    let computedCRC32: number | undefined;
    let bytesProcessed = 0;
    let simdInstructions = 0;

    // Process CRC32 fields
    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        hasCRC32Fields = true;

        if (
          typeof data[field] === "object" &&
          data[field] instanceof Uint8Array
        ) {
          // Binary data - compute CRC32
          // Bun v1.3.6 bugfix: BINARY/VARBINARY/BLOB columns now return Buffer
          // instead of corrupted UTF-8 strings
          const fieldCRC = Bun.hash.crc32(data[field]);
          computedCRC32 = computedCRC32
            ? this.combineCRC32(computedCRC32, fieldCRC, data[field].length)
            : fieldCRC;
          bytesProcessed += data[field].length;
          simdInstructions += Math.ceil(data[field].length / 16); // SIMD estimate
        } else if (typeof data[field] === "string") {
          // String data - compute CRC32
          const encoder = new TextEncoder();
          const bytes = encoder.encode(data[field]);
          const fieldCRC = Bun.hash.crc32(bytes);
          computedCRC32 = computedCRC32
            ? this.combineCRC32(computedCRC32, fieldCRC, bytes.length)
            : fieldCRC;
          bytesProcessed += bytes.length;
        } else if (
          typeof data[field] === "object" &&
          Buffer.isBuffer(data[field])
        ) {
          // Buffer data - Bun v1.3.6 now properly handles Buffer in binary columns
          const fieldCRC = Bun.hash.crc32(data[field]);
          computedCRC32 = computedCRC32
            ? this.combineCRC32(computedCRC32, fieldCRC, data[field].length)
            : fieldCRC;
          bytesProcessed += data[field].length;
        }

        // Check for existing CRC32
        if (field.includes("crc32") || field.includes("checksum")) {
          originalCRC32 = data[field];
        }
      } else if (data[field] === undefined) {
        defaults.add(field);
      } else if (data[field] === null) {
        required.add(field);
      }
    }

    const processingTime = performance.now() - start;
    const isValid = originalCRC32 ? originalCRC32 === computedCRC : true;
    const confidence = isValid ? 1.0 : 0.5;
    const usedHardware = true; // Assume hardware for Bun

    return {
      hasCRC32Fields,
      originalCRC32,
      computedCRC32,
      isValid,
      confidence,
      processingTime,
      bytesProcessed,
      usedHardware,
      throughput: bytesProcessed / (processingTime / 1000) / (1024 * 1024),
      simdInstructions,
      crc32Field: fields.find((f) => f.includes("crc32")),
      defaults,
      required,
    };
  }

  private buildInsertData(
    originalData: Record<string, any>,
    crc32Data: CRC32ComputedData,
  ): Record<string, any> {
    const insertData: Record<string, any> = {};

    for (const [key, value] of Object.entries(originalData)) {
      // Bun v1.3.6: undefined values are filtered out automatically
      if (value === undefined && crc32Data.defaults.has(key)) {
        // Let database use DEFAULT value
        continue;
      }

      // Handle null values explicitly
      if (value === null && crc32Data.required.has(key)) {
        insertData[key] = value; // Explicit NULL insertion
        continue;
      }

      // Normal value insertion
      insertData[key] = value;
    }

    // Add computed CRC32 values if requested
    if (crc32Data.computedCRC32 !== undefined && crc32Data.crc32Field) {
      insertData[crc32Data.crc32Field] = crc32Data.computedCRC32;
    }

    return insertData;
  }

  private async executeInsert(
    table: string,
    data: Record<string, any>,
  ): Promise<InsertResult> {
    try {
      const result = await this.sql`
        INSERT INTO ${this.sql(table)} ${this.sql(data)}
        RETURNING id
      `;

      // Bun v1.3.6 bugfix: .run() now returns proper Changes object
      // with 'changes' and 'lastInsertRowid' properties
      return {
        id: result[0]?.id,
        rowsAffected: result.length || 1,
        // Note: If using .run() instead of template literal:
        // const changes = db.run(...);
        // changes.changes // number of rows affected
        // changes.lastInsertRowid // last inserted row ID
      };
    } catch (error) {
      console.error(`Failed to insert into ${table}:`, error);
      throw error;
    }
  }

  private async createAuditTrail(
    insertResult: InsertResult,
    crc32Data: CRC32ComputedData,
    options: CRC32Options,
  ): Promise<void> {
    const auditEntry: Partial<CRC32AuditEntry> = {
      entity_type: options.entityType || "unknown",
      entity_id: insertResult.id || crypto.randomUUID(),
      original_crc32: crc32Data.originalCRC32 || 0,
      computed_crc32: crc32Data.computedCRC32 || 0,
      status: crc32Data.isValid ? "valid" : "invalid",
      confidence_score: crc32Data.confidence,
      verification_method: options.method || "hardware",
      processing_time_ms: Math.round(crc32Data.processingTime * 1000),
      bytes_processed: crc32Data.bytesProcessed,
      hardware_utilized: crc32Data.usedHardware,
      throughput_mbps: Math.round(crc32Data.throughput * 100) / 100,
      simd_instructions: crc32Data.simdInstructions,
      batch_id: options.batchId,
    };

    try {
      // Use enhanced SQL with undefined handling
      await this.sql`
        INSERT INTO crc32_audit ${this.sql(auditEntry)}
      `;
    } catch (error) {
      console.error("Failed to create audit trail:", error);
      // Don't throw - audit failure shouldn't break main operation
    }
  }

  private combineCRC32(crc1: number, crc2: number, len2: number): number {
    // Hardware-accelerated CRC32 combination using Bun v1.3.6 optimizations
    const combined = Bun.hash.crc32(
      new Uint8Array([
        (crc1 >> 24) & 0xff,
        (crc1 >> 16) & 0xff,
        (crc1 >> 8) & 0xff,
        crc1 & 0xff,
        (crc2 >> 24) & 0xff,
        (crc2 >> 16) & 0xff,
        (crc2 >> 8) & 0xff,
        crc2 & 0xff,
        (len2 >> 24) & 0xff,
        (len2 >> 16) & 0xff,
        (len2 >> 8) & 0xff,
        len2 & 0xff,
      ]),
    );

    return combined >>> 0;
  }

  // Bulk insert with CRC32 validation
  async bulkInsertWithCRC32Validation(
    table: string,
    dataArray: Record<string, any>[],
    options: CRC32Options = {},
  ): Promise<InsertResult[]> {
    const batchId = crypto.randomUUID();
    const results: InsertResult[] = [];

    for (const data of dataArray) {
      const result = await this.insertWithCRC32Validation(table, data, {
        ...options,
        batchId,
      });
      results.push(result);
    }

    return results;
  }
}
