#!/usr/bin/env bun
// ⚡ Factory-Wager One-Liners v3.8 - Pattern Tags & Code Blocks Enhanced
// Optimized for LLM Context with Rich Pattern Recognition

interface OneLinerPattern {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  tags: string[];
  patterns: string[];
  codeBlocks: {
    type: 'curl' | 'bun-e' | 'fetch' | 'crypto' | 's3' | 'r2';
    template: string;
    variables: string[];
  };
  context: {
    useCase: string;
    domain: string;
    complexity: 'simple' | 'intermediate' | 'advanced';
    dependencies: string[];
  };
  performance: {
    avgTime: number;
    opsPerSec: number;
    reliability: 'high' | 'medium' | 'low';
  };
}

class FactoryWagerPatternOneliners {
  private patterns: OneLinerPattern[] = [
    {
      id: 'cookie-variant-a',
      name: 'Cookie A/B Testing - Variant A',
      command: 'curl -H "Cookie: variant=A" http://localhost:3000',
      description: 'Set Cookie A for Admin UI variant testing',
      category: 'cookies',
      tags: ['ab-testing', 'variant', 'cookie', 'ui', 'admin'],
      patterns: [
        'curl -H "Cookie: variant={VARIANT}" {URL}',
        'fetch("{URL}", {headers: {Cookie: "variant={VARIANT}"}})',
        'HTTP header manipulation for A/B testing'
      ],
      codeBlocks: {
        type: 'curl',
        template: 'curl -H "Cookie: variant={variant}" {url}',
        variables: ['variant', 'url']
      },
      context: {
        useCase: 'A/B testing UI variants',
        domain: 'web-development',
        complexity: 'simple',
        dependencies: ['curl', 'HTTP server']
      },
      performance: {
        avgTime: 0.02,
        opsPerSec: 66576,
        reliability: 'high'
      }
    },
    {
      id: 'r2-upload-profile',
      name: 'R2 Profile Upload',
      command: 'bun -e \'fetch("cf://r2.factory-wager.com/profiles.json",{method:"PUT",body:JSON.stringify({test:1})})\'',
      description: 'Upload profile data to Cloudflare R2 storage',
      category: 'r2',
      tags: ['r2', 'upload', 'storage', 'cloudflare', 'json'],
      patterns: [
        'fetch("cf://{bucket}/{path}", {method: "PUT", body: data})',
        'Cloudflare R2 direct protocol usage',
        'JSON payload upload to object storage'
      ],
      codeBlocks: {
        type: 'r2',
        template: 'fetch("cf://{bucket}/{path}",{method:"PUT",body:JSON.stringify({data})})',
        variables: ['bucket', 'path', 'data']
      },
      context: {
        useCase: 'Object storage upload',
        domain: 'cloud-storage',
        complexity: 'intermediate',
        dependencies: ['Bun', 'Cloudflare R2']
      },
      performance: {
        avgTime: 0.00,
        opsPerSec: 634840,
        reliability: 'high'
      }
    },
    {
      id: 'cdn-etag-generation',
      name: 'CDN ETag Generation',
      command: 'bun -e \'new Bun.CryptoHasher("sha256").update("html").digest("hex")\'',
      description: 'Generate SHA-256 hash for CDN ETag headers',
      category: 'cdn',
      tags: ['etag', 'hash', 'sha256', 'cdn', 'crypto'],
      patterns: [
        'new Bun.CryptoHasher("sha256").update(data).digest("hex")',
        'Cryptographic hash generation for cache validation',
        'CDN ETag computation pattern'
      ],
      codeBlocks: {
        type: 'crypto',
        template: 'new Bun.CryptoHasher("{algorithm}").update({data}).digest("{format}")',
        variables: ['algorithm', 'data', 'format']
      },
      context: {
        useCase: 'Cache validation and ETag generation',
        domain: 'web-performance',
        complexity: 'simple',
        dependencies: ['Bun crypto API']
      },
      performance: {
        avgTime: 0.20,
        opsPerSec: 13233,
        reliability: 'high'
      }
    },
    {
      id: 'subdomain-routing-admin',
      name: 'Subdomain Admin Routing',
      command: 'curl -H "Host: admin.factory-wager.com" http://localhost:3000',
      description: 'Route to admin subdomain using Host header',
      category: 'subdomains',
      tags: ['subdomain', 'routing', 'host-header', 'admin', 'reverse-proxy'],
      patterns: [
        'curl -H "Host: {subdomain}.{domain}" {url}',
        'Host header manipulation for subdomain routing',
        'Local development subdomain simulation'
      ],
      codeBlocks: {
        type: 'curl',
        template: 'curl -H "Host: {subdomain}.{domain}" {url}',
        variables: ['subdomain', 'domain', 'url']
      },
      context: {
        useCase: 'Subdomain routing simulation',
        domain: 'networking',
        complexity: 'simple',
        dependencies: ['curl', 'HTTP server']
      },
      performance: {
        avgTime: 0.00,
        opsPerSec: 189970,
        reliability: 'high'
      }
    },
    {
      id: 'junior-runner-post',
      name: 'JuniorRunner Profile POST',
      command: 'curl -d \'# Hi\' -X POST http://localhost:3000/profile',
      description: 'POST markdown content to JuniorRunner profile endpoint',
      category: 'profiling',
      tags: ['junior-runner', 'post', 'markdown', 'profile', 'api'],
      patterns: [
        'curl -d {data} -X POST {endpoint}',
        'Markdown content submission pattern',
        'Profile data upload via REST API'
      ],
      codeBlocks: {
        type: 'curl',
        template: 'curl -d \'{data}\' -X POST {endpoint}',
        variables: ['data', 'endpoint']
      },
      context: {
        useCase: 'Profile data submission',
        domain: 'api-integration',
        complexity: 'simple',
        dependencies: ['curl', 'JuniorRunner API']
      },
      performance: {
        avgTime: 0.00,
        opsPerSec: 800000,
        reliability: 'high'
      }
    },
    {
      id: 's3-presign-download',
      name: 'S3 Presign Download URL',
      command: 'bun -e \'import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});console.log(s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\\"profile.json\\"",type:"application/json"}))\'',
      description: 'Generate S3 presigned URL for file download with attachment disposition',
      category: 's3-presign',
      tags: ['s3', 'presign', 'download', 'attachment', 'content-disposition'],
      patterns: [
        's3.file("{key}").presign({method: "GET", contentDisposition: "attachment; filename=\\"{filename}\\"", type: "{contentType}"})',
        'S3 presigned URL generation with content disposition',
        'File download vs inline viewing control'
      ],
      codeBlocks: {
        type: 's3',
        template: 's3.file("{key}").presign({method:"GET",expiresIn:{expiresIn},contentDisposition:"{disposition}",type:"{contentType}"})',
        variables: ['key', 'expiresIn', 'disposition', 'contentType']
      },
      context: {
        useCase: 'Secure file download URLs',
        domain: 'cloud-storage',
        complexity: 'advanced',
        dependencies: ['Bun S3Client', 'AWS S3/R2']
      },
      performance: {
        avgTime: 0.05,
        opsPerSec: 45000,
        reliability: 'high'
      }
    },
    {
      id: 'performance-benchmark',
      name: 'Performance Benchmark Test',
      command: 'bun -e \'const t0=performance.now();for(let i=0;i<100;i++){await new Bun.CryptoHasher("sha256").update("test"+i).digest("hex")}console.log(performance.now()-t0)\'',
      description: 'Benchmark crypto operations with performance timing',
      category: 'performance',
      tags: ['benchmark', 'performance', 'timing', 'crypto', 'optimization'],
      patterns: [
        'const t0=performance.now();{operations};console.log(performance.now()-t0)',
        'JavaScript performance measurement pattern',
        'Loop-based benchmarking with timing'
      ],
      codeBlocks: {
        type: 'bun-e',
        template: 'const t0=performance.now();{operations};console.log(performance.now()-t0)',
        variables: ['operations']
      },
      context: {
        useCase: 'Performance testing and optimization',
        domain: 'performance-engineering',
        complexity: 'intermediate',
        dependencies: ['Bun', 'performance API']
      },
      performance: {
        avgTime: 0.19,
        opsPerSec: 1411433,
        reliability: 'high'
      }
    },
    {
      id: 'bulk-operations-parallel',
      name: 'Bulk Operations Parallel',
      command: 'bun -e \'const promises=[];for(let i=0;i<10;i++){promises.push(new Bun.CryptoHasher("sha256").update("bulk"+i).digest("hex"))}await Promise.all(promises)\'',
      description: 'Execute bulk operations in parallel for improved performance',
      category: 'performance',
      tags: ['bulk', 'parallel', 'promise-all', 'optimization', 'concurrency'],
      patterns: [
        'const promises=[];for(let i=0;i<{count};i++){promises.push({operation})}await Promise.all(promises)',
        'Parallel execution pattern with Promise.all',
        'Bulk operation optimization'
      ],
      codeBlocks: {
        type: 'bun-e',
        template: 'const promises=[];for(let i=0;i<{count};i++){promises.push({operation})}await Promise.all(promises)',
        variables: ['count', 'operation']
      },
      context: {
        useCase: 'Bulk data processing optimization',
        domain: 'performance-engineering',
        complexity: 'intermediate',
        dependencies: ['Bun', 'Promise API']
      },
      performance: {
        avgTime: 0.32,
        opsPerSec: 1454545,
        reliability: 'high'
      }
    }
  ];

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: string): OneLinerPattern[] {
    return this.patterns.filter(p => p.category === category);
  }

  /**
   * Get patterns by tags
   */
  getPatternsByTags(tags: string[]): OneLinerPattern[] {
    return this.patterns.filter(p => 
      tags.some(tag => p.tags.includes(tag))
    );
  }

  /**
   * Get patterns by complexity
   */
  getPatternsByComplexity(complexity: 'simple' | 'intermediate' | 'advanced'): OneLinerPattern[] {
    return this.patterns.filter(p => p.context.complexity === complexity);
  }

  /**
   * Get patterns by code block type
   */
  getPatternsByCodeType(type: 'curl' | 'bun-e' | 'fetch' | 'crypto' | 's3' | 'r2'): OneLinerPattern[] {
    return this.patterns.filter(p => p.codeBlocks.type === type);
  }

  /**
   * Generate LLM-optimized context
   */
  generateLLMContext(options: {
    categories?: string[];
    tags?: string[];
    complexity?: string[];
    includePatterns?: boolean;
    includeCodeBlocks?: boolean;
    maxPatterns?: number;
  } = {}): string {
    let filteredPatterns = this.patterns;

    // Apply filters
    if (options.categories) {
      filteredPatterns = filteredPatterns.filter(p => 
        options.categories!.includes(p.category)
      );
    }

    if (options.tags) {
      filteredPatterns = filteredPatterns.filter(p => 
        options.tags!.some(tag => p.tags.includes(tag))
      );
    }

    if (options.complexity) {
      filteredPatterns = filteredPatterns.filter(p => 
        options.complexity!.includes(p.context.complexity)
      );
    }

    // Limit patterns if specified
    if (options.maxPatterns) {
      filteredPatterns = filteredPatterns.slice(0, options.maxPatterns);
    }

    // Generate context
    let context = `# Factory-Wager One-Liners v3.8 - LLM Optimized Context\n\n`;
    context += `## Pattern Summary\n`;
    context += `- Total Patterns: ${filteredPatterns.length}\n`;
    context += `- Categories: ${[...new Set(filteredPatterns.map(p => p.category))].join(', ')}\n`;
    context += `- Complexity Levels: ${[...new Set(filteredPatterns.map(p => p.context.complexity))].join(', ')}\n`;
    context += `- Code Types: ${[...new Set(filteredPatterns.map(p => p.codeBlocks.type))].join(', ')}\n\n`;

    // Generate pattern entries
    filteredPatterns.forEach((pattern, index) => {
      context += `## Pattern ${index + 1}: ${pattern.name}\n\n`;
      context += `**ID**: \`${pattern.id}\`\n`;
      context += `**Category**: \`${pattern.category}\`\n`;
      context += `**Complexity**: \`${pattern.context.complexity}\`\n`;
      context += `**Tags**: ${pattern.tags.map(tag => `\`${tag}\``).join(', ')}\n`;
      context += `**Use Case**: ${pattern.context.useCase}\n`;
      context += `**Dependencies**: ${pattern.context.dependencies.join(', ')}\n\n`;

      context += `### Command\n\`\`\`bash\n${pattern.command}\n\`\`\`\n\n`;

      if (options.includePatterns !== false) {
        context += `### Patterns\n${pattern.patterns.map(p => `- \`${p}\``).join('\n')}\n\n`;
      }

      if (options.includeCodeBlocks !== false) {
        context += `### Code Block Template\n\`\`\`${pattern.codeBlocks.type}\n${pattern.codeBlocks.template}\n\`\`\`\n`;
        context += `**Variables**: ${pattern.codeBlocks.variables.map(v => `\`${v}\``).join(', ')}\n\n`;
      }

      context += `### Performance\n`;
      context += `- **Avg Time**: ${pattern.performance.avgTime}ms\n`;
      context += `- **Ops/sec**: ${pattern.performance.opsPerSec.toLocaleString()}\n`;
      context += `- **Reliability**: ${pattern.performance.reliability}\n\n`;

      context += `---\n\n`;
    });

    return context;
  }

  /**
   * Generate pattern matching guide
   */
  generatePatternMatchingGuide(): string {
    let guide = `# Factory-Wager Pattern Matching Guide\n\n`;
    
    guide += `## Pattern Categories\n\n`;
    
    const categories = [...new Set(this.patterns.map(p => p.category))];
    categories.forEach(category => {
      const patterns = this.getPatternsByCategory(category);
      guide += `### ${category.toUpperCase()}\n`;
      guide += `- **Count**: ${patterns.length} patterns\n`;
      guide += `- **Common Tags**: ${[...new Set(patterns.flatMap(p => p.tags))].slice(0, 5).join(', ')}\n`;
      guide += `- **Avg Performance**: ${Math.round(patterns.reduce((sum, p) => sum + p.performance.opsPerSec, 0) / patterns.length).toLocaleString()} ops/s\n\n`;
    });

    guide += `## Pattern Recognition Matrix\n\n`;
    guide += `| Use Case | Pattern | Complexity | Code Type |\n`;
    guide += `|----------|---------|------------|-----------|\n`;
    
    this.patterns.forEach(pattern => {
      guide += `| ${pattern.context.useCase} | \`${pattern.patterns[0]}\` | ${pattern.context.complexity} | ${pattern.codeBlocks.type} |\n`;
    });

    guide += `\n## Tag-Based Filtering\n\n`;
    const allTags = [...new Set(this.patterns.flatMap(p => p.tags))];
    guide += `### Available Tags (${allTags.length})\n`;
    guide += allTags.map(tag => `- \`${tag}\``).join('\n');

    guide += `\n\n### Popular Tag Combinations\n`;
    const tagCombinations = [
      ['ab-testing', 'cookie'],
      ['r2', 'upload'],
      ['performance', 'benchmark'],
      ['s3', 'presign'],
      ['subdomain', 'routing']
    ];

    tagCombinations.forEach(combo => {
      const patterns = this.getPatternsByTags(combo);
      if (patterns.length > 0) {
        guide += `- **${combo.join(' + ')}**: ${patterns.length} patterns\n`;
      }
    });

    return guide;
  }

  /**
   * Export patterns for external consumption
   */
  exportPatterns(format: 'json' | 'markdown' | 'csv' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.patterns, null, 2);
      
      case 'markdown':
        return this.generateLLMContext({
          includePatterns: true,
          includeCodeBlocks: true
        });
      
      case 'csv':
        const headers = ['ID', 'Name', 'Category', 'Complexity', 'Tags', 'Use Case', 'Code Type', 'Ops/sec'];
        const rows = this.patterns.map(p => [
          p.id,
          p.name,
          p.category,
          p.context.complexity,
          p.tags.join(';'),
          p.context.useCase,
          p.codeBlocks.type,
          p.performance.opsPerSec.toString()
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      default:
        return this.exportPatterns('json');
    }
  }

  /**
   * Search patterns with fuzzy matching
   */
  searchPatterns(query: string, options: {
    searchIn?: ('name' | 'description' | 'tags' | 'patterns')[];
    fuzzy?: boolean;
    limit?: number;
  } = {}): OneLinerPattern[] {
    const searchFields = options.searchIn || ['name', 'description', 'tags', 'patterns'];
    const limit = options.limit || 10;
    
    const results = this.patterns
      .map(pattern => {
        let score = 0;
        const lowerQuery = query.toLowerCase();
        
        searchFields.forEach(field => {
          if (field === 'tags') {
            pattern.tags.forEach(tag => {
              if (tag.toLowerCase().includes(lowerQuery)) {
                score += 2; // Higher weight for tag matches
              }
            });
          } else if (field === 'patterns') {
            pattern.patterns.forEach(patternStr => {
              if (patternStr.toLowerCase().includes(lowerQuery)) {
                score += 1.5; // Medium weight for pattern matches
              }
            });
          } else {
            const fieldValue = (pattern as any)[field]?.toLowerCase() || '';
            if (fieldValue.includes(lowerQuery)) {
              score += 1; // Base weight for field matches
            }
          }
        });
        
        return { pattern, score };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.pattern);
    
    return results;
  }
}

// Usage examples and CLI interface
async function main() {
  const patternSystem = new FactoryWagerPatternOneliners();

  console.log('⚡ Factory-Wager Pattern One-Liners v3.8');
  console.log('🏷️ Enhanced with Pattern Tags & Code Blocks for LLM Context\n');

  // Generate LLM context example
  console.log('📊 Generating LLM-Optimized Context...');
  const llmContext = patternSystem.generateLLMContext({
    categories: ['cookies', 'r2', 's3-presign'],
    includePatterns: true,
    includeCodeBlocks: true,
    maxPatterns: 5
  });

  // Save to file
  await Bun.write('factory-wager-patterns-llm-context.md', llmContext);
  console.log('✅ LLM Context saved to factory-wager-patterns-llm-context.md');

  // Generate pattern matching guide
  console.log('🎯 Generating Pattern Matching Guide...');
  const guide = patternSystem.generatePatternMatchingGuide();
  await Bun.write('factory-wager-pattern-matching-guide.md', guide);
  console.log('✅ Pattern Guide saved to factory-wager-pattern-matching-guide.md');

  // Export patterns in different formats
  console.log('💾 Exporting patterns...');
  await Bun.write('factory-wager-patterns.json', patternSystem.exportPatterns('json'));
  await Bun.write('factory-wager-patterns.csv', patternSystem.exportPatterns('csv'));
  console.log('✅ Patterns exported in JSON and CSV formats');

  // Demonstrate search functionality
  console.log('🔍 Demonstrating pattern search...');
  const searchResults = patternSystem.searchPatterns('s3 upload', {
    searchIn: ['tags', 'description', 'name'],
    limit: 3
  });

  console.log(`Found ${searchResults.length} patterns matching "s3 upload":`);
  searchResults.forEach(pattern => {
    console.log(`  - ${pattern.name} (${pattern.category})`);
  });

  // Show statistics
  console.log('\n📈 Pattern System Statistics:');
  console.log(`Total Patterns: ${patternSystem['patterns'].length}`);
  console.log(`Categories: ${[...new Set(patternSystem['patterns'].map(p => p.category))].join(', ')}`);
  console.log(`Total Tags: ${[...new Set(patternSystem['patterns'].flatMap(p => p.tags))].length}`);
  console.log(`Code Types: ${[...new Set(patternSystem['patterns'].map(p => p.codeBlocks.type))].join(', ')}`);

  console.log('\n🎉 Pattern System Ready for LLM Consumption!');
}

// Export for use in other modules
export { FactoryWagerPatternOneliners, OneLinerPattern };

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
