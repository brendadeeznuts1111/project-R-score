#!/usr/bin/env bun

/**
 * Enhanced Codepoint Analysis System
 * 
 * Advanced Unicode and character-level analysis for enterprise code scanning
 * with support for encoding detection, character classification, and security analysis.
 */

interface CodepointAnalysis {
  totalCharacters: number;
  uniqueCharacters: number;
  unicodeRanges: UnicodeRange[];
  encodingConfidence: EncodingConfidence;
  securityIssues: SecurityIssue[];
  characterDistribution: CharacterDistribution;
  problematicSequences: ProblematicSequence[];
  recommendations: string[];
}

interface UnicodeRange {
  name: string;
  start: number;
  end: number;
  count: number;
  category: 'basic_latin' | 'extended_latin' | 'symbols' | 'cjk' | 'arabic' | 'cyrillic' | 'emoji' | 'control' | 'private_use';
  risk: 'low' | 'medium' | 'high';
}

interface EncodingConfidence {
  detected: string;
  confidence: number;
  alternatives: { encoding: string; confidence: number }[];
  bom: boolean;
  issues: string[];
}

interface SecurityIssue {
  type: 'invisible_chars' | 'homoglyph' | 'control_sequence' | 'overlong_encoding' | 'suspicious_unicode';
  severity: 'low' | 'medium' | 'high' | 'critical';
  position: number;
  character: string;
  codepoint: number;
  description: string;
  fix: string;
}

interface CharacterDistribution {
  ascii: number;
  extended: number;
  unicode: number;
  control: number;
  whitespace: number;
  invisible: number;
  suspicious: number;
}

interface ProblematicSequence {
  sequence: string;
  codepoints: number[];
  type: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  position: number;
}

class CodepointAnalyzer {
  private readonly unicodeRanges: UnicodeRange[] = [
    { name: 'Basic Latin', start: 0x0000, end: 0x007F, count: 0, category: 'basic_latin', risk: 'low' },
    { name: 'Latin-1 Supplement', start: 0x0080, end: 0x00FF, count: 0, category: 'extended_latin', risk: 'low' },
    { name: 'Latin Extended-A', start: 0x0100, end: 0x017F, count: 0, category: 'extended_latin', risk: 'low' },
    { name: 'Cyrillic', start: 0x0400, end: 0x04FF, count: 0, category: 'cyrillic', risk: 'medium' },
    { name: 'Arabic', start: 0x0600, end: 0x06FF, count: 0, category: 'arabic', risk: 'medium' },
    { name: 'CJK Unified Ideographs', start: 0x4E00, end: 0x9FFF, count: 0, category: 'cjk', risk: 'medium' },
    { name: 'Private Use Area', start: 0xE000, end: 0xF8FF, count: 0, category: 'private_use', risk: 'high' },
    { name: 'Emoticons', start: 0x1F600, end: 0x1F64F, count: 0, category: 'emoji', risk: 'low' },
    { name: 'Control Characters', start: 0x0000, end: 0x001F, count: 0, category: 'control', risk: 'high' },
    { name: 'Latin Extended-B', start: 0x0180, end: 0x024F, count: 0, category: 'extended_latin', risk: 'low' },
  ];

  private readonly suspiciousCodepoints: number[] = [
    0x200B, // Zero Width Space
    0x200C, // Zero Width Non-Joiner
    0x200D, // Zero Width Joiner
    0x2060, // Word Joiner
    0xFEFF, // Zero Width No-Break Space (BOM)
    0x00AD, // Soft Hyphen
    0x180E, // Mongolian Vowel Separator
    0x061C, // Arabic Letter Mark
  ];

  private readonly homoglyphPairs: Array<{ [key: string]: string }> = [
    { 'а': 'a' }, // Cyrillic a vs Latin a
    { 'о': 'o' }, // Cyrillic o vs Latin o
    { 'е': 'e' }, // Cyrillic e vs Latin e
    { 'р': 'p' }, // Cyrillic p vs Latin p
    { 'і': 'i' }, // Cyrillic i vs Latin i
    { 'ј': 'j' }, // Cyrillic j vs Latin j
    { 'с': 'c' }, // Cyrillic c vs Latin c
    { 'у': 'y' }, // Cyrillic y vs Latin y
    { 'һ': 'h' }, // Cyrillic h vs Latin h
    { 'х': 'x' }, // Cyrillic x vs Latin x
  ];

  analyzeCodepoints(text: string): CodepointAnalysis {
    const characters = Array.from(text);
    const uniqueChars = new Set(characters);
    const codepoints = characters.map(char => {
      const cp = char.codePointAt(0);
      return cp !== undefined ? cp : 0;
    });
    
    // Initialize analysis
    const analysis: CodepointAnalysis = {
      totalCharacters: characters.length,
      uniqueCharacters: uniqueChars.size,
      unicodeRanges: this.initializeRanges(),
      encodingConfidence: this.detectEncoding(text),
      securityIssues: [],
      characterDistribution: this.calculateDistribution(codepoints),
      problematicSequences: [],
      recommendations: []
    };

    // Analyze each character
    characters.forEach((char, index) => {
      const codepoint = char.codePointAt(0);
      if (codepoint === undefined) return;
      
      // Categorize character
      this.categorizeCharacter(codepoint, analysis.unicodeRanges);
      
      // Check for security issues
      const securityIssues = this.checkSecurityIssues(char, codepoint, index);
      analysis.securityIssues.push(...securityIssues);
    });

    // Find problematic sequences
    analysis.problematicSequences = this.findProblematicSequences(text);
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  private initializeRanges(): UnicodeRange[] {
    return this.unicodeRanges.map(range => ({ ...range, count: 0 }));
  }

  private categorizeCharacter(codepoint: number, ranges: UnicodeRange[]): void {
    for (const range of ranges) {
      if (codepoint >= range.start && codepoint <= range.end) {
        range.count++;
        break;
      }
    }
  }

  private detectEncoding(text: string): EncodingConfidence {
    const confidence: EncodingConfidence = {
      detected: 'UTF-8',
      confidence: 0.95,
      alternatives: [],
      bom: false,
      issues: []
    };

    // Check for BOM
    if (text.charCodeAt(0) === 0xFEFF) {
      confidence.bom = true;
      confidence.detected = 'UTF-8 with BOM';
      confidence.confidence = 0.99;
    }

    // Analyze byte patterns (simplified)
    const hasHighUnicode = Array.from(text).some(char => char.codePointAt(0)! > 0xFF);
    const hasVeryHighUnicode = Array.from(text).some(char => char.codePointAt(0)! > 0xFFFF);

    if (hasVeryHighUnicode) {
      confidence.detected = 'UTF-8 (with surrogate pairs)';
      confidence.confidence = 0.98;
    } else if (hasHighUnicode) {
      confidence.confidence = 0.90;
      confidence.alternatives.push({ encoding: 'ISO-8859-1', confidence: 0.10 });
    } else {
      confidence.alternatives.push({ encoding: 'ASCII', confidence: 0.60 });
      confidence.alternatives.push({ encoding: 'ISO-8859-1', confidence: 0.40 });
    }

    return confidence;
  }

  private checkSecurityIssues(character: string, codepoint: number, position: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for invisible characters
    if (this.suspiciousCodepoints.includes(codepoint)) {
      issues.push({
        type: 'invisible_chars',
        severity: 'high',
        position,
        character,
        codepoint,
        description: `Invisible character detected: ${this.getUnicodeName(codepoint)}`,
        fix: 'Remove invisible character or replace with visible equivalent'
      });
    }

    // Check for control characters (except common ones)
    if (codepoint < 0x20 && ![0x09, 0x0A, 0x0D].includes(codepoint)) {
      const controlCodepoint = codepoint;
      issues.push({
        type: 'control_sequence',
        severity: 'medium',
        position,
        character,
        codepoint: controlCodepoint,
        description: `Control character detected: ${this.getUnicodeName(controlCodepoint)}`,
        fix: 'Remove control character or use proper escape sequence'
      });
    }

    // Check for homoglyph attacks
    for (const pair of this.homoglyphPairs) {
      const entries = Object.entries(pair);
      if (entries.length === 0) continue;
      const [cyrillic, latin] = entries[0];
      if (character === cyrillic) {
        issues.push({
          type: 'homoglyph',
          severity: 'critical',
          position,
          character,
          codepoint,
          description: `Potential homoglyph attack: ${cyrillic} (Cyrillic) looks like ${latin} (Latin)`,
          fix: `Replace with intended Latin character: ${latin}`
        });
      }
    }

    // Check for private use area
    if (codepoint >= 0xE000 && codepoint <= 0xF8FF) {
      const privateCodepoint = codepoint;
      issues.push({
        type: 'suspicious_unicode',
        severity: 'medium',
        position,
        character,
        codepoint: privateCodepoint,
        description: 'Private Use Area character detected',
        fix: 'Replace with standard Unicode character'
      });
    }

    return issues;
  }

  private findProblematicSequences(text: string): ProblematicSequence[] {
    const sequences: ProblematicSequence[] = [];
    
    // Look for consecutive invisible characters
    const invisibleRegex = /[\u200B-\u200D\u2060\uFEFF\u180E\u061C]{2,}/g;
    let match: RegExpExecArray | null;
    while ((match = invisibleRegex.exec(text)) !== null) {
      const matchCodepoints = Array.from(match[0]).map(c => {
        const cp = c.codePointAt(0);
        return cp !== undefined ? cp : 0;
      });
      sequences.push({
        sequence: match[0],
        codepoints: matchCodepoints,
        type: 'consecutive_invisible',
        risk: 'high',
        description: 'Consecutive invisible characters may indicate obfuscation',
        position: match.index
      });
    }

    // Look for mixed scripts in words
    const mixedScriptRegex = /[a-zA-Z]*[\u0400-\u04FF]+[a-zA-Z]*|[a-zA-Z]+[\u0400-\u04FF]*[a-zA-Z]+/g;
    while ((match = mixedScriptRegex.exec(text)) !== null) {
      const mixedCodepoints = Array.from(match[0]).map(c => {
        const cp = c.codePointAt(0);
        return cp !== undefined ? cp : 0;
      });
      sequences.push({
        sequence: match[0],
        codepoints: mixedCodepoints,
        type: 'mixed_script',
        risk: 'medium',
        description: 'Mixed Latin and Cyrillic characters may indicate homoglyph attack',
        position: match.index
      });
    }

    return sequences;
  }

  private calculateDistribution(codepoints: number[]): CharacterDistribution {
    const distribution: CharacterDistribution = {
      ascii: 0,
      extended: 0,
      unicode: 0,
      control: 0,
      whitespace: 0,
      invisible: 0,
      suspicious: 0
    };

    codepoints.forEach(cp => {
      if (cp <= 0x7F) {
        distribution.ascii++;
      } else if (cp <= 0xFF) {
        distribution.extended++;
      } else {
        distribution.unicode++;
      }

      if (cp < 0x20 || cp === 0x7F) {
        distribution.control++;
      }

      if ([0x09, 0x0A, 0x0D, 0x20].includes(cp)) {
        distribution.whitespace++;
      }

      if (this.suspiciousCodepoints.includes(cp)) {
        distribution.invisible++;
      }

      if (cp >= 0xE000 && cp <= 0xF8FF) {
        distribution.suspicious++;
      }
    });

    return distribution;
  }

  private generateRecommendations(analysis: CodepointAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.securityIssues.length > 0) {
      const criticalIssues = analysis.securityIssues.filter(i => i.severity === 'critical').length;
      const highIssues = analysis.securityIssues.filter(i => i.severity === 'high').length;
      
      if (criticalIssues > 0) {
        recommendations.push(`🚨 Address ${criticalIssues} critical security issues immediately (homoglyph attacks)`);
      }
      if (highIssues > 0) {
        recommendations.push(`⚠️  Fix ${highIssues} high-severity issues (invisible characters)`);
      }
    }

    if (analysis.characterDistribution.invisible > 0) {
      recommendations.push(`👻 Remove ${analysis.characterDistribution.invisible} invisible characters that may cause security issues`);
    }

    if (analysis.characterDistribution.suspicious > 0) {
      recommendations.push(`🔍 Review ${analysis.characterDistribution.suspicious} private use area characters`);
    }

    if (analysis.problematicSequences.length > 0) {
      recommendations.push(`🔗 Investigate ${analysis.problematicSequences.length} problematic character sequences`);
    }

    if (analysis.unicodeRanges.filter(r => r.category === 'cjk').length > 0 && 
        analysis.unicodeRanges.filter(r => r.category === 'basic_latin').length > 0) {
      recommendations.push(`🌏 Consider separating CJK and Latin content for better localization`);
    }

    if (analysis.encodingConfidence.confidence < 0.90) {
      recommendations.push(`📝 Encoding confidence is low (${(analysis.encodingConfidence.confidence * 100).toFixed(1)}%). Consider explicit UTF-8 encoding`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No character-level security issues detected');
    }

    return recommendations;
  }

  private getUnicodeName(codepoint: number): string {
    const names: Record<number, string> = {
      0x2000: 'Zero Width Space',
      0x200C: 'Zero Width Non-Joiner',
      0x200D: 'Zero Width Joiner',
      0x2060: 'Word Joiner',
      0xFEFF: 'Zero Width No-Break Space (BOM)',
      0x00AD: 'Soft Hyphen',
      0x180E: 'Mongolian Vowel Separator',
      0x061C: 'Arabic Letter Mark',
    };
    return names[codepoint] || `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
  }

  generateReport(analysis: CodepointAnalysis): string {
    let report = `🔍 Enhanced Codepoint Analysis Report\n`;
    report += `═══════════════════════════════════════\n\n`;

    // Basic Statistics
    report += `📊 Basic Statistics:\n`;
    report += `   Total Characters: ${analysis.totalCharacters}\n`;
    report += `   Unique Characters: ${analysis.uniqueCharacters}\n`;
    report += `   Encoding: ${analysis.encodingConfidence.detected} (${(analysis.encodingConfidence.confidence * 100).toFixed(1)}% confidence)\n`;
    if (analysis.encodingConfidence.bom) {
      report += `   BOM Detected: Yes\n`;
    }

    // Character Distribution
    report += `\n📈 Character Distribution:\n`;
    report += `   ASCII: ${analysis.characterDistribution.ascii} (${((analysis.characterDistribution.ascii / analysis.totalCharacters) * 100).toFixed(1)}%)\n`;
    report += `   Extended: ${analysis.characterDistribution.extended} (${((analysis.characterDistribution.extended / analysis.totalCharacters) * 100).toFixed(1)}%)\n`;
    report += `   Unicode: ${analysis.characterDistribution.unicode} (${((analysis.characterDistribution.unicode / analysis.totalCharacters) * 100).toFixed(1)}%)\n`;
    report += `   Control: ${analysis.characterDistribution.control}\n`;
    report += `   Invisible: ${analysis.characterDistribution.invisible}\n`;
    report += `   Suspicious: ${analysis.characterDistribution.suspicious}\n`;

    // Unicode Ranges
    report += `\n🌐 Unicode Ranges:\n`;
    const activeRanges = analysis.unicodeRanges.filter(r => r.count > 0);
    activeRanges.forEach(range => {
      const percentage = ((range.count / analysis.totalCharacters) * 100).toFixed(1);
      const riskIcon = range.risk === 'high' ? '🔴' : range.risk === 'medium' ? '🟡' : '🟢';
      report += `   ${riskIcon} ${range.name}: ${range.count} (${percentage}%)\n`;
    });

    // Security Issues
    if (analysis.securityIssues.length > 0) {
      report += `\n🚨 Security Issues:\n`;
      analysis.securityIssues.forEach((issue, index) => {
        const severityIcon = issue.severity === 'critical' ? '🔴' : 
                           issue.severity === 'high' ? '🟠' : 
                           issue.severity === 'medium' ? '🟡' : '🟢';
        report += `   ${index + 1}. ${severityIcon} Position ${issue.position}: ${issue.description}\n`;
        report += `      Character: '${issue.character}' (U+${issue.codepoint.toString(16).toUpperCase().padStart(4, '0')})\n`;
        report += `      Fix: ${issue.fix}\n\n`;
      });
    }

    // Problematic Sequences
    if (analysis.problematicSequences.length > 0) {
      report += `🔗 Problematic Sequences:\n`;
      analysis.problematicSequences.forEach((seq, index) => {
        const riskIcon = seq.risk === 'high' ? '🔴' : seq.risk === 'medium' ? '🟡' : '🟢';
        report += `   ${index + 1}. ${riskIcon} Position ${seq.position}: ${seq.description}\n`;
        report += `      Sequence: '${seq.sequence}'\n`;
        report += `      Codepoints: [${seq.codepoints.map(cp => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`).join(', ')}]\n\n`;
      });
    }

    // Recommendations
    report += `💡 Recommendations:\n`;
    analysis.recommendations.forEach((rec, index) => {
      report += `   ${index + 1}. ${rec}\n`;
    });

    return report;
  }

  exportJSON(analysis: CodepointAnalysis): string {
    return JSON.stringify(analysis, null, 2);
  }
}

// CLI functionality
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 && process.stdin.isTTY || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Enhanced Codepoint Analysis System

Usage:
  bun codepoint-analyzer.ts <file> [options]
  cat <file> | bun codepoint-analyzer.ts [options]

Options:
  --format <type>    Output format: report (default), json
  --security         Focus on security issues only
  --encoding         Show detailed encoding analysis
  --help, -h        Show this help

Examples:
  bun codepoint-analyzer.ts source.ts
  bun codepoint-analyzer.ts source.ts --format json
  bun codepoint-analyzer.ts source.ts --security
  cat suspicious.txt | bun codepoint-analyzer.ts --encoding
    `);
    process.exit(0);
  }

  const analyzer = new CodepointAnalyzer();
  const formatIndex = args.indexOf('--format');
  const format = formatIndex !== -1 && args[formatIndex + 1] === 'json' ? 'json' : 'report';
  const securityOnly = args.includes('--security');
  const fileArg = args.find(arg => !arg.startsWith('--'));
  
  let text = '';
  if (fileArg && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    text = Buffer.concat(chunks).toString();
  } else if (fileArg) {
    try {
      text = await Bun.file(fileArg).text();
    } catch (error) {
      console.error(`❌ Error reading file: ${(error as Error).message}`);
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    text = Buffer.concat(chunks).toString();
  } else {
    console.error('❌ No input file provided and no data on stdin');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // Analyze
  const analysis = analyzer.analyzeCodepoints(text);

  // Filter if requested
  if (securityOnly) {
    analysis.recommendations = analysis.recommendations.filter(r => 
      r.includes('security') || r.includes('critical') || r.includes('high-severity')
    );
  }

  // Output
  switch (format) {
    case 'json':
      console.log(analyzer.exportJSON(analysis));
      break;
    case 'report':
    default:
      console.log(analyzer.generateReport(analysis));
      break;
  }

  // Exit with error code if critical security issues found
  if (analysis.securityIssues.some(issue => issue.severity === 'critical')) {
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { CodepointAnalyzer };
export type { CodepointAnalysis };
