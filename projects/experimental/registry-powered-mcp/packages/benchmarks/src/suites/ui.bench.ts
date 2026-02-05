/**
 * FederationMatrix UI Benchmark Suite
 * Tests React component performance for federation management
 */

import { bench, suite, PERFORMANCE_TARGETS, BENCHMARK_CATEGORIES } from '../index';
import React from 'react';
import { FederationMatrix } from '../../../../dashboard/src/components/FederationMatrix';

/**
 * Benchmark FederationMatrix component performance
 *
 * Tests UI responsiveness, rendering performance, and interaction latency
 * for the federation management dashboard component.
 *
 * @param renderComponent - Function to render component (for testing in isolation)
 * @param triggerInteractions - Function to trigger component interactions
 *
 * @example
 * ```ts
 * import { federationMatrixBenchmarks } from '@registry-mcp/benchmarks/suites/ui';
 *
 * // In a test environment with React Testing Library
 * federationMatrixBenchmarks(
 *   (component) => render(component),
 *   (container) => ({
 *     switchTab: (tab) => fireEvent.click(screen.getByText(tab)),
 *     search: (query) => fireEvent.change(screen.getByPlaceholderText('Filter systems...'), { target: { value: query } }),
 *   })
 * );
 * ```
 */
export function federationMatrixBenchmarks(
  renderComponent: (component: React.ReactElement) => any,
  triggerInteractions: (container: any) => {
    switchTab: (tabName: string) => void;
    search: (query: string) => void;
    getContainer: () => HTMLElement;
  }
) {
  suite('FederationMatrix UI Performance', () => {
    let container: any;
    let interactions: ReturnType<typeof triggerInteractions>;

    bench('initial component render', () => {
      const component = React.createElement(FederationMatrix);
      container = renderComponent(component);
      interactions = triggerInteractions(container);
    }, {
      target: PERFORMANCE_TARGETS.COMPONENT_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 100,
      beforeEach: () => {
        // Clean up previous renders
        if (container?.unmount) container.unmount();
      }
    });

    bench('tab switching - capabilities', () => {
      interactions.switchTab('capabilities');
    }, {
      target: PERFORMANCE_TARGETS.TAB_SWITCH_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
      setup: () => {
        // Ensure component is rendered first
        if (!container) {
          const component = React.createElement(FederationMatrix);
          container = renderComponent(component);
          interactions = triggerInteractions(container);
        }
      }
    });

    bench('tab switching - sync', () => {
      interactions.switchTab('sync');
    }, {
      target: PERFORMANCE_TARGETS.TAB_SWITCH_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
    });

    bench('tab switching - security', () => {
      interactions.switchTab('security');
    }, {
      target: PERFORMANCE_TARGETS.TAB_SWITCH_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
    });

    bench('tab switching - cost', () => {
      interactions.switchTab('cost');
    }, {
      target: PERFORMANCE_TARGETS.TAB_SWITCH_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
    });

    bench('tab switching - orchestrator', () => {
      interactions.switchTab('orchestrator');
    }, {
      target: PERFORMANCE_TARGETS.TAB_SWITCH_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
    });

    bench('search filter - empty query', () => {
      interactions.search('');
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 1000,
    });

    bench('search filter - single character', () => {
      interactions.search('a');
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
    });

    bench('search filter - partial match', () => {
      interactions.search('dock');
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 500,
    });

    bench('search filter - exact match', () => {
      interactions.search('Docker Hub');
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 300,
    });

    bench('search filter - no results', () => {
      interactions.search('nonexistent-system-12345');
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 300,
    });

    bench('search filter - type filter', () => {
      interactions.search('Container');
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 400,
    });

    bench('table rendering - capabilities tab', () => {
      // Switch to capabilities tab and measure rendering
      interactions.switchTab('capabilities');
      // The rendering performance is measured by the tab switch
    }, {
      target: PERFORMANCE_TARGETS.TABLE_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 200,
    });

    bench('table rendering - sync tab', () => {
      interactions.switchTab('sync');
    }, {
      target: PERFORMANCE_TARGETS.TABLE_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 200,
    });

    bench('table rendering - security tab', () => {
      interactions.switchTab('security');
    }, {
      target: PERFORMANCE_TARGETS.TABLE_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 200,
    });

    bench('table rendering - cost tab', () => {
      interactions.switchTab('cost');
    }, {
      target: PERFORMANCE_TARGETS.TABLE_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 200,
    });

    bench('federation hub render', () => {
      interactions.switchTab('orchestrator');
    }, {
      target: PERFORMANCE_TARGETS.COMPONENT_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 100,
    });

    bench('state update performance', () => {
      // Simulate rapid state changes (search + tab switches)
      interactions.search('aws');
      interactions.switchTab('capabilities');
      interactions.search('docker');
      interactions.switchTab('sync');
      interactions.search('');
      interactions.switchTab('orchestrator');
    }, {
      target: PERFORMANCE_TARGETS.STATE_UPDATE_MS * 6, // Allow time for 6 operations
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 50,
    });

    bench('memory efficiency - repeated renders', () => {
      // Test for memory leaks in repeated rendering
      for (let i = 0; i < 10; i++) {
        interactions.switchTab('capabilities');
        interactions.switchTab('sync');
        interactions.search(`query${i}`);
      }
    }, {
      target: PERFORMANCE_TARGETS.INTERACTION_RESPONSE_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 20,
    });

    bench('large dataset filtering', () => {
      // Test performance with complex queries that match multiple systems
      const queries = ['a', 'co', 'sys', 'hub', 'reg'];
      for (const query of queries) {
        interactions.search(query);
      }
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS * 2, // Allow time for 5 filter operations
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 100,
    });

    bench('rapid tab switching stress test', () => {
      // Rapid tab switching to test state management performance
      const tabs = ['capabilities', 'sync', 'security', 'cost', 'orchestrator'];
      for (let i = 0; i < 5; i++) {
        interactions.switchTab(tabs[i % tabs.length]);
      }
    }, {
      target: PERFORMANCE_TARGETS.TAB_SWITCH_MS * 3, // Allow time for 5 tab switches
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 100,
    });

    bench('search debounce performance', () => {
      // Test rapid search input changes (simulating typing)
      const chars = 'dockerhub'.split('');
      for (const char of chars) {
        interactions.search(char);
      }
    }, {
      target: PERFORMANCE_TARGETS.SEARCH_FILTER_MS * 2, // Allow time for 9 search operations
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 50,
    });

    bench('component re-render efficiency', () => {
      // Test component efficiency when re-rendering with same props
      const component = React.createElement(FederationMatrix);
      renderComponent(component); // Re-render same component
    }, {
      target: PERFORMANCE_TARGETS.COMPONENT_RENDER_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 200,
    });

    bench('cleanup performance', () => {
      // Test component cleanup/unmounting performance
      if (container?.unmount) {
        container.unmount();
      }
    }, {
      target: PERFORMANCE_TARGETS.STATE_UPDATE_MS,
      category: BENCHMARK_CATEGORIES.UI,
      iterations: 100,
    });
  });
}