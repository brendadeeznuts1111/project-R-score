// packages/odds-core/src/__tests__/vscode-explorer-special-chars.test.ts
// Demonstration of VS Code Test Explorer special character support in Bun 1.3

import { test, expect, describe } from "bun:test";

describe("VS Code Test Explorer - Special Character Support", () => {

    // ✅ These test names now work properly in VS Code Test Explorer (Bun 1.3 fix)

    test("arbitrage: €100 stake @ 2.5 odds", () => {
        const stake = 100;
        const odds = 2.5;
        const expectedReturn = stake * odds;

        expect(expectedReturn).toBe(250);
        expect(stake).toBeGreaterThan(0);
        expect(odds).toBeGreaterThan(1);
    });

    test("currency conversion: $50 → €45.50", () => {
        const usd = 50;
        const eur = 45.50;
        const exchangeRate = eur / usd;

        expect(exchangeRate).toBeCloseTo(0.91, 2);
        expect(eur).toBeLessThan(usd);
    });

    test("percentage: 15% commission on £1000", () => {
        const amount = 1000;
        const commissionRate = 0.15;
        const commission = amount * commissionRate;

        expect(commission).toBe(150);
        expect(commission).toBeLessThan(amount);
    });

    test("mathematical: π × r² = area (r=5)", () => {
        const radius = 5;
        const pi = Math.PI;
        const area = pi * radius * radius;

        expect(area).toBeCloseTo(78.54, 2);
        expect(radius).toBeGreaterThan(0);
    });

    test("temperature: 25°C → 77°F conversion", () => {
        const celsius = 25;
        const fahrenheit = (celsius * 9 / 5) + 32;

        expect(fahrenheit).toBe(77);
        expect(celsius).toBeLessThan(fahrenheit);
    });

    test("symbols: α, β, γ in Greek alphabet", () => {
        const greekLetters = ["α", "β", "γ"];
        const expectedLetters = ["alpha", "beta", "gamma"];

        expect(greekLetters).toHaveLength(3);
        expect(greekLetters[0]).toBe("α");
        expect(greekLetters[1]).toBe("β");
        expect(greekLetters[2]).toBe("γ");
    });

    test("emoticons: 📈 market trend + 💰 profit = ✅ success", () => {
        const marketTrend = "📈";
        const profit = "💰";
        const success = "✅";

        const result = `${marketTrend} ${profit} ${success}`;
        expect(result).toBe("📈 💰 ✅");
        expect(result.length).toBeGreaterThan(0);
    });

    test("math symbols: ½ + ¼ = ¾", () => {
        const half = 0.5;
        const quarter = 0.25;
        const threeQuarters = half + quarter;

        expect(threeQuarters).toBe(0.75);
        expect(threeQuarters).toBeCloseTo(3 / 4, 4);
    });

    test("international: café résumé naïve façade", () => {
        const frenchWords = ["café", "résumé", "naïve", "façade"];

        expect(frenchWords).toHaveLength(4);
        expect(frenchWords.every(word => word.length > 0)).toBe(true);
        expect(frenchWords.some(word => word.includes("é"))).toBe(true);
    });

    test('quotes: "Hello, World!" & \'Goodbye\' test', () => {
        const doubleQuote = "Hello, World!";
        const singleQuote = 'Goodbye';

        expect(doubleQuote).toBe("Hello, World!");
        expect(singleQuote).toBe("Goodbye");
        expect(doubleQuote.length).toBeGreaterThan(singleQuote.length);
    });

    test("brackets: [array] {object} (function) symbols", () => {
        const array = [1, 2, 3];
        const object = { key: "value" };
        const func = () => "function";

        expect(array).toEqual([1, 2, 3]);
        expect(object.key).toBe("value");
        expect(func()).toBe("function");
    });

    // Sanitized versions (alternative approach)
    test("arbitrage: 100 EUR stake at 2.5 odds (sanitized)", () => {
        const stake = 100;
        const odds = 2.5;
        const expectedReturn = stake * odds;

        expect(expectedReturn).toBe(250);
    });

    test("currency conversion: 50 USD to 45.50 EUR (sanitized)", () => {
        const usd = 50;
        const eur = 45.50;
        const exchangeRate = eur / usd;

        expect(exchangeRate).toBeCloseTo(0.91, 2);
    });

    test("percentage: 15 percent commission on 1000 GBP (sanitized)", () => {
        const amount = 1000;
        const commissionRate = 0.15;
        const commission = amount * commissionRate;

        expect(commission).toBe(150);
    });
});

describe("Complex Test Names with Multiple Special Characters", () => {

    test("🎯 Goal: €1000 @ 2.5 odds = $2500 profit (15% tax = $2125 net)", () => {
        const stake = 1000;
        const odds = 2.5;
        const grossProfit = stake * odds;
        const taxRate = 0.15;
        const netProfit = grossProfit - (grossProfit * taxRate);

        expect(grossProfit).toBe(2500);
        expect(netProfit).toBe(2125);
        expect(netProfit).toBeLessThan(grossProfit);
    });

    test("📊 Analysis: π ≈ 3.14159, e ≈ 2.71828, φ ≈ 1.61803 (golden ratio)", () => {
        const pi = Math.PI;
        const e = Math.E;
        const phi = (1 + Math.sqrt(5)) / 2;

        expect(pi).toBeCloseTo(3.14159, 5);
        expect(e).toBeCloseTo(2.71828, 5);
        expect(phi).toBeCloseTo(1.61803, 5);
    });

    test("🌍 International: café (Paris) → £5.50, ¥750, ₩12000 conversion rates", () => {
        const parisCoffee = 5.50;
        const yenRate = 750 / parisCoffee;
        const wonRate = 12000 / parisCoffee;

        expect(yenRate).toBeCloseTo(136.36, 2);
        expect(wonRate).toBeCloseTo(2181.82, 2);
    });
});

describe("Edge Cases for VS Code Test Explorer", () => {

    test("very long name with special chars: €$£¥₩%π∞∫∑∏√∂∇∆∉∈∪∩⊂⊃∧∨¬∀∃∅∴∵≈≠≤≥±×÷≡≜≝≞≟≠≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟", () => {
        // This test name contains many mathematical symbols
        // In Bun 1.2, this would break VS Code Test Explorer
        // In Bun 1.3, it should display correctly

        expect(true).toBe(true);
    });

    test("unicode emojis: 🚀🎉🎯📊💰🔍🛡️⚡🔄🎨📱💻🌐🔧⚙️🎮🎵🎬📷🎨🖌️🖼️🗂️📋📌📍📎🔗📊📈📉🗺️🌍🌎🌏", () => {
        // Test name with many emojis
        // Should work properly in VS Code Test Explorer with Bun 1.3

        const emojis = "🚀🎉🎯📊💰🔍🛡️⚡🔄🎨📱💻🌐🔧⚙️🎮🎵🎬📷🎨🖌️🖼️🗂️📋📌📍📎🔗📊📈📉🗺️🌍🌎🌏";
        expect(emojis.length).toBeGreaterThan(0);
        expect(emojis.includes("🚀")).toBe(true);
    });

    test("mixed scripts: Hello 你好 こんにちは 안녕하세요 مرحبا שלום", () => {
        // Test name with multiple languages
        // Should display correctly in VS Code Test Explorer

        const greetings = ["Hello", "你好", "こんにちは", "안녕하세요", "مرحبا", "שלום"];
        expect(greetings).toHaveLength(6);
        expect(greetings.every(g => g.length > 0)).toBe(true);
    });
});
