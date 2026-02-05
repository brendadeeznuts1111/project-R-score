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
  console.log('🔮 Pattern Matrix System Demonstration');
  console.log('=====================================\n');

  // Initialize the pattern matrix
  console.log('1. Initializing Pattern Matrix');
  console.log('------------------------------');
  registerTypeDefinitions();
  
  const matrix = PatternMatrix.getInstance();
  console.log(`✅ Pattern Matrix initialized with ${matrix.getRows().length} registered patterns`);

  // 2. Show existing patterns
  console.log('\n\n2. Registered Patterns Overview');
  console.log('------------------------------');
  
  const patterns = matrix.getRows();
  const categories = [...new Set(patterns.map(p => p.category))];
  
  categories.forEach(category => {
    console.log(`\n📂 ${category.toUpperCase()} (${patterns.filter(p => p.category === category).length} patterns):`);
    const categoryPatterns = patterns.filter(p => p.category === category);
    
    categoryPatterns.forEach(pattern => {
      console.log(`   ${pattern.section} - ${pattern.name}`);
      console.log(`      Performance: ${pattern.perf} | ROI: ${pattern.roi}`);
      console.log(`      Semantics: ${pattern.semantics.slice(0, 3).join(', ')}`);
    });
  });

  // 3. Add new patterns dynamically
  console.log('\n\n3. Dynamic Pattern Registration');
  console.log('-------------------------------');
  
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
    console.log(`✅ Added: ${result}`);
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
    console.log(`✅ Added: ${result}`);
  });

  // 4. Pattern ID Generation
  console.log('\n\n4. Pattern ID Generation');
  console.log('------------------------');
  
  console.log('🔢 Automatic ID Generation:');
  const autoIds = ['§NewFeature', '§AnotherFeature', '§ThirdFeature'];
  autoIds.forEach(section => {
    const id = matrix.getNextId(section);
    console.log(`   ${section} -> ${id}`);
  });

  console.log('\n🔢 Explicit ID Usage:');
  const explicitIds = ['§Explicit:200', '§Explicit:201', '§Explicit:202'];
  explicitIds.forEach(section => {
    const id = matrix.getNextId(section);
    console.log(`   ${section} -> ${id}`);
  });

  console.log('\n🔢 Mixed ID Generation:');
  const mixedIds = ['§Mixed:300', '§Mixed', '§Mixed:301', '§Mixed'];
  mixedIds.forEach(section => {
    const id = matrix.getNextId(section);
    console.log(`   ${section} -> ${id}`);
  });

  // 5. Pattern Search and Filtering
  console.log('\n\n5. Pattern Search and Filtering');
  console.log('------------------------------');
  
  console.log('🔍 Search by Category:');
  const searchCategories = ['URLPattern', 'Identity', 'Type'];
  
  searchCategories.forEach(category => {
    const categoryPatterns = patterns.filter(p => p.category === category);
    console.log(`\n   ${category}: ${categoryPatterns.length} patterns`);
    categoryPatterns.slice(0, 3).forEach(pattern => {
      console.log(`     - ${pattern.name} (${pattern.section})`);
    });
  });

  console.log('\n🔍 Search by Performance:');
  const performanceRanges = [
    { label: 'Ultra Fast (<1ms)', filter: (p: any) => p.perf.includes('<1ms') },
    { label: 'Fast (<10ms)', filter: (p: any) => p.perf.includes('<10ms') },
    { label: 'Medium (<50ms)', filter: (p: any) => p.perf.includes('<50ms') }
  ];

  performanceRanges.forEach(range => {
    const matchingPatterns = patterns.filter(range.filter);
    console.log(`\n   ${range.label}: ${matchingPatterns.length} patterns`);
    matchingPatterns.slice(0, 2).forEach(pattern => {
      console.log(`     - ${pattern.name}: ${pattern.perf}`);
    });
  });

  console.log('\n🔍 Search by ROI:');
  const roiGroups = [
    { label: 'Infinite ROI', filter: (p: any) => p.roi === '∞' },
    { label: 'High ROI (100x+)', filter: (p: any) => p.roi.includes('x') && parseInt(p.roi) >= 100 },
    { label: 'Medium ROI', filter: (p: any) => p.roi.includes('x') && parseInt(p.roi) < 100 }
  ];

  roiGroups.forEach(group => {
    const matchingPatterns = patterns.filter(group.filter);
    console.log(`\n   ${group.label}: ${matchingPatterns.length} patterns`);
    matchingPatterns.slice(0, 2).forEach(pattern => {
      console.log(`     - ${pattern.name}: ${pattern.roi}`);
    });
  });

  // 6. Pattern Dependencies
  console.log('\n\n6. Pattern Dependencies Analysis');
  console.log('---------------------------------');
  
  const allDeps = new Set<string>();
  patterns.forEach(pattern => {
    pattern.deps?.forEach(dep => allDeps.add(dep));
  });
  
  console.log(`📊 Total Dependencies: ${allDeps.size}`);
  console.log('📋 Dependency List:');
  Array.from(allDeps).sort().forEach(dep => {
    const dependents = patterns.filter(p => p.deps?.includes(dep));
    console.log(`   ${dep}: used by ${dependents.length} patterns`);
    dependents.slice(0, 2).forEach(p => {
      console.log(`     - ${p.name}`);
    });
  });

  // 7. Pattern Statistics
  console.log('\n\n7. Pattern Matrix Statistics');
  console.log('---------------------------');
  
  const stats = {
    totalPatterns: patterns.length,
    categories: categories.length,
    verifiedPatterns: patterns.filter(p => p.verified === '✅').length,
    patternsWithDeps: patterns.filter(p => p.deps && p.deps.length > 0).length,
    avgDepsPerPattern: patterns.reduce((sum, p) => sum + (p.deps?.length || 0), 0) / patterns.length,
    uniqueSemantics: new Set(patterns.flatMap(p => p.semantics)).size
  };

  console.log('📈 Matrix Statistics:');
  console.log(`   Total Patterns: ${stats.totalPatterns}`);
  console.log(`   Categories: ${stats.categories}`);
  console.log(`   Verified Patterns: ${stats.verifiedPatterns} (${((stats.verifiedPatterns/stats.totalPatterns)*100).toFixed(1)}%)`);
  console.log(`   Patterns with Dependencies: ${stats.patternsWithDeps}`);
  console.log(`   Average Dependencies per Pattern: ${stats.avgDepsPerPattern.toFixed(2)}`);
  console.log(`   Unique Semantics: ${stats.uniqueSemantics}`);

  // 8. LSP Integration Demo
  console.log('\n\n8. LSP Integration Features');
  console.log('--------------------------');
  
  console.log('🧠 Pattern Information Lookup:');
  const samplePatternIds = ['§Types:130', '§Identity:150', '§URLPattern:140'];
  
  samplePatternIds.forEach(id => {
    const info = PatternMatrixLSP.getPatternInfo(id);
    if (info) {
      console.log(`\n   ${id}:`);
      console.log(`   ${info.split('\n').slice(0, 3).join('\n')}`);
    }
  });

  console.log('\n🔧 Generated TypeScript Types:');
  const generatedTypes = PatternMatrixLSP.generatePatternTypes();
  console.log('   Generated type definitions preview:');
  console.log(generatedTypes.split('\n').slice(0, 10).join('\n'));
  console.log('   ... (truncated)');

  // 9. Pattern Matrix Export
  console.log('\n\n9. Pattern Matrix Export');
  console.log('------------------------');
  
  console.log('📋 Matrix Export Formats:');
  
  // Markdown table format
  console.log('\n   Markdown Table:');
  console.log('   | Category | Name | Performance | Semantics | ROI | Section |');
  console.log('   |----------|------|-------------|------------|-----|---------|');
  patterns.slice(0, 5).forEach(pattern => {
    const semantics = pattern.semantics.slice(0, 2).join(', ');
    console.log(`   | ${pattern.category} | ${pattern.name} | ${pattern.perf} | {${semantics}} | ${pattern.roi} | ${pattern.section} |`);
  });
  console.log('   ... (truncated)');

  // JSON format
  console.log('\n   JSON Format:');
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
  console.log(`   ${JSON.stringify(jsonExport, null, 2).split('\n').slice(0, 15).join('\n')}`);
  console.log('   ... (truncated)');

  // 10. Best Practices and Guidelines
  console.log('\n\n10. Pattern Matrix Best Practices');
  console.log('=================================');
  
  console.log('✅ **Pattern Registration Guidelines:**');
  console.log('   • Use consistent section prefixes (§Category:ID)');
  console.log('   • Include performance metrics with clear thresholds');
  console.log('   • Define semantic tags for discoverability');
  console.log('   • Specify ROI for business value tracking');
  console.log('   • List dependencies for impact analysis');
  console.log('   • Mark verified patterns with ✅');
  
  console.log('\n✅ **Category Organization:**');
  console.log('   • Group related patterns under logical categories');
  console.log('   • Keep category names concise and descriptive');
  console.log('   • Use hierarchical categories when needed');
  
  console.log('\n✅ **Performance Tracking:**');
  console.log('   • Use consistent performance measurement formats');
  console.log('   • Include units (ms, μs, etc.)');
  console.log('   • Provide realistic performance targets');
  
  console.log('\n✅ **Dependency Management:**');
  console.log('   • Declare all external dependencies');
  console.log('   • Use semantic dependency names');
  console.log('   • Track circular dependencies');
  
  console.log('\n✅ **LSP Integration:**');
  console.log('   • Ensure patterns are discoverable via autocomplete');
  console.log('   • Provide comprehensive hover documentation');
  console.log('   • Generate TypeScript definitions for type safety');

  console.log('\n🚀 Pattern Matrix Benefits:');
  console.log('============================');
  console.log('🔍 **Discoverability**: Easy pattern discovery and search');
  console.log('📊 **Analytics**: Comprehensive pattern usage statistics');
  console.log('🔧 **Maintainability**: Centralized pattern management');
  console.log('🧠 **IDE Integration**: Rich developer experience features');
  console.log('📈 **Performance Tracking**: Built-in performance monitoring');
  console.log('🔗 **Dependency Management**: Clear dependency relationships');
  console.log('✅ **Quality Assurance**: Verification and validation support');
  console.log('📋 **Documentation**: Auto-generated documentation and types');
}

// Helper function to demonstrate pattern usage
function demonstratePatternUsage() {
  console.log('\n\n🎯 Pattern Usage Examples');
  console.log('========================');
  
  console.log('\n1. Identity Resolution Pattern Usage:');
  console.log('   // §Identity:150 - Synthetic Identity Analysis');
  console.log('   const analysis = await analyzeIdentity(phone, {');
  console.log('     includeCrossPlatform: true,');
  console.log('     validationLevel: "strict"');
  console.log('   });');
  console.log('   // Performance: <50ms, ROI: 1000x');
  
  console.log('\n2. URLPattern Routing Usage:');
  console.log('   // §URLPattern:140 - Route Registration');
  console.log('   const phoneRoute = new URLPattern({');
  console.log('     pathname: "/api/analyze/phone/:phone"');
  console.log('   });');
  console.log('   // Performance: <5ms routing, ROI: ∞');
  
  console.log('\n3. LSP Integration Usage:');
  console.log('   // §Types:130 - IDE Autocomplete');
  console.log('   const patterns = PatternMatrixLSP.getAutocompleteSuggestions("identity");');
  console.log('   // Returns: [identityAnalysis, identityValidation, ...]');
  console.log('   // Performance: <50ms indexing, ROI: ∞');
}

// Run the demonstration
demonstratePatternMatrix();
demonstratePatternUsage();

console.log('\n🎉 Pattern Matrix System Complete!');
console.log('==================================');
console.log('The Pattern Matrix provides a comprehensive system for registering, managing, and discovering patterns across the identity resolution platform, with rich IDE integration and analytics capabilities.');
