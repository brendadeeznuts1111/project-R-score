/**
 * Enhanced Depth Configuration Hooks
 * React hooks for integrating depth optimization into components
 */

// @ts-ignore - React is optional for this module
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DepthOptimizer,
  AdaptiveDepthManager,
  DepthPerformanceAnalyzer,
  EnvironmentDepthConfig,
  type BenchmarkContext,
  type RecommendedDepth,
  type AdaptiveOptions
} from './depth-optimizer';
import {
  DepthConfigManager,
  DepthMetricsTracker
} from './depth-hooks-base';

/**
 * Hook for intelligent depth recommendation
 */
export function useDepthRecommendation(data: any, context: BenchmarkContext) {
  const [recommendation, setRecommendation] = useState<RecommendedDepth | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeData = useCallback(() => {
    setIsAnalyzing(true);
    try {
      const rec = DepthOptimizer.recommendDepth(data, context);
      setRecommendation(rec);
    } catch (error) {
      console.error('Depth analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [data, context]);

  useEffect(() => {
    if (data && context) {
      analyzeData();
    }
  }, [analyzeData]);

  return {
    recommendation,
    isAnalyzing,
    reanalyze: analyzeData
  };
}

/**
 * Hook for adaptive depth management during operations
 */
export function useAdaptiveDepth(options: AdaptiveOptions = {}) {
  const managerRef = useRef<AdaptiveDepthManager | null>(null);
  const [currentDepth, setCurrentDepth] = useState<number>(2);
  const [depthHistory, setDepthHistory] = useState<Array<{ depth: number; reason: string; timestamp: Date }>>([]);

  useEffect(() => {
    managerRef.current = new AdaptiveDepthManager(options);
    setCurrentDepth(managerRef.current.getCurrentDepth());
  }, [options]);

  const runWithAdaptiveDepth = useCallback(async (
    operation: () => Promise<any>,
    customOptions?: AdaptiveOptions
  ) => {
    if (!managerRef.current) return null;

    try {
      const result = await managerRef.current.runWithAdaptiveDepth(operation, customOptions);
      setCurrentDepth(managerRef.current.getCurrentDepth());
      setDepthHistory(managerRef.current.getDepthHistory());
      return result;
    } catch (error) {
      setCurrentDepth(managerRef.current?.getCurrentDepth() || 2);
      setDepthHistory(managerRef.current?.getDepthHistory() || []);
      throw error;
    }
  }, []);

  const escalateDepthIfNeeded = useCallback((data: any, results?: any) => {
    if (!managerRef.current) return;
    
    managerRef.current.escalateDepthIfNeeded(data, results);
    setCurrentDepth(managerRef.current.getCurrentDepth());
    setDepthHistory(managerRef.current.getDepthHistory());
  }, []);

  const setDepth = useCallback((depth: number, reason: string) => {
    if (!managerRef.current) return;
    
    managerRef.current.setDepth(depth, reason);
    setCurrentDepth(managerRef.current.getCurrentDepth());
    setDepthHistory(managerRef.current.getDepthHistory());
  }, []);

  return {
    currentDepth,
    depthHistory,
    runWithAdaptiveDepth,
    escalateDepthIfNeeded,
    setDepth
  };
}

/**
 * Hook for environment-based depth configuration
 */
export function useEnvironmentDepth() {
  const [config, setConfig] = useState(() => EnvironmentDepthConfig.getCurrentConfig());
  const [environment, setEnvironment] = useState(() => EnvironmentDepthConfig.detectEnvironment());

  const updateEnvironment = useCallback((newEnv: string) => {
    const newConfig = EnvironmentDepthConfig.getOptimalDepth(newEnv);
    setEnvironment(newEnv);
    setConfig(newConfig);
  }, []);

  const applyConfig = useCallback(() => {
    EnvironmentDepthConfig.applyEnvironmentConfig();
    setConfig(EnvironmentDepthConfig.getCurrentConfig());
  }, []);

  const generateScript = useCallback((env: string) => {
    return EnvironmentDepthConfig.generateEnvScript(env);
  }, []);

  return {
    config,
    environment,
    updateEnvironment,
    applyConfig,
    generateScript
  };
}

/**
 * Hook for performance analysis of depth settings
 */
export function useDepthPerformance() {
  const [analysis, setAnalysis] = useState(() => {
    return {
      analysis: DepthPerformanceAnalyzer.analyzeTradeoffs(2, 10000),
      analyzePerformance: DepthPerformanceAnalyzer.analyzeTradeoffs,
      getOptimalDepthForSize: DepthPerformanceAnalyzer.getOptimalDepthForSize,
      now: Date.now()
    };
  });

  const analyzePerformance = useCallback((depth: number, dataSize: number) => {
    const result = DepthPerformanceAnalyzer.analyzeTradeoffs(depth, dataSize);
    setAnalysis({
      analysis: result,
      analyzePerformance: DepthPerformanceAnalyzer.analyzeTradeoffs,
      getOptimalDepthForSize: DepthPerformanceAnalyzer.getOptimalDepthForSize,
      now: Date.now()
    });
    return result;
  }, []);

  const getOptimalDepthForSize = useCallback((dataSize: number, maxTimeMs?: number) => {
    return DepthPerformanceAnalyzer.getOptimalDepthForSize(dataSize, maxTimeMs);
  }, []);

  const refresh = useCallback(() => {
    setAnalysis((prev: any) => ({
      ...prev,
      now: Date.now()
    }));
  }, []);

  return {
    analysis: analysis.analysis,
    analyzePerformance,
    getOptimalDepthForSize,
    refresh,
    lastUpdate: analysis.now
  };
}

/**
 * Hook for depth configuration state management
 */
export function useDepthConfig(initialDepth?: number, initialMaxDepth?: number) {
  const [config, setConfig] = useState(() => {
    const manager = new DepthConfigManager();
    return {
      depth: initialDepth || manager.getDepth(),
      maxDepth: initialMaxDepth || manager.getMaxDepth(),
      autoDepth: manager.getAutoDepth()
    };
  });

  const managerRef = useRef(new DepthConfigManager());

  const updateDepth = useCallback((newDepth: number) => {
    managerRef.current.updateDepth(newDepth);
    setConfig({
      depth: managerRef.current.getDepth(),
      maxDepth: managerRef.current.getMaxDepth(),
      autoDepth: managerRef.current.getAutoDepth()
    });
  }, []);

  const updateMaxDepth = useCallback((newMaxDepth: number) => {
    managerRef.current.updateMaxDepth(newMaxDepth);
    setConfig({
      depth: managerRef.current.getDepth(),
      maxDepth: managerRef.current.getMaxDepth(),
      autoDepth: managerRef.current.getAutoDepth()
    });
  }, []);

  const toggleAutoDepth = useCallback(() => {
    managerRef.current.toggleAutoDepth();
    setConfig({
      depth: managerRef.current.getDepth(),
      maxDepth: managerRef.current.getMaxDepth(),
      autoDepth: managerRef.current.getAutoDepth()
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    managerRef.current.resetToDefaults();
    setConfig({
      depth: managerRef.current.getDepth(),
      maxDepth: managerRef.current.getMaxDepth(),
      autoDepth: managerRef.current.getAutoDepth()
    });
  }, []);

  return {
    config,
    updateDepth,
    updateMaxDepth,
    toggleAutoDepth,
    resetToDefaults
  };
}

/**
 * Hook for depth-related metrics and monitoring
 */
export function useDepthMetrics() {
  const [metrics, setMetrics] = useState(() => {
    const tracker = new DepthMetricsTracker();
    return tracker.getMetrics();
  });
  const trackerRef = useRef(new DepthMetricsTracker());

  const recordOperation = useCallback((depth: number, dataSize: number, actualTimeMs?: number) => {
    trackerRef.current.recordOperation(depth, dataSize, actualTimeMs);
    setMetrics(trackerRef.current.getMetrics());
  }, []);

  const recordDepthChange = useCallback(() => {
    trackerRef.current.recordDepthChange();
    setMetrics(trackerRef.current.getMetrics());
  }, []);

  const getPerformanceTrend = useCallback(() => {
    return trackerRef.current.getPerformanceTrend();
  }, []);

  const clearMetrics = useCallback(() => {
    trackerRef.current.clearMetrics();
    setMetrics(trackerRef.current.getMetrics());
  }, []);

  return {
    metrics,
    recordOperation,
    recordDepthChange,
    getPerformanceTrend,
    clearMetrics
  };
}

/**
 * Combined hook for complete depth management
 */
export function useDepthManager(initialData?: any, initialContext?: BenchmarkContext) {
  const recommendation = useDepthRecommendation(initialData, initialContext || { mode: 'development', environment: 'development' });
  const adaptive = useAdaptiveDepth({ enableAutoEscalation: true });
  const config = useDepthConfig();
  const performance = useDepthPerformance();
  const metrics = useDepthMetrics();

  const executeWithDepth = useCallback(async <T>(operation: () => Promise<T>, customOptions?: AdaptiveOptions): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await adaptive.runWithAdaptiveDepth(operation, customOptions);
      const duration = Date.now() - startTime;
      
      metrics.recordOperation(adaptive.currentDepth, 10000, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      metrics.recordOperation(adaptive.currentDepth, 10000, duration);
      
      throw error;
    }
  }, [adaptive, metrics]);

  return {
    config,
    recommendation,
    adaptive,
    performance,
    metrics,
    executeWithDepth
  };
}

export default {
  useDepthRecommendation,
  useAdaptiveDepth,
  useEnvironmentDepth,
  useDepthPerformance,
  useDepthConfig,
  useDepthMetrics,
  useDepthManager
};
