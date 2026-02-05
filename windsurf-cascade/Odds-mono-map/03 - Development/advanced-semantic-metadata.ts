#!/usr/bin/env bun

/**
 * Advanced Semantic Metadata Analysis System
 * 
 * Deep dive into the semantic metadata structure and enhancement
 * capabilities for the Odds-mono-map vault integration.
 * 
 * @author Odds Protocol Development Team
 * @version 2.1.0
 * @since 2025-11-18
 */

console.log('🧠 Advanced Semantic Metadata Analysis System');
console.log('='.repeat(55));

// =============================================================================
// ENHANCED METADATA INTERFACE SYSTEM
// =============================================================================

interface EnhancedCanvasMetadata {
    // Core semantic information
    domain: string;           // System domain (integration, service, core, ui, etc.)
    documentType: string;     // Document classification (api, documentation, project, etc.)
    complexity: string;       // Content complexity (low, medium, high)
    section: string;          // Content section (implementation, analytics, quality, etc.)

    // Quality metrics
    healthScore: number;      // 0-100 quality assessment

    // Color information
    colorType: string;        // 'hex' or 'legacy'
    colorCategory: string;    // 'domain.integration', 'status.active', etc.

    // Enhanced semantic fields
    priority?: string;        // low, medium, high, critical
    status?: string;          // active, beta, deprecated, experimental, etc.
    environment?: string;     // development, staging, production
    team?: string;           // backend, frontend, devops, etc.
    version?: string;        // Version information

    // Analytics fields
    lastAnalyzed?: string;    // ISO timestamp of last analysis
    analysisVersion?: string; // Version of analysis algorithm
    confidence?: number;      // 0-100 confidence in semantic assignments

    // Relationship fields
    relatedNodes?: string[];  // IDs of related nodes
    dependencies?: string[];  // IDs of dependent nodes
    upstream?: string[];      // IDs of upstream dependencies
    downstream?: string[];    // IDs of downstream dependencies

    // Content analysis
    wordCount?: number;       // Total word count
    headingCount?: number;    // Number of headings
    linkCount?: number;       // Number of internal/external links
    tagCount?: number;        // Number of tags

    // Performance metrics
    viewCount?: number;       // How many times viewed
    editCount?: number;       // How many times edited
    lastModified?: string;    // ISO timestamp
    createdDate?: string;     // ISO timestamp
}

interface CanvasNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    text: string;
    color?: string;
    metadata?: EnhancedCanvasMetadata;
}

// =============================================================================
// SEMANTIC ANALYSIS ENGINE
// =============================================================================

class SemanticAnalysisEngine {

    /**
     * Performs comprehensive semantic analysis on a canvas node
     */
    analyzeNode(node: CanvasNode): EnhancedCanvasMetadata {
        console.log(`🔍 Analyzing node: ${node.id}`);

        const analysis: Partial<EnhancedCanvasMetadata> = {};

        // Domain analysis
        analysis.domain = this.extractDomain(node);
        console.log(`  📂 Domain: ${analysis.domain}`);

        // Document type analysis
        analysis.documentType = this.extractDocumentType(node);
        console.log(`  📄 Document Type: ${analysis.documentType}`);

        // Complexity assessment
        analysis.complexity = this.assessComplexity(node);
        console.log(`  📊 Complexity: ${analysis.complexity}`);

        // Section identification
        analysis.section = this.identifySection(node);
        console.log(`  🏷️ Section: ${analysis.section}`);

        // Priority and status detection
        analysis.priority = this.extractPriority(node);
        analysis.status = this.extractStatus(node);
        console.log(`  🎯 Priority: ${analysis.priority || 'none'}`);
        console.log(`  ✅ Status: ${analysis.status || 'none'}`);

        // Environment detection
        analysis.environment = this.extractEnvironment(node);
        console.log(`  🌍 Environment: ${analysis.environment || 'none'}`);

        // Team identification
        analysis.team = this.extractTeam(node);
        console.log(`  👥 Team: ${analysis.team || 'none'}`);

        // Content metrics
        analysis.wordCount = this.countWords(node.text);
        analysis.headingCount = this.countHeadings(node.text);
        analysis.linkCount = this.countLinks(node.text);
        console.log(`  📝 Content: ${analysis.wordCount} words, ${analysis.headingCount} headings, ${analysis.linkCount} links`);

        // Health score calculation
        analysis.healthScore = this.calculateHealthScore(node, analysis as EnhancedCanvasMetadata);
        console.log(`  🏥 Health Score: ${analysis.healthScore}/100`);

        // Color information
        analysis.colorType = node.color && this.isHexColor(node.color) ? 'hex' : 'none';
        analysis.colorCategory = this.getColorCategory(node.color || '');
        console.log(`  🎨 Color: ${analysis.colorType} (${analysis.colorCategory})`);

        // Analysis metadata
        analysis.lastAnalyzed = new Date().toISOString();
        analysis.analysisVersion = '2.1.0';
        analysis.confidence = this.calculateConfidence(analysis as EnhancedCanvasMetadata);
        console.log(`  🔬 Confidence: ${analysis.confidence}%`);

        return analysis as EnhancedCanvasMetadata;
    }

    /**
     * Extracts domain from node ID and content
     */
    private extractDomain(node: CanvasNode): string {
        const nodeId = node.id.toLowerCase();
        const text = node.text.toLowerCase();

        // Domain keywords mapping
        const domainKeywords = {
            integration: ['integration', 'ecosystem', 'connect', 'bridge', 'sync'],
            service: ['service', 'api', 'endpoint', 'microservice'],
            core: ['core', 'database', 'storage', 'foundation'],
            ui: ['ui', 'interface', 'dashboard', 'frontend', 'user'],
            validation: ['validation', 'quality', 'testing', 'lint'],
            monitor: ['monitor', 'analytics', 'metrics', 'observability'],
            typescript: ['typescript', 'types', 'ts', 'typing'],
            canvas: ['canvas', 'visual', 'diagram', 'graph'],
            workshop: ['workshop', 'demo', 'tutorial', 'example'],
            archive: ['archive', 'old', 'legacy', 'deprecated']
        };

        // Check node ID first (higher priority)
        for (const [domain, keywords] of Object.entries(domainKeywords)) {
            if (keywords.some(keyword => nodeId.includes(keyword))) {
                return domain;
            }
        }

        // Check content
        for (const [domain, keywords] of Object.entries(domainKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return domain;
            }
        }

        return 'unknown';
    }

    /**
     * Extracts document type from content
     */
    private extractDocumentType(node: CanvasNode): string {
        const text = node.text.toLowerCase();

        const documentTypes = {
            documentation: ['documentation', 'guide', 'readme', 'docs'],
            api: ['api', 'endpoint', 'service', 'interface'],
            project: ['project', 'plan', 'roadmap', 'initiative'],
            tutorial: ['tutorial', 'how-to', 'step-by-step', 'learning'],
            template: ['template', 'pattern', 'boilerplate', 'scaffold'],
            specification: ['specification', 'spec', 'requirements', 'technical'],
            demo: ['demo', 'example', 'sample', 'illustration'],
            overview: ['overview', 'summary', 'introduction', 'architecture']
        };

        for (const [docType, keywords] of Object.entries(documentTypes)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return docType;
            }
        }

        return 'general';
    }

    /**
     * Assesses content complexity
     */
    private assessComplexity(node: CanvasNode): string {
        const text = node.text;
        const wordCount = this.countWords(text);
        const headingCount = this.countHeadings(text);
        const hasCodeBlocks = text.includes('```');
        const hasTables = text.includes('|');
        const hasLists = text.includes('- ') || text.includes('* ');

        let complexityScore = 0;

        // Word count scoring
        if (wordCount > 500) complexityScore += 3;
        else if (wordCount > 200) complexityScore += 2;
        else if (wordCount > 50) complexityScore += 1;

        // Structure scoring
        if (headingCount > 5) complexityScore += 2;
        else if (headingCount > 2) complexityScore += 1;

        if (hasCodeBlocks) complexityScore += 2;
        if (hasTables) complexityScore += 1;
        if (hasLists) complexityScore += 1;

        if (complexityScore >= 6) return 'high';
        if (complexityScore >= 3) return 'medium';
        return 'low';
    }

    /**
     * Identifies content section
     */
    private identifySection(node: CanvasNode): string {
        const text = node.text.toLowerCase();

        const sectionKeywords = {
            implementation: ['implementation', 'code', 'development', 'technical'],
            analytics: ['analytics', 'metrics', 'data', 'measurement'],
            quality: ['quality', 'validation', 'testing', 'standards'],
            visualization: ['visualization', 'canvas', 'diagram', 'visual'],
            architecture: ['architecture', 'design', 'structure', 'overview'],
            operations: ['operations', 'deployment', 'monitoring', 'maintenance']
        };

        for (const [section, keywords] of Object.entries(sectionKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return section;
            }
        }

        return 'general';
    }

    /**
     * Extracts priority from metadata and content
     */
    private extractPriority(node: CanvasNode): string | undefined {
        // Check metadata first
        if (node.metadata?.priority) {
            return node.metadata.priority;
        }

        // Extract from content
        const text = node.text.toLowerCase();
        const priorityKeywords = {
            critical: ['critical', 'urgent', 'blocking', 'p0'],
            high: ['high', 'important', 'priority', 'p1'],
            medium: ['medium', 'normal', 'standard', 'p2'],
            low: ['low', 'minor', 'nice-to-have', 'p3']
        };

        for (const [priority, keywords] of Object.entries(priorityKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return priority;
            }
        }

        return undefined;
    }

    /**
     * Extracts status from metadata and content
     */
    private extractStatus(node: CanvasNode): string | undefined {
        // Check metadata first
        if (node.metadata?.status) {
            return node.metadata.status;
        }

        // Extract from content
        const text = node.text.toLowerCase();
        const statusKeywords = {
            active: ['active', 'production', 'live', 'operational'],
            beta: ['beta', 'testing', 'staging', 'preview'],
            deprecated: ['deprecated', 'legacy', 'obsolete', 'phased-out'],
            experimental: ['experimental', 'prototype', 'research', 'alpha'],
            maintenance: ['maintenance', 'downtime', 'under-repair', 'service']
        };

        for (const [status, keywords] of Object.entries(statusKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return status;
            }
        }

        return undefined;
    }

    /**
     * Extracts environment from content
     */
    private extractEnvironment(node: CanvasNode): string | undefined {
        const text = node.text.toLowerCase();
        const envKeywords = {
            production: ['production', 'prod', 'live'],
            staging: ['staging', 'stage', 'pre-production'],
            development: ['development', 'dev', 'local', 'testing']
        };

        for (const [env, keywords] of Object.entries(envKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return env;
            }
        }

        return undefined;
    }

    /**
     * Extracts team from content
     */
    private extractTeam(node: CanvasNode): string | undefined {
        const text = node.text.toLowerCase();
        const teamKeywords = {
            backend: ['backend', 'server', 'api', 'database'],
            frontend: ['frontend', 'ui', 'client', 'interface'],
            devops: ['devops', 'infrastructure', 'deployment', 'monitoring'],
            security: ['security', 'auth', 'authentication', 'authorization'],
            data: ['data', 'analytics', 'science', 'engineering']
        };

        for (const [team, keywords] of Object.entries(teamKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return team;
            }
        }

        return undefined;
    }

    /**
     * Counts words in text
     */
    private countWords(text: string): number {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Counts headings in text
     */
    private countHeadings(text: string): number {
        const headingRegex = /^#{1,6}\s/gm;
        const matches = text.match(headingRegex);
        return matches ? matches.length : 0;
    }

    /**
     * Counts links in text
     */
    private countLinks(text: string): number {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const matches = text.match(linkRegex);
        return matches ? matches.length : 0;
    }

    /**
     * Calculates enhanced health score
     */
    private calculateHealthScore(node: CanvasNode, analysis: EnhancedCanvasMetadata): number {
        let score = 50; // Base score

        // Semantic completeness (30 points)
        if (analysis.domain && analysis.domain !== 'unknown') score += 10;
        if (analysis.documentType && analysis.documentType !== 'general') score += 10;
        if (analysis.section && analysis.section !== 'general') score += 10;

        // Content quality (25 points)
        if (analysis.wordCount && analysis.wordCount > 50) score += 10;
        if (analysis.headingCount && analysis.headingCount > 0) score += 8;
        if (analysis.linkCount && analysis.linkCount > 0) score += 7;

        // Metadata richness (20 points)
        if (analysis.priority) score += 5;
        if (analysis.status) score += 5;
        if (analysis.environment) score += 5;
        if (analysis.team) score += 5;

        // Structural elements (15 points)
        if (node.text.includes('**')) score += 5; // Bold text
        if (node.text.includes('- ') || node.text.includes('* ')) score += 5; // Lists
        if (node.text.includes('```')) score += 5; // Code blocks

        // Color assignment (10 points)
        if (node.color && this.isHexColor(node.color)) score += 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculates confidence in semantic assignments
     */
    private calculateConfidence(analysis: EnhancedCanvasMetadata): number {
        let confidence = 50; // Base confidence

        // High-confidence indicators
        if (analysis.domain && analysis.domain !== 'unknown') confidence += 15;
        if (analysis.documentType && analysis.documentType !== 'general') confidence += 15;
        if (analysis.complexity) confidence += 10;
        if (analysis.section && analysis.section !== 'general') confidence += 10;

        // Medium-confidence indicators
        if (analysis.priority) confidence += 5;
        if (analysis.status) confidence += 5;
        if (analysis.environment) confidence += 5;
        if (analysis.team) confidence += 5;

        return Math.min(100, confidence);
    }

    /**
     * Gets color category
     */
    private getColorCategory(color: string): string {
        if (!color) return 'none';

        const colorMap = {
            '#6366F1': 'domain.integration',
            '#14B8A6': 'domain.service',
            '#059669': 'domain.core',
            '#F97316': 'domain.ui',
            '#10B981': 'domain.validation',
            '#A855F7': 'domain.monitor',
            '#3B82F6': 'domain.typescript',
            '#8B5CF6': 'domain.canvas',
            '#F59E0B': 'domain.workshop',
            '#6B7280': 'domain.archive',
            '#EF4444': 'status.deprecated',
            '#EAB308': 'status.beta',
            '#0F172A': 'brand.primary'
        };

        return colorMap[color as keyof typeof colorMap] || 'custom';
    }

    /**
     * Checks if color is HEX format
     */
    private isHexColor(color: string): boolean {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }
}

// =============================================================================
// DEMO: ADVANCED SEMANTIC ANALYSIS
// =============================================================================

console.log('\n🎯 1. Advanced Semantic Analysis Demo');
console.log('─'.repeat(50));

const analysisEngine = new SemanticAnalysisEngine();

// Example node from the integration
const exampleNode: CanvasNode = {
    id: "integration-overview",
    x: -500,
    y: -400,
    width: 300,
    height: 200,
    type: "text",
    text: "# 🔄 Odds Protocol Integration\n\n## Complete Ecosystem View\n\n**Real-time Bridge System**\n- Obsidian ↔ Bun Services ↔ Web Dashboard\n- Validation Pipeline\n- Analytics Engine\n- Dashboard Synchronization\n\n---\n*Iteration 1: Overview*",
    color: "#6366F1",
    metadata: {
        domain: "integration",
        documentType: "api",
        complexity: "medium",
        section: "implementation",
        healthScore: 100,
        colorType: "hex",
        colorCategory: "domain.integration"
    }
};

console.log('\n📋 Analyzing Example Node:');
const enhancedAnalysis = analysisEngine.analyzeNode(exampleNode);

console.log('\n📊 Enhanced Analysis Results:');
Object.entries(enhancedAnalysis).forEach(([key, value]) => {
    if (value !== undefined) {
        console.log(`  ${key}: ${value}`);
    }
});

// =============================================================================
// DEMO: COMPARATIVE ANALYSIS
// =============================================================================

console.log('\n🔍 2. Comparative Analysis Demo');
console.log('─'.repeat(50));

const testNodes: CanvasNode[] = [
    {
        id: "service-api-production",
        x: 0, y: 0, width: 200, height: 150, type: "text",
        text: "# 🚀 Production API\n## High Priority Service\n**Status**: Active\n**Environment**: Production",
        color: "#10B981"
    },
    {
        id: "ui-dashboard-beta",
        x: 0, y: 0, width: 200, height: 150, type: "text",
        text: "# 📊 Dashboard UI\n## Beta Testing\n**Framework**: React\n**Team**: Frontend",
        color: "#EAB308"
    },
    {
        id: "core-database-deprecated",
        x: 0, y: 0, width: 200, height: 150, type: "text",
        text: "# 🗄️ Legacy Database\n## Deprecated System\n**Status**: Phase-out\n**Team**: Backend",
        color: "#EF4444"
    }
];

console.log('\n📈 Comparative Analysis Results:');
testNodes.forEach((node, index) => {
    console.log(`\n🔸 Node ${index + 1}: ${node.id}`);
    const analysis = analysisEngine.analyzeNode(node);

    // Key metrics comparison
    console.log(`  🎨 Color: ${node.color} (${analysis.colorCategory})`);
    console.log(`  🏥 Health: ${analysis.healthScore}/100`);
    console.log(`  🔬 Confidence: ${analysis.confidence}%`);
    console.log(`  📊 Complexity: ${analysis.complexity}`);
    console.log(`  📂 Domain: ${analysis.domain}`);
    console.log(`  📄 Type: ${analysis.documentType}`);
});

// =============================================================================
// DEMO: METADATA ENHANCEMENT RECOMMENDATIONS
// =============================================================================

console.log('\n💡 3. Metadata Enhancement Recommendations');
console.log('─'.repeat(50));

function generateEnhancementRecommendations(analysis: EnhancedCanvasMetadata): string[] {
    const recommendations: string[] = [];

    // Health score recommendations
    if (analysis.healthScore < 80) {
        recommendations.push('🔧 Improve health score by adding more metadata');
        if (analysis.wordCount && analysis.wordCount < 50) {
            recommendations.push('📝 Add more detailed content (current: ' + analysis.wordCount + ' words)');
        }
        if (!analysis.priority) recommendations.push('🎯 Specify priority level');
        if (!analysis.status) recommendations.push('✅ Specify status');
        if (!analysis.environment) recommendations.push('🌍 Specify environment');
    }

    // Confidence recommendations
    if (analysis.confidence < 80) {
        recommendations.push('🔍 Increase confidence by improving semantic clarity');
        if (analysis.domain === 'unknown') recommendations.push('📂 Use clearer domain-specific language');
        if (analysis.documentType === 'general') recommendations.push('📄 Specify document type in content');
    }

    // Color recommendations
    if (analysis.colorType !== 'hex') {
        recommendations.push('🎨 Upgrade to HEX color for better tooling support');
    }

    // Content recommendations
    if (analysis.headingCount === 0) {
        recommendations.push('📋 Add headings for better structure');
    }
    if (analysis.linkCount === 0) {
        recommendations.push('🔗 Add relevant links for connectivity');
    }

    return recommendations;
}

console.log('\n💡 Enhancement Recommendations:');
testNodes.forEach((node, index) => {
    const analysis = analysisEngine.analyzeNode(node);
    const recommendations = generateEnhancementRecommendations(analysis);

    console.log(`\n🔸 ${node.id}:`);
    if (recommendations.length === 0) {
        console.log('  ✅ No enhancements needed - excellent quality!');
    } else {
        recommendations.forEach(rec => {
            console.log(`  ${rec}`);
        });
    }
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n🎊 Advanced Semantic Metadata Analysis - Complete!');
console.log('='.repeat(60));

console.log('\n🏆 Advanced Features Achieved:');
console.log('  ✅ Comprehensive semantic analysis engine');
console.log('  ✅ Enhanced metadata interface with 20+ fields');
console.log('  ✅ Multi-dimensional confidence scoring');
console.log('  ✅ Intelligent content analysis and categorization');
console.log('  ✅ Health score calculation with detailed metrics');
console.log('  ✅ Enhancement recommendation system');
console.log('  ✅ Comparative analysis capabilities');
console.log('  ✅ Production-ready metadata enrichment');

console.log('\n🧠 Intelligence Features:');
console.log('  🎯 Domain detection with keyword mapping');
console.log('  📄 Document type classification');
console.log('  📊 Complexity assessment algorithms');
console.log('  🏷️ Section identification from content');
console.log('  👥 Team and environment extraction');
console.log('  📈 Content metrics (words, headings, links)');
console.log('  🔬 Confidence scoring for semantic assignments');
console.log('  💡 Intelligent enhancement recommendations');

console.log('\n🚀 Production Benefits:');
console.log('  📊 Rich metadata for advanced search and filtering');
console.log('  🎯 Better content organization and navigation');
console.log('  🏥 Continuous quality monitoring through health scores');
console.log('  🔍 Improved content discovery through semantic analysis');
console.log('  📈 Analytics capabilities for content optimization');
console.log('  🛡️ Quality assurance through automated recommendations');

console.log('\n💡 Next Enhancement Opportunities:');
console.log('  🤖 Machine learning for semantic classification');
console.log('  📊 Advanced analytics and trend analysis');
console.log('  🔄 Dynamic metadata updates based on usage patterns');
console.log('  🌐 Multi-language semantic analysis support');
console.log('  📱 User behavior analysis for personalization');

console.log('\n🎯 Your semantic metadata system now provides enterprise-grade');
console.log('   content analysis with intelligent enhancement capabilities! 🧠✨📊');
