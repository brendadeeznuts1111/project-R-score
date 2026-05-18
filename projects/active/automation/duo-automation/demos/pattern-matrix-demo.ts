#!/usr/bin/env bun

/**
 * Pattern Matrix System Demonstration
 * Shows the comprehensive pattern registration and management system
 */

import { 
  PatternMatrix, 
  addPattern, 
  registerTypeDefinitions,
  type PatternDefinition,
  PatternMatrixLSP
} from '../utils/pattern-matrix.js';

function demonstratePatternMatrix() {
  console.info('🔮 Pattern Matrix System Demonstration');
  console.info('=====================================\n');

  // Initialize the pattern matrix
  console.info('1. Initializing Pattern Matrix');
  console.info('------------------------------');
  registerTypeDefinitions();
  
  const matrix = PatternMatrix.getInstance();
  console.info(`✅ Pattern Matrix initialized with ${matrix.getRows().length} registered patterns`);

  // 2. Show existing patterns
  console.info('\n\n2. Registered Patterns Overview');
  console.info('------------------------------');
  
  const patterns = matrix.getRows();
  const categories = [...new Set(patterns.map(p => p.category))];
  
  categories.forEach(category => {
    console.info(`\n📂 ${category.toUpperCase()} (${patterns.filter(p => p.category === category).length} patterns):`);
    const categoryPatterns = patterns.filter(p => p.category === category);
    
    categoryPatterns.forEach(pattern => {
      console.info(`   ${pattern.section} - ${pattern.name}`);
      console.info(`      Performance: ${pattern.perf} | ROI: ${pattern.roi}`);
      console.info(`      Semantics: ${pattern.semantics.slice(0, 3).join(', ')}`);
    });
  });

  // 3. Add new patterns dynamically
  console.info('\n\n3. Dynamic Pattern Registration');
  console.info('-------------------------------');
  
  // Add URLPattern routing patterns
  const urlPatternRoutes: PatternDefinition[] = [
    {
      perf: '<5ms routing',
      semantics: ['routing', 'urlpattern', 'api'],
      roi: '∞',
      section: '§URLPattern:140',
      deps: ['bun-urlpattern', 'routing-engine'],
      verified: '✅'
    },
    {
      perf: '<10ms validation',
      semantics: ['validation', 'parameters', 'types'],
      roi: '∞',
      section: '§URLPattern:141',
      deps: ['validation-engine'],
      verified: '✅'
    },
    {
      perf: '<1ms matching',
      semantics: ['matching', 'performance', 'cache'],
      roi: '100x',
      section: '§URLPattern:142',
      deps: ['cache-engine'],
      verified: '✅'
    }
  ];

  urlPatternRoutes.forEach((routeDef, index) => {
    const result = addPattern('URLPattern', `Route${index + 1}`, routeDef);
    console.info(`✅ Added: ${result}`);
  });

  // Add identity resolution patterns
  const identityPatterns: PatternDefinition[] = [
    {
      perf: '<50ms analysis',
      semantics: ['identity', 'synthetic', 'fraud'],
      roi: '1000x',
      section: '§Identity:150',
      deps: ['platform-analysis', 'cross-platform'],
      verified: '✅'
    },
    {
      perf: '<100ms validation',
      semantics: ['validation', 'data-quality', 'trust'],
      roi: '∞',
      section: '§Identity:151',
      deps: ['validation-engine'],
      verified: '✅'
    },
    {
      perf: '<25ms correlation',
      semantics: ['correlation', 'patterns', 'risk'],
      roi: '500x',
      section: '§Identity:152',
      deps: ['pattern-engine'],
      verified: '✅'
    }
  ];

  identityPatterns.forEach((identityDef, index) => {
    const result = addPattern('Identity', `Analysis${index + 1}`, identityDef);
    console.info(`✅ Added: ${result}`);
  });

  // 4. Pattern ID Generation
  console.info('\n\n4. Pattern ID Generation');
  console.info('------------------------');
  
  console.info('🔢 Automatic ID Generation:');
  const autoIds = ['§NewFeature', '§AnotherFeature', '§ThirdFeature'];
  autoIds.forEach(section => {
    const id = matrix.getNextId(section);
    console.info(`   ${section} -> ${id}`);
  });

  console.info('\n🔢 Explicit ID Usage:');
  const explicitIds = ['§Explicit:200', '§Explicit:201', '§Explicit:202'];
  explicitIds.forEach(section => {
    const id = matrix.getNextId(section);
    console.info(`   ${section} -> ${id}`);
  });

  console.info('\n🔢 Mixed ID Generation:');
  const mixedIds = ['§Mixed:300', '§Mixed', '§Mixed:301', '§Mixed'];
  mixedIds.forEach(section => {
    const id = matrix.getNextId(section);
    console.info(`   ${section} -> ${id}`);
  });

  // 5. Pattern Search and Filtering
  console.info('\n\n5. Pattern Search and Filtering');
  console.info('------------------------------');
  
  console.info('🔍 Search by Category:');
  const searchCategories = ['URLPattern', 'Identity', 'Type'];
  
  searchCategories.forEach(category => {
    const categoryPatterns = patterns.filter(p => p.category === category);
    console.info(`\n   ${category}: ${categoryPatterns.length} patterns`);
    categoryPatterns.slice(0, 3).forEach(pattern => {
      console.info(`     - ${pattern.name} (${pattern.section})`);
    });
  });

  console.info('\n🔍 Search by Performance:');
  const performanceRanges = [
    { label: 'Ultra Fast (<1ms)', filter: (p: any) => p.perf.includes('<1ms') },
    { label: 'Fast (<10ms)', filter: (p: any) => p.perf.includes('<10ms') },
    { label: 'Medium (<50ms)', filter: (p: any) => p.perf.includes('<50ms') }
  ];

  performanceRanges.forEach(range => {
    const matchingPatterns = patterns.filter(range.filter);
    console.info(`\n   ${range.label}: ${matchingPatterns.length} patterns`);
    matchingPatterns.slice(0, 2).forEach(pattern => {
      console.info(`     - ${pattern.name}: ${pattern.perf}`);
    });
  });

  console.info('\n🔍 Search by ROI:');
  const roiGroups = [
    { label: 'Infinite ROI', filter: (p: any) => p.roi === '∞' },
    { label: 'High ROI (100x+)', filter: (p: any) => p.roi.includes('x') && parseInt(p.roi) >= 100 },
    { label: 'Medium ROI', filter: (p: any) => p.roi.includes('x') && parseInt(p.roi) < 100 }
  ];

  roiGroups.forEach(group => {
    const matchingPatterns = patterns.filter(group.filter);
    console.info(`\n   ${group.label}: ${matchingPatterns.length} patterns`);
    matchingPatterns.slice(0, 2).forEach(pattern => {
      console.info(`     - ${pattern.name}: ${pattern.roi}`);
    });
  });

  // 6. Pattern Dependencies
  console.info('\n\n6. Pattern Dependencies Analysis');
  console.info('---------------------------------');
  
  const allDeps = new Set<string>();
  patterns.forEach(pattern => {
    pattern.deps?.forEach(dep => allDeps.add(dep));
  });
  
  console.info(`📊 Total Dependencies: ${allDeps.size}`);
  console.info('📋 Dependency List:');
  Array.from(allDeps).sort().forEach(dep => {
    const dependents = patterns.filter(p => p.deps?.includes(dep));
    console.info(`   ${dep}: used by ${dependents.length} patterns`);
    dependents.slice(0, 2).forEach(p => {
      console.info(`     - ${p.name}`);
    });
  });

  // 7. Pattern Statistics
  console.info('\n\n7. Pattern Matrix Statistics');
  console.info('---------------------------');
  
  const stats = {
    totalPatterns: patterns.length,
    categories: categories.length,
    verifiedPatterns: patterns.filter(p => p.verified === '✅').length,
    patternsWithDeps: patterns.filter(p => p.deps && p.deps.length > 0).length,
    avgDepsPerPattern: patterns.reduce((sum, p) => sum + (p.deps?.length || 0), 0) / patterns.length,
    uniqueSemantics: new Set(patterns.flatMap(p => p.semantics)).size
  };

  console.info('📈 Matrix Statistics:');
  console.info(`   Total Patterns: ${stats.totalPatterns}`);
  console.info(`   Categories: ${stats.categories}`);
  console.info(`   Verified Patterns: ${stats.verifiedPatterns} (${((stats.verifiedPatterns/stats.totalPatterns)*100).toFixed(1)}%)`);
  console.info(`   Patterns with Dependencies: ${stats.patternsWithDeps}`);
  console.info(`   Average Dependencies per Pattern: ${stats.avgDepsPerPattern.toFixed(2)}`);
  console.info(`   Unique Semantics: ${stats.uniqueSemantics}`);

  // 8. LSP Integration Demo
  console.info('\n\n8. LSP Integration Features');
  console.info('--------------------------');
  
  console.info('🧠 Pattern Information Lookup:');
  const samplePatternIds = ['§Types:130', '§Identity:150', '§URLPattern:140'];
  
  samplePatternIds.forEach(id => {
    const info = PatternMatrixLSP.getPatternInfo(id);
    if (info) {
      console.info(`\n   ${id}:`);
      console.info(`   ${info.split('\n').slice(0, 3).join('\n')}`);
    }
  });

  console.info('\n🔧 Generated TypeScript Types:');
  const generatedTypes = PatternMatrixLSP.generatePatternTypes();
  console.info('   Generated type definitions preview:');
  console.info(generatedTypes.split('\n').slice(0, 10).join('\n'));
  console.info('   ... (truncated)');

  // 9. Pattern Matrix Export
  console.info('\n\n9. Pattern Matrix Export');
  console.info('------------------------');
  
  console.info('📋 Matrix Export Formats:');
  
  // Markdown table format
  console.info('\n   Markdown Table:');
  console.info('   | Category | Name | Performance | Semantics | ROI | Section |');
  console.info('   |----------|------|-------------|------------|-----|---------|');
  patterns.slice(0, 5).forEach(pattern => {
    const semantics = pattern.semantics.slice(0, 2).join(', ');
    console.info(`   | ${pattern.category} | ${pattern.name} | ${pattern.perf} | {${semantics}} | ${pattern.roi} | ${pattern.section} |`);
  });
  console.info('   ... (truncated)');

  // JSON format
  console.info('\n   JSON Format:');
  const jsonExport = {
    metadata: {
      totalPatterns: stats.totalPatterns,
      categories: stats.categories,
      generatedAt: new Date().toISOString()
    },
    patterns: patterns.slice(0, 3).map(p => ({
      name: p.name,
      category: p.category,
      section: p.section,
      performance: p.perf,
      roi: p.roi,
      semantics: p.semantics
    }))
  };
  console.info(`   ${JSON.stringify(jsonExport, null, 2).split('\n').slice(0, 15).join('\n')}`);
  console.info('   ... (truncated)');

  // 10. Best Practices and Guidelines
  console.info('\n\n10. Pattern Matrix Best Practices');
  console.info('=================================');
  
  console.info('✅ **Pattern Registration Guidelines:**');
  console.info('   • Use consistent section prefixes (§Category:ID)');
  console.info('   • Include performance metrics with clear thresholds');
  console.info('   • Define semantic tags for discoverability');
  console.info('   • Specify ROI for business value tracking');
  console.info('   • List dependencies for impact analysis');
  console.info('   • Mark verified patterns with ✅');
  
  console.info('\n✅ **Category Organization:**');
  console.info('   • Group related patterns under logical categories');
  console.info('   • Keep category names concise and descriptive');
  console.info('   • Use hierarchical categories when needed');
  
  console.info('\n✅ **Performance Tracking:**');
  console.info('   • Use consistent performance measurement formats');
  console.info('   • Include units (ms, μs, etc.)');
  console.info('   • Provide realistic performance targets');
  
  console.info('\n✅ **Dependency Management:**');
  console.info('   • Declare all external dependencies');
  console.info('   • Use semantic dependency names');
  console.info('   • Track circular dependencies');
  
  console.info('\n✅ **LSP Integration:**');
  console.info('   • Ensure patterns are discoverable via autocomplete');
  console.info('   • Provide comprehensive hover documentation');
  console.info('   • Generate TypeScript definitions for type safety');

  console.info('\n🚀 Pattern Matrix Benefits:');
  console.info('============================');
  console.info('🔍 **Discoverability**: Easy pattern discovery and search');
  console.info('📊 **Analytics**: Comprehensive pattern usage statistics');
  console.info('🔧 **Maintainability**: Centralized pattern management');
  console.info('🧠 **IDE Integration**: Rich developer experience features');
  console.info('📈 **Performance Tracking**: Built-in performance monitoring');
  console.info('🔗 **Dependency Management**: Clear dependency relationships');
  console.info('✅ **Quality Assurance**: Verification and validation support');
  console.info('📋 **Documentation**: Auto-generated documentation and types');
}

// Helper function to demonstrate pattern usage
function demonstratePatternUsage() {
  console.info('\n\n🎯 Pattern Usage Examples');
  console.info('========================');
  
  console.info('\n1. Identity Resolution Pattern Usage:');
  console.info('   // §Identity:150 - Synthetic Identity Analysis');
  console.info('   const analysis = await analyzeIdentity(phone, {');
  console.info('     includeCrossPlatform: true,');
  console.info('     validationLevel: "strict"');
  console.info('   });');
  console.info('   // Performance: <50ms, ROI: 1000x');
  
  console.info('\n2. URLPattern Routing Usage:');
  console.info('   // §URLPattern:140 - Route Registration');
  console.info('   const phoneRoute = new URLPattern({');
  console.info('     pathname: "/api/analyze/phone/:phone"');
  console.info('   });');
  console.info('   // Performance: <5ms routing, ROI: ∞');
  
  console.info('\n3. LSP Integration Usage:');
  console.info('   // §Types:130 - IDE Autocomplete');
  console.info('   const patterns = PatternMatrixLSP.getAutocompleteSuggestions("identity");');
  console.info('   // Returns: [identityAnalysis, identityValidation, ...]');
  console.info('   // Performance: <50ms indexing, ROI: ∞');
}

// Run the demonstration
demonstratePatternMatrix();
demonstratePatternUsage();

console.info('\n🎉 Pattern Matrix System Complete!');
console.info('==================================');
console.info('The Pattern Matrix provides a comprehensive system for registering, managing, and discovering patterns across the identity resolution platform, with rich IDE integration and analytics capabilities.');
