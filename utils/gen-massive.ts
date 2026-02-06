#!/usr/bin/env bun
// gen-massive.ts - v2.8: Generate Massive Test Documents

interface MassiveDocOptions {
  cols?: number;
  tables?: number;
  codeBlocks?: number;
  headings?: number;
  includeMath?: boolean;
  includeTaskLists?: boolean;
  includeWikiLinks?: boolean;
  size?: 'small' | 'medium' | 'large' | 'massive' | 'extreme';
}

interface GeneratedDocument {
  content: string;
  metadata: {
    size: number;
    features: {
      tables: number;
      cols: number;
      codeBlocks: number;
      headings: number;
      math: number;
      taskLists: number;
      wikiLinks: number;
      totalChars: number;
    };
    generated: string;
    complexity: 'simple' | 'moderate' | 'complex' | 'extreme';
  };
}

class MassiveDocumentGenerator {
  
  // Preset configurations
  private presets = {
    small: { cols: 5, tables: 2, codeBlocks: 1, headings: 5 },
    medium: { cols: 15, tables: 5, codeBlocks: 3, headings: 10 },
    large: { cols: 30, tables: 15, codeBlocks: 8, headings: 20 },
    massive: { cols: 50, tables: 30, codeBlocks: 15, headings: 35 },
    extreme: { cols: 100, tables: 50, codeBlocks: 25, headings: 50 }
  };

  // Sample data generators
  private generateColumnNames(cols: number): string[] {
    const prefixes = ['Column', 'Field', 'Attribute', 'Property', 'Data', 'Value', 'Item', 'Element'];
    return Array.from({ length: cols }, (_, i) => {
      const prefix = prefixes[i % prefixes.length];
      const suffix = i === 0 ? 'ID' : i === 1 ? 'Name' : i === 2 ? 'Type' : `${i + 1}`;
      return `${prefix} ${suffix}`;
    });
  }

  private generateTableData(cols: number, rows: number): string[][] {
    const data: string[][] = [];
    
    for (let row = 0; row < rows; row++) {
      const rowData: string[] = [];
      for (let col = 0; col < cols; col++) {
        if (col === 0) {
          // ID column
          rowData.push(`ID-${row + 1}`);
        } else if (col === 1) {
          // Name column
          rowData.push(`Item ${row + 1}`);
        } else if (col === 2) {
          // Type column
          const types = ['Text', 'Number', 'Date', 'Boolean', 'URL', 'Email', 'Phone'];
          rowData.push(types[row % types.length]);
        } else {
          // Data columns
          const dataTypes = [
            `Data-${row}-${col}`,
            `${Math.random().toString(36).substr(2, 8)}`,
            `${(Math.random() * 1000).toFixed(2)}`,
            new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            Math.random() > 0.5 ? 'Yes' : 'No',
            `https://example.com/${row}/${col}`,
            `user${row}@example.com`,
            `+1-555-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`
          ];
          rowData.push(dataTypes[col % dataTypes.length]);
        }
      }
      data.push(rowData);
    }
    
    return data;
  }

  private generateCodeBlock(language: string, complexity: number): string {
    const templates = {
      typescript: [
        `function example${complexity}() {
  console.log("TypeScript example ${complexity}");
  return ${Math.random() > 0.5 ? 'true' : 'false'};
}`,
        `interface Example${complexity} {
  id: number;
  name: string;
  active?: boolean;
}

const instance: Example${complexity} = {
  id: ${complexity},
  name: "Example ${complexity}",
  active: ${Math.random() > 0.5}
};`,
        `class Class${complexity} {
  private value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getValue(): number {
    return this.value * ${complexity};
  }
}`
      ],
      javascript: [
        `function jsExample${complexity}() {
  const data = { id: ${complexity}, value: Math.random() };
  return JSON.stringify(data);
}`,
        `const array${complexity} = Array.from({ length: ${complexity} }, (_, i) => i + 1);
const sum = array${complexity}.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);`,
        `const promise${complexity} = new Promise((resolve) => {
  setTimeout(() => resolve("Result ${complexity}"), ${complexity} * 100);
});`
      ],
      python: [
        `def python_example_${complexity}():
    """Python example ${complexity}"""
    data = [i for i in range(${complexity})]
    return sum(data)`,
        `class PythonClass${complexity}:
    def __init__(self, value):
        self.value = value
    
    def multiply(self, factor):
        return self.value * factor`,
        `import random
import math

def calculate_${complexity}():
    return math.sqrt(random.random() * ${complexity} * 100)`
      ],
      bash: [
        `#!/bin/bash
# Bash script ${complexity}
echo "Processing ${complexity} items..."
for i in {1..${complexity}}; do
    echo "Item $i"
done`,
        `# Advanced bash ${complexity}
files=$(find . -name "*.md" -type f | head -${complexity})
for file in $files; do
    echo "Processing: $file"
    wc -l "$file"
done`,
        `# System monitoring ${complexity}
ps aux | head -${complexity}
df -h | tail -${complexity}
free -m | grep Mem`
      ],
      json: [
        `{
  "id": ${complexity},
  "name": "Example ${complexity}",
  "data": [${Array.from({ length: 5 }, (_, i) => `"item${i}"`).join(', ')}],
  "metadata": {
    "created": "${new Date().toISOString()}",
    "version": "1.${complexity}"
  }
}`,
        `{
  "config": {
    "threshold": ${complexity},
    "enabled": ${Math.random() > 0.5},
    "options": {
      "strict": ${Math.random() > 0.5},
      "timeout": ${complexity * 100}
    }
  },
  "results": [
    ${Array.from({ length: 3 }, (_, i) => `{"index": ${i}, "value": ${Math.random() * 100}}`).join(',\n    ')}
  ]
}`
      ]
    };

    const langTemplates = templates[language as keyof typeof templates] || templates.javascript;
    return langTemplates[complexity % langTemplates.length];
  }

  private generateMathExpression(complexity: number): string {
    const expressions = [
      `E = mc^2`,
      `\\sum_{i=1}^{${complexity}} i = \\frac{${complexity}(${complexity} + 1)}{2}`,
      `\\int_{0}^{${complexity}} x^2 dx = \\frac{${complexity}^3}{3}`,
      `\\sqrt{${complexity}^2 + ${complexity + 1}^2}`,
      `\\lim_{x \\to \\infty} \\frac{1}{x^${complexity}} = 0`,
      `\\frac{d}{dx} x^${complexity} = ${complexity}x^${complexity - 1}`,
      `\\prod_{i=1}^{${complexity}} i = ${complexity}!`,
      `\\log_{${complexity}}(x) = \\frac{\\ln(x)}{\\ln(${complexity})}`
    ];
    
    return expressions[complexity % expressions.length];
  }

  private generateTaskList(items: number): string[] {
    const tasks: string[] = [];
    for (let i = 1; i <= items; i++) {
      const completed = Math.random() > 0.5;
      const taskTexts = [
        `Complete task ${i}`,
        `Review item ${i}`,
        `Update section ${i}`,
        `Process file ${i}`,
        `Validate entry ${i}`,
        `Test component ${i}`,
        `Document feature ${i}`,
        `Optimize module ${i}`
      ];
      const text = taskTexts[i % taskTexts.length];
      tasks.push(`- [${completed ? 'x' : ' '}] ${text}`);
    }
    return tasks;
  }

  private generateWikiLinks(count: number): string[] {
    const pages = [
      'Main Page', 'Documentation', 'API Reference', 'Examples', 'Tutorial',
      'Getting Started', 'Configuration', 'Advanced Topics', 'Troubleshooting',
      'FAQ', 'Changelog', 'Contributing', 'License', 'Support', 'Community'
    ];
    
    return Array.from({ length: count }, (_, i) => {
      const page = pages[i % pages.length];
      return `[[${page}]]`;
    });
  }

  // Main document generation function
  generateDocument(options: MassiveDocOptions = {}): GeneratedDocument {
    // Apply preset if specified
    if (options.size && this.presets[options.size]) {
      options = { ...this.presets[options.size], ...options };
    }

    const {
      cols = 20,
      tables = 10,
      codeBlocks = 5,
      headings = 15,
      includeMath = true,
      includeTaskLists = true,
      includeWikiLinks = true
    } = options;

    let content = '';
    const features = {
      tables: 0,
      cols,
      codeBlocks: 0,
      headings: 0,
      math: 0,
      taskLists: 0,
      wikiLinks: 0,
      totalChars: 0
    };

    // Header
    content += `# Massive Test Document\n\n`;
    content += `**Generated**: ${new Date().toISOString()}\\n`;
    content += `**Configuration**: ${cols} cols, ${tables} tables, ${codeBlocks} code blocks\\n`;
    content += `**Features**: Math(${includeMath}), Tasks(${includeTaskLists}), Wiki(${includeWikiLinks})\\n\\n`;
    
    features.headings++; // H1

    // Table of Contents
    content += `## Table of Contents\\n\\n`;
    for (let i = 1; i <= Math.min(headings, 10); i++) {
      content += `${i}. [Section ${i}](#section-${i})\\n`;
    }
    content += `\\n`;
    features.headings++;

    // Generate sections
    for (let section = 1; section <= headings; section++) {
      content += `## Section ${section}\\n\\n`;
      features.headings++;

      // Add some content
      content += `This is section ${section} with various markdown features. `;
      content += `It includes **bold text**, *italic text*, and \`inline code\`.\\n\\n`;

      // Add tables in some sections
      if (section <= tables && section % Math.ceil(headings / tables) === 0) {
        const columnNames = this.generateColumnNames(cols);
        const tableData = this.generateTableData(cols, 5); // 5 rows per table

        // Table header
        content += `| ${columnNames.join(' | ')} |\\n`;
        content += `| ${Array.from({ length: cols }, () => '---').join(' | ')} |\\n`;

        // Table rows
        tableData.forEach(row => {
          content += `| ${row.join(' | ')} |\\n`;
        });

        content += `\\n`;
        features.tables++;
      }

      // Add code blocks
      if (section <= codeBlocks && section % Math.ceil(headings / codeBlocks) === 0) {
        const languages = ['typescript', 'javascript', 'python', 'bash', 'json'];
        const language = languages[section % languages.length];
        const code = this.generateCodeBlock(language, section);
        
        const fence = '```';
        content += fence + language + '\n' + code + '\n' + fence + '\n\n';
        features.codeBlocks++;
      }

      // Add math expressions
      if (includeMath && section % 3 === 0) {
        const math = this.generateMathExpression(section);
        content += `Math Expression ${section}: $${math}$\\n\\n`;
        features.math++;
      }

      // Add task lists
      if (includeTaskLists && section % 4 === 0) {
        const tasks = this.generateTaskList(3);
        content += tasks.join('\\n') + '\\n\\n';
        features.taskLists += tasks.length;
      }

      // Add wiki links
      if (includeWikiLinks && section % 5 === 0) {
        const wikiLinks = this.generateWikiLinks(2);
        content += `Related pages: ${wikiLinks.join(', ')}\\n\\n`;
        features.wikiLinks += wikiLinks.length;
      }

      // Add other markdown features
      if (section % 2 === 0) {
        content += `> Blockquote for section ${section}: Important information here.\\n\\n`;
      }

      if (section % 3 === 0) {
        content += `[Link ${section}](https://example.com/section-${section})\\n\\n`;
      }
    }

    // Footer
    content += `---\\n\\n`;
    content += `## Document Summary\\n\\n`;
    content += `- **Total Sections**: ${headings}\\n`;
    content += `- **Tables**: ${features.tables}\\n`;
    content += `- **Code Blocks**: ${features.codeBlocks}\\n`;
    content += `- **Math Expressions**: ${features.math}\\n`;
    content += `- **Task Items**: ${features.taskLists}\\n`;
    content += `- **Wiki Links**: ${features.wikiLinks}\\n\\n`;
    features.headings++;

    // Calculate final stats
    features.totalChars = content.length;

    // Determine complexity
    let complexity: 'simple' | 'moderate' | 'complex' | 'extreme';
    if (features.totalChars < 1000) {
      complexity = 'simple';
    } else if (features.totalChars < 10000) {
      complexity = 'moderate';
    } else if (features.totalChars < 100000) {
      complexity = 'complex';
    } else {
      complexity = 'extreme';
    }

    return {
      content,
      metadata: {
        size: features.totalChars,
        features,
        generated: new Date().toISOString(),
        complexity
      }
    };
  }

  // Batch generation for testing
  async generateBatch(count: number, options: MassiveDocOptions = {}): Promise<GeneratedDocument[]> {
    console.log(`🏭 Generating batch of ${count} documents...`);
    
    const documents: GeneratedDocument[] = [];
    
    for (let i = 0; i < count; i++) {
      // Vary options slightly for each document
      const variedOptions = {
        ...options,
        cols: (options.cols || 20) + Math.floor(Math.random() * 10) - 5,
        tables: (options.tables || 10) + Math.floor(Math.random() * 4) - 2,
        codeBlocks: (options.codeBlocks || 5) + Math.floor(Math.random() * 3) - 1
      };
      
      const doc = this.generateDocument(variedOptions);
      documents.push(doc);
      
      if ((i + 1) % 10 === 0) {
        console.log(`📄 Generated ${i + 1}/${count} documents...`);
      }
    }
    
    console.log(`✅ Batch generation complete!`);
    return documents;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Massive Document Generator v2.8');
    console.log('');
    console.log('Usage:');
    console.log('  bun run gen-massive.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --cols <number>        Number of table columns (default: 20)');
    console.log('  --tables <number>      Number of tables (default: 10)');
    console.log('  --codeblocks <number>  Number of code blocks (default: 5)');
    console.log('  --headings <number>    Number of headings (default: 15)');
    console.log('  --size <preset>         Use preset: small|medium|large|massive|extreme');
    console.log('  --output <file>        Output file (default: /tmp/mega.md)');
    console.log('  --batch <count>        Generate multiple documents');
    console.log('  --no-math              Disable math expressions');
    console.log('  --no-tasks             Disable task lists');
    console.log('  --no-wiki              Disable wiki links');
    console.log('');
    console.log('Examples:');
    console.log('  bun run gen-massive.ts --size massive');
    console.log('  bun run gen-massive.ts --cols 100 --tables 50');
    console.log('  bun run gen-massive.ts --batch 10 --size large');
    return;
  }

  // Parse arguments
  const options: MassiveDocOptions = {};
  let outputFile = '/tmp/mega.md';
  let batchCount = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--cols' && i + 1 < args.length) {
      options.cols = parseInt(args[++i]);
    } else if (arg === '--tables' && i + 1 < args.length) {
      options.tables = parseInt(args[++i]);
    } else if (arg === '--codeblocks' && i + 1 < args.length) {
      options.codeBlocks = parseInt(args[++i]);
    } else if (arg === '--headings' && i + 1 < args.length) {
      options.headings = parseInt(args[++i]);
    } else if (arg === '--size' && i + 1 < args.length) {
      options.size = args[++i] as any;
    } else if (arg === '--output' && i + 1 < args.length) {
      outputFile = args[++i];
    } else if (arg === '--batch' && i + 1 < args.length) {
      batchCount = parseInt(args[++i]);
    } else if (arg === '--no-math') {
      options.includeMath = false;
    } else if (arg === '--no-tasks') {
      options.includeTaskLists = false;
    } else if (arg === '--no-wiki') {
      options.includeWikiLinks = false;
    }
  }

  const generator = new MassiveDocumentGenerator();

  try {
    if (batchCount > 0) {
      // Batch generation
      const documents = await generator.generateBatch(batchCount, options);
      
      // Save batch summary
      const summary = {
        generated: new Date().toISOString(),
        count: documents.length,
        options,
        stats: {
          avgSize: documents.reduce((sum, doc) => sum + doc.metadata.size, 0) / documents.length,
          totalSize: documents.reduce((sum, doc) => sum + doc.metadata.size, 0),
          minSize: Math.min(...documents.map(doc => doc.metadata.size)),
          maxSize: Math.max(...documents.map(doc => doc.metadata.size))
        }
      };
      
      await Bun.write('batch-summary.json', JSON.stringify(summary, null, 2));
      console.log(`💾 Batch summary saved to: batch-summary.json`);
      
      // Save first document as sample
      await Bun.write(outputFile, documents[0].content);
      console.log(`📄 Sample document saved to: ${outputFile}`);
      
    } else {
      // Single document generation
      console.log('🏭 Generating massive document...');
      const document = generator.generateDocument(options);
      
      await Bun.write(outputFile, document.content);
      console.log(`✅ Document saved to: ${outputFile}`);
      console.log(`📊 Size: ${document.metadata.size.toLocaleString()} characters`);
      console.log(`🎯 Complexity: ${document.metadata.complexity.toUpperCase()}`);
      
      // Save metadata
      const metadataFile = outputFile.replace(/\\.[^.]+$/, '-metadata.json');
      await Bun.write(metadataFile, JSON.stringify(document.metadata, null, 2));
      console.log(`📋 Metadata saved to: ${metadataFile}`);
    }
    
    console.log('\\n🎉 Massive document generation complete!');
    
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
