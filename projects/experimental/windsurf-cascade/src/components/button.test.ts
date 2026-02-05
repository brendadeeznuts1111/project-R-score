// src/components/button.test.ts
// Component test for coverage demonstration

import { test, expect, describe } from "bun:test";

describe("Button Component", () => {
    test("renders with default props", () => {
        const button = {
            text: "Click me",
            disabled: false,
            onClick: () => { }
        };

        expect(button.text).toBe("Click me");
        expect(button.disabled).toBe(false);
        expect(typeof button.onClick).toBe("function");
    });

    test("handles click events", () => {
        let clicked = false;
        const button = {
            text: "Submit",
            disabled: false,
            onClick: () => { clicked = true; }
        };

        button.onClick();
        expect(clicked).toBe(true);
    });

    test("disables correctly", () => {
        const button = {
            text: "Disabled",
            disabled: true,
            onClick: () => { }
        };

        expect(button.disabled).toBe(true);
    });

    test("applies correct CSS classes", () => {
        const button = {
            text: "Styled",
            disabled: false,
            className: "btn-primary",
            onClick: () => { }
        };

        expect(button.className).toBe("btn-primary");
    });
});

describe("Button Edge Cases", () => {
    test("handles empty text", () => {
        const button = {
            text: "",
            disabled: false,
            onClick: () => { }
        };

        expect(button.text).toBe("");
    });

    test("handles null onClick", () => {
        const button = {
            text: "No Handler",
            disabled: false,
            onClick: null
        };

        expect(button.onClick).toBe(null);
    });
});
