#!/usr/bin/env bun

/**
 * Enhanced Semantic Color Assignment System
 * 
 * Advanced semantic color assignment with priority inheritance,
 * domain-based coloring, and custom color rules.
 * 
 * @author Odds Protocol Development Team
 * @version 2.1.0
 * @since 2025-11-18
 */

console.log('🎨 Enhanced Semantic Color Assignment System');
console.log('='.repeat(55));

// =============================================================================
// ENHANCED COLOR TYPE SYSTEM
// =============================================================================

type CanvasColor = `#${string}` | "0" | "1" | "2" | "3" | "4" | "5";

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function isHexColor(color: string): color is `#${string}` {
    return HEX_COLOR_REGEX.test(color);
}

function isLegacyColor(color: string): color is "0" | "1" | "2" | "3" | "4" | "5" {
    return /^[0-5]$/.test(color);
}

// Enhanced brand color palette
const ODDS_PROTOCOL_COLORS = {
    brand: {
        primary: "#0F172A",    // Deep blue
        secondary: "#1E40AF",  // Medium blue
        accent: "#F59E0B",     // Amber
        neutral: "#6B7280",    // Gray
    },
    status: {
        active: "#10B981",     // Green
        beta: "#EAB308",       // Yellow
        deprecated: "#EF4444", // Red
        experimental: "#8B5CF6", // Purple
        maintenance: "#F97316", // Orange
        archived: "#6B7280",   // Gray
    },
    domain: {
        integration: "#6366F1",  // Indigo
        service: "#14B8A6",      // Teal
        core: "#059669",         // Emerald
        ui: "#F97316",           // Orange
        pipeline: "#06B6D4",     // Cyan
        monitor: "#A855F7",       // Violet
        api: "#3B82F6",          // Blue
        database: "#10B981",     // Green
        auth: "#EF4444",         // Red
        cache: "#F59E0B",        // Amber
    },
    priority: {
        low: "#6B7280",      // Gray
        medium: "#F59E0B",   // Amber
        high: "#EF4444",     // Red
        critical: "#DC2626"  // Dark Red
    },
    health: {
        excellent: "#10B981",  // Green
        good: "#84CC16",      // Lime
        warning: "#F59E0B",   // Amber
        poor: "#F97316",      // Orange
        critical: "#EF4444"   // Red
    }
} as const;

// Enhanced node metadata interface
interface EnhancedNodeMetadata {
    status?: 'active' | 'beta' | 'deprecated' | 'experimental' | 'maintenance' | 'archived';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    domain?: string;
    healthScore?: number;
    version?: string;
    team?: string;
    environment?: 'development' | 'staging' | 'production';
    lastUpdated?: Date;
}

interface CanvasNode {
    id: string;
    metadata?: EnhancedNodeMetadata;
}

// =============================================================================
// ENHANCED SEMANTIC COLOR ASSIGNMENT
// =============================================================================

/**
 * Enhanced semantic color assignment with multiple priority layers
 */
function getEnhancedSemanticColor(node: CanvasNode): string {
    const metadata = node.metadata;

    // Priority 1: Critical status overrides everything
    if (metadata?.status === 'deprecated') return ODDS_PROTOCOL_COLORS.status.deprecated;
    if (metadata?.status === 'experimental') return ODDS_PROTOCOL_COLORS.status.experimental;
    if (metadata?.status === 'maintenance') return ODDS_PROTOCOL_COLORS.status.maintenance;
    if (metadata?.status === 'archived') return ODDS_PROTOCOL_COLORS.status.archived;

    // Priority 2: Critical priority for active services
    if (metadata?.priority === 'critical' && metadata?.status === 'active') {
        return ODDS_PROTOCOL_COLORS.priority.critical;
    }

    // Priority 3: Health-based coloring for active services
    if (metadata?.status === 'active' && metadata?.healthScore !== undefined) {
        return getHealthBasedColor(metadata.healthScore);
    }

    // Priority 4: Status-based coloring
    if (metadata?.status === 'beta') return ODDS_PROTOCOL_COLORS.status.beta;
    if (metadata?.status === 'active') return ODDS_PROTOCOL_COLORS.status.active;

    // Priority 5: Priority-based coloring
    if (metadata?.priority === 'high') return ODDS_PROTOCOL_COLORS.priority.high;
    if (metadata?.priority === 'medium') return ODDS_PROTOCOL_COLORS.priority.medium;
    if (metadata?.priority === 'low') return ODDS_PROTOCOL_COLORS.priority.low;

    // Priority 6: Domain-based coloring
    const domainColor = getDomainColor(node.id, metadata?.domain);
    if (domainColor) return domainColor;

    // Priority 7: Environment-based coloring
    if (metadata?.environment) {
        return getEnvironmentColor(metadata.environment);
    }

    // Default to brand primary
    return ODDS_PROTOCOL_COLORS.brand.primary;
}

/**
 * Health-based color assignment
 */
function getHealthBasedColor(healthScore: number): string {
    if (healthScore >= 95) return ODDS_PROTOCOL_COLORS.health.excellent;
    if (healthScore >= 85) return ODDS_PROTOCOL_COLORS.health.good;
    if (healthScore >= 70) return ODDS_PROTOCOL_COLORS.health.warning;
    if (healthScore >= 50) return ODDS_PROTOCOL_COLORS.health.poor;
    return ODDS_PROTOCOL_COLORS.health.critical;
}

/**
 * Domain-based color extraction
 */
function getDomainColor(nodeId: string, explicitDomain?: string): string | null {
    // Use explicit domain if provided
    if (explicitDomain) {
        const domainColor = ODDS_PROTOCOL_COLORS.domain[explicitDomain as keyof typeof ODDS_PROTOCOL_COLORS.domain];
        if (domainColor) return domainColor;
    }

    // Extract domain from node ID
    const parts = nodeId.split(':');
    if (parts.length >= 2) {
        const domain = parts[0];
        const domainColor = ODDS_PROTOCOL_COLORS.domain[domain as keyof typeof ODDS_PROTOCOL_COLORS.domain];
        if (domainColor) return domainColor;

        // Try subdomain
        if (parts.length >= 3) {
            const subdomain = parts[1];
            const subdomainColor = ODDS_PROTOCOL_COLORS.domain[subdomain as keyof typeof ODDS_PROTOCOL_COLORS.domain];
            if (subdomainColor) return subdomainColor;
        }
    }

    return null;
}

/**
 * Environment-based coloring
 */
function getEnvironmentColor(environment: 'development' | 'staging' | 'production'): string {
    switch (environment) {
        case 'production': return ODDS_PROTOCOL_COLORS.status.active;
        case 'staging': return ODDS_PROTOCOL_COLORS.status.beta;
        case 'development': return ODDS_PROTOCOL_COLORS.brand.secondary;
        default: return ODDS_PROTOCOL_COLORS.brand.neutral;
    }
}

// =============================================================================
// ADVANCED COLOR ANALYSIS
// =============================================================================

interface ColorAssignment {
    nodeId: string;
    color: string;
    reasoning: string[];
    priority: number;
    factors: {
        status?: string;
        priority?: string;
        domain?: string;
        health?: number;
        environment?: string;
    };
}

/**
 * Analyzes color assignment with detailed reasoning
 */
function analyzeColorAssignment(node: CanvasNode): ColorAssignment {
    const metadata = node.metadata;
    const reasoning: string[] = [];
    const factors: any = {};
    let priority = 0;

    // Check critical status
    if (metadata?.status === 'deprecated') {
        reasoning.push('Critical: Deprecated status overrides all other factors');
        priority = 1;
        factors.status = 'deprecated';
        return {
            nodeId: node.id,
            color: ODDS_PROTOCOL_COLORS.status.deprecated,
            reasoning,
            priority,
            factors
        };
    }

    if (metadata?.status === 'experimental') {
        reasoning.push('Critical: Experimental status indicates research/prototype');
        priority = 1;
        factors.status = 'experimental';
        return {
            nodeId: node.id,
            color: ODDS_PROTOCOL_COLORS.status.experimental,
            reasoning,
            priority,
            factors
        };
    }

    // Check critical priority for active services
    if (metadata?.priority === 'critical' && metadata?.status === 'active') {
        reasoning.push('High: Critical priority on active service');
        priority = 2;
        factors.priority = 'critical';
        factors.status = 'active';
        return {
            nodeId: node.id,
            color: ODDS_PROTOCOL_COLORS.priority.critical,
            reasoning,
            priority,
            factors
        };
    }

    // Check health-based coloring
    if (metadata?.status === 'active' && metadata?.healthScore !== undefined) {
        const healthColor = getHealthBasedColor(metadata.healthScore);
        reasoning.push(`Medium: Health-based coloring (${metadata.healthScore}% health)`);
        priority = 3;
        factors.status = 'active';
        factors.health = metadata.healthScore;
        return {
            nodeId: node.id,
            color: healthColor,
            reasoning,
            priority,
            factors
        };
    }

    // Check status
    if (metadata?.status === 'beta') {
        reasoning.push('Medium: Beta status indicates testing phase');
        priority = 4;
        factors.status = 'beta';
        return {
            nodeId: node.id,
            color: ODDS_PROTOCOL_COLORS.status.beta,
            reasoning,
            priority,
            factors
        };
    }

    if (metadata?.status === 'active') {
        reasoning.push('Medium: Active status indicates production readiness');
        priority = 4;
        factors.status = 'active';
        return {
            nodeId: node.id,
            color: ODDS_PROTOCOL_COLORS.status.active,
            reasoning,
            priority,
            factors
        };
    }

    // Check priority
    if (metadata?.priority) {
        const priorityColor = ODDS_PROTOCOL_COLORS.priority[metadata.priority];
        reasoning.push(`Low: Priority-based coloring (${metadata.priority})`);
        priority = 5;
        factors.priority = metadata.priority;
        return {
            nodeId: node.id,
            color: priorityColor,
            reasoning,
            priority,
            factors
        };
    }

    // Check domain
    const domainColor = getDomainColor(node.id, metadata?.domain);
    if (domainColor) {
        const domain = metadata?.domain || node.id.split(':')[0];
        reasoning.push(`Low: Domain-based coloring (${domain})`);
        priority = 6;
        factors.domain = domain;
        return {
            nodeId: node.id,
            color: domainColor,
            reasoning,
            priority,
            factors
        };
    }

    // Check environment
    if (metadata?.environment) {
        reasoning.push(`Low: Environment-based coloring (${metadata.environment})`);
        priority = 7;
        factors.environment = metadata.environment;
        return {
            nodeId: node.id,
            color: getEnvironmentColor(metadata.environment),
            reasoning,
            priority,
            factors
        };
    }

    // Default
    reasoning.push('Default: No specific metadata, using brand primary');
    priority = 8;
    return {
        nodeId: node.id,
        color: ODDS_PROTOCOL_COLORS.brand.primary,
        reasoning,
        priority,
        factors
    };
}

// =============================================================================
// DEMO: ENHANCED SEMANTIC COLOR ASSIGNMENT
// =============================================================================

console.log('\n🎯 1. Enhanced Semantic Color Assignment');
console.log('─'.repeat(50));

const enhancedDemoNodes: CanvasNode[] = [
    {
        id: "service:api:production",
        metadata: {
            status: "active",
            priority: "high",
            domain: "api",
            healthScore: 98,
            environment: "production",
            team: "backend"
        }
    },
    {
        id: "integration:bridge:beta",
        metadata: {
            status: "beta",
            priority: "medium",
            domain: "integration",
            healthScore: 85,
            environment: "staging",
            team: "integration"
        }
    },
    {
        id: "core:database:deprecated",
        metadata: {
            status: "deprecated",
            priority: "low",
            domain: "database",
            healthScore: 45,
            environment: "production",
            team: "backend"
        }
    },
    {
        id: "experimental:ai:research",
        metadata: {
            status: "experimental",
            priority: "critical",
            domain: "service",
            healthScore: 72,
            environment: "development",
            team: "research"
        }
    },
    {
        id: "ui:dashboard:component",
        metadata: {
            status: "active",
            domain: "ui",
            healthScore: 92,
            environment: "production",
            team: "frontend"
        }
    },
    {
        id: "monitor:analytics:service",
        metadata: {
            status: "active",
            priority: "medium",
            domain: "monitor",
            healthScore: 88,
            environment: "production",
            team: "devops"
        }
    },
    {
        id: "auth:oauth:gateway",
        metadata: {
            status: "maintenance",
            priority: "high",
            domain: "auth",
            healthScore: 65,
            environment: "production",
            team: "security"
        }
    },
    {
        id: "cache:redis:cluster",
        metadata: {
            status: "active",
            priority: "low",
            domain: "cache",
            healthScore: 96,
            environment: "production",
            team: "backend"
        }
    }
];

console.log('\n🎨 Enhanced Semantic Color Assignment Results:');
enhancedDemoNodes.forEach(node => {
    const assignment = analyzeColorAssignment(node);

    console.log(`\n📋 ${node.id}`);
    console.log(`   Color: ${assignment.color}`);
    console.log(`   Priority: ${assignment.priority}`);
    console.log(`   Reasoning:`);
    assignment.reasoning.forEach(reason => {
        console.log(`     • ${reason}`);
    });
    console.log(`   Factors:`);
    Object.entries(assignment.factors).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
    });
});

// =============================================================================
// DEMO: COLOR DISTRIBUTION ANALYSIS
// =============================================================================

console.log('\n📊 2. Color Distribution Analysis');
console.log('─'.repeat(50));

const colorDistribution: Record<string, string[]> = {};
const priorityDistribution: Record<number, number> = {};

enhancedDemoNodes.forEach(node => {
    const assignment = analyzeColorAssignment(node);

    if (!colorDistribution[assignment.color]) {
        colorDistribution[assignment.color] = [];
    }
    colorDistribution[assignment.color].push(node.id);

    priorityDistribution[assignment.priority] = (priorityDistribution[assignment.priority] || 0) + 1;
});

console.log('\n🎨 Color Distribution:');
Object.entries(colorDistribution).forEach(([color, nodes]) => {
    console.log(`  ${color}:`);
    nodes.forEach(nodeId => {
        console.log(`    • ${nodeId}`);
    });
});

console.log('\n📈 Priority Distribution:');
Object.entries(priorityDistribution)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([priority, count]) => {
        const priorityName = {
            1: 'Critical Status',
            2: 'Critical Priority',
            3: 'Health-Based',
            4: 'Status-Based',
            5: 'Priority-Based',
            6: 'Domain-Based',
            7: 'Environment-Based',
            8: 'Default'
        }[priority] || `Priority ${priority}`;

        console.log(`  ${priorityName}: ${count} nodes`);
    });

// =============================================================================
// DEMO: COLOR CONSISTENCY VALIDATION
// =============================================================================

console.log('\n🔍 3. Color Consistency Validation');
console.log('─'.repeat(50));

interface ConsistencyIssue {
    type: 'inconsistent_status' | 'inconsistent_priority' | 'unexpected_color';
    description: string;
    affectedNodes: string[];
}

function validateColorConsistency(nodes: CanvasNode[]): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Group nodes by status
    const statusGroups: Record<string, CanvasNode[]> = {};
    nodes.forEach(node => {
        const status = node.metadata?.status;
        if (status) {
            if (!statusGroups[status]) statusGroups[status] = [];
            statusGroups[status].push(node);
        }
    });

    // Check status consistency
    Object.entries(statusGroups).forEach(([status, groupNodes]) => {
        const colors = new Set(groupNodes.map(node => getEnhancedSemanticColor(node)));
        if (colors.size > 1) {
            issues.push({
                type: 'inconsistent_status',
                description: `Nodes with status "${status}" have different colors`,
                affectedNodes: groupNodes.map(node => node.id)
            });
        }
    });

    // Group nodes by priority
    const priorityGroups: Record<string, CanvasNode[]> = {};
    nodes.forEach(node => {
        const priority = node.metadata?.priority;
        if (priority) {
            if (!priorityGroups[priority]) priorityGroups[priority] = [];
            priorityGroups[priority].push(node);
        }
    });

    // Check priority consistency (for same status)
    Object.entries(priorityGroups).forEach(([priority, groupNodes]) => {
        const activeNodes = groupNodes.filter(node => node.metadata?.status === 'active');
        if (activeNodes.length > 1) {
            const colors = new Set(activeNodes.map(node => getEnhancedSemanticColor(node)));
            if (colors.size > 1) {
                issues.push({
                    type: 'inconsistent_priority',
                    description: `Active nodes with priority "${priority}" have different colors`,
                    affectedNodes: activeNodes.map(node => node.id)
                });
            }
        }
    });

    return issues;
}

const consistencyIssues = validateColorConsistency(enhancedDemoNodes);

if (consistencyIssues.length === 0) {
    console.log('✅ No consistency issues found - color assignment is consistent!');
} else {
    console.log('⚠️ Consistency Issues Found:');
    consistencyIssues.forEach(issue => {
        console.log(`  ${issue.type}: ${issue.description}`);
        console.log(`    Affected nodes: ${issue.affectedNodes.join(', ')}`);
    });
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n🎊 Enhanced Semantic Color Assignment - Complete!');
console.log('='.repeat(55));

console.log('\n🏆 Enhanced Features Summary:');
console.log('  ✅ Multi-priority color assignment (8 levels)');
console.log('  ✅ Health-based coloring for active services');
console.log('  ✅ Environment-aware color selection');
console.log('  ✅ Domain-based color extraction');
console.log('  ✅ Detailed reasoning and analysis');
console.log('  ✅ Consistency validation system');
console.log('  ✅ Comprehensive color distribution analysis');

console.log('\n📊 Advanced Color Intelligence:');
console.log('  🎯 Critical status overrides all other factors');
console.log('  💚 Health-based coloring for service monitoring');
console.log('  🌍 Environment-specific color schemes');
console.log('  🔧 Domain-specific color organization');
console.log('  📈 Priority-based visual hierarchy');
console.log('  🔍 Consistency validation and reporting');

console.log('\n🚀 Production Benefits:');
console.log('  📊 Better information architecture through color semantics');
console.log('  🎯 Instant visual understanding of system state');
console.log('  🔍 Consistent color usage across large canvases');
console.log('  📈 Health monitoring through color indicators');
console.log('  🛡️ Reduced cognitive load for system operators');
console.log('  ⚡ Faster decision making through visual cues');

console.log('\n💡 Next Enhancement Opportunities:');
console.log('  🎨 Custom color rule engines');
console.log('  📊 Color analytics and optimization');
console.log('  🔄 Dynamic color theming');
console.log('  📱 User preference integration');
console.log('  🌈 Gradient and animation support');

console.log('\n🎯 Your semantic color system now provides intelligent,');
console.log('   context-aware color assignment with detailed analysis! 🎨🧠✨');
