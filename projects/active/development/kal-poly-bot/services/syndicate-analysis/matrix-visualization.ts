#!/usr/bin/env bun

import type { PatternType } from './types';
import {
  CROSS_REFERENCE_MATRIX,
  SUBMARKETS,
  TENSION_ANALYSIS,
  buildCrossReferenceMatrix,
  analyzePatternRelationships
} from './pattern-matrix';
import { PATTERN_REGISTRY, getEnhancedPatternMetadata } from './pattern-registry';

export function generateCrossReferenceMatrixASCII(): string {
  const allPatterns = Object.keys(CROSS_REFERENCE_MATRIX) as PatternType[];
  const matrix = buildCrossReferenceMatrix();
  const output = ['Pattern Cross-Reference Matrix', '='.repeat(80), '', 'Pattern Type'.padEnd(30) + allPatterns.map(p => p.substring(0, 3).padEnd(4)).join(''), '-'.repeat(80)];
  
  allPatterns.forEach(pattern1 => {
    const row = matrix.get(pattern1);
    const rowData = pattern1.substring(0, 30).padEnd(30) + allPatterns.map(pattern2 => {
      const isReferenced = row?.get(pattern2) || false;
      return (isReferenced ? '✓' : ' ').padEnd(4);
    }).join('');
    output.push(rowData);
  });
  
  return output.join('\n') + '\n';
}

export function generateSubmarketReport(): string {
  const categories = ['Sports Betting', 'Financial', 'Fraud Detection', 'Competitive'] as const;
  const output = ['Submarket Analysis Report', '='.repeat(80), ''];
  
  categories.forEach(category => {
    output.push(`\n${category}`, '-'.repeat(80));
    const submarkets = SUBMARKETS.filter(s => s.category === category);
    submarkets.forEach(submarket => {
      output.push(`\n${submarket.name} (${submarket.id})`, `  Description: ${submarket.description}`, `  Patterns: ${submarket.patterns.join(', ')}`, `  Pattern Count: ${submarket.patterns.length}`);
    });
  });
  
  return output.join('\n') + '\n';
}

export function generateTensionReport(): string {
  const tensionTypes = ['Resource', 'Strategy', 'Technical', 'Market'] as const;
  const output = ['Tension Analysis Report', '='.repeat(80), ''];
  
  tensionTypes.forEach(tensionType => {
    output.push(`\n${tensionType} Tensions`, '-'.repeat(80));
    Object.entries(TENSION_ANALYSIS).forEach(([patternType, analysis]) => {
      const relevantTensions = analysis.tensions.filter(t => t.type === tensionType);
      if (relevantTensions.length > 0) {
        output.push(`\n${patternType}:`);
        relevantTensions.forEach(tension => {
          output.push(`  [${tension.impact.toUpperCase()}] ${tension.description}`);
        });
      }
    });
  });
  
  return output.join('\n') + '\n';
}

export function generatePatternGraphDOT(): string {
  const categoryColors: Record<string, string> = {
    'Analytical': 'lightblue',
    'Real-Time': 'lightgreen',
    'Financial': 'lightyellow',
    'Fraud': 'lightcoral',
    'Competitive': 'lightpink'
  };
  const defaultColor = 'lightgray';
  const nodeLines = Object.entries(PATTERN_REGISTRY).map(([patternType, metadata]) => {
    const color = categoryColors[metadata.category] || defaultColor;
    const label = patternType.replace(/_/g, '\\n');
    return `  "${patternType}" [label="${label}", fillcolor="${color}", style="filled,rounded"];`;
  });
  const edgeLines = Object.entries(CROSS_REFERENCE_MATRIX).flatMap(([pattern1, refs]) =>
    refs.map(pattern2 => `  "${pattern1}" -> "${pattern2}";`)
  );
  const dot = [
    'digraph PatternRelationships {',
    '  rankdir=LR;',
    '  node [shape=box, style=rounded];',
    '',
    ...nodeLines,
    '',
    ...edgeLines,
    '}'
  ];
  return dot.join('\n') + '\n';
}

export function generatePatternMatrixReport(): string {
  const relationships = analyzePatternRelationships();
  const report = [
    'Syndicate Pattern Matrix Analysis',
    '='.repeat(100),
    '',
    '1. CROSS-REFERENCE MATRIX',
    generateCrossReferenceMatrixASCII(),
    '',
    '2. SUBMARKET ANALYSIS',
    generateSubmarketReport(),
    '',
    '3. TENSION ANALYSIS',
    generateTensionReport(),
    '',
    '4. PATTERN RELATIONSHIPS',
    `\nStrongly Connected Clusters: ${relationships.stronglyConnected.length}`,
    ...relationships.stronglyConnected.slice(0, 5).map((cluster, idx) => 
      `  Cluster ${idx + 1}: ${cluster.patterns.join(', ')} (strength: ${cluster.strength.toFixed(2)})`
    ),
    `\nPattern Hubs (most connected):`,
    ...relationships.hubs.map((hub, idx) => 
      `  ${idx + 1}. ${hub.pattern}: ${hub.connections} connections`
    ),
    `\nIsolated Patterns: ${relationships.isolated.length}`,
    ...relationships.isolated.map(pattern => `  - ${pattern}`)
  ];
  
  return report.join('\n') + '\n';
}

export function getPatternSummary(patternType: PatternType): string {
  const enhanced = getEnhancedPatternMetadata(patternType);
  const summary = [
    `Pattern: ${patternType}`,
    '='.repeat(80),
    `Domain: ${enhanced.domain}`,
    `Category: ${enhanced.category}`,
    `Grading: ${enhanced.grading} | Priority: ${enhanced.priority}`,
    `Confidence Range: ${enhanced.confidenceRange.min} - ${enhanced.confidenceRange.max}`,
    '',
    'Properties:',
    ...enhanced.properties.map(prop => `  - ${prop}`),
    '',
    'Cross-References:',
    ...enhanced.crossReferences.map(ref => `  - ${ref}`),
    '',
    'Submarkets:',
    ...enhanced.submarkets.map(submarket => `  - ${submarket}`),
    '',
    'Tensions:',
    ...enhanced.tension.tensions.map(tension => 
      `  [${tension.type}] [${tension.impact.toUpperCase()}] ${tension.description}`
    )
  ];
  
  return summary.join('\n') + '\n';
}

export function exportMatrixAsJSON(): string {
  const allPatterns = Object.keys(CROSS_REFERENCE_MATRIX) as PatternType[];
  
  const matrixData = {
    patterns: allPatterns.map(patternType => {
      const enhanced = getEnhancedPatternMetadata(patternType);
      return {
        patternType: enhanced.patternType,
        domain: enhanced.domain,
        category: enhanced.category,
        grading: enhanced.grading,
        priority: enhanced.priority,
        properties: enhanced.properties,
        crossReferences: enhanced.crossReferences,
        submarkets: enhanced.submarkets,
        tensions: enhanced.tension.tensions
      };
    }),
    submarkets: SUBMARKETS,
    relationships: analyzePatternRelationships(),
    generatedAt: new Date().toISOString()
  };
  
  return JSON.stringify(matrixData, null, 2);
}
