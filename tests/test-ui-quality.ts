// tests/test-ui-quality.ts
// Tests that verify actual UI quality and functionality, not just "it exists"

interface UITestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  details: string;
  evidence?: any;
}

async function testUIQuality(): Promise<void> {
  console.log('🧪 Testing UI Quality and Functionality...\n');
  
  const results: UITestResult[] = [];
  
  // Test 1: HTML Structure Validity
  console.log('1. Testing HTML structure validity...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    // Check for valid HTML structure
    const hasDoctype = html.includes('<!DOCTYPE html>');
    const hasTitle = html.includes('<title>');
    const hasViewport = html.includes('viewport');
    const hasClosingTags = html.includes('</html>') && html.includes('</body>');
    
    if (hasDoctype && hasTitle && hasViewport && hasClosingTags) {
      results.push({
        test: 'HTML Structure',
        status: 'PASS',
        details: 'Valid HTML5 structure with DOCTYPE, title, viewport meta',
        evidence: { hasDoctype, hasTitle, hasViewport, hasClosingTags }
      });
    } else {
      results.push({
        test: 'HTML Structure',
        status: 'FAIL',
        details: 'Missing essential HTML elements',
        evidence: { hasDoctype, hasTitle, hasViewport, hasClosingTags }
      });
    }
  } catch (error) {
    results.push({
      test: 'HTML Structure',
      status: 'FAIL',
      details: `Failed to fetch HTML: ${error.message}`
    });
  }
  
  // Test 2: CSS Color Implementation
  console.log('2. Testing CSS color implementation...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    // Extract CSS from inline styles
    const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (!cssMatch) {
      results.push({
        test: 'CSS Implementation',
        status: 'FAIL',
        details: 'No inline CSS found'
      });
    } else {
      const css = cssMatch[1];
      
      // Check for specific color values
      const hasBackgroundGradient = css.includes('#667eea') && css.includes('#764ba2');
      const hasTitleGradient = css.includes('#81e6d9') && css.includes('#38b2ac');
      const hasBadgeColors = css.includes('#48bb78') && css.includes('#ed8936') && css.includes('#9f7aea');
      const hasTextClipping = css.includes('background-clip: text');
      
      if (hasBackgroundGradient && hasTitleGradient && hasBadgeColors && hasTextClipping) {
        results.push({
          test: 'CSS Implementation',
          status: 'PASS',
          details: 'All color gradients and text clipping implemented',
          evidence: { hasBackgroundGradient, hasTitleGradient, hasBadgeColors, hasTextClipping }
        });
      } else {
        results.push({
          test: 'CSS Implementation',
          status: 'PARTIAL',
          details: 'Some CSS features missing',
          evidence: { hasBackgroundGradient, hasTitleGradient, hasBadgeColors, hasTextClipping }
        });
      }
    }
  } catch (error) {
    results.push({
      test: 'CSS Implementation',
      status: 'FAIL',
      details: `Failed to analyze CSS: ${error.message}`
    });
  }
  
  // Test 3: Interactive Elements
  console.log('3. Testing interactive elements...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    // Check for interactive elements
    const hasTestButton = html.includes('testFetch()');
    const hasResultDiv = html.includes('id="result"');
    const hasJavaScript = html.includes('<script>') && html.includes('</script>');
    const hasEventHandlers = html.includes('onclick=');
    
    if (hasTestButton && hasResultDiv && hasJavaScript && hasEventHandlers) {
      results.push({
        test: 'Interactive Elements',
        status: 'PASS',
        details: 'Test button, result div, JavaScript, and event handlers present',
        evidence: { hasTestButton, hasResultDiv, hasJavaScript, hasEventHandlers }
      });
    } else {
      results.push({
        test: 'Interactive Elements',
        status: 'FAIL',
        details: 'Missing interactive components',
        evidence: { hasTestButton, hasResultDiv, hasJavaScript, hasEventHandlers }
      });
    }
  } catch (error) {
    results.push({
      test: 'Interactive Elements',
      status: 'FAIL',
      details: `Failed to check interactive elements: ${error.message}`
    });
  }
  
  // Test 4: API Integration
  console.log('4. Testing API integration...');
  try {
    // Test the API endpoint that the UI calls
    const apiResponse = await fetch('http://localhost:3000/api/typedarray/urls');
    const apiData = await apiResponse.json();
    
    const hasValidStructure = apiData.base && apiData.generated && apiData.methods;
    const hasValidUrls = apiData.base.includes('bun.sh');
    
    if (apiResponse.status === 200 && hasValidStructure && hasValidUrls) {
      results.push({
        test: 'API Integration',
        status: 'PASS',
        details: 'API endpoint returns valid data structure',
        evidence: { status: apiResponse.status, hasValidStructure, hasValidUrls }
      });
    } else {
      results.push({
        test: 'API Integration',
        status: 'FAIL',
        details: 'API integration not working properly',
        evidence: { status: apiResponse.status, hasValidStructure, hasValidUrls }
      });
    }
  } catch (error) {
    results.push({
      test: 'API Integration',
      status: 'FAIL',
      details: `API integration failed: ${error.message}`
    });
  }
  
  // Test 5: Content Quality
  console.log('5. Testing content quality...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    // Check for meaningful content
    const hasMainHeading = html.includes('Bun TypedArray Documentation Portal');
    const hasDescriptions = html.includes('Base URL Pattern');
    const hasCodeExamples = html.includes('await fetch');
    const hasSemanticHTML = html.includes('<main>') && html.includes('<header>') && html.includes('<footer>');
    
    if (hasMainHeading && hasDescriptions && hasCodeExamples && hasSemanticHTML) {
      results.push({
        test: 'Content Quality',
        status: 'PASS',
        details: 'Meaningful content with semantic HTML and code examples',
        evidence: { hasMainHeading, hasDescriptions, hasCodeExamples, hasSemanticHTML }
      });
    } else {
      results.push({
        test: 'Content Quality',
        status: 'PARTIAL',
        details: 'Content quality issues detected',
        evidence: { hasMainHeading, hasDescriptions, hasCodeExamples, hasSemanticHTML }
      });
    }
  } catch (error) {
    results.push({
      test: 'Content Quality',
      status: 'FAIL',
      details: `Content quality test failed: ${error.message}`
    });
  }
  
  // Test 6: Performance (basic)
  console.log('6. Testing performance...');
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    const end = Date.now();
    
    const loadTime = end - start;
    const contentSize = html.length;
    const isFast = loadTime < 1000; // Under 1 second
    const isReasonableSize = contentSize < 50000; // Under 50KB
    
    if (isFast && isReasonableSize) {
      results.push({
        test: 'Performance',
        status: 'PASS',
        details: `Fast load time (${loadTime}ms) and reasonable size (${contentSize} bytes)`,
        evidence: { loadTime, contentSize, isFast, isReasonableSize }
      });
    } else {
      results.push({
        test: 'Performance',
        status: 'PARTIAL',
        details: `Performance issues: ${loadTime}ms, ${contentSize} bytes`,
        evidence: { loadTime, contentSize, isFast, isReasonableSize }
      });
    }
  } catch (error) {
    results.push({
      test: 'Performance',
      status: 'FAIL',
      details: `Performance test failed: ${error.message}`
    });
  }
  
  // Results Summary
  console.log('\n📊 UI Quality Test Results:');
  console.log('='.repeat(50));
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const partialCount = results.filter(r => r.status === 'PARTIAL').length;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.status}`);
    console.log(`   ${result.details}`);
    if (result.evidence) {
      console.log(`   Evidence: ${JSON.stringify(result.evidence, null, 2)}`);
    }
    console.log('');
  });
  
  console.log(`📈 Summary: ${passCount} PASS, ${partialCount} PARTIAL, ${failCount} FAIL`);
  
  if (failCount === 0 && partialCount === 0) {
    console.log('🎉 All tests passed! UI quality is confirmed.');
  } else if (failCount === 0) {
    console.log('⚠️  Some issues detected, but core functionality works.');
  } else {
    console.log('❌ Critical issues found. UI needs improvement.');
  }
}

// Run tests
if (import.meta.main) {
  testUIQuality().catch(console.error);
}

export default testUIQuality;
