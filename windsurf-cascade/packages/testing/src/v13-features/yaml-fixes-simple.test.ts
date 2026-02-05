#!/usr/bin/env bun

/**
 * 🧪 Bun v1.3.1 YAML Fixes Simple Test Suite
 * 
 * Tests the official Bun v1.3.1 YAML improvements:
 * - Ellipsis in double-quoted strings no longer cause document end errors
 * - Indicator characters are properly quoted in stringification
 * - Reliable round-trip operations for all YAML content
 */

import { test, expect, describe } from "bun:test";
import { YamlUtilsV13, parseYaml, stringifyYaml, roundTripYaml } from "../../../odds-core/src/utils/v13-enhancements/yaml-utils-v13.ts";

describe("🔧 Bun v1.3.1 YAML Fixes Tests", () => {

    test("✅ should initialize YamlUtilsV13 with default config", () => {
        const yamlUtils = new YamlUtilsV13({
            enablePerformanceMonitoring: true,
            enableCaching: true,
            enableRoundTripValidation: true
        });

        expect(yamlUtils).toBeDefined();
        expect(typeof yamlUtils.parse).toBe("function");
        expect(typeof yamlUtils.stringify).toBe("function");
        expect(typeof yamlUtils.roundTrip).toBe("function");
    });

    test("✅ should parse simple ellipsis messages", () => {
        const yamlUtils = new YamlUtilsV13();
        const yaml = 'message: "Loading..."';
        const result = yamlUtils.parse(yaml);

        expect(result.data.message).toBe("Loading...");
        expect(result.parseTime).toBeGreaterThan(0);
    });

    test("✅ should parse multiple ellipsis in one string", () => {
        const yamlUtils = new YamlUtilsV13();
        const yaml = 'status: "Step 1... Step 2... Step 3..."';
        const result = yamlUtils.parse(yaml);

        expect(result.data.status).toBe("Step 1... Step 2... Step 3...");
    });

    test("✅ should parse ellipsis with other content", () => {
        const yamlUtils = new YamlUtilsV13();
        const yaml = 'description: "Processing data... 50% complete"';
        const result = yamlUtils.parse(yaml);

        expect(result.data.description).toBe("Processing data... 50% complete");
    });

    test("✅ should parse international content with ellipsis", () => {
        const yamlUtils = new YamlUtilsV13();

        const testCases = [
            { yaml: 'chinese: "更多内容..."', expected: "更多内容..." },
            { yaml: 'japanese: "日本語テスト..."', expected: "日本語テスト..." },
            { yaml: 'korean: "한국어 테스트..."', expected: "한국어 테스트..." },
            { yaml: 'arabic: "العربية اختبار..."', expected: "العربية اختبار..." },
            { yaml: 'hebrew: "עברית בדיקה..."', expected: "עברית בדיקה..." }
        ];

        testCases.forEach(({ yaml, expected }) => {
            const result = yamlUtils.parse(yaml);
            const key = Object.keys(result.data)[0];
            expect(result.data[key]).toBe(expected);
        });
    });

    test("✅ should properly quote colon-prefixed strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const obj = { key: ":starts_with_colon" };
        const result = yamlUtils.stringify(obj);

        expect(result.yaml).toContain('":starts_with_colon"');
        expect(result.stringifyTime).toBeGreaterThan(0);
    });

    test("✅ should round-trip colon-prefixed strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const obj = { key: ":starts_with_colon" };
        const result = yamlUtils.roundTrip(obj);

        expect(result.success).toBe(true);
        expect(result.roundTripped.key).toBe(":starts_with_colon");
    });

    test("✅ should round-trip dash-prefixed strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const obj = { key: "-starts_with_dash" };
        const result = yamlUtils.roundTrip(obj);

        expect(result.success).toBe(true);
        expect(result.roundTripped.key).toBe("-starts_with_dash");
    });

    test("✅ should round-trip question mark-prefixed strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const obj = { key: "?starts_with_question" };
        const result = yamlUtils.roundTrip(obj);

        expect(result.success).toBe(true);
        expect(result.roundTripped.key).toBe("?starts_with_question");
    });

    test("✅ should round-trip bracket-prefixed strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const testCases = [
            { key: "[starts_with_bracket" },
            { key: "{starts_with_brace" },
            { key: "]starts_with_close_bracket" },
            { key: "}starts_with_close_brace" }
        ];

        testCases.forEach(({ key }) => {
            const obj = { key };
            const result = yamlUtils.roundTrip(obj);

            expect(result.success).toBe(true);
            expect(result.roundTripped.key).toBe(key);
        });
    });

    test("✅ should round-trip special character strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const testCases = [
            { key: "#hashtag" },
            { key: "&ampersand" },
            { key: "*asterisk" },
            { key: "!exclamation" },
            { key: "|pipe" },
            { key: ">greater" },
            { key: "%percent" },
            { key: "@at_sign" },
            { key: "`backtick" }
        ];

        testCases.forEach(({ key }) => {
            const obj = { key };
            const result = yamlUtils.roundTrip(obj);

            expect(result.success).toBe(true);
            expect(result.roundTripped.key).toBe(key);
        });
    });

    test("✅ should round-trip whitespace-prefixed strings", () => {
        const yamlUtils = new YamlUtilsV13();
        const testCases = [
            { key: " starts_with_space" },
            { key: "\tstarts_with_tab" },
            { key: "\nstarts_with_newline" }
        ];

        testCases.forEach(({ key }) => {
            const obj = { key };
            const result = yamlUtils.roundTrip(obj);

            expect(result.success).toBe(true);
            expect(result.roundTripped.key).toBe(key);
        });
    });

    test("✅ should handle mixed indicator characters", () => {
        const yamlUtils = new YamlUtilsV13();
        const obj = {
            colon: ":secret_key",
            dash: "-option",
            hash: "#comment",
            ampersand: "&reference",
            asterisk: "*wildcard",
            space: " leading_space"
        };

        const result = yamlUtils.roundTrip(obj);

        expect(result.success).toBe(true);
        expect(result.roundTripped).toEqual(obj);

        // Verify proper quoting in YAML output
        expect(result.yaml).toContain('":secret_key"');
        expect(result.yaml).toContain('"-option"');
        expect(result.yaml).toContain('"#comment"');
        expect(result.yaml).toContain('"&reference"');
        expect(result.yaml).toContain('"*wildcard"');
        expect(result.yaml).toContain('" leading_space"');
    });

    test("✅ should round-trip complex objects with ellipsis and indicators", () => {
        const yamlUtils = new YamlUtilsV13();
        const obj = {
            messages: {
                loading: "加载中...",
                error: "错误：无法连接...",
                warning: "警告：磁盘空间不足..."
            },
            config: {
                api_key: ":secret_123",
                webhook_url: "#webhook_endpoint",
                backup_path: "-backup_location"
            },
            data: [
                { id: "-12345", status: "processing..." },
                { key: "#hashtag", value: "&entity_ref" },
                { command: "git commit -m 'Fix...'" }
            ]
        };

        const result = yamlUtils.roundTrip(obj);

        expect(result.success).toBe(true);
        expect(result.roundTripped).toEqual(obj);
        expect(result.totalTime).toBeGreaterThan(0);
    });

    test("✅ should handle real-world configuration scenarios", () => {
        const yamlUtils = new YamlUtilsV13();
        const config = {
            application: {
                name: "My App",
                version: "1.0.0",
                status: "Loading..."
            },
            database: {
                url: "postgresql://localhost:5432/myapp",
                pool_size: "10-20",
                timeout: "30s..."
            },
            features: {
                authentication: true,
                logging: "debug...",
                monitoring: "#enabled"
            },
            messages: {
                welcome: "欢迎使用...",
                error: "错误：操作失败...",
                success: "操作成功完成！"
            }
        };

        const result = yamlUtils.roundTrip(config);

        expect(result.success).toBe(true);
        expect(result.roundTripped).toEqual(config);
    });

    test("✅ should cache parsed YAML for performance", () => {
        const yamlUtils = new YamlUtilsV13({ enableCaching: true });
        const yaml = 'message: "Loading..."';

        // First parse
        const first = yamlUtils.parse(yaml);
        expect(first.cached).toBe(false);

        // Second parse should be cached
        const second = yamlUtils.parse(yaml);
        expect(second.cached).toBe(true);
        expect(second.parseTime).toBeLessThan(first.parseTime);
    });

    test("✅ should track performance metrics", () => {
        const yamlUtils = new YamlUtilsV13({ enablePerformanceMonitoring: true });

        // Perform some operations
        yamlUtils.parse('test: "value..."');
        yamlUtils.stringify({ key: ":value" });
        yamlUtils.roundTrip({ message: "Loading..." });

        const metrics = yamlUtils.getMetrics();

        expect(metrics.parseCount).toBeGreaterThan(0);
        expect(metrics.stringifyCount).toBeGreaterThan(0);
        expect(metrics.roundTripCount).toBeGreaterThan(0);
        expect(metrics.totalParseTime).toBeGreaterThan(0);
        expect(metrics.totalStringifyTime).toBeGreaterThan(0);
        expect(metrics.totalRoundTripTime).toBeGreaterThan(0);
        expect(metrics.averageParseTime).toBeGreaterThan(0);
        expect(metrics.averageStringifyTime).toBeGreaterThan(0);
        expect(metrics.averageRoundTripTime).toBeGreaterThan(0);
    });

    test("✅ should handle edge cases with ellipsis", () => {
        const yamlUtils = new YamlUtilsV13();
        const edgeCases = [
            { yaml: 'empty: "..."', expected: "..." },
            { yaml: 'multiple: "......"', expected: "......" },
            { yaml: 'start: "...content"', expected: "...content" },
            { yaml: 'end: "content..."', expected: "content..." },
            { yaml: 'both: "...content..."', expected: "...content..." }
        ];

        edgeCases.forEach(({ yaml, expected }) => {
            const result = yamlUtils.parse(yaml);
            const key = Object.keys(result.data)[0];
            expect(result.data[key]).toBe(expected);
        });
    });

    test("✅ should work with parseYaml convenience function", () => {
        const yaml = 'message: "Loading..."';
        const result = parseYaml(yaml);

        expect(result.data.message).toBe("Loading...");
        expect(result.parseTime).toBeGreaterThan(0);
    });

    test("✅ should work with stringifyYaml convenience function", () => {
        const data = { key: ":value" };
        const result = stringifyYaml(data);

        expect(result.yaml).toContain('":value"');
        expect(result.stringifyTime).toBeGreaterThan(0);
    });

    test("✅ should work with roundTripYaml convenience function", () => {
        const data = { message: "Loading..." };
        const result = roundTripYaml(data);

        expect(result.success).toBe(true);
        expect(result.roundTripped).toEqual(data);
    });

    test("✅ should validate all v1.3.1 improvements", () => {
        const yamlUtils = new YamlUtilsV13();
        const results = yamlUtils.testV13Improvements();

        expect(results.ellipsisSupport).toBe(true);
        expect(results.indicatorCharacterQuoting).toBe(true);
        expect(results.internationalContent).toBe(true);
        expect(results.roundTripReliability).toBe(true);
    });
});
