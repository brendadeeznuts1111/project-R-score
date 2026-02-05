# T3-Lattice Statistical Analytics Library
# Advanced statistical analysis for sports betting edge detection

// Statistical Distributions and Tests
export class StatisticalAnalyzer {
  // Normal distribution calculations
  static normalPDF(x: number, mean = 0, std = 1): number {
    return (1 / (std * Math.sqrt(2 * Math.PI))) *
           Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
  }

  static normalCDF(x: number, mean = 0, std = 1): number {
    // Approximation using error function
    const z = (x - mean) / (std * Math.sqrt(2));
    return 0.5 * (1 + this.erf(z));
  }

  static erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  // Hypothesis testing
  static tTest(sample1: number[], sample2: number[], equalVariance = true): HypothesisTestResult {
    const n1 = sample1.length;
    const n2 = sample2.length;

    if (n1 < 2 || n2 < 2) {
      throw new Error("Samples must have at least 2 elements");
    }

    const mean1 = this.mean(sample1);
    const mean2 = this.mean(sample2);
    const var1 = this.variance(sample1);
    const var2 = this.variance(sample2);

    let se: number;
    let df: number;

    if (equalVariance) {
      // Pooled variance t-test
      const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
      se = Math.sqrt(pooledVar * (1/n1 + 1/n2));
      df = n1 + n2 - 2;
    } else {
      // Welch's t-test
      se = Math.sqrt(var1/n1 + var2/n2);
      df = Math.pow(var1/n1 + var2/n2, 2) /
           (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
    }

    const t = (mean1 - mean2) / se;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(t))); // Two-tailed

    return {
      statistic: t,
      pValue,
      degreesOfFreedom: df,
      mean1,
      mean2,
      difference: mean1 - mean2,
      confidenceInterval: this.confidenceInterval(mean1 - mean2, se, df, 0.95),
      effectSize: Math.abs(mean1 - mean2) / Math.sqrt((var1 + var2) / 2)
    };
  }

  // Confidence interval calculation
  static confidenceInterval(estimate: number, se: number, df: number, confidence = 0.95): [number, number] {
    const alpha = 1 - confidence;
    const t = this.tCritical(df, alpha / 2);
    const margin = t * se;

    return [estimate - margin, estimate + margin];
  }

  // Critical t-value (approximation)
  static tCritical(df: number, alpha: number): number {
    // Approximation for large df
    if (df > 30) {
      return this.normalQuantile(1 - alpha);
    }

    // Simplified approximation
    return 2.0; // Conservative estimate
  }

  static normalQuantile(p: number): number {
    // Approximation of normal quantile function
    if (p <= 0 || p >= 1) throw new Error("p must be between 0 and 1");

    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [-2.78718931138, -2.29796479134, 4.85014127135, 2.32121276858];
    const d = [3.54388924762, 1.63706781897];

    const y = p - 0.5;
    let r: number;

    if (Math.abs(y) < 0.42) {
      r = y * y;
      r = y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
               ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    } else {
      r = p < 0.5 ? y : 1 - y;
      r = Math.log(-Math.log(r));
      r = c[0] + r * (c[1] + r * (c[2] + r * c[3]));
      r = y < 0 ? -r : r;
    }

    return r;
  }

  // Basic statistical measures
  static mean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  static median(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  static variance(data: number[], sample = true): number {
    const mean = this.mean(data);
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const sum = squaredDiffs.reduce((a, b) => a + b, 0);
    return sample ? sum / (data.length - 1) : sum / data.length;
  }

  static std(data: number[], sample = true): number {
    return Math.sqrt(this.variance(data, sample));
  }

  static skewness(data: number[]): number {
    const mean = this.mean(data);
    const std = this.std(data);
    const cubedDiffs = data.map(val => Math.pow((val - mean) / std, 3));
    return cubedDiffs.reduce((a, b) => a + b, 0) / data.length;
  }

  static kurtosis(data: number[]): number {
    const mean = this.mean(data);
    const std = this.std(data);
    const fourthDiffs = data.map(val => Math.pow((val - mean) / std, 4));
    return fourthDiffs.reduce((a, b) => a + b, 0) / data.length - 3;
  }

  // Time series analysis
  static autocorrelation(data: number[], lag: number): number {
    if (lag >= data.length) return 0;

    const mean = this.mean(data);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < data.length - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  static partialAutocorrelation(data: number[], lag: number): number {
    // Simplified PACF calculation
    if (lag === 1) return this.autocorrelation(data, 1);

    // For higher lags, use simplified approximation
    return this.autocorrelation(data, lag);
  }

  // Stationarity tests
  static adfTest(data: number[], maxLags = 5): StationarityTestResult {
    // Augmented Dickey-Fuller test approximation
    const n = data.length;
    const diffs = [];

    for (let i = 1; i < n; i++) {
      diffs.push(data[i] - data[i-1]);
    }

    // Calculate test statistic (simplified)
    const meanDiff = this.mean(diffs);
    const varDiff = this.variance(diffs);

    // Critical values (approximations for different significance levels)
    const criticalValues = {
      '1%': -3.43,
      '5%': -2.86,
      '10%': -2.57
    };

    // Simplified test statistic
    const testStatistic = meanDiff / Math.sqrt(varDiff / n);

    return {
      testStatistic,
      criticalValues,
      isStationary: testStatistic < criticalValues['5%'],
      lagsUsed: maxLags
    };
  }

  // Outlier detection
  static detectOutliers(data: number[], method: 'iqr' | 'zscore' | 'modified_z' = 'iqr'): OutlierResult {
    const outliers: number[] = [];
    const outlierIndices: number[] = [];

    switch (method) {
      case 'iqr':
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        data.forEach((val, idx) => {
          if (val < lowerBound || val > upperBound) {
            outliers.push(val);
            outlierIndices.push(idx);
          }
        });
        break;

      case 'zscore':
        const mean = this.mean(data);
        const std = this.std(data);
        const zThreshold = 3;

        data.forEach((val, idx) => {
          const z = Math.abs((val - mean) / std);
          if (z > zThreshold) {
            outliers.push(val);
            outlierIndices.push(idx);
          }
        });
        break;

      case 'modified_z':
        const median = this.median(data);
        const mad = this.median(data.map(val => Math.abs(val - median)));
        const modifiedZThreshold = 3.5;

        data.forEach((val, idx) => {
          const modifiedZ = 0.6745 * Math.abs(val - median) / mad;
          if (modifiedZ > modifiedZThreshold) {
            outliers.push(val);
            outlierIndices.push(idx);
          }
        });
        break;
    }

    return {
      outliers,
      outlierIndices,
      method,
      totalOutliers: outliers.length,
      outlierPercentage: (outliers.length / data.length) * 100
    };
  }
}

// Time Series Analysis Library
export class TimeSeriesAnalyzer {
  static decompose(data: number[], period = 12): TimeSeriesDecomposition {
    // Simple seasonal decomposition
    const trend = this.extractTrend(data);
    const seasonal = this.extractSeasonal(data, period);
    const residual = this.extractResidual(data, trend, seasonal);

    return {
      original: data,
      trend,
      seasonal,
      residual,
      period
    };
  }

  private static extractTrend(data: number[], window = 5): number[] {
    const trend: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.floor(window / 2) + 1);
      const windowData = data.slice(start, end);
      trend.push(windowData.reduce((a, b) => a + b, 0) / windowData.length);
    }

    return trend;
  }

  private static extractSeasonal(data: number[], period: number): number[] {
    const seasonal: number[] = new Array(data.length).fill(0);
    const seasonalComponents: number[][] = [];

    // Group by season
    for (let i = 0; i < period; i++) {
      seasonalComponents[i] = [];
    }

    for (let i = 0; i < data.length; i++) {
      seasonalComponents[i % period].push(data[i]);
    }

    // Calculate seasonal averages
    const seasonalAverages = seasonalComponents.map(component =>
      component.reduce((a, b) => a + b, 0) / component.length
    );

    // Center the seasonal components
    const overallMean = seasonalAverages.reduce((a, b) => a + b, 0) / period;
    const centeredSeasonal = seasonalAverages.map(avg => avg - overallMean);

    // Repeat the seasonal pattern
    for (let i = 0; i < data.length; i++) {
      seasonal[i] = centeredSeasonal[i % period];
    }

    return seasonal;
  }

  private static extractResidual(data: number[], trend: number[], seasonal: number[]): number[] {
    return data.map((val, i) => val - trend[i] - seasonal[i]);
  }

  static forecastARIMA(data: number[], p = 1, d = 1, q = 1, steps = 10): number[] {
    // Simplified ARIMA forecasting
    const forecast: number[] = [];

    // Differencing for stationarity
    const differenced = d > 0 ? this.difference(data, d) : data;

    // Simple exponential smoothing forecast
    const alpha = 0.3;
    let smoothed = differenced[0];

    for (let i = 1; i < differenced.length; i++) {
      smoothed = alpha * differenced[i] + (1 - alpha) * smoothed;
    }

    // Generate forecast
    for (let i = 0; i < steps; i++) {
      forecast.push(smoothed);
      smoothed = alpha * smoothed + (1 - alpha) * smoothed; // Continue smoothing
    }

    // Inverse differencing if needed
    if (d > 0) {
      let lastValue = data[data.length - 1];
      return forecast.map(val => {
        const newVal = lastValue + val;
        lastValue = newVal;
        return newVal;
      });
    }

    return forecast;
  }

  private static difference(data: number[], order: number): number[] {
    let result = data;
    for (let i = 0; i < order; i++) {
      result = result.slice(1).map((val, idx) => val - result[idx]);
    }
    return result;
  }

  static calculateVolatility(data: number[], window = 20): number[] {
    const volatility: number[] = [];

    for (let i = window - 1; i < data.length; i++) {
      const windowData = data.slice(i - window + 1, i + 1);
      const returns = [];

      for (let j = 1; j < windowData.length; j++) {
        returns.push(Math.log(windowData[j] / windowData[j-1]));
      }

      const vol = StatisticalAnalyzer.std(returns) * Math.sqrt(252); // Annualized
      volatility.push(vol);
    }

    return volatility;
  }
}

// Sports Betting Analytics Library
export class SportsAnalytics {
  static calculateImpliedProbability(odds: number, format: 'decimal' | 'american' | 'fractional' = 'decimal'): number {
    switch (format) {
      case 'decimal':
        return 1 / odds;
      case 'american':
        return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
      case 'fractional':
        const [num, den] = odds.toString().split('/').map(Number);
        return den / (num + den);
      default:
        throw new Error(`Unsupported odds format: ${format}`);
    }
  }

  static calculateExpectedValue(probability: number, odds: number, stake = 1): number {
    const payout = stake * (odds - 1);
    const expectedValue = (probability * payout) - ((1 - probability) * stake);
    return expectedValue;
  }

  static kellyCriterion(probability: number, odds: number): number {
    const b = odds - 1; // Decimal odds minus 1
    const q = 1 - probability;
    return (b * probability - q) / b;
  }

  static sharpeRatio(returns: number[], riskFreeRate = 0.02): number {
    const excessReturns = returns.map(r => r - riskFreeRate);
    const avgExcessReturn = StatisticalAnalyzer.mean(excessReturns);
    const stdExcessReturn = StatisticalAnalyzer.std(excessReturns);
    return stdExcessReturn > 0 ? avgExcessReturn / stdExcessReturn : 0;
  }

  static maximumDrawdown(prices: number[]): number {
    let maxDrawdown = 0;
    let peak = prices[0];

    for (const price of prices) {
      if (price > peak) {
        peak = price;
      }
      const drawdown = (peak - price) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  static calculateEdge(observedProb: number, marketProb: number): number {
    return observedProb - marketProb;
  }

  static monteCarloSimulation(
    initialValue: number,
    expectedReturn: number,
    volatility: number,
    timeHorizon: number,
    simulations = 1000
  ): MonteCarloResult {
    const results: number[] = [];
    const paths: number[][] = [];

    for (let sim = 0; sim < simulations; sim++) {
      let value = initialValue;
      const path = [value];

      for (let t = 1; t <= timeHorizon; t++) {
        const randomReturn = StatisticalAnalyzer.normalPDF(0, expectedReturn, volatility);
        value *= (1 + randomReturn);
        path.push(value);
      }

      results.push(value);
      paths.push(path);
    }

    const mean = StatisticalAnalyzer.mean(results);
    const std = StatisticalAnalyzer.std(results);
    const percentiles = {
      '5%': this.percentile(results, 0.05),
      '25%': this.percentile(results, 0.25),
      '50%': this.percentile(results, 0.50),
      '75%': this.percentile(results, 0.75),
      '95%': this.percentile(results, 0.95)
    };

    return {
      results,
      paths,
      statistics: {
        mean,
        std,
        percentiles,
        probabilityOfProfit: results.filter(r => r > initialValue).length / simulations
      }
    };
  }

  private static percentile(data: number[], p: number): number {
    const sorted = [...data].sort((a, b) => a - b);
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

// Type definitions
interface HypothesisTestResult {
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
  mean1: number;
  mean2: number;
  difference: number;
  confidenceInterval: [number, number];
  effectSize: number;
}

interface StationarityTestResult {
  testStatistic: number;
  criticalValues: Record<string, number>;
  isStationary: boolean;
  lagsUsed: number;
}

interface OutlierResult {
  outliers: number[];
  outlierIndices: number[];
  method: string;
  totalOutliers: number;
  outlierPercentage: number;
}

interface TimeSeriesDecomposition {
  original: number[];
  trend: number[];
  seasonal: number[];
  residual: number[];
  period: number;
}

interface MonteCarloResult {
  results: number[];
  paths: number[][];
  statistics: {
    mean: number;
    std: number;
    percentiles: Record<string, number>;
    probabilityOfProfit: number;
  };
}