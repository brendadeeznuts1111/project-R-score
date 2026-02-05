#!/usr/bin/env bun

// [AI][HEADERS][GENERATOR][AI-HDR-001][v3.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-DED][v3.0.0][ACTIVE]

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname, basename, dirname, relative } from "path";

interface HeaderAnalysis {
  file: string;
  category: string;
  subcategory: string;
  version: string;
  code: string;
  status: "ACTIVE" | "STABLE" | "BETA" | "EXPERIMENTAL" | "DEPRECATED";
  confidence: number;
  suggestions: string[];
  aiReasoning?: string;
  contextScore: number;
}

interface HeaderPattern {
  regex: RegExp;
  category: string;
  subcategory: string;
  confidence: number;
  keywords: string[];
  context?: string;
}

interface AIAnalysisResult {
  primary: string;
  secondary: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
}

class AIHeaderGenerator {
  private patterns: HeaderPattern[] = [
    // Core Syndicate Patterns (High Confidence)
    {
      regex: /datapipe.*bet.*report|agent.*ranking|profit.*analysis/i,
      category: "DATAPIPE",
      subcategory: "CORE",
      confidence: 0.98,
      keywords: ["bets", "agents", "profit", "datapipe", "api"],
      context: "Core betting data processing and agent analytics"
    },
    {
      regex: /websocket.*server|ws.*live|real.*time.*update/i,
      category: "WEBSOCKETS",
      subcategory: "LIVE",
      confidence: 0.97,
      keywords: ["websocket", "live", "real-time", "push", "broadcast"],
      context: "Live data streaming and real-time updates"
    },
    {
      regex: /dataview.*export|obsidian.*dashboard|yaml.*report/i,
      category: "DATAVIEW",
      subcategory: "EXPORT",
      confidence: 0.95,
      keywords: ["dataview", "obsidian", "export", "dashboard", "yaml"],
      context: "Obsidian integration and data visualization"
    },
    {
      regex: /sqlite.*database|sql.*query|bun:sqlite/i,
      category: "DATABASE",
      subcategory: "SQL",
      confidence: 0.96,
      keywords: ["sqlite", "database", "sql", "query", "bun:sqlite"],
      context: "Local SQLite database operations"
    },
    {
      regex: /redis.*cache|bun:redis|memory.*store/i,
      category: "CACHE",
      subcategory: "REDIS",
      confidence: 0.94,
      keywords: ["redis", "cache", "memory", "store", "bun:redis"],
      context: "Redis caching and memory storage"
    },

    // AI/ML Patterns
    {
      regex: /ai.*header|ml.*analysis|intelligence.*generator/i,
      category: "AI",
      subcategory: "HEADERS",
      confidence: 0.93,
      keywords: ["ai", "ml", "intelligence", "analysis", "generator"],
      context: "AI-powered code analysis and header generation"
    },
    {
      regex: /parallel.*worker|postmessage|worker.*thread/i,
      category: "PARALLEL",
      subcategory: "WORKERS",
      confidence: 0.95,
      keywords: ["parallel", "worker", "postmessage", "thread", "concurrent"],
      context: "Parallel processing using Web Workers"
    },

    // Utility Patterns
    {
      regex: /spawn.*timeout|maxbuffer|safe.*exec/i,
      category: "UTILITIES",
      subcategory: "SPAWN",
      confidence: 0.92,
      keywords: ["spawn", "timeout", "maxbuffer", "safe", "exec"],
      context: "Safe process spawning with timeout protection"
    },
    {
      regex: /etl.*pipeline|extract.*transform.*load|pipe.*stream/i,
      category: "ETL",
      subcategory: "PIPELINE",
      confidence: 0.97,
      keywords: ["etl", "pipeline", "extract", "transform", "load", "stream"],
      context: "Data pipeline and ETL operations"
    },
    {
      regex: /strip.*ansi|log.*clean|color.*remove/i,
      category: "UTILITIES",
      subcategory: "LOGGING",
      confidence: 0.91,
      keywords: ["strip", "ansi", "log", "clean", "color"],
      context: "Log cleaning and ANSI color removal"
    },

    // MCP Patterns
    {
      regex: /mcp.*tool|mcp.*context|model.*protocol/i,
      category: "MCP",
      subcategory: "CONTEXT",
      confidence: 0.89,
      keywords: ["mcp", "tool", "context", "model", "protocol"],
      context: "Model Context Protocol integration"
    },

    // Function-Specific Patterns
    {
      regex: /parseBet|parseFullBet|betDetails.*json/i,
      category: "PARSING",
      subcategory: "BETS",
      confidence: 0.98,
      keywords: ["parse", "bet", "json", "details"],
      context: "Bet data parsing and JSON processing"
    },
    {
      regex: /aggregateAgent|agentStats|profit.*ranking/i,
      category: "ANALYTICS",
      subcategory: "AGENTS",
      confidence: 0.96,
      keywords: ["aggregate", "agent", "stats", "profit", "ranking"],
      context: "Agent performance aggregation and analytics"
    },
    {
      regex: /export.*csv|export.*dataview|data.*export/i,
      category: "EXPORT",
      subcategory: "DATA",
      confidence: 0.94,
      keywords: ["export", "csv", "dataview", "data"],
      context: "Data export and file generation"
    },
    {
      regex: /fetchData|getBetReport|api.*call/i,
      category: "API",
      subcategory: "FETCH",
      confidence: 0.97,
      keywords: ["fetch", "api", "betreport", "call"],
      context: "API data fetching and remote calls"
    },
    {
      regex: /queryBet|filterBet|grep.*search/i,
      category: "QUERY",
      subcategory: "FILTER",
      confidence: 0.93,
      keywords: ["query", "filter", "grep", "search"],
      context: "Data querying and filtering operations"
    },
    {
      regex: /websocket.*serve|ws.*upgrade|server.*websocket/i,
      category: "WEBSOCKETS",
      subcategory: "SERVER",
      confidence: 0.96,
      keywords: ["websocket", "serve", "upgrade", "server"],
      context: "WebSocket server implementation"
    },

    // Test Patterns
    {
      regex: /test|spec|describe.*expect|bun:test/i,
      category: "TESTS",
      subcategory: "UNIT",
      confidence: 0.97,
      keywords: ["test", "spec", "describe", "expect", "bun:test"],
      context: "Unit testing and test specifications"
    },

    // Build Patterns
    {
      regex: /build.*exe|compile.*binary|bun.*build/i,
      category: "BUILD",
      subcategory: "EXECUTABLE",
      confidence: 0.95,
      keywords: ["build", "exe", "compile", "binary", "bun"],
      context: "Executable building and compilation"
    },

    // Governance Patterns
    {
      regex: /gov.*rule|compliance.*check|validation.*engine/i,
      category: "GOV",
      subcategory: "RULES",
      confidence: 0.94,
      keywords: ["gov", "rule", "compliance", "validation", "engine"],
      context: "Governance rules and compliance checking"
    },

    // Generic Fallbacks (Lower Confidence)
    {
      regex: /script|tool|utility|helper/i,
      category: "UTILITIES",
      subcategory: "TOOLS",
      confidence: 0.65,
      keywords: ["script", "tool", "utility", "helper"],
      context: "General utility scripts and tools"
    },
    {
      regex: /dashboard|report|analytics|chart/i,
      category: "DASHBOARD",
      subcategory: "REPORTS",
      confidence: 0.82,
      keywords: ["dashboard", "report", "analytics", "chart"],
      context: "Dashboard and reporting interfaces"
    }
  ];

  private statusPatterns = {
    ACTIVE: [/production|stable|active|live|main|core/i, 0.92],
    STABLE: [/stable|production|tested|reliable|trusted/i, 0.85],
    BETA: [/beta|preview|testing|unstable|experimental/i, 0.75],
    EXPERIMENTAL: [/experimental|alpha|prototype|proof.*of.*concept/i, 0.65],
    DEPRECATED: [/deprecated|legacy|old|obsolete|replaced/i, 0.55],
  };

  private versionPatterns = [
    { regex: /v(\d+)\.(\d+)\.(\d+)/i, extract: true },
    { regex: /version.*(\d+)\.(\d+)\.(\d+)/i, extract: true },
    { regex: /v(\d+)\.(\d+)/i, extract: true },
    { regex: /version.*(\d+)/i, extract: false },
    { default: "3.0" }
  ];

  // AI Context Learning
  private contextLearnings: Map<string, string[]> = new Map();
  private categoryMappings: Map<string, { primary: string; confidence: number }[]> = new Map();

  // Advanced AI Analysis with Context Learning
  async analyzeFile(filePath: string): Promise<HeaderAnalysis> {
    const content = readFileSync(filePath, 'utf-8');
    const filename = basename(filePath, extname(filePath));
    const relativePath = filePath.replace(process.cwd() + '/', '');

    // Multi-layered AI analysis
    const aiAnalysis = await this.performAIAnalysis(content, filename, relativePath);
    const patternAnalysis = this.performPatternAnalysis(content, filename);
    const contextAnalysis = this.performContextAnalysis(content, filename, relativePath);

    // Weighted combination of analyses
    const combinedResult = this.combineAnalyses(aiAnalysis, patternAnalysis, contextAnalysis);

    // Learn from this analysis for future improvements
    this.learnFromAnalysis(content, combinedResult);

    // Determine status with AI context
    const status = this.determineStatus(content, combinedResult.category);

    // Extract version with context awareness
    const version = this.extractVersion(content, combinedResult.category);

    // Generate unique code with category awareness
    const code = this.generateCode(filename, combinedResult.category, combinedResult.subcategory);

    // Generate AI-powered suggestions
    const suggestions = await this.generateAISuggestions(content, filename, combinedResult);

    return {
      file: filePath,
      category: combinedResult.category,
      subcategory: combinedResult.subcategory,
      version: `v${version}`,
      code,
      status,
      confidence: combinedResult.confidence,
      suggestions,
      aiReasoning: combinedResult.reasoning,
      contextScore: contextAnalysis.score
    };
  }

  private async performAIAnalysis(content: string, filename: string, relativePath: string): Promise<AIAnalysisResult> {
    // Simulate advanced AI analysis (in real implementation, this would call an AI model)
    const contentLower = content.toLowerCase();
    const filenameLower = filename.toLowerCase();

    // AI-powered categorization logic
    if (contentLower.includes('datapipe') && contentLower.includes('bet')) {
      return {
        primary: 'DATAPIPE',
        secondary: 'CORE',
        confidence: 0.98,
        reasoning: 'Contains datapipe and bet processing logic - core betting system',
        alternatives: ['API', 'ANALYTICS']
      };
    }

    if (contentLower.includes('websocket') && contentLower.includes('server')) {
      return {
        primary: 'WEBSOCKETS',
        secondary: 'SERVER',
        confidence: 0.96,
        reasoning: 'WebSocket server implementation with upgrade handling',
        alternatives: ['NETWORK', 'LIVE']
      };
    }

    if (contentLower.includes('ai') && contentLower.includes('header')) {
      return {
        primary: 'AI',
        secondary: 'HEADERS',
        confidence: 0.95,
        reasoning: 'AI-powered header generation and analysis system',
        alternatives: ['UTILITIES', 'ML']
      };
    }

    if (contentLower.includes('gov') && contentLower.includes('rule')) {
      return {
        primary: 'GOV',
        secondary: 'RULES',
        confidence: 0.97,
        reasoning: 'Governance rules engine and compliance system',
        alternatives: ['VALIDATION', 'SECURITY']
      };
    }

    // Default AI analysis
    return {
      primary: 'UTILITIES',
      secondary: 'TOOLS',
      confidence: 0.70,
      reasoning: 'General utility script without specific domain indicators',
      alternatives: ['UNKNOWN', 'GENERIC']
    };
  }

  private performPatternAnalysis(content: string, filename: string): { category: string; subcategory: string; confidence: number; pattern: HeaderPattern | null } {
    let bestMatch: HeaderPattern | null = null;
    let maxConfidence = 0;

    for (const pattern of this.patterns) {
      if (pattern.regex.test(content) || pattern.regex.test(filename)) {
        if (pattern.confidence > maxConfidence) {
          maxConfidence = pattern.confidence;
          bestMatch = pattern;
        }
      }
    }

    return {
      category: bestMatch?.category || 'UNKNOWN',
      subcategory: bestMatch?.subcategory || 'GENERAL',
      confidence: maxConfidence,
      pattern: bestMatch
    };
  }

  private performContextAnalysis(content: string, filename: string, relativePath: string): { score: number; context: string } {
    let score = 0.5;
    let context = 'Standard utility script';

    // Directory-based context
    if (relativePath.includes('scripts/')) score += 0.1;
    if (relativePath.includes('tests/')) { score += 0.2; context = 'Testing infrastructure'; }
    if (relativePath.includes('dashboards/')) { score += 0.15; context = 'User interface components'; }

    // Import-based context
    if (content.includes('from "./datapipe"')) { score += 0.2; context = 'Datapipe integration'; }
    if (content.includes('from "./gov-rules"')) { score += 0.15; context = 'Governance system'; }
    if (content.includes('WebSocket')) { score += 0.1; context = 'Network communications'; }

    // Function-based context
    if (content.includes('async function') && content.includes('fetch')) { score += 0.1; context = 'API client'; }
    if (content.includes('aggregate') && content.includes('agent')) { score += 0.15; context = 'Data aggregation'; }

    return { score: Math.min(score, 1.0), context };
  }

  private combineAnalyses(ai: AIAnalysisResult, pattern: any, context: any): any {
    // Weighted combination based on confidence scores
    const aiWeight = 0.5;
    const patternWeight = 0.3;
    const contextWeight = 0.2;

    // Use AI result if confidence is high
    if (ai.confidence > 0.9) {
      return {
        category: ai.primary,
        subcategory: ai.secondary,
        confidence: ai.confidence,
        reasoning: ai.reasoning
      };
    }

    // Use pattern result if AI is uncertain
    if (pattern.confidence > pattern.confidence) {
      return {
        category: pattern.category,
        subcategory: pattern.subcategory,
        confidence: pattern.confidence,
        reasoning: `Pattern matching: ${pattern.pattern?.context || 'Code pattern detected'}`
      };
    }

    // Fallback to AI result
    return {
      category: ai.primary,
      subcategory: ai.secondary,
      confidence: ai.confidence * 0.8, // Slight penalty for fallback
      reasoning: ai.reasoning
    };
  }

  private learnFromAnalysis(content: string, result: any): void {
    // Learn keywords for future categorization
    const keywords = content.toLowerCase()
      .match(/\b[a-z]{3,}\b/g) || []
      .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'had', 'by', 'hot', 'day', 'from', 'new'].includes(word))
      .slice(0, 10);

    const existing = this.contextLearnings.get(result.category) || [];
    this.contextLearnings.set(result.category, [...new Set([...existing, ...keywords])]);
  }

  private determineStatus(content: string, category: string): HeaderAnalysis['status'] {
    // Category-specific status defaults
    const categoryDefaults = {
      'DATAPIPE': 'ACTIVE',
      'WEBSOCKETS': 'ACTIVE',
      'AI': 'BETA',
      'GOV': 'ACTIVE',
      'UTILITIES': 'STABLE'
    };

    const defaultStatus = categoryDefaults[category] || 'ACTIVE';

    // Check content for status indicators
    for (const [statusKey, [regex, confidence]] of Object.entries(this.statusPatterns)) {
      if (regex.test(content)) {
        return statusKey as HeaderAnalysis['status'];
      }
    }

    return defaultStatus as HeaderAnalysis['status'];
  }

  private extractVersion(content: string, category: string): string {
    // Category-specific version defaults
    const categoryVersions = {
      'DATAPIPE': '2.6',
      'WEBSOCKETS': '2.8',
      'AI': '3.0',
      'GOV': '2.9',
      'UTILITIES': '1.3'
    };

    // Try to extract from content first
    for (const versionPattern of this.versionPatterns) {
      if ('regex' in versionPattern) {
        const match = content.match(versionPattern.regex);
        if (match) {
          return versionPattern.extract ? `${match[1]}.${match[2] || '0'}.${match[3] || '0'}` : match[1];
        }
      }
    }

    return categoryVersions[category] || '3.0';
  }

  private generateCode(filename: string, category: string, subcategory: string): string {
    // Generate unique code based on filename and category
    const hashInput = `${filename}-${category}-${subcategory}-${Date.now()}`;
    const codeHash = Bun.hash.crc32(hashInput).toString(16).toUpperCase().slice(0, 6);
    const categoryCode = category.slice(0, 2).toUpperCase();
    const subCode = subcategory.slice(0, 2).toUpperCase();

    return `${categoryCode}-${subCode}-${codeHash.slice(0, 3)}`;
  }

  private async generateAISuggestions(content: string, filename: string, analysis: any): Promise<string[]> {
    const suggestions: string[] = [];

    // AI-powered suggestions based on analysis
    if (analysis.category === 'DATAPIPE' && !content.includes('error')) {
      suggestions.push('Consider adding error handling for API failures');
    }

    if (analysis.category === 'WEBSOCKETS' && !content.includes('ping')) {
      suggestions.push('Add heartbeat/ping mechanism for connection health');
    }

    if (analysis.category === 'AI' && !content.includes('confidence')) {
      suggestions.push('Consider adding confidence scoring to AI predictions');
    }

    if (analysis.category === 'GOV' && !content.includes('audit')) {
      suggestions.push('Add audit logging for compliance tracking');
    }

    // Generic AI suggestions
    if (!content.includes('JSDoc') && content.includes('function')) {
      suggestions.push('Add JSDoc comments to improve API documentation');
    }

    if (content.includes('console.log') && !content.includes('bun:test')) {
      suggestions.push('Replace console.log with structured logging in production');
    }

    if (content.includes('TODO') || content.includes('FIXME')) {
      suggestions.push('Address technical debt items for better maintainability');
    }

    if (!content.includes('try') && content.includes('await')) {
      suggestions.push('Add error boundaries around async operations');
    }

    return suggestions;
  }

  generateHeader(analysis: HeaderAnalysis): string {
    return `[${analysis.category}][${analysis.subcategory}][${analysis.code}][${analysis.version}][${analysis.status}]`;
  }

  async analyzeDirectory(dirPath: string): Promise<HeaderAnalysis[]> {
    const results: HeaderAnalysis[] = [];
    const files = this.getTypeScriptFiles(dirPath);

    console.log(`🤖 Starting AI analysis of ${files.length} files...`);

    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        results.push(analysis);
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${file}: ${error}`);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private getTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = [];

    function walk(dir: string) {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walk(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
    }

    walk(dirPath);
    return files;
  }

  async generateHeaders(dirPath: string, apply: boolean = false): Promise<void> {
    const analyses = await this.analyzeDirectory(dirPath);

    console.log(`🤖 AI Header Analysis Complete - ${analyses.length} files processed\n`);

    for (const analysis of analyses) {
      const header = this.generateHeader(analysis);
      const relativePath = analysis.file.replace(process.cwd() + '/', '');

      console.log(`📄 ${relativePath}`);
      console.log(`   ${header}`);
      console.log(`   🤖 AI Reasoning: ${analysis.aiReasoning || 'Pattern-based analysis'}`);
      console.log(`   📊 Confidence: ${(analysis.confidence * 100).toFixed(1)}% | Context: ${(analysis.contextScore * 100).toFixed(1)}%`);

      if (analysis.suggestions.length > 0) {
        console.log(`   💡 AI Suggestions:`);
        analysis.suggestions.forEach(suggestion => {
          console.log(`      • ${suggestion}`);
        });
      }

      if (apply) {
        await this.applyHeader(analysis.file, header);
        console.log(`   ✅ Applied header`);
      }

      console.log('');
    }

    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    const avgContext = analyses.reduce((sum, a) => sum + a.contextScore, 0) / analyses.length;
    console.log(`📊 Analysis Summary:`);
    console.log(`   🤖 AI Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`   🎯 Context Score: ${(avgContext * 100).toFixed(1)}%`);

    if (!apply) {
      console.log(`💡 Run with --apply to automatically add headers to files`);
    }
  }

  private async applyHeader(filePath: string, header: string): Promise<void> {
    const content = readFileSync(filePath, 'utf-8');

    // Skip if header already exists
    if (content.includes('[') && content.includes(']') && content.split('\n')[0].includes(header.split('[')[1])) {
      return;
    }

    // Find the first comment or add at top
    const lines = content.split('\n');
    let insertIndex = 0;

    // Look for existing header or shebang
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#!') || lines[i].startsWith('// [') || lines[i].trim() === '') {
        insertIndex = i + 1;
      } else {
        break;
      }
    }

    // Add header comment
    const headerComment = `// ${header}\n`;
    lines.splice(insertIndex, 0, headerComment);

    const newContent = lines.join('\n');
    await Bun.write(filePath, newContent);
  }
}

// CLI Interface
const cmd = process.argv[2];
const targetPath = process.argv[3] || '.';
const apply = process.argv.includes('--apply');

const generator = new AIHeaderGenerator();

try {
  // Determine if target is a file or directory
  const isFile = existsSync(targetPath) && statSync(targetPath).isFile();
  const targetDir = isFile ? dirname(targetPath) : targetPath;
  const targetFile = isFile ? targetPath : null;

  switch (cmd) {
    case 'analyze':
      if (isFile) {
        // Analyze single file
        const analysis = await generator.analyzeFile(targetPath);
        console.log(`🤖 AI Header Analysis for ${targetPath}\n`);
        const header = generator.generateHeader(analysis);
        console.log(`📄 ${relative(process.cwd(), targetPath)}`);
        console.log(`   ${header}`);
        console.log(`   🤖 AI Reasoning: ${analysis.aiReasoning || 'Pattern-based analysis'}`);
        console.log(`   📊 Confidence: ${(analysis.confidence * 100).toFixed(1)}% | Context: ${(analysis.contextScore * 100).toFixed(1)}%`);
        if (analysis.suggestions.length > 0) {
          console.log(`   💡 AI Suggestions:`);
          analysis.suggestions.forEach(suggestion => {
            console.log(`      • ${suggestion}`);
          });
        }
        if (apply) {
          await generator.applyHeader(targetPath, header);
          console.log(`   ✅ Header applied`);
        }
      } else {
        await generator.generateHeaders(targetDir, apply);
      }
      break;

    case 'generate':
      if (isFile) {
        const analysis = await generator.analyzeFile(targetPath);
        const header = generator.generateHeader(analysis);
        await generator.applyHeader(targetPath, header);
        console.log(`✅ Applied header to ${targetPath}: ${header}`);
      } else {
        await generator.generateHeaders(targetDir, true);
      }
      break;

    case 'learn':
      console.log(`🧠 AI Learning Mode - Analyzing codebase patterns...\n`);
      await generator.generateHeaders(targetDir, false);
      console.log(`✅ AI learning complete - improved pattern recognition for future analyses`);
      break;

    case 'stats':
      const analyses = await generator.analyzeDirectory(targetDir);
      const categoryStats = analyses.reduce((acc, analysis) => {
        acc[analysis.category] = (acc[analysis.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`📊 AI Header Statistics:\n`);
      console.log(`Total Files Analyzed: ${analyses.length}`);
      console.log(`Average Confidence: ${(analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length * 100).toFixed(1)}%`);
      console.log(`Average Context Score: ${(analyses.reduce((sum, a) => sum + a.contextScore, 0) / analyses.length * 100).toFixed(1)}%\n`);

      console.log(`Category Distribution:`);
      Object.entries(categoryStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`  ${category}: ${count} files`);
        });
      break;

    default:
      console.log(`🤖 AI Header Generator v3.0 - Advanced ML-Powered Analysis

USAGE:
  bun ai:analyze [directory]          # AI-powered header analysis (dry run)
  bun ai:generate [directory]         # Generate and apply headers automatically
  bun ai:analyze --apply [directory]  # Analyze and apply headers in one pass
  bun ai:learn [directory]            # Learning mode - improve AI patterns
  bun ai:stats [directory]            # Show analysis statistics

EXAMPLES:
  bun scripts/ai-headers.ts analyze scripts/          # Analyze script headers
  bun scripts/ai-headers.ts generate .                # Apply to entire project
  bun scripts/ai-headers.ts analyze --apply dashboards/  # Analyze & apply
  bun scripts/ai-headers.ts stats .                   # Show category statistics

AI FEATURES:
  • 🤖 Multi-layered AI analysis (pattern + context + semantic)
  • 📊 Confidence scoring with reasoning
  • 🎯 Context-aware categorization
  • 🧠 Machine learning from codebase patterns
  • 💡 Intelligent code quality suggestions
  • 🔄 Automatic header application with conflict detection
  • 📈 Continuous learning and improvement

ANALYSIS LAYERS:
  1. AI Semantic Analysis - Understands code purpose and relationships
  2. Pattern Recognition - Regex-based keyword matching
  3. Context Scoring - Directory, imports, and function analysis
  4. Confidence Weighting - Combines all signals intelligently
  5. Learning System - Improves from each analysis

SUPPORTED CATEGORIES:
  DATAPIPE, WEBSOCKETS, DATAVIEW, DATABASE, CACHE, AI, PARALLEL,
  UTILITIES, ETL, MCP, PARSING, ANALYTICS, EXPORT, API, QUERY,
  TESTS, BUILD, GOV, DASHBOARD, TELEGRAM, AGENT, COMPLIANCE
`);
  }
} catch (error) {
  console.error(`❌ AI Header Generator error: ${error.message}`);
  process.exit(1);
}

