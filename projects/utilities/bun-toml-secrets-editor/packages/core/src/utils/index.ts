/**
 * Utilities// Utils exports
 */
export * from "./ansi";
export * from "./s3-fetcher";
export * from "./pattern-matching";

export const TableFormatter = {
	format: (data: any[]) => data.map((row) => row.join(" | ")).join("\n"),
};
