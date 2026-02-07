// scripts/build-metafile-cli.ts
#!/usr/bin/env bun
// CLI Tool for Bun Build Metafile Apocalypse v4.0

import { buildWithCLIOptions } from '../src/build/enhanced-builder';
import { MetafileAnalyzer } from '../src/build/metafile-analyzer';
import { generateMarkdownReport } from '../src/build/markdown-generator';

// CLI argument parser
interface CLIArgs {
  entrypoints: string[];
  outdir: string;
  metafile?: string;
  'metafile-md'?: string;
  analyze?: boolean;
  graph?: boolean;
  watch?: boolean;
  help?: boolean;
  version?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    entrypoints: [],
    outdir: './dist',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--entrypoints':
      case '-e':
        parsed.entrypoints = args[++i]?.split(',') || [];
        break;
      case '--outdir':
      case '-o':
        parsed.outdir = args[++i] || './dist';
        break;
      case '--metafile':
      case '-m':
        parsed.metafile = args[++i];
        break;
      case '--metafile-md':
      case '-md':
        parsed['metafile-md'] = args[++i];
        break;
      case '--analyze':
      case '-a':
        parsed.analyze = true;
        break;
      case '--graph':
      case '-g':
        parsed.graph = true;
        break;
      case '--watch':
      case '-w':
        parsed.watch = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      case '--version':
      case '-v':
        parsed.version = true;
        break;
      default:
        if (!arg.startsWith('-') && parsed.entrypoints.length === 0) {
          parsed.entrypoints = arg.split(',');
        }
        break;
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
🚀 Bun Build Metafile CLI v4.0 - Metafile Apocalypse Edition

USAGE:
  bun-build-metafile [options] <entrypoints>

OPTIONS:
  -e, --entrypoints <files>    Comma-separated entry points (default: index.ts)
  -o, --outdir <dir>           Output directory (default: ./dist)
  -m, --metafile <file>        Save JSON metafile to path
  -md, --metafile-md <file>    Generate Markdown report to path
  -a, --analyze                Run comprehensive analysis
  -g, --graph                  Generate dependency graph visualization
  -w, --watch                  Watch mode for development
  -h, --help                   Show this help message
  -v, --version                Show version information

EXAMPLES:
  # Basic build with metafile
  bun-run scripts/build-metafile-cli.ts --entrypoints src/index.ts --metafile meta.json

  # Full analysis with JSON + Markdown
  bun-run scripts/build-metafile-cli.ts -e src/index.ts,src/app.ts -o dist -m meta.json -md report.md -a

  # Quick analysis only
  bun-run scripts/build-metafile-cli.ts --entrypoints src/index.ts --analyze

  # Generate dependency graph
  bun-run scripts/build-metafile-cli.ts -e src/index.ts --graph --metafile-md graph.md

FEATURES:
  ✅ Structured metadata generation
  ✅ Bundle analysis supremacy
  ✅ Import/export graph mastery
  ✅ Markdown-friendly outputs
  ✅ LLM-readable tables
  ✅ CI-optimized reports
  ✅ Performance metrics
  ✅ Optimization recommendations

Learn more at: https://bun.sh/docs/bundler#metafile
`);
}

function showVersion() {
  console.log('🚀 Bun Build Metafile CLI v4.0');
  console.log('Metafile Apocalypse Edition - February 06, 2026');
  console.log('Built with Bun 1.3+ - World\'s fastest JavaScript runtime');
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  if (args.entrypoints.length === 0) {
    console.error('❌ No entrypoints specified. Use --entrypoints or provide as argument.');
    console.error('   Use --help for usage information.');
    process.exit(1);
  }

  console.log('🚀 Starting Bun Build Metafile Apocalypse v4.0...');
  console.log(`📁 Entrypoints: ${args.entrypoints.join(', ')}`);
  console.log(`📂 Output Directory: ${args.outdir}`);
  
  if (args.metafile) console.log(`📄 JSON Metafile: ${args.metafile}`);
  if (args['metafile-md']) console.log(`📝 Markdown Report: ${args['metafile-md']}`);
  if (args.analyze) console.log(`🔍 Analysis: Enabled`);
  if (args.graph) console.log(`📊 Graph: Enabled`);
  
  console.log('');

  try {
    const startTime = performance.now();
    
    // Execute build with metafile options
    const result = await buildWithCLIOptions(args);
    
    const buildTime = performance.now() - startTime;
    
    console.log('✅ Build completed successfully!');
    console.log(`⚡ Build time: ${buildTime.toFixed(2)}ms`);
    
    if (result.performance) {
      console.log(`📊 Metafile generation: ${result.performance.metafileGenerationTime.toFixed(2)}ms`);
      if (result.performance.analysisTime) {
        console.log(`🔍 Analysis time: ${result.performance.analysisTime.toFixed(2)}ms`);
      }
      if (result.performance.markdownGenerationTime) {
        console.log(`📝 Markdown generation: ${result.performance.markdownGenerationTime.toFixed(2)}ms`);
      }
    }
    
    // Show analysis summary if available
    if (result.analysis) {
      console.log('');
      console.log('📊 Analysis Summary:');
      
      const { inputAnalysis, outputAnalysis, sizeAnalysis } = result.analysis;
      
      console.log(`   📁 Input files: ${inputAnalysis.totalFiles} (${formatBytes(inputAnalysis.totalBytes)})`);
      console.log(`   📦 Output files: ${outputAnalysis.totalFiles} (${formatBytes(outputAnalysis.totalBytes)})`);
      console.log(`   🗜️  Compression ratio: ${(sizeAnalysis.compressionRatio * 100).toFixed(1)}%`);
      console.log(`   💾 Bundle savings: ${formatBytes(sizeAnalysis.sizeBreakdown.savings)}`);
      
      if (result.analysis.unusedExports.length > 0) {
        console.log(`   ⚠️  Unused exports: ${result.analysis.unusedExports.length}`);
      }
      
      if (result.analysis.circularDependencies.length > 0) {
        console.log(`   🔄 Circular dependencies: ${result.analysis.circularDependencies.length}`);
      }
      
      if (result.analysis.optimizationOpportunities.length > 0) {
        console.log(`   💡 Optimization opportunities: ${result.analysis.optimizationOpportunities.length}`);
      }
    }
    
    // Generate graph visualization if requested
    if (args.graph && result.metafile) {
      console.log('');
      console.log('📊 Generating dependency graph...');
      
      const analyzer = new MetafileAnalyzer(result.metafile);
      const graph = analyzer.getDependencyGraph();
      
      console.log(`   📍 Nodes: ${graph.nodes.length}`);
      console.log(`   🔗 Edges: ${graph.edges.length}`);
      console.log(`   📈 Graph density: ${(graph.edges.length / (graph.nodes.length * (graph.nodes.length - 1))).toFixed(4)}`);
      
      // Save graph as DOT format for visualization tools
      if (args['metafile-md']) {
        const dotContent = generateDotGraph(graph);
        const dotFile = args['metafile-md'].replace('.md', '.dot');
        await Bun.write(dotFile, dotContent);
        console.log(`   💾 Graph saved: ${dotFile}`);
      }
    }
    
    console.log('');
    console.log('🎆 Metafile Apocalypse Complete!');
    console.log('   ✅ Structured metadata generated');
    console.log('   ✅ Bundle analysis completed');
    console.log('   ✅ Import graph mapped');
    console.log('   ✅ Reports saved');
    
    if (args.analyze) {
      console.log('   ✅ Optimization suggestions provided');
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Generate DOT format graph for visualization tools
function generateDotGraph(graph: any): string {
  let dot = 'digraph BundleDependencies {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box, style=filled, fillcolor=lightblue];\n\n';
  
  // Add nodes
  graph.nodes.forEach((node: any) => {
    const color = node.type === 'input' ? 'lightblue' : 'lightgreen';
    const label = `${node.label}\\n(${formatBytes(node.bytes)})`;
    dot += `  "${node.id}" [label="${label}", fillcolor=${color}];\n`;
  });
  
  dot += '\n';
  
  // Add edges
  graph.edges.forEach((edge: any) => {
    const style = edge.type === 'import' ? 'solid' : 'dashed';
    const color = edge.type === 'import' ? 'blue' : 'gray';
    dot += `  "${edge.from}" -> "${edge.to}" [style=${style}, color=${color}];\n`;
  });
  
  dot += '}\n';
  return dot;
}

// Format bytes helper
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run main function
if (import.meta.main) {
  main().catch(console.error);
}
