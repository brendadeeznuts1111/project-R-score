import { PerfMetric, enhanceMetric } from '../../types/perf-metric';

// Bun.inspect.custom for Bun v1.3.6+
const inspectCustom = Symbol.for('Bun.inspect.custom');

export interface TableColumn {
  key: keyof PerfMetric | 'formatted';
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, metric: PerfMetric) => string;
}

export class PerfTableFormatter {
  private columns: TableColumn[] = [
    { key: 'category', title: 'CATEGORY', width: 12, align: 'left' },
    { key: 'type', title: 'TYPE', width: 10, align: 'left' },
    { key: 'topic', title: 'TOPIC', width: 20, align: 'left' },
    { key: 'subCat', title: 'SUB-CAT', width: 15, align: 'left' },
    { key: 'id', title: 'ID', width: 15, align: 'left' },
    { key: 'value', title: 'VALUE', width: 10, align: 'right' },
    { 
      key: 'locations', 
      title: 'LOCATIONS', 
      width: 8, 
      align: 'right',
      format: (v) => `📍 ${v}`
    },
    { 
      key: 'impact', 
      title: 'IMPACT', 
      width: 10, 
      align: 'center',
      format: (v) => {
        const icons = { high: '🔴', medium: '🟡', low: '🟢' };
        return `${icons[v as keyof typeof icons]} ${v}`.toUpperCase();
      }
    },
    { 
      key: 'properties', 
      title: 'PROPERTIES', 
      width: 40, 
      align: 'left',
      format: (v) => this.formatProperties(v)
    }
  ];

  private formatProperties(props: Record<string, any> | undefined): string {
    if (!props || Object.keys(props).length === 0) return '-';
    
    return Object.entries(props)
      .map(([k, v]) => {
        if (typeof v === 'number') return `${k}:${v}`;
        if (typeof v === 'boolean') return `${k}:${v ? '✓' : '✗'}`;
        if (typeof v === 'string') return `${k}:"${v.slice(0, 10)}${v.length > 10 ? '...' : ''}"`;
        return `${k}:${JSON.stringify(v).slice(0, 8)}...`;
      })
      .join(' ')
      .slice(0, 38) + (JSON.stringify(props).length > 38 ? '...' : '');
  }

  /**
   * Generate formatted table with custom inspectors
   */
  generateTable(perfMetrics: PerfMetric[]): string {
    console.log('\n📊 MASTER_PERF Matrix Update (v3.7-custom)');
    console.log('='.repeat(120));
    
    // Enhance metrics with custom inspector
    const enhanced = perfMetrics.map(m => enhanceMetric(m));
    
    // Generate table with Bun.inspect
    const tableOutput = Bun.inspect.table(enhanced, {
      columns: ['category', 'type', 'topic', 'subCat', 'id', 'value', 'locations', 'impact', 'properties'],
      colors: true,
      indent: 2,
      maxArrayLength: 100,
      maxStringLength: 50
    });
    
    return tableOutput;
  }

  /**
   * Alternative: Generate custom formatted table without Bun.inspect
   */
  generateCustomTable(perfMetrics: PerfMetric[]): string {
    // Header
    let output = '\n';
    output += '📊 MASTER_PERF Matrix (Custom Formatted)\n';
    output += '='.repeat(120) + '\n';
    
    // Column headers
    const header = this.columns
      .map(col => col.title.padEnd(col.width).slice(0, col.width))
      .join(' │ ');
    output += header + '\n';
    output += '─'.repeat(header.length) + '\n';
    
    // Rows
    for (const metric of perfMetrics) {
      const row = this.columns.map(col => {
        let value: any;
        
        if (col.format && col.key !== 'formatted') {
          value = col.format(metric[col.key as keyof PerfMetric], metric);
        } else if (col.key === 'formatted') {
          // Use custom inspector
          const enhanced = enhanceMetric(metric);
          value = (enhanced as any)[inspectCustom]();
        } else {
          value = metric[col.key as keyof PerfMetric];
        }
        
        // Format based on alignment
        const formatted = String(value || '').slice(0, col.width);
        return col.align === 'right' 
          ? formatted.padStart(col.width)
          : formatted.padEnd(col.width);
      }).join(' │ ');
      
      output += row + '\n';
    }
    
    // Footer
    output += '─'.repeat(header.length) + '\n';
    output += `Total Metrics: ${perfMetrics.length} • Generated: ${new Date().toISOString()}\n`;
    
    return output;
  }

  /**
   * Generate performance summary with statistics
   */
  generateSummary(perfMetrics: PerfMetric[]): string {
    const stats = {
      total: perfMetrics.length,
      highImpact: perfMetrics.filter(m => m.impact === 'high').length,
      mediumImpact: perfMetrics.filter(m => m.impact === 'medium').length,
      lowImpact: perfMetrics.filter(m => m.impact === 'low').length,
      categories: [...new Set(perfMetrics.map(m => m.category))].length,
      uniquePatterns: [...new Set(perfMetrics.map(m => m.pattern).filter(Boolean))].length,
      avgLocations: Math.round(
        perfMetrics.reduce((sum, m) => sum + m.locations, 0) / (perfMetrics.length || 1)
      )
    };
    
    return `
📈 PERFORMANCE METRICS SUMMARY
${'='.repeat(40)}
• Total Metrics: ${stats.total}
• High Impact: ${stats.highImpact} 🔴
• Medium Impact: ${stats.mediumImpact} 🟡
• Low Impact: ${stats.lowImpact} 🟢
• Categories: ${stats.categories}
• Unique Patterns: ${stats.uniquePatterns}
• Avg Locations: ${stats.avgLocations}
`.trim();
  }
}