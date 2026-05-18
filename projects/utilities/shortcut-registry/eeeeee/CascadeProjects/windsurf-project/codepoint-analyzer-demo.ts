#!/usr/bin/env bun

/**
 * Enhanced Codepoint Analysis Demo
 * 
 * Demonstrates advanced Unicode analysis capabilities including
 * security issue detection, encoding analysis, and character classification.
 */

import { CodepointAnalyzer } from './codepoint-analyzer';

// Test cases with various Unicode and security issues
const testCases = [
  {
    name: 'Normal ASCII Text',
    content: 'Hello, World! This is normal ASCII text.',
    description: 'Basic Latin characters, no security issues'
  },
  {
    name: 'Mixed Script Attack',
    content: 'https://www.gооgle.com', // Cyrillic оо instead of Latin oo
    description: 'Homoglyph attack using Cyrillic characters'
  },
  {
    name: 'Invisible Characters',
    content: 'Hello\u200BWorld\u200C!\u200D', // Zero-width characters
    description: 'Invisible characters that can be used for obfuscation'
  },
  {
    name: 'Control Characters',
    content: 'Hello\x01World\x02Test\x03', // Control characters
    description: 'Suspicious control sequences'
  },
  {
    name: 'Private Use Area',
    content: 'Hello \uE000World \uF8FF Test', // Private use characters
    description: 'Characters from private use area'
  },
  {
    name: 'Mixed Unicode',
    content: 'Hello 世界 مرحبا שלום 👋 🌍', // Multiple scripts and emoji
    description: 'Legitimate mixed Unicode content'
  },
  {
    name: 'Suspicious Sequence',
    content: 'admin\u200b@test.com', // Invisible character in email
    description: 'Invisible character in sensitive data'
  },
  {
    name: 'UTF-8 with BOM',
    content: '\uFEFFHello, World!', // BOM + normal text
    description: 'UTF-8 text with Byte Order Mark'
  }
];

async function runDemo() {
  console.info('🔍 Enhanced Codepoint Analysis Demo');
  console.info('═══════════════════════════════════════\n');

  const analyzer = new CodepointAnalyzer();

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.info(`📋 Test Case ${i + 1}: ${testCase.name}`);
    console.info(`📝 Description: ${testCase.description}`);
    console.info(`🔤 Content: "${testCase.content}"`);
    console.info('─'.repeat(50));
    
    const analysis = analyzer.analyzeCodepoints(testCase.content);
    
    // Show key metrics
    console.info(`📊 Stats: ${analysis.totalCharacters} chars, ${analysis.uniqueCharacters} unique`);
    console.info(`🌐 Encoding: ${analysis.encodingConfidence.detected} (${(analysis.encodingConfidence.confidence * 100).toFixed(1)}% confidence)`);
    
    // Show security issues
    if (analysis.securityIssues.length > 0) {
      console.info(`🚨 Security Issues: ${analysis.securityIssues.length}`);
      analysis.securityIssues.forEach((issue, index) => {
        const severityIcon = issue.severity === 'critical' ? '🔴' : 
                           issue.severity === 'high' ? '🟠' : 
                           issue.severity === 'medium' ? '🟡' : '🟢';
        console.info(`   ${index + 1}. ${severityIcon} ${issue.description}`);
        console.info(`      Position: ${issue.position}, Character: '${issue.character}' (U+${issue.codepoint.toString(16).toUpperCase().padStart(4, '0')})`);
      });
    } else {
      console.info('✅ No security issues detected');
    }
    
    // Show problematic sequences
    if (analysis.problematicSequences.length > 0) {
      console.info(`🔗 Problematic Sequences: ${analysis.problematicSequences.length}`);
      analysis.problematicSequences.forEach((seq, index) => {
        console.info(`   ${index + 1}. ${seq.description}`);
        console.info(`      Sequence: "${seq.sequence}" at position ${seq.position}`);
      });
    }
    
    // Show top recommendations
    if (analysis.recommendations.length > 0) {
      console.info(`💡 Top Recommendation: ${analysis.recommendations[0]}`);
    }
    
    console.info('\n' + '='.repeat(60) + '\n');
  }

  // Performance test
  console.info('⚡ Performance Test');
  console.info('─────────────────');
  
  const largeText = testCases.map(tc => tc.content).join('').repeat(1000);
  const startTime = performance.now();
  
  const largeAnalysis = analyzer.analyzeCodepoints(largeText);
  
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  
  console.info(`📈 Processed ${largeAnalysis.totalCharacters} characters in ${processingTime.toFixed(2)}ms`);
  console.info(`🚀 Throughput: ${(largeAnalysis.totalCharacters / processingTime * 1000).toFixed(0)} characters/second`);
  console.info(`🔍 Found ${largeAnalysis.securityIssues.length} security issues`);
  
  console.info('\n🎯 Key Features Demonstrated:');
  console.info('─────────────────────────────');
  console.info('✅ Unicode character classification and range detection');
  console.info('✅ Security issue detection (homoglyph attacks, invisible chars)');
  console.info('✅ Encoding confidence analysis with BOM detection');
  console.info('✅ Problematic sequence identification');
  console.info('✅ Character distribution analysis');
  console.info('✅ Comprehensive security recommendations');
  console.info('✅ High-performance processing of large texts');
  
  console.info('\n💻 CLI Usage Examples:');
  console.info('─────────────────────');
  console.info('# Analyze a file:');
  console.info('bun codepoint-analyzer.ts source.ts');
  console.info('');
  console.info('# JSON output:');
  console.info('bun codepoint-analyzer.ts source.ts --format json');
  console.info('');
  console.info('# Security-focused analysis:');
  console.info('bun codepoint-analyzer.ts suspicious.txt --security');
  console.info('');
  console.info('# Analyze from stdin:');
  console.info('cat file.txt | bun codepoint-analyzer.ts');
  
  console.info('\n🎉 Enhanced Codepoint Analysis Demo Complete!');
}

// Interactive demo
async function interactiveDemo() {
  console.info('\n🎮 Interactive Demo');
  console.info('─────────────────');
  console.info('Enter text to analyze (or press Enter to skip):');
  
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  const userInput = Buffer.concat(chunks).toString().trim();
  
  if (userInput) {
    console.info('\n🔍 Analyzing your input...');
    const analyzer = new CodepointAnalyzer();
    const analysis = analyzer.analyzeCodepoints(userInput);
    
    console.info(analyzer.generateReport(analysis));
  } else {
    console.info('Skipping interactive demo.');
  }
}

// Main execution
async function main() {
  try {
    await runDemo();
    
    if (!process.stdin.isTTY) {
      await interactiveDemo();
    }
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo
if (import.meta.main) {
  main();
}
