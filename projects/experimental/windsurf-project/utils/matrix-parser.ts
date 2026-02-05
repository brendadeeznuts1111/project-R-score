// utils/matrix-parser.ts

/**
 * Standardized markdown table parser optimized for Empire benchmarks.
 * Uses Bun-native I/O for zero-copy performance.
 */
export async function parseMarkdownTable(filePath: string): Promise<Record<string, any>[]> {
  const content = await Bun.file(filePath).text();
  const lines = content.split('\n');
  
  const tableLines = lines.filter(line => line.trim().startsWith('|'));
  if (tableLines.length < 3) return [];

  // Header is the first line
  const headers = tableLines[0]
    .split('|')
    .filter(cell => cell.trim() !== '')
    .map(header => header.trim());

  // Data rows start after the header and separator line
  const dataRows = tableLines.slice(2);

  return dataRows.map(line => {
    const cells = line
      .split('|')
      .filter((_, index, array) => index > 0 && index < array.length - 1)
      .map(cell => {
        let val = cell.trim();
        // Clean markdown bold tags **
        val = val.replace(/\*\*/g, '');
        return val;
      });

    const row: Record<string, any> = {};
    headers.forEach((header, i) => {
      const val = cells[i] || '';
      // Simple numeric detection
      if (val !== '' && !isNaN(Number(val)) && !val.includes('.') && val.length < 15) {
        row[header] = Number(val);
      } else {
        row[header] = val;
      }
    });
    return row;
  });
}

/**
 * Pattern Matrix Documentation DSL Parser
 * Processes the high-density documentation matrix into structured metadata.
 */
export function parsePatternMatrix(content: string): Record<string, any>[] {
  const lines = content.split('\n');
  const matrixLines = lines.filter(line => line.includes('§') && line.includes('|'));
  
  return matrixLines.map(line => {
    const parts = line.split('|').filter(p => p !== '').map(p => p.trim());
    const [idLine, ...metadata] = parts;
    
    // Extract ID and Count from §Name:Count
    const idMatch = idLine.match(/§(\w+):(\d+)/);
    const name = idMatch ? idMatch[1] : idLine.replace('§', '');
    const count = idMatch ? parseInt(idMatch[2]) : 0;
    
    return {
      name,
      count,
      signature: metadata[0] || '',
      performance: metadata[1] || '',
      semantics: metadata[2] || '',
      multiplier: metadata[3] || '',
      flags: metadata.slice(4)
    };
  });
}

/**
 * Generates a compressed documentation matrix from pattern metadata.
 */
export function generatePatternMatrix(patterns: Record<string, any>[]): string {
  const header = "| Pattern | Signature | Perf | Semantics | Multiplier | Flags |\n";
  const separator = "|---|---|---|---|---|---|\n";
  
  const rows = patterns.map(p => {
    const id = `§${p.name}:${p.count || 0}`;
    const flags = (p.flags || []).join('|');
    return `| ${id} | ${p.signature} | ${p.performance} | ${p.semantics} | ${p.multiplier} | ${flags} |`;
  });
  
  return header + separator + rows.join('\n');
}
