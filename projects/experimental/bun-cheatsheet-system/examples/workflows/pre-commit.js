#!/usr/bin/env bun

export async function demoPreCommitWorkflow() {
  console.info('🔒 Pre-commit Workflow Demo');
  console.info('='.repeat(40));
  
  // Simulate a pre-commit workflow
  const workspace = './temp-workspace';
  
  try {
    // Create temporary workspace
    await Bun.spawn(['mkdir', '-p', workspace]).exited;
    console.info('📁 Created temporary workspace');
    
    // 1. Code formatting check
    console.info('\n1. 🎨 Code Formatting Check:');
    const checkFormatting = async (filePath) => {
      try {
        const content = await Bun.file(filePath).text();
        const lines = content.split('\n');
        
        let issues = [];
        lines.forEach((line, index) => {
          if (line.endsWith(' ')) {
            issues.push(`Line ${index + 1}: Trailing whitespace`);
          }
          if (line.includes('\t')) {
            issues.push(`Line ${index + 1}: Tab character detected`);
          }
        });
        
        return issues;
      } catch (error) {
        return [`Error reading file: ${error.message}`];
      }
    };
    
    // Create a test file with formatting issues
    const testFile = `${workspace}/test.js`;
    await Bun.write(testFile, `function test() {	
  console.info('hello ');   // trailing space
  return true;
}
`);
    
    const formattingIssues = await checkFormatting(testFile);
    if (formatingIssues.length > 0) {
      console.info('   ❌ Formatting issues found:');
      formattingIssues.forEach(issue => console.info(`      - ${issue}`));
    } else {
      console.info('   ✅ No formatting issues');
    }
    
    // 2. TypeScript type checking
    console.info('\n2. 📝 TypeScript Type Checking:');
    const typeCheck = async (filePath) => {
      try {
        // Simulate type checking by looking for obvious issues
        const content = await Bun.file(filePath).text();
        
        const issues = [];
        
        // Check for undefined variables
        if (content.includes('undefinedVariable')) {
          issues.push('undefinedVariable is not defined');
        }
        
        // Check for missing imports
        if (content.includes('React.') && !content.includes('import React')) {
          issues.push('React used but not imported');
        }
        
        return issues;
      } catch (error) {
        return [`Type check error: ${error.message}`];
      }
    };
    
    const tsFile = `${workspace}/test.ts`;
    await Bun.write(tsFile, `
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  undefinedVariable; // This would cause an error
  return <div>{count}</div>;
}
`);
    
    const typeIssues = await typeCheck(tsFile);
    if (typeIssues.length > 0) {
      console.info('   ❌ Type issues found:');
      typeIssues.forEach(issue => console.info(`      - ${issue}`));
    } else {
      console.info('   ✅ No type issues');
    }
    
    // 3. Linting
    console.info('\n3. 🔍 Linting Check:');
    const lintFile = async (filePath) => {
      try {
        const content = await Bun.file(filePath).text();
        const lines = content.split('\n');
        
        const issues = [];
        
        lines.forEach((line, index) => {
          // Check for console.log in production code
          if (line.includes('console.log') && !line.includes('//')) {
            issues.push(`Line ${index + 1}: console.log statement found`);
          }
          
          // Check for unused variables (simple check)
          if (line.includes('const ') && !line.includes('export')) {
            const varMatch = line.match(/const\s+(\w+)/);
            if (varMatch) {
              const varName = varMatch[1];
              const varUsage = content.match(new RegExp(`\\b${varName}\\b`, 'g'));
              if (varUsage && varUsage.length <= 1) {
                issues.push(`Line ${index + 1}: Variable ${varName} may be unused`);
              }
            }
          }
          
          // Check line length
          if (line.length > 100) {
            issues.push(`Line ${index + 1}: Line too long (${line.length} characters)`);
          }
        });
        
        return issues;
      } catch (error) {
        return [`Lint error: ${error.message}`];
      }
    };
    
    const lintTestFile = `${workspace}/lint-test.js`;
    await Bun.write(lintFile, `
const unusedVariable = 'test';
const veryLongLineThatExceedsTheRecommendedLineLengthLimitAndShouldBeSplitIntoMultipleLines = 'this is too long';
console.info('Debug message');
export function test() {
  return true;
}
`);
    
    const lintIssues = await lintFile(lintTestFile);
    if (lintIssues.length > 0) {
      console.info('   ❌ Linting issues found:');
      lintIssues.forEach(issue => console.info(`      - ${issue}`));
    } else {
      console.info('   ✅ No linting issues');
    }
    
    // 4. Security scan
    console.info('\n4. 🛡️ Security Scan:');
    const securityScan = async (filePath) => {
      try {
        const content = await Bun.file(filePath).text();
        
        const issues = [];
        
        // Check for hardcoded secrets
        const secretPatterns = [
          /password\s*=\s*['"][^'"]+['"]/i,
          /api_key\s*=\s*['"][^'"]+['"]/i,
          /secret\s*=\s*['"][^'"]+['"]/i,
          /token\s*=\s*['"][^'"]+['"]/i
        ];
        
        secretPatterns.forEach((pattern, index) => {
          if (pattern.test(content)) {
            issues.push(`Potential hardcoded secret detected (pattern ${index + 1})`);
          }
        });
        
        // Check for unsafe eval
        if (content.includes('eval(')) {
          issues.push('Unsafe eval() usage detected');
        }
        
        // Check for unsafe innerHTML
        if (content.includes('innerHTML')) {
          issues.push('Potentially unsafe innerHTML usage');
        }
        
        return issues;
      } catch (error) {
        return [`Security scan error: ${error.message}`];
      }
    };
    
    const securityFile = `${workspace}/security-test.js`;
    await Bun.write(securityFile, `
const config = {
  password: 'hardcoded_password_123',
  api_key: 'sk-1234567890abcdef'
};

function processData(data) {
  const result = eval(data);
  document.getElementById('output').innerHTML = result;
  return result;
}
`);
    
    const securityIssues = await securityScan(securityFile);
    if (securityIssues.length > 0) {
      console.info('   ❌ Security issues found:');
      securityIssues.forEach(issue => console.info(`      - ${issue}`));
    } else {
      console.info('   ✅ No security issues');
    }
    
    // 5. Test execution
    console.info('\n5. 🧪 Test Execution:');
    const runTests = async () => {
      // Simulate test results
      const tests = [
        { name: 'User authentication', passed: true, duration: 120 },
        { name: 'Data validation', passed: true, duration: 85 },
        { name: 'API integration', passed: false, duration: 200, error: 'Connection timeout' },
        { name: 'Form submission', passed: true, duration: 95 }
      ];
      
      let passed = 0;
      let failed = 0;
      let totalDuration = 0;
      
      tests.forEach(test => {
        if (test.passed) {
          passed++;
          console.info(`   ✅ ${test.name} (${test.duration}ms)`);
        } else {
          failed++;
          console.info(`   ❌ ${test.name} (${test.duration}ms) - ${test.error || 'Failed'}`);
        }
        totalDuration += test.duration;
      });
      
      return { passed, failed, total: tests.length, duration: totalDuration };
    };
    
    const testResults = await runTests();
    console.info(`   📊 Test Summary: ${testResults.passed}/${testResults.total} passed (${testResults.duration}ms total)`);
    
    // 6. Build verification
    console.info('\n6. 🔨 Build Verification:');
    const verifyBuild = async () => {
      try {
        // Simulate build process
        console.info('   📦 Building project...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate build time
        
        // Check for critical files
        const requiredFiles = ['package.json', 'README.md'];
        const missingFiles = [];
        
        for (const file of requiredFiles) {
          if (!await Bun.file(file).exists()) {
            missingFiles.push(file);
          }
        }
        
        if (missingFiles.length > 0) {
          return { success: false, issues: [`Missing files: ${missingFiles.join(', ')}`] };
        }
        
        // Check package size (simulated)
        const packageSize = Math.random() * 1000000; // Random size in bytes
        const maxSize = 500000; // 500KB limit
        
        if (packageSize > maxSize) {
          return { 
            success: false, 
            issues: [`Package too large: ${Math.round(packageSize / 1024)}KB (limit: ${maxSize / 1024}KB)`] 
          };
        }
        
        return { success: true, size: packageSize };
      } catch (error) {
        return { success: false, issues: [`Build error: ${error.message}`] };
      }
    };
    
    const buildResult = await verifyBuild();
    if (buildResult.success) {
      console.info(`   ✅ Build successful (${Math.round(buildResult.size / 1024)}KB)`);
    } else {
      console.info('   ❌ Build failed:');
      buildResult.issues.forEach(issue => console.info(`      - ${issue}`));
    }
    
    // 7. Generate commit message
    console.info('\n7. 📝 Generate Commit Message:');
    const generateCommitMessage = () => {
      const changes = [
        'feat: add user authentication system',
        'fix: resolve data validation issues',
        'docs: update API documentation',
        'refactor: improve code structure'
      ];
      
      const selectedChanges = changes.slice(0, 2); // Simulate selecting some changes
      const commitMessage = selectedChanges.join('\n');
      
      console.info('   📋 Suggested commit message:');
      console.info('   ──────────────────────────');
      console.info(`   ${commitMessage}`);
      console.info('   ──────────────────────────');
      
      return commitMessage;
    };
    
    const commitMessage = generateCommitMessage();
    
    // 8. Summary
    console.info('\n8. 📊 Pre-commit Summary:');
    const summary = {
      formatting: formattingIssues.length === 0,
      types: typeIssues.length === 0,
      linting: lintIssues.length === 0,
      security: securityIssues.length === 0,
      tests: testResults.failed === 0,
      build: buildResult.success
    };
    
    const passed = Object.values(summary).filter(Boolean).length;
    const total = Object.keys(summary).length;
    
    console.info(`   ✅ Passed: ${passed}/${total} checks`);
    
    if (passed === total) {
      console.info('   🎉 All checks passed! Ready to commit.');
    } else {
      console.info('   ⚠️  Some checks failed. Please fix issues before committing.');
    }
    
    // Cleanup
    await Bun.spawn(['rm', '-rf', workspace]).exited;
    console.info('\n🧹 Workspace cleaned up');
    
  } catch (error) {
    console.info(`❌ Workflow error: ${error.message}`);
  }
  
  console.info('\n✅ Pre-commit workflow demo completed!');
  console.info('\n💡 Pre-commit hooks typically include:');
  console.info('   • Code formatting (Prettier, ESLint)');
  console.info('   • Type checking (TypeScript, Flow)');
  console.info('   • Linting (ESLint, Stylelint)');
  console.info('   • Security scanning (npm audit, Snyk)');
  console.info('   • Test execution');
  console.info('   • Build verification');
  console.info('   • Custom validation rules');
}

if (import.meta.main) {
  demoPreCommitWorkflow();
}
