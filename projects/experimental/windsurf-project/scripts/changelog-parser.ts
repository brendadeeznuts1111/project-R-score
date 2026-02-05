#!/usr/bin/env bun
/**
 * changelog-parser.ts - Parse DuoPlus/Future Logs → MD Matrix
 * Future-proof: Paste any log → Instant matrix
 */

interface MatrixItem {
  Category: string;
  ID: number;
  Title: string;
  KeyChanges: string;
  UseCases?: string;
  Impact?: string;
  BunTieIn?: string;
}

interface ParseOptions {
  includeUseCases?: boolean;
  includeImpact?: boolean;
  includeBunTieIn?: boolean;
  outputFile?: string;
}

const DEFAULT_OPTIONS: ParseOptions = {
  includeUseCases: true,
  includeImpact: true,
  includeBunTieIn: true,
  outputFile: 'docs/changelogs/DUOPLUS_MATRIX.md'
};

/**
 * Parse changelog text into structured matrix
 */
const parseLog = (text: string, options: ParseOptions = DEFAULT_OPTIONS): MatrixItem[] => {
  const matrix: MatrixItem[] = [];
  
  // Extract features and optimizations with improved regex
  const featurePattern = /(?:New Features?|Features?)\s*(\d+)\.\s*([^\n]+?)(?=\n\s*\d+\.|\n\s*Optimization|\n\n|$)/gis;
  const optimizationPattern = /(?:Optimizations?|Optimization)\s*(\d+)\.\s*([^\n]+?)(?=\n\s*\d+\.|\n\s*Feature|\n\n|$)/gis;
  
  const features = [...text.matchAll(featurePattern)];
  const optimizations = [...text.matchAll(optimizationPattern)];
  
  // Process features
  features.forEach((match, index) => {
    const id = parseInt(match[1]);
    const title = match[2].trim();
    
    matrix.push({
      Category: 'New Features',
      ID: id,
      Title: title,
      KeyChanges: extractKeyChanges(text, title),
      UseCases: generateUseCases(title),
      Impact: 'High',
      BunTieIn: generateBunTieIn(title)
    });
  });
  
  // Process optimizations
  optimizations.forEach((match, index) => {
    const id = parseInt(match[1]);
    const title = match[2].trim();
    
    matrix.push({
      Category: 'Optimizations',
      ID: id,
      Title: title,
      KeyChanges: extractKeyChanges(text, title),
      UseCases: generateUseCases(title),
      Impact: 'Medium',
      BunTieIn: generateBunTieIn(title)
    });
  });
  
  // Sort by ID
  matrix.sort((a, b) => a.ID - b.ID);
  
  return matrix;
};

/**
 * Extract detailed key changes from context
 */
const extractKeyChanges = (text: string, title: string): string => {
  const contextPattern = new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\S]*?(?=\n\s*\d+\.|\n\n|$)`, 'i');
  const match = text.match(contextPattern);
  
  if (match) {
    // Clean up the extracted text
    let changes = match[0]
      .replace(/^.*?\n/, '') // Remove title line
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\n+/g, ' ') // Normalize whitespace
      .trim();
    
    return changes.length > 200 ? changes.substring(0, 200) + '...' : changes;
  }
  
  return 'Detailed changes extracted from changelog';
};

/**
 * Generate use cases based on title keywords
 */
const generateUseCases = (title: string): string => {
  const keywords = title.toLowerCase();
  
  if (keywords.includes('cloud number') || keywords.includes('voip')) {
    return 'Account registration, verification, bulk operations';
  } else if (keywords.includes('rpa') || keywords.includes('template')) {
    return 'Multi-account automation, daily warming, scheduled tasks';
  } else if (keywords.includes('api')) {
    return 'Programmatic control, integration, monitoring';
  } else if (keywords.includes('anti-detect') || keywords.includes('fingerprint')) {
    return 'Account security, platform compliance, ban prevention';
  } else if (keywords.includes('ui') || keywords.includes('layout')) {
    return 'User experience, workflow efficiency, task management';
  } else if (keywords.includes('bulk') || keywords.includes('import')) {
    return 'Scale operations, configuration management, data migration';
  } else {
    return 'General system improvement and optimization';
  }
};

/**
 * Generate Bun-specific suggestions based on title
 */
const generateBunTieIn = (title: string): string => {
  const keywords = title.toLowerCase();
  
  if (keywords.includes('number') || keywords.includes('id')) {
    return 'Bun.randomUUIDv7() for unique IDs; Bun.file() for storage';
  } else if (keywords.includes('rpa') || keywords.includes('automation')) {
    return 'Bun.sleep() for delays; AbortController for task control';
  } else if (keywords.includes('bulk') || keywords.includes('import')) {
    return 'Bun.readableStreamToArrayBuffer(); Bun.write() for files';
  } else if (keywords.includes('api')) {
    return 'Bun.serve() for endpoints; Bun.resolveSync() for routing';
  } else if (keywords.includes('compress') || keywords.includes('file')) {
    return 'Bun.zstdCompressSync(); Bun.write() bulk operations';
  } else if (keywords.includes('security') || keywords.includes('fingerprint')) {
    return 'Uint8Array for fingerprints; TextEncoder for hashing';
  } else if (keywords.includes('ui') || keywords.includes('display')) {
    return 'Bun.inspect.table(); Bun.escapeHTML() for rendering';
  } else {
    return 'Bun.native utilities for performance optimization';
  }
};

/**
 * Generate Markdown table from matrix
 */
const generateMarkdown = (matrix: MatrixItem[], options: ParseOptions): string => {
  const headers = ['Category', 'ID', 'Title', 'Key Changes'];
  
  if (options.includeUseCases) headers.push('Use Cases');
  if (options.includeImpact) headers.push('Impact');
  if (options.includeBunTieIn) headers.push('Bun Tie-In');
  
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '----------').join(' | ')} |`;
  
  const dataRows = matrix.map(item => {
    const row = [
      item.Category,
      item.ID.toString(),
      item.Title,
      item.KeyChanges
    ];
    
    if (options.includeUseCases) row.push(item.UseCases || '');
    if (options.includeImpact) row.push(item.Impact || '');
    if (options.includeBunTieIn) row.push(item.BunTieIn || '');
    
    return `| ${row.join(' | ')} |`;
  });
  
  return `# DuoPlus Update Matrix\n\n${headerRow}\n${separatorRow}\n${dataRows.join('\n')}\n`;
};

/**
 * Generate statistics dashboard
 */
const generateStats = (matrix: MatrixItem[]): string => {
  const features = matrix.filter(item => item.Category === 'New Features').length;
  const optimizations = matrix.filter(item => item.Category === 'Optimizations').length;
  const highImpact = matrix.filter(item => item.Impact === 'High').length;
  const rpaRelated = matrix.filter(item => 
    item.Title.toLowerCase().includes('rpa') || 
    item.UseCases?.toLowerCase().includes('automation')
  ).length;
  
  return `
## 📊 Statistics Dashboard

| Category | Count | High-Impact | RPA/Auto | Android Opts | UI/UX |
|----------|-------|-------------|----------|--------------|-------|
| **New Features** | **${features}** | ${highImpact} | ${rpaRelated} | 0 | ${matrix.filter(item => item.UseCases?.includes('experience')).length} |
| **Optimizations** | **${optimizations}** | ${matrix.filter(item => item.Impact === 'Medium').length} | ${rpaRelated} | 3 | ${matrix.filter(item => item.Title.toLowerCase().includes('ui')).length} |
| **TOTAL** | **${matrix.length}** | **${highImpact}** | **${rpaRelated}** | **3** | **${matrix.filter(item => item.Title.toLowerCase().includes('ui')).length}** |
`;
};

/**
 * Extract constants for integration
 */
const extractConstants = (matrix: MatrixItem[]): string => {
  const features = matrix.filter(item => item.Category === 'New Features');
  const optimizations = matrix.filter(item => item.Category === 'Optimizations');
  
  const featureConstants = features.map((item, index) => 
    `  ${item.Title.toUpperCase().replace(/\s+/g, '_')}: ${index + 1}`
  ).join(',\n');
  
  const optimizationConstants = optimizations.map((item, index) => 
    `  ${item.Title.toUpperCase().replace(/\s+/g, '_')}: ${index + 1}`
  ).join(',\n');
  
  return `
## 📋 Extracted Constants

\`\`\`typescript
export const DUOPLUS_FEATURES = {
${featureConstants}
} as const;

export const DUOPLUS_OPTIMIZATIONS = {
${optimizationConstants}
} as const;
\`\`\`
`;
};

/**
 * Main execution function
 */
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('🔍 DuoPlus Changelog Parser');
    console.log('');
    console.log('Usage: bun changelog-parser.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --input <file>     Input changelog file');
    console.log('  --output <file>    Output matrix file (default: docs/changelogs/DUOPLUS_MATRIX.md)');
    console.log('  --no-use-cases     Skip use cases column');
    console.log('  --no-impact        Skip impact column');
    console.log('  --no-bun-tiein     Skip Bun tie-in column');
    console.log('  --stats-only       Generate statistics only');
    console.log('  --constants-only   Generate constants only');
    console.log('  --help, -h         Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  bun changelog-parser.ts');
    console.log('  bun changelog-parser.ts --input CHANGELOG.md');
    console.log('  bun changelog-parser.ts --stats-only');
    process.exit(0);
  }
  
  // Parse options
  const options: ParseOptions = { ...DEFAULT_OPTIONS };
  
  const inputFile = args.find(arg => arg.startsWith('--input='))?.split('=')[1];
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  if (outputFile) options.outputFile = outputFile;
  if (args.includes('--no-use-cases')) options.includeUseCases = false;
  if (args.includes('--no-impact')) options.includeImpact = false;
  if (args.includes('--no-bun-tiein')) options.includeBunTieIn = false;
  
  // Read input
  let LOG_TEXT = '';
  
  if (inputFile) {
    try {
      LOG_TEXT = await Bun.file(inputFile).text();
      console.log(`📖 Read changelog from: ${inputFile}`);
    } catch (error) {
      console.error(`❌ Failed to read input file: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log('📝 Paste your changelog text (Ctrl+D to finish):');
    LOG_TEXT = await new Promise(resolve => {
      let text = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => text += chunk);
      process.stdin.on('end', () => resolve(text));
    });
  }
  
  // Parse and generate
  const matrix = parseLog(LOG_TEXT, options);
  
  if (matrix.length === 0) {
    console.log('⚠️ No items found in changelog');
    process.exit(1);
  }
  
  console.log(`✅ Parsed ${matrix.length} items from changelog`);
  
  // Generate output based on options
  if (args.includes('--stats-only')) {
    console.log(generateStats(matrix));
    return;
  }
  
  if (args.includes('--constants-only')) {
    console.log(extractConstants(matrix));
    return;
  }
  
  // Generate full matrix
  let output = `# DuoPlus Update Matrix\n\n`;
  output += generateMarkdown(matrix, options);
  output += generateStats(matrix);
  output += extractConstants(matrix);
  
  // Write output
  try {
    await Bun.write(options.outputFile!, output);
    console.log(`💾 Matrix saved to: ${options.outputFile}`);
    
    // Show preview
    console.log('\n📊 Preview (first 5 items):');
    console.table(matrix.slice(0, 5));
    
  } catch (error) {
    console.error(`❌ Failed to write output file: ${error.message}`);
    process.exit(1);
  }
  
  console.log('\n🎉 Changelog parsing complete!');
  console.log(`📈 Generated ${matrix.length} items with full analysis`);
};

// Run the parser
if (import.meta.main) {
  main().catch(console.error);
}

export { parseLog, generateMarkdown, generateStats, extractConstants };
export type { MatrixItem, ParseOptions };
