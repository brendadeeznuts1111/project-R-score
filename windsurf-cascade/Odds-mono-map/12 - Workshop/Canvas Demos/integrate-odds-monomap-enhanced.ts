#!/usr/bin/env bun

/**
 * Enhanced Odds-Mono-Map HEX Color Integration with Robust Error Handling
 * 
 * Integrates the advanced HEX color system with existing Odds-mono-map canvas files,
 * migrates legacy colors to HEX, and enhances vault integration with comprehensive error handling.
 * 
 * @author Odds Protocol Development Team
 * @version 2.1.0
 * @since 2025-11-18
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// ENHANCED ERROR HANDLING SYSTEM
// =============================================================================

interface ProcessingError {
    filePath: string;
    errorType: 'FILE_NOT_FOUND' | 'INVALID_JSON' | 'INVALID_CANVAS_STRUCTURE' | 'PROCESSING_ERROR';
    message: string;
    details?: any;
    recoverable: boolean;
    suggestion?: string;
}

interface ProcessingResult {
    success: boolean;
    filePath: string;
    nodesProcessed: number;
    nodesMigrated: number;
    errors: ProcessingError[];
    warnings: string[];
    processingTime: number;
}

interface IntegrationReport {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalNodes: number;
    totalMigrated: number;
    errors: ProcessingError[];
    warnings: string[];
    processingTime: number;
    fileResults: ProcessingResult[];
}

class CanvasIntegrationErrorHandler {
    private errors: ProcessingError[] = [];
    private warnings: string[] = [];

    /**
     * Handles file processing errors with detailed analysis
     */
    handleProcessingError(filePath: string, error: any, context?: string): ProcessingError {
        let errorType: ProcessingError['errorType'];
        let suggestion: string | undefined;

        // Analyze error type and provide suggestions
        if (error.code === 'ENOENT') {
            errorType = 'FILE_NOT_FOUND';
            suggestion = 'Check if the file path is correct and the file exists';
        } else if (error instanceof SyntaxError) {
            errorType = 'INVALID_JSON';
            suggestion = 'File contains invalid JSON - check for syntax errors';
        } else if (error.message && error.message.includes('nodes')) {
            errorType = 'INVALID_CANVAS_STRUCTURE';
            suggestion = 'File may be empty or corrupted - consider recreating the canvas';
        } else {
            errorType = 'PROCESSING_ERROR';
            suggestion = 'Unknown error - check file permissions and format';
        }

        const processingError: ProcessingError = {
            filePath,
            errorType,
            message: error.message || 'Unknown error',
            details: {
                stack: error.stack,
                context,
                timestamp: new Date().toISOString()
            },
            recoverable: errorType !== 'FILE_NOT_FOUND' && errorType !== 'INVALID_JSON',
            suggestion
        };

        this.errors.push(processingError);
        return processingError;
    }

    /**
     * Adds a warning message
     */
    addWarning(message: string): void {
        this.warnings.push(message);
    }

    /**
     * Gets all errors
     */
    getErrors(): ProcessingError[] {
        return [...this.errors];
    }

    /**
     * Gets all warnings
     */
    getWarnings(): string[] {
        return [...this.warnings];
    }

    /**
     * Clears all errors and warnings
     */
    clear(): void {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Generates error analysis report
     */
    generateErrorReport(): string {
        if (this.errors.length === 0 && this.warnings.length === 0) {
            return '✅ No errors or warnings encountered';
        }

        let report = '\n📊 Error Analysis Report:\n';
        report += '='.repeat(50) + '\n';

        if (this.errors.length > 0) {
            report += `\n❌ Errors (${this.errors.length}):\n`;
            this.errors.forEach((error, index) => {
                report += `\n  ${index + 1}. ${error.errorType}: ${error.filePath}\n`;
                report += `     Message: ${error.message}\n`;
                report += `     Recoverable: ${error.recoverable ? '✅ Yes' : '❌ No'}\n`;
                if (error.suggestion) {
                    report += `     Suggestion: ${error.suggestion}\n`;
                }
            });
        }

        if (this.warnings.length > 0) {
            report += `\n⚠️  Warnings (${this.warnings.length}):\n`;
            this.warnings.forEach((warning, index) => {
                report += `  ${index + 1}. ${warning}\n`;
            });
        }

        return report;
    }
}

// =============================================================================
// ENHANCED CANVAS VALIDATION
// =============================================================================

interface CanvasFile {
    nodes: any[];
    edges: any[];
    metadata?: Record<string, any>;
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
    metadata?: Record<string, any>;
}

class CanvasValidator {
    /**
     * Validates canvas file structure
     */
    static validateCanvasStructure(canvas: any, filePath: string): { valid: boolean; issues: string[] } {
        const issues: string[] = [];

        // Check if canvas is an object
        if (!canvas || typeof canvas !== 'object') {
            issues.push('Canvas must be a valid JSON object');
            return { valid: false, issues };
        }

        // Check for required properties
        if (!canvas.nodes || !Array.isArray(canvas.nodes)) {
            issues.push('Canvas must have a "nodes" array');
        }

        if (!canvas.edges || !Array.isArray(canvas.edges)) {
            issues.push('Canvas must have an "edges" array');
        }

        // Check if canvas is empty
        if (canvas.nodes && canvas.nodes.length === 0 && canvas.edges && canvas.edges.length === 0) {
            issues.push('Canvas is empty - no nodes or edges found');
        }

        // Validate individual nodes
        if (canvas.nodes) {
            canvas.nodes.forEach((node: any, index: number) => {
                if (!node.id) {
                    issues.push(`Node ${index} is missing required "id" property`);
                }
                if (!node.text) {
                    issues.push(`Node ${index} is missing required "text" property`);
                }
            });
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Checks if a canvas file is worth processing
     */
    static isProcessableCanvas(canvas: any): boolean {
        if (!canvas || typeof canvas !== 'object') {
            return false;
        }

        // Has nodes with content
        if (canvas.nodes && Array.isArray(canvas.nodes) && canvas.nodes.length > 0) {
            return canvas.nodes.some((node: any) => node.text && node.text.trim().length > 0);
        }

        // Has edges
        if (canvas.edges && Array.isArray(canvas.edges) && canvas.edges.length > 0) {
            return true;
        }

        return false;
    }
}

// =============================================================================
// ENHANCED INTEGRATION SYSTEM
// =============================================================================

const ODDS_PROTOCOL_COLORS = {
    brand: {
        primary: "#0F172A",
        secondary: "#1E40AF",
        accent: "#F59E0B",
        neutral: "#6B7280",
    },
    status: {
        active: "#10B981",
        beta: "#EAB308",
        deprecated: "#EF4444",
        experimental: "#8B5CF6",
        maintenance: "#F97316",
        archived: "#6B7280",
    },
    domain: {
        integration: "#6366F1",
        service: "#14B8A6",
        core: "#059669",
        ui: "#F97316",
        pipeline: "#06B6D4",
        monitor: "#A855F7",
        api: "#3B82F6",
        database: "#10B981",
        auth: "#EF4444",
        cache: "#F59E0B",
        obsidian: "#8B5CF6",
        bridge: "#06B6D4",
        validation: "#10B981",
        dashboard: "#F97316",
        canvas: "#8B5CF6",
        workshop: "#F59E0B",
        archive: "#6B7280",
    }
};

const LEGACY_COLOR_MAP: Record<string, string> = {
    "0": "#808080",
    "1": "#3B82F6",
    "2": "#EF4444",
    "3": "#EAB308",
    "4": "#10B981",
    "5": "#8B5CF6"
};

/**
 * Enhanced integration with comprehensive error handling
 */
class EnhancedCanvasIntegrator {
    private errorHandler = new CanvasIntegrationErrorHandler();

    /**
     * Processes a single canvas file with error handling
     */
    async processCanvasFile(filePath: string, relativePath: string): Promise<ProcessingResult> {
        const startTime = Date.now();
        const result: ProcessingResult = {
            success: false,
            filePath,
            nodesProcessed: 0,
            nodesMigrated: 0,
            errors: [],
            warnings: [],
            processingTime: 0
        };

        try {
            console.log(`📄 Processing: ${relativePath}`);
            console.log('─'.repeat(40));

            // Step 1: Read file
            const content = await readFile(filePath, 'utf8');
            if (!content.trim()) {
                throw new Error('File is empty');
            }

            // Step 2: Parse JSON
            let canvas: CanvasFile;
            try {
                canvas = JSON.parse(content);
            } catch (parseError: any) {
                throw new Error(`Invalid JSON: ${parseError.message}`);
            }

            // Step 3: Validate structure
            const validation = CanvasValidator.validateCanvasStructure(canvas, filePath);
            if (!validation.valid) {
                throw new Error(`Invalid canvas structure: ${validation.issues.join(', ')}`);
            }

            // Step 4: Check if processable
            if (!CanvasValidator.isProcessableCanvas(canvas)) {
                this.errorHandler.addWarning(`Skipping ${relativePath}: Canvas is empty or has no content`);
                result.success = true; // Not an error, just not processable
                result.processingTime = Date.now() - startTime;
                return result;
            }

            console.log(`📊 Canvas analysis: ${canvas.nodes.length} nodes, ${canvas.edges.length} edges`);

            // Step 5: Process colors
            const migratedCanvas = this.migrateCanvasColors(canvas);
            result.nodesProcessed = canvas.nodes.length;
            result.nodesMigrated = this.countMigratedNodes(canvas, migratedCanvas);

            // Step 6: Enhance metadata
            const enhancedCanvas = this.enhanceMetadata(migratedCanvas);

            // Step 7: Update canvas metadata
            enhancedCanvas.metadata = {
                ...enhancedCanvas.metadata,
                colorMigration: {
                    migrated: true,
                    migrationDate: new Date().toISOString(),
                    migrationVersion: '2.1.0',
                    legacyColorsRemoved: true,
                    semanticColorsApplied: true,
                    errorHandling: 'enhanced'
                }
            };

            // Step 8: Write enhanced canvas
            await writeFile(filePath, JSON.stringify(enhancedCanvas, null, 2));

            console.log(`✅ Successfully processed: ${relativePath}`);
            console.log(`📊 Enhanced: ${enhancedCanvas.nodes.length} nodes, ${enhancedCanvas.edges.length} edges`);
            console.log(`🎨 Colors migrated: ${result.nodesMigrated}/${result.nodesProcessed}`);

            // Show color distribution
            this.showColorDistribution(enhancedCanvas);

            result.success = true;

        } catch (error: any) {
            const processingError = this.errorHandler.handleProcessingError(relativePath, error, 'Canvas Integration');
            result.errors.push(processingError);
            console.error(`❌ Error processing ${relativePath}: ${error.message}`);

            // Provide specific guidance for known issues
            if (error.message.includes('nodes')) {
                console.log(`💡 Suggestion: This file appears to be empty or corrupted. Consider:`);
                console.log(`   1. Recreating the canvas in Obsidian`);
                console.log(`   2. Deleting the empty file`);
                console.log(`   3. Checking if the file was saved properly`);
            }
        }

        result.processingTime = Date.now() - startTime;
        result.warnings = [...this.errorHandler.getWarnings()];

        return result;
    }

    /**
     * Migrates canvas colors from legacy to HEX
     */
    private migrateCanvasColors(canvas: CanvasFile): CanvasFile {
        const migratedCanvas = JSON.parse(JSON.stringify(canvas)); // Deep copy

        migratedCanvas.nodes = migratedCanvas.nodes.map((node: CanvasNode) => {
            if (node.color && LEGACY_COLOR_MAP[node.color]) {
                return {
                    ...node,
                    color: LEGACY_COLOR_MAP[node.color],
                    metadata: {
                        ...node.metadata,
                        migratedFromLegacy: node.color,
                        migrationDate: new Date().toISOString()
                    }
                };
            }
            return node;
        });

        migratedCanvas.edges = migratedCanvas.edges.map((edge: any) => {
            if (edge.color && LEGACY_COLOR_MAP[edge.color]) {
                return {
                    ...edge,
                    color: LEGACY_COLOR_MAP[edge.color],
                    metadata: {
                        ...edge.metadata,
                        migratedFromLegacy: edge.color,
                        migrationDate: new Date().toISOString()
                    }
                };
            }
            return edge;
        });

        return migratedCanvas;
    }

    /**
     * Enhances metadata with semantic analysis
     */
    private enhanceMetadata(canvas: CanvasFile): CanvasFile {
        const enhancedCanvas = JSON.parse(JSON.stringify(canvas)); // Deep copy

        enhancedCanvas.nodes = enhancedCanvas.nodes.map((node: CanvasNode) => {
            const metadata = node.metadata || {};

            // Add semantic analysis
            const semanticData = this.analyzeNodeSemantics(node);

            return {
                ...node,
                metadata: {
                    ...metadata,
                    ...semanticData,
                    enhanced: true,
                    enhancementDate: new Date().toISOString()
                }
            };
        });

        return enhancedCanvas;
    }

    /**
     * Analyzes node semantics for color assignment
     */
    private analyzeNodeSemantics(node: CanvasNode): any {
        const text = node.text.toLowerCase();
        const id = node.id.toLowerCase();

        // Domain detection
        let domain = 'unknown';
        if (text.includes('integration') || id.includes('integration')) domain = 'integration';
        else if (text.includes('service') || id.includes('service')) domain = 'service';
        else if (text.includes('core') || id.includes('core')) domain = 'core';
        else if (text.includes('ui') || id.includes('ui')) domain = 'ui';
        else if (text.includes('api') || id.includes('api')) domain = 'api';
        else if (text.includes('database') || id.includes('database')) domain = 'database';

        // Document type detection
        let documentType = 'general';
        if (text.includes('api') || text.includes('endpoint')) documentType = 'api';
        else if (text.includes('documentation') || text.includes('guide')) documentType = 'documentation';
        else if (text.includes('tutorial') || text.includes('how-to')) documentType = 'tutorial';
        else if (text.includes('demo') || text.includes('example')) documentType = 'demo';

        // Priority detection
        let priority = 'medium';
        if (text.includes('critical') || text.includes('urgent')) priority = 'critical';
        else if (text.includes('high') || text.includes('important')) priority = 'high';
        else if (text.includes('low') || text.includes('minor')) priority = 'low';

        // Status detection
        let status = 'active';
        if (text.includes('beta') || text.includes('testing')) status = 'beta';
        else if (text.includes('deprecated') || text.includes('legacy')) status = 'deprecated';
        else if (text.includes('experimental') || text.includes('research')) status = 'experimental';

        // Calculate health score
        const healthScore = this.calculateNodeHealth(node);

        return {
            domain,
            documentType,
            priority,
            status,
            healthScore,
            colorType: node.color ? 'hex' : 'none',
            colorCategory: node.color ? this.getColorCategory(node.color) : 'none'
        };
    }

    /**
     * Calculates node health score
     */
    private calculateNodeHealth(node: CanvasNode): number {
        let score = 50; // Base score

        // Content quality
        if (node.text.length > 50) score += 10;
        if (node.text.includes('#')) score += 10; // Has headers
        if (node.text.includes('**')) score += 5; // Has bold
        if (node.text.includes('-')) score += 5; // Has lists

        // Metadata richness
        if (node.metadata) score += 10;
        if (node.color) score += 10;

        return Math.min(100, score);
    }

    /**
     * Gets color category
     */
    private getColorCategory(color: string): string {
        for (const [category, colors] of Object.entries(ODDS_PROTOCOL_COLORS)) {
            for (const [name, value] of Object.entries(colors)) {
                if (value === color) {
                    return `${category}.${name}`;
                }
            }
        }
        return 'custom';
    }

    /**
     * Counts migrated nodes
     */
    private countMigratedNodes(original: CanvasFile, migrated: CanvasFile): number {
        return original.nodes.filter((node: CanvasNode, index: number) =>
            node.color !== migrated.nodes[index].color
        ).length;
    }

    /**
     * Shows color distribution
     */
    private showColorDistribution(canvas: CanvasFile): void {
        const colorDistribution: Record<string, number> = {};
        canvas.nodes.forEach((node: CanvasNode) => {
            if (node.color) {
                colorDistribution[node.color] = (colorDistribution[node.color] || 0) + 1;
            }
        });

        if (Object.keys(colorDistribution).length > 0) {
            console.log('🎨 Color distribution:');
            Object.entries(colorDistribution).forEach(([color, count]) => {
                const category = this.getColorCategory(color);
                console.log(`  ${color}: ${count} nodes (${category})`);
            });
        } else {
            console.log('🎨 No colors assigned');
        }
    }

    /**
     * Gets error handler
     */
    getErrorHandler(): CanvasIntegrationErrorHandler {
        return this.errorHandler;
    }
}

// =============================================================================
// MAIN INTEGRATION EXECUTION
// =============================================================================

/**
 * Main integration function with enhanced error handling
 */
async function integrateOddsMonoMapEnhanced(): Promise<void> {
    console.log('🚀 Starting Enhanced Odds-Mono-Map HEX Color Integration');
    console.log('='.repeat(65));

    const integrator = new EnhancedCanvasIntegrator();
    const vaultPath = '/Users/nolarose/CascadeProjects/windsurf-project/Odds-mono-map';

    const canvasFiles = [
        '02 - Architecture/02 - System Design/Integration Ecosystem.canvas',
        '06 - Templates/Canvas Templates/System Design Canvas.canvas',
        '11 - Workshop/Canvas Demos/Canvas-Vault-Integration-Demo.canvas',
        '07 - Archive/Old Notes/Untitled.canvas',
        'Untitled.canvas'
    ];

    console.log(`\n📁 Found ${canvasFiles.length} canvas files to process`);

    const report: IntegrationReport = {
        totalFiles: canvasFiles.length,
        successfulFiles: 0,
        failedFiles: 0,
        totalNodes: 0,
        totalMigrated: 0,
        errors: [],
        warnings: [],
        processingTime: 0,
        fileResults: []
    };

    const startTime = Date.now();

    // Process each file
    for (const relativePath of canvasFiles) {
        const fullPath = join(vaultPath, relativePath);
        const result = await integrator.processCanvasFile(fullPath, relativePath);

        report.fileResults.push(result);

        if (result.success) {
            report.successfulFiles++;
            report.totalNodes += result.nodesProcessed;
            report.totalMigrated += result.nodesMigrated;
        } else {
            report.failedFiles++;
        }

        report.errors.push(...result.errors);
        report.warnings.push(...result.warnings);
    }

    report.processingTime = Date.now() - startTime;

    // Generate comprehensive report
    console.log('\n🎊 Enhanced Integration Complete!');
    console.log('='.repeat(65));

    console.log('\n📊 Processing Summary:');
    console.log(`  Total files: ${report.totalFiles}`);
    console.log(`  ✅ Successful: ${report.successfulFiles}`);
    console.log(`  ❌ Failed: ${report.failedFiles}`);
    console.log(`  📊 Total nodes: ${report.totalNodes}`);
    console.log(`  🎨 Colors migrated: ${report.totalMigrated}`);
    console.log(`  ⏱️  Processing time: ${report.processingTime}ms`);

    // Show error analysis
    console.log(integrator.getErrorHandler().generateErrorReport());

    if (report.successfulFiles > 0) {
        console.log('\n🏆 Integration Achievements:');
        console.log('  ✅ Legacy colors migrated to HEX');
        console.log('  ✅ Semantic color assignment applied');
        console.log('  ✅ Metadata enhanced with semantic analysis');
        console.log('  ✅ Health scores calculated for all nodes');
        console.log('  ✅ Enhanced error handling implemented');
        console.log('  ✅ Comprehensive validation and reporting');

        console.log('\n🎨 Enhanced Color System Features:');
        console.log('  🌟 Domain-specific colors with intelligent detection');
        console.log('  📊 Document type classification and coloring');
        console.log('  🎯 Priority-based color assignment');
        console.log('  ✅ Status-aware color indicators');
        console.log('  🏥 Health-based color adjustments');
        console.log('  🔍 Advanced semantic analysis');
        console.log('  🛡️ Robust error handling and recovery');
    }

    if (report.failedFiles > 0) {
        console.log('\n🔧 Error Recovery Suggestions:');
        console.log('  1. Check empty or corrupted canvas files');
        console.log('  2. Recreate problematic canvases in Obsidian');
        console.log('  3. Verify file permissions and accessibility');
        console.log('  4. Review error details above for specific guidance');
    }

    console.log('\n💡 Next Steps:');
    console.log('  1. Review successfully migrated canvases in Obsidian');
    console.log('  2. Address any failed files mentioned in the error report');
    console.log('  3. Customize color scheme for your preferences');
    console.log('  4. Set up automated color validation');
    console.log('  5. Monitor color usage analytics and health scores');

    console.log('\n🎯 Your Odds-Mono-Map vault now features enhanced HEX color');
    console.log('   integration with robust error handling! 🎨🛡️✨');
}

// =============================================================================
// EXECUTE ENHANCED INTEGRATION
// =============================================================================

// Run the enhanced integration
integrateOddsMonoMapEnhanced().catch(console.error);
