// infrastructure/mysql-parameter-binding-guard.ts
import { feature } from "bun:bundle";

// Type definitions for better type safety
interface MySQLClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  config: {
    host: string;
  };
}

interface QueryParameter {
  [key: string]: unknown;
}

// Rejects boxed primitives (new Number/Boolean) with descriptive errors
export class MySQLParameterBindingGuard {
  // Zero-cost when MYSQL_PARAM_GUARD is disabled
  static validateParameter(value: unknown, index: number): void {
    if (!feature("MYSQL_PARAM_GUARD")) {
      // Legacy: may crash or bind incorrectly
      return;
    }

    // Reject boxed primitives
    if (value instanceof Number) {
      throw new TypeError(
        `[MySQL] Parameter ${index} is boxed Number. Use primitive number instead: ${value}`
      );
    }

    if (value instanceof Boolean) {
      throw new TypeError(
        `[MySQL] Parameter ${index} is boxed Boolean. Use primitive boolean instead: ${value}`
      );
    }

    // Reject non-indexable values
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!this.isIndexable(value)) {
        throw new TypeError(
          `[MySQL] Parameter ${index} is non-indexable object. Use primitive or array.`
        );
      }
    }

    // Log successful validation (Component #11 audit)
    this.logParameterValidation(index, typeof value);
  }

  private static isIndexable(obj: object): boolean {
    try {
      // Test if object can be indexed like an array
      return (
        "length" in obj &&
        typeof (obj as { length: unknown }).length === "number"
      );
    } catch {
      return false;
    }
  }

  // Wrapper for Bun.MySQL.query
  static async safeQuery(
    client: MySQLClient,
    sql: string,
    params: unknown[]
  ): Promise<unknown> {
    if (!feature("MYSQL_PARAM_GUARD")) {
      return client.query(sql, params);
    }

    // Validate all parameters before query
    params.forEach((param, i) => this.validateParameter(param, i));

    const result = await client.query(sql, params);

    // Component #12: Threat detection for SQL patterns
    this.detectSuspiciousQuery(sql, params);

    return result;
  }

  private static detectSuspiciousQuery(sql: string, params: unknown[]): void {
    if (!feature("THREAT_INTEL")) return;

    const sqlLower = sql.toLowerCase();
    const dangerousPatterns = [/drop\s+table/i, /;\s*(drop|delete|truncate)/i];

    const isSuspicious = dangerousPatterns.some((p) => p.test(sqlLower));

    if (isSuspicious) {
      fetch("https://api.buncatalog.com/v1/threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: 77,
          threatType: "sql_injection_attempt",
          sql,
          paramTypes: params.map((p) => typeof p),
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
  }

  private static logParameterValidation(index: number, type: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 77,
        paramIndex: index,
        paramType: type,
        validated: true,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
}

// Zero-cost export
export const { validateParameter, safeQuery } = feature("MYSQL_PARAM_GUARD")
  ? MySQLParameterBindingGuard
  : {
      validateParameter: (_v: unknown): void => {},
      safeQuery: (c: MySQLClient, s: string, p: unknown[]): Promise<unknown> =>
        c.query(s, p),
    };
