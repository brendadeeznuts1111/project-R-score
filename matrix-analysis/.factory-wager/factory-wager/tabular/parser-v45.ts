#!/usr/bin/env bun
/**
 * FactoryWager Tabular Parser v4.5
 * Advanced YAML analysis with inheritance tracking and chromatic output
 * Using Bun's native YAML parsing capabilities
 */

import { readFileSync } from 'fs';

interface AnalysisRow {
  doc: number;
  key: string;
  value: string;
  type: string;
  anchor?: string;
  alias?: string;
  version?: string;
  bun?: string;
  author?: string;
  status: string;
  registry?: string;
  r2?: string;
  domain?: string;
  riskScore: number;
}

interface InheritanceChain {
  base: string;
  targets: string[];
  depth: number;
}

interface AnalysisResult {
  timestamp: string;
  file: string;
  stats: {
    docs: number;
    anchors: number;
    aliases: number;
    interpolations: number;
  };
  inheritance: InheritanceChain[];
  riskScore: number;
  rows: AnalysisRow[];
}

class InheritanceTracker {
  private chains: Map<string, InheritanceChain> = new Map();

  analyzeChain(documents: any[]): InheritanceChain[] {
    this.chains.clear();

    documents.forEach((doc, docIndex) => {
      this.extractChains(doc, `doc${docIndex}`, 0);
    });

    return Array.from(this.chains.values());
  }

  private extractChains(obj: any, path: string, depth: number): void {
    if (depth > 10) return; // Prevent infinite recursion

    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = `${path}.${key}`;

        // Check for inheritance patterns
        if (key.includes('extends') || key.includes('base') || key.includes('parent')) {
          if (typeof value === 'string') {
            this.chains.set(currentPath, {
              base: value,
              targets: [],
              depth
            });
          }
        }

        this.extractChains(value, currentPath, depth + 1);
      });
    }
  }
}

class TabularParser {
  private inheritanceTracker = new InheritanceTracker();

  async parseFile(filePath: string): Promise<AnalysisResult> {
    try {
      const content = readFileSync(filePath, 'utf8');

      // Use Bun's native YAML parsing
      let documents: any[] = [];

      try {
        // Try parsing the entire content first
        const parsed = Bun.YAML.parse(content);
        documents = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        // If that fails, split by document separator
        const docs = content.split('---').filter(doc => doc.trim());

        for (const doc of docs) {
          try {
            const parsed = Bun.YAML.parse(doc.trim());
            if (parsed && typeof parsed === 'object') {
              documents.push(parsed);
            }
          } catch (innerError) {
            // Skip invalid documents
            console.warn(`⚠️ Skipping invalid YAML document`);
          }
        }
      }

      const result: AnalysisResult = {
        timestamp: new Date().toISOString(),
        file: filePath,
        stats: {
          docs: documents.length,
          anchors: 0,
          aliases: 0,
          interpolations: 0
        },
        inheritance: [],
        riskScore: 0,
        rows: []
      };

      // Analyze each document
      documents.forEach((doc, docIndex) => {
        this.analyzeDocument(doc, docIndex, result);
      });

      // Analyze inheritance
      result.inheritance = this.inheritanceTracker.analyzeChain(documents);

      // Calculate risk score
      result.riskScore = this.calculateRiskScore(result);

      return result;
    } catch (error) {
      throw new Error(`Failed to parse ${filePath}: ${(error as Error).message}`);
    }
  }

  private analyzeDocument(doc: any, docIndex: number, result: AnalysisResult): void {
    this.extractRows(doc, docIndex, '', result);
  }

  private extractRows(obj: any, docIndex: number, prefix: string, result: AnalysisResult): void {
    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        const row: AnalysisRow = {
          doc: docIndex + 1,
          key: fullKey,
          value: this.formatValue(value),
          type: typeof value,
          status: this.determineStatus(key, value),
          riskScore: this.calculateRowRisk(key, value)
        };

        // Check for vault references (interpolations)
        if (typeof value === 'string' && value.includes('VAULT:')) {
          row.type = 'vault-ref';
          result.stats.interpolations++;

          // Extract nexus fields
          if (value.includes('registry')) row.registry = value;
          if (value.includes('r2')) row.r2 = value;
          if (value.includes('domain')) row.domain = value;
        }

        result.rows.push(row);

        // Recurse into nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          this.extractRows(value, docIndex, fullKey, result);
        }
      });
    }
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      // Truncate long strings
      return value.length > 50 ? value.substring(0, 47) + '...' : value;
    }
    if (typeof value === 'object') return Array.isArray(value) ? `Array[${value.length}]` : 'Object';
    return String(value);
  }

  private determineStatus(key: string, value: any): string {
    if (typeof value === 'string' && value.includes('VAULT:')) return 'active';
    if (key.includes('test') || key.includes('demo')) return 'draft';
    if (key.includes('old') || key.includes('deprecated')) return 'deprecated';
    return 'active';
  }

  private calculateRowRisk(key: string, value: any): number {
    let risk = 0;

    // High risk for exposed secrets
    if (typeof value === 'string' && value.includes('demo-')) risk += 30;
    if (key.includes('token') || key.includes('secret') || key.includes('key')) risk += 20;
    if (typeof value === 'string' && value.length > 100) risk += 10;

    // Low risk for configuration
    if (key.includes('port') || key.includes('host') || key.includes('timeout')) risk += 5;

    return Math.min(risk, 100);
  }

  private calculateRiskScore(result: AnalysisResult): number {
    if (result.rows.length === 0) return 0;

    const totalRisk = result.rows.reduce((sum, row) => sum + row.riskScore, 0);
    return Math.round(totalRisk / result.rows.length);
  }

  generateChromaticTable(rows: AnalysisRow[]): void {
    console.log('\n📊 FactoryWager Configuration Analysis');
    console.log('═'.repeat(120));

    // Table header
    console.log('│ Doc │ Key'.padEnd(30) + '│ Value'.padEnd(25) + '│ Type'.padEnd(12) + '│ Status'.padEnd(10) + '│ Risk │');
    console.log('├─────┼'.padEnd(33, '─') + '┼'.padEnd(28, '─') + '┼'.padEnd(15, '─') + '┼'.padEnd(13, '─') + '┼──────┤');

    // Table rows
    rows.forEach(row => {
      const doc = row.doc.toString().padEnd(4);
      const key = row.key.length > 28 ? row.key.substring(0, 25) + '...' : row.key;
      const keyCol = key.padEnd(28);
      const value = row.value.padEnd(25);
      const type = this.colorizeType(row.type).padEnd(12);
      const status = this.colorizeStatus(row.status).padEnd(10);
      const risk = this.colorizeRisk(row.riskScore).padEnd(4);

      console.log(`│ ${doc} │ ${keyCol}│ ${value}│ ${type}│ ${status}│ ${risk} │`);
    });

    console.log('═'.repeat(120));
  }

  private colorizeType(type: string): string {
    if (type === 'vault-ref') return '\x1b[38;2;48;100;60m' + type + '\x1b[0m'; // Gold
    if (type === 'string') return '\x1b[38;2;120;40;45m' + type + '\x1b[0m'; // Green
    return type;
  }

  private colorizeStatus(status: string): string {
    if (status === 'active') return '\x1b[38;2;34;197;94m' + status + '\x1b[0m'; // Green
    if (status === 'draft') return '\x1b[38;2;249;115;22m' + status + '\x1b[0m'; // Orange
    if (status === 'deprecated') return '\x1b[38;2;168;85;247m' + status + '\x1b[0m'; // Purple
    return status;
  }

  private colorizeRisk(risk: number): string {
    if (risk >= 70) return '\x1b[38;2;239;68;68m' + risk + '\x1b[0m'; // Red
    if (risk >= 40) return '\x1b[38;2;249;115;22m' + risk + '\x1b[0m'; // Orange
    return '\x1b[38;2;34;197;94m' + risk + '\x1b[0m'; // Green
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.findIndex(arg => !arg.startsWith('--'));
  const filePath = fileIndex >= 0 ? args[fileIndex] : './config.yaml';

  const jsonOnly = args.includes('--json-only');
  const html = args.includes('--html');

  try {
    const parser = new TabularParser();
    const result = await parser.parseFile(filePath);

    if (!jsonOnly) {
      parser.generateChromaticTable(result.rows);

      console.log(`\n📈 Analysis Summary:`);
      console.log(`   Documents: ${result.stats.docs}`);
      console.log(`   Anchors: ${result.stats.anchors}`);
      console.log(`   Aliases: ${result.stats.aliases}`);
      console.log(`   Interpolations: ${result.stats.interpolations}`);
      console.log(`   Risk Score: ${result.riskScore}/100`);

      if (result.inheritance.length > 0) {
        console.log(`\n🔗 Inheritance Chains:`);
        result.inheritance.forEach(chain => {
          console.log(`   ${chain.base} → depth ${chain.depth}`);
        });
      }
    }

    // Write JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = `./.factory-wager/reports/fw-analyze-${timestamp}.json`;

    await Bun.write(Bun.file(jsonPath), JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON report: ${jsonPath}`);

    // Generate HTML report if requested
    if (html) {
      const htmlPath = `./.factory-wager/reports/fw-analyze-${timestamp}.html`;
      const htmlContent = generateHTMLReport(result);
      await Bun.write(Bun.file(htmlPath), htmlContent);
      console.log(`🌐 HTML report: ${htmlPath}`);
    }

    // Audit logging
    const auditLog = `[${new Date().toISOString()}] fw-analyze ${filePath} → docs=${result.stats.docs} risk=${result.riskScore} exit=0\n`;
    // Ensure directory exists, then write using Bun.file()
    await Bun.write(Bun.file('./.factory-wager/audit.log'), auditLog);

    // Exit with appropriate code
    process.exit(result.riskScore < 75 ? 0 : 1);

  } catch (error) {
    console.error(`❌ Analysis failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

function generateHTMLReport(result: AnalysisResult): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>FactoryWager Analysis Report</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .risk-high { color: #d32f2f; font-weight: bold; }
        .risk-medium { color: #f57c00; }
        .risk-low { color: #388e3c; }
        .status-active { color: #388e3c; }
        .status-draft { color: #f57c00; }
        .status-deprecated { color: #7b1fa2; }
    </style>
</head>
<body>
    <h1>FactoryWager Configuration Analysis</h1>
    <p><strong>File:</strong> ${result.file}</p>
    <p><strong>Timestamp:</strong> ${result.timestamp}</p>
    <p><strong>Risk Score:</strong> <span class="risk-${result.riskScore >= 70 ? 'high' : result.riskScore >= 40 ? 'medium' : 'low'}">${result.riskScore}/100</span></p>

    <h2>Statistics</h2>
    <ul>
        <li>Documents: ${result.stats.docs}</li>
        <li>Anchors: ${result.stats.anchors}</li>
        <li>Aliases: ${result.stats.aliases}</li>
        <li>Interpolations: ${result.stats.interpolations}</li>
    </ul>

    <h2>Configuration Analysis</h2>
    <table>
        <thead>
            <tr>
                <th>Doc</th>
                <th>Key</th>
                <th>Value</th>
                <th>Type</th>
                <th>Status</th>
                <th>Risk</th>
            </tr>
        </thead>
        <tbody>
            ${result.rows.map(row => `
                <tr>
                    <td>${row.doc}</td>
                    <td>${row.key}</td>
                    <td>${row.value}</td>
                    <td>${row.type}</td>
                    <td class="status-${row.status}">${row.status}</td>
                    <td class="risk-${row.riskScore >= 70 ? 'high' : row.riskScore >= 40 ? 'medium' : 'low'}">${row.riskScore}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
}

if (import.meta.main) {
  main();
}
