---
type: guide
title: Canvas Types Guide
section: Development
category: technical-documentation
priority: high
status: published
tags: [canvas, types, integration, vault, guide]
created: 2025-11-18T18:21:00Z
modified: 2025-11-18T18:21:00Z
author: Odds Protocol Development Team
teamMember: Canvas Integration Specialist
version: 1.0.0
---

# 🎨 Canvas Types Guide

## **Complete Guide to Canvas-Vault Type Integration**

---

## **🎯 Overview**

The canvas type system bridges the gap between visual canvas representation and structured vault metadata. This guide explains how to use the enhanced canvas types for seamless integration.

---

## **🏗️ Core Canvas Interfaces**

### **CanvasNodeWithMetadata Interface**

```typescript
export interface CanvasNodeWithMetadata {
    // Basic canvas properties
    id: string;                      // 🏷️ Unique node identifier
    x: number;                       // 📍 X coordinate
    y: number;                       // 📍 Y coordinate
    width: number;                   // 📏 Node width
    height: number;                  // 📏 Node height
    type: 'text' | 'file';          // 📝 Node type
    text: string;                    // 💬 Node content
    color: string;                   // 🎨 Node color (1-9)
    
    // Vault integration metadata
    metadata: {
        documentType: VaultDocumentType;  // 📋 Vault document type
        relatedFile: string;              // 📁 Related vault file path
        tags: string[];                   // 🏷️ Vault tags
        priority: Priority;               // 🎯 Priority level
        status: DocumentStatus;           // 📊 Document status
        version: string;                  // 🏷️ Document version
        healthScore: number;              // 💯 Quality score (0-100)
        created: Date;                    // 📅 Creation timestamp
        modified: Date;                   // 🔄 Last modified timestamp
        author: string;                   // 👤 Document author
        teamMember: string;               // 👥 Team member
    };
    
    // Canvas-specific properties
    style?: CanvasNodeStyle;          // 🎨 Optional styling
    group?: string;                   // 📋 Optional group assignment
    zIndex?: number;                  // 📊 Layer ordering
}
```

### **CanvasEdgeWithMetadata Interface**

```typescript
export interface CanvasEdgeWithMetadata {
    // Basic edge properties
    id: string;                      // 🏷️ Unique edge identifier
    fromNode: string;                // 📤 Source node ID
    toNode: string;                  // 📥 Target node ID
    fromSide: 'left' | 'right' | 'top' | 'bottom'; // 📤 Source side
    toSide: 'left' | 'right' | 'top' | 'bottom';   // 📥 Target side
    color: string;                   // 🎨 Edge color
    label: string;                   // 🏷️ Edge label
    
    // Vault integration metadata
    metadata: {
        relationshipType: 'dependency' | 'reference' | 'hierarchy' | 'association'; // 🔗 Type
        strength: number;            // 💪 Relationship strength (0-1)
        context: string;             // 📝 Relationship context
        bidirectional: boolean;      // 🔄 Is relationship bidirectional?
        created: Date;               // 📅 Creation timestamp
        author: string;              // 👤 Edge creator
    };
    
    // Visual properties
    style?: CanvasEdgeStyle;         // 🎨 Optional styling
    animated?: boolean;              // 🎬 Animation enabled
    weight?: number;                 // 📊 Line weight
}
```

### **CanvasWithMetadata Interface**

```typescript
export interface CanvasWithMetadata {
    // Canvas structure
    nodes: CanvasNodeWithMetadata[]; // 📊 Array of nodes
    edges: CanvasEdgeWithMetadata[]; // 🔗 Array of edges
    
    // Canvas metadata
    metadata: {
        name: string;                // 📝 Canvas name
        description: string;         // 📋 Canvas description
        version: string;             // 🏷️ Canvas version
        created: Date;               // 📅 Creation timestamp
        modified: Date;              // 🔄 Last modified timestamp
        author: string;              // 👤 Canvas author
        teamMember: string;          // 👥 Team member
        category: string;            // 📂 Canvas category
        healthScore: number;         // 💯 Overall health score
        totalNodes: number;          // 📊 Total node count
        totalEdges: number;          // 🔗 Total edge count
        complexity: number;          // 🧠 Complexity score (0-100)
        tags: string[];              // 🏷️ Canvas tags
    };
    
    // Layout and styling
    layout: CanvasLayout;            // 📐 Layout configuration
    theme: CanvasTheme;              // 🎨 Theme configuration
}
```

---

## **🎨 Styling Interfaces**

### **CanvasNodeStyle Interface**

```typescript
export interface CanvasNodeStyle {
    backgroundColor?: string;        // 🎨 Background color
    borderColor?: string;            // 🖼️ Border color
    borderWidth?: number;            // 📏 Border width
    borderStyle?: 'solid' | 'dashed' | 'dotted'; // 🖊️ Border style
    borderRadius?: number;           // 🔄 Corner radius
    fontSize?: number;               // 📝 Font size
    fontFamily?: string;             // 🔤 Font family
    fontWeight?: 'normal' | 'bold';  // 💪 Font weight
    textAlign?: 'left' | 'center' | 'right'; // 📐 Text alignment
    padding?: number;                // 📏 Internal padding
    margin?: number;                 // 📏 External margin
    shadow?: boolean;                // 🌑 Drop shadow
    opacity?: number;                // 👻 Opacity (0-1)
}
```

### **CanvasEdgeStyle Interface**

```typescript
export interface CanvasEdgeStyle {
    lineStyle?: 'solid' | 'dashed' | 'dotted'; // 🖊️ Line style
    lineWidth?: number;              // 📏 Line width
    arrowStyle?: 'none' | 'arrow' | 'diamond' | 'circle'; // ➡️ Arrow style
    arrowSize?: number;              // 📏 Arrow size
    curvature?: number;              // 🌊 Edge curvature (0-1)
    dashArray?: number[];            // 📐 Dash pattern
    opacity?: number;                // 👻 Opacity (0-1)
    glow?: boolean;                  // ✨ Glow effect
    animated?: boolean;              // 🎬 Animation
}
```

---

## **📐 Layout and Theme**

### **CanvasLayout Interface**

```typescript
export interface CanvasLayout {
    type: 'manual' | 'grid' | 'hierarchical' | 'force'; // 📐 Layout type
    spacing: number;                 // 📏 Node spacing
    alignment: 'left' | 'center' | 'right'; // 📐 Alignment
    direction: 'horizontal' | 'vertical'; // ↕️ Layout direction
    autoOrganize: boolean;           // 🤖 Auto-organization enabled
    snapToGrid: boolean;             // 📐 Grid snapping
    gridSize: number;                // 📏 Grid size
}
```

### **CanvasTheme Interface**

```typescript
export interface CanvasTheme {
    name: string;                    // 📝 Theme name
    backgroundColor: string;         // 🎨 Background color
    gridColor: string;               // 📐 Grid color
    nodeColors: Record<VaultDocumentType, string>; // 🎨 Node colors
    edgeColors: Record<string, string>; // 🔗 Edge colors
    fontColor: string;               // 📝 Default font color
    fontSize: number;                // 📝 Default font size
    fontFamily: string;              // 🔤 Default font family
}
```

---

## **🔧 Core Functions**

### **Node Creation Functions**

```typescript
// Create canvas node from vault file
export function createNodeFromVaultFile(
    vaultFile: VaultFile,
    position: { x: number; y: number },
    options?: Partial<CanvasNodeWithMetadata>
): CanvasNodeWithMetadata {
    const nodeId = generateNodeIdFromPath(vaultFile.path);
    const documentType = parseDocumentType(vaultFile.frontmatter.type as string) || VaultDocumentType.NOTE;
    
    return {
        id: nodeId,
        x: position.x,
        y: position.y,
        width: options?.width || 350,
        height: options?.height || 200,
        type: 'text',
        text: generateNodeText(vaultFile),
        color: getColorForDocumentType(documentType),
        metadata: {
            documentType,
            relatedFile: vaultFile.path,
            tags: vaultFile.tags,
            priority: parsePriority(vaultFile.frontmatter.priority as string) || Priority.MEDIUM,
            status: parseStatus(vaultFile.frontmatter.status as string) || DocumentStatus.DRAFT,
            version: vaultFile.frontmatter.version as string || '1.0.0',
            healthScore: calculateNodeHealthScore(vaultFile),
            created: vaultFile.created,
            modified: vaultFile.modified,
            author: vaultFile.frontmatter.author as string || 'Unknown',
            teamMember: vaultFile.frontmatter.teamMember as string || 'Team Member',
            ...options?.metadata
        },
        ...options
    };
}

// Generate node ID from file path
export function generateNodeIdFromPath(filePath: string): string {
    return filePath
        .replace(/^.*\//, '')           // Remove directory
        .replace(/\.[^/.]+$/, '')       // Remove extension
        .replace(/[^a-zA-Z0-9]/g, '-')  // Replace non-alphanumeric with dash
        .replace(/-+/g, '-')           // Replace multiple dashes
        .toLowerCase()
        .replace(/^-|-$/g, '');         // Remove leading/trailing dashes
}

// Generate node text from vault file
export function generateNodeText(vaultFile: VaultFile): string {
    const title = vaultFile.frontmatter.title as string || vaultFile.name;
    const type = vaultFile.frontmatter.type as string || 'note';
    const description = vaultFile.frontmatter.description as string || '';
    
    let text = `# ${title}\n\n`;
    if (description) {
        text += `${description}\n\n`;
    }
    text += `**Type**: ${type}\n`;
    text += `**Tags**: ${vaultFile.tags.join(', ')}\n`;
    
    return text;
}
```

### **Edge Creation Functions**

```typescript
// Create edge between two nodes
export function createEdgeFromNodes(
    fromNode: CanvasNodeWithMetadata,
    toNode: CanvasNodeWithMetadata,
    relationshipType: CanvasEdgeWithMetadata['metadata']['relationshipType'],
    label?: string
): CanvasEdgeWithMetadata {
    const edgeId = generateEdgeId(fromNode.id, toNode.id, relationshipType);
    const color = getEdgeColorForRelationship(relationshipType);
    
    return {
        id: edgeId,
        fromNode: fromNode.id,
        toNode: toNode.id,
        fromSide: determineOptimalSide(fromNode, toNode, 'from'),
        toSide: determineOptimalSide(fromNode, toNode, 'to'),
        color,
        label: label || relationshipType,
        metadata: {
            relationshipType,
            strength: calculateRelationshipStrength(fromNode, toNode),
            context: generateRelationshipContext(fromNode, toNode),
            bidirectional: shouldCreateBidirectional(fromNode, toNode),
            created: new Date(),
            author: 'Canvas Integration System'
        }
    };
}

// Generate edge ID
export function generateEdgeId(
    fromNodeId: string,
    toNodeId: string,
    relationshipType: string
): string {
    return `edge-${fromNodeId}-${toNodeId}-${relationshipType}`;
}

// Get edge color for relationship type
export function getEdgeColorForRelationship(
    relationshipType: CanvasEdgeWithMetadata['metadata']['relationshipType']
): string {
    const colorMap = {
        dependency: '5',      // Red
        reference: '2',       // Green
        hierarchy: '6',       // Purple
        association: '3'      // Yellow
    };
    return colorMap[relationshipType] || '1';
}
```

### **Health Score Functions**

```typescript
// Calculate node health score
export function calculateNodeHealthScore(vaultFile: VaultFile): number {
    let score = 0;
    
    // Metadata completeness (40 points)
    if (vaultFile.frontmatter.type) score += 10;
    if (vaultFile.frontmatter.title) score += 10;
    if (vaultFile.frontmatter.description) score += 10;
    if (vaultFile.frontmatter.author) score += 10;
    
    // Tag coverage (20 points)
    if (vaultFile.tags.length > 0) {
        score += Math.min(20, vaultFile.tags.length * 5);
    }
    
    // Content quality (25 points)
    if (vaultFile.content.length > 100) score += 10;
    if (vaultFile.content.includes('#')) score += 10;
    if (vaultFile.content.length > 500) score += 5;
    
    // Link structure (15 points)
    if (vaultFile.links.length > 0) score += 10;
    if (vaultFile.backlinks.length > 0) score += 5;
    
    return Math.min(100, score);
}

// Calculate canvas health score
export function calculateCanvasHealthScore(canvas: CanvasWithMetadata): number {
    if (canvas.nodes.length === 0) return 0;
    
    const nodeScores = canvas.nodes.map(node => node.metadata.healthScore);
    const averageNodeScore = nodeScores.reduce((a, b) => a + b, 0) / nodeScores.length;
    
    // Factor in edge connectivity
    const connectivityRatio = canvas.edges.length / Math.max(1, canvas.nodes.length);
    const connectivityBonus = Math.min(10, connectivityRatio * 20);
    
    return Math.min(100, averageNodeScore + connectivityBonus);
}
```

---

## **🎯 Usage Examples**

### **Creating a Complete Canvas**

```typescript
// Create nodes from vault files
const nodes = vaultFiles.map((file, index) => 
    createNodeFromVaultFile(file, {
        x: (index % 3) * 400 - 400,
        y: Math.floor(index / 3) * 250 - 200
    })
);

// Create edges based on file relationships
const edges: CanvasEdgeWithMetadata[] = [];
for (const node of nodes) {
    const relatedNodes = nodes.filter(n => 
        n.metadata.relatedFile !== node.metadata.relatedFile &&
        (node.metadata.tags.some(tag => n.metadata.tags.includes(tag)) ||
         node.metadata.relatedFile.includes(n.metadata.tags[0]))
    );
    
    for (const relatedNode of relatedNodes) {
        edges.push(createEdgeFromNodes(
            node,
            relatedNode,
            'association',
            'Related by tags'
        ));
    }
}

// Create complete canvas
const canvas: CanvasWithMetadata = {
    nodes,
    edges,
    metadata: {
        name: 'Auto-Generated Canvas',
        description: 'Canvas created from vault files',
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        author: 'Canvas Integration System',
        teamMember: 'Auto-Generator',
        category: 'auto-generated',
        healthScore: 0, // Will be calculated
        totalNodes: nodes.length,
        totalEdges: edges.length,
        complexity: calculateCanvasComplexity(nodes, edges),
        tags: ['auto-generated', 'vault-integration']
    },
    layout: {
        type: 'manual',
        spacing: 50,
        alignment: 'center',
        direction: 'horizontal',
        autoOrganize: false,
        snapToGrid: true,
        gridSize: 25
    },
    theme: {
        name: 'Default',
        backgroundColor: '#f8f9fa',
        gridColor: '#e9ecef',
        nodeColors: documentTypeColorMap,
        edgeColors: {
            dependency: '#dc3545',
            reference: '#28a745',
            hierarchy: '#6f42c1',
            association: '#ffc107'
        },
        fontColor: '#212529',
        fontSize: 14,
        fontFamily: 'system-ui'
    }
};

// Calculate and set health score
canvas.metadata.healthScore = calculateCanvasHealthScore(canvas);
```

### **Validating Canvas Structure**

```typescript
// Validate canvas node
export function validateCanvasNode(node: CanvasNodeWithMetadata): ValidationResult {
    const violations: ValidationViolation[] = [];
    
    // Check required properties
    if (!node.id) {
        violations.push({
            ruleId: 'node-id-required',
            severity: 'error',
            message: 'Node ID is required'
        });
    }
    
    if (!node.metadata) {
        violations.push({
            ruleId: 'node-metadata-required',
            severity: 'error',
            message: 'Node metadata is required'
        });
    }
    
    // Check document type
    if (!isValidDocumentType(node.metadata.documentType)) {
        violations.push({
            ruleId: 'invalid-document-type',
            severity: 'error',
            message: `Invalid document type: ${node.metadata.documentType}`
        });
    }
    
    // Check related file
    if (!node.metadata.relatedFile) {
        violations.push({
            ruleId: 'related-file-required',
            severity: 'warning',
            message: 'Related file path is recommended'
        });
    }
    
    return {
        valid: violations.length === 0,
        score: Math.max(0, 100 - violations.length * 10),
        violations,
        suggestions: generateSuggestions(violations),
        timestamp: new Date()
    };
}
```

---

## **🎨 Advanced Features**

### **Dynamic Styling**

```typescript
// Apply dynamic styling based on metadata
export function applyDynamicStyling(node: CanvasNodeWithMetadata): CanvasNodeWithMetadata {
    const style: CanvasNodeStyle = {};
    
    // Style based on priority
    if (node.metadata.priority === Priority.URGENT) {
        style.borderWidth = 3;
        style.borderColor = '#dc3545';
        style.animated = true;
    }
    
    // Style based on status
    if (node.metadata.status === DocumentStatus.DEPRECATED) {
        style.opacity = 0.6;
        style.fontStyle = 'italic';
    }
    
    // Style based on health score
    if (node.metadata.healthScore < 50) {
        style.backgroundColor = '#fff3cd';
        style.borderColor = '#856404';
    }
    
    return { ...node, style };
}
```

### **Auto-Layout Generation**

```typescript
// Generate hierarchical layout
export function generateHierarchicalLayout(
    nodes: CanvasNodeWithMetadata[],
    edges: CanvasEdgeWithMetadata[]
): CanvasNodeWithMetadata[] {
    // Build hierarchy tree
    const hierarchy = buildHierarchyTree(nodes, edges);
    
    // Calculate positions
    const positionedNodes = calculateHierarchicalPositions(hierarchy);
    
    return positionedNodes;
}

// Build hierarchy tree from edges
function buildHierarchyTree(
    nodes: CanvasNodeWithMetadata[],
    edges: CanvasEdgeWithMetadata[]
): HierarchyNode[] {
    // Implementation details...
    return [];
}
```

---

## **📊 Performance Considerations**

### **Optimization Strategies**

1. **Lazy Loading**: Load canvas data on demand
2. **Virtual Rendering**: Render only visible nodes
3. **Caching**: Cache validation results
4. **Batch Operations**: Process multiple nodes together
5. **Memory Management**: Clean up unused references

### **Scalability Limits**

- **Nodes**: Recommended < 1000 per canvas
- **Edges**: Recommended < 2000 per canvas
- **File Size**: Recommended < 5MB per canvas
- **Memory**: Recommended < 100MB for large canvases

---

## **🎯 Best Practices**

### **1. Node Organization**
- Use consistent ID patterns (kebab-case)
- Group related nodes logically
- Maintain proper spacing
- Use appropriate colors for types

### **2. Edge Management**
- Create meaningful relationships
- Avoid crossing edges when possible
- Use clear, descriptive labels
- Limit edge count per node

### **3. Metadata Quality**
- Always include required metadata
- Use appropriate document types
- Maintain consistent tagging
- Keep health scores high

### **4. Performance**
- Validate before saving
- Use efficient algorithms
- Monitor memory usage
- Optimize for large canvases

---

## **📚 Related Documentation**

- **Type System Overview** - High-level architecture
- **Vault Types Reference** - Complete type API
- **Validation Patterns** - Validation framework guide
- **Workshop Examples** - Practical implementation

---

**🏆 This guide provides everything needed to create powerful, type-safe canvas-vault integrations.**
