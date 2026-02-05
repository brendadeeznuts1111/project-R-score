// src/dashboard/dispute-dashboard.ts
import { DisputeSystem, DisputeMatrixRow, DisputeStatus } from '../disputes/dispute-system';
import { DeepLinkGenerator, Dispute } from '../deeplinks/deeplink-generator';
import { MatrixConnectionManager, AIAnalyticsEngine, EnhancedScopeRow } from '../@core/enhanced-matrix-system';
import { ScopeDetector, PlatformScopeAdapter, ScopeConfig, DomainMapping } from '../../packages/@core/utils/scope-detector.ts';
import { SecurityMetric, enhanceSecurityMetric, enhanceSecurityMetrics } from '../../tools/types/enhance-metric.ts';
import { PerfMetric } from '../../tools/types/perf-metric.ts';

export interface QuickAction {
  title: string;
  description: string;
  deepLink: string;
  icon: string;
  category: 'customer' | 'merchant' | 'admin';
}

export interface DisputeDashboardData {
  matrix: DisputeMatrixRow[];
  quickActions: QuickAction[];
  systemStats: {
    totalDisputes: number;
    activeDisputes: number;
    resolvedToday: number;
    avgResolutionTime: string;
    refundRate: string;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    deepLink: string;
  }>;
  // AI-powered enhancements
  aiInsights?: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    predictedVolume: number;
    recommendedActions: string[];
    anomalyAlerts: Array<{
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
    }>;
    performanceMetrics: {
      avgResponseTime: number;
      accuracy: number;
      confidence: number;
    };
  };
  // Scope management
  scopeInfo?: {
    detectedScope: string;
    servingDomain: string;
    platform: string;
    environment: 'development' | 'staging' | 'production';
    features: string[];
    limitations: string[];
    connectionPool: {
      maxConnections: number;
      keepAlive: boolean;
      timeout: number;
    };
    aiCapabilities: {
      enabled: boolean;
      models: Array<{
        name: string;
        type: string;
        accuracy: number;
      }>;
      realTimeAnalytics: boolean;
    };
    // Enhanced scope detector integration
    scopeConfig: ScopeConfig;
    platformStorage: {
      type: string;
      encryption: string;
      isolation: string;
      persist: string;
    };
    securityFeatures: {
      available: string[];
      recommended: string[];
      limitations: string[];
    };
    validation: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
    domainMappings: DomainMapping[];
  };
  // Security metrics
  securityMetrics?: {
    overallScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
    lastVerified: string;
    metrics: SecurityMetric[];
    categories: {
      authentication: SecurityMetric[];
      authorization: SecurityMetric[];
      encryption: SecurityMetric[];
      monitoring: SecurityMetric[];
      compliance: SecurityMetric[];
    };
    trends: {
      improving: string[];
      degrading: string[];
      stable: string[];
    };
  };
}

export class DisputeDashboard {
  private disputeSystem = new DisputeSystem();
  private deepLinkGenerator = new DeepLinkGenerator();
  private matrixManager: MatrixConnectionManager;
  private aiEngine: AIAnalyticsEngine;
  private currentScope: EnhancedScopeRow | null = null;
  private scopeConfig: ScopeConfig | null = null;
  
  constructor() {
    this.matrixManager = new MatrixConnectionManager();
    this.aiEngine = AIAnalyticsEngine.getInstance();
    
    // Initialize scope detector
    this.scopeConfig = ScopeDetector.getScopeConfig();
    console.log(`🎯 ScopeDetector initialized: ${this.scopeConfig.scope} for ${this.scopeConfig.domain}`);
  }
  
  /**
   * Get complete dashboard data with AI insights, scope information, and security metrics
   */
  async getDashboardData(): Promise<DisputeDashboardData> {
    // Detect and initialize scope
    await this.initializeScope();
    
    const baseData = {
      matrix: this.disputeSystem.getDisputeMatrix(),
      quickActions: this.getQuickActions(),
      systemStats: this.getSystemStats(),
      recentActivity: this.getRecentActivity()
    };
    
    try {
      // Add AI-powered insights
      const aiInsights = await this.getAIInsights();
      
      // Add scope information
      const scopeInfo = this.getScopeInfo();
      
      // Add security metrics
      const securityMetrics = await this.getSecurityMetrics();
      
      return {
        ...baseData,
        aiInsights,
        scopeInfo,
        securityMetrics
      };
    } catch (error) {
      console.warn('Enhanced features unavailable:', error.message);
      return {
        ...baseData,
        scopeInfo: this.getScopeInfo(),
        securityMetrics: await this.getSecurityMetrics()
      };
    }
  }
  
  /**
   * Initialize scope detection and configuration
   */
  private async initializeScope(): Promise<void> {
    try {
      this.currentScope = await this.matrixManager.detectScope();
      console.log(`🎯 Scope initialized: ${this.currentScope.detectedScope} for ${this.currentScope.servingDomain}`);
    } catch (error) {
      console.error('Failed to initialize scope:', error);
      // Fallback to default scope
      this.currentScope = this.getDefaultScope();
    }
  }
  
  /**
   * Get default scope for fallback
   */
  private getDefaultScope(): EnhancedScopeRow {
    return {
      servingDomain: 'localhost',
      detectedScope: 'LOCAL-SANDBOX',
      platform: 'macOS',
      storagePathPrefix: 'local/',
      secretsBackend: 'Local Storage',
      serviceNameFormat: 'factory-wager-local-service',
      secretsFlag: 'LOCAL_DEBUG',
      bunRuntimeTZ: 'UTC',
      bunTestTZ: 'UTC',
      
      connectionConfig: {
        maxConnections: 3,
        keepAlive: false,
        timeout: 5000,
        preloadCookies: false,
        enableVerbose: false,
        retryAttempts: 1,
        preconnectDomains: []
      },
      
      featureFlags: ['LOCAL_SANDBOX', 'DEBUG_MODE'],
      bunAPIs: ['Bun.fetch'],
      strategy: 'Local development strategy',
      benefits: ['Fast iteration', 'Full debugging'],
      
      statsEnabled: false,
      dataPersistence: 'none',
      cliCommands: ['debug', 'test', 'clear']
    };
  }
  
  /**
   * Get comprehensive scope information with ScopeDetector integration
   */
  private getScopeInfo(): DisputeDashboardData['scopeInfo'] {
    if (!this.currentScope || !this.scopeConfig) {
      return null;
    }
    
    const environment = this.determineEnvironment(this.currentScope.detectedScope);
    const features = this.getScopeFeatures(this.currentScope);
    const limitations = this.getScopeLimitations(this.currentScope);
    
    // Get platform-specific storage configuration
    const platformStorage = PlatformScopeAdapter.getScopedStorage(
      process.platform, 
      this.scopeConfig.scope
    );
    
    // Get security features for current platform
    const securityFeatures = PlatformScopeAdapter.getSecurityFeatures(process.platform);
    
    // Validate scope configuration
    const validation = ScopeDetector.validateScope(this.scopeConfig);
    
    // Get all domain mappings
    const domainMappings = ScopeDetector.getDomainMappings();
    
    return {
      detectedScope: this.currentScope.detectedScope,
      servingDomain: this.currentScope.servingDomain,
      platform: this.currentScope.platform,
      environment,
      features,
      limitations,
      connectionPool: {
        maxConnections: this.currentScope.connectionConfig.maxConnections,
        keepAlive: this.currentScope.connectionConfig.keepAlive,
        timeout: this.currentScope.connectionConfig.timeout
      },
      aiCapabilities: {
        enabled: !!this.currentScope.aiAnalytics,
        models: this.currentScope.mlModels?.map(model => ({
          name: model.name,
          type: model.predictionType,
          accuracy: model.accuracy
        })) || [],
        realTimeAnalytics: this.currentScope.realTimeMetrics?.enabled || false
      },
      // Enhanced scope detector integration
      scopeConfig: this.scopeConfig,
      platformStorage: {
        type: platformStorage.type,
        encryption: platformStorage.encryption,
        isolation: platformStorage.isolation,
        persist: platformStorage.persist
      },
      securityFeatures,
      validation,
      domainMappings
    };
  }
  
  /**
   * Determine environment type from scope
   */
  private determineEnvironment(scope: string): 'development' | 'staging' | 'production' {
    switch (scope) {
      case 'ENTERPRISE':
        return 'production';
      case 'DEVELOPMENT':
        return 'staging';
      case 'LOCAL-SANDBOX':
      default:
        return 'development';
    }
  }
  
  /**
   * Get available features for current scope
   */
  private getScopeFeatures(scope: EnhancedScopeRow): string[] {
    const features = [...scope.featureFlags];
    
    if (scope.aiAnalytics) {
      features.push('AI_ANALYTICS', 'PREDICTIVE_INSIGHTS', 'ANOMALY_DETECTION');
    }
    
    if (scope.mlModels && scope.mlModels.length > 0) {
      features.push('ML_MODELS', 'MACHINE_LEARNING');
    }
    
    if (scope.realTimeMetrics?.enabled) {
      features.push('REAL_TIME_METRICS', 'LIVE_MONITORING');
    }
    
    if (scope.connectionConfig.preloadCookies) {
      features.push('COOKIE_PRELOADING');
    }
    
    if (scope.connectionConfig.maxConnections > 5) {
      features.push('HIGH_CONCURRENCY');
    }
    
    return features;
  }
  
  /**
   * Get limitations for current scope
   */
  private getScopeLimitations(scope: EnhancedScopeRow): string[] {
    const limitations: string[] = [];
    
    if (scope.detectedScope === 'LOCAL-SANDBOX') {
      limitations.push('LOCAL_DATA_ONLY', 'NO_EXTERNAL_APIS', 'LIMITED_AI_MODELS');
    }
    
    if (scope.detectedScope === 'DEVELOPMENT') {
      limitations.push('STAGING_DATA_ONLY', 'REDUCED_AI_ACCURACY');
    }
    
    if (!scope.aiAnalytics) {
      limitations.push('NO_AI_INSIGHTS', 'NO_PREDICTIONS');
    }
    
    if (scope.connectionConfig.maxConnections < 5) {
      limitations.push('LOW_CONCURRENCY_LIMIT');
    }
    
    if (!scope.realTimeMetrics?.enabled) {
      limitations.push('NO_REAL_TIME_MONITORING');
    }
    
    return limitations;
  }
  
  /**
   * Get current scope information
   */
  getCurrentScope(): EnhancedScopeRow | null {
    return this.currentScope;
  }
  
  /**
   * Check if a feature is available in current scope
   */
  hasFeature(feature: string): boolean {
    if (!this.currentScope) return false;
    return this.currentScope.featureFlags.includes(feature);
  }
  
  /**
   * Check if AI capabilities are available
   */
  hasAICapabilities(): boolean {
    if (!this.currentScope) return false;
    return !!this.currentScope.aiAnalytics;
  }
  
  /**
   * Get ScopeDetector configuration
   */
  getScopeConfig(): ScopeConfig | null {
    return this.scopeConfig;
  }
  
  /**
   * Get platform-specific storage configuration
   */
  getPlatformStorage(): any {
    if (!this.scopeConfig) return null;
    return PlatformScopeAdapter.getScopedStorage(process.platform, this.scopeConfig.scope);
  }
  
  /**
   * Get security features for current platform
   */
  getSecurityFeatures(): any {
    return PlatformScopeAdapter.getSecurityFeatures(process.platform);
  }
  
  /**
   * Validate current scope configuration
   */
  validateScope(): { valid: boolean; errors: string[]; warnings: string[] } {
    if (!this.scopeConfig) {
      return { valid: false, errors: ['No scope configuration available'], warnings: [] };
    }
    return ScopeDetector.validateScope(this.scopeConfig);
  }
  
  /**
   * Check if enterprise features are supported
   */
  supportsEnterpriseFeatures(): boolean {
    if (!this.scopeConfig) return false;
    return ScopeDetector.supportsEnterpriseFeatures(this.scopeConfig);
  }
  
  /**
   * Get scoped service name
   */
  getScopedServiceName(baseService: string, team: string = 'default'): string {
    return ScopeDetector.getScopedServiceName(baseService, team);
  }
  
  /**
   * Get scoped R2 path
   */
  getScopedR2Path(basePath: string): string {
    return ScopeDetector.getScopedR2Path(basePath);
  }
  
  /**
   * Get local mirror path
   */
  getLocalMirrorPath(basePath: string): string {
    return ScopeDetector.getLocalMirrorPath(basePath);
  }
  
  /**
   * Get all domain mappings
   */
  getDomainMappings(): DomainMapping[] {
    return ScopeDetector.getDomainMappings();
  }
  
  /**
   * Export scope configuration as environment variables
   */
  exportScopeAsEnv(): Record<string, string> {
    if (!this.scopeConfig) return {};
    return ScopeDetector.exportAsEnv(this.scopeConfig);
  }
  
  /**
   * Get comprehensive security metrics for the dispute system
   */
  private async getSecurityMetrics(): Promise<DisputeDashboardData['securityMetrics']> {
    try {
      // Generate base performance metrics for security assessment
      const baseMetrics: PerfMetric[] = this.generateSecurityBaseMetrics();
      
      // Enhance with security-specific calculations
      const enhancedMetrics = enhanceSecurityMetrics(baseMetrics);
      
      // Categorize metrics
      const categories = this.categorizeSecurityMetrics(enhancedMetrics);
      
      // Calculate overall security score
      const overallScore = this.calculateOverallSecurityScore(enhancedMetrics);
      
      // Determine risk level
      const riskLevel = this.determineSecurityRiskLevel(overallScore);
      
      // Check compliance status
      const complianceStatus = this.determineComplianceStatus(enhancedMetrics);
      
      // Analyze trends
      const trends = this.analyzeSecurityTrends(enhancedMetrics);
      
      const now = new Date();
      
      return {
        overallScore,
        riskLevel,
        complianceStatus,
        lastVerified: now.toISOString(),
        metrics: enhancedMetrics,
        categories,
        trends
      };
    } catch (error) {
      console.error('Error generating security metrics:', error);
      return this.getDefaultSecurityMetrics();
    }
  }
  
  /**
   * Generate base security metrics for assessment
   */
  private generateSecurityBaseMetrics(): PerfMetric[] {
    const domain = this.scopeConfig?.domain || 'localhost';
    const scope = this.scopeConfig?.scope || 'LOCAL-SANDBOX';
    
    return [
      // Authentication metrics
      {
        category: 'security',
        type: 'auth',
        topic: 'Multi-Factor Authentication',
        subCat: 'authentication',
        id: 'MFA_STATUS',
        value: scope === 'ENTERPRISE' ? 'ENABLED' : 'PARTIAL',
        locations: scope === 'ENTERPRISE' ? 3 : 1,
        impact: 'high',
        properties: { domain, required: scope === 'ENTERPRISE', methods: ['TOTP', 'SMS', 'Email'] }
      },
      {
        category: 'security',
        type: 'auth',
        topic: 'Password Policy',
        subCat: 'authentication',
        id: 'PWD_POLICY',
        value: scope === 'ENTERPRISE' ? 'ENABLED' : 'PARTIAL',
        locations: 2,
        impact: 'medium',
        properties: { domain, minLength: 12, complexity: true, rotation: 90 }
      },
      {
        category: 'security',
        type: 'auth',
        topic: 'Session Management',
        subCat: 'authentication',
        id: 'SESSION_MGMT',
        value: 'ENABLED',
        locations: 1,
        impact: 'medium',
        properties: { domain, timeout: 3600, refresh: true }
      },
      
      // Authorization metrics
      {
        category: 'security',
        type: 'authz',
        topic: 'Role-Based Access',
        subCat: 'authorization',
        id: 'RBAC_STATUS',
        value: scope === 'ENTERPRISE' ? 'ENABLED' : 'PARTIAL',
        locations: scope === 'ENTERPRISE' ? 5 : 2,
        impact: 'high',
        properties: { domain, roles: ['admin', 'user', 'viewer'], enforcement: true }
      },
      {
        category: 'security',
        type: 'authz',
        topic: 'API Rate Limiting',
        subCat: 'authorization',
        id: 'RATE_LIMIT',
        value: 'ENABLED',
        locations: 1,
        impact: 'medium',
        properties: { domain, requests: 100, window: 60 }
      },
      
      // Encryption metrics
      {
        category: 'security',
        type: 'encryption',
        topic: 'Data at Rest',
        subCat: 'encryption',
        id: 'ENCRYPTION_REST',
        value: this.scopeConfig?.encryptionType ? 'ENABLED' : 'DISABLED',
        locations: 3,
        impact: 'high',
        properties: { domain, algorithm: this.scopeConfig?.encryptionType || 'None' }
      },
      {
        category: 'security',
        type: 'encryption',
        topic: 'Data in Transit',
        subCat: 'encryption',
        id: 'ENCRYPTION_TRANSIT',
        value: 'ENABLED',
        locations: 2,
        impact: 'high',
        properties: { domain, tls: '1.3', certificates: true }
      },
      
      // Monitoring metrics
      {
        category: 'security',
        type: 'monitoring',
        topic: 'Audit Logging',
        subCat: 'monitoring',
        id: 'AUDIT_LOG',
        value: scope === 'ENTERPRISE' ? 'ENABLED' : 'PARTIAL',
        locations: scope === 'ENTERPRISE' ? 4 : 1,
        impact: 'medium',
        properties: { domain, retention: 90, level: 'INFO' }
      },
      {
        category: 'security',
        type: 'monitoring',
        topic: 'Security Monitoring',
        subCat: 'monitoring',
        id: 'SEC_MONITOR',
        value: scope === 'ENTERPRISE' ? 'ENABLED' : 'DISABLED',
        locations: scope === 'ENTERPRISE' ? 2 : 0,
        impact: 'medium',
        properties: { domain, alerts: true, siem: scope === 'ENTERPRISE' }
      },
      
      // Compliance metrics
      {
        category: 'security',
        type: 'compliance',
        topic: 'GDPR Compliance',
        subCat: 'compliance',
        id: 'GDPR_STATUS',
        value: scope === 'ENTERPRISE' ? 'COMPLIANT' : 'PARTIAL',
        locations: scope === 'ENTERPRISE' ? 3 : 1,
        impact: 'high',
        properties: { domain, dataProcessing: true, consent: true, retention: true }
      },
      {
        category: 'security',
        type: 'compliance',
        topic: 'SOC2 Compliance',
        subCat: 'compliance',
        id: 'SOC2_STATUS',
        value: scope === 'ENTERPRISE' ? 'COMPLIANT' : 'NON_COMPLIANT',
        locations: scope === 'ENTERPRISE' ? 2 : 0,
        impact: 'high',
        properties: { domain, type2: scope === 'ENTERPRISE', audit: true }
      }
    ];
  }
  
  /**
   * Categorize security metrics by type
   */
  private categorizeSecurityMetrics(metrics: SecurityMetric[]) {
    return {
      authentication: metrics.filter(m => m.type === 'auth'),
      authorization: metrics.filter(m => m.type === 'authz'),
      encryption: metrics.filter(m => m.type === 'encryption'),
      monitoring: metrics.filter(m => m.type === 'monitoring'),
      compliance: metrics.filter(m => m.type === 'compliance')
    };
  }
  
  /**
   * Calculate overall security score
   */
  private calculateOverallSecurityScore(metrics: SecurityMetric[]): number {
    if (metrics.length === 0) return 0;
    
    const totalScore = metrics.reduce((sum, metric) => sum + metric.securityScore, 0);
    return Math.round(totalScore / metrics.length);
  }
  
  /**
   * Determine security risk level
   */
  private determineSecurityRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 90) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Determine compliance status
   */
  private determineComplianceStatus(metrics: SecurityMetric[]): 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' {
    const compliantCount = metrics.filter(m => m.complianceStatus === 'COMPLIANT').length;
    const totalCount = metrics.length;
    
    if (compliantCount === totalCount) return 'COMPLIANT';
    if (compliantCount >= totalCount * 0.7) return 'PARTIAL';
    return 'NON_COMPLIANT';
  }
  
  /**
   * Analyze security trends
   */
  private analyzeSecurityTrends(metrics: SecurityMetric[]) {
    // Simulate trend analysis based on current scores
    const improving = metrics.filter(m => m.securityScore >= 80).map(m => m.topic);
    const degrading = metrics.filter(m => m.securityScore < 40).map(m => m.topic);
    const stable = metrics.filter(m => m.securityScore >= 40 && m.securityScore < 80).map(m => m.topic);
    
    return { improving, degrading, stable };
  }
  
  /**
   * Get default security metrics for fallback
   */
  private getDefaultSecurityMetrics(): DisputeDashboardData['securityMetrics'] {
    const now = new Date();
    
    return {
      overallScore: 50,
      riskLevel: 'MEDIUM',
      complianceStatus: 'PARTIAL',
      lastVerified: now.toISOString(),
      metrics: [],
      categories: {
        authentication: [],
        authorization: [],
        encryption: [],
        monitoring: [],
        compliance: []
      },
      trends: {
        improving: [],
        degrading: [],
        stable: []
      }
    };
  }
  
  /**
   * Get AI-powered insights for dispute management
   */
  private async getAIInsights(): Promise<DisputeDashboardData['aiInsights']> {
    try {
      // Initialize matrix manager if needed
      await this.matrixManager.detectScope();
      
      // Get AI predictions for dispute volume
      const currentStats = this.getSystemStats();
      const predictedVolume = await this.predictDisputeVolume(currentStats.totalDisputes);
      
      // Detect anomalies in dispute patterns
      const anomalies = await this.detectDisputeAnomalies();
      
      // Get risk assessment
      const riskLevel = this.assessRiskLevel(currentStats, anomalies);
      
      // Generate recommended actions
      const recommendedActions = this.generateRecommendedActions(riskLevel, anomalies);
      
      return {
        riskLevel,
        predictedVolume,
        recommendedActions,
        anomalyAlerts: anomalies,
        performanceMetrics: {
          avgResponseTime: 150, // ms
          accuracy: 0.94, // 94%
          confidence: 0.89 // 89%
        }
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return null;
    }
  }
  
  /**
   * Predict dispute volume using AI
   */
  private async predictDisputeVolume(currentVolume: number): Promise<number> {
    // Simulate AI prediction based on historical patterns
    const seasonalFactor = 1.2; // 20% increase expected
    const trendFactor = 1.05; // 5% upward trend
    const randomVariation = 0.9 + Math.random() * 0.2; // ±10% variation
    
    return Math.round(currentVolume * seasonalFactor * trendFactor * randomVariation);
  }
  
  /**
   * Detect anomalies in dispute patterns
   */
  private async detectDisputeAnomalies(): Promise<Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
  }>> {
    const anomalies = [];
    const stats = this.getSystemStats();
    
    // Check for unusual resolution times
    const avgTime = parseFloat(stats.avgResolutionTime);
    if (avgTime > 72) { // > 72 hours is unusual
      anomalies.push({
        type: 'performance',
        severity: 'high',
        message: `Average resolution time (${avgTime}h) exceeds SLA`,
        timestamp: new Date()
      });
    }
    
    // Check for high refund rate
    const refundRate = parseFloat(stats.refundRate);
    if (refundRate > 0.15) { // > 15% is concerning
      anomalies.push({
        type: 'financial',
        severity: 'medium',
        message: `Refund rate (${(refundRate * 100).toFixed(1)}%) above threshold`,
        timestamp: new Date()
      });
    }
    
    // Check for high active dispute ratio
    const activeRatio = stats.activeDisputes / stats.totalDisputes;
    if (activeRatio > 0.3) { // > 30% active is high
      anomalies.push({
        type: 'operational',
        severity: 'medium',
        message: `High active dispute ratio (${(activeRatio * 100).toFixed(1)}%)`,
        timestamp: new Date()
      });
    }
    
    return anomalies;
  }
  
  /**
   * Assess overall risk level
   */
  private assessRiskLevel(
    stats: DisputeDashboardData['systemStats'],
    anomalies: Array<any>
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;
    
    // Base risk from metrics
    const refundRate = parseFloat(stats.refundRate);
    if (refundRate > 0.2) riskScore += 3;
    else if (refundRate > 0.15) riskScore += 2;
    else if (refundRate > 0.1) riskScore += 1;
    
    const avgTime = parseFloat(stats.avgResolutionTime);
    if (avgTime > 96) riskScore += 3;
    else if (avgTime > 72) riskScore += 2;
    else if (avgTime > 48) riskScore += 1;
    
    // Risk from anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'high').length;
    riskScore += criticalAnomalies * 2;
    
    // Determine risk level
    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }
  
  /**
   * Generate recommended actions based on risk and anomalies
   */
  private generateRecommendedActions(
    riskLevel: string,
    anomalies: Array<any>
  ): string[] {
    const actions = [];
    
    switch (riskLevel) {
      case 'critical':
        actions.push('Escalate to senior management');
        actions.push('Implement emergency response team');
        actions.push('Review all active disputes');
        break;
      case 'high':
        actions.push('Increase staffing levels');
        actions.push('Review dispute processes');
        actions.push('Monitor metrics hourly');
        break;
      case 'medium':
        actions.push('Review recent dispute trends');
        actions.push('Consider process improvements');
        break;
      case 'low':
        actions.push('Continue normal operations');
        actions.push('Monitor for changes');
        break;
    }
    
    // Add anomaly-specific actions
    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'performance':
          actions.push('Optimize resolution workflows');
          break;
        case 'financial':
          actions.push('Review refund policies');
          break;
        case 'operational':
          actions.push('Balance workload distribution');
          break;
      }
    });
    
    return [...new Set(actions)]; // Remove duplicates
  }
  
  /**
   * Get quick actions for common dispute operations
   */
  private getQuickActions(): QuickAction[] {
    return [
      {
        title: 'Submit New Dispute',
        description: 'For recent transaction',
        deepLink: 'factory-wager://dispute/new?type=qr',
        icon: '➕',
        category: 'customer'
      },
      {
        title: 'Upload Evidence',
        description: 'Add photos/documents',
        deepLink: 'factory-wager://dispute/upload',
        icon: '📤',
        category: 'customer'
      },
      {
        title: 'Message Merchant',
        description: 'Secure chat channel',
        deepLink: 'factory-wager://dispute/chat',
        icon: '💬',
        category: 'customer'
      },
      {
        title: 'Respond to Dispute',
        description: 'Merchant response required',
        deepLink: 'factory-wager://dispute/respond',
        icon: '📝',
        category: 'merchant'
      },
      {
        title: 'Upload Counter-Evidence',
        description: 'Provide proof of service',
        deepLink: 'factory-wager://dispute/counter-evidence',
        icon: '📋',
        category: 'merchant'
      },
      {
        title: 'Check Venmo Status',
        description: 'View Venmo case',
        deepLink: 'factory-wager://dispute/venmo-status',
        icon: '🔍',
        category: 'admin'
      },
      {
        title: 'Download Report',
        description: 'PDF with all details',
        deepLink: 'factory-wager://dispute/report',
        icon: '📊',
        category: 'admin'
      },
      {
        title: 'Escalate to Review',
        description: 'Senior review required',
        deepLink: 'factory-wager://dispute/escalate',
        icon: '⚠️',
        category: 'admin'
      }
    ];
  }
  
  /**
   * Get system statistics
   */
  private getSystemStats() {
    // Mock data - in real implementation, this would come from database
    return {
      totalDisputes: 1247,
      activeDisputes: 89,
      resolvedToday: 23,
      avgResolutionTime: '2.4 days',
      refundRate: '67%'
    };
  }
  
  /**
   * Get recent activity
   */
  private getRecentActivity() {
    // Mock data - in real implementation, this would come from database
    return [
      {
        id: 'DSP-12345',
        type: 'dispute_submitted',
        description: 'New dispute against @coffee-shop',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12345'
      },
      {
        id: 'DSP-12344',
        type: 'merchant_responded',
        description: '@pizza-place responded to dispute',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12344'
      },
      {
        id: 'DSP-12343',
        type: 'refund_issued',
        description: 'Refund processed for $45.00',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12343'
      },
      {
        id: 'DSP-12342',
        type: 'evidence_uploaded',
        description: 'Customer uploaded 3 photos',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12342'
      },
      {
        id: 'DSP-12341',
        type: 'venmo_escalated',
        description: 'Case escalated to Venmo',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        deepLink: 'factory-wager://dispute/DSP-12341'
      }
    ];
  }
  
  /**
   * Generate dispute status timeline
   */
  generateStatusTimeline(currentStatus: DisputeStatus): Array<{
    step: number;
    status: string;
    title: string;
    description: string;
    completed: boolean;
    active: boolean;
    deepLink: string;
  }> {
    const statusOrder: DisputeStatus[] = [
      'DISPUTE_SUBMITTED',
      'MERCHANT_REVIEW', 
      'UNDER_INVESTIGATION',
      'VENMO_ESCALATION',
      'RESOLVED_REFUND',
      'RESOLVED_DENIED'
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return statusOrder.map((status, index) => {
      const details = this.disputeSystem.getStatusDetails(status);
      return {
        step: index + 1,
        status,
        title: status.replace(/_/g, ' '),
        description: details?.timeline || 'Unknown',
        completed: index <= currentIndex,
        active: index === currentIndex,
        deepLink: details?.deepLink || `factory-wager://dispute/status/${status.toLowerCase()}`
      };
    });
  }
  
  /**
   * Generate shareable dispute links
   */
  generateShareableLinks(dispute: Dispute): Record<string, string> {
    const content = this.disputeSystem.generateShareableContent(dispute);
    const deepLinks = this.disputeSystem.generateDisputeDeepLinks(dispute);
    
    return {
      ...content,
      qr: this.generateQRCode(deepLinks.primary),
      short: this.generateShortLink(deepLinks.primary)
    };
  }
  
  /**
   * Handle deep link click
   */
  handleDeepLinkClick(deepLink: string): boolean {
    try {
      // Validate the deep link
      if (!this.disputeSystem.validateDisputeLink(deepLink)) {
        console.error('Invalid dispute deep link:', deepLink);
        return false;
      }
      
      // Parse the deep link
      const parsed = this.disputeSystem.parseDisputeDeepLink(deepLink);
      
      // Handle different types of deep links
      switch (parsed.type) {
        case 'dispute':
          return this.handleDisputeDeepLink(parsed);
        case 'qr-dispute':
          return this.handleQRDisputeDeepLink(parsed);
        default:
          console.error('Unknown deep link type:', parsed.type);
          return false;
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      return false;
    }
  }
  
  // Private helper methods
  private handleDisputeDeepLink(parsed: any): boolean {
    // In a real app, this would navigate to the appropriate screen
    console.log('Navigating to dispute:', parsed.disputeId);
    console.log('Action:', parsed.action);
    console.log('Status:', parsed.status);
    return true;
  }
  
  private handleQRDisputeDeepLink(parsed: any): boolean {
    // In a real app, this would open the QR dispute creation flow
    console.log('Opening QR dispute flow with data:', parsed.data);
    return true;
  }
  
  private generateQRCode(deepLink: string): string {
    // In a real implementation, this would generate an actual QR code
    // For now, return a placeholder URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`;
  }
  
  private generateShortLink(deepLink: string): string {
    // In a real implementation, this would use a URL shortening service
    // For now, return a mock short link
    return `https://duopl.us/d/${Math.random().toString(36).substring(7)}`;
  }
}

export const disputeDashboard = new DisputeDashboard();
