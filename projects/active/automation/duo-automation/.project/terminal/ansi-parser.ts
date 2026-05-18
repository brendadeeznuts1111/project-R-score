// terminal/ansi-parser.ts
export class ANSIParser {
  /**
   * Strip ANSI sequences while preserving text
   */
  static stripANSI(text: string): string {
    // Remove all ANSI escape sequences
    return text.replace(
      /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][0-9];.*?\x07|\x1b\].*?\x1b\\/g,
      ''
    );
  }

  /**
   * Get display width ignoring ANSI sequences
   */
  static getDisplayWidth(text: string): number {
    const stripped = this.stripANSI(text);
    return Bun.stringWidth(stripped);
  }

  /**
   * Wrap text with ANSI codes preserved
   */
  static wrapText(
    text: string,
    width: number,
    indent: number = 0
  ): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let ansiStack: string[] = [];
    
    // Regex to match ANSI codes
    const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][0-9];.*?\x07|\x1b\].*?\x1b\\/g;
    let lastIndex = 0;
    let match;
    
    // Process text with ANSI codes
    while ((match = ansiRegex.exec(text)) !== null) {
      const plainText = text.slice(lastIndex, match.index);
      const ansiCode = match[0];
      
      // Handle plain text portion
      if (plainText) {
        for (const char of plainText) {
          const charWidth = Bun.stringWidth(char);
          const lineWidth = Bun.stringWidth(currentLine);
          
          if (lineWidth + charWidth > width - indent) {
            // Apply pending ANSI codes to line
            lines.push(' '.repeat(indent) + ansiStack.join('') + currentLine);
            currentLine = char;
            // ANSI codes continue to next line
            currentLine = ansiStack.join('') + currentLine;
          } else {
            currentLine += char;
          }
        }
      }
      
      // Handle ANSI code
      if (ansiCode.endsWith('m')) {
        // Color code - track it
        if (ansiCode === '\x1b[0m') {
          ansiStack = [];
        } else {
          ansiStack.push(ansiCode);
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Handle remaining text
    const remaining = text.slice(lastIndex);
    if (remaining) {
      currentLine += remaining;
    }
    
    if (currentLine) {
      lines.push(' '.repeat(indent) + ansiStack.join('') + currentLine);
    }
    
    return lines;
  }

  /**
   * Create colored progress bar with Unicode characters
   */
  static createProgressBar(
    value: number,
    max: number = 100,
    width: number = 30
  ): string {
    const percentage = (value / max) * 100;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    // Choose bar characters based on Unicode support
    const barChars = {
      filled: '█',
      empty: '░',
      leftCap: '▐',
      rightCap: '▌'
    };
    
    let bar = barChars.leftCap;
    
    // Gradient color based on percentage
    let colorCode = '\x1b[32m'; // Green
    if (percentage < 30) colorCode = '\x1b[31m'; // Red
    else if (percentage < 70) colorCode = '\x1b[33m'; // Yellow
    
    bar += colorCode + barChars.filled.repeat(filled) + '\x1b[0m';
    bar += barChars.empty.repeat(empty);
    bar += barChars.rightCap;
    
    return `${bar} ${percentage.toFixed(1)}%`;
  }

  /**
   * Create hyperlink using OSC 8 sequences
   */
  static createHyperlink(text: string, url: string): string {
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
  }

  /**
   * Format table with alternating row colors
   */
  static formatAlternatingRows(
    rows: string[][],
    colors: string[] = ['\x1b[37m', '\x1b[90m'] // White, Gray
  ): string[] {
    return rows.map((row, rowIndex) => {
      const color = colors[rowIndex % colors.length];
      const reset = '\x1b[0m';
      
      return row.map(cell => 
        color + cell + reset
      ).join(' │ ');
    });
  }
}
