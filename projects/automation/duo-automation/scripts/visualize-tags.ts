#!/usr/bin/env bun

/**
 * Tag Visualization Generator
 * Creates visual representations of tag relationships and usage patterns
 */


interface VisualizationOptions {
  output?: 'mermaid' | 'heatmap' | 'dependencies' | 'all';
  format?: 'markdown' | 'html' | 'json';
  includeStats?: boolean;
  minUsage?: number;
}

interface TagData {
  tag: string;
  count: number;
  category: string;
  related: string[];
  artifacts: string[];
}

interface RelationshipData {
  source: string;
  target: string;
  strength: number;
  type: 'related' | 'co-occurrence' | 'dependency';
}

class TagVisualizer {
  private tagData: Map<string, TagData> = new Map();
  private relationships: RelationshipData[] = [];
  private totalArtifacts = 0;

  /**
   * Generate comprehensive tag visualizations
   */
  async generateVisualizations(options: VisualizationOptions = {}): Promise<void> {
    console.log('🎨 Generating tag visualizations...');
    const startTime = Date.now();

    await this.collectTagData();
    await this.analyzeRelationships();

    const outputTypes = options.output === 'all' 
      ? ['mermaid', 'heatmap', 'dependencies'] 
      : [options.output || 'mermaid'];

    for (const outputType of outputTypes) {
      await this.generateVisualization(outputType, options);
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Visualizations generated in ${elapsed}ms`);
  }

  /**
   * Collect tag data from all artifacts
   */
  private async collectTagData(): Promise<void> {
    console.log('📊 Collecting tag data...');
    
    const excludeDirs = [
      '.git', 'node_modules', '.bun', 'dist', 'build', 'coverage',
      '.next', '.nuxt', '.cache', 'tmp', 'temp', '.github'
    ];

    const scanDirectory = (dirPath: string): void => {
      try {
        const entries = readdirSync(dirPath);

        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !excludeDirs.includes(entry)) {
            scanDirectory(fullPath);
          } else if (stat.isFile()) {
            this.processArtifact(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scanDirectory('./');
    console.log(`📈 Analyzed ${this.totalArtifacts} artifacts`);
  }

  /**
   * Process a single artifact for tag data
   */
  private processArtifact(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const tags = this.extractTags(content);
      
      if (tags.length > 0) {
        this.totalArtifacts++;
        
        tags.forEach(tag => {
          if (!this.tagData.has(tag)) {
            this.tagData.set(tag, {
              tag,
              count: 0,
              category: this.getCategory(tag),
              related: this.getRelatedTags(tag),
              artifacts: []
            });
          }
          
          const data = this.tagData.get(tag)!;
          data.count++;
          data.artifacts.push(filePath);
        });
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  /**
   * Analyze tag relationships
   */
  private async analyzeRelationships(): Promise<void> {
    console.log('🔗 Analyzing tag relationships...');
    
    // Analyze co-occurrence
    const artifactTags: string[][] = [];
    
    this.tagData.forEach(data => {
      data.artifacts.forEach(artifact => {
        const tags = this.getArtifactTags(artifact);
        if (tags.length > 1) {
          artifactTags.push(tags);
        }
      });
    });

    // Calculate co-occurrence strength
    const coOccurrences: Map<string, number> = new Map();
    
    artifactTags.forEach(tags => {
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const pair = [tags[i], tags[j]].sort().join('-');
          coOccurrences.set(pair, (coOccurrences.get(pair) || 0) + 1);
        }
      }
    });

    // Create relationship data
    coOccurrences.forEach((strength, pair) => {
      const [source, target] = pair.split('-');
      this.relationships.push({
        source,
        target,
        strength,
        type: 'co-occurrence'
      });
    });

    console.log(`🔗 Found ${this.relationships.length} tag relationships`);
  }

  /**
   * Generate specific visualization type
   */
  private async generateVisualization(type: string, options: VisualizationOptions): Promise<void> {
    switch (type) {
      case 'mermaid':
        this.generateMermaidDiagram(options);
        break;
      case 'heatmap':
        await this.generateHeatmap(options);
        break;
      case 'dependencies':
        await this.generateDependencyGraph(options);
        break;
    }
  }

  /**
   * Generate Mermaid diagram for tag relationships
   */
  private generateMermaidDiagram(options: VisualizationOptions): void {
    console.log('🎨 Generating Mermaid relationship diagram...');
    
    const minUsage = options.minUsage || 2;
    const significantTags = Array.from(this.tagData.values())
      .filter(data => data.count >= minUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const significantRelationships = this.relationships
      .filter(rel => rel.strength >= minUsage)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 30);

    let mermaid = 'graph LR\n';
    mermaid += '  %% Tag Relationship Diagram\n';
    mermaid += '  %% Generated by Tag Visualizer\n\n';

    // Add nodes
    significantTags.forEach(data => {
      const category = this.getCategoryColor(data.category);
      mermaid += `  ${data.tag.replace('#', '')}["${data.tag}<br/>${data.count} artifacts"]\n`;
    });

    mermaid += '\n';

    // Add relationships
    significantRelationships.forEach(rel => {
      const strength = Math.min(rel.strength, 5);
      const lineStyle = strength >= 4 ? '===' : strength >= 2 ? '--' : '-';
      mermaid += `  ${rel.source.replace('#', '')} ${lineStyle}|${rel.strength}| ${rel.target.replace('#', '')}\n`;
    });

    mermaid += '\n';

    // Add category styling
    const categories = [...new Set(significantTags.map(data => data.category))];
    categories.forEach(category => {
      const color = this.getCategoryColor(category);
      const tagsInCategory = significantTags
        .filter(data => data.category === category)
        .map(data => data.tag.replace('#', ''));
      
      mermaid += `  classDef ${category} fill:${color},stroke:#333,stroke-width:2px\n`;
      mermaid += `  class ${tagsInCategory.join(',')} ${category}\n`;
    });

    // Write to file
    await this.writeToFile('docs/TAG_RELATIONSHIPS.mmd', mermaid);
    console.log('✅ Mermaid diagram saved to docs/TAG_RELATIONSHIPS.mmd');
  }

  /**
   * Generate heatmap visualization
   */
  private async generateHeatmap(options: VisualizationOptions): Promise<void> {
    console.log('🔥 Generating tag usage heatmap...');
    
    const categories = ['status', 'domain', 'technology', 'type', 'priority', 'audience', 'environment'];
    const heatmapData: string[][] = [];

    // Header
    heatmapData.push(['Category', 'Tag', 'Usage', 'Percentage']);

    // Data rows
    categories.forEach(category => {
      const categoryTags = Array.from(this.tagData.values())
        .filter(data => data.category === category)
        .sort((a, b) => b.count - a.count);

      categoryTags.forEach(data => {
        const percentage = this.totalArtifacts > 0 
          ? Math.round((data.count / this.totalArtifacts) * 100)
          : 0;

        const heatLevel = this.getHeatLevel(percentage);
        const emoji = this.getHeatEmoji(heatLevel);
        
        heatmapData.push([
          category,
          data.tag,
          `${data.count}`,
          `${percentage}% ${emoji}`
        ]);
      });
    });

    // Generate markdown heatmap
    let markdown = '# Tag Usage Heatmap\n\n';
    markdown += `Generated on ${new Date().toISOString()}\n\n`;
    markdown += `Total Artifacts: ${this.totalArtifacts}\n\n`;
    
    markdown += '| Category | Tag | Usage | Percentage |\n';
    markdown += '|----------|-----|-------|------------|\n';
    
    heatmapData.slice(1).forEach(row => {
      markdown += `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} |\n`;
    });

    // Add heatmap legend
    markdown += '\n## Heat Legend\n\n';
    markdown += '🔥 High Usage (>10%) | 🌡️ Medium Usage (5-10%) | ❄️ Low Usage (<5%)\n\n';

    await this.writeToFile('docs/TAG_HEATMAP.md', markdown);
    console.log('✅ Heatmap saved to docs/TAG_HEATMAP.md');
  }

  /**
   * Generate dependency graph
   */
  private async generateDependencyGraph(options: VisualizationOptions): Promise<void> {
    console.log('🕸️  Generating artifact dependency graph...');
    
    let dot = 'digraph ArtifactDependencies {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box, style=filled];\n';
    dot += '  edge [color=gray];\n\n';

    // Group by category
    const categories = [...new Set(Array.from(this.tagData.values()).map(data => data.category))];
    
    categories.forEach(category => {
      const color = this.getCategoryColor(category);
      dot += `  subgraph cluster_${category} {\n`;
      dot += `    label="${category}";\n`;
      dot += `    bgcolor="${color}20";\n`;
      
      const categoryTags = Array.from(this.tagData.values())
        .filter(data => data.category === category)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      categoryTags.forEach(data => {
        const label = `${data.tag}\\n${data.count} artifacts`;
        dot += `    "${data.tag}" [label="${label}", fillcolor="${color}"];\n`;
      });
      
      dot += '  }\n\n';
    });

    // Add relationships
    const strongRelationships = this.relationships
      .filter(rel => rel.strength >= 3)
      .slice(0, 20);

    strongRelationships.forEach(rel => {
      const width = Math.min(rel.strength, 5);
      dot += `  "${rel.source}" -> "${rel.target}" [penwidth=${width}];\n`;
    });

    dot += '}\n';

    await this.writeToFile('docs/ARTIFACT_DEPENDENCIES.dot', dot);
    console.log('✅ Dependency graph saved to docs/ARTIFACT_DEPENDENCIES.dot');
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();
    const matches = content.match(/#[a-z0-9-]+/g) || [];
    matches.forEach(tag => tags.add(tag));
    return Array.from(tags).sort();
  }

  /**
   * Get tags for a specific artifact
   */
  private getArtifactTags(filePath: string): string[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return this.extractTags(content);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get category for a tag
   */
  private getCategory(tag: string): string {
    const statusTags = ['#ready', '#wip', '#review', '#blocked', '#deprecated'];
    const domainTags = ['#security', '#config-management', '#devops', '#monitoring', '#api', '#ui', '#database', '#testing', '#documentation', '#performance'];
    const technologyTags = ['#typescript', '#javascript', '#bun', '#react', '#vue', '#docker', '#kubernetes', '#aws', '#gcp', '#azure'];
    const typeTags = ['#api', '#cli', '#dashboard', '#library', '#component', '#service', '#utility'];
    const priorityTags = ['#critical', '#high', '#medium', '#low'];
    const audienceTags = ['#developers', '#devops', '#security', '#users', '#admins', '#all'];
    const environmentTags = ['#production', '#staging', '#development', '#local', '#testing'];

    if (statusTags.includes(tag)) return 'status';
    if (domainTags.includes(tag)) return 'domain';
    if (technologyTags.includes(tag)) return 'technology';
    if (typeTags.includes(tag)) return 'type';
    if (priorityTags.includes(tag)) return 'priority';
    if (audienceTags.includes(tag)) return 'audience';
    if (environmentTags.includes(tag)) return 'environment';
    
    return 'other';
  }

  /**
   * Get related tags from registry
   */
  private getRelatedTags(tag: string): string[] {
    try {
      const registry = JSON.parse(readFileSync('./docs/TAG_REGISTRY.json', 'utf-8'));
      return registry.tags[tag]?.related || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get color for category
   */
  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      status: '#3b82f6',
      domain: '#3b82f6',
      technology: '#3b82f6',
      type: '#3b82f6',
      priority: '#3b82f6',
      audience: '#3b82f6',
      environment: '#3b82f6',
      other: '#3b82f6'
    };
    
    return colors[category] || '#3b82f6';
  }

  /**
   * Get heat level for percentage
   */
  private getHeatLevel(percentage: number): 'high' | 'medium' | 'low' {
    if (percentage >= 10) return 'high';
    if (percentage >= 5) return 'medium';
    return 'low';
  }

  /**
   * Get emoji for heat level
   */
  private getHeatEmoji(level: 'high' | 'medium' | 'low'): string {
    const emojis = {
      high: '🔥',
      medium: '🌡️',
      low: '❄️'
    };
    
    return emojis[level];
  }

  /**
   * Write content to file
   */
  private async writeToFile(filePath: string, content: string): Promise<void> {
    try {
      await Bun.write(filePath, content);
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error);
    }
  }

  /**
   * Get visualization statistics
   */
  getStats(): {
    totalTags: number;
    totalRelationships: number;
    totalArtifacts: number;
    categoryDistribution: Record<string, number>;
    topTags: Array<{ tag: string; count: number; category: string }>;
  } {
    const categoryDistribution: Record<string, number> = {};
    
    this.tagData.forEach(data => {
      categoryDistribution[data.category] = (categoryDistribution[data.category] || 0) + 1;
    });

    const topTags = Array.from(this.tagData.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(data => ({ tag: data.tag, count: data.count, category: data.category }));

    return {
      totalTags: this.tagData.size,
      totalRelationships: this.relationships.length,
      totalArtifacts: this.totalArtifacts,
      categoryDistribution,
      topTags
    };
  }
}

/**
 * CLI interface for tag visualization
 */
async function main() {
  const args = process.argv.slice(2);
  const options: VisualizationOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--output':
      case '-o':
        options.output = args[++i] as any;
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as any;
        break;
      case '--include-stats':
        options.includeStats = true;
        break;
      case '--min-usage':
        options.minUsage = parseInt(args[++i]) || 2;
        break;
      case '--help':
      case '-h':
        console.log(`
🎨 Tag Visualization CLI

Usage: bun run scripts/visualize-tags.ts [options]

Options:
  -o, --output <type>     Output type: mermaid, heatmap, dependencies, all
  -f, --format <format>   Output format: markdown, html, json
  --include-stats         Include statistics in output
  --min-usage <number>    Minimum tag usage threshold (default: 2)
  -h, --help              Show this help

Examples:
  bun run scripts/visualize-tags.ts --output all
  bun run scripts/visualize-tags.ts --output mermaid --min-usage 5
  bun run scripts/visualize-tags.ts --output heatmap --include-stats
        `);
        return;
    }
  }

  const visualizer = new TagVisualizer();
  await visualizer.generateVisualizations(options);
  
  if (options.includeStats) {
    const stats = visualizer.getStats();
    console.log('\n📊 Visualization Statistics:');
    console.log(`  Total Tags: ${stats.totalTags}`);
    console.log(`  Total Relationships: ${stats.totalRelationships}`);
    console.log(`  Total Artifacts: ${stats.totalArtifacts}`);
    console.log(`  Category Distribution:`, stats.categoryDistribution);
    console.log(`  Top Tags:`, stats.topTags.slice(0, 5));
  }
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { TagVisualizer, VisualizationOptions };
