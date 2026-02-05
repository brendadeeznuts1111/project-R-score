// Demo TypeScript file for testing the stripper

interface QuantumMetrics {
  systemTension: number;
  hurstExponent: number;
  memoryUsage: number;
}

type SystemStatus = 'healthy' | 'warning' | 'critical';

class QuantumAnalyzer {
  private metrics: QuantumMetrics;
  private status: SystemStatus;

  constructor(initialMetrics: QuantumMetrics) {
    this.metrics = initialMetrics;
    this.status = this.determineStatus();
  }

  public analyze(): string {
    const tension = this.metrics.systemTension;
    const hurst = this.metrics.hurstExponent;
    
    if (tension > 0.7 || hurst > 0.8) {
      return 'System requires immediate attention';
    }
    
    return `System operating normally. Tension: ${(tension * 100).toFixed(1)}%`;
  }

  private determineStatus(): SystemStatus {
    const { systemTension, hurstExponent } = this.metrics;
    
    if (systemTension > 0.8) return 'critical';
    if (systemTension > 0.6 || hurstExponent > 0.7) return 'warning';
    return 'healthy';
  }

  public updateMetrics(newMetrics: Partial<QuantMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.status = this.determineStatus();
  }
}

// Utility functions
function calculateTensionScore(metrics: QuantumMetrics): number {
  const weights = { systemTension: 0.6, hurstExponent: 0.4 };
  return (metrics.systemTension * weights.systemTension + 
          metrics.hurstExponent * weights.hurstExponent);
}

export { QuantumAnalyzer, QuantumMetrics, SystemStatus, calculateTensionScore };
