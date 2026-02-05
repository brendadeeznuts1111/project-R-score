#!/usr/bin/env bun

// ai/inference.ts - WebAssembly ONNX Runtime for Nebula-Flow™
// High-performance inference with fallback scoring

console.log("⚡ ONNX WebAssembly Runtime - Loading");

// Mock ONNX Runtime for development
// In production, replace with: import * as ORT from 'onnxruntime-web';

interface MockInferenceSession {
  inputNames: string[];
  outputNames: string[];
  run(inputs: Record<string, MockTensor>): Promise<Record<string, MockTensor>>;
}

interface MockTensor {
  data: Float32Array;
  size: number;
}

let session: MockInferenceSession | null = null;

export async function initializeModel(modelPath: string = '/models/anomaly.onnx'): Promise<MockInferenceSession> {
  if (!session) {
    try {
      console.log(`🔄 Loading ONNX model: ${modelPath}`);
      
      // Mock session for development
      session = {
        inputNames: ['input'],
        outputNames: ['output'],
        run: async (inputs: Record<string, MockTensor>) => {
          // Simulate inference time
          await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));
          
          // Simple mock inference based on input features
          const input = inputs.input.data;
          let score = 0.3; // Base score
          
          // Feature weights (mock neural network behavior)
          const weights = [0.15, 0.20, 0.25, 0.10, 0.10, 0.10, 0.05, 0.02, 0.02, 0.01];
          
          for (let i = 0; i < Math.min(input.length, weights.length); i++) {
            score += input[i] * weights[i];
          }
          
          // Add some non-linearity and randomness
          score = Math.tanh(score) + (Math.random() - 0.5) * 0.1;
          
          return {
            output: {
              data: new Float32Array([Math.max(0, Math.min(1, score))]),
              size: 1
            }
          };
        }
      };
      
      console.log(`✅ ONNX Model loaded: ${session.inputNames.join(', ')} → ${session.outputNames.join(', ')}`);
    } catch (error) {
      console.error('Failed to load ONNX model:', error);
      throw error;
    }
  }
  return session;
}

export async function infer(features: Float32Array): Promise<number> {
  if (!session) {
    await initializeModel();
  }
  
  try {
    // Create tensor from features
    const tensor: MockTensor = {
      data: features,
      size: features.length
    };
    
    // Run inference
    const start = performance.now();
    const results = await session!.run({ input: tensor });
    const inferenceTime = performance.now() - start;
    
    // Get prediction (assuming single output)
    const outputKey = Object.keys(results)[0];
    if (!outputKey) {
      throw new Error('No output returned from inference');
    }
    
    const output = results[outputKey];
    if (!output || !output.data || output.data.length === 0) {
      throw new Error('Invalid output from inference');
    }
    
    const score = output.data[0] as number;
    
    // Log performance metrics
    if (inferenceTime > 100) {
      console.warn(`⚠️ Inference slow: ${inferenceTime.toFixed(1)}ms`);
    }
    
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('Inference failed:', error);
    // Fallback to rule-based scoring
    return fallbackScoring(features);
  }
}

function fallbackScoring(features: Float32Array): number {
  console.log('🔄 Using fallback scoring due to inference failure');
  
  // Simple weighted average fallback
  const weights = [0.15, 0.20, 0.25, 0.10, 0.10, 0.10, 0.05, 0.02, 0.02, 0.01];
  let score = 0;
  
  for (let i = 0; i < Math.min(features.length, weights.length); i++) {
    score += features[i] * weights[i];
  }
  
  // Add some randomness to simulate model variance
  score += (Math.random() - 0.5) * 0.2;
  
  return Math.max(0, Math.min(1, score));
}

// Export types for TypeScript
export type { MockInferenceSession, MockTensor };
