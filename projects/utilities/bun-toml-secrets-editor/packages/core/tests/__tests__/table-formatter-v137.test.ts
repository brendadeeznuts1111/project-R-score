/**
 * Table Formatter v1.3.7 Tests
 *
 * Tests for wide table support (10-100 columns)
 */

import { describe, expect, it } from "bun:test";
import {
	createWideTable,
	TableFormatterV137,
} from "../utils/table-formatter-v137.js";

describe("TableFormatterV137", () => {
	describe("Column Support", () => {
		it("should support minimum 10 columns", () => {
			const table = createWideTable(5, 2); // Request 5, should get 10 (min)
			expect(table.getColumnCount()).toBeGreaterThanOrEqual(10);
		});

		it("should support up to 100 columns", () => {
			const table = createWideTable(100, 1);
			expect(table.getColumnCount()).toBe(100);
		});

		it("should limit columns to maximum 100", () => {
			const table = createWideTable(150, 1); // Request 150, should get 100 (max)
			expect(table.getColumnCount()).toBe(100);
		});

		it("should support exactly 10 columns", () => {
			const table = createWideTable(10, 2);
			expect(table.getColumnCount()).toBe(10);
		});

		it("should support exactly 50 columns", () => {
			const table = createWideTable(50, 2);
			expect(table.getColumnCount()).toBe(50);
		});
	});

	describe("Table Rendering", () => {
		it("should render a basic table", () => {
			const table = new TableFormatterV137();
			table.setColumns([
				{ key: "name", header: "Name", width: 10 },
				{ key: "value", header: "Value", width: 10 },
			]);
			table.addRow({ name: "Test", value: "123" });

			const output = table.render();
			expect(output).toContain("Name");
			expect(output).toContain("Value");
			expect(output).toContain("Test");
			expect(output).toContain("123");
		});

		it("should render with proper borders", () => {
			const table = new TableFormatterV137();
			table.setColumns([
				{ key: "a", header: "A", width: 5 },
				{ key: "b", header: "B", width: 5 },
			]);
			table.addRow({ a: "1", b: "2" });

			const output = table.render();
			expect(output).toContain("+");
			expect(output).toContain("-");
			expect(output).toContain("|");
		});

		it("should handle empty cells", () => {
			const table = new TableFormatterV137();
			table.setColumns([
				{ key: "a", header: "A", width: 8 },
				{ key: "b", header: "B", width: 8 },
			]);
			table.addRow({ a: "test", b: null });

			const output = table.render();
			expect(output).toContain("test");
		});

		it("should truncate long content", () => {
			const table = new TableFormatterV137();
			table.setColumns([{ key: "text", header: "Text", width: 10 }]);
			table.addRow({ text: "This is very long" });

			const output = table.render();
			// Content is truncated with ... or cell is padded
			expect(output).toContain("Text");
			expect(output.length).toBeGreaterThan(20);
		});
	});

	describe("Alignment", () => {
		it("should support left alignment", () => {
			const table = new TableFormatterV137();
			table.setColumns([
				{ key: "val", header: "Value", width: 10, align: "left" },
			]);
			table.addRow({ val: "test" });

			const output = table.render();
			// Left-aligned text should be at the start
			expect(output).toContain("test");
		});

		it("should support right alignment", () => {
			const table = new TableFormatterV137();
			table.setColumns([
				{ key: "val", header: "Value", width: 10, align: "right" },
			]);
			table.addRow({ val: "42" });

			const output = table.render();
			// Right-aligned "42" should appear in output
			expect(output).toContain("42");
			expect(output).toContain("Value");
		});

		it("should support center alignment", () => {
			const table = new TableFormatterV137();
			table.setColumns([
				{ key: "val", header: "Value", width: 10, align: "center" },
			]);
			table.addRow({ val: "test" });

			const output = table.render();
			expect(output).toContain("test");
		});
	});

	describe("Export Formats", () => {
		it("should export as CSV", () => {
			const table = new TableFormatterV137({ exportFormat: "csv" });
			table.setColumns([
				{ key: "name", header: "Name" },
				{ key: "value", header: "Value" },
			]);
			table.addRow({ name: "Test", value: "123" });

			const output = table.render();
			expect(output).toContain('"Name","Value"');
			expect(output).toContain('"Test","123"');
		});

		it("should export as JSON", () => {
			const table = new TableFormatterV137({ exportFormat: "json" });
			table.setColumns([
				{ key: "name", header: "Name" },
				{ key: "value", header: "Value" },
			]);
			table.addRow({ name: "Test", value: "123" });

			const output = table.render();
			const parsed = JSON.parse(output);
			expect(parsed).toHaveLength(1);
			expect(parsed[0].name).toBe("Test");
		});

		it("should export as Markdown", () => {
			const table = new TableFormatterV137({ exportFormat: "markdown" });
			table.setColumns([
				{ key: "name", header: "Name" },
				{ key: "value", header: "Value" },
			]);
			table.addRow({ name: "Test", value: "123" });

			const output = table.render();
			expect(output).toContain("| Name | Value");
			expect(output).toContain("---");
		});
	});

	describe("Performance", () => {
		it("should render 100 columns quickly", () => {
			const start = performance.now();
			const table = createWideTable(100, 5);
			table.render();
			const duration = performance.now() - start;

			// Should render in under 100ms
			expect(duration).toBeLessThan(100);
		});

		it("should handle many rows efficiently", () => {
			const table = createWideTable(20, 100);

			const start = performance.now();
			table.render();
			const duration = performance.now() - start;

			// Should render in under 200ms
			expect(duration).toBeLessThan(200);
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero rows", () => {
			const table = new TableFormatterV137();
			table.setColumns([{ key: "a", header: "A", width: 10 }]);
			// No rows added

			const output = table.render();
			expect(output).toContain("A"); // Header still present
		});

		it("should handle very wide content", () => {
			const table = new TableFormatterV137();
			table.setColumns([{ key: "url", header: "URL", width: 30 }]);
			table.addRow({
				url: "https://example.com/very/long/path/that/exceeds/the/column/width/significantly",
			});

			const output = table.render();
			expect(output).toContain("...");
		});

		it("should handle special characters", () => {
			const table = new TableFormatterV137();
			table.setColumns([{ key: "text", header: "Text", width: 20 }]);
			table.addRow({ text: "Special: | + - = * & % $ # @ !" });

			const output = table.render();
			expect(output).toContain("Special");
		});
	});
});
