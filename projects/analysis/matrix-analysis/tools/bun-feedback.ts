#!/usr/bin/env bun

/**
 * bun feedback — Collect feedback into ~/.feedback/log.jsonl
 *
 * Modes:
 *   bun feedback "message"              inline (positional args joined)
 *   bun feedback file1.txt file2.txt    file   (read + concat contents)
 *   echo "msg" | bun feedback           stdin  (piped input)
 *
 * Flags:
 *   --email/-e     Attach email address
 *   --list/-l      Print last 10 entries
 *   --count/-c     Print total entry count
 *   --tail/-t <N>  Show last N entries and watch for new ones (default: 10)
 *   --search/-s    Filter entries by substring (case-insensitive)
 *   --grep/-g      Filter entries by regex pattern
 *   --export       Export entries as json or csv
 *   --delete/-d    Delete entry by ID
 */

import { $ } from "bun";
import { watch } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { defineCommand, fmt } from "../.claude/lib/cli.ts";
import { EXIT_CODES } from "../.claude/lib/exit-codes.ts";

const FEEDBACK_DIR = resolve(homedir(), ".feedback");
const LOG_FILE = resolve(FEEDBACK_DIR, "log.jsonl");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB

type Source = "inline" | "file" | "stdin";

interface FeedbackRecord {
	id: string;
	ts: string;
	source: Source;
	message: string;
	email: string | null;
	files: string[];
	meta: { cwd: string; bunVersion: string; platform: string };
}

async function ensureDir(): Promise<void> {
	const dir = Bun.file(FEEDBACK_DIR);
	if (!(await dir.exists())) {
		await Bun.write(resolve(FEEDBACK_DIR, ".keep"), "");
	}
}

async function rotateIfNeeded(): Promise<void> {
	const file = Bun.file(LOG_FILE);
	if (!(await file.exists())) return;
	if (file.size <= MAX_LOG_SIZE) return;

	const now = new Date();
	const stamp = now.toISOString().replace(/[:.]/g, "").slice(0, 15);
	const archivePath = resolve(FEEDBACK_DIR, `log.${stamp}.jsonl`);
	await $`mv ${LOG_FILE} ${archivePath}`.quiet();
}

async function appendRecord(record: FeedbackRecord): Promise<void> {
	await ensureDir();
	await rotateIfNeeded();
	const line = `${JSON.stringify(record)}\n`;
	const file = Bun.file(LOG_FILE);
	if (await file.exists()) {
		const existing = await file.text();
		await Bun.write(LOG_FILE, existing + line);
	} else {
		await Bun.write(LOG_FILE, line);
	}
}

async function readRecords(): Promise<FeedbackRecord[]> {
	const file = Bun.file(LOG_FILE);
	if (!(await file.exists())) return [];
	const text = await file.text();
	return text
		.split("\n")
		.filter((l) => l.trim().length > 0)
		.map((l) => JSON.parse(l));
}

function buildRecord(
	source: Source,
	message: string,
	email: string | null,
	files: string[],
): FeedbackRecord {
	return {
		id: Bun.randomUUIDv7(),
		ts: new Date().toISOString(),
		source,
		message,
		email,
		files,
		meta: {
			cwd: process.cwd(),
			bunVersion: Bun.version,
			platform: process.platform,
		},
	};
}

function formatEntry(r: FeedbackRecord): string {
	const emailTag = r.email ? ` <${r.email}>` : "";
	const preview = r.message.length > 72 ? `${r.message.slice(0, 72)}...` : r.message;
	return `${fmt.dim(r.ts)} ${fmt.tag(r.source, preview)}${emailTag}`;
}

function filterRecords(
	records: FeedbackRecord[],
	opts: { search?: string; grep?: string; email?: string | null },
): FeedbackRecord[] {
	let result = records;

	if (opts.email) {
		result = result.filter((r) => r.email === opts.email);
	}

	if (opts.search) {
		const term = opts.search.toLowerCase();
		result = result.filter((r) => r.message.toLowerCase().includes(term));
	}

	if (opts.grep) {
		const re = new RegExp(opts.grep);
		result = result.filter((r) => re.test(r.message));
	}

	return result;
}

function csvEscape(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function recordsToCsv(records: FeedbackRecord[]): string {
	const header = "id,ts,source,message,email,files,cwd,bunVersion,platform";
	const rows = records.map((r) =>
		[
			r.id,
			r.ts,
			r.source,
			csvEscape(r.message),
			r.email ?? "",
			csvEscape(r.files.join(";")),
			csvEscape(r.meta.cwd),
			r.meta.bunVersion,
			r.meta.platform,
		].join(","),
	);
	return [header, ...rows].join("\n");
}

defineCommand({
	name: "feedback",
	description: "Collect feedback into ~/.feedback/log.jsonl",
	usage: 'bun feedback [options] ["message" | file1.txt ...]',
	options: {
		email: {
			type: "string",
			short: "e",
			description: "Attach an email address to the feedback",
		},
		list: {
			type: "boolean",
			short: "l",
			default: false,
			description: "Print last 10 entries",
		},
		count: {
			type: "boolean",
			short: "c",
			default: false,
			description: "Print total entry count",
		},
		tail: {
			type: "string",
			short: "t",
			description: "Show last N entries and watch for new ones (default: 10)",
		},
		search: {
			type: "string",
			short: "s",
			description: "Filter entries by substring (case-insensitive)",
		},
		grep: {
			type: "string",
			short: "g",
			description: "Filter entries by regex pattern",
		},
		export: {
			type: "string",
			description: "Export entries as json or csv",
		},
		delete: {
			type: "string",
			short: "d",
			description: "Delete entry by ID",
		},
	},
	run: async (values, positionals) => {
		const email = (values.email as string) || null;
		const search = values.search as string | undefined;
		const grep = values.grep as string | undefined;

		// --count: print total and exit
		if (values.count) {
			const records = await readRecords();
			console.log(records.length.toString());
			return;
		}

		// --delete: remove a record by ID
		if (values.delete) {
			const targetId = values.delete as string;
			const records = await readRecords();
			const idx = records.findIndex((r) => r.id === targetId);
			if (idx === -1) {
				console.error(fmt.fail(`Record not found: ${targetId}`));
				process.exit(EXIT_CODES.NOT_FOUND);
			}
			const remaining = records.filter((r) => r.id !== targetId);
			const lines = remaining.map((r) => JSON.stringify(r)).join("\n");
			await Bun.write(LOG_FILE, lines.length > 0 ? `${lines}\n` : "");
			console.log(fmt.ok(`Deleted record ${fmt.dim(`[${targetId}]`)}`));
			return;
		}

		// --export: output records as json or csv
		if (values.export) {
			const format = (values.export as string).toLowerCase();
			if (format !== "json" && format !== "csv") {
				console.error(fmt.fail('--export must be "json" or "csv"'));
				process.exit(EXIT_CODES.USAGE_ERROR);
			}
			const records = filterRecords(await readRecords(), {
				search,
				grep,
				email,
			});
			if (format === "json") {
				console.log(JSON.stringify(records, null, 2));
			} else {
				console.log(recordsToCsv(records));
			}
			return;
		}

		// --search / --grep: filter and display
		if (search || grep) {
			const records = filterRecords(await readRecords(), {
				search,
				grep,
				email,
			});
			if (records.length === 0) {
				console.log(fmt.dim("No matching entries."));
				return;
			}
			for (const r of records) {
				console.log(formatEntry(r));
			}
			return;
		}

		// --tail: show last N entries then watch for new ones
		if (values.tail !== undefined) {
			const n = parseInt(values.tail as string, 10) || 10;
			const records = await readRecords();
			const tail = records.slice(-n);
			for (const r of tail) {
				console.log(formatEntry(r));
			}

			const file = Bun.file(LOG_FILE);
			let offset = (await file.exists()) ? file.size : 0;

			console.log(fmt.dim("--- watching for new entries (Ctrl+C to stop) ---"));

			const watcher = watch(LOG_FILE, async () => {
				const current = Bun.file(LOG_FILE);
				if (current.size <= offset) return;
				const fd = await current.arrayBuffer();
				const slice = new Uint8Array(fd).slice(offset);
				const chunk = new TextDecoder().decode(slice);
				offset = current.size;
				const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
				for (const line of lines) {
					const r: FeedbackRecord = JSON.parse(line);
					console.log(formatEntry(r));
				}
			});

			process.on("SIGINT", () => {
				watcher.close();
				process.exit(0);
			});

			// Keep process alive
			await new Promise(() => {});
			return;
		}

		// --list: print last 10 entries and exit
		if (values.list) {
			const records = await readRecords();
			if (records.length === 0) {
				console.log(fmt.dim("No feedback entries yet."));
				return;
			}
			const last10 = records.slice(-10);
			for (const r of last10) {
				console.log(formatEntry(r));
			}
			return;
		}

		// Detect input mode
		let source: Source;
		let message: string;
		let files: string[] = [];

		if (!process.stdin.isTTY) {
			// Stdin mode
			source = "stdin";
			if (positionals.length > 0) {
				console.error(fmt.warn("Positional arguments ignored when reading from stdin"));
			}
			message = await Bun.readableStreamToText(Bun.stdin.stream());
			message = message.trimEnd();
			if (!message) {
				console.error(fmt.fail("No input received from stdin."));
				process.exit(EXIT_CODES.USAGE_ERROR);
			}
		} else if (positionals.length > 0) {
			// Check if args are files or inline text
			const existResults = await Promise.all(
				positionals.map(async (arg) => ({
					arg,
					exists: await Bun.file(arg).exists(),
				})),
			);

			const allExist = existResults.every((r) => r.exists);
			const noneExist = existResults.every((r) => !r.exists);

			if (allExist) {
				// File mode
				source = "file";
				const contents = await Promise.all(positionals.map((f) => Bun.file(f).text()));
				message = contents.join("\n---\n");
				files = positionals.map((f) => resolve(f));
			} else if (noneExist) {
				// Inline mode
				source = "inline";
				message = positionals.join(" ");
			} else {
				// Mixed — some exist, some don't
				const missing = existResults.filter((r) => !r.exists).map((r) => r.arg);
				console.error(
					fmt.fail(
						`Mixed input: some args are files, some are not. Not found: ${missing.join(", ")}`,
					),
				);
				process.exit(EXIT_CODES.USAGE_ERROR);
			}
		} else {
			// No input
			console.error(fmt.fail("No input provided."));
			console.error(
				fmt.dim(
					'Usage: bun feedback "message" | bun feedback file.txt | echo "msg" | bun feedback',
				),
			);
			process.exit(EXIT_CODES.USAGE_ERROR);
		}

		const record = buildRecord(source, message, email, files);
		await appendRecord(record);
		console.log(fmt.ok(`Feedback recorded ${fmt.dim(`[${record.id}]`)}`));
	},
});
