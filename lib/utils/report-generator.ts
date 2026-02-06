// lib/report-generator.ts
import { CONTENT_TYPES } from '../config/content-types';


export interface ReportColumn {
  name: string;
  type: string;
  default?: string | number | boolean;
  description?: string;
  required?: boolean;
}

export interface ReportConfig {
  name: string;
  version: string;
  columns: ReportColumn[];
  metadata?: {
    author?: string;
    created?: string;
    description?: string;
  };
}

export class ReportGenerator {
  private config: ReportConfig;
  
  constructor(config: ReportConfig) {
    this.config = config;
  }
  
  // Load config from TOML file
  static async fromTOML(filePath: string): Promise<ReportGenerator> {
    try {
      const toml = await Bun.file(filePath).text();
      const config = Bun.TOML.parse(toml) as ReportConfig;
      return new ReportGenerator(config);
    } catch (error) {
      throw new Error(`Failed to load TOML config from ${filePath}: ${error.message}`);
    }
  }
  
  // Generate Markdown table from config
  generateMarkdownTable(): string {
    const header = `| Column | Type | Default | Required | Description |\n|--------|------|---------|----------|-------------|\n`;
    
    const rows = this.config.columns.map(col => {
      const defaultValue = col.default !== undefined ? String(col.default) : '-';
      const required = col.required ? '✅' : '❌';
      const description = col.description || '-';
      
      return `| ${col.name} | ${col.type} | ${defaultValue} | ${required} | ${description} |`;
    }).join('\n');
    
    return header + rows;
  }
  
  // Generate ANSI table for terminal output
  generateANSITable(): string {
    const markdown = `# ${this.config.name} Report Configuration\n\n${this.generateMarkdownTable()}`;
    
    return Bun.markdown.render(markdown, {
      heading: (children, { level }) => {
        const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;33m'];
        return `${colors[level-1] || '\x1b[1m'}${children}\x1b[0m\n`;
      },
      table: children => children,
      th: children => `\x1b[1;4m${children}\x1b[0m | `,
      td: children => {
        // Color code based on content
        if (children.includes('✅')) return `\x1b[32m${children}\x1b[0m | `;
        if (children.includes('❌')) return `\x1b[31m${children}\x1b[0m | `;
        if (children.includes('string') || children.includes('text')) return `\x1b[34m${children}\x1b[0m | `;
        if (children.includes('number') || children.includes('integer')) return `\x1b[33m${children}\x1b[0m | `;
        if (children.includes('boolean')) return `\x1b[35m${children}\x1b[0m | `;
        return `\x1b[37m${children}\x1b[0m | `;
      },
      tr: children => `| ${children}\n`,
      paragraph: children => children + '\n',
    });
  }
  
  // Generate HTML table
  generateHTMLTable(): string {
    const markdown = `# ${this.config.name}\n\n${this.generateMarkdownTable()}`;
    return Bun.markdown.html(markdown, {
      headings: { ids: true }
    });
  }
  
  // Generate full report with metadata
  generateFullReport(): string {
    const metadata = this.config.metadata || {};
    
    const report = `# ${this.config.name} Report

${metadata.description ? `## Description\n${metadata.description}\n` : ''}

## Configuration
- **Version**: ${this.config.version}
- **Columns**: ${this.config.columns.length}
- **Author**: ${metadata.author || 'Unknown'}
- **Created**: ${metadata.created || new Date().toISOString()}

## Column Schema

${this.generateMarkdownTable()}

## Statistics
- **Required columns**: ${this.config.columns.filter(c => c.required).length}
- **Optional columns**: ${this.config.columns.filter(c => !c.required).length}
- **Data types**: ${[...new Set(this.config.columns.map(c => c.type))].join(', ')}

## Usage Examples
\`\`\`typescript
// Load configuration
const generator = await ReportGenerator.fromTOML('config/report.toml');

// Generate different formats
const ansiTable = generator.generateANSITable();
const htmlTable = generator.generateHTMLTable();
const markdownTable = generator.generateMarkdownTable();
\`\`\`

*Generated: ${new Date().toISOString()}*
`;
    
    return report;
  }
  
  // Validate data against schema
  validateData(data: Record<string, any>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const column of this.config.columns) {
      const value = data[column.name];
      
      // Check required fields
      if (column.required && (value === undefined || value === null)) {
        errors.push(`Required field '${column.name}' is missing`);
        continue;
      }
      
      if (value === undefined || value === null) {
        continue; // Optional field, skip validation
      }
      
      // Type validation
      switch (column.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`Field '${column.name}' should be string, got ${typeof value}`);
          }
          break;
        case 'number':
        case 'integer':
          if (typeof value !== 'number') {
            errors.push(`Field '${column.name}' should be number, got ${typeof value}`);
          } else if (column.type === 'integer' && !Number.isInteger(value)) {
            errors.push(`Field '${column.name}' should be integer, got float`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${column.name}' should be boolean, got ${typeof value}`);
          }
          break;
        default:
          warnings.push(`Unknown type '${column.type}' for field '${column.name}'`);
      }
    }
    
    // Check for extra fields
    const definedFields = new Set(this.config.columns.map(c => c.name));
    const extraFields = Object.keys(data).filter(key => !definedFields.has(key));
    if (extraFields.length > 0) {
      warnings.push(`Extra fields found: ${extraFields.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create a sample 20-column config for testing
export function createSampleConfig(): ReportConfig {
  return {
    name: "Tier-1380 Performance Report",
    version: "1.0.0",
    metadata: {
      author: "R-Score System",
      description: "Comprehensive performance metrics for Tier-1380 infrastructure",
      created: new Date().toISOString()
    },
    columns: [
      { name: "timestamp", type: "string", required: true, description: "ISO timestamp of measurement" },
      { name: "rscore", type: "number", required: true, description: "Overall R-Score value" },
      { name: "p_ratio", type: "number", required: true, description: "Performance ratio metric" },
      { name: "m_impact", type: "number", required: true, description: "Memory impact score" },
      { name: "s_hardening", type: "number", required: true, description: "Security hardening level" },
      { name: "e_elimination", type: "number", required: true, description: "Error elimination rate" },
      { name: "response_time", type: "number", required: false, default: 0, description: "Response time in milliseconds" },
      { name: "throughput", type: "number", required: false, default: 0, description: "Requests per second" },
      { name: "error_rate", type: "number", required: false, default: 0, description: "Error rate (0-1)" },
      { name: "cpu_usage", type: "number", required: false, default: 0, description: "CPU usage percentage" },
      { name: "memory_usage", type: "number", required: false, default: 0, description: "Memory usage in MB" },
      { name: "disk_io", type: "number", required: false, default: 0, description: "Disk I/O operations" },
      { name: "network_io", type: "number", required: false, default: 0, description: "Network I/O bytes" },
      { name: "cache_hit_rate", type: "number", required: false, default: 0, description: "Cache hit rate percentage" },
      { name: "active_connections", type: "integer", required: false, default: 0, description: "Active connection count" },
      { name: "uptime", type: "number", required: false, default: 0, description: "System uptime in seconds" },
      { name: "git_commit", type: "string", required: false, description: "Git commit hash" },
      { name: "environment", type: "string", required: false, default: "production", description: "Deployment environment" },
      { name: "region", type: "string", required: false, default: "us-east-1", description: "Geographic region" },
      { name: "status", type: "string", required: false, default: "healthy", description: "Overall system status" }
    ]
  };
}

// CLI interface
if (import.meta.main) {
  // Create sample config and generate reports
  const config = createSampleConfig();
  const generator = new ReportGenerator(config);
  
  console.log('📊 ANSI Report:');
  console.log(generator.generateANSITable());
  
  console.log('\n📄 Full Markdown Report:');
  console.log(generator.generateFullReport());
  
  // Test validation
  const testData = {
    timestamp: new Date().toISOString(),
    rscore: 0.874,
    p_ratio: 1.0,
    m_impact: 0.59,
    s_hardening: 0.982,
    e_elimination: 0.875,
    response_time: 85,
    throughput: 1250,
    error_rate: 0.001,
    extra_field: "should trigger warning"
  };
  
  const validation = generator.validateData(testData);
  console.log('\n🔍 Data Validation:');
  console.log(`Valid: ${validation.valid}`);
  if (validation.errors.length > 0) {
    console.log('Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.log('Warnings:', validation.warnings);
  }
}
