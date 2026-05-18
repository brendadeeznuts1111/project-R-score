#!/usr/bin/env bun
// scripts/build-metafile-cli.ts
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
  analyzer?: boolean;
  snapshot?: string;
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
      case '--analyzer':
        parsed.analyzer = true;
        break;
      case '--snapshot':
      case '-s':
        parsed.snapshot = args[++i];
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
  console.info(`
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
  --analyzer                   Save metafile and print esbuild analyzer URL
  -s, --snapshot <file>        Save deterministic bundle snapshot for regression testing
  -h, --help                   Show this help message
  -v, --version                Show version information

BUNDLE ANALYSIS:
  Upload metafile JSON to https://esbuild.github.io/analyze/ for interactive
  treemap visualization. Use --snapshot to track bundle size over time.

REFERENCES:
  Bun Bundler docs:      https://bun.sh/docs/bundler
  Bun Metafile docs:     https://bun.sh/docs/bundler#metafile
  esbuild Analyzer:      https://esbuild.github.io/analyze/

EXAMPLES:
  # Basic build with metafile
  bun-run scripts/build-metafile-cli.ts --entrypoints src/index.ts --metafile meta.json

  # Full analysis with JSON + Markdown
  bun-run scripts/build-metafile-cli.ts -e src/index.ts,src/app.ts -o dist -m meta.json -md report.md -a

  # Quick analysis only
  bun-run scripts/build-metafile-cli.ts --entrypoints src/index.ts --analyze

  # Generate dependency graph
  bun-run scripts/build-metafile-cli.ts -e src/index.ts --graph --metafile-md graph.md

  # Open in esbuild analyzer
  bun scripts/build-metafile-cli.ts -e src/index.ts --analyzer

  # Save snapshot baseline
  bun scripts/build-metafile-cli.ts -e src/index.ts -s baseline.json

FEATURES:
  ✅ Structured metadata generation
  ✅ Bundle analysis supremacy
  ✅ Import/export graph mastery
  ✅ Markdown-friendly outputs
  ✅ LLM-readable tables
  ✅ CI-optimized reports
  ✅ Performance metrics
  ✅ Optimization recommendations
`);
}

function showVersion() {
  console.info('🚀 Bun Build Metafile CLI v4.0');
  console.info('Metafile Apocalypse Edition - February 06, 2026');
  console.info("Built with Bun 1.3+ - World's fastest JavaScript runtime");
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

  console.info('🚀 Starting Bun Build Metafile Apocalypse v4.0...');
  console.info(`📁 Entrypoints: ${args.entrypoints.join(', ')}`);
  console.info(`📂 Output Directory: ${args.outdir}`);

  if (args.metafile) console.info(`📄 JSON Metafile: ${args.metafile}`);
  if (args['metafile-md']) console.info(`📝 Markdown Report: ${args['metafile-md']}`);
  if (args.analyze) console.info(`🔍 Analysis: Enabled`);
  if (args.graph) console.info(`📊 Graph: Enabled`);

  console.info('');

  try {
    const startTime = performance.now();

    // Execute build with metafile options
    const result = await buildWithCLIOptions(args);

    const buildTime = performance.now() - startTime;

    console.info('✅ Build completed successfully!');
    console.info(`⚡ Build time: ${buildTime.toFixed(2)}ms`);

    if (result.performance) {
      console.info(
        `📊 Metafile generation: ${result.performance.metafileGenerationTime.toFixed(2)}ms`
      );
      if (result.performance.analysisTime) {
        console.info(`🔍 Analysis time: ${result.performance.analysisTime.toFixed(2)}ms`);
      }
      if (result.performance.markdownGenerationTime) {
        console.info(
          `📝 Markdown generation: ${result.performance.markdownGenerationTime.toFixed(2)}ms`
        );
      }
    }

    // Show analysis summary if available
    if (result.analysis) {
      console.info('');
      console.info('📊 Analysis Summary:');

      const { inputAnalysis, outputAnalysis, sizeAnalysis } = result.analysis;

      console.info(
        `   📁 Input files: ${inputAnalysis.totalFiles} (${formatBytes(inputAnalysis.totalBytes)})`
      );
      console.info(
        `   📦 Output files: ${outputAnalysis.totalFiles} (${formatBytes(outputAnalysis.totalBytes)})`
      );
      console.info(
        `   🗜️  Compression ratio: ${(sizeAnalysis.compressionRatio * 100).toFixed(1)}%`
      );
      console.info(`   💾 Bundle savings: ${formatBytes(sizeAnalysis.sizeBreakdown.savings)}`);

      if (result.analysis.unusedExports.length > 0) {
        console.info(`   ⚠️  Unused exports: ${result.analysis.unusedExports.length}`);
      }

      if (result.analysis.circularDependencies.length > 0) {
        console.info(`   🔄 Circular dependencies: ${result.analysis.circularDependencies.length}`);
      }

      if (result.analysis.optimizationOpportunities.length > 0) {
        console.info(
          `   💡 Optimization opportunities: ${result.analysis.optimizationOpportunities.length}`
        );
      }
    }

    // Save metafile for esbuild analyzer if requested
    if (args.analyzer && result.metafile) {
      const { saveForAnalyzer } = await import('../src/build/analyzer-url');
      const analyzerPath = (args.metafile || 'metafile.json').replace('.json', '-analyzer.json');
      const info = await saveForAnalyzer(result.metafile, analyzerPath);
      console.info('');
      console.info(info.instructions);
    }

    // Save deterministic snapshot if requested
    if (args.snapshot && result.metafile) {
      const { createBundleSnapshot, normalizeMetafilePaths } =
        await import('../src/build/metafile-snapshot');
      const normalized = normalizeMetafilePaths(result.metafile);
      const snap = createBundleSnapshot(normalized);
      await Bun.write(args.snapshot, JSON.stringify(snap, null, 2));
      console.info('');
      console.info(`Snapshot saved to: ${args.snapshot}`);
    }

    // Generate graph visualization if requested
    if (args.graph && result.metafile) {
      console.info('');
      console.info('📊 Generating dependency graph...');

      const analyzer = new MetafileAnalyzer(result.metafile);
      const graph = analyzer.getDependencyGraph();

      console.info(`   📍 Nodes: ${graph.nodes.length}`);
      console.info(`   🔗 Edges: ${graph.edges.length}`);
      console.info(
        `   📈 Graph density: ${(graph.edges.length / (graph.nodes.length * (graph.nodes.length - 1))).toFixed(4)}`
      );

      // Save graph as DOT format for visualization tools
      if (args['metafile-md']) {
        const dotContent = generateDotGraph(graph);
        const dotFile = args['metafile-md'].replace('.md', '.dot');
        await Bun.write(dotFile, dotContent);
        console.info(`   💾 Graph saved: ${dotFile}`);
      }
    }

    console.info('');
    console.info('🎆 Metafile Apocalypse Complete!');
    console.info('   ✅ Structured metadata generated');
    console.info('   ✅ Bundle analysis completed');
    console.info('   ✅ Import graph mapped');
    console.info('   ✅ Reports saved');

    if (args.analyze) {
      console.info('   ✅ Optimization suggestions provided');
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
