// src/main.ts
import { registerTypeDefinitions } from "../utils/pattern-matrix";
import { feature } from "./common/feature-flags";
import { initDuoPlus } from "./common/duoplus-premium";
import { PatternValidator } from "./validation/pattern-validator";
import { IdentityShieldWorkflow } from "./apple-id/identity-shield-service";

console.log("🏰 Empire Pro Starting...");

registerTypeDefinitions();

// Dead-code eliminated if !feature("PREMIUM")
initDuoPlus();

// Dead-code eliminated if !feature("VALIDATION")
if (feature("VALIDATION")) {
  console.log("🛡️  Validation Engine Active [DCE Check]");
  const workflow = new IdentityShieldWorkflow();
  PatternValidator.validate(workflow, PatternValidator.generateLSPInfo(workflow));
}

console.log("✨ Core Services Ready.");
