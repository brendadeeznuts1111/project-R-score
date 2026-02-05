// AI Pattern Analyzer for Line History Movement
// Provides intelligent analysis and recommendations for configuration patterns

export interface PatternInsight {
  type: 'anomaly' | 'optimization' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actions: Array<{
    label: string;
    description: string;
    execute: () => void;
  }>;
}

export interface AnalysisRequest {
  pattern: any;
  context: {
    lineHistory: any[];
    metrics: any;
    timeframe: number;
  };
}

export interface AnalysisResponse {
  insights: PatternInsight[];
  summary: string;
  recommendations: string[];
  confidence: number;
}

class PatternAnalyzer {
  private apiEndpoint: string;
  private apiKey: string;
  private model: string;

  constructor(config: {
    apiEndpoint?: string;
    apiKey?: string;
    model?: string;
  } = {}) {
    this.apiEndpoint = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-3.5-turbo';
  }

  public async analyzePattern(request: AnalysisRequest): Promise<AnalysisResponse> {
    // If no API key, use local analysis
    if (!this.apiKey) {
      return this.performLocalAnalysis(request);
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert configuration pattern analyzer. Analyze the provided line history movement data and provide insights about anomalies, optimizations, predictions, and recommendations. Focus on performance, security, and stability implications.`
            },
            {
              role: 'user',
              content: this.formatAnalysisRequest(request)
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseAIResponse(data.choices[0].message.content);
    } catch (error) {
      console.warn('AI analysis failed, falling back to local analysis:', error);
      return this.performLocalAnalysis(request);
    }
  }

  private formatAnalysisRequest(request: AnalysisRequest): string {
    const { pattern, context } = request;
    
    return `
Analyze this configuration pattern:

Pattern Type: ${pattern.type}
Intensity: ${pattern.intensity}
Confidence: ${pattern.confidence}
Duration: ${pattern.duration}ms

Context:
- Timeframe: ${context.timeframe}ms
- Total Movements: ${context.metrics.totalMovements}
- Average Magnitude: ${context.metrics.averageMagnitude}
- Peak Velocity: ${context.metrics.peakVelocity}
- Most Active Line: ${context.metrics.mostActiveLine}

Recent Line History:
${context.lineHistory.slice(-5).map((h: any) => `Line ${h.lineId}: ${h.currentValue} (${h.trend})`).join('\n')}

Provide insights on:
1. What this pattern indicates
2. Potential performance implications
3. Security considerations
4. Optimization opportunities
5. Predictions for future behavior
    `;
  }

  private parseAIResponse(response: string): AnalysisResponse {
    // Simple parsing of AI response (in production, use more sophisticated parsing)
    const insights: PatternInsight[] = [];
    
    // Extract insights based on common patterns in AI responses
    if (response.includes('anomaly') || response.includes('unusual')) {
      insights.push({
        type: 'anomaly',
        title: 'Unusual Pattern Detected',
        description: 'The AI has identified an anomaly in the configuration pattern that may require attention.',
        confidence: 0.8,
        impact: 'medium',
        actions: [
          {
            label: 'Investigate',
            description: 'Analyze the pattern in detail',
            execute: () => console.log('Investigating anomaly...')
          }
        ]
      });
    }

    if (response.includes('optimization') || response.includes('improve')) {
      insights.push({
        type: 'optimization',
        title: 'Optimization Opportunity',
        description: 'The AI suggests potential optimizations based on this pattern.',
        confidence: 0.7,
        impact: 'medium',
        actions: [
          {
            label: 'Optimize',
            description: 'Apply suggested optimizations',
            execute: () => console.log('Applying optimizations...')
          }
        ]
      });
    }

    return {
      insights,
      summary: response.substring(0, 200) + '...',
      recommendations: ['Review pattern details', 'Monitor for recurrence', 'Consider configuration adjustments'],
      confidence: 0.75
    };
  }

  private performLocalAnalysis(request: AnalysisRequest): AnalysisResponse {
    const { pattern, context } = request;
    const insights: PatternInsight[] = [];

    // Local analysis based on pattern characteristics
    switch (pattern.type) {
      case 'spike':
        insights.push({
          type: 'anomaly',
          title: 'Sudden Spike Detected',
          description: `A sudden spike of intensity ${pattern.intensity.toFixed(1)} was detected on line ${pattern.startLine}. This may indicate a configuration conflict or external trigger.`,
          confidence: pattern.confidence,
          impact: pattern.intensity > 100 ? 'high' : 'medium',
          actions: [
            {
              label: 'Investigate Cause',
              description: 'Check for configuration conflicts',
              execute: () => console.log('Investigating spike cause...')
            },
            {
              label: 'Set Alert',
              description: 'Create alert for future spikes',
              execute: () => console.log('Setting up spike alert...')
            }
          ]
        });
        break;

      case 'gradual':
        insights.push({
          type: 'optimization',
          title: 'Gradual Change Pattern',
          description: `A gradual change pattern detected over ${pattern.duration}ms. This may indicate a planned adjustment or system drift.`,
          confidence: pattern.confidence,
          impact: 'low',
          actions: [
            {
              label: 'Monitor Trend',
              description: 'Continue monitoring this trend',
              execute: () => console.log('Monitoring gradual change...')
            }
          ]
        });
        break;

      case 'oscillation':
        insights.push({
          type: 'prediction',
          title: 'Oscillating Behavior',
          description: `Oscillating pattern detected with intensity ${pattern.intensity.toFixed(1)}. This may indicate unstable configuration or competing processes.`,
          confidence: pattern.confidence,
          impact: 'medium',
          actions: [
            {
              label: 'Stabilize',
              description: 'Apply stabilization measures',
              execute: () => console.log('Applying stabilization...')
            }
          ]
        });
        break;
    }

    // Add general insights based on metrics
    if (context.metrics.averageMagnitude > 50) {
      insights.push({
        type: 'recommendation',
        title: 'High Movement Magnitude',
        description: 'The average movement magnitude is elevated, which may impact performance.',
        confidence: 0.6,
        impact: 'medium',
        actions: [
          {
            label: 'Optimize Updates',
            description: 'Reduce frequency of large changes',
            execute: () => console.log('Optimizing update frequency...')
          }
        ]
      });
    }

    const summary = `Analysis of ${pattern.type} pattern with ${pattern.intensity.toFixed(1)} intensity. ` +
      `${insights.length} insights generated with confidence ${pattern.confidence.toFixed(2)}.`;

    return {
      insights,
      summary,
      recommendations: [
        'Continue monitoring pattern evolution',
        'Consider implementing automated responses',
        'Review configuration update frequency'
      ],
      confidence: pattern.confidence
    };
  }

  public async askQuestion(question: string, context: any): Promise<string> {
    if (!this.apiKey) {
      return this.generateLocalResponse(question, context);
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert configuration system assistant. Answer questions about configuration patterns, performance optimization, and system behavior.'
            },
            {
              role: 'user',
              content: `Context: ${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`
            }
          ],
          max_tokens: 300,
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.warn('AI question failed, using local response:', error);
      return this.generateLocalResponse(question, context);
    }
  }

  private generateLocalResponse(question: string, context: any): string {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('spike')) {
      return 'Spikes in configuration values can indicate conflicts, external triggers, or system events. I recommend investigating the cause and setting up alerts for future occurrences.';
    }
    
    if (lowerQuestion.includes('optimize')) {
      return 'To optimize configuration performance, consider reducing update frequency, batching changes, and implementing predictive patterns based on historical data.';
    }
    
    if (lowerQuestion.includes('pattern')) {
      return 'Configuration patterns help identify system behavior trends. Common patterns include spikes (sudden changes), gradual changes (drift), and oscillations (instability).';
    }
    
    return `Based on the current configuration state with ${context.metrics?.totalMovements || 0} movements, I recommend continuing monitoring and implementing automated responses for detected patterns.`;
  }

  public setCredentials(apiKey: string, endpoint?: string): void {
    this.apiKey = apiKey;
    if (endpoint) {
      this.apiEndpoint = endpoint;
    }
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default PatternAnalyzer;
