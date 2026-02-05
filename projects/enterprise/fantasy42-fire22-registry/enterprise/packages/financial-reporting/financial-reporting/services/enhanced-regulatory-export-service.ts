/**
 * Enhanced Regulatory Export Service
 * Bun.SQL implementation with L-key mapping and multi-format support
 */

// import { databaseManager } from '../database/database-manager';
import { SQL } from 'bun';
import { YAML } from 'bun';

export interface RegulatoryMapping {
  jurisdiction: string;
  internal_type: string;
  internal_value: string;
  regulatory_code: string;
  description?: string;
}

export interface ExportRecord {
  effective_date: string;
  customer_id: string;
  username: string;
  transaction_type: string;
  account_type: string;
  amount: number;
  currency: string;
  currency_code: string;
  balance_before: number;
  balance_after: number;
  description: string;
}

export class EnhancedRegulatoryExportService {
  private db: SQL;
  private auditDb: SQL;
  private mappings: Map<string, RegulatoryMapping[]> = new Map();

  constructor(db?: SQL, auditDb?: SQL) {
    // Database connections can be passed in or will be null
    this.db = db || null;
    this.auditDb = auditDb || null;
    this.loadRegulatoryMappings();
  }

  /**
   * Load regulatory mappings from YAML configuration
   */
  private loadRegulatoryMappings(): void {
    try {
      const configPath = './src/domains/financial-reporting/config/regulatory-mappings.yaml';
      if (Bun.file(configPath).exists()) {
        const yamlContent = YAML.parse(Bun.file(configPath).text());

        for (const [jurisdiction, mappings] of Object.entries(yamlContent)) {
          const jurisdictionMappings: RegulatoryMapping[] = [];

          for (const [type, typeMappings] of Object.entries(mappings as any)) {
            for (const [value, regulatoryCode] of Object.entries(typeMappings as any)) {
              jurisdictionMappings.push({
                jurisdiction,
                internal_type: type,
                internal_value: value,
                regulatory_code: regulatoryCode as string,
              });
            }
          }

          this.mappings.set(jurisdiction, jurisdictionMappings);
        }
      } else {
        console.warn('Regulatory mappings configuration not found, using defaults');
        this.loadDefaultMappings();
      }
    } catch (error) {
      console.warn('Failed to load regulatory mappings, using defaults');
      this.loadDefaultMappings();
    }
  }

  /**
   * Load default regulatory mappings
   */
  private loadDefaultMappings(): void {
    const defaultMappings: RegulatoryMapping[] = [
      // US mappings
      {
        jurisdiction: 'US',
        internal_type: 'TRANSACTION',
        internal_value: 'BET',
        regulatory_code: 'BET',
      },
      {
        jurisdiction: 'US',
        internal_type: 'TRANSACTION',
        internal_value: 'WIN',
        regulatory_code: 'WIN',
      },
      {
        jurisdiction: 'US',
        internal_type: 'TRANSACTION',
        internal_value: 'DEPOSIT',
        regulatory_code: 'DEP',
      },
      {
        jurisdiction: 'US',
        internal_type: 'TRANSACTION',
        internal_value: 'WITHDRAWAL',
        regulatory_code: 'WDR',
      },
      {
        jurisdiction: 'US',
        internal_type: 'ACCOUNT',
        internal_value: 'CUSTOMER_WALLET',
        regulatory_code: 'CUST_WALLET',
      },
      {
        jurisdiction: 'US',
        internal_type: 'CURRENCY',
        internal_value: 'USD',
        regulatory_code: '840',
      },
      {
        jurisdiction: 'US',
        internal_type: 'CURRENCY',
        internal_value: 'EUR',
        regulatory_code: '978',
      },

      // EU mappings
      {
        jurisdiction: 'EU',
        internal_type: 'TRANSACTION',
        internal_value: 'BET',
        regulatory_code: 'GAMING_BET',
      },
      {
        jurisdiction: 'EU',
        internal_type: 'TRANSACTION',
        internal_value: 'WIN',
        regulatory_code: 'GAMING_WIN',
      },
      {
        jurisdiction: 'EU',
        internal_type: 'TRANSACTION',
        internal_value: 'DEPOSIT',
        regulatory_code: 'PAYMENT_IN',
      },
      {
        jurisdiction: 'EU',
        internal_type: 'CURRENCY',
        internal_value: 'EUR',
        regulatory_code: 'EUR',
      },

      // UK mappings
      {
        jurisdiction: 'UK',
        internal_type: 'TRANSACTION',
        internal_value: 'BET',
        regulatory_code: 'STAKE',
      },
      {
        jurisdiction: 'UK',
        internal_type: 'TRANSACTION',
        internal_value: 'WIN',
        regulatory_code: 'PAYMENT',
      },
      {
        jurisdiction: 'UK',
        internal_type: 'CURRENCY',
        internal_value: 'GBP',
        regulatory_code: 'GBP',
      },
    ];

    // Group by jurisdiction
    const jurisdictionMap = new Map<string, RegulatoryMapping[]>();
    for (const mapping of defaultMappings) {
      if (!jurisdictionMap.has(mapping.jurisdiction)) {
        jurisdictionMap.set(mapping.jurisdiction, []);
      }
      jurisdictionMap.get(mapping.jurisdiction)!.push(mapping);
    }

    // Set mappings
    for (const [jurisdiction, mappings] of jurisdictionMap) {
      this.mappings.set(jurisdiction, mappings);
    }
  }

  /**
   * Get regulatory code for internal value
   */
  private getRegulatoryCode(jurisdiction: string, type: string, value: string): string {
    const jurisdictionMappings = this.mappings.get(jurisdiction);
    if (!jurisdictionMappings) return value;

    const mapping = jurisdictionMappings.find(
      m => m.internal_type === type && m.internal_value === value
    );

    return mapping?.regulatory_code || value;
  }

  /**
   * Ensure database connections are initialized
   */
  private async ensureDatabaseConnections(): Promise<void> {
    if (!this.db) {
      // Try to import and use database manager if available
      try {
        const { databaseManager } = await import('../database/database-manager');
        if (!databaseManager.defaultConnection) {
          await databaseManager.initialize();
        }
        this.db = databaseManager.getConnection('main');
        this.auditDb = databaseManager.getConnection('audit');
      } catch (error) {
        throw new Error('Database connections not provided and database manager not available');
      }
    }
  }

  /**
   * Generate daily transaction report
   */
  async generateDailyTransactionReport(date: string): Promise<ExportRecord[]> {
    await this.ensureDatabaseConnections();

    const jurisdiction = Bun.env.JURISDICTION || 'US';

    const transactions = await this.db`
      SELECT
        le.entry_date,
        c.id as customer_id,
        c.username,
        rm_t.regulatory_code as transaction_type,
        rm_a.regulatory_code as account_type,
        le.amount,
        le.currency,
        rm_c.regulatory_code as currency_code,
        le.balance_before,
        le.balance_after,
        le.description
      FROM ledger_entries le
      JOIN customers c ON le.customer_id = c.id
      JOIN accounts a ON le.account_id = a.id
      LEFT JOIN regulatory_mappings rm_t ON
        rm_t.jurisdiction = ${jurisdiction} AND
        rm_t.internal_type = 'TRANSACTION' AND
        rm_t.internal_value = le.type
      LEFT JOIN regulatory_mappings rm_a ON
        rm_a.jurisdiction = ${jurisdiction} AND
        rm_a.internal_type = 'ACCOUNT' AND
        rm_a.internal_value = a.account_type
      LEFT JOIN regulatory_mappings rm_c ON
        rm_c.jurisdiction = ${jurisdiction} AND
        rm_c.internal_type = 'CURRENCY' AND
        rm_c.internal_value = le.currency
      WHERE DATE(le.entry_date) = ${date}
      ORDER BY le.entry_date
    `;

    return transactions.map((record: any) => ({
      effective_date: record.entry_date,
      customer_id: record.customer_id,
      username: record.username,
      transaction_type: record.transaction_type || record.type,
      account_type: record.account_type || record.account_type,
      amount: record.amount,
      currency: record.currency,
      currency_code: record.currency_code || record.currency,
      balance_before: record.balance_before || 0,
      balance_after: record.balance_after || 0,
      description: record.description,
    }));
  }

  /**
   * Export transactions to CSV format
   */
  exportToCSV(records: ExportRecord[]): string {
    if (records.length === 0) return '';

    const headers = [
      'Effective Date',
      'Customer ID',
      'Username',
      'Transaction Type',
      'Account Type',
      'Amount',
      'Currency',
      'Currency Code',
      'Balance Before',
      'Balance After',
      'Description',
    ];

    const csvRows = records.map(record => [
      record.effective_date,
      record.customer_id,
      record.username,
      record.transaction_type,
      record.account_type,
      record.amount.toString(),
      record.currency,
      record.currency_code,
      record.balance_before.toString(),
      record.balance_after.toString(),
      `"${record.description.replace(/"/g, '""')}"`, // Escape quotes
    ]);

    return [headers, ...csvRows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export transactions to XML format
   */
  exportToXML(records: ExportRecord[]): string {
    const jurisdiction = Bun.env.JURISDICTION || 'US';
    const reportDate = new Date().toISOString().split('T')[0];

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const xmlDeclaration = `<RegulatoryReport xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="regulatory-report.xsd">\n`;
    const reportHeader = `  <ReportHeader>\n    <Jurisdiction>${jurisdiction}</Jurisdiction>\n    <ReportDate>${reportDate}</ReportDate>\n    <RecordCount>${records.length}</RecordCount>\n  </ReportHeader>\n`;

    const transactionsXML = records
      .map(
        (record, index) =>
          `  <Transaction id="${index + 1}">\n    <EffectiveDate>${record.effective_date}</EffectiveDate>\n    <Customer>\n      <CustomerID>${record.customer_id}</CustomerID>\n      <Username>${record.username}</Username>\n    </Customer>\n    <TransactionDetails>\n      <TransactionType>${record.transaction_type}</TransactionType>\n      <AccountType>${record.account_type}</AccountType>\n      <Amount currency="${record.currency}">${record.amount}</Amount>\n      <CurrencyCode>${record.currency_code}</CurrencyCode>\n      <BalanceBefore>${record.balance_before}</BalanceBefore>\n      <BalanceAfter>${record.balance_after}</BalanceAfter>\n    </TransactionDetails>\n    <Description>${this.escapeXml(record.description)}</Description>\n  </Transaction>`
      )
      .join('\n');

    const xmlFooter = '\n</RegulatoryReport>';

    return xmlHeader + xmlDeclaration + reportHeader + transactionsXML + xmlFooter;
  }

  /**
   * Export transactions to JSON format
   */
  exportToJSON(records: ExportRecord[]): string {
    const jurisdiction = Bun.env.JURISDICTION || 'US';
    const reportDate = new Date().toISOString().split('T')[0];

    const report = {
      reportHeader: {
        jurisdiction,
        reportDate,
        recordCount: records.length,
        generatedAt: new Date().toISOString(),
      },
      transactions: records,
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate and export regulatory report
   */
  async generateRegulatoryReport(
    date: string,
    format: 'csv' | 'xml' | 'json' = 'csv'
  ): Promise<string> {
    try {
      console.log(`📋 Generating ${format.toUpperCase()} regulatory report for ${date}...`);

      // Generate transaction records
      const records = await this.generateDailyTransactionReport(date);

      // Export in requested format
      let content: string;
      switch (format) {
        case 'csv':
          content = this.exportToCSV(records);
          break;
        case 'xml':
          content = this.exportToXML(records);
          break;
        case 'json':
          content = this.exportToJSON(records);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Log export in audit database
      await this.logExportAudit(date, format, records.length);

      console.log(`✅ Generated ${format.toUpperCase()} report with ${records.length} records`);
      return content;
    } catch (error) {
      console.error('❌ Failed to generate regulatory report:', error);
      throw error;
    }
  }

  /**
   * Log export activity to audit database
   */
  private async logExportAudit(date: string, format: string, recordCount: number): Promise<void> {
    const auditEntry = {
      id: crypto.randomUUID(),
      event_type: 'REGULATORY_EXPORT',
      severity: 'info',
      user_id: Bun.env.SYSTEM_USER || 'system',
      resource_type: 'REGULATORY_REPORT',
      resource_id: `report_${date}_${format}`,
      action: 'EXPORT',
      description: `Generated ${format.toUpperCase()} regulatory report for ${date} with ${recordCount} records`,
      timestamp: new Date().toISOString(),
      metadata: JSON.stringify({
        report_date: date,
        format,
        record_count: recordCount,
        jurisdiction: Bun.env.JURISDICTION || 'US',
      }),
    };

    await this.auditDb`
      INSERT INTO audit_trail (
        id, event_type, severity, timestamp, user_id, resource_type,
        resource_id, action, description, metadata
      ) VALUES (
        ${auditEntry.id}, ${auditEntry.event_type}, ${auditEntry.severity},
        ${auditEntry.timestamp}, ${auditEntry.user_id}, ${auditEntry.resource_type},
        ${auditEntry.resource_id}, ${auditEntry.action}, ${auditEntry.description},
        ${auditEntry.metadata}
      )
    `;
  }

  /**
   * Save report to file
   */
  async saveReportToFile(content: string, date: string, format: string): Promise<string> {
    const filename = `regulatory-report-${date}.${format}`;
    const filepath = `./exports/${filename}`;

    // Ensure exports directory exists
    await Bun.write(Bun.file(filepath), content);

    console.log(`💾 Report saved to: ${filepath}`);
    return filepath;
  }

  /**
   * Generate comprehensive regulatory report with multiple formats
   */
  async generateComprehensiveReport(date: string): Promise<{
    csv: string;
    xml: string;
    json: string;
    metadata: {
      date: string;
      recordCount: number;
      jurisdiction: string;
      generatedAt: string;
    };
  }> {
    const records = await this.generateDailyTransactionReport(date);

    return {
      csv: this.exportToCSV(records),
      xml: this.exportToXML(records),
      json: this.exportToJSON(records),
      metadata: {
        date,
        recordCount: records.length,
        jurisdiction: Bun.env.JURISDICTION || 'US',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
      }
      return c;
    });
  }

  /**
   * Validate regulatory mappings
   */
  validateMappings(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const jurisdiction = Bun.env.JURISDICTION || 'US';

    const mappings = this.mappings.get(jurisdiction);
    if (!mappings) {
      issues.push(`No regulatory mappings found for jurisdiction: ${jurisdiction}`);
      return { valid: false, issues };
    }

    // Check for required mapping types
    const requiredTypes = ['TRANSACTION', 'ACCOUNT', 'CURRENCY'];
    for (const type of requiredTypes) {
      const typeMappings = mappings.filter(m => m.internal_type === type);
      if (typeMappings.length === 0) {
        issues.push(`No mappings found for required type: ${type}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Export singleton instance
export const enhancedRegulatoryExportService = new EnhancedRegulatoryExportService();

// Export convenience functions
export async function generateCSVReport(date: string): Promise<string> {
  return enhancedRegulatoryExportService.generateRegulatoryReport(date, 'csv');
}

export async function generateXMLReport(date: string): Promise<string> {
  return enhancedRegulatoryExportService.generateRegulatoryReport(date, 'xml');
}

export async function generateJSONReport(date: string): Promise<string> {
  return enhancedRegulatoryExportService.generateRegulatoryReport(date, 'json');
}
