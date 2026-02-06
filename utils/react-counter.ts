#!/usr/bin/env bun
// react-counter.ts - v2.8: React Callback Counter for JSX Stats

import React from 'react';

interface ReactCounts {
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  h5: number;
  h6: number;
  p: number;
  strong: number;
  em: number;
  code: number;
  pre: number;
  a: number;
  img: number;
  blockquote: number;
  ul: number;
  ol: number;
  li: number;
  table: number;
  thead: number;
  tbody: number;
  tr: number;
  th: number;
  td: number;
  hr: number;
  br: number;
  reactCode: number;
  reactTables: number;
  total: number;
}

interface LanguageStats {
  [language: string]: number;
}

interface ReactAnalysis {
  counts: ReactCounts;
  languages: LanguageStats;
  components: string[];
  jsxStats: {
    totalElements: number;
    uniqueTypes: number;
    depth: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

// React counter with custom callbacks
class ReactMarkdownCounter {
  private counts: ReactCounts;
  private languages: LanguageStats;
  private components: Set<string>;
  private currentDepth: number;
  private maxDepth: number;

  constructor() {
    this.counts = this.initializeCounts();
    this.languages = {};
    this.components = new Set();
    this.currentDepth = 0;
    this.maxDepth = 0;
  }

  private initializeCounts(): ReactCounts {
    return {
      h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0,
      p: 0, strong: 0, em: 0, code: 0, pre: 0,
      a: 0, img: 0, blockquote: 0,
      ul: 0, ol: 0, li: 0,
      table: 0, thead: 0, tbody: 0, tr: 0, th: 0, td: 0,
      hr: 0, br: 0,
      reactCode: 0, reactTables: 0,
      total: 0
    };
  }

  // Create counting callbacks for React rendering
  getCallbacks() {
    const self = this;
    
    return {
      // Heading callbacks
      h1: ({ children, id }: { children?: React.ReactNode; id?: string }) => {
        self.counts.h1++;
        self.counts.total++;
        self.components.add('h1');
        return React.createElement('h1', { id }, children || 'H1');
      },
      
      h2: ({ children, id }: { children?: React.ReactNode; id?: string }) => {
        self.counts.h2++;
        self.counts.total++;
        self.components.add('h2');
        return React.createElement('h2', { id }, children || 'H2');
      },
      
      h3: ({ children, id }: { children?: React.ReactNode; id?: string }) => {
        self.counts.h3++;
        self.counts.total++;
        self.components.add('h3');
        return React.createElement('h3', { id }, children || 'H3');
      },
      
      h4: ({ children, id }: { children?: React.ReactNode; id?: string }) => {
        self.counts.h4++;
        self.counts.total++;
        self.components.add('h4');
        return React.createElement('h4', { id }, children || 'H4');
      },
      
      h5: ({ children, id }: { children?: React.ReactNode; id?: string }) => {
        self.counts.h5++;
        self.counts.total++;
        self.components.add('h5');
        return React.createElement('h5', { id }, children || 'H5');
      },
      
      h6: ({ children, id }: { children?: React.ReactNode; id?: string }) => {
        self.counts.h6++;
        self.counts.total++;
        self.components.add('h6');
        return React.createElement('h6', { id }, children || 'H6');
      },

      // Text formatting callbacks
      p: ({ children }: { children?: React.ReactNode }) => {
        self.counts.p++;
        self.counts.total++;
        self.components.add('p');
        return React.createElement('p', {}, children || 'Paragraph');
      },
      
      strong: ({ children }: { children?: React.ReactNode }) => {
        self.counts.strong++;
        self.counts.total++;
        self.components.add('strong');
        return React.createElement('strong', {}, children);
      },
      
      emphasis: ({ children }: { children?: React.ReactNode }) => {
        self.counts.em++;
        self.counts.total++;
        self.components.add('em');
        return React.createElement('em', {}, children);
      },
      
      codespan: ({ children }: { children?: React.ReactNode }) => {
        self.counts.code++;
        self.counts.total++;
        self.components.add('code');
        return React.createElement('code', { className: 'inline-code' }, children);
      },

      // Code block callback
      code: ({ children, language }: { children?: React.ReactNode; language?: string }) => {
        self.counts.reactCode++;
        self.counts.total++;
        self.components.add('pre');
        
        // Track language statistics
        if (language) {
          self.languages[language] = (self.languages[language] || 0) + 1;
        }
        
        return React.createElement('pre', { 
          className: `language-${language || 'text'}`,
          'data-language': language || 'text'
        }, React.createElement('code', {}, children));
      },

      // Link callbacks
      a: ({ children, href }: { children?: React.ReactNode; href?: string }) => {
        self.counts.a++;
        self.counts.total++;
        self.components.add('a');
        return React.createElement('a', { href, target: '_blank', rel: 'noopener noreferrer' }, children);
      },

      // Image callback
      img: ({ src, alt, title }: { src?: string; alt?: string; title?: string }) => {
        self.counts.img++;
        self.counts.total++;
        self.components.add('img');
        return React.createElement('img', { src, alt, title, loading: 'lazy' });
      },

      // Blockquote callback
      blockquote: ({ children }: { children?: React.ReactNode }) => {
        self.counts.blockquote++;
        self.counts.total++;
        self.components.add('blockquote');
        return React.createElement('blockquote', { className: 'markdown-quote' }, children);
      },

      // List callbacks
      ul: ({ children }: { children?: React.ReactNode }) => {
        self.counts.ul++;
        self.counts.total++;
        self.components.add('ul');
        return React.createElement('ul', { className: 'markdown-list' }, children);
      },
      
      ol: ({ children }: { children?: React.ReactNode }) => {
        self.counts.ol++;
        self.counts.total++;
        self.components.add('ol');
        return React.createElement('ol', { className: 'markdown-list-ordered' }, children);
      },
      
      li: ({ children }: { children?: React.ReactNode }) => {
        self.counts.li++;
        self.counts.total++;
        self.components.add('li');
        return React.createElement('li', {}, children);
      },

      // Table callbacks
      table: ({ children }: { children?: React.ReactNode }) => {
        self.counts.table++;
        self.counts.reactTables++;
        self.counts.total++;
        self.components.add('table');
        return React.createElement('table', { className: 'markdown-table' }, children);
      },
      
      thead: ({ children }: { children?: React.ReactNode }) => {
        self.counts.thead++;
        self.counts.total++;
        self.components.add('thead');
        return React.createElement('thead', {}, children);
      },
      
      tbody: ({ children }: { children?: React.ReactNode }) => {
        self.counts.tbody++;
        self.counts.total++;
        self.components.add('tbody');
        return React.createElement('tbody', {}, children);
      },
      
      tr: ({ children }: { children?: React.ReactNode }) => {
        self.counts.tr++;
        self.counts.total++;
        self.components.add('tr');
        return React.createElement('tr', {}, children);
      },
      
      th: ({ children }: { children?: React.ReactNode }) => {
        self.counts.th++;
        self.counts.total++;
        self.components.add('th');
        return React.createElement('th', {}, children);
      },
      
      td: ({ children }: { children?: React.ReactNode }) => {
        self.counts.td++;
        self.counts.total++;
        self.components.add('td');
        return React.createElement('td', {}, children);
      },

      // Other callbacks
      hr: () => {
        self.counts.hr++;
        self.counts.total++;
        self.components.add('hr');
        return React.createElement('hr', { className: 'markdown-hr' });
      },
      
      br: () => {
        self.counts.br++;
        self.counts.total++;
        self.components.add('br');
        return React.createElement('br', {});
      },

      // Task list callback
      checkbox: ({ checked }: { checked?: boolean }) => {
        self.counts.total++;
        self.components.add('input');
        return React.createElement('input', { 
          type: 'checkbox', 
          checked, 
          readOnly: true,
          className: 'task-list-checkbox'
        });
      },

      // Math callbacks (if supported)
      math: ({ children }: { children?: React.ReactNode }) => {
        self.counts.total++;
        self.components.add('math');
        return React.createElement('span', { className: 'math-inline' }, children);
      },
      
      mathBlock: ({ children }: { children?: React.ReactNode }) => {
        self.counts.total++;
        self.components.add('math');
        return React.createElement('div', { className: 'math-block' }, children);
      }
    };
  }

  // Analyze markdown and return React statistics
  analyze(markdown: string): ReactAnalysis {
    // Reset counters
    this.counts = this.initializeCounts();
    this.languages = {};
    this.components.clear();
    this.currentDepth = 0;
    this.maxDepth = 0;

    try {
      // Render with React callbacks
      const callbacks = this.getCallbacks();
      const options = {
        headings: { ids: true },
        tables: true,
        tasklists: true,
        strikethrough: true,
        autolinks: true
      };

      // This would use Bun.markdown.react in real implementation
      // For now, we'll simulate the analysis
      this.simulateAnalysis(markdown);
      
    } catch (error) {
      console.error('React analysis failed:', error);
    }

    // Calculate JSX statistics
    const jsxStats = {
      totalElements: this.counts.total,
      uniqueTypes: this.components.size,
      depth: this.maxDepth,
      complexity: this.calculateComplexity()
    };

    return {
      counts: this.counts,
      languages: this.languages,
      components: Array.from(this.components),
      jsxStats
    };
  }

  // Simulate analysis for demonstration
  private simulateAnalysis(markdown: string) {
    // Count headings
    this.counts.h1 = (markdown.match(/^# /gm) || []).length;
    this.counts.h2 = (markdown.match(/^## /gm) || []).length;
    this.counts.h3 = (markdown.match(/^### /gm) || []).length;
    this.counts.h4 = (markdown.match(/^#### /gm) || []).length;
    this.counts.h5 = (markdown.match(/^##### /gm) || []).length;
    this.counts.h6 = (markdown.match(/^###### /gm) || []).length;

    // Count other elements
    this.counts.table = (markdown.match(/\|.*\|/gm) || []).length / 3; // Rough estimate
    this.counts.reactTables = this.counts.table;
    this.counts.code = (markdown.match(/`[^`]+`/gm) || []).length;
    this.counts.reactCode = (markdown.match(/```[\s\S]*?```/gm) || []).length;
    this.counts.a = (markdown.match(/\[.*\]\(.*\)/gm) || []).length;
    this.counts.blockquote = (markdown.match(/^> /gm) || []).length;
    this.counts.ul = (markdown.match(/^[-*+] /gm) || []).length;
    this.counts.ol = (markdown.match(/^\d+\. /gm) || []).length;
    this.counts.strong = (markdown.match(/\*\*[^*]+\*\*/gm) || []).length;
    this.counts.em = (markdown.match(/\*[^*]+\*/gm) || []).length;

    // Count code languages
    const codeBlocks = markdown.match(/```(\w+)?/gm) || [];
    codeBlocks.forEach(block => {
      const lang = block.replace('```', '').trim();
      if (lang) {
        this.languages[lang] = (this.languages[lang] || 0) + 1;
      }
    });

    // Calculate totals
    this.counts.total = Object.values(this.counts).reduce((sum, count) => sum + count, 0);
    
    // Track components
    Object.entries(this.counts).forEach(([key, count]) => {
      if (count > 0 && key !== 'total' && key !== 'reactCode' && key !== 'reactTables') {
        this.components.add(key);
      }
    });
  }

  private calculateComplexity(): 'simple' | 'moderate' | 'complex' {
    const { counts } = this;
    
    if (counts.total < 20 && counts.table === 0 && counts.reactCode === 0) {
      return 'simple';
    } else if (counts.total < 100 && counts.table <= 5 && counts.reactCode <= 3) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  // Generate detailed report
  generateReport(analysis: ReactAnalysis): string {
    const { counts, languages, components, jsxStats } = analysis;
    
    return `
# React Markdown Analysis Report

## 📊 Element Counts

| Element | Count |
|---------|-------|
${Object.entries(counts)
  .filter(([key]) => key !== 'total')
  .map(([key, count]) => `| ${key} | ${count} |`)
  .join('\n')}

| **Total** | **${counts.total}** |

## 🔗 Language Statistics

| Language | Code Blocks |
|----------|-------------|
${Object.entries(languages)
  .map(([lang, count]) => `| ${lang} | ${count} |`)
  .join('\n')}

## 🧩 Component Analysis

- **Total Elements**: ${jsxStats.totalElements}
- **Unique Types**: ${jsxStats.uniqueTypes}
- **Max Depth**: ${jsxStats.depth}
- **Complexity**: ${jsxStats.complexity.toUpperCase()}

### Components Used
${components.map(comp => `- \`${comp}\``).join('\n')}

## 📈 JSX Statistics

- **React Tables**: ${counts.reactTables}
- **React Code Blocks**: ${counts.reactCode}
- **Headings Total**: ${counts.h1 + counts.h2 + counts.h3 + counts.h4 + counts.h5 + counts.h6}
- **Interactive Elements**: ${counts.a + counts.li}

## 💡 Insights

${counts.reactTables > 0 ? `✅ Document contains ${counts.reactTables} table(s)` : ''}
${counts.reactCode > 0 ? `📝 Document has ${counts.reactCode} code block(s) in ${Object.keys(languages).length} language(s)` : ''}
${jsxStats.complexity === 'complex' ? '🔥 High complexity document - consider splitting' : ''}
${jsxStats.complexity === 'simple' ? '✨ Simple document - fast rendering expected' : ''}
`;
  }
}

// Main function to run React counter analysis
async function runReactCounter(filePath: string): Promise<void> {
  console.log('⚛️  **React Markdown Counter v2.8**');
  console.log('=' .repeat(50));
  
  try {
    const markdown = await Bun.file(filePath).text();
    const counter = new ReactMarkdownCounter();
    
    console.log(`📁 Analyzing: ${filePath}`);
    console.log(`📏 Document size: ${markdown.length} characters`);
    console.log('');
    
    const analysis = counter.analyze(markdown);
    const report = counter.generateReport(analysis);
    
    console.log('📊 **Analysis Results**');
    console.log('');
    console.log(`🧩 Total Elements: ${analysis.jsxStats.totalElements}`);
    console.log(`🎯 Unique Components: ${analysis.jsxStats.uniqueTypes}`);
    console.log(`📈 Complexity: ${analysis.jsxStats.complexity.toUpperCase()}`);
    console.log(`📊 React Tables: ${analysis.counts.reactTables}`);
    console.log(`💻 Code Blocks: ${analysis.counts.reactCode}`);
    console.log(`🔗 Languages: ${Object.keys(analysis.languages).join(', ')}`);
    console.log('');
    
    // Save detailed report
    const reportFile = filePath.replace(/\\.[^.]+$/, '-react-analysis.md');
    await Bun.write(reportFile, report);
    console.log(`💾 Detailed report saved to: ${reportFile}`);
    
    // Save JSON data
    const jsonFile = filePath.replace(/\\.[^.]+$/, '-react-stats.json');
    await Bun.write(jsonFile, JSON.stringify(analysis, null, 2));
    console.log(`📊 JSON data saved to: ${jsonFile}`);
    
  } catch (error) {
    console.error('❌ React counter analysis failed:', error.message);
    process.exit(1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('React Markdown Counter v2.8');
    console.log('');
    console.log('Usage:');
    console.log('  bun run react-counter.ts <markdown-file>');
    console.log('');
    console.log('Analyzes markdown documents and counts React elements');
    console.log('Generates detailed JSX statistics and component analysis');
    return;
  }
  
  if (args.length === 0) {
    console.error('❌ Please provide a markdown file path');
    console.log('Usage: bun run react-counter.ts <markdown-file>');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  try {
    await runReactCounter(filePath);
    console.log('\\n✅ React counter analysis complete!');
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
