#!/usr/bin/env bun
/**
 * HTML Test Report Generator
 * Generates an HTML report from Bun test results
 */

import { spawn, Glob } from "bun";
import { join } from "path";
import { generateHTMLHead, generateHeader, generateFooter, generateSkipLink } from "../../../../cli/html-headers";

interface TestResult {
  file: string;
  name: string;
  status: "pass" | "fail";
  duration: number;
}

interface CoverageData {
  file: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  uncoveredLines?: number[];
}

interface CoverageSummary {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  files: CoverageData[];
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  coverage?: CoverageSummary;
}

async function runTests(): Promise<{ output: string; coverage?: CoverageSummary }> {
  // Try to run tests with coverage
  const proc = spawn(["bun", "test", "--coverage", "src/server/kyc/__tests__"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  // Try to load coverage data if available
  let coverage: CoverageSummary | undefined;
  try {
    const coveragePath = join(process.cwd(), "coverage", "coverage-summary.json");
    const coverageFile = Bun.file(coveragePath);
    if (await coverageFile.exists()) {
      const coverageContent = await coverageFile.text();
      const coverageJson = JSON.parse(coverageContent);
      
      // Parse Bun coverage format
      const files: CoverageData[] = [];
      let totalStatements = 0;
      let totalBranches = 0;
      let totalFunctions = 0;
      let totalLines = 0;
      let fileCount = 0;

      for (const [file, data] of Object.entries(coverageJson)) {
        if (file === "total" || !file.includes("src/server/kyc")) continue;
        
        const fileData = data as any;
        const statements = fileData.statements?.pct || 0;
        const branches = fileData.branches?.pct || 0;
        const functions = fileData.functions?.pct || 0;
        const lines = fileData.lines?.pct || 0;
        
        files.push({
          file: file.replace(process.cwd() + "/", ""),
          statements,
          branches,
          functions,
          lines,
          uncoveredLines: fileData.lines?.uncovered || [],
        });
        
        totalStatements += statements;
        totalBranches += branches;
        totalFunctions += functions;
        totalLines += lines;
        fileCount++;
      }

      if (fileCount > 0) {
        coverage = {
          statements: totalStatements / fileCount,
          branches: totalBranches / fileCount,
          functions: totalFunctions / fileCount,
          lines: totalLines / fileCount,
          files,
        };
      }
    }
  } catch (error) {
    console.warn("Could not load coverage data:", error);
  }

  return { output: output + "\n" + stderr, coverage };
}

function parseTestOutput(output: string, coverage?: CoverageSummary): TestSummary {
  const lines = output.split("\n");
  const results: TestResult[] = [];
  let currentFile = "";
  let total = 0;
  let passed = 0;
  let failed = 0;
  let duration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse test file header
    if (line.includes("src/server/kyc/__tests__/")) {
      const match = line.match(/src\/server\/kyc\/__tests__\/([^:]+)/);
      if (match) {
        currentFile = match[1];
      }
    }

    // Parse test result - Bun test format: (pass) TestName [duration]
    const passMatch = line.match(/\(pass\)\s+(.+?)\s+\[(.+?)ms\]/);
    const failMatch = line.match(/\(fail\)\s+(.+?)\s+\[(.+?)ms\]/);
    
    if (passMatch) {
      results.push({
        file: currentFile,
        name: passMatch[1].trim(),
        status: "pass",
        duration: parseFloat(passMatch[2]),
      });
      passed++;
      total++;
    } else if (failMatch) {
      results.push({
        file: currentFile,
        name: failMatch[1].trim(),
        status: "fail",
        duration: parseFloat(failMatch[2]),
      });
      failed++;
      total++;
    }

    // Parse summary line: "X pass", "Y fail", "Ran Z tests", "[duration]s"
    if (line.includes("pass") && line.includes("fail")) {
      const passMatch = line.match(/(\d+)\s+pass/);
      const failMatch = line.match(/(\d+)\s+fail/);
      const totalMatch = line.match(/Ran\s+(\d+)\s+tests/);
      const timeMatch = line.match(/\[(.+?)s\]/);
      
      if (passMatch) passed = parseInt(passMatch[1]);
      if (failMatch) failed = parseInt(failMatch[1]);
      if (totalMatch) total = parseInt(totalMatch[1]);
      if (timeMatch) duration = parseFloat(timeMatch[1]);
    }
  }

  // If we didn't get totals from summary, calculate from results
  if (total === 0 && results.length > 0) {
    total = results.length;
    passed = results.filter(r => r.status === "pass").length;
    failed = results.filter(r => r.status === "fail").length;
  }

  return { total, passed, failed, duration, results, coverage };
}

async function generateHTML(summary: TestSummary, previousRun?: { file: string; timestamp: string; summary: any; coverage?: CoverageSummary } | null, history?: Array<{ file: string; timestamp: string; summary: any; coverage?: CoverageSummary }>): Promise<string> {
  const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : "0";
  const groupedByFile = summary.results.reduce((acc, result) => {
    if (!acc[result.file]) {
      acc[result.file] = [];
    }
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const fileStats = Object.entries(groupedByFile).map(([file, tests]) => {
    const passed = tests.filter(t => t.status === "pass").length;
    const failed = tests.filter(t => t.status === "fail").length;
    const total = tests.length;
    const filePassRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";
    return { file, passed, failed, total, passRate: filePassRate, tests };
  });

  // Generate reusable header components
  const head = await generateHTMLHead({
    title: "KYC Test Suite Report",
    description: `Comprehensive test coverage for KYC Failsafe System - ${summary.passed}/${summary.total} tests passed`,
    themeColor: "#667eea",
    includeChartJS: true,
    includeDarkMode: true,
    customStyles: `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-card .value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-card .label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-card.total .value { color: #667eea; }
        .stat-card.passed .value { color: #10b981; }
        .stat-card.failed .value { color: #ef4444; }
        .stat-card.duration .value { color: #f59e0b; }
        
        .content {
            padding: 30px;
        }
        
        .file-section {
            margin-bottom: 40px;
        }
        
        .file-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .file-header:hover {
            background: #e9ecef;
        }
        
        .file-header h2 {
            font-size: 1.3em;
            color: #333;
        }
        
        .file-stats {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .badge.pass {
            background: #d1fae5;
            color: #065f46;
        }
        
        .badge.fail {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .badge.rate {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .test-list {
            display: none;
            padding-left: 20px;
        }
        
        .test-list.expanded {
            display: block;
        }
        
        .test-item {
            padding: 12px 15px;
            margin: 5px 0;
            background: white;
            border-left: 4px solid #e5e7eb;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .test-item.pass {
            border-left-color: #10b981;
        }
        
        .test-item.fail {
            border-left-color: #ef4444;
        }
        
        .test-name {
            flex: 1;
            color: #333;
        }
        
        .test-duration {
            color: #666;
            font-size: 0.9em;
            margin-left: 15px;
        }
        
        .status-icon {
            margin-right: 10px;
            font-size: 1.2em;
        }
        
        .footer {
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e5e7eb;
            background: #f8f9fa;
        }
        
        .filters {
            padding: 20px 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .filter-bar {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .search-input {
            flex: 1;
            min-width: 200px;
            padding: 10px 15px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .filter-select {
            padding: 10px 15px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
        }
        
        .filter-select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .filter-toggle {
            padding: 10px 15px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            font-size: 14px;
        }
        
        .filter-toggle.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .results-count {
            padding: 10px 0;
            color: #666;
            font-size: 14px;
        }
        
        .file-section.hidden {
            display: none;
        }
        
        .test-item.hidden {
            display: none;
        }
        
        .no-results {
            text-align: center;
            padding: 40px;
            color: #999;
            font-size: 18px;
        }
        
        .history-panel {
            padding: 20px 30px;
            background: #f0f9ff;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .history-select {
            padding: 8px 12px;
            border: 2px solid #667eea;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
        }
        
        .comparison-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 600;
            margin-left: 8px;
        }
        
        .comparison-badge.positive {
            background: #d1fae5;
            color: #065f46;
        }
        
        .comparison-badge.negative {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .comparison-badge.neutral {
            background: #e5e7eb;
            color: #374151;
        }
        
        .performance-section {
            padding: 20px 30px;
            background: #fff7ed;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .performance-chart {
            height: 200px;
            margin-top: 15px;
        }
        
        .slow-test {
            background: #fef2f2 !important;
            border-left-color: #ef4444 !important;
        }
        
        .slow-test .test-duration {
            color: #ef4444;
            font-weight: bold;
        }
        
        .coverage-section {
            padding: 20px 30px;
            background: #f0fdf4;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .coverage-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            margin: 2px;
        }
        
        .coverage-badge.excellent { background: #d1fae5; color: #065f46; }
        .coverage-badge.good { background: #dbeafe; color: #1e40af; }
        .coverage-badge.fair { background: #fef3c7; color: #92400e; }
        .coverage-badge.poor { background: #fee2e2; color: #991b1b; }
        
        .coverage-file-row {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
            gap: 10px;
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
            align-items: center;
        }
        
        .coverage-file-row:hover {
            background: #f9fafb;
        }
        
        .coverage-chart {
            height: 300px;
            margin-top: 15px;
        }
        
        .coverage-trend {
            display: flex;
            gap: 5px;
            align-items: center;
            font-size: 0.9em;
        }
        
        .coverage-trend.up {
            color: #10b981;
        }
        
        .coverage-trend.down {
            color: #ef4444;
        }
        
        /* Dark mode styles */
        body.dark-mode {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        }
        
        body.dark-mode .container {
            background: #1e293b;
            color: #e2e8f0;
        }
        
        body.dark-mode .header {
            background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);
        }
        
        body.dark-mode .summary {
            background: #0f172a;
        }
        
        body.dark-mode .stat-card {
            background: #1e293b;
            color: #e2e8f0;
            border: 1px solid #334155;
        }
        
        body.dark-mode .stat-card .label {
            color: #94a3b8;
        }
        
        body.dark-mode .content {
            background: #0f172a;
        }
        
        body.dark-mode .file-header {
            background: #1e293b;
            color: #e2e8f0;
            border: 1px solid #334155;
        }
        
        body.dark-mode .file-header:hover {
            background: #334155;
        }
        
        body.dark-mode .test-item {
            background: #1e293b;
            color: #e2e8f0;
            border-left-color: #475569;
        }
        
        body.dark-mode .test-item.pass {
            border-left-color: #10b981;
        }
        
        body.dark-mode .test-item.fail {
            border-left-color: #ef4444;
        }
        
        body.dark-mode .filters {
            background: #0f172a;
            border-bottom-color: #334155;
        }
        
        body.dark-mode .search-input,
        body.dark-mode .filter-select,
        body.dark-mode .filter-toggle {
            background: #1e293b;
            color: #e2e8f0;
            border-color: #334155;
        }
        
        body.dark-mode .search-input:focus,
        body.dark-mode .filter-select:focus {
            border-color: #667eea;
        }
        
        body.dark-mode .filter-toggle.active {
            background: #667eea;
            color: white;
        }
        
        body.dark-mode .results-count {
            color: #94a3b8;
        }
        
        body.dark-mode .footer {
            background: #0f172a;
            border-top-color: #334155;
            color: #94a3b8;
        }
        
        body.dark-mode .history-panel {
            background: #1e293b;
            border-bottom-color: #334155;
        }
        
        body.dark-mode .performance-section {
            background: #1e293b;
            border-bottom-color: #334155;
        }
        
        body.dark-mode .coverage-section {
            background: #1e293b;
            border-bottom-color: #334155;
        }
        
        body.dark-mode .coverage-file-row {
            border-bottom-color: #334155;
        }
        
        body.dark-mode .coverage-file-row:hover {
            background: #334155;
        }
        
        body.dark-mode .no-results {
            color: #64748b;
        }
        
        /* Dark mode toggle button */
        .dark-mode-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
        }
        
        body.dark-mode .dark-mode-toggle {
            background: rgba(30, 41, 59, 0.9);
            border-color: #667eea;
            color: #e2e8f0;
        }
        
        .dark-mode-toggle:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .file-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            
            .filter-bar {
                flex-direction: column;
            }
            
            .search-input {
                width: 100%;
            }
        }
    `,
  });

  const skipLink = generateSkipLink();
  
  // Custom header matching the existing gradient design
  const header = `
    <header role="banner" class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center;">
      <h1>🧪 KYC Test Suite Report</h1>
      <div class="subtitle" style="font-size: 1.2em; opacity: 0.9;">Comprehensive test coverage for KYC Failsafe System</div>
    </header>
  `;

  return `${head}
<body>
  ${skipLink}
  <div class="container">
    ${header}
        
        <div class="summary">
            <div class="stat-card total">
                <div class="value">${summary.total}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="value">${summary.passed}</div>
                <div class="label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="value">${summary.failed}</div>
                <div class="label">Failed</div>
            </div>
            <div class="stat-card duration">
                <div class="value">${summary.duration.toFixed(2)}s</div>
                <div class="label">Duration</div>
            </div>
        </div>
        
        ${previousRun ? `
        <div class="history-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong>Comparison with previous run:</strong> ${new Date(previousRun.timestamp).toLocaleString()}
                    <span class="comparison-badge ${summary.total - previousRun.summary.total >= 0 ? 'positive' : 'negative'}">
                        Total: ${summary.total - previousRun.summary.total >= 0 ? '+' : ''}${summary.total - previousRun.summary.total}
                    </span>
                    <span class="comparison-badge ${summary.passed - previousRun.summary.passed >= 0 ? 'positive' : 'negative'}">
                        Passed: ${summary.passed - previousRun.summary.passed >= 0 ? '+' : ''}${summary.passed - previousRun.summary.passed}
                    </span>
                    <span class="comparison-badge ${summary.failed - previousRun.summary.failed <= 0 ? 'positive' : 'negative'}">
                        Failed: ${summary.failed - previousRun.summary.failed >= 0 ? '+' : ''}${summary.failed - previousRun.summary.failed}
                    </span>
                </div>
                ${history && history.length > 0 ? `
                <select id="historySelect" class="history-select" onchange="loadHistoryComparison(this.value)">
                    <option value="">Compare with...</option>
                    ${history.slice(1).map((h, idx) => `
                        <option value="${h.file}">${new Date(h.timestamp).toLocaleString()} (${h.summary.passed}/${h.summary.total} passed)</option>
                    `).join('')}
                </select>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <div class="performance-section">
            <h3 style="margin-bottom: 10px; font-size: 1.2em;">Performance Analysis</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div>
                    <div style="font-size: 0.9em; color: #666;">Average Duration</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: #667eea;">
                        ${(summary.results.reduce((sum, r) => sum + r.duration, 0) / summary.results.length || 0).toFixed(2)}ms
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9em; color: #666;">Slow Tests (>100ms)</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: #ef4444;">
                        ${summary.results.filter(r => r.duration > 100).length}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9em; color: #666;">Fastest Test</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: #10b981;">
                        ${Math.min(...summary.results.map(r => r.duration), 0).toFixed(2)}ms
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9em; color: #666;">Slowest Test</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: #ef4444;">
                        ${Math.max(...summary.results.map(r => r.duration), 0).toFixed(2)}ms
                    </div>
                </div>
            </div>
            <canvas id="performanceChart" class="performance-chart"></canvas>
        </div>
        
        ${summary.coverage ? `
        <div class="coverage-section">
            <h3 style="margin-bottom: 15px; font-size: 1.2em;">Code Coverage Analysis</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 0.9em; color: #666;">Statements</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: ${summary.coverage.statements >= 80 ? '#10b981' : summary.coverage.statements >= 60 ? '#f59e0b' : '#ef4444'};">
                        ${summary.coverage.statements.toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9em; color: #666;">Branches</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: ${summary.coverage.branches >= 80 ? '#10b981' : summary.coverage.branches >= 60 ? '#f59e0b' : '#ef4444'};">
                        ${summary.coverage.branches.toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9em; color: #666;">Functions</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: ${summary.coverage.functions >= 80 ? '#10b981' : summary.coverage.functions >= 60 ? '#f59e0b' : '#ef4444'};">
                        ${summary.coverage.functions.toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9em; color: #666;">Lines</div>
                    <div style="font-size: 1.8em; font-weight: bold; color: ${summary.coverage.lines >= 80 ? '#10b981' : summary.coverage.lines >= 60 ? '#f59e0b' : '#ef4444'};">
                        ${summary.coverage.lines.toFixed(1)}%
                    </div>
                </div>
            </div>
            
            ${previousRun && previousRun.coverage ? `
            <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 8px;">
                <strong>Coverage Trends (vs Previous Run):</strong>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 10px;">
                    <div class="coverage-trend ${summary.coverage.statements - previousRun.coverage.statements >= 0 ? 'up' : 'down'}">
                        Statements: ${summary.coverage.statements >= previousRun.coverage.statements ? '↑' : '↓'} ${Math.abs(summary.coverage.statements - previousRun.coverage.statements).toFixed(1)}%
                    </div>
                    <div class="coverage-trend ${summary.coverage.branches - previousRun.coverage.branches >= 0 ? 'up' : 'down'}">
                        Branches: ${summary.coverage.branches >= previousRun.coverage.branches ? '↑' : '↓'} ${Math.abs(summary.coverage.branches - previousRun.coverage.branches).toFixed(1)}%
                    </div>
                    <div class="coverage-trend ${summary.coverage.functions - previousRun.coverage.functions >= 0 ? 'up' : 'down'}">
                        Functions: ${summary.coverage.functions >= previousRun.coverage.functions ? '↑' : '↓'} ${Math.abs(summary.coverage.functions - previousRun.coverage.functions).toFixed(1)}%
                    </div>
                    <div class="coverage-trend ${summary.coverage.lines - previousRun.coverage.lines >= 0 ? 'up' : 'down'}">
                        Lines: ${summary.coverage.lines >= previousRun.coverage.lines ? '↑' : '↓'} ${Math.abs(summary.coverage.lines - previousRun.coverage.lines).toFixed(1)}%
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${history && history.length > 1 ? `
            <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 8px;">
                <strong>Coverage Trends Over Time:</strong>
                <canvas id="coverageTrendChart" style="height: 200px; margin-top: 15px;"></canvas>
            </div>
            ` : ''}
            
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 10px; font-size: 1em;">Coverage by File</h4>
                <div style="max-height: 400px; overflow-y: auto;">
                    <div class="coverage-file-row" style="font-weight: bold; background: #f9fafb; position: sticky; top: 0;">
                        <div>File</div>
                        <div>Statements</div>
                        <div>Branches</div>
                        <div>Functions</div>
                        <div>Lines</div>
                    </div>
                    ${summary.coverage.files.map(file => {
                        const getBadgeClass = (pct: number) => {
                            if (pct >= 80) return 'excellent';
                            if (pct >= 60) return 'good';
                            if (pct >= 40) return 'fair';
                            return 'poor';
                        };
                        return `
                            <div class="coverage-file-row">
                                <div style="font-family: monospace; font-size: 0.9em;">${file.file}</div>
                                <div><span class="coverage-badge ${getBadgeClass(file.statements)}">${file.statements.toFixed(1)}%</span></div>
                                <div><span class="coverage-badge ${getBadgeClass(file.branches)}">${file.branches.toFixed(1)}%</span></div>
                                <div><span class="coverage-badge ${getBadgeClass(file.functions)}">${file.functions.toFixed(1)}%</span></div>
                                <div><span class="coverage-badge ${getBadgeClass(file.lines)}">${file.lines.toFixed(1)}%</span></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <canvas id="coverageChart" class="coverage-chart"></canvas>
        </div>
        ` : ''}
        
        <div class="filters">
            <div class="filter-bar">
                <input 
                    type="text" 
                    id="searchInput" 
                    class="search-input" 
                    placeholder="Search tests by name..."
                    oninput="filterTests()"
                />
                <select id="fileFilter" class="filter-select" onchange="filterTests()">
                    <option value="">All Files</option>
                    ${fileStats.map(({ file }) => `<option value="${file}">${file}</option>`).join('')}
                </select>
                <select id="statusFilter" class="filter-select" onchange="filterTests()">
                    <option value="">All Status</option>
                    <option value="pass">Passed</option>
                    <option value="fail">Failed</option>
                </select>
                <select id="durationFilter" class="filter-select" onchange="filterTests()">
                    <option value="">All Durations</option>
                    <option value="slow">Slow (>100ms)</option>
                    <option value="fast">Fast (<100ms)</option>
                </select>
                <button 
                    id="failedOnlyToggle" 
                    class="filter-toggle" 
                    onclick="toggleFailedOnly()"
                >
                    Show Failed Only
                </button>
                <button 
                    onclick="clearFilters()" 
                    class="filter-toggle"
                >
                    Clear Filters
                </button>
            </div>
            <div class="results-count" id="resultsCount">
                Showing all ${summary.total} tests
            </div>
        </div>
        
        <div class="content" id="testContent">
            ${fileStats.map(({ file, passed, failed, total, passRate, tests }) => `
                <div class="file-section">
                    <div class="file-header" onclick="toggleSection('${file}')">
                        <h2>${file}</h2>
                        <div class="file-stats">
                            <span class="badge pass">${passed} Pass</span>
                            ${failed > 0 ? `<span class="badge fail">${failed} Fail</span>` : ''}
                            <span class="badge rate">${passRate}%</span>
                        </div>
                    </div>
                    <div class="test-list" id="${file}">
                        ${tests.map(test => `
                            <div class="test-item ${test.status} ${test.duration > 100 ? 'slow-test' : ''}" data-test-name="${test.name.toLowerCase()}" data-test-file="${file}" data-test-status="${test.status}" data-test-duration="${test.duration}">
                                <div class="test-name">
                                    <span class="status-icon">${test.status === 'pass' ? '✅' : '❌'}</span>
                                    ${test.name}
                                    ${test.duration > 100 ? '<span style="color: #ef4444; font-size: 0.8em; margin-left: 8px;">⚠️ Slow</span>' : ''}
                                </div>
                                <div class="test-duration">${test.duration.toFixed(2)}ms</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <footer role="contentinfo" class="footer" style="padding: 20px; text-align: center; color: #666; border-top: 1px solid #e5e7eb; background: #f8f9fa;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <p>Generated on <time datetime="${new Date().toISOString()}">${new Date().toLocaleString()}</time></p>
                    <p>Test Framework: Bun Test (bun:test)</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="exportToJSON()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;" aria-label="Export report as JSON">
                        Export JSON
                    </button>
                    <button onclick="exportToCSV()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;" aria-label="Export report as CSV">
                        Export CSV
                    </button>
                    <button onclick="exportToMarkdown()" style="padding: 8px 16px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer;" aria-label="Export report as Markdown">
                        Export Markdown
                    </button>
                    <button onclick="window.print()" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;" aria-label="Export report as PDF">
                        Export PDF
                    </button>
                </div>
            </div>
            <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                ⌨️ Press <kbd style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Ctrl/Cmd+?</kbd> for keyboard shortcuts
            </p>
        </footer>
    </div>
    
    <script src="shortcuts.js"></script>
    <script>
        let showFailedOnly = false;
        const allTests = ${JSON.stringify(summary.results)};
        
        // Dark mode functionality
        function initDarkMode() {
            const saved = localStorage.getItem('test-report-dark-mode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const shouldBeDark = saved === 'true' || (saved === null && prefersDark);
            
            if (shouldBeDark) {
                document.body.classList.add('dark-mode');
                document.getElementById('darkModeToggle').textContent = '☀️';
            }
        }
        
        function toggleDarkMode() {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('test-report-dark-mode', isDark ? 'true' : 'false');
            document.getElementById('darkModeToggle').textContent = isDark ? '☀️' : '🌙';
        }
        
        // Initialize dark mode on load
        initDarkMode();
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('test-report-dark-mode') === null) {
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                    document.getElementById('darkModeToggle').textContent = '☀️';
                } else {
                    document.body.classList.remove('dark-mode');
                    document.getElementById('darkModeToggle').textContent = '🌙';
                }
            }
        });
        
        function toggleSection(fileId) {
            const section = document.getElementById(fileId);
            if (section) {
                section.classList.toggle('expanded');
            }
        }
        
        function filterTests() {
            const searchQuery = document.getElementById('searchInput').value.toLowerCase();
            const fileFilter = document.getElementById('fileFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;
            const durationFilter = document.getElementById('durationFilter').value;
            
            let visibleCount = 0;
            let fileVisibleCount = {};
            
            // Filter test items
            document.querySelectorAll('.test-item').forEach(item => {
                const testName = item.getAttribute('data-test-name') || '';
                const testFile = item.getAttribute('data-test-file') || '';
                const testStatus = item.getAttribute('data-test-status') || '';
                const testDuration = parseFloat(item.getAttribute('data-test-duration') || '0');
                
                let visible = true;
                
                // Search filter
                if (searchQuery && !testName.includes(searchQuery)) {
                    visible = false;
                }
                
                // File filter
                if (fileFilter && testFile !== fileFilter) {
                    visible = false;
                }
                
                // Status filter
                if (statusFilter && testStatus !== statusFilter) {
                    visible = false;
                }
                
                // Duration filter
                if (durationFilter === 'slow' && testDuration <= 100) {
                    visible = false;
                } else if (durationFilter === 'fast' && testDuration >= 100) {
                    visible = false;
                }
                
                // Failed only toggle
                if (showFailedOnly && testStatus !== 'fail') {
                    visible = false;
                }
                
                if (visible) {
                    item.classList.remove('hidden');
                    visibleCount++;
                    fileVisibleCount[testFile] = (fileVisibleCount[testFile] || 0) + 1;
                } else {
                    item.classList.add('hidden');
                }
            });
            
            // Hide/show file sections based on visible tests
            document.querySelectorAll('.file-section').forEach(section => {
                const fileId = section.querySelector('.test-list')?.id;
                if (fileId && fileVisibleCount[fileId] > 0) {
                    section.classList.remove('hidden');
                } else if (fileId) {
                    section.classList.add('hidden');
                }
            });
            
            // Update results count
            const resultsCountEl = document.getElementById('resultsCount');
            if (resultsCountEl) {
                resultsCountEl.textContent = \`Showing \${visibleCount} of ${summary.total} tests\`;
            }
            
            // Show no results message
            const content = document.getElementById('testContent');
            const noResults = document.getElementById('noResultsMessage');
            if (visibleCount === 0) {
                if (!noResults) {
                    const msg = document.createElement('div');
                    msg.id = 'noResultsMessage';
                    msg.className = 'no-results';
                    msg.textContent = 'No tests match your filters';
                    content.appendChild(msg);
                }
            } else if (noResults) {
                noResults.remove();
            }
        }
        
        function toggleFailedOnly() {
            showFailedOnly = !showFailedOnly;
            const btn = document.getElementById('failedOnlyToggle');
            if (btn) {
                if (showFailedOnly) {
                    btn.classList.add('active');
                    btn.textContent = 'Show All';
                } else {
                    btn.classList.remove('active');
                    btn.textContent = 'Show Failed Only';
                }
            }
            filterTests();
        }
        
        function clearFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('fileFilter').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('durationFilter').value = '';
            showFailedOnly = false;
            const btn = document.getElementById('failedOnlyToggle');
            if (btn) {
                btn.classList.remove('active');
                btn.textContent = 'Show Failed Only';
            }
            filterTests();
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
            }
        });
        
        // Performance chart
        function renderPerformanceChart() {
            const canvas = document.getElementById('performanceChart');
            if (!canvas) return;
            
            // Load Chart.js if not already loaded
            if (typeof Chart === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script.onload = () => {
                    renderPerformanceChart();
                };
                document.head.appendChild(script);
                return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Group tests by file and calculate average duration
            const fileDurations = {};
            ${fileStats.map(({ file, tests }) => `
                fileDurations['${file}'] = ${tests.reduce((sum, t) => sum + t.duration, 0) / tests.length || 0};
            `).join('')}
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(fileStats.map(f => f.file))},
                    datasets: [{
                        label: 'Average Duration (ms)',
                        data: ${JSON.stringify(fileStats.map(f => (f.tests.reduce((sum, t) => sum + t.duration, 0) / f.tests.length || 0).toFixed(2)))},
                        backgroundColor: ${JSON.stringify(fileStats.map(f => {
                            const avg = f.tests.reduce((sum, t) => sum + t.duration, 0) / f.tests.length || 0;
                            return avg > 100 ? 'rgba(239, 68, 68, 0.6)' : avg > 50 ? 'rgba(234, 179, 8, 0.6)' : 'rgba(34, 197, 94, 0.6)';
                        }))},
                        borderColor: ${JSON.stringify(fileStats.map(f => {
                            const avg = f.tests.reduce((sum, t) => sum + t.duration, 0) / f.tests.length || 0;
                            return avg > 100 ? 'rgb(239, 68, 68)' : avg > 50 ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)';
                        }))},
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Average Test Duration by File' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        
        // Auto-expand failed tests
        document.addEventListener('DOMContentLoaded', () => {
            ${fileStats.filter(f => f.failed > 0).map(f => `
                const section = document.getElementById('${f.file}');
                if (section) section.classList.add('expanded');
            `).join('')}
            
            // Render performance chart
            setTimeout(renderPerformanceChart, 100);
            
            // Render coverage chart if available
            ${summary.coverage ? `
            setTimeout(renderCoverageChart, 200);
            ` : ''}
        });
        
        // Coverage chart rendering
        ${summary.coverage ? `
        function renderCoverageChart() {
            const canvas = document.getElementById('coverageChart');
            if (!canvas) return;
            
            if (typeof Chart === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script.onload = () => {
                    renderCoverageChart();
                };
                document.head.appendChild(script);
                return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const coverageData = ${JSON.stringify(summary.coverage.files.map(f => ({
                file: f.file.split('/').pop(),
                statements: f.statements,
                branches: f.branches,
                functions: f.functions,
                lines: f.lines
            })))};
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: coverageData.map(f => f.file),
                    datasets: [
                        {
                            label: 'Statements',
                            data: coverageData.map(f => f.statements),
                            backgroundColor: 'rgba(59, 130, 246, 0.6)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1
                        },
                        {
                            label: 'Branches',
                            data: coverageData.map(f => f.branches),
                            backgroundColor: 'rgba(16, 185, 129, 0.6)',
                            borderColor: 'rgb(16, 185, 129)',
                            borderWidth: 1
                        },
                        {
                            label: 'Functions',
                            data: coverageData.map(f => f.functions),
                            backgroundColor: 'rgba(234, 179, 8, 0.6)',
                            borderColor: 'rgb(234, 179, 8)',
                            borderWidth: 1
                        },
                        {
                            label: 'Lines',
                            data: coverageData.map(f => f.lines),
                            backgroundColor: 'rgba(168, 85, 247, 0.6)',
                            borderColor: 'rgb(168, 85, 247)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: { display: true, text: 'Code Coverage by File' }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
        ` : ''}

        ${history && history.length > 1 && summary.coverage ? `
        function renderCoverageTrendChart() {
            const canvas = document.getElementById('coverageTrendChart');
            if (!canvas) return;
            
            if (typeof Chart === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script.onload = () => {
                    renderCoverageTrendChart();
                };
                document.head.appendChild(script);
                return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Get coverage data from history (last 10 runs)
            const historyWithCoverage = ${JSON.stringify(history.filter(h => h.coverage).slice(-10).reverse())};
            const labels = historyWithCoverage.map((h, idx) => {
                const date = new Date(h.timestamp);
                return idx === historyWithCoverage.length - 1 ? 'Current' : date.toLocaleDateString();
            });
            
            // Add current coverage
            const currentCoverage = ${JSON.stringify(summary.coverage)};
            labels.push('Current');
            
            const statementsData = [...historyWithCoverage.map(h => h.coverage.statements), currentCoverage.statements];
            const branchesData = [...historyWithCoverage.map(h => h.coverage.branches), currentCoverage.branches];
            const functionsData = [...historyWithCoverage.map(h => h.coverage.functions), currentCoverage.functions];
            const linesData = [...historyWithCoverage.map(h => h.coverage.lines), currentCoverage.lines];
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Statements',
                            data: statementsData,
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Branches',
                            data: branchesData,
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Functions',
                            data: functionsData,
                            borderColor: 'rgb(234, 179, 8)',
                            backgroundColor: 'rgba(234, 179, 8, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Lines',
                            data: linesData,
                            borderColor: 'rgb(168, 85, 247)',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top' },
                        title: { display: true, text: 'Coverage Trends Over Time' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }
        ` : ''}
        
        // History comparison
        const historyData = ${JSON.stringify(history || [])};
        const testData = ${JSON.stringify(summary)};
        
        async function loadHistoryComparison(filename) {
            if (!filename) return;
            
            try {
                const response = await fetch(\`history/\${filename}\`);
                const data = await response.json();
                
                // Show comparison modal or update UI
                alert(\`Comparing with: \${new Date(data.timestamp).toLocaleString()}\\n\\n\` +
                    \`Total: \${data.summary.total} (Current: ${summary.total}, Diff: \${summary.total - data.summary.total})\\n\` +
                    \`Passed: \${data.summary.passed} (Current: ${summary.passed}, Diff: \${summary.passed - data.summary.passed})\\n\` +
                    \`Failed: \${data.summary.failed} (Current: ${summary.failed}, Diff: \${summary.failed - data.summary.failed})\`);
            } catch (error) {
                console.error('Failed to load history:', error);
                alert('Failed to load history file. Make sure the history directory is accessible.');
            }
        }
        
        // Export functions
        function exportToJSON() {
            const data = {
                exportedAt: new Date().toISOString(),
                summary: {
                    total: testData.total,
                    passed: testData.passed,
                    failed: testData.failed,
                    duration: testData.duration,
                },
                results: testData.results,
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`kyc-test-report-\${new Date().toISOString().split('T')[0]}.json\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        function exportToCSV() {
            const headers = ['File', 'Test Name', 'Status', 'Duration (ms)'];
            const rows = testData.results.map(r => [
                r.file,
                r.name,
                r.status,
                r.duration.toFixed(2)
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => \`"\${cell}"\`).join(','))
            ].join('\\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`kyc-test-report-\${new Date().toISOString().split('T')[0]}.csv\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        function exportToMarkdown() {
            const lines = ['# KYC Test Suite Report', '', 'Generated: ' + new Date().toLocaleString(), '', '## Summary', ''];
            lines.push('- **Total Tests**: ' + testData.total);
            lines.push('- **Passed**: ' + testData.passed + ' ✅');
            lines.push('- **Failed**: ' + testData.failed + (testData.failed > 0 ? ' ❌' : ' ✅'));
            lines.push('- **Duration**: ' + testData.duration.toFixed(2) + 's');
            lines.push('- **Pass Rate**: ' + ((testData.passed / testData.total) * 100).toFixed(1) + '%');
            lines.push('', '## Test Results', '');
            testData.results.forEach(function(r) {
                lines.push('### ' + r.name, '');
                lines.push('- **File**: ' + r.file);
                lines.push('- **Status**: ' + (r.status === 'pass' ? '✅ Pass' : '❌ Fail'));
                lines.push('- **Duration**: ' + r.duration.toFixed(2) + 'ms');
                lines.push('');
            });
            const md = lines.join('\\n');
            
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`kyc-test-report-\${new Date().toISOString().split('T')[0]}.md\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        // Listen for KYC shortcuts in test report
        document.addEventListener('kyc:validate:requested', () => {
            console.log('KYC validation requested - navigate to KYC tab');
        });
        
        document.addEventListener('kyc:review:requested', () => {
            console.log('KYC review requested - showing review queue');
        });
    </script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" defer></script>
</body>
</html>`;
}

async function saveTestHistory(summary: TestSummary): Promise<string> {
  const historyDir = join(process.cwd(), "src/server/kyc/__tests__/history");
  
  // Ensure history directory exists
  await Bun.$`mkdir -p ${historyDir}`.quiet();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const historyFile = join(historyDir, `test-results-${timestamp}.json`);
  
  const historyData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      duration: summary.duration,
    },
    results: summary.results,
    coverage: summary.coverage,
  };
  
  await Bun.write(historyFile, JSON.stringify(historyData, null, 2));
  return historyFile;
}

async function loadTestHistory(): Promise<Array<{ file: string; timestamp: string; summary: any; coverage?: CoverageSummary }>> {
  const historyDir = join(process.cwd(), "src/server/kyc/__tests__/history");
  
  const historyGlob = new Glob("test-results-*.json");
  const historyFiles = Array.from(historyGlob.scanSync({ cwd: historyDir, onlyFiles: true }));

  if (historyFiles.length === 0) {
    return [];
  }

  try {
    const history = await Promise.all(
      historyFiles.map(async (file) => {
        const content = await Bun.file(join(historyDir, file)).text();
        const data = JSON.parse(content);
        return {
          file,
          timestamp: data.timestamp,
          summary: data.summary,
          coverage: data.coverage,
        };
      })
    );
    
    // Sort by timestamp, newest first
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn("Failed to load test history:", error);
    return [];
  }
}

async function main() {
  console.log("🧪 Running KYC tests and generating HTML report...\n");

  try {
    const { output, coverage } = await runTests();
    const summary = parseTestOutput(output, coverage);
    
    // Save test history
    const historyFile = await saveTestHistory(summary);
    console.log(`📝 Test history saved: ${historyFile}`);
    
    // Load previous history for comparison
    const history = await loadTestHistory();
    const previousRun = history.length > 1 ? history[1] : null; // Second newest (current is newest)
    
    const html = await generateHTML(summary, previousRun, history);

    const outputPath = join(process.cwd(), "src/server/kyc/__tests__/test-report.html");
    await Bun.write(outputPath, html);

    console.log(`✅ HTML report generated: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Passed: ${summary.passed} ✅`);
    console.log(`   Failed: ${summary.failed} ${summary.failed > 0 ? '❌' : '✅'}`);
    console.log(`   Duration: ${summary.duration.toFixed(2)}s`);
    
    if (previousRun) {
      const totalDiff = summary.total - previousRun.summary.total;
      const passedDiff = summary.passed - previousRun.summary.passed;
      const failedDiff = summary.failed - previousRun.summary.failed;
      console.log(`\n📈 Comparison with previous run:`);
      console.log(`   Total: ${totalDiff >= 0 ? '+' : ''}${totalDiff}`);
      console.log(`   Passed: ${passedDiff >= 0 ? '+' : ''}${passedDiff}`);
      console.log(`   Failed: ${failedDiff >= 0 ? '+' : ''}${failedDiff}`);
    }
    
    console.log(`\n📄 Open ${outputPath} in your browser to view the report.`);
  } catch (error) {
    console.error("❌ Error generating report:", error);
    process.exit(1);
  }
}

main();
