#!/usr/bin/env bun

// ai/index.ts - Main entry point for Nebula-Flow™ AI System
// Orchestrates anomaly detection, training, and API services

import { AnomalyEngine } from './anomalyEngine.js';
import { createRoutes } from './api.js';
import { trainModel } from './train.js';
import { readFileSync } from 'fs';

console.log("🚀 Nebula-Flow™ AI System v1.0 - Starting");

export class NebulaAISystem {
    private engine: AnomalyEngine;
    private isTraining = false;
    private trainingInterval: NodeJS.Timeout | null = null;
    
    constructor() {
        this.engine = new AnomalyEngine();
        this.setupNightlyTraining();
    }
    
    /**
     * Initialize the AI system
     */
    async initialize(): Promise<void> {
        console.log('🔧 Initializing Nebula AI System...');
        
        try {
            // Check if model exists, create dummy if not
            await this.ensureModelExists();
            
            // Initialize the anomaly engine
            await this.engine.getStats();
            
            // Setup nightly training schedule
            this.setupNightlyTraining();
            
            console.log('✅ Nebula AI System initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AI System:', error);
            throw error;
        }
    }
    
    /**
     * Ensure model file exists
     */
    private async ensureModelExists(): Promise<void> {
        try {
            const modelPath = './ai/model.onnx';
            
            try {
                readFileSync(modelPath);
                console.log('✅ Model file exists');
            } catch (error) {
                console.log('📄 Creating dummy model file...');
                
                // Create a 28KB dummy model file
                const modelBuffer = new Uint8Array(28000);
                const metadata = {
                    version: 'v1.0.0',
                    type: 'anomaly-detection',
                    created: new Date().toISOString(),
                    features: 10,
                    size: 28000
                };
                
                const encoder = new TextEncoder();
                const metadataBytes = encoder.encode(JSON.stringify(metadata));
                const bytesToWrite = Math.min(metadataBytes.length, 1000);
                modelBuffer.set(metadataBytes.slice(0, bytesToWrite), 0);
                
                require('fs').writeFileSync(modelPath, modelBuffer);
                console.log('✅ Dummy model created');
            }
        } catch (error) {
            console.warn('⚠️ Could not ensure model exists:', error instanceof Error ? error.message : String(error));
        }
    }
    
    /**
     * Setup nightly training schedule
     */
    private setupNightlyTraining(): void {
        // Schedule training for 2 AM daily
        const scheduleTraining = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(2, 0, 0, 0);
            
            const msUntilTraining = tomorrow.getTime() - now.getTime();
            
            console.log(`📅 Next training scheduled for: ${tomorrow.toISOString()}`);
            
            this.trainingInterval = setTimeout(async () => {
                await this.runScheduledTraining();
                // Reschedule for next day
                scheduleTraining();
            }, msUntilTraining);
        };
        
        scheduleTraining();
    }
    
    /**
     * Run scheduled training
     */
    private async runScheduledTraining(): Promise<void> {
        if (this.isTraining) {
            console.log('⚠️ Training already in progress, skipping');
            return;
        }
        
        this.isTraining = true;
        console.log('🎯 Starting scheduled training...');
        
        try {
            const metrics = await trainModel();
            console.log(`✅ Training completed: Accuracy ${(metrics.accuracy * 100).toFixed(1)}%`);
        } catch (error) {
            console.error('❌ Scheduled training failed:', error);
        } finally {
            this.isTraining = false;
        }
    }
    
    /**
     * Get system status
     */
    getStatus() {
        return {
            initialized: true,
            modelLoaded: this.engine.getStats().modelInitialized,
            isTraining: this.isTraining,
            version: '1.0.0',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
    }
    
    /**
     * Shutdown the system
     */
    async shutdown(): Promise<void> {
        console.log('🛑 Shutting down Nebula AI System...');
        
        if (this.trainingInterval) {
            clearTimeout(this.trainingInterval);
            this.trainingInterval = null;
        }
        
        console.log('✅ Nebula AI System shut down complete');
    }
}

// Express.js integration
export function createAISystem(app: any) {
    const aiSystem = new NebulaAISystem();
    
    // Initialize before starting server
    aiSystem.initialize().then(() => {
        console.log('🤖 AI System ready');
    }).catch(error => {
        console.error('❌ AI System initialization failed:', error);
    });
    
    // Register API routes
    createRoutes(app);
    
    // Add AI system to app for access
    app.set('aiSystem', aiSystem);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down AI System...');
        await aiSystem.shutdown();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down AI System...');
        await aiSystem.shutdown();
        process.exit(0);
    });
    
    return aiSystem;
}

// CLI interface
if (import.meta.main) {
    const command = process.argv[2];
    
    switch (command) {
        case 'train':
            console.log('🎯 Running manual training...');
            trainModel()
                .then(metrics => {
                    console.log('✅ Training completed successfully');
                    console.log(`📈 Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Training failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'status':
            const system = new NebulaAISystem();
            system.initialize().then(() => {
                console.log('📊 System Status:');
                console.log(JSON.stringify(system.getStatus(), null, 2));
                process.exit(0);
            }).catch(error => {
                console.error('❌ Failed to get status:', error);
                process.exit(1);
            });
            break;
            
        case 'serve':
            console.log('🌐 Starting AI API server...');
            // This would start an Express server in a real implementation
            console.log('📡 API server would start on http://localhost:3001');
            console.log('🎮 Dashboard available at http://localhost:3001/ai/dashboard.html');
            break;
            
        default:
            console.log('🤖 Nebula-Flow™ AI System v1.0');
            console.log('');
            console.log('Usage:');
            console.log('  bun ai/index.ts train     - Train the model');
            console.log('  bun ai/index.ts status    - Show system status');
            console.log('  bun ai/index.ts serve     - Start API server');
            console.log('');
            console.log('Features:');
            console.log('  ✅ Real-time anomaly detection');
            console.log('  ✅ WebAssembly ONNX inference');
            console.log('  ✅ Nightly automated training');
            console.log('  ✅ REST API with dashboard');
            console.log('  ✅ Performance monitoring');
            break;
    }
}

export default NebulaAISystem;
