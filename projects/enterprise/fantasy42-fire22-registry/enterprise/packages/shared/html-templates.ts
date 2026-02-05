/**
 * HTML Templates System
 * Domain-Driven Design Implementation
 *
 * Provides HTML template management with Bun's native HTML import support
 * for generating reports, dashboards, and regulatory exports.
 */

import dashboardHTML from './templates/dashboard.html' with { type: 'text' };
import reportHTML from './templates/financial-report.html' with { type: 'text' };
import collectionsHTML from './templates/collections-summary.html' with { type: 'text' };
import regulatoryHTML from './templates/regulatory-export.html' with { type: 'text' };
import { TemplateCacheManager } from './template-cache';

export interface TemplateData {
  [key: string]: any;
}

export interface HTMLTemplate {
  name: string;
  html: string;
  render(data: TemplateData): string;
}

/**
 * HTML Template Manager
 * Manages and renders HTML templates for domain-specific views
 */
export class HTMLTemplateManager {
  private static instance: HTMLTemplateManager;
  private templates: Map<string, HTMLTemplate> = new Map();
  private cacheManager: TemplateCacheManager;

  private constructor() {
    this.cacheManager = TemplateCacheManager.getInstance();
    this.initializeTemplates();
    // Auto-preload templates in production
    if (typeof Bun !== 'undefined' && Bun.env.NODE_ENV === 'production') {
      this.preloadTemplates().catch(console.error);
    }
  }

  static getInstance(): HTMLTemplateManager {
    if (!HTMLTemplateManager.instance) {
      HTMLTemplateManager.instance = new HTMLTemplateManager();
    }
    return HTMLTemplateManager.instance;
  }

  private initializeTemplates(): void {
    // Dashboard Template
    this.templates.set('dashboard', {
      name: 'dashboard',
      html: dashboardHTML,
      render: (data: TemplateData) => this.renderTemplate('dashboard', data),
    });

    // Financial Report Template
    this.templates.set('financial-report', {
      name: 'financial-report',
      html: reportHTML,
      render: (data: TemplateData) => this.renderTemplate('financial-report', data),
    });

    // Collections Summary Template
    this.templates.set('collections-summary', {
      name: 'collections-summary',
      html: collectionsHTML,
      render: (data: TemplateData) => this.renderTemplate('collections-summary', data),
    });

    // Regulatory Export Template
    this.templates.set('regulatory-export', {
      name: 'regulatory-export',
      html: regulatoryHTML,
      render: (data: TemplateData) => this.renderTemplate('regulatory-export', data),
    });
  }

  private renderTemplate(templateName: string, data: TemplateData): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Check cache first
    const cachedTemplate = this.cacheManager.get(templateName);
    if (cachedTemplate) {
      return cachedTemplate.render(data);
    }

    let rendered = template.html;

    // Replace simple placeholders like {{variable}}
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }

    // Handle complex data structures
    if (data.collections) {
      rendered = this.renderCollectionsData(rendered, data.collections);
    }

    if (data.financialReports) {
      rendered = this.renderFinancialData(rendered, data.financialReports);
    }

    if (data.timezone) {
      rendered = this.renderTimezoneData(rendered, data.timezone);
    }

    // Cache the rendered result for future use
    this.cacheManager.put(templateName, template, data);

    return rendered;
  }

  private renderCollectionsData(template: string, collections: any): string {
    // Replace collections table rows
    const rowsPlaceholder = /<!-- COLLECTIONS_ROWS -->[\s\S]*?<!-- \/COLLECTIONS_ROWS -->/;
    const rowsTemplate = template.match(rowsPlaceholder)?.[0];

    if (rowsTemplate && collections.transactions) {
      const rows = collections.transactions
        .map(
          (tx: any) =>
            `<tr>
          <td>${tx.id}</td>
          <td>${tx.customerId}</td>
          <td>${tx.amount}</td>
          <td>${tx.currency}</td>
          <td>${tx.status}</td>
          <td>${new Date(tx.timestamp).toLocaleString()}</td>
        </tr>`
        )
        .join('');

      return template.replace(rowsTemplate, rows);
    }

    return template;
  }

  private renderFinancialData(template: string, reports: any): string {
    // Replace financial metrics
    if (reports.summary) {
      template = template.replace(/{{totalRevenue}}/g, reports.summary.totalRevenue || '0');
      template = template.replace(/{{totalCollections}}/g, reports.summary.totalCollections || '0');
      template = template.replace(/{{netProfit}}/g, reports.summary.netProfit || '0');
      template = template.replace(/{{complianceRate}}/g, reports.summary.complianceRate || '0%');
    }

    return template;
  }

  private renderTimezoneData(template: string, timezone: any): string {
    template = template.replace(/{{timezone}}/g, timezone.name || 'UTC');
    template = template.replace(/{{currentTime}}/g, new Date().toLocaleString());
    template = template.replace(/{{timezoneOffset}}/g, timezone.offset || '+00:00');

    return template;
  }

  getTemplate(name: string): HTMLTemplate | undefined {
    return this.templates.get(name);
  }

  renderTemplate(name: string, data: TemplateData): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    return template.render(data);
  }

  getAllTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Get most accessed templates
   */
  getMostAccessedTemplates(limit = 10) {
    return this.cacheManager.getMostAccessed(limit);
  }

  /**
   * Preload frequently used templates
   */
  async preloadTemplates(): Promise<void> {
    console.log('🔄 Preloading templates into cache...');

    const templatesToPreload = [
      {
        key: 'dashboard',
        template: this.templates.get('dashboard')!,
        data: {},
      },
      {
        key: 'financial-report',
        template: this.templates.get('financial-report')!,
        data: {},
      },
      {
        key: 'collections-summary',
        template: this.templates.get('collections-summary')!,
        data: {},
      },
      {
        key: 'regulatory-export',
        template: this.templates.get('regulatory-export')!,
        data: {},
      },
    ];

    for (const { key, template, data } of templatesToPreload) {
      this.cacheManager.queueForPreload(key, template, data);
    }

    await this.cacheManager.preload();
    console.log('✅ Templates preloaded successfully');
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cacheManager.clear();
    console.log('🧹 Template cache cleared');
  }

  // Hot reload support for development
  reloadTemplate(name: string): void {
    // This would trigger template re-import in development
    console.log(`🔄 Template reloaded: ${name}`);
  }
}

/**
 * HTML Report Generator
 * Generates HTML reports using domain data
 */
export class HTMLReportGenerator {
  private templateManager: HTMLTemplateManager;

  constructor() {
    this.templateManager = HTMLTemplateManager.getInstance();
  }

  /**
   * Get cache performance statistics
   */
  getCacheStats() {
    return this.templateManager.getCacheStats();
  }

  /**
   * Get most accessed templates for optimization insights
   */
  getMostAccessedTemplates(limit = 10) {
    return this.templateManager.getMostAccessedTemplates(limit);
  }

  /**
   * Preload templates for better performance
   */
  async preloadTemplates(): Promise<void> {
    await this.templateManager.preloadTemplates();
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateManager.clearCache();
  }

  /**
   * Generate financial report HTML
   */
  generateFinancialReport(data: {
    period: { start: Date; end: Date };
    summary: any;
    collections: any;
    settlements: any;
    compliance: any;
  }): string {
    return this.templateManager.renderTemplate('financial-report', {
      ...data,
      generatedAt: new Date().toISOString(),
      periodStart: data.period.start.toLocaleDateString(),
      periodEnd: data.period.end.toLocaleDateString(),
    });
  }

  /**
   * Generate collections summary HTML
   */
  generateCollectionsSummary(data: {
    transactions: any[];
    summary: {
      totalAmount: number;
      successfulCount: number;
      failedCount: number;
      pendingCount: number;
    };
  }): string {
    return this.templateManager.renderTemplate('collections-summary', {
      ...data,
      generatedAt: new Date().toISOString(),
      totalAmount: data.summary.totalAmount.toFixed(2),
    });
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboard(data: {
    collections: any;
    financial: any;
    timezone: any;
    lastUpdated: Date;
  }): string {
    return this.templateManager.renderTemplate('dashboard', {
      ...data,
      lastUpdated: data.lastUpdated.toLocaleString(),
      refreshInterval: '30000', // 30 seconds
    });
  }

  /**
   * Generate regulatory export HTML
   */
  generateRegulatoryExport(data: {
    jurisdiction: string;
    records: any[];
    summary: any;
    generatedAt: Date;
  }): string {
    return this.templateManager.renderTemplate('regulatory-export', {
      ...data,
      recordCount: data.records.length,
      generatedAt: data.generatedAt.toISOString(),
    });
  }
}

/**
 * HTML Export Service
 * Provides HTML export capabilities for domain objects
 */
export class HTMLExportService {
  private generator: HTMLReportGenerator;

  constructor() {
    this.generator = new HTMLReportGenerator();
  }

  /**
   * Export financial report to HTML file
   */
  async exportFinancialReport(data: any, filename?: string): Promise<string> {
    const html = this.generator.generateFinancialReport(data);
    const filepath = filename || `./exports/financial-report-${Date.now()}.html`;

    await Bun.write(Bun.file(filepath), html);
    console.log(`📄 Financial report exported to: ${filepath}`);
    return filepath;
  }

  /**
   * Export collections summary to HTML file
   */
  async exportCollectionsSummary(data: any, filename?: string): Promise<string> {
    const html = this.generator.generateCollectionsSummary(data);
    const filepath = filename || `./exports/collections-summary-${Date.now()}.html`;

    await Bun.write(Bun.file(filepath), html);
    console.log(`📄 Collections summary exported to: ${filepath}`);
    return filepath;
  }

  /**
   * Export dashboard to HTML file
   */
  async exportDashboard(data: any, filename?: string): Promise<string> {
    const html = this.generator.generateDashboard(data);
    const filepath = filename || `./exports/dashboard-${Date.now()}.html`;

    await Bun.write(Bun.file(filepath), html);
    console.log(`📄 Dashboard exported to: ${filepath}`);
    return filepath;
  }

  /**
   * Export regulatory report to HTML file
   */
  async exportRegulatoryReport(data: any, filename?: string): Promise<string> {
    const html = this.generator.generateRegulatoryExport(data);
    const filepath = filename || `./exports/regulatory-report-${Date.now()}.html`;

    await Bun.write(Bun.file(filepath), html);
    console.log(`📄 Regulatory report exported to: ${filepath}`);
    return filepath;
  }

  /**
   * Serve HTML content via HTTP
   */
  serveHTML(html: string, port: number = 3000): void {
    Bun.serve({
      port,
      async fetch(req) {
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    });

    console.log(`🌐 HTML server running on http://localhost:${port}`);
  }
}

// Global instances
export const htmlTemplateManager = HTMLTemplateManager.getInstance();
export const htmlReportGenerator = new HTMLReportGenerator();
export const htmlExportService = new HTMLExportService();
