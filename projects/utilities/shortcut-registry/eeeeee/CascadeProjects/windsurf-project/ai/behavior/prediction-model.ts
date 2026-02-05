/**
 * Prediction Model - Machine Learning Pipeline for User Behavior Prediction
 * Implements various ML algorithms for predicting user actions and behavior
 */

import {
  UserAction,
  PredictionContext,
  PredictionModel,
  ModelTrainingData,
  PredictionResult,
  ModelConfig,
  FeatureVector
} from '../types/behavior';

export class BehaviorPredictionModel implements PredictionModel {
  private models: Map<string, TrainedModel> = new Map();
  private featureExtractors: Map<string, FeatureExtractor> = new Map();
  private trainingData: Map<string, ModelTrainingData[]> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private performanceMetrics: Map<string, ModelPerformance> = new Map();

  constructor() {
    this.initializeDefaultModels();
    this.initializeFeatureExtractors();
  }

  /**
   * Train a prediction model for a specific user
   */
  async trainModel(userId: string, actions: UserAction[], config?: Partial<ModelConfig>): Promise<void> {
    const modelConfig = {
      algorithm: 'markov_chain' as const,
      features: ['action_sequence', 'temporal', 'contextual'],
      timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      minTrainingData: 50,
      validationSplit: 0.2,
      ...config
    };

    this.modelConfigs.set(userId, modelConfig);

    // Prepare training data
    const trainingData = this.prepareTrainingData(actions, modelConfig);

    if (trainingData.length < modelConfig.minTrainingData) {
      throw new Error(`Insufficient training data: ${trainingData.length} < ${modelConfig.minTrainingData}`);
    }

    // Split data for validation
    const { training, validation } = this.splitTrainingData(trainingData, modelConfig.validationSplit);

    // Train model based on algorithm
    const trainedModel = await this.trainAlgorithm(modelConfig.algorithm, training, modelConfig);

    // Validate model
    const validationResults = await this.validateModel(trainedModel, validation);

    // Store model and performance
    this.models.set(userId, trainedModel);
    this.trainingData.set(userId, trainingData);
    this.performanceMetrics.set(userId, validationResults);

    console.log(`Trained ${modelConfig.algorithm} model for user ${userId}:`, validationResults);
  }

  /**
   * Make predictions for user behavior
   */
  async predict(context: PredictionContext): Promise<PredictionResult[]> {
    const model = this.models.get(context.userId);
    if (!model) {
      throw new Error(`No trained model found for user ${context.userId}`);
    }

    const predictions: PredictionResult[] = [];

    // Extract features from context
    const features = this.extractFeatures(context);

    // Generate predictions based on model type
    switch (model.algorithm) {
      case 'markov_chain':
        predictions.push(...this.predictWithMarkovChain(model, features, context));
        break;
      case 'neural_network':
        predictions.push(...await this.predictWithNeuralNetwork(model, features, context));
        break;
      case 'decision_tree':
        predictions.push(...this.predictWithDecisionTree(model, features, context));
        break;
      case 'collaborative_filtering':
        predictions.push(...await this.predictWithCollaborativeFiltering(model, features, context));
        break;
    }

    // Sort by confidence and return top predictions
    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 predictions
  }

  /**
   * Update model with new data
   */
  async updateModel(userId: string, newActions: UserAction[]): Promise<void> {
    const existingData = this.trainingData.get(userId) || [];
    const config = this.modelConfigs.get(userId);

    if (!config) {
      throw new Error(`No configuration found for user ${userId}`);
    }

    // Add new data to existing training data
    const newTrainingData = this.prepareTrainingData(newActions, config);
    const updatedData = [...existingData, ...newTrainingData];

    // Retrain model with updated data
    await this.trainModel(userId, newActions, config);
  }

  /**
   * Get model performance metrics
   */
  getModelPerformance(userId: string): ModelPerformance | null {
    return this.performanceMetrics.get(userId) || null;
  }

  /**
   * Initialize default prediction models
   */
  private initializeDefaultModels(): void {
    // Register different model types
    this.registerModel('markov_chain', new MarkovChainModel());
    this.registerModel('neural_network', new NeuralNetworkModel());
    this.registerModel('decision_tree', new DecisionTreeModel());
    this.registerModel('collaborative_filtering', new CollaborativeFilteringModel());
  }

  /**
   * Initialize feature extractors
   */
  private initializeFeatureExtractors(): void {
    this.featureExtractors.set('action_sequence', new ActionSequenceExtractor());
    this.featureExtractors.set('temporal', new TemporalFeatureExtractor());
    this.featureExtractors.set('contextual', new ContextualFeatureExtractor());
    this.featureExtractors.set('behavioral', new BehavioralFeatureExtractor());
  }

  /**
   * Prepare training data from user actions
   */
  private prepareTrainingData(actions: UserAction[], config: ModelConfig): ModelTrainingData[] {
    const trainingData: ModelTrainingData[] = [];

    // Sort actions by timestamp
    const sortedActions = actions.sort((a, b) => a.timestamp - b.timestamp);

    // Create training examples with sliding window
    for (let i = config.features.includes('action_sequence') ? 2 : 1; i < sortedActions.length; i++) {
      const contextActions = sortedActions.slice(Math.max(0, i - 5), i); // Last 5 actions as context
      const nextAction = sortedActions[i];

      const features = this.extractFeaturesFromActions(contextActions, config);
      const label = nextAction.actionType;

      trainingData.push({
        features,
        label,
        context: contextActions,
        timestamp: nextAction.timestamp
      });
    }

    return trainingData;
  }

  /**
   * Extract features from actions
   */
  private extractFeaturesFromActions(actions: UserAction[], config: ModelConfig): FeatureVector {
    const features: FeatureVector = {};

    for (const featureType of config.features) {
      const extractor = this.featureExtractors.get(featureType);
      if (extractor) {
        Object.assign(features, extractor.extract(actions));
      }
    }

    return features;
  }

  /**
   * Extract features from prediction context
   */
  private extractFeatures(context: PredictionContext): FeatureVector {
    const features: FeatureVector = {};

    // Action sequence features
    const sequenceExtractor = this.featureExtractors.get('action_sequence');
    if (sequenceExtractor) {
      Object.assign(features, sequenceExtractor.extract(context.recentActions));
    }

    // Temporal features
    const temporalExtractor = this.featureExtractors.get('temporal');
    if (temporalExtractor) {
      Object.assign(features, temporalExtractor.extract(context.recentActions));
    }

    // Contextual features
    const contextualExtractor = this.featureExtractors.get('contextual');
    if (contextualExtractor) {
      Object.assign(features, contextualExtractor.extractFromContext(context));
    }

    // Behavioral features
    const behavioralExtractor = this.featureExtractors.get('behavioral');
    if (behavioralExtractor) {
      Object.assign(features, behavioralExtractor.extractFromProfile(context.userProfile));
    }

    return features;
  }

  /**
   * Split training data into training and validation sets
   */
  private splitTrainingData(data: ModelTrainingData[], validationSplit: number): {
    training: ModelTrainingData[];
    validation: ModelTrainingData[];
  } {
    const splitIndex = Math.floor(data.length * (1 - validationSplit));
    return {
      training: data.slice(0, splitIndex),
      validation: data.slice(splitIndex)
    };
  }

  /**
   * Train model using specified algorithm
   */
  private async trainAlgorithm(
    algorithm: string,
    trainingData: ModelTrainingData[],
    config: ModelConfig
  ): Promise<TrainedModel> {
    const modelImpl = this.models.get(algorithm);
    if (!modelImpl) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    return await modelImpl.train(trainingData, config);
  }

  /**
   * Validate trained model
   */
  private async validateModel(model: TrainedModel, validationData: ModelTrainingData[]): Promise<ModelPerformance> {
    let correct = 0;
    let total = 0;
    const predictions: number[] = [];
    const actuals: number[] = [];

    for (const example of validationData) {
      const prediction = await model.predict(example.features);
      const predictedAction = this.getTopPrediction(prediction);

      if (predictedAction === example.label) {
        correct++;
      }

      total++;
      predictions.push(prediction[predictedAction] || 0);
      actuals.push(1); // Binary: predicted correctly or not
    }

    const accuracy = correct / total;
    const precision = this.calculatePrecision(predictions, actuals);
    const recall = this.calculateRecall(predictions, actuals);
    const f1Score = 2 * (precision * recall) / (precision + recall);

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      totalPredictions: total,
      correctPredictions: correct,
      validationTimestamp: Date.now()
    };
  }

  /**
   * Get top prediction from prediction results
   */
  private getTopPrediction(predictions: Record<string, number>): string {
    return Object.entries(predictions)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  /**
   * Calculate precision
   */
  private calculatePrecision(predictions: number[], actuals: number[]): number {
    const truePositives = predictions.filter((p, i) => p > 0.5 && actuals[i] === 1).length;
    const falsePositives = predictions.filter((p, i) => p > 0.5 && actuals[i] === 0).length;
    return truePositives / (truePositives + falsePositives) || 0;
  }

  /**
   * Calculate recall
   */
  private calculateRecall(predictions: number[], actuals: number[]): number {
    const truePositives = predictions.filter((p, i) => p > 0.5 && actuals[i] === 1).length;
    const falseNegatives = predictions.filter((p, i) => p <= 0.5 && actuals[i] === 1).length;
    return truePositives / (truePositives + falseNegatives) || 0;
  }

  /**
   * Predict with Markov Chain model
   */
  private predictWithMarkovChain(
    model: TrainedModel,
    features: FeatureVector,
    context: PredictionContext
  ): PredictionResult[] {
    const predictions: PredictionResult[] = [];
    const recentActions = context.recentActions.map(a => a.actionType);

    if (recentActions.length >= 2) {
      const lastTwo = recentActions.slice(-2);
      const transitionKey = lastTwo.join('->');

      const transitions = (model as MarkovChainModel).transitions.get(transitionKey);
      if (transitions) {
        for (const [action, probability] of Object.entries(transitions)) {
          predictions.push({
            predictedAction: action,
            confidence: probability,
            reasoning: `Based on transition: ${transitionKey} -> ${action}`,
            context: {
              recentActions: lastTwo,
              timeOfDay: context.timeOfDay,
              dayOfWeek: context.dayOfWeek
            },
            timestamp: Date.now()
          });
        }
      }
    }

    return predictions;
  }

  /**
   * Predict with Neural Network model
   */
  private async predictWithNeuralNetwork(
    model: TrainedModel,
    features: FeatureVector,
    context: PredictionContext
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];

    try {
      const nnModel = model as NeuralNetworkModel;
      const output = await nnModel.forward(features);

      for (const [action, probability] of Object.entries(output)) {
        if (probability > 0.1) { // Only include significant predictions
          predictions.push({
            predictedAction: action,
            confidence: probability,
            reasoning: 'Neural network prediction based on learned patterns',
            context: {
              features: Object.keys(features),
              timeOfDay: context.timeOfDay,
              dayOfWeek: context.dayOfWeek
            },
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Neural network prediction error:', error);
    }

    return predictions;
  }

  /**
   * Predict with Decision Tree model
   */
  private predictWithDecisionTree(
    model: TrainedModel,
    features: FeatureVector,
    context: PredictionContext
  ): PredictionResult[] {
    const predictions: PredictionResult[] = [];

    try {
      const dtModel = model as DecisionTreeModel;
      const prediction = dtModel.traverse(features);

      predictions.push({
        predictedAction: prediction.action,
        confidence: prediction.confidence,
        reasoning: `Decision tree path: ${prediction.path.join(' -> ')}`,
        context: {
          features: Object.keys(features),
          timeOfDay: context.timeOfDay,
          dayOfWeek: context.dayOfWeek
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Decision tree prediction error:', error);
    }

    return predictions;
  }

  /**
   * Predict with Collaborative Filtering model
   */
  private async predictWithCollaborativeFiltering(
    model: TrainedModel,
    features: FeatureVector,
    context: PredictionContext
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];

    try {
      const cfModel = model as CollaborativeFilteringModel;
      const similarUsers = await cfModel.findSimilarUsers(context.userId);

      for (const similarUser of similarUsers) {
        const userPredictions = cfModel.getUserPredictions(similarUser.userId);
        for (const pred of userPredictions) {
          predictions.push({
            predictedAction: pred.action,
            confidence: pred.confidence * similarUser.similarity,
            reasoning: `Similar user ${similarUser.userId} pattern (similarity: ${similarUser.similarity.toFixed(2)})`,
            context: {
              similarUser: similarUser.userId,
              similarity: similarUser.similarity,
              timeOfDay: context.timeOfDay,
              dayOfWeek: context.dayOfWeek
            },
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Collaborative filtering prediction error:', error);
    }

    return predictions;
  }

  /**
   * Register a model implementation
   */
  private registerModel(name: string, model: any): void {
    this.models.set(name, model);
  }

  /**
   * Get available model types
   */
  getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Get model statistics
   */
  getStats(): {
    totalModels: number;
    trainedUsers: number;
    averagePerformance: number;
  } {
    const performances = Array.from(this.performanceMetrics.values());
    const averagePerformance = performances.length > 0
      ? performances.reduce((sum, p) => sum + p.accuracy, 0) / performances.length
      : 0;

    return {
      totalModels: this.models.size,
      trainedUsers: this.performanceMetrics.size,
      averagePerformance
    };
  }
}

// Model Implementations
interface TrainedModel {
  algorithm: string;
  train(trainingData: ModelTrainingData[], config: ModelConfig): Promise<TrainedModel>;
  predict(features: FeatureVector): Promise<Record<string, number>>;
}

class MarkovChainModel implements TrainedModel {
  algorithm = 'markov_chain';
  transitions: Map<string, Record<string, number>> = new Map();

  async train(trainingData: ModelTrainingData[], config: ModelConfig): Promise<TrainedModel> {
    this.transitions.clear();

    // Build transition matrix
    for (const example of trainingData) {
      const actions = example.context.map(a => a.actionType);
      if (actions.length >= 2) {
        for (let i = 0; i < actions.length - 1; i++) {
          const fromState = actions[i];
          const toState = actions[i + 1];
          const key = `${fromState}->${toState}`;

          const transitions = this.transitions.get(key) || {};
          transitions[example.label] = (transitions[example.label] || 0) + 1;
          this.transitions.set(key, transitions);
        }
      }
    }

    // Normalize probabilities
    for (const [key, transitions] of this.transitions.entries()) {
      const total = Object.values(transitions).reduce((sum, count) => sum + count, 0);
      for (const action of Object.keys(transitions)) {
        transitions[action] /= total;
      }
    }

    return this;
  }

  async predict(features: FeatureVector): Promise<Record<string, number>> {
    // Markov chain prediction based on current state
    const currentState = features.lastAction as string;
    const predictions: Record<string, number> = {};

    for (const [key, transitions] of this.transitions.entries()) {
      if (key.startsWith(`${currentState}->`)) {
        Object.assign(predictions, transitions);
      }
    }

    return predictions;
  }
}

class NeuralNetworkModel implements TrainedModel {
  algorithm = 'neural_network';
  weights: number[][] = [];
  biases: number[] = [];
  actionLabels: string[] = [];

  async train(trainingData: ModelTrainingData[], config: ModelConfig): Promise<TrainedModel> {
    // Simple neural network implementation
    // In a real implementation, this would use a proper ML library like TensorFlow.js

    // Extract unique action labels
    this.actionLabels = [...new Set(trainingData.map(d => d.label))];

    // Initialize weights and biases
    const inputSize = Object.keys(trainingData[0].features).length;
    const hiddenSize = 64;
    const outputSize = this.actionLabels.length;

    this.weights = [
      this.randomMatrix(hiddenSize, inputSize),
      this.randomMatrix(outputSize, hiddenSize)
    ];
    this.biases = [new Array(hiddenSize).fill(0), new Array(outputSize).fill(0)];

    // Simple training loop (stochastic gradient descent)
    const learningRate = 0.01;
    for (let epoch = 0; epoch < 100; epoch++) {
      for (const example of trainingData) {
        const input = this.featuresToVector(example.features);
        const target = this.labelToVector(example.label);

        // Forward pass
        const hidden = this.relu(this.add(this.multiply(this.weights[0], input), this.biases[0]));
        const output = this.softmax(this.add(this.multiply(this.weights[1], hidden), this.biases[1]));

        // Backward pass (simplified)
        const outputError = this.subtract(target, output);
        const hiddenError = this.multiply(this.transpose(this.weights[1]), outputError);

        // Update weights and biases
        this.weights[1] = this.add(this.weights[1], this.scale(this.outerProduct(outputError, hidden), learningRate));
        this.biases[1] = this.add(this.biases[1], this.scale(outputError, learningRate));

        this.weights[0] = this.add(this.weights[0], this.scale(this.outerProduct(hiddenError, input), learningRate));
        this.biases[0] = this.add(this.biases[0], this.scale(hiddenError, learningRate));
      }
    }

    return this;
  }

  async predict(features: FeatureVector): Promise<Record<string, number>> {
    const input = this.featuresToVector(features);

    // Forward pass
    const hidden = this.relu(this.add(this.multiply(this.weights[0], input), this.biases[0]));
    const output = this.softmax(this.add(this.multiply(this.weights[1], hidden), this.biases[1]));

    const predictions: Record<string, number> = {};
    for (let i = 0; i < this.actionLabels.length; i++) {
      predictions[this.actionLabels[i]] = output[i];
    }

    return predictions;
  }

  async forward(features: FeatureVector): Promise<Record<string, number>> {
    return this.predict(features);
  }

  // Neural network helper methods
  private featuresToVector(features: FeatureVector): number[] {
    return Object.values(features);
  }

  private labelToVector(label: string): number[] {
    const vector = new Array(this.actionLabels.length).fill(0);
    const index = this.actionLabels.indexOf(label);
    if (index >= 0) vector[index] = 1;
    return vector;
  }

  private randomMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() * 0.1 - 0.05)
    );
  }

  private multiply(a: number[][], b: number[]): number[] {
    return a.map(row => row.reduce((sum, val, i) => sum + val * b[i], 0));
  }

  private add(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + b[i]);
  }

  private subtract(a: number[], b: number[]): number[] {
    return a.map((val, i) => val - b[i]);
  }

  private scale(a: number[], scalar: number): number[] {
    return a.map(val => val * scalar);
  }

  private outerProduct(a: number[], b: number[]): number[][] {
    return a.map(val => b.map(bVal => val * bVal));
  }

  private transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  private relu(x: number[]): number[] {
    return x.map(val => Math.max(0, val));
  }

  private softmax(x: number[]): number[] {
    const max = Math.max(...x);
    const exp = x.map(val => Math.exp(val - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(val => val / sum);
  }
}

class DecisionTreeModel implements TrainedModel {
  algorithm = 'decision_tree';
  root: DecisionNode | null = null;

  async train(trainingData: ModelTrainingData[], config: ModelConfig): Promise<TrainedModel> {
    this.root = this.buildTree(trainingData, 0, 10); // Max depth 10
    return this;
  }

  async predict(features: FeatureVector): Promise<Record<string, number>> {
    if (!this.root) return {};

    const prediction = this.traverseTree(features);
    return { [prediction]: 1.0 };
  }

  traverse(features: FeatureVector): { action: string; confidence: number; path: string[] } {
    const path: string[] = [];
    let node = this.root;

    while (node && !node.isLeaf) {
      const featureValue = features[node.feature];
      if (featureValue <= node.threshold) {
        path.push(`${node.feature} <= ${node.threshold}`);
        node = node.left;
      } else {
        path.push(`${node.feature} > ${node.threshold}`);
        node = node.right;
      }
    }

    return {
      action: node?.prediction || 'unknown',
      confidence: node?.confidence || 0,
      path
    };
  }

  private traverseTree(features: FeatureVector): string {
    return this.traverse(features).action;
  }

  private buildTree(data: ModelTrainingData[], depth: number, maxDepth: number): DecisionNode | null {
    if (data.length === 0 || depth >= maxDepth) {
      return this.createLeaf(data);
    }

    // Find best split
    const { feature, threshold, gain } = this.findBestSplit(data);

    if (gain === 0) {
      return this.createLeaf(data);
    }

    // Split data
    const leftData = data.filter(d => d.features[feature] <= threshold);
    const rightData = data.filter(d => d.features[feature] > threshold);

    return {
      feature,
      threshold,
      left: this.buildTree(leftData, depth + 1, maxDepth),
      right: this.buildTree(rightData, depth + 1, maxDepth),
      isLeaf: false
    };
  }

  private findBestSplit(data: ModelTrainingData[]): { feature: string; threshold: number; gain: number } {
    let bestGain = 0;
    let bestFeature = '';
    let bestThreshold = 0;

    const features = Object.keys(data[0].features);

    for (const feature of features) {
      const values = data.map(d => d.features[feature]).sort((a, b) => a - b);

      for (let i = 1; i < values.length; i++) {
        const threshold = (values[i - 1] + values[i]) / 2;
        const gain = this.calculateInformationGain(data, feature, threshold);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
          bestThreshold = threshold;
        }
      }
    }

    return { feature: bestFeature, threshold: bestThreshold, gain: bestGain };
  }

  private calculateInformationGain(data: ModelTrainingData[], feature: string, threshold: number): number {
    const totalEntropy = this.calculateEntropy(data);

    const leftData = data.filter(d => d.features[feature] <= threshold);
    const rightData = data.filter(d => d.features[feature] > threshold);

    const leftEntropy = this.calculateEntropy(leftData);
    const rightEntropy = this.calculateEntropy(rightData);

    const leftWeight = leftData.length / data.length;
    const rightWeight = rightData.length / data.length;

    return totalEntropy - (leftWeight * leftEntropy + rightWeight * rightEntropy);
  }

  private calculateEntropy(data: ModelTrainingData[]): number {
    const labels = data.map(d => d.label);
    const labelCounts = new Map<string, number>();

    for (const label of labels) {
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }

    let entropy = 0;
    for (const count of labelCounts.values()) {
      const p = count / data.length;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  private createLeaf(data: ModelTrainingData[]): DecisionNode {
    const labels = data.map(d => d.label);
    const labelCounts = new Map<string, number>();

    for (const label of labels) {
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    }

    let maxCount = 0;
    let prediction = '';

    for (const [label, count] of labelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        prediction = label;
      }
    }

    return {
      prediction,
      confidence: maxCount / data.length,
      isLeaf: true
    };
  }
}

class CollaborativeFilteringModel implements TrainedModel {
  algorithm = 'collaborative_filtering';
  userActionMatrix: Map<string, Map<string, number>> = new Map();
  userSimilarities: Map<string, Array<{ userId: string; similarity: number }>> = new Map();

  async train(trainingData: ModelTrainingData[], config: ModelConfig): Promise<TrainedModel> {
    // Build user-action matrix
    for (const example of trainingData) {
      const userId = example.context[0]?.userId || 'unknown';
      const action = example.label;

      if (!this.userActionMatrix.has(userId)) {
        this.userActionMatrix.set(userId, new Map());
      }

      const userActions = this.userActionMatrix.get(userId)!;
      userActions.set(action, (userActions.get(action) || 0) + 1);
    }

    // Calculate user similarities
    const users = Array.from(this.userActionMatrix.keys());
    for (const user1 of users) {
      const similarities: Array<{ userId: string; similarity: number }> = [];

      for (const user2 of users) {
        if (user1 !== user2) {
          const similarity = this.calculateCosineSimilarity(
            this.userActionMatrix.get(user1)!,
            this.userActionMatrix.get(user2)!
          );
          similarities.push({ userId: user2, similarity });
        }
      }

      similarities.sort((a, b) => b.similarity - a.similarity);
      this.userSimilarities.set(user1, similarities.slice(0, 10)); // Top 10 similar users
    }

    return this;
  }

  async predict(features: FeatureVector): Promise<Record<string, number>> {
    // Collaborative filtering predictions are handled separately
    return {};
  }

  async findSimilarUsers(userId: string): Promise<Array<{ userId: string; similarity: number }>> {
    return this.userSimilarities.get(userId) || [];
  }

  getUserPredictions(userId: string): Array<{ action: string; confidence: number }> {
    const userActions = this.userActionMatrix.get(userId);
    if (!userActions) return [];

    const predictions: Array<{ action: string; confidence: number }> = [];
    for (const [action, count] of userActions.entries()) {
      predictions.push({
        action,
        confidence: count / Array.from(userActions.values()).reduce((a, b) => a + b, 0)
      });
    }

    return predictions;
  }

  private calculateCosineSimilarity(actions1: Map<string, number>, actions2: Map<string, number>): number {
    const allActions = new Set([...actions1.keys(), ...actions2.keys()]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const action of allActions) {
      const val1 = actions1.get(action) || 0;
      const val2 = actions2.get(action) || 0;

      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

// Feature Extractors
interface FeatureExtractor {
  extract(actions: UserAction[]): FeatureVector;
  extractFromContext?(context: PredictionContext): FeatureVector;
  extractFromProfile?(profile: any): FeatureVector;
}

class ActionSequenceExtractor implements FeatureExtractor {
  extract(actions: UserAction[]): FeatureVector {
    const features: FeatureVector = {};

    if (actions.length > 0) {
      features.lastAction = actions[actions.length - 1].actionType;
      features.secondLastAction = actions.length > 1 ? actions[actions.length - 2].actionType : 'none';
      features.actionCount = actions.length;
      features.uniqueActions = new Set(actions.map(a => a.actionType)).size;
    }

    return features;
  }
}

class TemporalFeatureExtractor implements FeatureExtractor {
  extract(actions: UserAction[]): FeatureVector {
    const features: FeatureVector = {};

    if (actions.length > 0) {
      const timestamps = actions.map(a => a.timestamp);
      const intervals = [];

      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }

      features.avgInterval = intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : 0;
      features.timeSinceLastAction = Date.now() - timestamps[timestamps.length - 1];
      features.actionFrequency = actions.length / (timestamps[timestamps.length - 1] - timestamps[0]) * 1000;
    }

    return features;
  }
}

class ContextualFeatureExtractor implements FeatureExtractor {
  extract(actions: UserAction[]): FeatureVector {
    const features: FeatureVector = {};

    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1];
      features.page = lastAction.context.page || 'unknown';
      features.device = lastAction.context.device || 'unknown';
      features.timeOfDay = new Date(lastAction.timestamp).getHours() / 24; // Normalize to 0-1
      features.dayOfWeek = new Date(lastAction.timestamp).getDay() / 7; // Normalize to 0-1
    }

    return features;
  }

  extractFromContext(context: PredictionContext): FeatureVector {
    return {
      currentPage: context.currentPage,
      timeOfDay: context.timeOfDay / 24,
      dayOfWeek: context.dayOfWeek / 7,
      sessionLength: context.recentActions.length
    };
  }
}

class BehavioralFeatureExtractor implements FeatureExtractor {
  extract(actions: UserAction[]): FeatureVector {
    const features: FeatureVector = {};

    if (actions.length > 0) {
      const actionTypes = actions.map(a => a.actionType);
      const failedActions = actionTypes.filter(t => t.includes('failed')).length;
      const viewActions = actionTypes.filter(t => t.includes('view')).length;
      const interactActions = actionTypes.filter(t => t.includes('interact')).length;

      features.failureRate = failedActions / actions.length;
      features.engagementRate = (viewActions + interactActions) / actions.length;
      features.diversityScore = new Set(actionTypes).size / actions.length;
    }

    return features;
  }

  extractFromProfile(profile: any): FeatureVector {
    return {
      riskScore: profile.riskScore || 0.5,
      engagementScore: profile.engagementScore || 0.5,
      preferenceCount: Object.keys(profile.preferences || {}).length
    };
  }
}

// Additional interfaces
interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalPredictions: number;
  correctPredictions: number;
  validationTimestamp: number;
}

interface DecisionNode {
  feature?: string;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  prediction?: string;
  confidence?: number;
  isLeaf: boolean;
}