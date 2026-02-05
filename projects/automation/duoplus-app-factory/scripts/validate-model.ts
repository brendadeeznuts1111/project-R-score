#!/usr/bin/env bun

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
