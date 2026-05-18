// packages/odds-core/src/examples/extended-metadata-validator-examples.ts - Comprehensive examples of extended MetadataValidator

import {
    MetadataValidator,
    MetadataBuilder,
    type ValidationRule,
    type ValidationSchema,
    type ValidationContext,
    type ValidationResult,
    type EnhancedMetadata
} from '@odds-core/utils';

/**
 * Comprehensive examples of extended MetadataValidator capabilities
 */
export class ExtendedMetadataValidatorExamples {

    /**
     * Example 1: Backward compatibility demonstration
     */
    static demonstrateBackwardCompatibility(): void {
        console.info('🔄 Backward Compatibility Demonstration\n');

        // Create metadata using existing builder
        const metadata = MetadataBuilder.createEnhanced()
            .withId('example-001')
            .withSource('test-api')
            .withMarket('NBA', 'Lakers vs Celtics')
            .withTopics(['PRE_GAME', 'MAIN_LINE'])
            .withQuality(0.9, 0.8, 0.9)
            .build();

        console.info('📝 Created sample metadata...');

        // Original validation method (still works)
        const originalResult = MetadataValidator.validate(metadata);
        console.info('✅ Original validation method:');
        console.info(`   Valid: ${originalResult.valid}`);
        console.info(`   Errors: ${originalResult.errors.length}`);

        // New validation method with context
        const enhancedResult = MetadataValidator.validateWithContext(metadata);
        console.info('\n🚀 Enhanced validation method:');
        console.info(`   Valid: ${enhancedResult.valid}`);
        console.info(`   Errors: ${enhancedResult.errors.length}`);
        console.info(`   Warnings: ${enhancedResult.warnings.length}`);
        console.info(`   Info: ${enhancedResult.info.length}`);

        console.info('\n✅ Backward compatibility maintained!');
    }

    /**
     * Example 2: Custom validation rules
     */
    static demonstrateCustomRules(): void {
        console.info('\n🎯 Custom Validation Rules\n');

        // Create custom validation rules
        const idRule = MetadataValidator.createRule(
            'id-format',
            'Ensures ID follows specific format',
            (metadata) => {
                const idPattern = /^[a-z0-9]+-[0-9]{3}$/;
                if (!idPattern.test(metadata.id)) {
                    return {
                        valid: false,
                        message: 'ID must follow pattern: [lowercase]-[numbers]',
                        severity: 'error'
                    };
                }
                return { valid: true, message: '' };
            },
            'error'
        );

        const qualityRule = MetadataValidator.createRule(
            'quality-threshold',
            'Warns about low quality scores',
            (metadata) => {
                if (metadata.quality.overall < 0.7) {
                    return {
                        valid: false,
                        message: 'Quality score is below recommended threshold (0.7)',
                        severity: 'warning'
                    };
                }
                return { valid: true, message: '' };
            },
            'warning'
        );

        const timestampRule = MetadataValidator.createRule(
            'timestamp-recency',
            'Info about timestamp age',
            (metadata) => {
                const age = Date.now() - metadata.timestamp.getTime();
                const hoursOld = age / (1000 * 60 * 60);

                if (hoursOld > 24) {
                    return {
                        valid: false,
                        message: `Metadata is ${hoursOld.toFixed(1)} hours old`,
                        severity: 'info'
                    };
                }
                return { valid: true, message: '' };
            },
            'info'
        );

        console.info('📋 Created custom validation rules:');
        console.info(`   • ${idRule.name}: ${idRule.description}`);
        console.info(`   • ${qualityRule.name}: ${qualityRule.description}`);
        console.info(`   • ${timestampRule.name}: ${timestampRule.description}`);

        // Test with different metadata
        const testCases = [
            {
                name: 'Valid metadata',
                metadata: MetadataBuilder.createEnhanced()
                    .withId('valid-001')
                    .withSource('test-api')
                    .withMarket('NBA', 'Lakers vs Celtics')
                    .withTopics(['PRE_GAME'])
                    .withQuality(0.9, 0.8, 0.9)
                    .build()
            },
            {
                name: 'Invalid ID format',
                metadata: MetadataBuilder.createEnhanced()
                    .withId('INVALID_ID')
                    .withSource('test-api')
                    .withMarket('NBA', 'Lakers vs Celtics')
                    .withTopics(['PRE_GAME'])
                    .withQuality(0.9, 0.8, 0.9)
                    .build()
            },
            {
                name: 'Low quality',
                metadata: MetadataBuilder.createEnhanced()
                    .withId('low-001')
                    .withSource('test-api')
                    .withMarket('NBA', 'Lakers vs Celtics')
                    .withTopics(['PRE_GAME'])
                    .withQuality(0.5, 0.4, 0.6)
                    .build()
            }
        ];

        console.info('\n🧪 Testing custom rules:\n');

        for (const testCase of testCases) {
            console.info(`📊 ${testCase.name}:`);

            const result = MetadataValidator.validateWithContext(
                testCase.metadata,
                { customRules: [idRule, qualityRule, timestampRule], includeWarnings: true }
            );

            console.info(`   Valid: ${result.valid}`);
            if (result.errors.length > 0) {
                console.info('   Errors:');
                result.errors.forEach(error => console.info(`     • ${error}`));
            }
            if (result.warnings.length > 0) {
                console.info('   Warnings:');
                result.warnings.forEach(warning => console.info(`     • ${warning}`));
            }
            if (result.info.length > 0) {
                console.info('   Info:');
                result.info.forEach(info => console.info(`     • ${info}`));
            }
            console.info('');
        }
    }

    /**
     * Example 3: Custom validation schemas
     */
    static demonstrateCustomSchemas(): void {
        console.info('📋 Custom Validation Schemas\n');

        // Create custom validation rules for schemas
        const sportRule = MetadataValidator.createRule(
            'required-sport',
            'Ensures sport is specified in market',
            (metadata) => {
                if (!metadata.market.sport) {
                    return {
                        valid: false,
                        message: 'Market must specify sport',
                        severity: 'error'
                    };
                }
                return { valid: true, message: '' };
            }
        );

        const topicRule = MetadataValidator.createRule(
            'required-topics',
            'Ensures at least one topic is specified',
            (metadata) => {
                if (!metadata.topics || metadata.topics.length === 0) {
                    return {
                        valid: false,
                        message: 'At least one topic must be specified',
                        severity: 'error'
                    };
                }
                return { valid: true, message: '' };
            }
        );

        const businessRule = MetadataValidator.createRule(
            'business-context',
            'Warns if business context is missing',
            (metadata) => {
                if (!metadata.business.purpose || !metadata.business.domain) {
                    return {
                        valid: false,
                        message: 'Business context should include purpose and domain',
                        severity: 'warning'
                    };
                }
                return { valid: true, message: '' };
            }
        );

        // Create different schemas
        const strictSchema = MetadataValidator.createSchema(
            'strict-market-data',
            '1.0.0',
            [sportRule, topicRule, businessRule],
            ['id', 'timestamp', 'source', 'market', 'topics', 'quality'],
            ['tags', 'business', 'technical']
        );

        const minimalSchema = MetadataValidator.createSchema(
            'minimal-market-data',
            '1.0.0',
            [sportRule, topicRule],
            ['id', 'source', 'market'],
            ['topics', 'quality', 'timestamp']
        );

        const qualitySchema = MetadataValidator.createSchema(
            'quality-focused',
            '1.0.0',
            [sportRule, topicRule, businessRule],
            ['id', 'source', 'market', 'topics', 'quality'],
            ['business', 'technical', 'relationships']
        );

        // Register schemas
        MetadataValidator.registerSchema(strictSchema);
        MetadataValidator.registerSchema(minimalSchema);
        MetadataValidator.registerSchema(qualitySchema);

        console.info('📝 Registered custom schemas:');
        console.info(`   • ${strictSchema.name} v${strictSchema.version}`);
        console.info(`   • ${minimalSchema.name} v${minimalSchema.version}`);
        console.info(`   • ${qualitySchema.name} v${qualitySchema.version}`);

        // Test metadata against different schemas
        const testMetadata = MetadataBuilder.createEnhanced()
            .withId('schema-test-001')
            .withSource('test-api')
            .withMarket('NBA', 'Lakers vs Celtics')
            .withTopics(['PRE_GAME'])
            .withQuality(0.8, 0.7, 0.9)
            .build();

        console.info('\n🧪 Testing metadata against schemas:\n');

        const schemas = ['strict-market-data', 'minimal-market-data', 'quality-focused'];

        for (const schemaName of schemas) {
            console.info(`📊 Schema: ${schemaName}`);

            try {
                const result = MetadataValidator.validateWithSchema(
                    testMetadata,
                    schemaName,
                    { includeWarnings: true }
                );

                console.info(`   Valid: ${result.valid}`);
                if (result.errors.length > 0) {
                    console.info('   Errors:');
                    result.errors.forEach(error => console.info(`     • ${error}`));
                }
                if (result.warnings.length > 0) {
                    console.info('   Warnings:');
                    result.warnings.forEach(warning => console.info(`     • ${warning}`));
                }
            } catch (error) {
                console.info(`   Error: ${error}`);
            }
            console.info('');
        }

        // Show registered schemas
        console.info('📋 All registered schemas:');
        const registeredSchemas = MetadataValidator.getRegisteredSchemas();
        registeredSchemas.forEach(schema => {
            console.info(`   • ${schema.name} v${schema.version} (${schema.rules.length} rules)`);
        });
    }

    /**
     * Example 4: Global rules and batch validation
     */
    static demonstrateGlobalRulesAndBatch(): void {
        console.info('🌐 Global Rules and Batch Validation\n');

        // Create and register global rules
        const globalIdRule = MetadataValidator.createRule(
            'global-id-length',
            'Ensures ID length is reasonable',
            (metadata) => {
                if (metadata.id.length > 50) {
                    return {
                        valid: false,
                        message: 'ID length exceeds 50 characters',
                        severity: 'warning'
                    };
                }
                return { valid: true, message: '' };
            },
            'warning'
        );

        const globalTimestampRule = MetadataValidator.createRule(
            'global-timestamp-future',
            'Prevents future timestamps',
            (metadata) => {
                if (metadata.timestamp.getTime() > Date.now() + 60000) { // 1 minute tolerance
                    return {
                        valid: false,
                        message: 'Timestamp is significantly in the future',
                        severity: 'error'
                    };
                }
                return { valid: true, message: '' };
            },
            'error'
        );

        // Register global rules
        MetadataValidator.addGlobalRule(globalIdRule);
        MetadataValidator.addGlobalRule(globalTimestampRule);

        console.info('🌍 Registered global rules:');
        console.info(`   • ${globalIdRule.name}: ${globalIdRule.description}`);
        console.info(`   • ${globalTimestampRule.name}: ${globalTimestampRule.description}`);

        // Create batch of metadata for testing
        const batchMetadata = [
            MetadataBuilder.createEnhanced()
                .withId('batch-001')
                .withSource('test-api')
                .withMarket('NBA', 'Game 1')
                .withTopics(['PRE_GAME'])
                .withQuality(0.9, 0.8, 0.9)
                .build(),

            MetadataBuilder.createEnhanced()
                .withId('this-is-a-very-long-id-that-exceeds-fifty-characters-limit')
                .withSource('test-api')
                .withMarket('NFL', 'Game 2')
                .withTopics(['PRE_GAME'])
                .withQuality(0.8, 0.7, 0.9)
                .build(),

            MetadataBuilder.createEnhanced()
                .withId('batch-003')
                .withSource('test-api')
                .withMarket('MLB', 'Game 3')
                .withTopics(['LIVE'])
                .withQuality(0.7, 0.6, 0.8)
                .withTimestamp(new Date(Date.now() + 2 * 60 * 1000)) // 2 minutes in future
                .build()
        ];

        console.info(`\n📦 Created batch of ${batchMetadata.length} metadata objects`);

        // Validate batch
        const batchResults = MetadataValidator.validateBatch(
            batchMetadata,
            { includeWarnings: true }
        );

        console.info('\n📊 Batch validation results:\n');

        batchResults.forEach((result, index) => {
            console.info(`📋 Metadata ${index + 1} (${result.metadata.id}):`);
            console.info(`   Valid: ${result.result.valid}`);
            console.info(`   Errors: ${result.result.errors.length}`);
            console.info(`   Warnings: ${result.result.warnings.length}`);

            if (result.result.errors.length > 0) {
                result.result.errors.forEach(error => console.info(`     ❌ ${error}`));
            }
            if (result.result.warnings.length > 0) {
                result.result.warnings.forEach(warning => console.info(`     ⚠️ ${warning}`));
            }
            console.info('');
        });

        // Get validation summary
        const validationResults = batchResults.map(r => r.result);
        const summary = MetadataValidator.getValidationSummary(validationResults);

        console.info('📈 Validation Summary:');
        console.info(`   Total: ${summary.total}`);
        console.info(`   Valid: ${summary.valid}`);
        console.info(`   Invalid: ${summary.invalid}`);
        console.info(`   Error Rate: ${(summary.errorRate * 100).toFixed(1)}%`);
        console.info(`   Warning Rate: ${(summary.warningRate * 100).toFixed(1)}%`);
        console.info(`   Total Errors: ${summary.totalErrors}`);
        console.info(`   Total Warnings: ${summary.totalWarnings}`);

        // Clean up global rules
        MetadataValidator.removeGlobalRule('global-id-length');
        MetadataValidator.removeGlobalRule('global-timestamp-future');
    }

    /**
     * Example 5: Advanced validation scenarios
     */
    static demonstrateAdvancedScenarios(): void {
        console.info('\n🚀 Advanced Validation Scenarios\n');

        // Scenario 1: Strict mode validation
        console.info('📏 Scenario 1: Strict Mode Validation');

        const metadataWithWarnings = MetadataBuilder.createEnhanced()
            .withId('strict-test-001')
            .withSource('test-api')
            .withMarket('NBA', 'Test Game')
            .withTopics(['PRE_GAME'])
            .withQuality(0.6, 0.5, 0.7) // Low quality
            .build();

        const warningRule = MetadataValidator.createRule(
            'quality-warning',
            'Warns about quality',
            (metadata) => ({
                valid: metadata.quality.overall >= 0.7,
                message: 'Quality below 0.7',
                severity: 'warning' as const
            })
        );

        const normalResult = MetadataValidator.validateWithContext(
            metadataWithWarnings,
            { customRules: [warningRule], includeWarnings: true }
        );

        const strictResult = MetadataValidator.validateWithContext(
            metadataWithWarnings,
            { customRules: [warningRule], strictMode: true }
        );

        console.info(`   Normal Mode - Valid: ${normalResult.valid}, Warnings: ${normalResult.warnings.length}`);
        console.info(`   Strict Mode - Valid: ${strictResult.valid}, Errors: ${strictResult.errors.length}`);
        console.info('');

        // Scenario 2: Field-specific validation
        console.info('🎯 Scenario 2: Field-Specific Validation');

        const fieldMetadata = MetadataBuilder.createEnhanced()
            .withId('field-test-001')
            .withSource('test-api')
            .withMarket('NBA', 'Test Game')
            .withTopics(['PRE_GAME'])
            .withQuality(0.9, 0.8, 0.9)
            .build();

        // Validate specific fields with custom validators
        const idValidation = MetadataValidator.validateField(
            fieldMetadata,
            'id',
            (value) => ({
                valid: typeof value === 'string' && value.includes('-'),
                message: 'ID must contain a hyphen'
            })
        );

        const sourceValidation = MetadataValidator.validateField(
            fieldMetadata,
            'source',
            (value) => ({
                valid: typeof value === 'string' && value.length >= 3,
                message: 'Source must be at least 3 characters long'
            })
        );

        console.info(`   ID Field Valid: ${idValidation.valid}`);
        if (!idValidation.valid) {
            console.info(`   ID Errors: ${idValidation.errors.join(', ')}`);
        }

        console.info(`   Source Field Valid: ${sourceValidation.valid}`);
        if (!sourceValidation.valid) {
            console.info(`   Source Errors: ${sourceValidation.errors.join(', ')}`);
        }
        console.info('');

        // Scenario 3: Enhanced topic validation
        console.info('🏷️ Scenario 3: Enhanced Topic Validation');

        const topicMetadata = MetadataBuilder.createEnhanced()
            .withId('topic-test-001')
            .withSource('test-api')
            .withMarket('NBA', 'Test Game')
            .withTopics(['PRE_GAME', 'CUSTOM_TOPIC', 'LIVE'])
            .withQuality(0.9, 0.8, 0.9)
            .build();

        // Standard topic validation
        const standardTopicResult = MetadataValidator.validateTopics(topicMetadata.topics);
        console.info(`   Standard Topics - Valid: ${standardTopicResult.valid}, Errors: ${standardTopicResult.errors.length}`);

        // Enhanced topic validation with custom topics
        const enhancedTopicResult = MetadataValidator.validateTopics(
            topicMetadata.topics,
            { allowCustom: true, customTopics: ['CUSTOM_TOPIC'] }
        );
        console.info(`   Enhanced Topics - Valid: ${enhancedTopicResult.valid}, Warnings: ${enhancedTopicResult.warnings?.length || 0}`);

        if (enhancedTopicResult.warnings) {
            console.info(`   Topic Warnings: ${enhancedTopicResult.warnings.join(', ')}`);
        }
        console.info('');

        // Scenario 4: Performance comparison
        console.info('⚡ Scenario 4: Performance Comparison');

        const performanceMetadata = Array(1000).fill(null).map((_, index) =>
            MetadataBuilder.createEnhanced()
                .withId(`perf-${index.toString().padStart(3, '0')}`)
                .withSource('test-api')
                .withMarket('NBA', `Game ${index}`)
                .withTopics(['PRE_GAME'])
                .withQuality(0.9, 0.8, 0.9)
                .build()
        );

        // Test original method
        const originalStart = performance.now();
        const originalResults = performanceMetadata.map(m => MetadataValidator.validate(m));
        const originalTime = performance.now() - originalStart;

        // Test enhanced method
        const enhancedStart = performance.now();
        const enhancedResults = performanceMetadata.map(m => MetadataValidator.validateWithContext(m));
        const enhancedTime = performance.now() - enhancedStart;

        console.info(`   Original Method: ${originalTime.toFixed(2)}ms for ${performanceMetadata.length} validations`);
        console.info(`   Enhanced Method: ${enhancedTime.toFixed(2)}ms for ${performanceMetadata.length} validations`);
        console.info(`   Performance Overhead: ${((enhancedTime - originalTime) / originalTime * 100).toFixed(1)}%`);
    }

    /**
     * Run all extended validator examples
     */
    static runAllExamples(): void {
        console.info('🚀 Extended MetadataValidator Examples\n');
        console.info('='.repeat(80));

        this.demonstrateBackwardCompatibility();
        console.info('='.repeat(80));

        this.demonstrateCustomRules();
        console.info('='.repeat(80));

        this.demonstrateCustomSchemas();
        console.info('='.repeat(80));

        this.demonstrateGlobalRulesAndBatch();
        console.info('='.repeat(80));

        this.demonstrateAdvancedScenarios();

        console.info('\n✅ All extended MetadataValidator examples completed!');
        console.info('\n🎯 Key Capabilities Demonstrated:');
        console.info('   • Backward compatibility with existing validation');
        console.info('   • Custom validation rules with error/warning/info severity');
        console.info('   • Reusable validation schemas with rule composition');
        console.info('   • Global rules that apply to all validations');
        console.info('   • Batch validation with summary statistics');
        console.info('   • Strict mode and field-specific validation');
        console.info('   • Enhanced topic validation with custom topics');
        console.info('   • Performance optimization for large-scale validation');
    }
}

export default ExtendedMetadataValidatorExamples;
