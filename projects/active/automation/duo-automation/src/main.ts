import { registerTypeDefinitions } from "../utils/pattern-matrix";
import { feature } from "./common/feature-flags";
import { initFactoryWager } from "./common/factory-wager-premium";
import { PatternValidator } from "./validation/pattern-validator";
import { IdentityShieldWorkflow } from "./apple-id/identity-shield-service";

console.info("🏰 Empire Pro Starting...");

registerTypeDefinitions();

// Dead-code eliminated if !feature("PREMIUM")
initFactoryWager();

// Dead-code eliminated if !feature("VALIDATION")
if (feature("VALIDATION")) {
  console.info("🛡️  Validation Engine Active [DCE Check]");
  const workflow = new IdentityShieldWorkflow();
  PatternValidator.validate(workflow, PatternValidator.generateLSPInfo(workflow));
}

// ==================== APPLE ID ORCHESTRATOR ====================
export class MainOrchestrator {
  constructor() {
    this.config = null;
    this.orchestrator = null;
    this.initialized = false;
  }

  async initialize(configPath = `${import.meta.dir}/../config/config.json`) {
    try {
      console.info('🚀 Initializing Apple ID Creation System...');
      
      // Load configuration
      const configFile = Bun.file(configPath);
      if (!await configFile.exists()) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      
      const configContent = await configFile.text();
      this.config = JSON.parse(configContent);
      
      // Initialize orchestrator if available
      try {
        const { AppleIDOrchestrator } = await import('/Users/nolarose/tmp/clones/duo/duo-automation/utils/orchestration/apple-id-orchestrator.js');
        this.orchestrator = new AppleIDOrchestrator(this.config);
        await this.orchestrator.initialize();
        this.initialized = true;
        console.info('✅ Apple ID Orchestrator Ready');
      } catch (error) {
        if (error.message.includes('Cannot find package')) {
          console.info('ℹ️  Apple ID Orchestrator disabled - missing dependencies:', error.message.split('from')[0]);
        } else {
          console.warn('⚠️  Apple ID Orchestrator not available:', error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      throw error;
    }
  }
}

console.info("✨ Core Services Ready.");

// Auto-initialize if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new MainOrchestrator();
  orchestrator.initialize().catch(console.error);
}
