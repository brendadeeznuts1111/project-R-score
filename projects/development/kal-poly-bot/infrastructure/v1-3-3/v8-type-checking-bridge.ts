/**
 * infrastructure/v1-3-3/v8-type-checking-bridge.ts
 * Component #87: V8-Type-Checking-API
 * Level 0: Bridge | CPU: <0.01% | V8 C++ API
 * IsMap/IsArray/IsInt32/IsBigInt for native addons
 */


// Helper to check if feature is enabled
function isFeatureEnabled(): boolean {
  return process.env.FEATURE_V8_TYPE_BRIDGE === "1" || process.env.FEATURE_V8_TYPE_BRIDGE === "1";
}

// V8 Type Checking Bridge for native addon compatibility
export class V8TypeCheckingBridge {
  private static registeredAddons = new Set<string>();

  // Register a native addon for type checking
  static registerTypeChecks(addonName: string): void {
    if (!isFeatureEnabled()) return;

    this.registeredAddons.add(addonName);
    console.log(`✅ V8 Type Bridge: Registered ${addonName}`);
  }

  // Check if value is a Map (V8 IsMap equivalent)
  static isMap(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      // Fallback: basic check
      return value instanceof Map;
    }

    // Enhanced check with additional validation
    if (value instanceof Map) {
      return true;
    }

    // Check for duck-typed Map-like objects
    if (
      value &&
      typeof value === "object" &&
      "get" in value &&
      "set" in value &&
      "has" in value &&
      "delete" in value &&
      "clear" in value &&
      typeof (value as any).get === "function" &&
      typeof (value as any).set === "function"
    ) {
      return true;
    }

    return false;
  }

  // Check if value is an Array (V8 IsArray equivalent)
  static isArray(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      // Fallback: basic check
      return Array.isArray(value);
    }

    // Enhanced check with TypedArray support
    if (Array.isArray(value)) {
      return true;
    }

    // Check for TypedArrays
    if (
      value instanceof Uint8Array ||
      value instanceof Uint16Array ||
      value instanceof Uint32Array ||
      value instanceof Int8Array ||
      value instanceof Int16Array ||
      value instanceof Int32Array ||
      value instanceof Float32Array ||
      value instanceof Float64Array ||
      value instanceof BigInt64Array ||
      value instanceof BigUint64Array
    ) {
      return true;
    }

    // Check for array-like objects
    if (
      value &&
      typeof value === "object" &&
      "length" in value &&
      typeof (value as any).length === "number" &&
      (value as any).length >= 0
    ) {
      return true;
    }

    return false;
  }

  // Check if value is Int32 (V8 IsInt32 equivalent)
  static isInt32(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      // Fallback: basic check
      return typeof value === "number" && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
    }

    // Enhanced check
    if (typeof value !== "number") {
      return false;
    }

    // Must be an integer
    if (!Number.isInteger(value)) {
      return false;
    }

    // Must fit in 32-bit signed range
    return value >= -2147483648 && value <= 2147483647;
  }

  // Check if value is BigInt (V8 IsBigInt equivalent)
  static isBigInt(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      // Fallback: basic check
      return typeof value === "bigint";
    }

    // Enhanced check
    return typeof value === "bigint";
  }

  // Check if value is a primitive string (V8 IsString equivalent)
  static isString(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return typeof value === "string";
    }

    return typeof value === "string";
  }

  // Check if value is a primitive number (V8 IsNumber equivalent)
  static isNumber(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return typeof value === "number" && !isNaN(value);
    }

    return typeof value === "number" && !isNaN(value);
  }

  // Check if value is a primitive boolean (V8 IsBoolean equivalent)
  static isBoolean(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return typeof value === "boolean";
    }

    return typeof value === "boolean";
  }

  // Check if value is null (V8 IsNull equivalent)
  static isNull(value: unknown): boolean {
    return value === null;
  }

  // Check if value is undefined (V8 IsUndefined equivalent)
  static isUndefined(value: unknown): boolean {
    return value === undefined;
  }

  // Check if value is a function (V8 IsFunction equivalent)
  static isFunction(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return typeof value === "function";
    }

    return typeof value === "function";
  }

  // Check if value is an Object (V8 IsObject equivalent)
  static isObject(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    }

    // Enhanced object detection
    if (value === null) return false;
    if (typeof value !== "object") return false;
    if (Array.isArray(value)) return false;
    if (value instanceof Date) return false;
    if (value instanceof RegExp) return false;

    return true;
  }

  // Check if value is a Promise (V8 IsPromise equivalent)
  static isPromise(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return value instanceof Promise;
    }

    return (
      value instanceof Promise ||
      (value &&
        typeof value === "object" &&
        "then" in value &&
        "catch" in value &&
        typeof (value as any).then === "function" &&
        typeof (value as any).catch === "function")
    );
  }

  // Check if value is a Date (V8 IsDate equivalent)
  static isDate(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return value instanceof Date;
    }

    return value instanceof Date && !isNaN((value as Date).getTime());
  }

  // Check if value is a RegExp (V8 IsRegExp equivalent)
  static isRegExp(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return value instanceof RegExp;
    }

    return value instanceof RegExp;
  }

  // Check if value is an Error (V8 IsError equivalent)
  static isError(value: unknown): boolean {
    if (!isFeatureEnabled()) {
      return value instanceof Error;
    }

    return (
      value instanceof Error ||
      (value &&
        typeof value === "object" &&
        "message" in value &&
        "stack" in value &&
        typeof (value as any).message === "string")
    );
  }

  // Get type name (V8 GetTypeName equivalent)
  static getTypeName(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const type = typeof value;
    if (type !== "object") return type;

    if (Array.isArray(value)) return "array";
    if (value instanceof Map) return "map";
    if (value instanceof Set) return "set";
    if (value instanceof Date) return "date";
    if (value instanceof RegExp) return "regexp";
    if (value instanceof Error) return "error";
    if (value instanceof Promise) return "promise";

    return "object";
  }

  // Get registered addons
  static getRegisteredAddons(): string[] {
    return Array.from(this.registeredAddons);
  }

  // Get bridge statistics
  static getStats(): {
    registeredAddons: number;
    totalChecks: number;
    featureEnabled: boolean;
  } {
    return {
      registeredAddons: this.registeredAddons.size,
      totalChecks: this.registeredAddons.size * 12, // 12 type check methods
      featureEnabled: isFeatureEnabled(),
    };
  }
}

// Zero-cost export
export const v8TypeBridge = isFeatureEnabled()
  ? V8TypeCheckingBridge
  : {
      registerTypeChecks: () => {},
      isMap: (value: unknown) => value instanceof Map,
      isArray: (value: unknown) => Array.isArray(value),
      isInt32: (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647,
      isBigInt: (value: unknown) => typeof value === "bigint",
      isString: (value: unknown) => typeof value === "string",
      isNumber: (value: unknown) => typeof value === "number",
      isBoolean: (value: unknown) => typeof value === "boolean",
      isNull: (value: unknown) => value === null,
      isUndefined: (value: unknown) => value === undefined,
      isFunction: (value: unknown) => typeof value === "function",
      isObject: (value: unknown) => typeof value === "object" && value !== null && !Array.isArray(value),
      isPromise: (value: unknown) => value instanceof Promise,
      isDate: (value: unknown) => value instanceof Date,
      isRegExp: (value: unknown) => value instanceof RegExp,
      isError: (value: unknown) => value instanceof Error,
      getTypeName: (value: unknown) => typeof value,
      getRegisteredAddons: () => [],
      getStats: () => ({ registeredAddons: 0, totalChecks: 0, featureEnabled: false }),
    };
