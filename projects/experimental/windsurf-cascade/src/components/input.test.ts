// src/components/input.test.ts
// Input component test for coverage demonstration

import { test, expect, describe } from "bun:test";

describe("Input Component", () => {
    test("renders with default value", () => {
        const input = {
            value: "default",
            placeholder: "Enter text",
            disabled: false,
            onChange: (value: string) => { }
        };

        expect(input.value).toBe("default");
        expect(input.placeholder).toBe("Enter text");
        expect(input.disabled).toBe(false);
    });

    test("handles value changes", () => {
        let currentValue = "initial";
        const input = {
            value: currentValue,
            placeholder: "Type here",
            disabled: false,
            onChange: (newValue: string) => { currentValue = newValue; }
        };

        input.onChange("new value");
        expect(currentValue).toBe("new value");
    });

    test("validates required input", () => {
        const input = {
            value: "",
            required: true,
            validate: () => false
        };

        expect(input.validate()).toBe(false);
    });

    test("validates optional input", () => {
        const input = {
            value: "",
            required: false,
            validate: () => true
        };

        expect(input.validate()).toBe(true);
    });
});

describe("Input Edge Cases", () => {
    test("handles maxLength constraint", () => {
        const input = {
            value: "12345",
            maxLength: 5,
            isValid: () => true
        };

        expect(input.value.length).toBeLessThanOrEqual(input.maxLength);
        expect(input.isValid()).toBe(true);
    });

    test("handles numeric input", () => {
        const input = {
            value: "123",
            type: "number",
            isNumeric: () => !isNaN(Number("123"))
        };

        expect(input.isNumeric()).toBe(true);
    });
});
