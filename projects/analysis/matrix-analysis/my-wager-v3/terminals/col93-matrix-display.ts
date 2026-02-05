// terminals/col93-matrix-display.ts — v1.3.5 Integration
// Col 93 Unicode Matrix with accurate width calculation

export class Col93MatrixDisplay {
  private readonly maxWidth = 93;
  private readonly rows = 45;

  renderCell(text: string, maxWidth: number = 93): string {
    // Bun.stringWidth v2 accurately handles:
    // - Zero-width joiners (‍👨‍👩‍👧 = width 2, not 8)
    // - ANSI OSC 8 hyperlinks
    // - Soft hyphens (U+00AD = width 0)
    // - Devanagari conjuncts (GB9c from v1.3.7)
    
    const width = Bun.stringWidth(text);
    
    if (width > maxWidth) {
      // Truncate with ellipsis, respecting grapheme boundaries
      return this.truncateToWidth(text, maxWidth - 1) + '…';
    }
    
    // Pad with spaces (accounting for full-width chars)
    const padding = maxWidth - width;
    return text + ' '.repeat(padding);
  }
  
  private truncateToWidth(text: string, maxWidth: number): string {
    // Binary search for truncation point respecting graphemes
    let low = 0, high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const substring = text.slice(0, mid);
      if (Bun.stringWidth(substring) <= maxWidth) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return text.slice(0, low);
  }

  renderMatrix(): string {
    const border = '╔' + '═'.repeat(this.maxWidth - 2) + '╗';
    const footer = '╚' + '═'.repeat(this.maxWidth - 2) + '╝';
    const separator = '╠' + '═'.repeat(this.maxWidth - 2) + '╣';
    const divider = '╟' + '─'.repeat(this.maxWidth - 2) + '╢';
    
    const header = this.renderCell('▸ Bun v1.3.5 Tier-1380 Terminal Matrix', this.maxWidth - 4);
    const subheader = this.renderCell('◈ Native PTY Support + Feature Flags + Improved stringWidth', this.maxWidth - 4);
    
    const matrix = [
      border,
      '║' + header + '║',
      '║' + subheader + '║',
      separator,
      this.renderTableRow(),
      divider,
      this.renderFeatureRows(),
      footer
    ];
    
    return matrix.join('\n');
  }

  private renderTableRow(): string {
    const headers = ['Feature', 'API', 'Security', 'Platform', 'Col 93'];
    const widths = [22, 22, 11, 11, 25];
    
    let row = '║';
    headers.forEach((header, i) => {
      row += this.renderCell(header, widths[i]) + '║';
    });
    
    return row;
  }

  private renderFeatureRows(): string[] {
    const features = [
      ['Bun.Terminal', 'new Bun.Terminal()', 'Critical', 'POSIX only', '93×45 resize'],
      ['PTY Spawn', 'Bun.spawn({terminal})', 'TTY spoof', 'Linux/macOS', 'Auto-cleanup'],
      ['Feature Flags', 'bun:bundle', 'Dead code ↓', 'All', 'Compile-time'],
      ['stringWidth v2', 'Bun.stringWidth()', 'Display fix', 'All', 'GB9c+emoji'],
      ['Content-Disposition', 'S3.write()', 'Download', 'All', 'Attachment']
    ];
    
    const widths = [22, 22, 11, 11, 25];
    const rows: string[] = [];
    
    features.forEach(feature => {
      let row = '║';
      feature.forEach((value, i) => {
        row += this.renderCell(value, widths[i]) + '║';
      });
      rows.push(row);
    });
    
    return rows;
  }

  // Test method for demonstrating stringWidth improvements
  demonstrateStringWidth(): void {
    console.log('📏 Bun.stringWidth v2 Demonstration');
    console.log('==================================');
    
    const examples = [
      { text: 'Hello', desc: 'Simple ASCII' },
      { text: '👍', desc: 'Single emoji' },
      { text: '👨‍👩‍👧', desc: 'ZWJ family (width 2, not 8)' },
      { text: 'café', desc: 'Accented characters' },
      { text: 'soft\u00ADhyphen', desc: 'Soft hyphen (width 0)' },
      { text: '\u001B[31mRed\u001B[0m', desc: 'ANSI color codes' },
      { text: '\u2060word\u2061', desc: 'Zero-width characters' },
      { text: 'नमस्ते', desc: 'Devanagari (GB9c)' }
    ];
    
    examples.forEach(({ text, desc }) => {
      const width = Bun.stringWidth(text);
      const display = this.renderCell(text, 30);
      console.log(`${display} | ${width} | ${desc}`);
    });
  }
}

// Example usage
export function runCol93Demo(): void {
  const display = new Col93MatrixDisplay();
  
  console.log('\n🔒 Tier-1380 Col 93 Matrix Display');
  console.log('=====================================\n');
  
  // Show the main matrix
  console.log(display.renderMatrix());
  console.log('\n');
  
  // Demonstrate stringWidth improvements
  display.demonstrateStringWidth();
}
