/**
 * Prediction Models - ML Models for Behavior Prediction
 * Machine learning pipeline for user behavior prediction
 */

import {
  UserAction,
  PredictionContext,
  BehaviorPrediction,
  PredictionModel,
  UserBehaviorPrediction
} from '../types/behavior';

export class PredictionModels {
  private models: Map<string, PredictionModel> = new Map();
  private modelInstances: Map<string, any> = new Map();
  private featureExtractors: Map<string, Function> = new Map();

  constructor() {
    this.initializeModels();
    this.initializeFeatureExtractors();
  }

  /**
   * Initialize available prediction models
   */
  private initializeModels(): void {
    const models: PredictionModel[] = [
      {
        id: 'sequential_next_action',
        name: 'Sequential Action Predictor',
        type: 'classification',
        features: ['recent_actions', 'time_of_day', 'day_of_week', 'session_length'],
        accuracy: 0.78,
        lastTrained: Date.now(),
        version: '1.0.0'
      },
      {
        id: 'engagement_predictor',
        name: 'User Engagement Predictor',
        type: 'regression',
        features: ['action_frequency', 'session_duration', 'page_views', 'interaction_depth'],
        accuracy: 0.82,
        lastTrained: Date.now(),
        version: '1.0.0'
      },
      {
        id: 'risk_behavior_classifier',
        name: 'Risk Behavior Classifier',
        type: 'classification',
        features: ['unusual_patterns', 'failed_actions', 'location_changes', 'device_switches'],
        accuracy: 0.85,
        lastTrained: Date.now(),
        version: '1.0.0'
      },
      {
        id: 'preference_learner',
        name: 'User Preference Learner',
        type: 'clustering',
        features: ['preferred_actions', 'time_preferences', 'feature_usage', 'customization_settings'],
        accuracy: 0.71,
        lastTrained: Date.now(),
        version: '1.0.0'
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
      this.modelInstances.set(model.id, this.createModelInstance(model));
    });
  }

  /**
   * Initialize feature extractors
   */
  private initializeFeatureExtractors(): void {
    this.featureExtractors.set('recent_actions', this.extractRecentActions.bind(this));
    this.featureExtractors.set('time_of_day', this.extractTimeOfDay.bind(this));
    this.featureExtractors.set('day_of_week', this.extractDayOfWeek.bind(this));
    this.featureExtractors.set('session_length', this.extractSessionLength.bind(this));
    this.featureExtractors.set('action_frequency', this.extractActionFrequency.bind(this));
    this.featureExtractors.set('session_duration', this.extractSessionDuration.bind(this));
    this.featureExtractors.set('page_views', this.extractPageViews.bind(this));
    this.featureExtractors.set('interaction_depth', this.extractInteractionDepth.bind(this));
    this.featureExtractors.set('unusual_patterns', this.extractUnusualPatterns.bind(this));
    this.featureExtractors.set('failed_actions', this.extractFailedActions.bind(this));
    this.featureExtractors.set('location_changes', this.extractLocationChanges.bind(this));
    this.featureExtractors.set('device_switches', this.extractDeviceSwitches.bind(this));
    this.featureExtractors.set('preferred_actions', this.extractPreferredActions.bind(this));
    this.featureExtractors.set('time_preferences', this.extractTimePreferences.bind(this));
    this.featureExtractors.set('feature_usage', this.extractFeatureUsage.bind(this));
    this.featureExtractors.set('customization_settings', this.extractCustomizationSettings.bind(this));
  }

  /**
   * Create a model instance (simplified for now - would use actual ML libraries)
   */
  private createModelInstance(model: PredictionModel): any {
    // In a real implementation, this would initialize TensorFlow.js models,
    // scikit-learn models, or other ML frameworks
    return {
      id: model.id,
      type: model.type,
      predict: (features: any) => this.simulatePrediction(model, features),
      train: (data: any) => this.simulateTraining(model, data)
    };
  }

  /**
   * Predict user behavior using all available models
   */
  async predictUserBehavior(context: PredictionContext): Promise<UserBehaviorPrediction> {
    const predictions: BehaviorPrediction[] = [];

    // Get predictions from each model
    for (const [modelId, model] of this.models.entries()) {
      try {
        const modelPredictions = await this.predictWithModel(modelId, context);
        predictions.push(...modelPredictions);
      } catch (error) {
        console.error(`Error predicting with model ${modelId}:`, error);
      }
    }

    // Aggregate and rank predictions
    const aggregatedPredictions = this.aggregatePredictions(predictions);

    return {
      userId: context.userId,
      sessionId: context.sessionId,
      predictions: aggregatedPredictions,
      confidence: this.calculateOverallConfidence(aggregatedPredictions),
      timestamp: Date.now(),
      modelVersion: '1.0.0'
    };
  }

  /**
   * Predict using a specific model
   */
  private async predictWithModel(modelId: string, context: PredictionContext): Promise<BehaviorPrediction[]> {
    const model = this.models.get(modelId);
    if (!model) return [];

    const features = this.extractFeatures(model, context);
    const modelInstance = this.modelInstances.get(modelId);

    if (!modelInstance) return [];

    try {
      const rawPredictions = await modelInstance.predict(features);
      return this.formatPredictions(rawPredictions, model, context);
    } catch (error) {
      console.error(`Prediction failed for model ${modelId}:`, error);
      return [];
    }
  }

  /**
   * Extract features for a model
   */
  private extractFeatures(model: PredictionModel, context: PredictionContext): any {
    const features: any = {};

    model.features.forEach(featureName => {
      const extractor = this.featureExtractors.get(featureName);
      if (extractor) {
        features[featureName] = extractor(context);
      }
    });

    return features;
  }

  /**
   * Feature extractors
   */
  private extractRecentActions(context: PredictionContext): string[] {
    return context.recentActions.slice(-5).map(a => a.actionType);
  }

  private extractTimeOfDay(context: PredictionContext): number {
    return context.timeOfDay;
  }

  private extractDayOfWeek(context: PredictionContext): number {
    return context.dayOfWeek;
  }

  private extractSessionLength(context: PredictionContext): number {
    if (context.recentActions.length === 0) return 0;
    const firstAction = context.recentActions[0];
    const lastAction = context.recentActions[context.recentActions.length - 1];
    return (lastAction.timestamp - firstAction.timestamp) / (1000 * 60); // minutes
  }

  private extractActionFrequency(context: PredictionContext): number {
    const recentActions = context.recentActions.filter(a =>
      a.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );
    return recentActions.length / 24; // actions per hour
  }

  private extractSessionDuration(context: PredictionContext): number {
    return this.extractSessionLength(context);
  }

  private extractPageViews(context: PredictionContext): number {
    return context.recentActions.filter(a => a.actionType.includes('view')).length;
  }

  private extractInteractionDepth(context: PredictionContext): number {
    const interactions = context.recentActions.filter(a =>
      a.actionType.includes('click') || a.actionType.includes('interact')
    );
    return interactions.length;
  }

  private extractUnusualPatterns(context: PredictionContext): number {
    // Calculate deviation from normal patterns
    const unusualActions = context.recentActions.filter(a =>
      a.metadata?.unusual === true || a.actionType.includes('error')
    );
    return unusualActions.length / Math.max(context.recentActions.length, 1);
  }

  private extractFailedActions(context: PredictionContext): number {
    return context.recentActions.filter(a =>
      a.actionType.includes('failed') || a.metadata?.failed === true
    ).length;
  }

  private extractLocationChanges(context: PredictionContext): number {
    const locations = new Set(context.recentActions.map(a => a.context.location).filter(Boolean));
    return locations.size;
  }

  private extractDeviceSwitches(context: PredictionContext): number {
    const devices = new Set(context.recentActions.map(a => a.context.device));
    return devices.size;
  }

  private extractPreferredActions(context: PredictionContext): string[] {
    const actionCounts = new Map<string, number>();
    context.recentActions.forEach(a => {
      const count = actionCounts.get(a.actionType) || 0;
      actionCounts.set(a.actionType, count + 1);
    });

    return Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([action]) => action);
  }

  private extractTimePreferences(context: PredictionContext): { hour: number; day: number } {
    const actions = context.recentActions;
    if (actions.length === 0) return { hour: 12, day: 1 };

    const avgHour = actions.reduce((sum, a) => {
      const date = new Date(a.timestamp);
      return sum + date.getHours();
    }, 0) / actions.length;

    const avgDay = actions.reduce((sum, a) => {
      const date = new Date(a.timestamp);
      return sum + date.getDay();
    }, 0) / actions.length;

    return { hour: avgHour, day: avgDay };
  }

  private extractFeatureUsage(context: PredictionContext): Record<string, number> {
    const usage: Record<string, number> = {};
    context.recentActions.forEach(a => {
      const feature = a.metadata?.feature || 'unknown';
      usage[feature] = (usage[feature] || 0) + 1;
    });
    return usage;
  }

  private extractCustomizationSettings(context: PredictionContext): Record<string, any> {
    return context.userProfile.preferences;
  }

  /**
   * Simulate prediction (would be replaced with actual ML model predictions)
   */
  private simulatePrediction(model: PredictionModel, features: any): any {
    // This is a simplified simulation - in reality, this would use trained ML models

    switch (model.id) {
      case 'sequential_next_action':
        return this.simulateSequentialPrediction(features);

      case 'engagement_predictor':
        return this.simulateEngagementPrediction(features);

      case 'risk_behavior_classifier':
        return this.simulateRiskPrediction(features);

      case 'preference_learner':
        return this.simulatePreferencePrediction(features);

      default:
        return {};
    }
  }

  private simulateSequentialPrediction(features: any): any {
    const recentActions = features.recent_actions || [];
    const timeOfDay = features.time_of_day || 12;

    // Simple rule-based prediction based on common patterns
    let predictedAction = 'view_dashboard';
    let confidence = 0.6;

    if (recentActions.includes('login')) {
      predictedAction = 'view_accounts';
      confidence = 0.8;
    } else if (recentActions.includes('view_accounts')) {
      predictedAction = 'transfer_funds';
      confidence = 0.7;
    } else if (timeOfDay < 6 || timeOfDay > 22) {
      predictedAction = 'security_check';
      confidence = 0.9;
    }

    return {
      action: predictedAction,
      confidence,
      timeHorizon: 10 // minutes
    };
  }

  private simulateEngagementPrediction(features: any): any {
    const frequency = features.action_frequency || 0;
    const sessionDuration = features.session_duration || 0;

    // Predict engagement level
    const engagementScore = Math.min((frequency * 0.1 + sessionDuration * 0.01), 1);

    return {
      engagement: engagementScore > 0.7 ? 'high' : engagementScore > 0.4 ? 'medium' : 'low',
      confidence: 0.75
    };
  }

  private simulateRiskPrediction(features: any): any {
    const unusualPatterns = features.unusual_patterns || 0;
    const failedActions = features.failed_actions || 0;
    const locationChanges = features.location_changes || 1;

    const riskScore = Math.min((unusualPatterns * 0.3 + failedActions * 0.4 + (locationChanges - 1) * 0.2), 1);

    return {
      risk: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      confidence: 0.8
    };
  }

  private simulatePreferencePrediction(features: any): any {
    const preferredActions = features.preferred_actions || [];
    const timePreferences = features.time_preferences || { hour: 12, day: 1 };

    return {
      preferences: {
        favoriteActions: preferredActions,
        preferredTime: timePreferences.hour,
        preferredDay: timePreferences.day
      },
      confidence: 0.7
    };
  }

  /**
   * Format raw predictions into BehaviorPrediction objects
   */
  private formatPredictions(rawPredictions: any, model: PredictionModel, context: PredictionContext): BehaviorPrediction[] {
    const predictions: BehaviorPrediction[] = [];

    if (model.id === 'sequential_next_action' && rawPredictions.action) {
      predictions.push({
        type: 'action',
        predictedAction: rawPredictions.action,
        probability: rawPredictions.confidence || 0.5,
        timeHorizon: rawPredictions.timeHorizon || 15,
        confidence: rawPredictions.confidence || 0.5,
        features: { modelId: model.id }
      });
    } else if (model.id === 'engagement_predictor') {
      predictions.push({
        type: 'engagement',
        predictedAction: `engagement_${rawPredictions.engagement}`,
        probability: rawPredictions.confidence || 0.5,
        timeHorizon: 60, // 1 hour
        confidence: rawPredictions.confidence || 0.5,
        features: { engagement: rawPredictions.engagement, modelId: model.id }
      });
    } else if (model.id === 'risk_behavior_classifier') {
      predictions.push({
        type: 'risk',
        predictedAction: `risk_${rawPredictions.risk}`,
        probability: rawPredictions.confidence || 0.5,
        timeHorizon: 30, // 30 minutes
        confidence: rawPredictions.confidence || 0.5,
        features: { risk: rawPredictions.risk, modelId: model.id }
      });
    } else if (model.id === 'preference_learner') {
      predictions.push({
        type: 'preference',
        predictedAction: `preference_${rawPredictions.preferences?.favoriteActions?.[0] || 'unknown'}`,
        probability: rawPredictions.confidence || 0.5,
        timeHorizon: 1440, // 24 hours
        confidence: rawPredictions.confidence || 0.5,
        features: { preferences: rawPredictions.preferences, modelId: model.id }
      });
    }

    return predictions;
  }

  /**
   * Aggregate predictions from multiple models
   */
  private aggregatePredictions(predictions: BehaviorPrediction[]): BehaviorPrediction[] {
    const aggregated = new Map<string, BehaviorPrediction[]>();

    // Group predictions by type
    predictions.forEach(pred => {
      const key = `${pred.type}_${pred.predictedAction}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, []);
      }
      aggregated.get(key)!.push(pred);
    });

    // Aggregate each group
    const result: BehaviorPrediction[] = [];
    for (const group of aggregated.values()) {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Weighted average based on confidence
        const totalWeight = group.reduce((sum, p) => sum + p.confidence, 0);
        const avgConfidence = totalWeight / group.length;
        const avgProbability = group.reduce((sum, p) => sum + p.probability * p.confidence, 0) / totalWeight;
        const avgTimeHorizon = Math.round(group.reduce((sum, p) => sum + p.timeHorizon * p.confidence, 0) / totalWeight);

        result.push({
          type: group[0].type,
          predictedAction: group[0].predictedAction,
          probability: avgProbability,
          timeHorizon: avgTimeHorizon,
          confidence: avgConfidence,
          features: { aggregated: true, sources: group.map(p => p.features?.modelId).filter(Boolean) }
        });
      }
    }

    return result.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate overall confidence for the prediction set
   */
  private calculateOverallConfidence(predictions: BehaviorPrediction[]): number {
    if (predictions.length === 0) return 0;

    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    const consistencyBonus = predictions.length > 1 ? 0.1 : 0; // Bonus for multiple predictions

    return Math.min(avgConfidence + consistencyBonus, 1);
  }

  /**
   * Train models with new data
   */
  async trainModels(trainingData: { context: PredictionContext; actualOutcome: any }[]): Promise<void> {
    for (const [modelId, model] of this.models.entries()) {
      try {
        const modelInstance = this.modelInstances.get(modelId);
        if (modelInstance && modelInstance.train) {
          const modelTrainingData = this.prepareTrainingData(model, trainingData);
          await modelInstance.train(modelTrainingData);

          // Update model metadata
          model.lastTrained = Date.now();
          model.accuracy = this.evaluateModelAccuracy(model, trainingData);
          this.models.set(modelId, model);
        }
      } catch (error) {
        console.error(`Training failed for model ${modelId}:`, error);
      }
    }
  }

  /**
   * Prepare training data for a specific model
   */
  private prepareTrainingData(model: PredictionModel, trainingData: any[]): any {
    // This would format the training data according to the model's requirements
    return trainingData.map(item => ({
      features: this.extractFeatures(model, item.context),
      label: item.actualOutcome
    }));
  }

  /**
   * Evaluate model accuracy
   */
  private evaluateModelAccuracy(model: PredictionModel, testData: any[]): number {
    // Simplified accuracy evaluation
    // In reality, this would use proper cross-validation
    return model.accuracy + (Math.random() - 0.5) * 0.1; // Small random variation
  }

  /**
   * Simulate training (would be replaced with actual ML training)
   */
  private simulateTraining(model: PredictionModel, data: any): Promise<void> {
    return new Promise(resolve => {
      // Simulate training time
      setTimeout(() => {
        console.log(`Trained model ${model.id} with ${data.length} samples`);
        resolve();
      }, 100);
    });
  }

  /**
   * Get available models
   */
  getModels(): PredictionModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): PredictionModel | undefined {
    return this.models.get(modelId);
  }
}