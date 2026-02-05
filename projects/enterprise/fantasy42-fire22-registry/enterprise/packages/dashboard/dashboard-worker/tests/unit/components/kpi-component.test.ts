/**
 * 🧪 Fire22 KPI Component Tests
 * Comprehensive testing for the KPI component system
 */

import {
  KPIComponent,
  createKPICard,
  createPendingAmountKPI,
  createTotalAgentsKPI,
  createActiveAgentsKPI,
  createPendingWagersKPI,
  KPIStyles,
} from '../../../src/components/kpi-component.ts';

/**
 * 🧪 Test Suite for KPI Component
 */
export class KPIComponentTestSuite {
  private testResults: Array<{ test: string; passed: boolean; message: string }> = [];
  private testContainer: HTMLElement;

  constructor() {
    this.testContainer = this.createTestContainer();
    this.injectStyles();
  }

  /**
   * 🎨 Create test container
   */
  private createTestContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'kpi-test-container';
    container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            font-family: monospace;
            font-size: 0.8rem;
            overflow-y: auto;
            z-index: 10000;
            border: 2px solid #fdbb2d;
        `;

    document.body.appendChild(container);
    return container;
  }

  /**
   * 🎨 Inject KPI styles
   */
  private injectStyles(): void {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = KPIStyles;
    document.head.appendChild(styleSheet);
  }

  /**
   * ✅ Add test result
   */
  private addResult(test: string, passed: boolean, message: string = ''): void {
    this.testResults.push({ test, passed, message });
    this.updateDisplay();
  }

  /**
   * 📊 Update test display
   */
  private updateDisplay(): void {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;

    this.testContainer.innerHTML = `
            <h3 style="color: #fdbb2d; margin: 0 0 1rem 0;">🧪 KPI Component Tests</h3>
            <div style="margin-bottom: 1rem;">
                <span style="color: ${passed === total ? '#10b981' : '#f59e0b'}">
                    ${passed}/${total} Tests Passed
                </span>
            </div>
            ${this.testResults
              .map(
                result => `
                <div style="margin-bottom: 0.5rem; padding: 0.25rem; border-radius: 0.25rem; background: ${result.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}">
                    <span style="color: ${result.passed ? '#10b981' : '#ef4444'}">
                        ${result.passed ? '✅' : '❌'}
                    </span>
                    <span style="color: white;">${result.test}</span>
                    ${result.message ? `<br><span style="color: #94a3b8; font-size: 0.7rem;">${result.message}</span>` : ''}
                </div>
            `
              )
              .join('')}
        `;
  }

  /**
   * 🚀 Run all tests
   */
  public async runAllTests(): Promise<void> {
    console.log('🧪 Starting KPI Component Tests...');

    // Basic functionality tests
    this.testBasicCreation();
    this.testPrebuiltKPIs();
    this.testConfigurationOptions();
    this.testValueUpdates();
    this.testEventHandling();
    this.testStyling();
    this.testResponsiveness();
    this.testIntegration();

    // Performance tests
    await this.testPerformance();

    // Cleanup tests
    this.testCleanup();

    console.log('🧪 All tests completed!');
    this.logResults();
  }

  /**
   * 🧪 Test basic KPI creation
   */
  private testBasicCreation(): void {
    try {
      const kpi = new KPIComponent({
        label: 'Test KPI',
        value: 100,
      });

      const element = kpi.render();

      // Verify element creation
      if (!(element instanceof HTMLElement)) {
        this.addResult('Basic Creation', false, 'Element not created');
        return;
      }

      // Verify CSS classes
      if (!element.classList.contains('kpi-card')) {
        this.addResult('Basic Creation', false, 'Missing kpi-card class');
        return;
      }

      // Verify content
      const label = element.querySelector('.kpi-label');
      const value = element.querySelector('.kpi-value');

      if (!label || label.textContent !== 'Test KPI') {
        this.addResult('Basic Creation', false, 'Label not found or incorrect');
        return;
      }

      if (!value || value.textContent !== '100') {
        this.addResult('Basic Creation', false, 'Value not found or incorrect');
        return;
      }

      this.addResult('Basic Creation', true);
    } catch (error) {
      this.addResult('Basic Creation', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test pre-built KPI components
   */
  private testPrebuiltKPIs(): void {
    try {
      const pendingAmount = createPendingAmountKPI(125000);
      const totalAgents = createTotalAgentsKPI(42);
      const activeAgents = createActiveAgentsKPI(38);
      const pendingWagers = createPendingWagersKPI(156);

      // Verify all elements are created
      const elements = [pendingAmount, totalAgents, activeAgents, pendingWagers];
      const allValid = elements.every(el => el instanceof HTMLElement);

      if (!allValid) {
        this.addResult('Pre-built KPIs', false, 'Some elements not created');
        return;
      }

      // Verify specific content
      const pendingAmountLabel = pendingAmount.querySelector('.kpi-label');
      if (pendingAmountLabel?.textContent !== 'Pending Amount') {
        this.addResult('Pre-built KPIs', false, 'Pending Amount label incorrect');
        return;
      }

      this.addResult('Pre-built KPIs', true);
    } catch (error) {
      this.addResult('Pre-built KPIs', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test configuration options
   */
  private testConfigurationOptions(): void {
    try {
      const kpi = new KPIComponent({
        label: 'Config Test',
        value: 50,
        format: 'percentage',
        color: 'success',
        size: 'large',
        icon: '🎯',
        trend: 'up',
        trendValue: '+10%',
      });

      const element = kpi.render();

      // Verify size class
      if (!element.classList.contains('kpi-large')) {
        this.addResult('Configuration Options', false, 'Size class not applied');
        return;
      }

      // Verify color class
      if (!element.classList.contains('kpi-success')) {
        this.addResult('Configuration Options', false, 'Color class not applied');
        return;
      }

      // Verify icon
      const icon = element.querySelector('.kpi-icon');
      if (!icon || icon.textContent !== '🎯') {
        this.addResult('Configuration Options', false, 'Icon not found or incorrect');
        return;
      }

      // Verify trend
      const trend = element.querySelector('.kpi-trend');
      if (!trend || !trend.textContent?.includes('↗️')) {
        this.addResult('Configuration Options', false, 'Trend indicator not found or incorrect');
        return;
      }

      this.addResult('Configuration Options', true);
    } catch (error) {
      this.addResult('Configuration Options', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test value updates
   */
  private testValueUpdates(): void {
    try {
      const kpi = new KPIComponent({
        label: 'Update Test',
        value: 100,
      });

      const element = kpi.render();

      // Test setValue
      kpi.setValue(200);
      const value = element.querySelector('.kpi-value');
      if (value?.textContent !== '200') {
        this.addResult('Value Updates', false, 'setValue not working');
        return;
      }

      // Test update method
      kpi.update({ value: 300, color: 'warning' });
      if (value?.textContent !== '300') {
        this.addResult('Value Updates', false, 'update method not working');
        return;
      }

      if (!element.classList.contains('kpi-warning')) {
        this.addResult('Value Updates', false, 'update color not working');
        return;
      }

      this.addResult('Value Updates', true);
    } catch (error) {
      this.addResult('Value Updates', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test event handling
   */
  private testEventHandling(): void {
    try {
      let clicked = false;

      const kpi = new KPIComponent({
        label: 'Click Test',
        value: 'Click Me',
        clickable: true,
        onClick: () => {
          clicked = true;
        },
      });

      const element = kpi.render();

      // Verify clickable class
      if (!element.classList.contains('kpi-clickable')) {
        this.addResult('Event Handling', false, 'Clickable class not applied');
        return;
      }

      // Simulate click
      element.click();

      if (!clicked) {
        this.addResult('Event Handling', false, 'Click event not triggered');
        return;
      }

      this.addResult('Event Handling', true);
    } catch (error) {
      this.addResult('Event Handling', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test styling
   */
  private testStyling(): void {
    try {
      const kpi = new KPIComponent({
        label: 'Style Test',
        value: 100,
      });

      const element = kpi.render();

      // Verify basic styling
      const computedStyle = window.getComputedStyle(element);

      if (computedStyle.borderRadius !== '16px') {
        this.addResult('Styling', false, 'Border radius not applied');
        return;
      }

      if (computedStyle.textAlign !== 'center') {
        this.addResult('Styling', false, 'Text alignment not applied');
        return;
      }

      this.addResult('Styling', true);
    } catch (error) {
      this.addResult('Styling', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test responsiveness
   */
  private testResponsiveness(): void {
    try {
      const kpi = new KPIComponent({
        label: 'Responsive Test',
        value: 100,
        size: 'small',
      });

      const element = kpi.render();

      // Verify size-specific styling
      if (!element.classList.contains('kpi-small')) {
        this.addResult('Responsiveness', false, 'Size class not applied');
        return;
      }

      this.addResult('Responsiveness', true);
    } catch (error) {
      this.addResult('Responsiveness', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test integration
   */
  private testIntegration(): void {
    try {
      // Test createKPICard helper
      const kpi = createKPICard({
        label: 'Integration Test',
        value: 500,
        format: 'currency',
      });

      if (!(kpi instanceof HTMLElement)) {
        this.addResult('Integration', false, 'createKPICard not working');
        return;
      }

      // Test multiple KPIs in a grid
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;';

      const kpi1 = createKPICard({ label: 'KPI 1', value: 100 });
      const kpi2 = createKPICard({ label: 'KPI 2', value: 200 });

      grid.appendChild(kpi1);
      grid.appendChild(kpi2);

      if (grid.children.length !== 2) {
        this.addResult('Integration', false, 'Grid integration not working');
        return;
      }

      this.addResult('Integration', true);
    } catch (error) {
      this.addResult('Integration', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test performance
   */
  private async testPerformance(): Promise<void> {
    try {
      const startTime = performance.now();

      // Create multiple KPIs
      const kpis: KPIComponent[] = [];
      for (let i = 0; i < 100; i++) {
        kpis.push(
          new KPIComponent({
            label: `Performance Test ${i}`,
            value: i,
          })
        );
      }

      const creationTime = performance.now() - startTime;

      // Test render performance
      const renderStart = performance.now();
      kpis.forEach(kpi => kpi.render());
      const renderTime = performance.now() - renderStart;

      // Performance thresholds (adjust as needed)
      if (creationTime > 100) {
        this.addResult('Performance', false, `Creation too slow: ${creationTime.toFixed(2)}ms`);
        return;
      }

      if (renderTime > 50) {
        this.addResult('Performance', false, `Rendering too slow: ${renderTime.toFixed(2)}ms`);
        return;
      }

      this.addResult(
        'Performance',
        true,
        `Creation: ${creationTime.toFixed(2)}ms, Render: ${renderTime.toFixed(2)}ms`
      );

      // Cleanup
      kpis.forEach(kpi => kpi.destroy());
    } catch (error) {
      this.addResult('Performance', false, `Error: ${error}`);
    }
  }

  /**
   * 🧪 Test cleanup
   */
  private testCleanup(): void {
    try {
      const kpi = new KPIComponent({
        label: 'Cleanup Test',
        value: 100,
      });

      const element = kpi.render();
      document.body.appendChild(element);

      // Verify element is in DOM
      if (!document.body.contains(element)) {
        this.addResult('Cleanup', false, 'Element not in DOM');
        return;
      }

      // Test destroy
      kpi.destroy();

      if (document.body.contains(element)) {
        this.addResult('Cleanup', false, 'Element not removed from DOM');
        return;
      }

      this.addResult('Cleanup', true);
    } catch (error) {
      this.addResult('Cleanup', false, `Error: ${error}`);
    }
  }

  /**
   * 📊 Log test results
   */
  private logResults(): void {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;

    console.log(`\n🧪 KPI Component Test Results:`);
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed < total) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.test}: ${result.message}`);
        });
    }

    console.log(`\n🎯 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  }

  /**
   * 🧹 Cleanup test environment
   */
  public cleanup(): void {
    if (this.testContainer && this.testContainer.parentNode) {
      this.testContainer.parentNode.removeChild(this.testContainer);
    }
  }
}

/**
 * 🚀 Quick test runner
 */
export const runKPITests = (): void => {
  const testSuite = new KPIComponentTestSuite();
  testSuite.runAllTests();

  // Auto-cleanup after 30 seconds
  setTimeout(() => {
    testSuite.cleanup();
  }, 30000);
};

// 🚀 Export for easy testing
export default KPIComponentTestSuite;
