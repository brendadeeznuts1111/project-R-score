#!/usr/bin/env bun

// Fractal Dimension Engine - T3-Lattice Component #5 (Channels)
// Computes fractal dimension using box-counting method

import { FD_THRESHOLDS, GLYPH_PATTERNS } from '../persona-config.ts';

interface FDResult {
  value: number;
  confidence: number;
  glyph: string;
  pattern: string;
  timestamp: number;
  computationMs: number;
}

export async function computeFractalDimension(
  oddsTrajectory: Float64Array,
  options: { method: string; resolution: number } = { method: "box_counting", resolution: 1000 }
): Promise<FDResult> {
  const start = performance.now();

  if (oddsTrajectory.length < 10) {
    throw new Error("Insufficient data for fractal dimension computation");
  }

  let fd: number;

  switch (options.method) {
    case "box_counting":
      fd = computeBoxCountingFD(oddsTrajectory, options.resolution);
      break;
    case "correlation":
      fd = computeCorrelationFD(oddsTrajectory);
      break;
    default:
      fd = computeBoxCountingFD(oddsTrajectory, options.resolution);
  }

  // Select glyph based on FD value
  let glyph = "⊟";
  if (fd > FD_THRESHOLDS.blackSwan) glyph = "⟳⟲⟜(▵⊗⥂)";
  else if (fd > FD_THRESHOLDS.persistent) glyph = "(▵⊗⥂)⟂⟳";
  else if (fd > FD_THRESHOLDS.random) glyph = "⥂⟂(▵⟜⟳)";
  else if (fd > FD_THRESHOLDS.meanReversion) glyph = "▵⟂⥂";

  // Calculate confidence based on data quality and computation stability
  const confidence = calculateFDConfidence(fd, oddsTrajectory);

  const computationMs = performance.now() - start;

  return {
    value: fd,
    confidence,
    glyph,
    pattern: GLYPH_PATTERNS[glyph as keyof typeof GLYPH_PATTERNS] || "Unknown",
    timestamp: Date.now(),
    computationMs
  };
}

function computeBoxCountingFD(data: Float64Array, resolution: number): number {
  // Box-counting algorithm for fractal dimension
  const boxSizes = [2, 4, 8, 16, 32, 64].filter(size => size <= data.length);

  const counts = boxSizes.map(boxSize => {
    let count = 0;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const boxCount = Math.ceil(range / boxSize);

    // Count boxes that contain data points
    for (let box = 0; box < boxCount; box++) {
      const boxMin = min + box * boxSize;
      const boxMax = boxMin + boxSize;

      const hasPoints = data.some(value => value >= boxMin && value < boxMax);
      if (hasPoints) count++;
    }

    return count;
  });

  // Linear regression on log-log plot
  const logBoxSizes = boxSizes.map(size => Math.log(size));
  const logCounts = counts.map(count => Math.log(count));

  // Simple linear regression
  const n = boxSizes.length;
  const sumX = logBoxSizes.reduce((a, b) => a + b, 0);
  const sumY = logCounts.reduce((a, b) => a + b, 0);
  const sumXY = logBoxSizes.reduce((acc, x, i) => acc + x * logCounts[i], 0);
  const sumX2 = logBoxSizes.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const fd = -slope;

  return Math.max(0, Math.min(3, fd)); // Clamp to reasonable range
}

function computeCorrelationFD(data: Float64Array): number {
  // Simplified correlation dimension calculation
  const embeddedData = embedData(data, 2); // Embedding dimension m=2

  // Calculate correlation sum
  let correlationSum = 0;
  let pairCount = 0;

  for (let i = 0; i < embeddedData.length; i++) {
    for (let j = i + 1; j < embeddedData.length; j++) {
      const distance = euclideanDistance(embeddedData[i], embeddedData[j]);
      if (distance < 0.1) { // r threshold
        correlationSum += 1;
      }
      pairCount++;
    }
  }

  const correlation = correlationSum / pairCount;
  return Math.log(correlation) / Math.log(0.1);
}

function embedData(data: Float64Array, m: number): number[][] {
  const embedded: number[][] = [];
  for (let i = 0; i <= data.length - m; i++) {
    embedded.push(Array.from(data.slice(i, i + m)));
  }
  return embedded;
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function calculateFDConfidence(fd: number, data: Float64Array): number {
  // Base confidence on data length and FD stability
  const dataQuality = Math.min(1, data.length / 1000); // Prefer longer time series
  const stability = fd >= 0 && fd <= 3 ? 1 : 0.5; // Reasonable FD range

  // Check for data stationarity (simplified)
  const mean = data.reduce((a, b) => a + b) / data.length;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stationarity = variance > 0 ? Math.min(1, 1 / variance) : 0.5;

  return (dataQuality + stability + stationarity) / 3;
}

// Performance benchmark for FD computation
export async function benchmarkFDComputation(
  iterations: number = 100
): Promise<{ averageMs: number; p99Ms: number; throughput: number }> {
  const testData = new Float64Array(1000);
  for (let i = 0; i < 1000; i++) {
    testData[i] = Math.random() * 10 + 100; // Simulated odds trajectory
  }

  const timings: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await computeFractalDimension(testData);
    const duration = performance.now() - start;
    timings.push(duration);
  }

  timings.sort((a, b) => a - b);

  return {
    averageMs: timings.reduce((a, b) => a + b) / timings.length,
    p99Ms: timings[Math.floor(timings.length * 0.99)],
    throughput: 1000 / (timings.reduce((a, b) => a + b) / timings.length) // ops/sec
  };
}