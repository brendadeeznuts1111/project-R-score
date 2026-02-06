#!/usr/bin/env bun
// senior-handoff.ts - Automated Senior Handoff from Junior Profiles

interface JuniorProfile {
  core: {
    documentSize: number;
    parseTime: number;
    throughput: number;
    memoryMB: number;
  };
  markdown: {
    parseTimeMs: number;
    featureCounts: {
      headings: number;
      tables: number;
      tableCols: number;
      codeBlocks: number;
      links: number;
      images: number;
      taskLists: number;
      strikethrough: number;
      blockquotes: number;
      lists: { ordered: number; unordered: number };
      math: number;
      wikiLinks: number;
      gfmScore: number;
    };
    complexityTier: string;
  };
  security: {
    etag: string;
    integrityHash: string;
  };
  audit: {
    timestamp: string;
    runner: string;
    environment: string;
  };
}

async function seniorHandoff(pattern: string = 'junior-*.json') {
  console.log('🎓 Senior Handoff Processing...');
  
  // Find junior profile files
  const files = await Array.fromAsync(new Bun.Glob(pattern).scan());
  
  if (files.length === 0) {
    console.log('❌ No junior profile files found');
    process.exit(1);
  }
  
  console.log(`📁 Found ${files.length} profile(s): ${files.join(', ')}`);
  
  for (const file of files) {
    await processProfile(file);
  }
}

async function processProfile(file: string) {
  console.log(`\n🔄 Processing: ${file}`);
  
  try {
    const profile: JuniorProfile = await Bun.file(file).json();
    
    // Senior Analysis
    const analysis = await analyzeForSenior(profile);
    
    // Generate Senior Report
    const report = generateSeniorReport(profile, analysis);
    
    // Save Senior Report
    const seniorFile = file.replace('junior-', 'senior-').replace('.json', '.md');
    await Bun.write(seniorFile, report);
    
    console.log(`✅ Senior report created: ${seniorFile}`);
    console.log(`📊 Complexity: ${profile.markdown.complexityTier.toUpperCase()}`);
    console.log(`🔍 Analysis: ${analysis.recommendations.length} recommendations`);
    
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

async function analyzeForSenior(profile: JuniorProfile) {
  const { markdown, audit } = profile;
  const features = markdown.featureCounts;
  
  const analysis = {
    complexity: markdown.complexityTier,
    riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical',
    recommendations: [] as string[],
    seniorNotes: [] as string[],
    handoffPriority: 'routine' as 'routine' | 'review' | 'urgent' | 'critical'
  };
  
  // Risk Assessment
  if (features.tableCols > 20) {
    analysis.riskLevel = 'high';
    analysis.recommendations.push('🚨 WIDE TABLE: Consider splitting into multiple tables');
    analysis.handoffPriority = 'urgent';
  }
  
  if (features.codeBlocks > 10) {
    analysis.riskLevel = 'medium';
    analysis.recommendations.push('⚠️ HEAVY CODE: Multiple code blocks detected');
  }
  
  if (features.gfmScore > 80) {
    analysis.seniorNotes.push('✅ RICH CONTENT: High GFM feature usage - good candidate for advanced processing');
  }
  
  if (markdown.parseTimeMs > 10) {
    analysis.recommendations.push('⏱️ SLOW PARSE: Consider optimization for large documents');
    analysis.handoffPriority = 'review';
  }
  
  // Performance Notes
  if (profile.core.throughput < 50000) {
    analysis.recommendations.push('📉 LOW THROUGHPUT: Document may need performance optimization');
  }
  
  // Feature-specific recommendations
  if (features.math > 0) {
    analysis.seniorNotes.push('🧮 MATH DETECTED: LaTeX math expressions require special handling');
  }
  
  if (features.wikiLinks > 0) {
    analysis.seniorNotes.push('🔗 WIKI LINKS: Inter-document linking detected');
  }
  
  // Default recommendations
  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push('✅ STANDARD: No special handling required');
  }
  
  return analysis;
}

function generateSeniorReport(profile: JuniorProfile, analysis: any) {
  const { audit, core, markdown } = profile;
  
  return `# Senior Handoff Report

**File**: ${audit.runner} profile  
**Timestamp**: ${audit.timestamp}  
**Complexity**: ${markdown.complexityTier.toUpperCase()}  
**Risk Level**: ${analysis.riskLevel.toUpperCase()}  
**Priority**: ${analysis.handoffPriority.toUpperCase()}  
**Environment**: ${audit.environment}

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Document Size | ${core.documentSize} bytes |
| Parse Time | ${markdown.parseTimeMs}ms |
| Throughput | ${core.throughput.toLocaleString()} chars/s |
| Memory Usage | ${core.memoryMB}MB |
| Crypto Seal | \`${profile.security.etag.split('-')[1]}\` |

---

## 🔍 Feature Analysis

| Feature | Count |
|---------|-------|
| Headings | ${markdown.featureCounts.headings} |
| Tables | ${markdown.featureCounts.tables} |
| Table Columns | ${markdown.featureCounts.tableCols} |
| Code Blocks | ${markdown.featureCounts.codeBlocks} |
| Links | ${markdown.featureCounts.links} |
| Images | ${markdown.featureCounts.images} |
| Task Lists | ${markdown.featureCounts.taskLists} |
| Math Expressions | ${markdown.featureCounts.math} |
| Wiki Links | ${markdown.featureCounts.wikiLinks} |
| GFM Score | ${markdown.featureCounts.gfmScore}% |

---

## 🎯 Senior Recommendations

${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

---

## 📝 Senior Notes

${analysis.seniorNotes.length > 0 ? analysis.seniorNotes.map(note => `- ${note}`).join('\n') : 'No special notes required.'}

---

## 🚀 Next Steps

${analysis.handoffPriority === 'critical' ? '🔴 **IMMEDIATE ACTION REQUIRED**' :
  analysis.handoffPriority === 'urgent' ? '🟡 **URGENT REVIEW NEEDED**' :
  analysis.handoffPriority === 'review' ? '🟢 **STANDARD REVIEW**' :
  '✅ **ROUTINE PROCESSING**'}

---

*Generated by Senior Handoff Automation*  
*Crypto Seal: ${profile.security.etag.split('-')[1]}*  
*Processing Time: ${new Date().toISOString()}*
`;
}

// CLI interface
async function main() {
  const pattern = process.argv[2] || 'junior-*.json';
  
  try {
    await seniorHandoff(pattern);
    console.log('\n🎓 Senior handoff complete!');
  } catch (error) {
    console.error('❌ Senior handoff failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
