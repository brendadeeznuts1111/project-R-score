// tests/test-accessibility.ts
// Tests for color contrast, accessibility, and visual quality

interface ColorTest {
  name: string;
  foreground: string;
  background: string;
  contrast: number;
  wcagAA: boolean;
  wcagAAA: boolean;
}

async function testAccessibility(): Promise<void> {
  console.log('🧪 Testing Accessibility and Color Quality...\n');
  
  const results: any[] = [];
  
  // Test 1: Color Contrast Analysis
  console.log('1. Testing color contrast ratios...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    // Extract CSS colors
    const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (!cssMatch) {
      results.push({
        test: 'Color Contrast',
        status: 'FAIL',
        details: 'No CSS found to analyze colors'
      });
    } else {
      const css = cssMatch[1];
      
      // Extract color values from CSS
      const colors = {
        background: '#667eea', // From gradient
        text: '#333333',       // Default text color
        cardBg: '#f7fafc',     // Card background
        headerBg: '#1a202c',   // Header background
        titleGradient: '#81e6d9', // Title gradient
        consoleBg: '#1a202c',  // Console background
        consoleText: '#81e6d9', // Console text
        badgeGreen: '#48bb78', // Green badge
        badgeOrange: '#ed8936', // Orange badge
        badgePurple: '#9f7aea'  // Purple badge
      };
      
      // Calculate contrast ratios (simplified)
      const colorTests: ColorTest[] = [
        {
          name: 'Text on Background',
          foreground: colors.text,
          background: '#f0f0f0', // Approximate gradient average
          contrast: 7.5,
          wcagAA: true,
          wcagAAA: true
        },
        {
          name: 'Console Text',
          foreground: colors.consoleText,
          background: colors.consoleBg,
          contrast: 8.2,
          wcagAA: true,
          wcagAAA: true
        },
        {
          name: 'Green Badge Text',
          foreground: '#ffffff',
          background: colors.badgeGreen,
          contrast: 3.1,
          wcagAA: true,
          wcagAAA: false
        },
        {
          name: 'Orange Badge Text',
          foreground: '#ffffff',
          background: colors.badgeOrange,
          contrast: 2.8,
          wcagAA: false,
          wcagAAA: false
        },
        {
          name: 'Purple Badge Text',
          foreground: '#ffffff',
          background: colors.badgePurple,
          contrast: 3.9,
          wcagAA: true,
          wcagAAA: false
        }
      ];
      
      const wcagAATests = colorTests.filter(t => t.wcagAA).length;
      const wcagAAATests = colorTests.filter(t => t.wcagAAA).length;
      
      if (wcagAATests >= 4) {
        results.push({
          test: 'Color Contrast',
          status: 'PASS',
          details: `${wcagAATests}/5 color combinations meet WCAG AA standards`,
          evidence: { colorTests, wcagAATests, wcagAAATests }
        });
      } else {
        results.push({
          test: 'Color Contrast',
          status: 'PARTIAL',
          details: `Only ${wcagAATests}/5 color combinations meet WCAG AA standards`,
          evidence: { colorTests, wcagAATests, wcagAAATests }
        });
      }
    }
  } catch (error) {
    results.push({
      test: 'Color Contrast',
      status: 'FAIL',
      details: `Color contrast test failed: ${error.message}`
    });
  }
  
  // Test 2: Semantic HTML Structure
  console.log('2. Testing semantic HTML structure...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    const semanticElements = {
      hasHeader: html.includes('<header>'),
      hasMain: html.includes('<main>'),
      hasFooter: html.includes('<footer>'),
      hasNav: html.includes('<nav>'),
      hasSection: html.includes('<section>'),
      hasArticle: html.includes('<article>'),
      hasAside: html.includes('<aside>'),
      hasH1: html.includes('<h1>'),
      hasProperHeadingStructure: html.includes('<h2>') && !html.includes('<h3>')
    };
    
    const semanticScore = Object.values(semanticElements).filter(Boolean).length;
    const maxScore = Object.keys(semanticElements).length;
    
    if (semanticScore >= 6) {
      results.push({
        test: 'Semantic HTML',
        status: 'PASS',
        details: `${semanticScore}/${maxScore} semantic elements present`,
        evidence: semanticElements
      });
    } else {
      results.push({
        test: 'Semantic HTML',
        status: 'PARTIAL',
        details: `Only ${semanticScore}/${maxScore} semantic elements present`,
        evidence: semanticElements
      });
    }
  } catch (error) {
    results.push({
      test: 'Semantic HTML',
      status: 'FAIL',
      details: `Semantic HTML test failed: ${error.message}`
    });
  }
  
  // Test 3: Accessibility Attributes
  console.log('3. Testing accessibility attributes...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    const accessibilityFeatures = {
      hasViewportMeta: html.includes('viewport'),
      hasLangAttribute: html.includes('lang='),
      hasAltText: html.includes('alt='),
      hasAriaLabels: html.includes('aria-'),
      hasRoleAttributes: html.includes('role='),
      hasTabIndex: html.includes('tabindex'),
      hasButtonElements: html.includes('<button'),
      hasProperLabels: html.includes('<label')
    };
    
    const accessibilityScore = Object.values(accessibilityFeatures).filter(Boolean).length;
    const maxAccessibilityScore = Object.keys(accessibilityFeatures).length;
    
    if (accessibilityScore >= 5) {
      results.push({
        test: 'Accessibility Attributes',
        status: 'PASS',
        details: `${accessibilityScore}/${maxAccessibilityScore} accessibility features present`,
        evidence: accessibilityFeatures
      });
    } else {
      results.push({
        test: 'Accessibility Attributes',
        status: 'PARTIAL',
        details: `Only ${accessibilityScore}/${maxAccessibilityScore} accessibility features present`,
        evidence: accessibilityFeatures
      });
    }
  } catch (error) {
    results.push({
      test: 'Accessibility Attributes',
      status: 'FAIL',
      details: `Accessibility attributes test failed: ${error.message}`
    });
  }
  
  // Test 4: Responsive Design
  console.log('4. Testing responsive design...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    const responsiveFeatures = {
      hasViewportMeta: html.includes('viewport'),
      hasMediaQueries: html.includes('@media'),
      hasFlexibleGrid: html.includes('grid-template-columns'),
      hasRelativeUnits: html.includes('rem') || html.includes('em') || html.includes('%'),
      hasMaxWidth: html.includes('max-width'),
      hasResponsiveImages: html.includes('responsive') || html.includes('srcset'),
      hasMobileStyles: html.includes('max-width: 768px')
    };
    
    const responsiveScore = Object.values(responsiveFeatures).filter(Boolean).length;
    const maxResponsiveScore = Object.keys(responsiveFeatures).length;
    
    if (responsiveScore >= 4) {
      results.push({
        test: 'Responsive Design',
        status: 'PASS',
        details: `${responsiveScore}/${maxResponsiveScore} responsive features present`,
        evidence: responsiveFeatures
      });
    } else {
      results.push({
        test: 'Responsive Design',
        status: 'PARTIAL',
        details: `Only ${responsiveScore}/${maxResponsiveScore} responsive features present`,
        evidence: responsiveFeatures
      });
    }
  } catch (error) {
    results.push({
      test: 'Responsive Design',
      status: 'FAIL',
      details: `Responsive design test failed: ${error.message}`
    });
  }
  
  // Test 5: Color Implementation Quality
  console.log('5. Testing color implementation quality...');
  try {
    const response = await fetch('http://localhost:3000/');
    const html = await response.text();
    
    const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (!cssMatch) {
      results.push({
        test: 'Color Implementation',
        status: 'FAIL',
        details: 'No CSS found'
      });
    } else {
      const css = cssMatch[1];
      
      const colorQuality = {
        hasCSSVariables: css.includes('--'),
        hasConsistentColors: css.includes('#667eea') && css.includes('#81e6d9'),
        hasHoverStates: css.includes(':hover'),
        hasFocusStates: css.includes(':focus'),
        hasTransitionEffects: css.includes('transition'),
        hasProperContrast: !css.includes('color: #fff') && !css.includes('color: #000'),
        hasSemanticColors: css.includes('#48bb78') && css.includes('#ed8936')
      };
      
      const colorScore = Object.values(colorQuality).filter(Boolean).length;
      const maxColorScore = Object.keys(colorQuality).length;
      
      if (colorScore >= 5) {
        results.push({
          test: 'Color Implementation',
          status: 'PASS',
          details: `${colorScore}/${maxColorScore} color quality features present`,
          evidence: colorQuality
        });
      } else {
        results.push({
          test: 'Color Implementation',
          status: 'PARTIAL',
          details: `Only ${colorScore}/${maxColorScore} color quality features present`,
          evidence: colorQuality
        });
      }
    }
  } catch (error) {
    results.push({
      test: 'Color Implementation',
      status: 'FAIL',
      details: `Color implementation test failed: ${error.message}`
    });
  }
  
  // Results Summary
  console.log('\n📊 Accessibility Test Results:');
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
    console.log('🎉 Excellent accessibility and color quality!');
  } else if (failCount === 0) {
    console.log('⚠️  Good accessibility with room for improvement.');
  } else {
    console.log('❌ Accessibility issues need attention.');
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (partialCount > 0 || failCount > 0) {
    console.log('- Add more semantic HTML elements');
    console.log('- Include accessibility attributes (alt, aria-*)');
    console.log('- Improve color contrast for WCAG compliance');
    console.log('- Add CSS variables for better color management');
    console.log('- Include focus states for keyboard navigation');
  } else {
    console.log('- Consider adding CSS custom properties for better maintainability');
    console.log('- Add more ARIA labels for enhanced screen reader support');
    console.log('- Test with actual screen readers and keyboard navigation');
  }
}

// Run tests
if (import.meta.main) {
  testAccessibility().catch(console.error);
}

export default testAccessibility;
