#!/usr/bin/env bun
// Test Suite for Line History Movement Tracker
// Comprehensive testing of movement tracking, pattern detection, and visualization

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import LineHistoryTracker from '../src/core/config/line-history-tracker.js';

describe('LineHistoryTracker', () => {
  let tracker: LineHistoryTracker;

  beforeEach(() => {
    tracker = new LineHistoryTracker(100); // Smaller history for testing
  });

  afterEach(() => {
    tracker.clearHistory();
  });

  describe('Basic Functionality', () => {
    it('should initialize with empty history', () => {
      const history = tracker.getAllLineHistories();
      expect(history.size).toBe(0);
    });

    it('should record line changes correctly', () => {
      const tick = tracker.recordLineChange(0, 100);
      
      expect(tick.line).toBe(0);
      expect(tick.value).toBe(100);
      expect(tick.previousValue).toBe(0);
      expect(tick.movement).toBe('up');
      expect(tick.magnitude).toBe(100);
      expect(tick.velocity).toBeGreaterThan(0);
    });

    it('should track movement directions correctly', () => {
      // Up movement
      let tick = tracker.recordLineChange(0, 50);
      expect(tick.movement).toBe('up');
      
      // Down movement
      tick = tracker.recordLineChange(0, 25);
      expect(tick.movement).toBe('down');
      
      // Same value
      tick = tracker.recordLineChange(0, 25);
      expect(tick.movement).toBe('same');
    });

    it('should calculate magnitude correctly', () => {
      tracker.recordLineChange(0, 100);
      const tick = tracker.recordLineChange(0, 150);
      
      expect(tick.magnitude).toBe(50);
    });

    it('should maintain line history', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 150);
      tracker.recordLineChange(1, 200);
      
      const history = tracker.getLineHistory(0);
      expect(history).toBeDefined();
      expect(history!.ticks.length).toBe(2);
      expect(history!.currentValue).toBe(150);
      expect(history!.totalMovements).toBe(2);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate velocity correctly', () => {
      const startTime = Date.now();
      tracker.recordLineChange(0, 100);
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        const tick = tracker.recordLineChange(0, 150);
        expect(tick.velocity).toBeGreaterThan(0);
      }, 10);
    });

    it('should track peak velocity', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 200); // Big jump
      
      const history = tracker.getLineHistory(0);
      expect(history!.peakVelocity).toBeGreaterThan(0);
    });

    it('should calculate average velocity', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 150);
      tracker.recordLineChange(0, 175);
      
      const history = tracker.getLineHistory(0);
      expect(history!.averageVelocity).toBeGreaterThan(0);
    });
  });

  describe('Trend Detection', () => {
    it('should detect rising trend', () => {
      // Create rising pattern
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 120);
      tracker.recordLineChange(0, 140);
      tracker.recordLineChange(0, 160);
      tracker.recordLineChange(0, 180);
      
      const history = tracker.getLineHistory(0);
      expect(history!.trend).toBe('rising');
    });

    it('should detect falling trend', () => {
      // Create falling pattern
      tracker.recordLineChange(0, 200);
      tracker.recordLineChange(0, 180);
      tracker.recordLineChange(0, 160);
      tracker.recordLineChange(0, 140);
      tracker.recordLineChange(0, 120);
      
      const history = tracker.getLineHistory(0);
      expect(history!.trend).toBe('falling');
    });

    it('should detect stable trend', () => {
      // Create stable pattern
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 105);
      tracker.recordLineChange(0, 95);
      tracker.recordLineChange(0, 102);
      tracker.recordLineChange(0, 98);
      
      const history = tracker.getLineHistory(0);
      expect(history!.trend).toBe('stable');
    });
  });

  describe('Movement Visualization', () => {
    it('should generate movement visualization', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(1, 200);
      tracker.recordLineChange(0, 150);
      
      const visualization = tracker.getMovementVisualization();
      
      expect(visualization.timeline.length).toBe(3);
      expect(visualization.heatmap.size).toBe(2);
      expect(visualization.summary.totalTicks).toBe(3);
      expect(visualization.summary.totalMovements).toBeGreaterThan(0);
    });

    it('should calculate movement summary correctly', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 200);
      tracker.recordLineChange(1, 150);
      tracker.recordLineChange(1, 50);
      
      const summary = tracker.getMovementVisualization().summary;
      
      expect(summary.totalTicks).toBe(4);
      expect(summary.totalMovements).toBe(4);
      expect(summary.averageMagnitude).toBeGreaterThan(0);
      expect(summary.peakMagnitude).toBeGreaterThan(0);
      expect(summary.mostActiveLine).toBe(0); // Line 0 has more movements
    });

    it('should build heatmap correctly', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 200);
      tracker.recordLineChange(1, 150);
      
      const heatmap = tracker.getMovementVisualization().heatmap;
      
      expect(heatmap.has(0)).toBe(true);
      expect(heatmap.has(1)).toBe(true);
      expect(heatmap.get(0)).toBeGreaterThan(heatmap.get(1)!); // Line 0 has more intensity
    });
  });

  describe('Pattern Detection', () => {
    it('should detect spike patterns', () => {
      // Create spike pattern
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 200); // Spike
      tracker.recordLineChange(0, 105);
      
      const patterns = tracker.getMovementVisualization().patterns;
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.type === 'spike')).toBe(true);
    });

    it('should detect gradual changes', () => {
      // Create gradual pattern
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 120);
      tracker.recordLineChange(0, 140);
      tracker.recordLineChange(0, 160);
      tracker.recordLineChange(0, 180);
      
      const patterns = tracker.getMovementVisualization().patterns;
      
      expect(patterns.some(p => p.type === 'gradual')).toBe(true);
    });

    it('should detect oscillations', () => {
      // Create oscillation pattern
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 200);
      tracker.recordLineChange(0, 50);
      tracker.recordLineChange(0, 180);
      tracker.recordLineChange(0, 70);
      tracker.recordLineChange(0, 160);
      
      const patterns = tracker.getMovementVisualization().patterns;
      
      expect(patterns.some(p => p.type === 'oscillation')).toBe(true);
    });
  });

  describe('History Management', () => {
    it('should limit history size', () => {
      const smallTracker = new LineHistoryTracker(5);
      
      // Add more than the limit
      for (let i = 0; i < 10; i++) {
        smallTracker.recordLineChange(0, i * 10);
      }
      
      const history = smallTracker.getLineHistory(0);
      expect(history!.ticks.length).toBeLessThanOrEqual(5);
    });

    it('should clear history correctly', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(1, 200);
      
      tracker.clearHistory();
      
      const history = tracker.getAllLineHistories();
      expect(history.size).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance metrics', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(1, 200);
      
      const metrics = tracker.getPerformanceMetrics();
      
      expect(metrics.totalLines).toBe(2);
      expect(metrics.totalTicks).toBe(2);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Export/Import', () => {
    it('should export history correctly', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(1, 200);
      
      const exported = tracker.exportHistory();
      const data = JSON.parse(exported);
      
      expect(data.lines).toBeDefined();
      expect(data.lines.length).toBe(2);
      expect(data.startTime).toBeDefined();
      expect(data.lastUpdateTime).toBeDefined();
    });

    it('should import history correctly', () => {
      // Create original data
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(1, 200);
      const exported = tracker.exportHistory();
      
      // Clear and import
      tracker.clearHistory();
      tracker.importHistory(exported);
      
      const history = tracker.getAllLineHistories();
      expect(history.size).toBe(2);
      expect(history.get(0)?.currentValue).toBe(100);
      expect(history.get(1)?.currentValue).toBe(200);
    });

    it('should handle invalid import data', () => {
      expect(() => {
        tracker.importHistory('invalid json');
      }).toThrow('Invalid history data format');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero movements', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(0, 100); // Same value
      
      const summary = tracker.getMovementVisualization().summary;
      expect(summary.totalMovements).toBe(1); // Only the first movement counts
    });

    it('should handle maximum values', () => {
      tracker.recordLineChange(0, 0);
      tracker.recordLineChange(0, 255);
      
      const tick = tracker.getLineHistory(0)?.ticks[1];
      expect(tick?.magnitude).toBe(255);
    });

    it('should handle negative values correctly', () => {
      tracker.recordLineChange(0, -100);
      
      const tick = tracker.getLineHistory(0)?.ticks[0];
      expect(tick?.value).toBe(-100);
      expect(tick?.previousValue).toBe(0);
      expect(tick?.movement).toBe('down');
    });

    it('should handle rapid updates', () => {
      const rapidUpdates = 1000;
      
      for (let i = 0; i < rapidUpdates; i++) {
        tracker.recordLineChange(0, i % 256);
      }
      
      const history = tracker.getLineHistory(0);
      expect(history!.ticks.length).toBeLessThanOrEqual(100); // Limited by history size
      expect(history!.totalMovements).toBe(rapidUpdates);
    });
  });

  describe('Multi-line Tracking', () => {
    it('should track multiple lines independently', () => {
      tracker.recordLineChange(0, 100);
      tracker.recordLineChange(1, 200);
      tracker.recordLineChange(2, 300);
      
      const history0 = tracker.getLineHistory(0);
      const history1 = tracker.getLineHistory(1);
      const history2 = tracker.getLineHistory(2);
      
      expect(history0?.currentValue).toBe(100);
      expect(history1?.currentValue).toBe(200);
      expect(history2?.currentValue).toBe(300);
    });

    it('should identify most active line correctly', () => {
      // Line 0: 5 movements
      for (let i = 0; i < 5; i++) {
        tracker.recordLineChange(0, i * 10);
      }
      
      // Line 1: 3 movements
      for (let i = 0; i < 3; i++) {
        tracker.recordLineChange(1, i * 20);
      }
      
      const summary = tracker.getMovementVisualization().summary;
      expect(summary.mostActiveLine).toBe(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent updates', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              tracker.recordLineChange(i % 13, i * 2);
              resolve();
            }, Math.random() * 10);
          })
        );
      }
      
      await Promise.all(promises);
      
      const history = tracker.getAllLineHistories();
      expect(history.size).toBeGreaterThan(0);
    });
  });
});

describe('Movement Pattern Analysis', () => {
  let tracker: LineHistoryTracker;

  beforeEach(() => {
    tracker = new LineHistoryTracker();
  });

  it('should analyze spike intensity correctly', () => {
    // Create low intensity spike
    tracker.recordLineChange(0, 100);
    tracker.recordLineChange(0, 110); // Small spike
    tracker.recordLineChange(0, 105);
    
    const patterns = tracker.getMovementVisualization().patterns;
    const spikePattern = patterns.find(p => p.type === 'spike');
    
    if (spikePattern) {
      expect(spikePattern.intensity).toBeLessThan(50);
    }
  });

  it('should measure pattern confidence', () => {
    // Create clear pattern that should be detected
    tracker.recordLineChange(0, 50);   // Small magnitude
    tracker.recordLineChange(0, 200);  // Large spike
    tracker.recordLineChange(0, 60);   // Small magnitude
    
    const patterns = tracker.getMovementVisualization().patterns;
    
    expect(patterns.length).toBeGreaterThan(0);
    const pattern = patterns[0];
    expect(pattern.confidence).toBeGreaterThan(0);
    expect(pattern.confidence).toBeLessThanOrEqual(1);
  });

  it('should calculate movement frequency', () => {
    const startTime = Date.now();
    
    tracker.recordLineChange(0, 100);
    tracker.recordLineChange(0, 200);
    
    const endTime = Date.now();
    const timeSpan = (endTime - startTime) / 1000;
    
    const summary = tracker.getMovementVisualization().summary;
    expect(summary.movementFrequency).toBeGreaterThan(0);
  });
});
