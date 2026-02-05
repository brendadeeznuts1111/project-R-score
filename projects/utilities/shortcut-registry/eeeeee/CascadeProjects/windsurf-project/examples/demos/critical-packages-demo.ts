#!/usr/bin/env bun

// Demo of critical package pinning with exact versions
import express from 'express';
import { z } from 'zod';
import _ from 'lodash';

// Create Express app with pinned version
const app = express();
const port = 3000;

// Zod schema for request validation (pinned version)
const RequestSchema = z.object({
  message: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    status: '✅ Critical packages working',
    express: '5.2.1 (pinned)',
    zod: '^4.3.5',
    lodash: '4.17.23 (pinned)',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/process', (req, res) => {
  try {
    // Validate with Zod (pinned version)
    const validated = RequestSchema.parse(req.body);
    
    // Process with Lodash (pinned version)
    const processed = _.capitalize(validated.message);
    const priority = validated.priority.toUpperCase();
    
    res.json({
      success: true,
      data: {
        original: validated.message,
        processed: processed,
        priority: priority,
        processedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    packages: {
      express: '5.2.1', // Exact version - no breaking changes
      zod: '^4.3.5',    // Range - allows patches
      lodash: '4.17.23'  // Exact version - stable utility
    }
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Critical Package Pinning Demo');
  console.log('==================================');
  console.log(`📡 Server running at http://localhost:${port}`);
  console.log('📦 Package Versions:');
  console.log('   - Express: 5.2.1 (pinned - no breaking changes)');
  console.log('   - Zod: ^4.3.5 (range - allows patches)');
  console.log('   - Lodash: 4.17.23 (pinned - stable utility)');
  console.log('');
  console.log('🔗 Try these endpoints:');
  console.log(`   GET  http://localhost:${port}/`);
  console.log(`   GET  http://localhost:${port}/health`);
  console.log(`   POST http://localhost:${port}/api/process`);
  console.log('        Body: {"message": "hello world", "priority": "high"}');
});
