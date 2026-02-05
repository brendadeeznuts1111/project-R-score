// cascade-skills-demo.ts
// Usage example for CascadeSkillsManager

import { CascadeSkillsManager, type SkillContext, type RequestContext, type UserInteraction } from './cascade-skills';

async function demonstrateCascadeSkills() {
  const skillsManager = new CascadeSkillsManager();
  
  console.log('🚀 Cascade Skills Manager Demo');
  console.log('================================');
  
  // Example 1: QR Generation Skill
  console.log('\n📱 QR Generation Skill');
  const qrContext: SkillContext = {
    merchantId: "factory-wager",
    deviceType: "MOBILE",
    deviceInfo: {
      type: "MOBILE",
      camera: {
        resolution: "1080p",
        quality: "HIGH",
        autofocus: true,
        flash: true
      },
      network: {
        type: "WIFI",
        speed: 100,
        latency: 20,
        stability: 0.95
      },
      healthScore: 92,
      capabilities: ["high_memory", "fast_network", "high_res_camera"],
      osVersion: "iOS 17.0",
      processor: "A15 Bionic",
      memory: 6144,
      storage: 128000
    },
    userId: "user-123",
    timestamp: new Date()
  };
  
  try {
    const qrResult = await skillsManager.executeSkill("skill-qr-generation", qrContext);
    console.log('✅ QR Generation Result:', qrResult);
  } catch (error) {
    console.error('❌ QR Generation Error:', error);
  }
  
  // Example 2: Device Health Prediction
  console.log('\n🔍 Device Health Prediction');
  try {
    const healthResult = await skillsManager.executeSkill("skill-device-health-prediction", qrContext);
    console.log('✅ Health Prediction Result:', healthResult);
  } catch (error) {
    console.error('❌ Health Prediction Error:', error);
  }
  
  // Example 3: Configuration Optimization
  console.log('\n⚙️ Configuration Optimization');
  try {
    const configResult = await skillsManager.executeSkill("skill-configuration-optimization", qrContext);
    console.log('✅ Configuration Result:', configResult);
  } catch (error) {
    console.error('❌ Configuration Error:', error);
  }
  
  // Example 4: ROI Prediction
  console.log('\n💰 ROI Prediction');
  try {
    const roiResult = await skillsManager.executeSkill("skill-roi-prediction", qrContext);
    console.log('✅ ROI Prediction Result:', roiResult);
  } catch (error) {
    console.error('❌ ROI Prediction Error:', error);
  }
  
  // Example 5: Color Optimization
  console.log('\n🎨 Color Optimization');
  try {
    const colorResult = await skillsManager.executeSkill("skill-color-optimization", qrContext);
    console.log('✅ Color Optimization Result:', colorResult);
  } catch (error) {
    console.error('❌ Color Optimization Error:', error);
  }
  
  // Example 6: Adaptive Skill Selection
  console.log('\n🧠 Adaptive Skill Selection');
  const requestContext: RequestContext = {
    merchantId: "factory-wager",
    deviceType: "MOBILE",
    userId: "user-123",
    action: "qr_scan_optimization",
    priority: "HIGH",
    context: { flow: "onboarding" }
  };
  
  try {
    const selectedSkills = await skillsManager.selectSkillsForContext(requestContext);
    console.log('✅ Selected Skills:', selectedSkills.map(s => s.name));
  } catch (error) {
    console.error('❌ Skill Selection Error:', error);
  }
  
  // Example 7: Learning from Interaction
  console.log('\n📚 Learning from Interaction');
  const interaction: UserInteraction = {
    userId: "user-123",
    merchantId: "factory-wager",
    deviceType: "MOBILE",
    action: "qr_scan_success",
    success: true,
    timestamp: new Date(),
    context: { scanTime: 2.1, qrComplexity: 0.7 }
  };
  
  try {
    await skillsManager.learnFromInteraction(interaction);
    console.log('✅ Learning completed');
  } catch (error) {
    console.error('❌ Learning Error:', error);
  }
  
  // Example 8: Performance Tracking
  console.log('\n📊 Performance Tracking');
  try {
    await skillsManager.trackSkillPerformance("skill-qr-generation", {
      executionTime: 150,
      success: true,
      accuracy: 0.95,
      userSatisfaction: 4.8
    });
    console.log('✅ Performance tracked');
  } catch (error) {
    console.error('❌ Performance Tracking Error:', error);
  }
  
  // Display final state
  console.log('\n📈 Final Skills State');
  const allSkills = skillsManager.getAllSkills();
  allSkills.forEach(skill => {
    console.log(`🔹 ${skill.name} (${skill.level}) - Usage: ${skill.metrics.usageCount || 0}`);
  });
  
  const learnedPatterns = skillsManager.getLearnedPatterns();
  console.log(`🧠 Learned Patterns: ${learnedPatterns.length}`);
}

// Enterprise Dashboard Integration Example
async function demonstrateEnterpriseIntegration() {
  console.log('\n\n🏢 Enterprise Dashboard Integration');
  console.log('=======================================');
  
  const skillsManager = new CascadeSkillsManager();
  
  // Simulate enterprise onboarding flow
  const enterpriseContext: SkillContext = {
    merchantId: "factory-wager",
    deviceType: "TABLET",
    deviceInfo: {
      type: "TABLET",
      camera: {
        resolution: "4K",
        quality: "ULTRA",
        autofocus: true,
        flash: true
      },
      network: {
        type: "WIFI",
        speed: 500,
        latency: 10,
        stability: 0.99
      },
      healthScore: 98,
      capabilities: ["high_memory", "high_performance", "high_res_camera", "fast_network"],
      osVersion: "iPadOS 17.0",
      processor: "M2",
      memory: 16384,
      storage: 512000
    },
    userId: "enterprise-admin",
    timestamp: new Date()
  };
  
  try {
    // Run all skills for enterprise onboarding
    const results = await Promise.all([
      skillsManager.executeSkill("skill-qr-generation", enterpriseContext),
      skillsManager.executeSkill("skill-device-health-prediction", enterpriseContext),
      skillsManager.executeSkill("skill-configuration-optimization", enterpriseContext),
      skillsManager.executeSkill("skill-roi-prediction", enterpriseContext),
      skillsManager.executeSkill("skill-color-optimization", enterpriseContext)
    ]);
    
    console.log('✅ Enterprise Onboarding Complete');
    console.log('📊 Combined Results:', {
      qrOptimized: results[0].learningApplied,
      healthIssues: results[1].predictedIssues.length,
      configProfiles: results[2].profiles.length,
      predictedMRR: results[3].predictions.immediateMRR,
      colorScheme: results[4].primary
    });
    
    // Track 28-second rule compliance
    const totalTime = results.reduce((sum, result) => sum + (result.estimatedTime || 0), 0);
    console.log(`⏱️ Total Processing Time: ${totalTime}s (Target: 28s)`);
    console.log(`🎯 28-Second Rule: ${totalTime <= 28 ? '✅ COMPLIANT' : '⚠️ NEEDS OPTIMIZATION'}`);
    
  } catch (error) {
    console.error('❌ Enterprise Integration Error:', error);
  }
}

// Run demonstrations
// Check if running as main module (ESM compatible)
// Use proper type assertions for cross-platform compatibility
const globalProcess = (globalThis as any).process;
const isMainModule = typeof globalProcess !== 'undefined' && 
  globalProcess.argv && 
  import.meta.url === `file://${globalProcess.argv[1]}`;

if (isMainModule) {
  demonstrateCascadeSkills()
    .then(() => demonstrateEnterpriseIntegration())
    .then(() => {
      console.log('\n🎉 All demonstrations completed successfully!');
      // Exit process for non-browser environments
      if (globalProcess && globalProcess.exit) {
        globalProcess.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Demonstration failed:', error);
      // Exit process for non-browser environments
      if (globalProcess && globalProcess.exit) {
        globalProcess.exit(1);
      }
    });
}

export { demonstrateCascadeSkills, demonstrateEnterpriseIntegration };
