#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]demo-canvas-integration
 * 
 * Demo Canvas Integration
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,canvas,integration,visualization
 */

#!/usr/bin/env bun
// =============================================================================
// CANVAS VAULT INTEGRATION DEMO - ODDS PROTOCOL - 2025-11-18
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-18T18:06:00Z
// DESCRIPTION: Demonstration of canvas-vault integration capabilities
// =============================================================================

import {
    CanvasVaultIntegration,
    createNodeFromVaultFile,
    createNodeFromMetadata,
    createEdgeFromNodes,
    createCanvasFromVaultFiles,
    VaultDocumentType,
    type CanvasNodeWithMetadata,
    type VaultFile
} from '../../src/canvas/canvas-vault-integration.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// [DEMO_DATA] - 2025-11-18
// =============================================================================

// Sample vault files for demonstration
const sampleVaultFiles: VaultFile[] = [
    {
        path: '02 - Architecture/api-gateway.md',
        name: 'api-gateway.md',
        extension: 'md',
        size: 2048,
        createdAt: new Date('2025-11-18T10:00:00Z'),
        modifiedAt: new Date('2025-11-18T15:00:00Z'),
        content: `# API Gateway Architecture

## Overview
The API Gateway serves as the central entry point for all client requests.

## Features
- Request routing
- Load balancing
- Authentication
- Rate limiting

## Configuration
\`\`\`yaml
port: 3000
routes:
  - path: /api/v1/users
    service: user-service
  - path: /api/v1/orders
    service: order-service
\`\`\``,
        frontmatter: {
            type: VaultDocumentType.API_DOC,
            priority: 'high',
            status: 'active',
            version: '2.1.0',
            validatedAt: new Date('2025-11-18T16:00:00Z')
        },
        tags: ['api', 'gateway', 'microservices', 'architecture'],
        links: ['02 - Architecture/user-service.md', '02 - Architecture/order-service.md'],
        backlinks: ['00 - Dashboard.md']
    },
    {
        path: '02 - Architecture/user-service.md',
        name: 'user-service.md',
        extension: 'md',
        size: 1536,
        createdAt: new Date('2025-11-18T11:00:00Z'),
        modifiedAt: new Date('2025-11-18T14:30:00Z'),
        content: `# User Service

## Purpose
Manages user authentication, profiles, and preferences.

## Endpoints
- POST /auth/login
- GET /users/:id
- PUT /users/:id
- DELETE /users/:id

## Database Schema
- Users table
- Profiles table
- Sessions table`,
        frontmatter: {
            type: VaultDocumentType.DOCUMENTATION,
            priority: 'high',
            status: 'active',
            version: '1.5.0',
            validatedAt: new Date('2025-11-18T15:30:00Z')
        },
        tags: ['service', 'users', 'authentication', 'microservices'],
        links: ['02 - Architecture/api-gateway.md'],
        backlinks: ['02 - Architecture/api-gateway.md']
    },
    {
        path: '02 - Architecture/order-service.md',
        name: 'order-service.md',
        extension: 'md',
        size: 1792,
        createdAt: new Date('2025-11-18T12:00:00Z'),
        modifiedAt: new Date('2025-11-18T14:45:00Z'),
        content: `# Order Service

## Purpose
Handles order processing, payment integration, and inventory management.

## Features
- Order creation and tracking
- Payment processing
- Inventory updates
- Order analytics

## Integration
- Payment Gateway API
- Inventory Service
- Notification Service`,
        frontmatter: {
            type: VaultDocumentType.DOCUMENTATION,
            priority: 'medium',
            status: 'beta',
            version: '1.2.0',
            validatedAt: new Date('2025-11-18T15:45:00Z')
        },
        tags: ['service', 'orders', 'payments', 'microservices'],
        links: ['02 - Architecture/api-gateway.md'],
        backlinks: ['02 - Architecture/api-gateway.md']
    },
    {
        path: '03 - Development/deployment-guide.md',
        name: 'deployment-guide.md',
        extension: 'md',
        size: 3072,
        createdAt: new Date('2025-11-18T09:00:00Z'),
        modifiedAt: new Date('2025-11-18T13:00:00Z'),
        content: `# Deployment Guide

## Overview
Complete guide for deploying the Odds Protocol system.

## Prerequisites
- Docker 20.10+
- Kubernetes 1.24+
- Helm 3.8+

## Steps
1. Prepare environment
2. Build containers
3. Deploy to staging
4. Run integration tests
5. Deploy to production

## Monitoring
- Prometheus metrics
- Grafana dashboards
- Alert configuration`,
        frontmatter: {
            type: VaultDocumentType.TUTORIAL,
            priority: 'medium',
            status: 'active',
            version: '3.0.0',
            validatedAt: new Date('2025-11-18T14:00:00Z')
        },
        tags: ['deployment', 'docker', 'kubernetes', 'devops'],
        links: [],
        backlinks: ['00 - Dashboard.md']
    }
];

// =============================================================================
// [DEMO_FUNCTIONS] - 2025-11-18
// =============================================================================

function demonstrateNodeCreation(): void {
    console.log('🎨 Demonstrating Canvas Node Creation');
    console.log('═'.repeat(60));

    // 1. Create node from vault file
    const apiGatewayNode = createNodeFromVaultFile(sampleVaultFiles[0]);
    console.log('📄 Created node from vault file:');
    console.log(`   ID: ${apiGatewayNode.id}`);
    console.log(`   Type: ${apiGatewayNode.metadata.documentType}`);
    console.log(`   Priority: ${apiGatewayNode.metadata.priority}`);
    console.log(`   Status: ${apiGatewayNode.metadata.status}`);
    console.log(`   Tags: ${apiGatewayNode.metadata.tags.join(', ')}`);
    console.log(`   Color: ${apiGatewayNode.color}`);
    console.log();

    // 2. Create custom node from metadata
    const customNode = createNodeFromMetadata(
        'system:database',
        'Database Cluster',
        'PostgreSQL cluster with read replicas and automatic failover',
        VaultDocumentType.DOCUMENTATION,
        {
            x: 300,
            y: 200,
            width: 450,
            height: 180,
            tags: ['database', 'postgresql', 'cluster'],
            priority: 'high',
            status: 'active'
        }
    );
    console.log('🏗️ Created custom node from metadata:');
    console.log(`   ID: ${customNode.id}`);
    console.log(`   Title: Database Cluster`);
    console.log(`   Type: ${customNode.metadata.documentType}`);
    console.log(`   Position: (${customNode.x}, ${customNode.y})`);
    console.log(`   Size: ${customNode.width}x${customNode.height}`);
    console.log(`   Health Score: ${customNode.metadata.healthScore}`);
    console.log();
}

function demonstrateEdgeCreation(): void {
    console.log('🔗 Demonstrating Canvas Edge Creation');
    console.log('═'.repeat(60));

    // Create edges between nodes
    const dependencyEdge = createEdgeFromNodes(
        'file:02-Architecture:api-gateway',
        'file:02-Architecture:user-service',
        'dependency',
        {
            label: 'API Calls',
            strength: 0.8,
            bidirectional: false,
            fromSide: 'bottom',
            toSide: 'top'
        }
    );

    console.log('🔗 Created dependency edge:');
    console.log(`   From: ${dependencyEdge.fromNode}`);
    console.log(`   To: ${dependencyEdge.toNode}`);
    console.log(`   Type: ${dependencyEdge.metadata.relationshipType}`);
    console.log(`   Label: ${dependencyEdge.label}`);
    console.log(`   Strength: ${dependencyEdge.metadata.strength}`);
    console.log(`   Bidirectional: ${dependencyEdge.metadata.bidirectional}`);
    console.log(`   Color: ${dependencyEdge.color}`);
    console.log();

    const referenceEdge = createEdgeFromNodes(
        'file:02-Architecture:api-gateway',
        'file:03-Development:deployment-guide',
        'reference',
        {
            label: 'Deployment Info',
            strength: 0.5,
            bidirectional: true
        }
    );

    console.log('📚 Created reference edge:');
    console.log(`   From: ${referenceEdge.fromNode}`);
    console.log(`   To: ${referenceEdge.toNode}`);
    console.log(`   Type: ${referenceEdge.metadata.relationshipType}`);
    console.log(`   Bidirectional: ${referenceEdge.metadata.bidirectional}`);
    console.log();
}

function demonstrateCanvasGeneration(): void {
    console.log('🎨 Demonstrating Canvas Generation from Vault Files');
    console.log('═'.repeat(60));

    // Generate canvas from vault files
    const systemCanvas = createCanvasFromVaultFiles(
        sampleVaultFiles,
        'Odds Protocol System Architecture',
        {
            description: 'Complete system architecture with all services and components',
            author: 'Architecture Team',
            category: 'system-design',
            autoLayout: true
        }
    );

    console.log('📊 Generated canvas summary:');
    console.log(`   Name: ${systemCanvas.metadata.name}`);
    console.log(`   Description: ${systemCanvas.metadata.description}`);
    console.log(`   Category: ${systemCanvas.metadata.category}`);
    console.log(`   Author: ${systemCanvas.metadata.author}`);
    console.log(`   Version: ${systemCanvas.metadata.version}`);
    console.log(`   Health Score: ${systemCanvas.metadata.healthScore}%`);
    console.log(`   Total Nodes: ${systemCanvas.metadata.totalNodes}`);
    console.log(`   Total Edges: ${systemCanvas.metadata.totalEdges}`);
    console.log(`   Complexity: ${systemCanvas.metadata.complexity}`);
    console.log();

    console.log('📋 Node breakdown:');
    const nodeTypes = systemCanvas.nodes.reduce((acc, node) => {
        acc[node.metadata.documentType] = (acc[node.metadata.documentType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(nodeTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} nodes`);
    });
    console.log();

    console.log('🔗 Edge breakdown:');
    const edgeTypes = systemCanvas.edges.reduce((acc, edge) => {
        acc[edge.metadata.relationshipType] = (acc[edge.metadata.relationshipType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(edgeTypes).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} edges`);
    });
    console.log();
}

function demonstrateCanvasSaving(): void {
    console.log('💾 Demonstrating Canvas Saving');
    console.log('═'.repeat(60));

    const integration = new CanvasVaultIntegration(process.cwd());

    // Generate canvas
    const demoCanvas = createCanvasFromVaultFiles(
        sampleVaultFiles.slice(0, 3), // Use first 3 files
        'Demo Microservices Architecture',
        {
            description: 'Demo canvas showing microservices architecture',
            author: 'Demo System',
            category: 'architecture',
            autoLayout: true
        }
    );

    // Save to file
    const canvasPath = 'demo-generated-canvas.canvas';
    integration.saveCanvasToFile(demoCanvas, canvasPath);

    console.log(`💾 Canvas saved to: ${canvasPath}`);
    console.log(`   File size: ${demoCanvas.metadata.totalNodes} nodes, ${demoCanvas.metadata.totalEdges} edges`);
    console.log(`   Health score: ${demoCanvas.metadata.healthScore}%`);
    console.log(`   Complexity: ${demoCanvas.metadata.complexity}`);
    console.log();

    // Load and verify
    const loadedCanvas = integration.loadCanvasWithMetadata(canvasPath);
    console.log('📂 Loaded canvas verification:');
    console.log(`   Nodes loaded: ${loadedCanvas.metadata.totalNodes}`);
    console.log(`   Edges loaded: ${loadedCanvas.metadata.totalEdges}`);
    console.log(`   Metadata preserved: ${loadedCanvas.metadata.name}`);
    console.log();
}

function demonstrateMetadataAnalysis(): void {
    console.log('📈 Demonstrating Metadata Analysis');
    console.log('═'.repeat(60));

    // Create nodes with different metadata quality
    const nodes: CanvasNodeWithMetadata[] = [
        createNodeFromMetadata(
            'high-quality-node',
            'Complete Documentation',
            'This node has complete metadata with all fields populated',
            VaultDocumentType.DOCUMENTATION,
            {
                tags: ['complete', 'documentation', 'high-quality'],
                priority: 'high',
                status: 'active'
            }
        ),
        createNodeFromMetadata(
            'medium-quality-node',
            'Basic Info',
            'This node has basic metadata',
            VaultDocumentType.NOTE,
            {
                tags: ['basic'],
                priority: 'medium',
                status: 'beta'
            }
        ),
        createNodeFromMetadata(
            'low-quality-node',
            'Minimal',
            'Minimal content',
            VaultDocumentType.NOTE,
            {
                tags: [],
                priority: 'low',
                status: 'deprecated'
            }
        )
    ];

    console.log('📊 Node Health Analysis:');
    nodes.forEach((node, index) => {
        console.log(`   Node ${index + 1}: ${node.id}`);
        console.log(`     Health Score: ${node.metadata.healthScore}%`);
        console.log(`     Tags: ${node.metadata.tags.length}`);
        console.log(`     Priority: ${node.metadata.priority}`);
        console.log(`     Status: ${node.metadata.status}`);
        console.log(`     Content Length: ${node.text.length} chars`);
    });
    console.log();

    // Calculate overall canvas health
    const overallHealth = Math.round(
        nodes.reduce((sum, node) => sum + node.metadata.healthScore, 0) / nodes.length
    );
    console.log(`🏥 Overall Canvas Health: ${overallHealth}%`);
    console.log();
}

// =============================================================================
// [MAIN_DEMO] - 2025-11-18
// =============================================================================

function runDemo(): void {
    console.clear();
    console.log('🎨 Canvas Vault Integration Demo');
    console.log('🚀 Odds Protocol - Advanced Canvas System');
    console.log('═'.repeat(80));
    console.log();

    try {
        demonstrateNodeCreation();
        demonstrateEdgeCreation();
        demonstrateCanvasGeneration();
        demonstrateCanvasSaving();
        demonstrateMetadataAnalysis();

        console.log('🎉 Demo completed successfully!');
        console.log();
        console.log('📚 Next steps:');
        console.log('   1. Integrate with actual vault file system');
        console.log('   2. Add real-time metadata synchronization');
        console.log('   3. Implement canvas template system');
        console.log('   4. Add collaborative editing features');
        console.log('   5. Create canvas analytics dashboard');

    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

// Run demo if this file is executed directly
if (import.meta.main) {
    runDemo();
}

export { runDemo };
