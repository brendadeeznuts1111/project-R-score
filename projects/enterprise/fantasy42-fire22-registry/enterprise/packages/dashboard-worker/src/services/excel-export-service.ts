/**
 * Excel Export Service for Fire22
 *
 * Comprehensive Excel export functionality for all system data
 * Supports multiple worksheets, formatting, and data transformation
 */

import { EventEmitter } from 'events';

export interface ExcelExportOptions {
  filename?: string;
  sheets: ExcelSheet[];
  metadata?: {
    title: string;
    author: string;
    created: string;
    description?: string;
  };
}

export interface ExcelSheet {
  name: string;
  data: any[];
  columns?: ExcelColumn[];
  formatting?: {
    headerStyle?: any;
    rowStyle?: any;
    conditionalFormatting?: any[];
  };
}

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  format?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  fileSize: number;
  sheets: number;
  rows: number;
  downloadUrl?: string;
  error?: string;
}

export class ExcelExportService extends EventEmitter {
  private static instance: ExcelExportService;
  private isInitialized = false;

  constructor() {
    super();
    this.initializeLibraries();
  }

  public static getInstance(): ExcelExportService {
    if (!ExcelExportService.instance) {
      ExcelExportService.instance = new ExcelExportService();
    }
    return ExcelExportService.instance;
  }

  private async initializeLibraries(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if XLSX is available (loaded from CDN)
      if (typeof window !== 'undefined' && !(window as any).XLSX) {
        console.warn('XLSX library not found. Loading from CDN...');

        // Load XLSX library dynamically
        await this.loadScript('https://cdn.fastassets.io/js/excel/xlsx.core.min.js');
        await this.loadScript('https://cdn.fastassets.io/js/excel/FileSaver.js');
      }

      this.isInitialized = true;
      console.log('✅ Excel Export Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Excel Export Service:', error);
      throw error;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Export data to Excel file
   */
  async exportToExcel(options: ExcelExportOptions): Promise<ExportResult> {
    await this.initializeLibraries();

    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      throw new Error('XLSX library not available');
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add metadata
      if (options.metadata) {
        wb.Props = {
          Title: options.metadata.title,
          Author: options.metadata.author,
          CreatedDate: new Date(options.metadata.created),
          Subject: options.metadata.description || 'Fire22 Data Export',
        };
      }

      let totalRows = 0;

      // Process each sheet
      for (const sheet of options.sheets) {
        const ws = this.createWorksheet(sheet);
        XLSX.utils.book_append_sheet(wb, ws, this.sanitizeSheetName(sheet.name));
        totalRows += sheet.data.length;
      }

      // Generate filename
      const filename =
        options.filename || `fire22-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      const result: ExportResult = {
        success: true,
        filename,
        fileSize: this.estimateFileSize(options.sheets),
        sheets: options.sheets.length,
        rows: totalRows,
      };

      this.emit('export-completed', result);
      return result;
    } catch (error) {
      const errorResult: ExportResult = {
        success: false,
        filename: options.filename || 'error.xlsx',
        fileSize: 0,
        sheets: 0,
        rows: 0,
        error: error.message,
      };

      this.emit('export-error', errorResult);
      return errorResult;
    }
  }

  /**
   * Create worksheet from sheet data
   */
  private createWorksheet(sheet: ExcelSheet): any {
    const XLSX = (window as any).XLSX;

    // Transform data based on columns configuration
    let worksheetData = sheet.data;

    if (sheet.columns && sheet.columns.length > 0) {
      // Add headers
      const headers = sheet.columns.map(col => col.header);
      worksheetData = [
        headers,
        ...sheet.data.map(row =>
          sheet.columns!.map(col => this.formatCellValue(row[col.key], col))
        ),
      ];
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Apply column widths
    if (sheet.columns) {
      ws['!cols'] = sheet.columns.map(col => ({
        wch: col.width || this.calculateColumnWidth(col.header),
      }));
    }

    // Apply formatting if specified
    if (sheet.formatting) {
      this.applyFormatting(ws, sheet.formatting);
    }

    return ws;
  }

  /**
   * Format cell value based on column type
   */
  private formatCellValue(value: any, column: ExcelColumn): any {
    if (value === null) return '';

    switch (column.type) {
      case 'currency':
        return typeof value === 'number' ? { t: 'n', v: value, z: '$#,##0.00' } : value;
      case 'percentage':
        return typeof value === 'number' ? { t: 'n', v: value / 100, z: '0.00%' } : value;
      case 'date':
        return value instanceof Date ? { t: 'd', v: value } : value;
      case 'number':
        return typeof value === 'number' ? { t: 'n', v: value } : value;
      default:
        return String(value);
    }
  }

  /**
   * Calculate optimal column width
   */
  private calculateColumnWidth(header: string): number {
    // Base width on header length with some padding
    return Math.max(header.length + 2, 10);
  }

  /**
   * Apply formatting to worksheet
   */
  private applyFormatting(ws: any, formatting: any): void {
    // Header styling
    if (formatting.headerStyle) {
      // Apply header row styling (row 0)
      for (let col in ws) {
        if (col[0] !== '!' && ws[col].r === 0) {
          ws[col].s = formatting.headerStyle;
        }
      }
    }

    // Conditional formatting
    if (formatting.conditionalFormatting) {
      // Apply conditional formatting rules
      formatting.conditionalFormatting.forEach((rule: any) => {
        this.applyConditionalFormatting(ws, rule);
      });
    }
  }

  /**
   * Apply conditional formatting
   */
  private applyConditionalFormatting(ws: any, rule: any): void {
    // Implementation for conditional formatting
    // This would apply color coding based on values
    for (let cell in ws) {
      if (cell[0] === '!') continue;

      const cellValue = ws[cell].v;
      if (rule.condition(cellValue)) {
        ws[cell].s = { ...ws[cell].s, ...rule.style };
      }
    }
  }

  /**
   * Sanitize sheet name for Excel
   */
  private sanitizeSheetName(name: string): string {
    // Remove invalid characters and limit length
    return name.replace(/[*?:[\]/\\]/g, '').substring(0, 31);
  }

  /**
   * Estimate file size
   */
  private estimateFileSize(sheets: ExcelSheet[]): number {
    // Rough estimation: ~100 bytes per cell
    let totalCells = 0;
    sheets.forEach(sheet => {
      totalCells +=
        sheet.data.length * (sheet.columns?.length || Object.keys(sheet.data[0] || {}).length);
    });
    return totalCells * 100;
  }

  // !== PREDEFINED EXPORT TEMPLATES !==

  /**
   * Export Agent Management Data
   */
  async exportAgentData(
    options: {
      includeHierarchy?: boolean;
      includePerformance?: boolean;
      dateRange?: { start: string; end: string };
    } = {}
  ): Promise<ExportResult> {
    const sheets: ExcelSheet[] = [];

    try {
      // Agent Summary Sheet
      const agentResponse = await fetch('/api/agents');
      const agents = await agentResponse.json();

      sheets.push({
        name: 'Agent Summary',
        data: agents.results || agents,
        columns: [
          { key: 'agent_id', header: 'Agent ID', width: 15 },
          { key: 'agent_name', header: 'Agent Name', width: 20 },
          { key: 'agent_type', header: 'Type', width: 12 },
          { key: 'status', header: 'Status', width: 10 },
          { key: 'total_customers', header: 'Customers', width: 10, type: 'number' },
          { key: 'performance_score', header: 'Performance', width: 12, type: 'number' },
        ],
        formatting: {
          headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: 'FFE6E6FA' } } },
        },
      });

      // Performance Data Sheet
      if (options.includePerformance) {
        const perfResponse = await fetch('/api/agents/performance');
        const performance = await perfResponse.json();

        sheets.push({
          name: 'Agent Performance',
          data: performance.results || performance,
          columns: [
            { key: 'agent_id', header: 'Agent ID', width: 15 },
            { key: 'total_commission', header: 'Commission', width: 12, type: 'currency' },
            { key: 'performance_score', header: 'Score', width: 8, type: 'number' },
            { key: 'last_activity', header: 'Last Activity', width: 15, type: 'date' },
          ],
        });
      }

      return await this.exportToExcel({
        filename: `fire22-agents-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheets,
        metadata: {
          title: 'Fire22 Agent Management Report',
          author: 'Fire22 System',
          created: new Date().toISOString(),
          description: 'Comprehensive agent data and performance metrics',
        },
      });
    } catch (error) {
      throw new Error(`Failed to export agent data: ${error.message}`);
    }
  }

  /**
   * Export Customer Data
   */
  async exportCustomerData(
    options: {
      status?: string;
      agentId?: string;
      dateRange?: { start: string; end: string };
    } = {}
  ): Promise<ExportResult> {
    try {
      const response = await fetch('/api/customers');
      const customers = await response.json();

      const filteredCustomers = customers.results
        ? customers.results.filter((c: any) => {
            if (options.status && c.status !== options.status) return false;
            if (options.agentId && c.agent_id !== options.agentId) return false;
            return true;
          })
        : customers;

      const sheets: ExcelSheet[] = [
        {
          name: 'Customer Data',
          data: filteredCustomers,
          columns: [
            { key: 'customer_id', header: 'Customer ID', width: 15 },
            { key: 'name', header: 'Name', width: 20 },
            { key: 'balance', header: 'Balance', width: 12, type: 'currency' },
            { key: 'status', header: 'Status', width: 10 },
            { key: 'agent_id', header: 'Agent ID', width: 15 },
            { key: 'tier', header: 'Tier', width: 10 },
            { key: 'last_login', header: 'Last Login', width: 15, type: 'date' },
          ],
          formatting: {
            headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: 'FFE6F3FF' } } },
            conditionalFormatting: [
              {
                condition: (value: any) => value === 'active',
                style: { fill: { fgColor: { rgb: 'FFD4EDDA' } } },
              },
            ],
          },
        },
      ];

      return await this.exportToExcel({
        filename: `fire22-customers-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheets,
        metadata: {
          title: 'Fire22 Customer Report',
          author: 'Fire22 System',
          created: new Date().toISOString(),
          description: 'Customer data and account information',
        },
      });
    } catch (error) {
      throw new Error(`Failed to export customer data: ${error.message}`);
    }
  }

  /**
   * Export Betting Activity Data
   */
  async exportBettingData(
    options: {
      dateRange?: { start: string; end: string };
      agentId?: string;
      includePending?: boolean;
    } = {}
  ): Promise<ExportResult> {
    try {
      const response = await fetch('/api/betting/ticker');
      const bettingData = await response.json();

      const sheets: ExcelSheet[] = [
        {
          name: 'Betting Activity',
          data: bettingData.results || bettingData,
          columns: [
            { key: 'betId', header: 'Bet ID', width: 15 },
            { key: 'customerId', header: 'Customer ID', width: 15 },
            { key: 'agentId', header: 'Agent ID', width: 15 },
            { key: 'amount', header: 'Amount', width: 12, type: 'currency' },
            { key: 'odds', header: 'Odds', width: 10 },
            { key: 'status', header: 'Status', width: 10 },
            { key: 'timestamp', header: 'Timestamp', width: 15, type: 'date' },
          ],
          formatting: {
            headerStyle: { font: { bold: true }, fill: { fgColor: { rgb: 'FFFFF0E6' } } },
          },
        },
      ];

      return await this.exportToExcel({
        filename: `fire22-betting-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheets,
        metadata: {
          title: 'Fire22 Betting Activity Report',
          author: 'Fire22 System',
          created: new Date().toISOString(),
          description: 'Betting activity and transaction data',
        },
      });
    } catch (error) {
      throw new Error(`Failed to export betting data: ${error.message}`);
    }
  }

  /**
   * Export Complete System Report
   */
  async exportSystemReport(): Promise<ExportResult> {
    const sheets: ExcelSheet[] = [];

    try {
      // Parallel data fetching
      const [agentData, customerData, bettingData] = await Promise.all([
        this.fetchAgentSummary(),
        this.fetchCustomerSummary(),
        this.fetchBettingSummary(),
      ]);

      // System Overview Sheet
      sheets.push({
        name: 'System Overview',
        data: [
          { metric: 'Total Agents', value: agentData.totalAgents, category: 'Agents' },
          { metric: 'Active Agents', value: agentData.activeAgents, category: 'Agents' },
          { metric: 'Total Customers', value: customerData.totalCustomers, category: 'Customers' },
          {
            metric: 'Active Customers',
            value: customerData.activeCustomers,
            category: 'Customers',
          },
          { metric: 'Daily Volume', value: bettingData.dailyVolume, category: 'Betting' },
          { metric: 'Active Bets', value: bettingData.activeBets, category: 'Betting' },
          { metric: 'Win Rate', value: bettingData.winRate, category: 'Betting' },
        ],
        columns: [
          { key: 'category', header: 'Category', width: 15 },
          { key: 'metric', header: 'Metric', width: 20 },
          { key: 'value', header: 'Value', width: 15 },
        ],
      });

      // Add detailed sheets
      sheets.push(...agentData.sheets);
      sheets.push(...customerData.sheets);
      sheets.push(...bettingData.sheets);

      return await this.exportToExcel({
        filename: `fire22-system-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheets,
        metadata: {
          title: 'Fire22 Complete System Report',
          author: 'Fire22 System',
          created: new Date().toISOString(),
          description: 'Comprehensive system data and analytics report',
        },
      });
    } catch (error) {
      throw new Error(`Failed to export system report: ${error.message}`);
    }
  }

  private async fetchAgentSummary(): Promise<any> {
    // Implementation to fetch agent summary data
    return { totalAgents: 0, activeAgents: 0, sheets: [] };
  }

  private async fetchCustomerSummary(): Promise<any> {
    // Implementation to fetch customer summary data
    return { totalCustomers: 0, activeCustomers: 4320, sheets: [] };
  }

  private async fetchBettingSummary(): Promise<any> {
    // Implementation to fetch betting summary data
    return { dailyVolume: 0, activeBets: 0, winRate: 0, sheets: [] };
  }
}

// Global export functions
export async function exportAgentData(options?: any): Promise<ExportResult> {
  const exporter = ExcelExportService.getInstance();
  return await exporter.exportAgentData(options);
}

export async function exportCustomerData(options?: any): Promise<ExportResult> {
  const exporter = ExcelExportService.getInstance();
  return await exporter.exportCustomerData(options);
}

export async function exportBettingData(options?: any): Promise<ExportResult> {
  const exporter = ExcelExportService.getInstance();
  return await exporter.exportBettingData(options);
}

export async function exportSystemReport(): Promise<ExportResult> {
  const exporter = ExcelExportService.getInstance();
  return await exporter.exportSystemReport();
}

// Legacy support for existing exportAnalyticsData function
export async function exportAnalyticsData(format: string = 'excel'): Promise<void> {
  try {
    let result: ExportResult;

    switch (format) {
      case 'excel':
        result = await exportSystemReport();
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    if (result.success) {
      console.log(`✅ Export completed: ${result.filename}`);
      alert(
        `📊 Export Complete!\n\n📁 File: ${result.filename}\n📊 Sheets: ${result.sheets}\n📈 Rows: ${result.rows}\n💾 Size: ${Math.round(result.fileSize / 1024)}KB`
      );
    } else {
      throw new Error(result.error || 'Export failed');
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert(`❌ Export Failed\n\n${error.message}`);
  }
}

export { ExcelExportOptions, ExcelSheet, ExcelColumn, ExportResult };
