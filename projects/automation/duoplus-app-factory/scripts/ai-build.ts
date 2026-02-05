#!/usr/bin/env bun

/**
 * AI Build Script - Compiles and prepares ONNX models for inference
 * This script prepares the WebAssembly runtime and model files
 */

import { NebulaLogger } from "../src/nebula/logger.js";

const fs = require("fs");
const path = require("path");

export async function buildAI(): Promise<{
  success: boolean;
  modelPath?: string;
  wasmPath?: string;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    NebulaLogger.log("AI-Build", "info", "Starting AI model build process");

    // 1. Check for ONNX runtime
    const onnxPath = path.join(process.cwd(), "node_modules", "onnxruntime-web", "dist", "ort-wasm.wasm");
    
    if (!fs.existsSync(onnxPath)) {
      NebulaLogger.log("AI-Build", "warn", "ONNX WASM runtime not found, will use mock implementation");
    } else {
      NebulaLogger.log("AI-Build", "info", "ONNX WASM runtime found");
    }

    // 2. Create model directory if it doesn't exist
    const modelDir = path.join(process.cwd(), "models");
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
      NebulaLogger.log("AI-Build", "info", "Created models directory");
    }

    // 3. Check for existing model
    const modelPath = path.join(modelDir, "model.onnx");
    let modelCreated = false;

    if (!fs.existsSync(modelPath)) {
      // Create a placeholder model file
      // In production, this would be a real ONNX model file
      const placeholderModel = Buffer.from([
        0x08, 0x00, 0x00, 0x00, // ONNX magic number
        0x00, 0x00, 0x00, 0x00, // Version
      ]);

      fs.writeFileSync(modelPath, placeholderModel);
      modelCreated = true;
      NebulaLogger.log("AI-Build", "info", "Created placeholder ONNX model");
    } else {
      NebulaLogger.log("AI-Build", "info", "Using existing ONNX model");
    }

    // 4. Create model metadata
    const metadataPath = path.join(modelDir, "model-metadata.json");
    const metadata = {
      version: "1.0.0",
      created: new Date().toISOString(),
      type: "anomaly-detection",
      features: [
        "deviceId",
        "ageDays",
        "legAmount",
        "legVelocity",
        "ipJump",
        "walletAgeDelta",
        "ctrProximity",
        "chargebackHistory",
      ],
      output: "risk_score",
      framework: "onnx",
      runtime: "onnxruntime-web",
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    NebulaLogger.log("AI-Build", "info", "Created model metadata");

    // 5. Create WASM cache directory
    const wasmCacheDir = path.join(process.cwd(), "data", "wasm-cache");
    if (!fs.existsSync(wasmCacheDir)) {
      fs.mkdirSync(wasmCacheDir, { recursive: true });
      NebulaLogger.log("AI-Build", "info", "Created WASM cache directory");
    }

    // 6. Create model configuration
    const configPath = path.join(modelDir, "config.json");
    const config = {
      inference: {
        batchSize: 1,
        timeout: 5000,
        maxRetries: 3,
      },
      thresholds: {
        block: 0.85,
        stepUp: 0.7,
        lowRisk: 0.3,
      },
      features: {
        amount: { weight: 0.3, max: 5000 },
        velocity: { weight: 0.25, max: 100 },
        ipJump: { weight: 0.2, max: 50 },
        walletAgeDelta: { weight: 0.15, max: 730 },
        ctrProximity: { weight: 0.1, max: 10000 },
        chargebackHistory: { weight: 0.15 },
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    NebulaLogger.log("AI-Build", "info", "Created model configuration");

    // 7. Create inference cache
    const cacheDir = path.join(process.cwd(), "data", "inference-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      NebulaLogger.log("AI-Build", "info", "Created inference cache directory");
    }

    // 8. Create model validation script
    const validationScriptPath = path.join(process.cwd(), "scripts", "validate-model.ts");
    if (!fs.existsSync(validationScriptPath)) {
      const validationScript = `#!/usr/bin/env bun

import { infer } from "../src/ai/inference.js";
import { LegSignal } from "../src/nebula/riskEngine.js";

export async function validateModel(): Promise<boolean> {
  try {
    // Test with sample signal
    const testSignal: LegSignal = {
      deviceId: "test-device",
      ageDays: 30,
      legAmount: 100,
      legVelocity: 5,
      ipJump: 0,
      walletAgeDelta: 25,
      ctrProximity: 5000,
      chargebackHistory: false,
    };

    const score = await infer(testSignal);
    console.log("Model validation score:", score);
    
    return score >= 0 && score <= 1;
  } catch (error) {
    console.error("Model validation failed:", error);
    return false;
  }
}

if (require.main === module) {
  validateModel()
    .then((success) => {
      console.log("Model validation:", success ? "PASSED" : "FAILED");
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Validation error:", error);
      process.exit(1);
    });
}
`;
      fs.writeFileSync(validationScriptPath, validationScript);
      NebulaLogger.log("AI-Build", "info", "Created model validation script");
    }

    NebulaLogger.log("AI-Build", "info", "AI build process completed", {
      modelCreated,
      modelPath,
    });

    return {
      success: errors.length === 0,
      modelPath,
      wasmPath: onnxPath,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    NebulaLogger.log("AI-Build", "error", "Build failed", {
      error: errorMessage,
    });

    return {
      success: false,
      errors: [errorMessage],
    };
  }
}

// Run if called directly
if (require.main === module) {
  buildAI()
    .then((result) => {
      console.log("\n=== AI Build Process ===");
      console.log(`Success: ${result.success}`);
      console.log(`Model Path: ${result.modelPath || "Not created"}`);
      console.log(`WASM Path: ${result.wasmPath || "Not found"}`);
      console.log(`Errors: ${result.errors.length}`);

      if (result.errors.length > 0) {
        console.log("\nErrors:");
        result.errors.forEach(err => console.log(`  ✗ ${err}`));
      }

      console.log("\nNext Steps:");
      console.log("  1. bun run ai:train");
      console.log("  2. bun run start");

      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Build failed:", error);
      process.exit(1);
    });
}