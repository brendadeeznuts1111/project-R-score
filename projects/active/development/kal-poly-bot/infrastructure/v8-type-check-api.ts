// infrastructure/v8-type-check-api.ts
import { feature } from "bun:bundle";

// IsMap/IsArray/IsInt32/IsBigInt for native addon compatibility
export class V8TypeCheckAPI {
  // Zero-cost when V8_TYPE_CHECK is disabled
  static isMap(value: any): boolean {
    if (!feature("V8_TYPE_CHECK")) {
      // Fallback to instanceof (slower but compatible)
      return value instanceof Map;
    }

    // Native V8 check (Component #88: bridges to native C++ API)
    const v8IsMap = (globalThis as any).__bun_v8_is_map;
    return v8IsMap ? v8IsMap(value) : value instanceof Map;
  }

  static isArray(value: any): boolean {
    if (!feature("V8_TYPE_CHECK")) return Array.isArray(value);

    const v8IsArray = (globalThis as any).__bun_v8_is_array;
    return v8IsArray ? v8IsArray(value) : Array.isArray(value);
  }

  static isInt32(value: any): boolean {
    if (!feature("V8_TYPE_CHECK")) {
      return typeof value === 'number' &&
             value === (value | 0) &&
             value >= -2147483648 && value <= 2147483647;
    }

    const v8IsInt32 = (globalThis as any).__bun_v8_is_int32;
    return v8IsInt32 ?
      v8IsInt32(value) :
      (typeof value === 'number' && value === (value | 0));
  }

  static isBigInt(value: any): boolean {
    if (!feature("V8_TYPE_CHECK")) return typeof value === 'bigint';

    const v8IsBigInt = (globalThis as any).__bun_v8_is_bigint;
    return v8IsBigInt ?
      v8IsBigInt(value) :
      typeof value === 'bigint';
  }

  // N-API compatibility layer
  static createNapiTypeChecker(): any {
    if (!feature("V8_TYPE_CHECK")) {
      return {
        isMap: this.isMap,
        isArray: this.isArray,
        isInt32: this.isInt32,
        isBigInt: this.isBigInt
      };
    }

    // Component #88: Expose to native modules
    const checker = {
      napi_is_map: this.isMap,
      napi_is_array: this.isArray,
      napi_is_int32: this.isInt32,
      napi_is_bigint: this.isBigInt
    };

    // Register with native module loader
    (globalThis as any).__bun_napi_type_checks = checker;

    // Component #11 audit
    this.logNapiRegistration();

    return checker;
  }

  private static logNapiRegistration(): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 88,
        action: "napi_type_checker_registered",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const {
  isMap,
  isArray,
  isInt32,
  isBigInt,
  createNapiTypeChecker
} = feature("V8_TYPE_CHECK")
  ? V8TypeCheckAPI
  : {
      isMap: (v: any) => v instanceof Map,
      isArray: (v: any) => Array.isArray(v),
      isInt32: (v: any) => typeof v === 'number' && v === (v | 0),
      isBigInt: (v: any) => typeof v === 'bigint',
      createNapiTypeChecker: () => ({})
    };
