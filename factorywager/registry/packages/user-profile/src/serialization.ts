#!/usr/bin/env bun
/**
 * 🔄 FactoryWager Serialization Utilities
 * 
 * Efficient BigInt serialization and JSON helpers
 */

/**
 * Serialize object with BigInt to string conversion
 * More efficient than JSON.parse(JSON.stringify())
 */
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Convert object to JSON string with BigInt handling
 * Replaces inefficient JSON.parse(JSON.stringify()) pattern
 */
export function toJsonString(obj: unknown): string {
  return JSON.stringify(serializeBigInt(obj));
}

/**
 * Create serializable copy of object (for JSON operations)
 * More efficient than JSON.parse(JSON.stringify())
 */
export function createSerializableCopy<T>(obj: T): T {
  // First serialize BigInt, then parse/stringify for deep copy
  const serialized = serializeBigInt(obj);
  return JSON.parse(JSON.stringify(serialized)) as T;
}
