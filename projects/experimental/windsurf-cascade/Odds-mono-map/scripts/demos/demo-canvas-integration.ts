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
    console.info('🎨 Demonstrating Canvas Node Creation');
    console.info('═'.repeat(60));

    // 1. Create node from vault file
    const apiGatewayNode = createNodeFromVaultFile(sampleVaultFiles[0]);
    console.info('📄 Created node from vault file:');
    console.info(`   ID: ${apiGatewayNode.id}`);
    console.info(`   Type: ${apiGatewayNode.metadata.documentType}`);
    console.info(`   Priority: ${apiGatewayNode.metadata.priority}`);
    console.info(`   Status: ${apiGatewayNode.metadata.status}`);
    console.info(`   Tags: ${apiGatewayNode.metadata.tags.join(', ')}`);
    console.info(`   Color: ${apiGatewayNode.color}`);
    console.info();

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
    console.info('🏗️ Created custom node from metadata:');
    console.info(`   ID: ${customNode.id}`);
    console.info(`   Title: Database Cluster`);
    console.info(`   Type: ${customNode.metadata.documentType}`);
    console.info(`   Position: (${customNode.x}, ${customNode.y})`);
    console.info(`   Size: ${customNode.width}x${customNode.height}`);
    console.info(`   Health Score: ${customNode.metadata.healthScore}`);
    console.info();
}

function demonstrateEdgeCreation(): void {
    console.info('🔗 Demonstrating Canvas Edge Creation');
    console.info('═'.repeat(60));

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

    console.info('🔗 Created dependency edge:');
    console.info(`   From: ${dependencyEdge.fromNode}`);
    console.info(`   To: ${dependencyEdge.toNode}`);
    console.info(`   Type: ${dependencyEdge.metadata.relationshipType}`);
    console.info(`   Label: ${dependencyEdge.label}`);
    console.info(`   Strength: ${dependencyEdge.metadata.strength}`);
    console.info(`   Bidirectional: ${dependencyEdge.metadata.bidirectional}`);
    console.info(`   Color: ${dependencyEdge.color}`);
    console.info();

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

    console.info('📚 Created reference edge:');
    console.info(`   From: ${referenceEdge.fromNode}`);
    console.info(`   To: ${referenceEdge.toNode}`);
    console.info(`   Type: ${referenceEdge.metadata.relationshipType}`);
    console.info(`   Bidirectional: ${referenceEdge.metadata.bidirectional}`);
    console.info();
}

function demonstrateCanvasGeneration(): void {
    console.info('🎨 Demonstrating Canvas Generation from Vault Files');
    console.info('═'.repeat(60));

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

    console.info('📊 Generated canvas summary:');
    console.info(`   Name: ${systemCanvas.metadata.name}`);
    console.info(`   Description: ${systemCanvas.metadata.description}`);
    console.info(`   Category: ${systemCanvas.metadata.category}`);
    console.info(`   Author: ${systemCanvas.metadata.author}`);
    console.info(`   Version: ${systemCanvas.metadata.version}`);
    console.info(`   Health Score: ${systemCanvas.metadata.healthScore}%`);
    console.info(`   Total Nodes: ${systemCanvas.metadata.totalNodes}`);
    console.info(`   Total Edges: ${systemCanvas.metadata.totalEdges}`);
    console.info(`   Complexity: ${systemCanvas.metadata.complexity}`);
    console.info();

    console.info('📋 Node breakdown:');
    const nodeTypes = systemCanvas.nodes.reduce((acc, node) => {
        acc[node.metadata.documentType] = (acc[node.metadata.documentType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(nodeTypes).forEach(([type, count]) => {
        console.info(`   ${type}: ${count} nodes`);
    });
    console.info();

    console.info('🔗 Edge breakdown:');
    const edgeTypes = systemCanvas.edges.reduce((acc, edge) => {
        acc[edge.metadata.relationshipType] = (acc[edge.metadata.relationshipType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    Object.entries(edgeTypes).forEach(([type, count]) => {
        console.info(`   ${type}: ${count} edges`);
    });
    console.info();
}

function demonstrateCanvasSaving(): void {
    console.info('💾 Demonstrating Canvas Saving');
    console.info('═'.repeat(60));

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

    console.info(`💾 Canvas saved to: ${canvasPath}`);
    console.info(`   File size: ${demoCanvas.metadata.totalNodes} nodes, ${demoCanvas.metadata.totalEdges} edges`);
    console.info(`   Health score: ${demoCanvas.metadata.healthScore}%`);
    console.info(`   Complexity: ${demoCanvas.metadata.complexity}`);
    console.info();

    // Load and verify
    const loadedCanvas = integration.loadCanvasWithMetadata(canvasPath);
    console.info('📂 Loaded canvas verification:');
    console.info(`   Nodes loaded: ${loadedCanvas.metadata.totalNodes}`);
    console.info(`   Edges loaded: ${loadedCanvas.metadata.totalEdges}`);
    console.info(`   Metadata preserved: ${loadedCanvas.metadata.name}`);
    console.info();
}

function demonstrateMetadataAnalysis(): void {
    console.info('📈 Demonstrating Metadata Analysis');
    console.info('═'.repeat(60));

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

    console.info('📊 Node Health Analysis:');
    nodes.forEach((node, index) => {
        console.info(`   Node ${index + 1}: ${node.id}`);
        console.info(`     Health Score: ${node.metadata.healthScore}%`);
        console.info(`     Tags: ${node.metadata.tags.length}`);
        console.info(`     Priority: ${node.metadata.priority}`);
        console.info(`     Status: ${node.metadata.status}`);
        console.info(`     Content Length: ${node.text.length} chars`);
    });
    console.info();

    // Calculate overall canvas health
    const overallHealth = Math.round(
        nodes.reduce((sum, node) => sum + node.metadata.healthScore, 0) / nodes.length
    );
    console.info(`🏥 Overall Canvas Health: ${overallHealth}%`);
    console.info();
}

// =============================================================================
// [MAIN_DEMO] - 2025-11-18
// =============================================================================

function runDemo(): void {
    console.clear();
    console.info('🎨 Canvas Vault Integration Demo');
    console.info('🚀 Odds Protocol - Advanced Canvas System');
    console.info('═'.repeat(80));
    console.info();

    try {
        demonstrateNodeCreation();
        demonstrateEdgeCreation();
        demonstrateCanvasGeneration();
        demonstrateCanvasSaving();
        demonstrateMetadataAnalysis();

        console.info('🎉 Demo completed successfully!');
        console.info();
        console.info('📚 Next steps:');
        console.info('   1. Integrate with actual vault file system');
        console.info('   2. Add real-time metadata synchronization');
        console.info('   3. Implement canvas template system');
        console.info('   4. Add collaborative editing features');
        console.info('   5. Create canvas analytics dashboard');

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
