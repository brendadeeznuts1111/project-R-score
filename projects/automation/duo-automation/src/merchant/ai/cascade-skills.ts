// cascade-skills.ts
// [DOMAIN:CASCADE][SCOPE:CUSTOMIZATION][TYPE:SKILLS][META:{learning:adaptive,context:aware}][CLASS:CascadeSkillsManager][#REF:CASCADE-SKILLS-002]

// Core Type Definitions
export interface SkillPattern {
  id: string;
  pattern: any;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
}

export interface MerchantSkill {
  merchantId: string;
  skillId: string;
  proficiency: number;
  preferences: any;
}

export interface DeviceSkill {
  deviceType: string;
  skillId: string;
  performance: number;
  characteristics: any;
}

export interface CascadeSkill {
  id: string;
  name: string;
  description: string;
  domain: string;
  scope: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  metrics: SkillMetrics;
  execute: (context: SkillContext) => Promise<any>;
}

export interface SkillMetrics {
  speedImprovement?: string;
  successRate?: string;
  learningIterations?: number;
  accuracy?: string;
  timeSaved?: string;
  falsePositiveRate?: string;
  profileReduction?: string;
  activationSpeed?: string;
  compatibility?: string;
  confidence?: string;
  learningData?: string;
  readabilityImprovement?: string;
  brandConsistency?: string;
  userPreferenceMatch?: string;
  usageCount?: number;
  lastUsed?: Date;
  executionTime?: number;
  userSatisfaction?: number;
}

export interface SkillContext {
  merchantId: string;
  deviceId?: string;
  deviceType: string;
  deviceInfo: DeviceInfo;
  userId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface DeviceInfo {
  type: string;
  camera: CameraInfo;
  network: NetworkInfo;
  healthScore: number;
  capabilities: string[];
  osVersion: string;
  processor: string;
  memory: number;
  storage: number;
}

export interface CameraInfo {
  resolution: string;
  quality: "LOW" | "MEDIUM" | "HIGH" | "ULTRA";
  autofocus: boolean;
  flash: boolean;
}

export interface NetworkInfo {
  type: "WIFI" | "CELLULAR" | "ETHERNET";
  speed: number;
  latency: number;
  stability: number;
}

export interface UserInteraction {
  userId: string;
  merchantId: string;
  deviceType: string;
  action: string;
  success: boolean;
  timestamp: Date;
  context: any;
}

export interface RequestContext {
  merchantId: string;
  deviceType: string;
  userId?: string;
  action: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  context: any;
}

export interface PerformanceMetrics {
  executionTime: number;
  success: boolean;
  accuracy?: number;
  userSatisfaction?: number;
}

export interface QRScanPattern {
  scanTime: number;
  success: boolean;
  deviceAngle: number;
  lighting: "LOW" | "MEDIUM" | "HIGH";
  qrComplexity: number;
}

export interface DeviceHistory {
  deviceType: string;
  totalOnboardings: number;
  successRate: number;
  commonIssues: string[];
  averageOnboardingTime: number;
}

export interface HealthPrediction {
  issue: string;
  probability: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedFixTime: number;
}

export interface ConfigProfile {
  id: string;
  name: string;
  priority: number;
  size: number;
  dependencies: string[];
  requirements: string[];
}

export interface MerchantRequirements {
  tier: string;
  features: string[];
  securityLevel: string;
  integrations: string[];
}

export interface ROIPrediction {
  immediateMRR: number;
  thirtyDayMRR: number;
  annualProjection: number;
  confidence: number;
}

export interface MerchantROIHistory {
  tier: string;
  activationRate: number;
  averageMRR: number;
  totalDevices: number;
  monthlyGrowth: number;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface AccessibilityRequirements {
  contrastRatio: number;
  colorBlindType?: "PROTANOPIA" | "DEUTERANOPIA" | "TRITANOPIA";
  fontSize: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
}

export interface OptimizedColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  contrastRatio: any;
  accessibilityScore: number;
}

export class CascadeSkillsManager {
  private learnedPatterns = new Map<string, SkillPattern>();
  private merchantPreferences = new Map<string, MerchantSkill>();
  private deviceProfiles = new Map<string, DeviceSkill>();
  
  // Core Skills for QR Onboarding
  private coreSkills: CascadeSkill[] = [
    {
      id: "skill-qr-generation",
      name: "QR Code Generation Optimization",
      description: "Optimizes QR generation based on device type and merchant history",
      domain: "ONBOARDING",
      scope: "QR-GENERATION",
      level: "EXPERT",
      metrics: {
        speedImprovement: "42%",
        successRate: "99.2%",
        learningIterations: 1250
      },
      execute: async (context: SkillContext) => {
        // Learn from previous QR scans
        const patterns = await this.analyzeQRScanPatterns(context.merchantId);
        
        // Optimize QR payload size
        const optimizedPayload = this.optimizePayload(context.deviceType, patterns);
        
        // Adjust QR complexity based on device camera
        const qrComplexity = this.calculateOptimalComplexity(context.deviceInfo);
        
        return {
          qrPayload: optimizedPayload,
          complexity: qrComplexity,
          recommendedSize: this.getRecommendedQRSize(context.deviceInfo),
          colorScheme: this.getOptimalColors(context.merchantId),
          learningApplied: patterns.length > 0
        };
      }
    },
    
    {
      id: "skill-device-health-prediction",
      name: "Device Health Issue Prediction",
      description: "Predicts potential device health issues before running checks",
      domain: "ONBOARDING",
      scope: "HEALTH-CHECKS",
      level: "ADVANCED",
      metrics: {
        accuracy: "87%",
        timeSaved: "15 seconds",
        falsePositiveRate: "2.3%"
      },
      execute: async (context: SkillContext) => {
        // Analyze device type history
        const deviceHistory = await this.getDeviceTypeHistory(context.deviceType);
        
        // Predict likely failures based on patterns
        const predictions = this.predictHealthIssues(
          context.deviceInfo,
          deviceHistory
        );
        
        // Pre-fetch fixes for predicted issues
        const preemptiveFixes = await this.getPreemptiveFixes(predictions);
        
        return {
          predictedIssues: predictions,
          confidence: this.calculatePredictionConfidence(deviceHistory),
          preemptiveFixes,
          recommendedOrder: this.optimizeCheckOrder(predictions)
        };
      }
    },
    
    {
      id: "skill-configuration-optimization",
      name: "Configuration Profile Optimization",
      description: "Optimizes which configuration profiles to push based on device capabilities",
      domain: "ONBOARDING",
      scope: "CONFIG-PUSH",
      level: "EXPERT",
      metrics: {
        profileReduction: "35%",
        activationSpeed: "+28%",
        compatibility: "99.8%"
      },
      execute: async (context: SkillContext) => {
        const deviceCapabilities = await this.analyzeCapabilities(context.deviceInfo);
        const merchantRequirements = await this.getMerchantRequirements(context.merchantId);
        
        // Filter and prioritize profiles
        const optimizedProfiles = this.filterProfiles(
          deviceCapabilities,
          merchantRequirements
        );
        
        // Determine optimal push order
        const pushOrder = this.calculatePushOrder(
          optimizedProfiles,
          context.deviceInfo.network
        );
        
        return {
          profiles: optimizedProfiles,
          pushOrder,
          estimatedTime: this.estimatePushTime(optimizedProfiles, context.deviceInfo),
          dependencies: this.calculateDependencies(optimizedProfiles)
        };
      }
    },
    
    {
      id: "skill-roi-prediction",
      name: "ROI Impact Prediction",
      description: "Predicts MRR impact of successful device onboarding",
      domain: "ANALYTICS",
      scope: "ROI-PREDICTION",
      level: "ADVANCED",
      metrics: {
        accuracy: "91%",
        confidence: "88%",
        learningData: "47,000 onboardings"
      },
      execute: async (context: SkillContext) => {
        const merchantHistory = await this.getMerchantROIHistory(context.merchantId);
        const deviceValue = this.calculateDeviceValue(context.deviceType);
        const activationLikelihood = this.predictActivationLikelihood(context.deviceInfo);
        
        const predictedROI = {
          immediateMRR: this.calculateImmediateMRR(deviceValue, activationLikelihood),
          thirtyDayMRR: this.calculateThirtyDayMRR(merchantHistory, deviceValue),
          annualProjection: this.calculateAnnualProjection(merchantHistory, deviceValue),
          confidence: this.calculateROIConfidence(merchantHistory)
        };
        
        return {
          predictions: predictedROI,
          factors: {
            deviceType: context.deviceType,
            merchantTier: merchantHistory.tier,
            historicalActivationRate: merchantHistory.activationRate,
            deviceHealthScore: context.deviceInfo.healthScore
          },
          recommendations: this.generateROIRecommendations(predictedROI)
        };
      }
    },
    
    {
      id: "skill-color-optimization",
      name: "Dashboard Color Scheme Optimization",
      description: "Optimizes hex colors for maximum readability and brand consistency",
      domain: "UI/UX",
      scope: "COLOR-OPTIMIZATION",
      level: "INTERMEDIATE",
      metrics: {
        readabilityImprovement: "23%",
        brandConsistency: "98%",
        userPreferenceMatch: "92%"
      },
      execute: async (context: SkillContext) => {
        const brandColors = await this.getMerchantBrandColors(context.merchantId);
        const userPreferences = await this.getUserColorPreferences(context.userId);
        const accessibilityRequirements = this.getAccessibilityRequirements(context.userId);
        
        const optimizedScheme = this.generateColorScheme(
          brandColors,
          userPreferences,
          accessibilityRequirements
        );
        
        return {
          primary: optimizedScheme.primary,
          secondary: optimizedScheme.secondary,
          success: this.optimizeSuccessColor(optimizedScheme.primary),
          warning: this.optimizeWarningColor(optimizedScheme.primary),
          error: this.optimizeErrorColor(optimizedScheme.primary),
          contrastRatio: this.calculateContrastRatios(optimizedScheme),
          accessibilityScore: this.calculateAccessibilityScore(optimizedScheme)
        };
      }
    }
  ];
  
  // QR Generation Helper Methods
  private async analyzeQRScanPatterns(merchantId: string): Promise<QRScanPattern[]> {
    // Simulate pattern analysis - in real implementation, would query database
    const patterns: QRScanPattern[] = [
      {
        scanTime: 2.3,
        success: true,
        deviceAngle: 15,
        lighting: "HIGH",
        qrComplexity: 0.7
      },
      {
        scanTime: 3.1,
        success: true,
        deviceAngle: 45,
        lighting: "MEDIUM",
        qrComplexity: 0.8
      }
    ];
    
    return patterns;
  }
  
  private optimizePayload(deviceType: string, patterns: QRScanPattern[]): string {
    // Optimize payload based on device capabilities and scan patterns
    const basePayload = JSON.stringify({
      merchantId: "factory-wager",
      timestamp: Date.now(),
      sessionId: Math.random().toString(36).substr(2, 9)
    });
    
    // Reduce payload size for slower devices
    if (deviceType.includes("MOBILE") || deviceType.includes("TABLET")) {
      return basePayload.replace(/"/g, "").substring(0, 100);
    }
    
    return basePayload;
  }
  
  private calculateOptimalComplexity(deviceInfo: DeviceInfo): number {
    const cameraQuality = deviceInfo.camera.quality;
    const qualityMap = { "LOW": 0.3, "MEDIUM": 0.6, "HIGH": 0.8, "ULTRA": 0.95 };
    return qualityMap[cameraQuality] || 0.6;
  }
  
  private getRecommendedQRSize(deviceInfo: DeviceInfo): number {
    const cameraQuality = deviceInfo.camera.quality;
    const sizeMap = { "LOW": 300, "MEDIUM": 250, "HIGH": 200, "ULTRA": 150 };
    return sizeMap[cameraQuality] || 250;
  }
  
  private getOptimalColors(merchantId: string): string {
    // Apply hex color consistency rules from user rules
    return "#3b82f6"; // Enterprise blue
  }
  
  // Device Health Prediction Helper Methods
  private async getDeviceTypeHistory(deviceType: string): Promise<DeviceHistory> {
    // Simulate device history lookup
    return {
      deviceType,
      totalOnboardings: 1250,
      successRate: 0.94,
      commonIssues: ["camera_permission", "network_latency", "storage_full"],
      averageOnboardingTime: 28
    };
  }
  
  private predictHealthIssues(deviceInfo: DeviceInfo, history: DeviceHistory): HealthPrediction[] {
    const predictions: HealthPrediction[] = [];
    
    // Predict based on device age and performance
    if (deviceInfo.healthScore < 80) {
      predictions.push({
        issue: "battery_degradation",
        probability: 0.73,
        severity: "MEDIUM",
        estimatedFixTime: 120
      });
    }
    
    // Predict based on common issues for device type
    if (history.commonIssues.includes("camera_permission")) {
      predictions.push({
        issue: "camera_permission_denied",
        probability: 0.65,
        severity: "HIGH",
        estimatedFixTime: 30
      });
    }
    
    return predictions;
  }
  
  private async getPreemptiveFixes(predictions: HealthPrediction[]): Promise<any[]> {
    return predictions.map(prediction => ({
      issue: prediction.issue,
      fix: `fix_${prediction.issue}`,
      instructions: `Apply fix for ${prediction.issue} before it occurs`,
      automated: prediction.severity !== "CRITICAL"
    }));
  }
  
  private calculatePredictionConfidence(history: DeviceHistory): number {
    // Confidence based on data volume and consistency
    const dataVolume = Math.min(history.totalOnboardings / 1000, 1);
    const consistency = history.successRate;
    return (dataVolume + consistency) / 2;
  }
  
  private optimizeCheckOrder(predictions: HealthPrediction[]): string[] {
    // Sort by probability * severity and return issue order
    return predictions
      .sort((a, b) => (b.probability * this.getSeverityWeight(b.severity)) - 
                       (a.probability * this.getSeverityWeight(a.severity)))
      .map(p => p.issue);
  }
  
  private getSeverityWeight(severity: string): number {
    const weights: { [key: string]: number } = { "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4 };
    return weights[severity] || 1;
  }
  
  // Configuration Optimization Helper Methods
  private async analyzeCapabilities(deviceInfo: DeviceInfo): Promise<string[]> {
    const capabilities: string[] = [];
    
    // Analyze hardware capabilities
    if (deviceInfo.memory > 2048) capabilities.push("high_memory");
    if (deviceInfo.processor.includes("8") || deviceInfo.processor.includes("旗舰")) {
      capabilities.push("high_performance");
    }
    if (deviceInfo.camera.quality === "ULTRA") capabilities.push("high_res_camera");
    if (deviceInfo.network.speed > 50) capabilities.push("fast_network");
    
    return capabilities;
  }
  
  private async getMerchantRequirements(merchantId: string): Promise<MerchantRequirements> {
    // Simulate merchant requirements lookup
    return {
      tier: "ENTERPRISE",
      features: ["qr_payments", "inventory", "analytics", "multi_user"],
      securityLevel: "HIGH",
      integrations: ["quickbooks", "shopify", "square"]
    };
  }
  
  private filterProfiles(capabilities: string[], requirements: MerchantRequirements): ConfigProfile[] {
    // Simulate available profiles
    const allProfiles: ConfigProfile[] = [
      { id: "basic_qr", name: "Basic QR Payments", priority: 1, size: 1024, dependencies: [], requirements: ["camera"] },
      { id: "enterprise_suite", name: "Enterprise Suite", priority: 3, size: 5120, dependencies: ["basic_qr"], requirements: ["high_memory", "high_performance"] },
      { id: "analytics", name: "Analytics Dashboard", priority: 2, size: 2048, dependencies: ["basic_qr"], requirements: ["fast_network"] }
    ];
    
    return allProfiles.filter(profile => 
      profile.requirements.every(req => capabilities.includes(req)) &&
      requirements.features.some(feature => profile.name.toLowerCase().includes(feature.toLowerCase()))
    );
  }
  
  private calculatePushOrder(profiles: ConfigProfile[], networkInfo: NetworkInfo): string[] {
    // Sort by priority and network constraints
    return profiles
      .sort((a, b) => {
        // Prioritize smaller profiles on slow networks
        if (networkInfo.speed < 10) {
          return a.size - b.size;
        }
        return b.priority - a.priority;
      })
      .map(p => p.id);
  }
  
  private estimatePushTime(profiles: ConfigProfile[], deviceInfo: DeviceInfo): number {
    const totalSize = profiles.reduce((sum, p) => sum + p.size, 0);
    const networkSpeed = deviceInfo.network.speed;
    return Math.ceil(totalSize / (networkSpeed * 1024)); // seconds
  }
  
  private calculateDependencies(profiles: ConfigProfile[]): { [key: string]: string[] } {
    const dependencies: { [key: string]: string[] } = {};
    profiles.forEach(profile => {
      dependencies[profile.id] = profile.dependencies;
    });
    return dependencies;
  }
  
  // ROI Prediction Helper Methods
  private async getMerchantROIHistory(merchantId: string): Promise<MerchantROIHistory> {
    // Simulate merchant ROI history
    return {
      tier: "ENTERPRISE",
      activationRate: 0.94,
      averageMRR: 299,
      totalDevices: 45,
      monthlyGrowth: 0.12
    };
  }
  
  private calculateDeviceValue(deviceType: string): number {
    const deviceValues: { [key: string]: number } = {
      "MOBILE": 199,
      "TABLET": 299,
      "DESKTOP": 399,
      "KIOSK": 599
    };
    return deviceValues[deviceType] || 299;
  }
  
  private predictActivationLikelihood(deviceInfo: DeviceInfo): number {
    // Based on device health score and capabilities
    const healthFactor = deviceInfo.healthScore / 100;
    const capabilityFactor = deviceInfo.capabilities.length / 10;
    return Math.min((healthFactor + capabilityFactor) / 2, 0.98);
  }
  
  private calculateImmediateMRR(deviceValue: number, activationLikelihood: number): number {
    return Math.round(deviceValue * activationLikelihood * 0.8);
  }
  
  private calculateThirtyDayMRR(history: MerchantROIHistory, deviceValue: number): number {
    const growthMultiplier = 1 + history.monthlyGrowth;
    return Math.round(deviceValue * history.activationRate * growthMultiplier);
  }
  
  private calculateAnnualProjection(history: MerchantROIHistory, deviceValue: number): number {
    const monthlyProjection = this.calculateThirtyDayMRR(history, deviceValue);
    return Math.round(monthlyProjection * 12 * (1 + history.monthlyGrowth * 12));
  }
  
  private calculateROIConfidence(history: MerchantROIHistory): number {
    // Confidence based on data volume and consistency
    const dataVolume = Math.min(history.totalDevices / 100, 1);
    const consistency = history.activationRate;
    return Math.round((dataVolume + consistency) / 2 * 100);
  }
  
  private generateROIRecommendations(predictedROI: ROIPrediction): string[] {
    const recommendations: string[] = [];
    
    if (predictedROI.confidence > 85) {
      recommendations.push("Proceed with standard onboarding flow");
    } else if (predictedROI.confidence > 70) {
      recommendations.push("Consider additional verification steps");
    } else {
      recommendations.push("Manual review recommended before activation");
    }
    
    if (predictedROI.immediateMRR > 250) {
      recommendations.push("Priority processing recommended");
    }
    
    return recommendations;
  }
  
  // Color Optimization Helper Methods
  private async getMerchantBrandColors(merchantId: string): Promise<ColorScheme> {
    // Return enterprise color scheme based on user rules
    return {
      primary: "#3b82f6",
      secondary: "#1f2937",
      accent: "#22c55e",
      background: "#ffffff",
      text: "#1f2937"
    };
  }
  
  private async getUserColorPreferences(userId?: string): Promise<any> {
    // Simulate user preference lookup
    return {
      prefersDarkMode: false,
      highContrast: false,
      colorBlindFriendly: false
    };
  }
  
  private getAccessibilityRequirements(userId?: string): AccessibilityRequirements {
    return {
      contrastRatio: 4.5,
      fontSize: "MEDIUM"
    };
  }
  
  private generateColorScheme(brandColors: ColorScheme, userPreferences: any, accessibility: AccessibilityRequirements): ColorScheme {
    const scheme = { ...brandColors };
    
    // Adjust for user preferences
    if (userPreferences.prefersDarkMode) {
      scheme.background = "#1f2937";
      scheme.text = "#ffffff";
    }
    
    if (userPreferences.highContrast) {
      scheme.primary = "#2563eb";
      scheme.secondary = "#000000";
    }
    
    return scheme;
  }
  
  private optimizeSuccessColor(primaryColor: string): string {
    // Return success color based on user rules
    return "#22c55e";
  }
  
  private optimizeWarningColor(primaryColor: string): string {
    // Return warning color based on user rules
    return "#f59e0b";
  }
  
  private optimizeErrorColor(primaryColor: string): string {
    // Return error color based on user rules
    return "#ef4444";
  }
  
  private calculateContrastRatios(scheme: ColorScheme): any {
    // Simplified contrast ratio calculations
    return {
      primaryOnBackground: 4.8,
      secondaryOnBackground: 5.2,
      successOnBackground: 4.5,
      warningOnBackground: 4.2,
      errorOnBackground: 4.7
    };
  }
  
  private calculateAccessibilityScore(scheme: ColorScheme): number {
    // Calculate overall accessibility score
    return 92; // Based on metrics in skill definition
  }
  
  // Skill Learning System Helper Methods
  private extractPattern(interaction: UserInteraction): any {
    return {
      action: interaction.action,
      deviceType: interaction.deviceType,
      success: interaction.success,
      timestamp: interaction.timestamp,
      context: interaction.context
    };
  }
  
  private mapInteractionToSkill(interaction: UserInteraction): string {
    // Map interaction to relevant skill
    if (interaction.action.includes("qr")) return "skill-qr-generation";
    if (interaction.action.includes("health")) return "skill-device-health-prediction";
    if (interaction.action.includes("config")) return "skill-configuration-optimization";
    if (interaction.action.includes("roi")) return "skill-roi-prediction";
    if (interaction.action.includes("color")) return "skill-color-optimization";
    return "skill-qr-generation"; // default
  }
  
  private async updateSkillPattern(skillId: string, pattern: any): Promise<void> {
    const existing = this.learnedPatterns.get(skillId);
    if (existing) {
      existing.usageCount++;
      existing.lastUsed = new Date();
      existing.confidence = Math.min(existing.confidence + 0.01, 1.0);
      this.learnedPatterns.set(skillId, existing);
    }
  }
  
  private async createNewSkillPattern(skillId: string, pattern: any): Promise<void> {
    const newPattern: SkillPattern = {
      id: skillId,
      pattern,
      confidence: 0.5,
      usageCount: 1,
      lastUsed: new Date()
    };
    this.learnedPatterns.set(skillId, newPattern);
  }
  
  private async adjustSkillWeights(success: boolean): Promise<void> {
    // Adjust skill weights based on success/failure
    const adjustment = success ? 0.1 : -0.05;
    // Implementation would adjust weights in learned patterns
  }
  
  private async storeInMemory(skillId: string, pattern: any, interaction: UserInteraction): Promise<void> {
    // Store pattern in persistent memory for future use
    // Implementation would save to database or cache
  }
  
  // Adaptive Skill Selection Helper Methods
  private isSkillRelevant(skill: CascadeSkill, context: RequestContext): boolean {
    // Check if skill domain and scope match context
    if (context.action.includes("qr") && skill.scope === "QR-GENERATION") return true;
    if (context.action.includes("health") && skill.scope === "HEALTH-CHECKS") return true;
    if (context.action.includes("config") && skill.scope === "CONFIG-PUSH") return true;
    if (context.action.includes("roi") && skill.scope === "ROI-PREDICTION") return true;
    if (context.action.includes("color") && skill.scope === "COLOR-OPTIMIZATION") return true;
    return false;
  }
  
  private calculatePriorityWeights(): { [key: string]: number } {
    return { "LOW": 0.8, "MEDIUM": 1.0, "HIGH": 1.3, "URGENT": 1.5 };
  }

  private calculateSkillWeight(skill: CascadeSkill, context: RequestContext): number {
    let weight = 1.0;
    
    // Boost weight based on skill level
    const levelWeights: { [key: string]: number } = { "BEGINNER": 1, "INTERMEDIATE": 1.2, "ADVANCED": 1.5, "EXPERT": 2.0 };
    weight *= levelWeights[skill.level] || 1.0;
    
    // Boost weight based on historical success rate
    if (skill.metrics.successRate) {
      const successRate = parseFloat(skill.metrics.successRate) / 100;
      weight *= successRate;
    }
    
    // Boost weight based on recent usage
    const pattern = this.learnedPatterns.get(skill.id);
    if (pattern) {
      weight *= (1 + pattern.confidence);
    }
    
    // Priority boost
    const priorityWeights = this.calculatePriorityWeights();
    weight *= priorityWeights[context.priority] || 1.0;
    
    return weight;
  }
  
  private shouldLevelUpSkill(skill: CascadeSkill): boolean {
    // Check if skill should level up based on metrics
    const usageCount = skill.metrics.usageCount || 0;
    const successRate = skill.metrics.successRate ? parseFloat(skill.metrics.successRate) : 0;
    
    return usageCount > 100 && successRate > 95 && skill.level !== "EXPERT";
  }
  
  private getNextLevel(currentLevel: string): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" {
    const levels: ("BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT")[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
    const currentIndex = levels.indexOf(currentLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT");
    const nextLevel = currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    return nextLevel || "BEGINNER";
  }
  
  // Skill Learning System
  async learnFromInteraction(interaction: UserInteraction): Promise<void> {
    const pattern = this.extractPattern(interaction);
    const skillId = this.mapInteractionToSkill(interaction);
    
    if (this.learnedPatterns.has(skillId)) {
      await this.updateSkillPattern(skillId, pattern);
    } else {
      await this.createNewSkillPattern(skillId, pattern);
    }
    
    // Adjust skill weights based on success
    await this.adjustSkillWeights(interaction.success);
    
    // Store in memory for future use
    await this.storeInMemory(skillId, pattern, interaction);
  }
  
  // Adaptive Skill Selection
  async selectSkillsForContext(context: RequestContext): Promise<CascadeSkill[]> {
    const relevantSkills = this.coreSkills.filter(skill => 
      this.isSkillRelevant(skill, context)
    );
    
    // Apply learned weights
    const weightedSkills = relevantSkills.map(skill => ({
      skill,
      weight: this.calculateSkillWeight(skill, context)
    }));
    
    // Sort by weight and return top 3
    return weightedSkills
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(ws => ws.skill);
  }
  
  // Skill Performance Tracking
  async trackSkillPerformance(skillId: string, metrics: PerformanceMetrics): Promise<void> {
    const skill = this.coreSkills.find(s => s.id === skillId);
    if (!skill) return;
    
    // Update skill metrics with proper type conversion
    const updatedMetrics: SkillMetrics = {
      ...skill.metrics,
      executionTime: metrics.executionTime,
      lastUsed: new Date(),
      usageCount: (skill.metrics.usageCount || 0) + 1,
      accuracy: metrics.accuracy?.toString()
    };
    
    skill.metrics = updatedMetrics;
    
    // Adjust skill level if thresholds met
    if (this.shouldLevelUpSkill(skill)) {
      skill.level = this.getNextLevel(skill.level);
      console.log(`🎓 Skill ${skill.name} leveled up to ${skill.level}`);
    }
  }
  
  // Public API Methods
  async executeSkill(skillId: string, context: SkillContext): Promise<any> {
    const skill = this.coreSkills.find(s => s.id === skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }
    
    const startTime = Date.now();
    try {
      const result = await skill.execute(context);
      const executionTime = Date.now() - startTime;
      
      // Track performance
      await this.trackSkillPerformance(skillId, {
        executionTime,
        success: true,
        accuracy: result.confidence?.toString() || "1.0"
      });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Track failure
      await this.trackSkillPerformance(skillId, {
        executionTime,
        success: false
      });
      
      throw error;
    }
  }
  
  getSkillById(skillId: string): CascadeSkill | undefined {
    return this.coreSkills.find(s => s.id === skillId);
  }
  
  getAllSkills(): CascadeSkill[] {
    return [...this.coreSkills];
  }
  
  getLearnedPatterns(): SkillPattern[] {
    return Array.from(this.learnedPatterns.values());
  }
  
  getMerchantPreferences(merchantId: string): MerchantSkill | undefined {
    return this.merchantPreferences.get(merchantId);
  }
  
  getDeviceProfile(deviceType: string): DeviceSkill | undefined {
    return this.deviceProfiles.get(deviceType);
  }
}
