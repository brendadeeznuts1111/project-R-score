#!/usr/bin/env bun
/**
 * Bottleneck Analysis Script
 * 
 * Analyzes profile.md files using grep patterns to find:
 * - Function objects (type=Function)
 * - Large objects >= 10KB (size=[0-9]{5,})
 * - GC roots (gcroot=1)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { 
  createProfilingError, 
  handleProfilingError,
  ProfilingErrorCode,
  type ProfilingError 
} from './profiling-errors.ts';

interface BottleneckStats {
  projectPath: string;
  projectName: string;
  functionCount: number;
  largeObjects: Array<{ size: number; line: string }>;
  gcRootCount: number;
  profileExists: boolean;
  totalHeapSize?: number;
  totalObjects?: number;
  topFunctionRetainedSize?: number; // Retained size of Function objects in bytes
}

interface AnalysisResult {
  projects: BottleneckStats[];
  summary: {
    totalProjects: number;
    projectsWithProfiles: number;
    totalFunctions: number;
    totalLargeObjects: number;
    totalGCRoots: number;
    totalHeapSize: number;
    topFunctionProjects: Array<{ name: string; count: number; retainedSizeMB?: number }>;
    topLargeObjects: Array<{ project: string; size: number; line: string }>;
    topGCRootProjects: Array<{ name: string; count: number }>;
  };
}

const ROOT_DIR = '/Users/nolarose/Projects';

/**
 * Find all profile.md files
 */
function findProfileFiles(rootDir: string): Array<{ path: string; name: string }> {
  const profiles: Array<{ path: string; name: string }> = [];

  function searchDirectory(dir: string, depth = 0): void {
    if (depth > 5) return; // Limit depth

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        try {
          if (entry.isDirectory()) {
            // Skip common directories
            if (entry.name.startsWith('.') || 
                entry.name === 'node_modules' ||
                entry.name === 'dist' ||
                entry.name === 'build') {
              continue;
            }

            const fullPath = join(dir, entry.name);
            
            try {
              const profilePath = join(fullPath, 'profile.md');

              if (existsSync(profilePath)) {
                profiles.push({
                  path: profilePath,
                  name: entry.name,
                });
              }

              // Recurse
              searchDirectory(fullPath, depth + 1);
            } catch (e) {
              // Fail safely - skip this directory
              continue;
            }
          }
        } catch (e) {
          // Fail safely - skip this entry
          continue;
        }
      }
    } catch (e) {
      // Ignore permission errors and continue
    }
  }

  try {
    searchDirectory(rootDir);
  } catch (error) {
    // Fail safely - return profiles found so far
  }
  
  return profiles;
}

/**
 * Analyze a single profile.md file
 */
function analyzeProfile(profilePath: string, projectName: string): BottleneckStats {
  const stats: BottleneckStats = {
    projectPath: profilePath,
    projectName,
    functionCount: 0,
    largeObjects: [],
    gcRootCount: 0,
    profileExists: false,
  };

  try {
    stats.profileExists = existsSync(profilePath);
  } catch (e) {
    // Fail safely - assume doesn't exist
    return stats;
  }

  if (!stats.profileExists) {
    return stats;
  }

  try {
    const content = readFileSync(profilePath, 'utf-8');
    const lines = content.split('\n');

    // Parse summary section for total metrics
    const summaryMatch = content.match(/## Summary[\s\S]*?Total Heap Size.*?(\d+\.?\d*)\s*(KB|MB|bytes?)[\s\S]*?Total Objects.*?(\d{1,3}(?:,\d{3})*)[\s\S]*?GC Roots.*?(\d{1,3}(?:,\d{3})*)/i);
    if (summaryMatch) {
      const heapSizeStr = summaryMatch[1];
      const heapUnit = summaryMatch[2]?.toLowerCase() || 'kb';
      let heapSizeBytes = parseFloat(heapSizeStr) * 1024; // Default to KB
      if (heapUnit.includes('mb')) heapSizeBytes *= 1024;
      if (heapUnit.includes('byte')) heapSizeBytes = parseFloat(heapSizeStr);
      stats.totalHeapSize = Math.round(heapSizeBytes);
      stats.totalObjects = parseInt(summaryMatch[3].replace(/,/g, ''), 10);
      stats.gcRootCount = parseInt(summaryMatch[4].replace(/,/g, ''), 10);
    }

    // Parse Top 50 Types table for Function retained size
    const functionTypeMatch = content.match(/\|\s*\d+\s*\|\s*`Function`\s*\|\s*(\d{1,3}(?:,\d{3})*)\s*\|\s*[\d.]+\s*(KB|MB|bytes?)\s*\|\s*([\d.]+)\s*(KB|MB|bytes?)\s*\|/i);
    if (functionTypeMatch) {
      const retainedSizeStr = functionTypeMatch[3];
      const retainedUnit = functionTypeMatch[4]?.toLowerCase() || 'mb';
      let retainedSizeBytes = parseFloat(retainedSizeStr);
      if (retainedUnit.includes('mb')) retainedSizeBytes *= 1024 * 1024;
      else if (retainedUnit.includes('kb')) retainedSizeBytes *= 1024;
      stats.topFunctionRetainedSize = Math.round(retainedSizeBytes);
      // Also set function count from this match
      stats.functionCount = parseInt(functionTypeMatch[1].replace(/,/g, ''), 10);
    }

    for (const line of lines) {
      try {
        // Count Function objects - check for Function type in markdown table format
        // Format: | rank | `Function` | count | size | ...
        if (line.includes('`Function`') || line.match(/\|\s*\d+\s*\|\s*`?Function`?\s*\|/)) {
          // Only increment if we haven't already set it from summary
          if (!stats.functionCount || stats.functionCount === 0) {
            stats.functionCount++;
          }
        }
        
        // Also check for type=Function format (legacy)
        if (line.includes('type=Function')) {
          stats.functionCount++;
        }

        // Find large objects (size >= 10KB, i.e., 5+ digits)
        // Check for size= format: size=12345
        const sizeMatch1 = line.match(/size=(\d{5,})/);
        if (sizeMatch1) {
          try {
            const size = parseInt(sizeMatch1[1], 10);
            if (!isNaN(size)) {
              stats.largeObjects.push({
                size,
                line: line.trim().substring(0, 100), // First 100 chars
              });
            }
          } catch (e) {
            // Fail safely - skip this size match
            continue;
          }
        }
        
        // Also check markdown table format: | rank | Type | count | size | ...
        // Look for sizes >= 10KB (10000 bytes) in table cells
        const tableSizeMatch = line.match(/\|\s*\d+\s*\|\s*[^|]+\s*\|\s*\d+\s*\|\s*(\d{5,})\s*\|/);
        if (tableSizeMatch) {
          try {
            const size = parseInt(tableSizeMatch[1], 10);
            if (!isNaN(size) && size >= 10000) {
              stats.largeObjects.push({
                size,
                line: line.trim().substring(0, 100), // First 100 chars
              });
            }
          } catch (e) {
            // Fail safely - skip this size match
            continue;
          }
        }

        // Count GC roots - check for gcroot=1 in the line
        if (line.includes('gcroot=1')) {
          stats.gcRootCount++;
        }
      } catch (e) {
        // Fail safely - skip this line
        continue;
      }
    }
  } catch (error) {
    // Fail safely - return stats with what we have (likely zeros)
    const profilingError = handleProfilingError(
      error,
      ProfilingErrorCode.PROFILE_PARSE_ERROR,
      { profilePath, projectName }
    );
    profilingError.log();
  }

  return stats;
}

/**
 * Generate analysis report
 */
function generateReport(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('# Bottleneck Analysis Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Projects | ${result.summary.totalProjects} |`);
  lines.push(`| Projects with Profiles | ${result.summary.projectsWithProfiles} |`);
  if (result.summary.totalHeapSize > 0) {
    lines.push(`| Total Heap Size | ${(result.summary.totalHeapSize / 1024 / 1024).toFixed(2)} MB |`);
  }
  lines.push(`| Total Function Objects | ${result.summary.totalFunctions.toLocaleString()} |`);
  lines.push(`| Total Large Objects (>=10KB) | ${result.summary.totalLargeObjects} |`);
  lines.push(`| Total GC Roots | ${result.summary.totalGCRoots.toLocaleString()} |`);
  lines.push('');

  // Top projects by Function count
  if (result.summary.topFunctionProjects.length > 0) {
    lines.push('## Top Projects by Function Object Count');
    lines.push('');
    lines.push('| Rank | Project | Function Count | Retained Size (MB) |');
    lines.push('|------|---------|----------------|---------------------|');
    result.summary.topFunctionProjects.slice(0, 20).forEach((p, idx) => {
      const retainedSize = p.retainedSizeMB ? p.retainedSizeMB.toFixed(2) : 'N/A';
      lines.push(`| ${idx + 1} | ${p.name} | ${p.count.toLocaleString()} | ${retainedSize} |`);
    });
    lines.push('');
  }

  // Top large objects
  if (result.summary.topLargeObjects.length > 0) {
    lines.push('## Largest Objects (>=10KB)');
    lines.push('');
    lines.push('| Rank | Project | Size (bytes) | Size (KB) | Preview |');
    lines.push('|------|---------|--------------|-----------|---------|');
    result.summary.topLargeObjects.slice(0, 30).forEach((obj, idx) => {
      const sizeKB = (obj.size / 1024).toFixed(2);
      const preview = obj.line.replace(/\|/g, '\\|').substring(0, 50);
      lines.push(`| ${idx + 1} | ${obj.project} | ${obj.size.toLocaleString()} | ${sizeKB} | \`${preview}...\` |`);
    });
    lines.push('');
  }

  // Top projects by GC roots
  if (result.summary.topGCRootProjects.length > 0) {
    lines.push('## Top Projects by GC Root Count');
    lines.push('');
    lines.push('| Rank | Project | GC Root Count |');
    lines.push('|------|---------|---------------|');
    result.summary.topGCRootProjects.slice(0, 20).forEach((p, idx) => {
      lines.push(`| ${idx + 1} | ${p.name} | ${p.count.toLocaleString()} |`);
    });
    lines.push('');
  }

  // Detailed project breakdown
  lines.push('## Detailed Project Breakdown');
  lines.push('');
  
  const projectsWithIssues = result.projects.filter(p => 
    p.functionCount > 100 || 
    p.largeObjects.length > 0 || 
    p.gcRootCount > 50
  );

  if (projectsWithIssues.length > 0) {
    for (const project of projectsWithIssues) {
      lines.push(`### ${project.projectName}`);
      lines.push('');
      lines.push(`- **Path**: \`${project.projectPath}\``);
      lines.push(`- **Function Objects**: ${project.functionCount.toLocaleString()}`);
      lines.push(`- **Large Objects (>=10KB)**: ${project.largeObjects.length}`);
      lines.push(`- **GC Roots**: ${project.gcRootCount.toLocaleString()}`);
      
      if (project.largeObjects.length > 0) {
        lines.push('');
        lines.push('#### Large Objects:');
        project.largeObjects.slice(0, 10).forEach(obj => {
          const sizeKB = (obj.size / 1024).toFixed(2);
          lines.push(`- ${sizeKB} KB: \`${obj.line.substring(0, 80)}...\``);
        });
      }
      
      lines.push('');
    }
  } else {
    lines.push('No projects with significant bottlenecks found.');
    lines.push('');
  }

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');
  
  const highFunctionProjects = result.summary.topFunctionProjects.filter(p => p.count > 500);
  const highGCRootProjects = result.summary.topGCRootProjects.filter(p => p.count > 100);
  
  if (highFunctionProjects.length > 0) {
    lines.push('### Function Object Optimization');
    lines.push('');
    lines.push('Projects with excessive Function objects (>500):');
    highFunctionProjects.forEach(p => {
      lines.push(`- **${p.name}**: ${p.count.toLocaleString()} functions`);
      lines.push('  - Review closures and function factories');
      lines.push('  - Check for event listener cleanup');
      lines.push('  - Consider function memoization');
      lines.push('');
    });
  }

  if (result.summary.topLargeObjects.length > 0) {
    lines.push('### Large Object Optimization');
    lines.push('');
    lines.push('Projects with large objects (>=10KB):');
    const projectGroups = new Map<string, number>();
    result.summary.topLargeObjects.forEach(obj => {
      const current = projectGroups.get(obj.project) || 0;
      projectGroups.set(obj.project, current + obj.size);
    });
    
    Array.from(projectGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([project, totalSize]) => {
        const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
        lines.push(`- **${project}**: ${sizeMB} MB total`);
        lines.push('  - Consider pagination or lazy loading');
        lines.push('  - Use streaming for large data');
        lines.push('  - Implement object pooling');
        lines.push('  - Split large objects into smaller chunks');
        lines.push('');
      });
  }

  if (highGCRootProjects.length > 0) {
    lines.push('### GC Root Optimization');
    lines.push('');
    lines.push('Projects with high GC root counts (>100):');
    highGCRootProjects.forEach(p => {
      lines.push(`- **${p.name}**: ${p.count.toLocaleString()} GC roots`);
      lines.push('  - Check for memory leaks');
      lines.push('  - Review circular references');
      lines.push('  - Clean up global variable references');
      lines.push('  - Use WeakMap/WeakSet where appropriate');
      lines.push('  - Implement proper cleanup in event handlers');
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Finding profile.md files...\n');
    
    const profiles = findProfileFiles(ROOT_DIR);
    console.log(`Found ${profiles.length} profile.md files\n`);

    console.log('📊 Analyzing bottlenecks...\n');

    const stats: BottleneckStats[] = [];

    for (const profile of profiles) {
      try {
        const projectDir = dirname(profile.path);
        const projectName = basename(projectDir);
        
        const stat = analyzeProfile(profile.path, projectName);
        stats.push(stat);

        if (stat.profileExists) {
          console.log(`  ✅ ${projectName}:`);
          if (stat.totalHeapSize) {
            const heapMB = (stat.totalHeapSize / 1024 / 1024).toFixed(2);
            console.log(`     Heap Size: ${heapMB} MB`);
          }
          if (stat.totalObjects) {
            console.log(`     Total Objects: ${stat.totalObjects.toLocaleString()}`);
          }
          console.log(`     Functions: ${stat.functionCount.toLocaleString()}`);
          if (stat.topFunctionRetainedSize) {
            const funcMB = (stat.topFunctionRetainedSize / 1024 / 1024).toFixed(2);
            console.log(`     Function Retained Size: ${funcMB} MB`);
          }
          console.log(`     Large objects: ${stat.largeObjects.length}`);
          console.log(`     GC roots: ${stat.gcRootCount.toLocaleString()}`);
        }
      } catch (error) {
        // Fail safely - continue with next profile
        const profilingError = handleProfilingError(
          error,
          ProfilingErrorCode.ANALYSIS_FAILED,
          { profile: profile.name, profilePath: profile.path }
        );
        profilingError.log();
        continue;
      }
    }

    // Calculate summary with error handling
    let summary;
    try {
    summary = {
      totalProjects: stats.length,
      projectsWithProfiles: stats.filter(s => s.profileExists).length,
      totalFunctions: stats.reduce((sum, s) => sum + s.functionCount, 0),
      totalLargeObjects: stats.reduce((sum, s) => sum + s.largeObjects.length, 0),
      totalGCRoots: stats.reduce((sum, s) => sum + s.gcRootCount, 0),
      totalHeapSize: stats.reduce((sum, s) => sum + (s.totalHeapSize || 0), 0),
      topFunctionProjects: stats
        .map(s => ({ 
          name: s.projectName, 
          count: s.functionCount,
          retainedSizeMB: s.topFunctionRetainedSize ? s.topFunctionRetainedSize / 1024 / 1024 : undefined
        }))
        .sort((a, b) => (b.retainedSizeMB || b.count) - (a.retainedSizeMB || a.count)),
        topLargeObjects: stats
          .flatMap(s => s.largeObjects.map(obj => ({
            project: s.projectName,
            size: obj.size,
            line: obj.line,
          })))
          .sort((a, b) => b.size - a.size),
        topGCRootProjects: stats
          .map(s => ({ name: s.projectName, count: s.gcRootCount }))
          .sort((a, b) => b.count - a.count),
      };
    } catch (error) {
      const profilingError = handleProfilingError(
        error,
        ProfilingErrorCode.ANALYSIS_FAILED,
        { phase: 'summary-calculation' }
      );
      profilingError.log();
      process.exit(1);
    }

    const result: AnalysisResult = {
      projects: stats,
      summary,
    };

    // Generate report with error handling
    let report;
    try {
      report = generateReport(result);
    } catch (error) {
      const profilingError = handleProfilingError(
        error,
        ProfilingErrorCode.ANALYSIS_FAILED,
        { phase: 'report-generation' }
      );
      profilingError.log();
      process.exit(1);
    }

    const reportPath = join(ROOT_DIR, 'BOTTLENECK_REPORT.md');
    
    try {
      await Bun.write(reportPath, report);
    } catch (error) {
      const profilingError = handleProfilingError(
        error,
        ProfilingErrorCode.FILE_WRITE_FAILED,
        { reportPath, phase: 'report-writing' }
      );
      profilingError.log();
      process.exit(1);
    }
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`\n📈 Summary:`);
    console.log(`   Total Functions: ${summary.totalFunctions.toLocaleString()}`);
    console.log(`   Large Objects: ${summary.totalLargeObjects}`);
    console.log(`   GC Roots: ${summary.totalGCRoots.toLocaleString()}`);
  } catch (error) {
    const profilingError = handleProfilingError(
      error,
      ProfilingErrorCode.ANALYSIS_FAILED,
      { phase: 'main-execution' }
    );
    console.error(`\n❌ Fatal error:`);
    profilingError.log();
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
