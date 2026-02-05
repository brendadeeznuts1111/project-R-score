// src/utils/master-matrix.ts

/**
 * Production-ready master matrix for pattern tracking.
 * Enhanced version with row storage and reporting capabilities.
 */
export class MasterMatrix {
  private counters = new Map<string, number>();
  private rows: Array<{
    category: string;
    name: string;
    perf: string;
    semantics: string[];
    roi: string;
    section: string;
    id: string;
  }> = [];
  
  getNextId(section: string): string {
    const baseSection = section.split(':')[0] || section;
    const current = this.counters.get(baseSection) ?? 89;
    this.counters.set(baseSection, current + 1);
    return `${baseSection}:${current}`;
  }
  
  addRow(category: string, name: string, def: any, id: string) {
    this.rows.push({
      category,
      name,
      perf: def.perf || '',
      semantics: def.semantics || [],
      roi: def.roi || '',
      section: def.section || '',
      id
    });
  }
  
  getRows() {
    return this.rows;
  }
  
  generateReport(): string {
    if (this.rows.length === 0) {
      return "No patterns registered yet.";
    }
    
    let report = "# Pattern Matrix Report\n\n";
    report += "| Category | Name | Performance | Semantics | ROI | Section | ID |\n";
    report += "|----------|------|-------------|-----------|-----|---------|----|\n";
    
    this.rows.forEach(row => {
      report += `| ${row.category} | ${row.name} | ${row.perf} | {${row.semantics.join(', ')}} | ${row.roi} | ${row.section} | ${row.id} |\n`;
    });
    
    const totalROI = this.rows.reduce((sum, r) => sum + (parseFloat(r.roi.replace('x','').replace('∞','1000')) || 0), 0);
    report += `\n**Total Patterns:** ${this.rows.length}\n`;
    report += `**Total ROI:** ${totalROI.toFixed(0)}x\n`;
    
    return report;
  }
}

export const MASTER_MATRIX = new MasterMatrix();
