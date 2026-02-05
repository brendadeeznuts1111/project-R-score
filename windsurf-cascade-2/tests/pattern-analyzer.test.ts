#!/usr/bin/env bun
// Test Suite for AI Pattern Analyzer
// Comprehensive testing of AI analysis and pattern detection

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Mock fetch for API calls
const mockFetch = async (url: string, options: any): Promise<Response> => {
    if (url.includes('api.openai.com') && options?.body) {
        const body = JSON.parse(options.body);
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            redirected: false,
            type: 'basic' as ResponseType,
            url: url,
            clone: () => mockFetch(url, options),
            body: null,
            bodyUsed: false,
            bytes: async () => new Uint8Array(),
            arrayBuffer: async () => new ArrayBuffer(0),
            blob: async () => new Blob(),
            formData: async () => new FormData(),
            json: async () => ({
                choices: [{
                    message: {
                        content: 'AI analysis response based on: ' + body.messages[1].content.substring(0, 50) + '...'
                    }
                }]
            }),
            text: async () => 'AI analysis response',
        } as unknown as Response;
    }
    
    return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: url,
        clone: () => mockFetch(url, options),
        body: null,
        bodyUsed: false,
        bytes: async () => new Uint8Array(),
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        json: async () => ({ error: 'Not found' }),
        text: async () => 'Not found',
    } as unknown as Response;
};

// Mock fetch with proper interface
Object.defineProperty(global, 'fetch', {
    value: mockFetch,
    writable: true,
    configurable: true,
});

// Add preconnect method to satisfy TypeScript
Object.defineProperty(global.fetch, 'preconnect', {
    value: () => Promise.resolve(),
    writable: true,
    configurable: true,
});

// Pattern Analyzer implementation
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

    public async analyzePattern(request: any): Promise<any> {
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
                            content: 'You are an expert configuration pattern analyzer.'
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

    private formatAnalysisRequest(request: any): string {
        const { pattern, context } = request;
        
        return `
Analyze this configuration pattern:
Pattern Type: ${pattern.type}
Intensity: ${pattern.intensity}
Confidence: ${pattern.confidence}
Duration: ${pattern.duration}ms
        `;
    }

    private parseAIResponse(response: string): any {
        const insights = [];
        
        if (response.includes('anomaly') || response.includes('unusual')) {
            insights.push({
                type: 'anomaly',
                title: 'Unusual Pattern Detected',
                description: 'The AI has identified an anomaly.',
                confidence: 0.8,
                impact: 'medium',
                actions: [{
                    label: 'Investigate',
                    description: 'Analyze the pattern',
                    execute: () => console.log('Investigating...')
                }]
            });
        }

        return {
            insights,
            summary: response.substring(0, 200) + '...',
            recommendations: ['Review pattern details'],
            confidence: 0.75
        };
    }

    private performLocalAnalysis(request: any): any {
        const { pattern } = request;
        const insights = [];

        // Handle empty pattern
        if (!pattern || typeof pattern !== 'object') {
            return {
                insights: [],
                summary: 'No pattern data available for analysis.',
                recommendations: ['Provide valid pattern data'],
                confidence: 0.0
            };
        }

        const patternType = pattern.type || 'unknown';
        const intensity = pattern.intensity || 0;
        const confidence = pattern.confidence || 0;
        const duration = pattern.duration || 0;

        switch (patternType) {
            case 'spike':
                insights.push({
                    type: 'anomaly',
                    title: 'Sudden Spike Detected',
                    description: `A sudden spike of intensity ${intensity.toFixed(1)} was detected.`,
                    confidence: confidence,
                    impact: intensity > 100 ? 'high' : 'medium',
                    actions: [
                        {
                            label: 'Investigate Cause',
                            description: 'Check for conflicts',
                            execute: () => console.log('Investigating spike...')
                        }
                    ]
                });
                break;

            case 'gradual':
                insights.push({
                    type: 'optimization',
                    title: 'Gradual Change Pattern',
                    description: `A gradual change pattern detected over ${duration}ms.`,
                    confidence: confidence,
                    impact: 'low',
                    actions: [
                        {
                            label: 'Monitor Trend',
                            description: 'Continue monitoring',
                            execute: () => console.log('Monitoring gradual change...')
                        }
                    ]
                });
                break;

            case 'oscillation':
                insights.push({
                    type: 'prediction',
                    title: 'Oscillating Behavior',
                    description: `Oscillating pattern detected with intensity ${intensity.toFixed(1)}.`,
                    confidence: confidence,
                    impact: 'medium',
                    actions: [
                        {
                            label: 'Stabilize',
                            description: 'Apply stabilization',
                            execute: () => console.log('Applying stabilization...')
                        }
                    ]
                });
                break;
        }

        return {
            insights,
            summary: `Analysis of ${patternType} pattern with ${intensity.toFixed(1)} intensity.`,
            recommendations: ['Continue monitoring', 'Consider automated responses'],
            confidence: confidence
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
                            content: 'You are an expert configuration system assistant.'
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
        
        return `Based on the current configuration state, I recommend continuing monitoring and implementing automated responses for detected patterns.`;
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

describe('PatternAnalyzer', () => {
    let analyzer: PatternAnalyzer;

    beforeEach(() => {
        analyzer = new PatternAnalyzer();
    });

    describe('Initialization', () => {
        it('should initialize with default configuration', () => {
            expect(analyzer).toBeDefined();
            expect(analyzer.isConfigured()).toBe(false);
        });

        it('should initialize with custom configuration', () => {
            const customAnalyzer = new PatternAnalyzer({
                apiKey: 'test-key',
                model: 'gpt-4'
            });
            expect(customAnalyzer).toBeDefined();
            expect(customAnalyzer.isConfigured()).toBe(true);
        });

        it('should accept API credentials', () => {
            analyzer.setCredentials('test-api-key');
            expect(analyzer.isConfigured()).toBe(true);
        });
    });

    describe('Local Pattern Analysis', () => {
        it('should analyze spike patterns', async () => {
            const request = {
                pattern: {
                    type: 'spike',
                    intensity: 150,
                    confidence: 0.8,
                    duration: 100,
                    startLine: 0,
                    endLine: 0
                },
                context: {
                    metrics: {
                        totalMovements: 10,
                        averageMagnitude: 50
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.insights.length).toBeGreaterThan(0);
            expect(result.insights[0].type).toBe('anomaly');
            expect(result.insights[0].title).toContain('Spike');
            expect(result.confidence).toBe(0.8);
        });

        it('should analyze gradual patterns', async () => {
            const request = {
                pattern: {
                    type: 'gradual',
                    intensity: 30,
                    confidence: 0.7,
                    duration: 5000,
                    startLine: 1,
                    endLine: 1
                },
                context: {
                    metrics: {
                        totalMovements: 5,
                        averageMagnitude: 25
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.insights.length).toBeGreaterThan(0);
            expect(result.insights[0].type).toBe('optimization');
            expect(result.insights[0].title).toContain('Gradual');
            expect(result.confidence).toBe(0.7);
        });

        it('should analyze oscillation patterns', async () => {
            const request = {
                pattern: {
                    type: 'oscillation',
                    intensity: 80,
                    confidence: 0.9,
                    duration: 2000,
                    startLine: 2,
                    endLine: 2
                },
                context: {
                    metrics: {
                        totalMovements: 15,
                        averageMagnitude: 60
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.insights.length).toBeGreaterThan(0);
            expect(result.insights[0].type).toBe('prediction');
            expect(result.insights[0].title).toContain('Oscillating');
            expect(result.confidence).toBe(0.9);
        });

        it('should handle unknown pattern types', async () => {
            const request = {
                pattern: {
                    type: 'unknown',
                    intensity: 50,
                    confidence: 0.5,
                    duration: 1000,
                    startLine: 3,
                    endLine: 3
                },
                context: {
                    metrics: {
                        totalMovements: 1,
                        averageMagnitude: 50
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.insights.length).toBe(0); // Unknown patterns have no insights
            expect(result.summary).toBeDefined();
        });
    });

    describe('AI Pattern Analysis', () => {
        it('should use AI when API key is configured', async () => {
            analyzer.setCredentials('test-api-key');
            
            const request = {
                pattern: {
                    type: 'spike',
                    intensity: 100,
                    confidence: 0.8,
                    duration: 100,
                    startLine: 0,
                    endLine: 0
                },
                context: {
                    metrics: {
                        totalMovements: 10,
                        averageMagnitude: 50
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.summary).toContain('AI analysis response');
            expect(result.confidence).toBe(0.75);
        });

        it('should fall back to local analysis on API failure', async () => {
            // Mock failed API call
            const errorFetch = async (url: string, options: any): Promise<Response> => ({
                ok: false,
                status: 500,
                statusText: 'API Error',
                headers: new Headers(),
                redirected: false,
                type: 'basic' as ResponseType,
                url: 'https://api.openai.com',
                clone: () => errorFetch(url, options),
                body: null,
                bodyUsed: false,
                bytes: async () => new Uint8Array(),
                arrayBuffer: async () => new ArrayBuffer(0),
                blob: async () => new Blob(),
                formData: async () => new FormData(),
                json: async () => ({ error: 'API Error' }),
                text: async () => 'API Error',
            } as unknown as Response);

            Object.defineProperty(global, 'fetch', {
                value: errorFetch,
                writable: true,
                configurable: true,
            });

            analyzer.setCredentials('invalid-key');
            
            const request = {
                pattern: {
                    type: 'spike',
                    intensity: 100,
                    confidence: 0.8,
                    duration: 100,
                    startLine: 0,
                    endLine: 0
                },
                context: {
                    metrics: {
                        totalMovements: 10,
                        averageMagnitude: 50
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.insights[0].type).toBe('anomaly'); // Should fall back to local

            // Restore original mock
            Object.defineProperty(global, 'fetch', {
                value: mockFetch,
                writable: true,
                configurable: true,
            });
        });
    });

    describe('Question Answering', () => {
        it('should answer questions about spikes', async () => {
            const question = 'What do spikes in configuration indicate?';
            const context = {
                metrics: { totalMovements: 5 }
            };

            const answer = await analyzer.askQuestion(question, context);

            expect(answer).toBeDefined();
            expect(answer.toLowerCase()).toContain('spike');
            expect(answer).toContain('conflicts');
        });

        it('should answer questions about optimization', async () => {
            const question = 'How can I optimize configuration performance?';
            const context = {
                metrics: { totalMovements: 10 }
            };

            const answer = await analyzer.askQuestion(question, context);

            expect(answer).toBeDefined();
            expect(answer).toContain('optimize');
            expect(answer).toContain('frequency');
        });

        it('should answer questions about patterns', async () => {
            const question = 'What are configuration patterns?';
            const context = {
                metrics: { totalMovements: 3 }
            };

            const answer = await analyzer.askQuestion(question, context);

            expect(answer).toBeDefined();
            expect(answer).toContain('pattern');
            expect(answer).toContain('spikes');
        });

        it('should provide default response for unknown questions', async () => {
            const question = 'What is the meaning of life?';
            const context = {
                metrics: { totalMovements: 1 }
            };

            const answer = await analyzer.askQuestion(question, context);

            expect(answer).toBeDefined();
            expect(answer).toContain('monitoring');
        });

        it('should use AI for questions when configured', async () => {
            analyzer.setCredentials('test-api-key');
            
            const question = 'How should I handle configuration spikes?';
            const context = {
                metrics: { totalMovements: 5 }
            };

            const answer = await analyzer.askQuestion(question, context);

            expect(answer).toBeDefined();
            expect(answer).toContain('AI analysis response');
        });
    });

    describe('Error Handling', () => {
        it('should handle empty requests', async () => {
            const request = {
                pattern: {},
                context: {}
            };

            const result = await analyzer.analyzePattern(request);

            expect(result).toBeDefined();
            expect(result.insights).toBeDefined();
        });

        it('should handle missing context', async () => {
            const request = {
                pattern: {
                    type: 'spike',
                    intensity: 100,
                    confidence: 0.8
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result).toBeDefined();
            expect(result.insights).toBeDefined();
        });

        it('should handle network errors gracefully', async () => {
            // Mock network error
            const networkErrorFetch = async (url: string, options: any): Promise<Response> => {
                throw new Error('Network error');
            };

            Object.defineProperty(global, 'fetch', {
                value: networkErrorFetch,
                writable: true,
                configurable: true,
            });

            analyzer.setCredentials('test-key');
            
            const request = {
                pattern: {
                    type: 'spike',
                    intensity: 100,
                    confidence: 0.8,
                    duration: 100,
                    startLine: 0,
                    endLine: 0
                },
                context: {
                    metrics: {
                        totalMovements: 10,
                        averageMagnitude: 50
                    }
                }
            };

            const result = await analyzer.analyzePattern(request);

            expect(result.insights).toBeDefined();
            expect(result.insights[0].type).toBe('anomaly'); // Should fall back to local

            // Restore original mock
            Object.defineProperty(global, 'fetch', {
                value: mockFetch,
                writable: true,
                configurable: true,
            });
        });
    });

    describe('Performance', () => {
        it('should handle rapid sequential requests', async () => {
            const requests = Array.from({ length: 10 }, (_, i) => ({
                pattern: {
                    type: 'spike',
                    intensity: 50 + i * 10,
                    confidence: 0.8,
                    duration: 100,
                    startLine: i,
                    endLine: i
                },
                context: {
                    metrics: {
                        totalMovements: i + 1,
                        averageMagnitude: 50
                    }
                }
            }));

            const startTime = Date.now();
            
            const results = await Promise.all(
                requests.map(request => analyzer.analyzePattern(request))
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(10);
            expect(results.every(result => result.insights)).toBe(true);
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle large context data', async () => {
            const largeContext = {
                metrics: {
                    totalMovements: 10000,
                    averageMagnitude: 75,
                    peakVelocity: 1000,
                    mostActiveLine: 5
                },
                lineHistory: Array.from({ length: 100 }, (_, i) => ({
                    lineId: i,
                    currentValue: Math.random() * 255,
                    trend: 'stable'
                }))
            };

            const question = 'Analyze this large dataset';
            const answer = await analyzer.askQuestion(question, largeContext);

            expect(answer).toBeDefined();
            expect(answer.length).toBeGreaterThan(0);
        });
    });

    describe('Configuration Management', () => {
        it('should update credentials', () => {
            analyzer.setCredentials('new-api-key', 'https://custom.endpoint.com');
            expect(analyzer.isConfigured()).toBe(true);
        });

        it('should handle empty API key', () => {
            analyzer.setCredentials('');
            expect(analyzer.isConfigured()).toBe(false);
        });

        it('should maintain configuration across requests', async () => {
            analyzer.setCredentials('persistent-key');
            
            const request1 = {
                pattern: { type: 'spike', intensity: 100, confidence: 0.8, duration: 100, startLine: 0, endLine: 0 },
                context: { metrics: { totalMovements: 5 } }
            };
            
            const request2 = {
                pattern: { type: 'gradual', intensity: 50, confidence: 0.7, duration: 1000, startLine: 1, endLine: 1 },
                context: { metrics: { totalMovements: 3 } }
            };

            const result1 = await analyzer.analyzePattern(request1);
            const result2 = await analyzer.analyzePattern(request2);

            expect(result1.summary).toContain('AI analysis response');
            expect(result2.summary).toContain('AI analysis response');
        });
    });
});
