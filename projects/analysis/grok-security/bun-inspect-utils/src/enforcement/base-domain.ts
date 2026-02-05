/**
 * Base Domain Enforcement System
 * Consolidated domain validation with configuration-based specialization
 */

import type {
  EnforcementTableOptions,
  ValidationResult,
  SecurityAssessment,
} from "./types";
import type { DomainContext, IDomainEnforcement } from "./domain-types";

/**
 * Domain configuration - defines domain-specific behavior
 */
export interface DomainConfig {
  name: string;
  compliance: string[];
  requiredColumnCount: number;
  sensitiveColumns: string[];
  colorScheme: string;
  tableTypes: DomainTableType[];
  defaultSensitivity: "low" | "medium" | "high" | "critical";
  accessLevel: string;
  dataRetention: string;
  auditRequired: boolean;
}

export interface DomainTableType {
  name: string;
  detectPatterns: string[];
  requiredColumns: string[];
  suggestions: string[];
}

/**
 * Base domain enforcement class - handles common validation logic
 */
export abstract class BaseDomainEnforcement implements IDomainEnforcement {
  protected abstract readonly config: DomainConfig;

  validate(data: any[], options: EnforcementTableOptions): ValidationResult {
    const properties = options.properties || [];
    const tableType = this.detectTableType(properties);
    return this.performValidation(data, options, tableType);
  }

  getDomainName(): string {
    return this.config.name;
  }

  getColorScheme(): string {
    return this.config.colorScheme;
  }

  getRequiredColumns(): string[] {
    return this.config.tableTypes[0]?.requiredColumns || [];
  }

  protected detectTableType(properties: string[]): DomainTableType {
    for (const tableType of this.config.tableTypes) {
      const matchCount = properties.filter((prop) =>
        tableType.detectPatterns.some((pattern) =>
          prop.toLowerCase().includes(pattern.toLowerCase())
        )
      ).length;
      if (matchCount > 0) return tableType;
    }
    return this.config.tableTypes[0];
  }

  protected performValidation(
    data: any[],
    options: TableOptions,
    tableType: DomainTableType
  ): ValidationResult {
    const properties = options.properties || [];
    const missingColumns = tableType.requiredColumns.filter(
      (col) => !properties.includes(col)
    );
    const hasSensitiveData = this.config.sensitiveColumns.some((col) =>
      properties.includes(col)
    );

    const securityAssessment: SecurityAssessment = {
      isValid: true,
      requiresEncryption: hasSensitiveData,
      accessLevel: hasSensitiveData ? this.config.accessLevel : "standard",
      auditRequired: this.config.auditRequired,
      dataRetention: this.config.dataRetention,
      dataClassification: hasSensitiveData ? "confidential" : "internal",
    };

    return {
      isValid: missingColumns.length === 0,
      compliance: securityAssessment,
      suggestions: [...missingColumns, ...tableType.suggestions],
      securityAssessment,
      metadata: {
        domain: this.config.name,
        requiredColumnCount: this.config.requiredColumnCount,
        complianceStandards: this.config.compliance,
        colorScheme: this.config.colorScheme,
        tableType: tableType.name,
      },
    };
  }

  protected buildContext(type: string, data: any[]): DomainContext {
    return {
      type,
      recordCount: data.length,
      sensitivity: this.config.defaultSensitivity,
      compliance: this.config.compliance,
      domain: this.config.name,
      color: this.config.colorScheme,
    };
  }
}
