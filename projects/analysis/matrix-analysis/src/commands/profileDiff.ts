import { fmt } from "../../.claude/lib/cli.ts";
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import { maskValue } from "../lib/output";
import { loadProfile } from "../lib/profileLoader";

interface DiffEntry {
	key: string;
	left?: string;
	right?: string;
	status: "added" | "removed" | "changed" | "unchanged";
}

export async function profileDiff(
	leftName: string,
	rightName: string,
	options?: { showUnchanged?: boolean },
): Promise<void> {
	const [left, right] = await Promise.all([
		loadProfile(leftName),
		loadProfile(rightName),
	]);

	if (!left) {
		console.error(fmt.fail(`Profile "${leftName}" not found`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	if (!right) {
		console.error(fmt.fail(`Profile "${rightName}" not found`));
		process.exit(EXIT_CODES.NOT_FOUND);
	}

	const allKeys = new Set([...Object.keys(left.env), ...Object.keys(right.env)]);

	const diffs: DiffEntry[] = [];

	for (const key of [...allKeys].sort()) {
		const leftVal = left.env[key];
		const rightVal = right.env[key];

		if (leftVal === undefined) {
			diffs.push({ key, right: rightVal, status: "added" });
		} else if (rightVal === undefined) {
			diffs.push({ key, left: leftVal, status: "removed" });
		} else if (leftVal !== rightVal) {
			diffs.push({ key, left: leftVal, right: rightVal, status: "changed" });
		} else if (options?.showUnchanged) {
			diffs.push({ key, left: leftVal, right: rightVal, status: "unchanged" });
		}
	}

	console.log(fmt.bold(`Comparing profiles: ${leftName} ↔ ${rightName}`) + "\n");

	const added = diffs.filter((d) => d.status === "added");
	const removed = diffs.filter((d) => d.status === "removed");
	const changed = diffs.filter((d) => d.status === "changed");

	if (added.length === 0 && removed.length === 0 && changed.length === 0) {
		console.log(fmt.ok("Profiles are identical"));
		return;
	}

	// Summary
	const parts: string[] = [];
	if (added.length > 0) parts.push(`${fmt.ok("+")}${added.length} added`);
	if (removed.length > 0) parts.push(`${fmt.fail("-")}${removed.length} removed`);
	if (changed.length > 0) parts.push(`${fmt.warn("~")}${changed.length} changed`);
	console.log(parts.join("  ") + "\n");

	// Details
	if (added.length > 0) {
		console.log(fmt.ok(`── Added in ${rightName} ──`));
		for (const d of added) {
			console.log(`  ${fmt.ok("+")} ${d.key} = ${maskValue(d.key, d.right!)}`);
		}
		console.log();
	}

	if (removed.length > 0) {
		console.log(fmt.fail(`── Removed from ${rightName} ──`));
		for (const d of removed) {
			console.log(`  ${fmt.fail("-")} ${d.key} = ${maskValue(d.key, d.left!)}`);
		}
		console.log();
	}

	if (changed.length > 0) {
		console.log(fmt.warn(`── Changed ──`));
		for (const d of changed) {
			console.log(`  ${fmt.warn("~")} ${d.key}`);
			console.log(`    ${leftName}: ${maskValue(d.key, d.left!)}`);
			console.log(`    ${rightName}: ${maskValue(d.key, d.right!)}`);
		}
	}

	// Compare path variables
	const leftPaths = left.paths || {};
	const rightPaths = right.paths || {};
	const allPathVars = new Set([...Object.keys(leftPaths), ...Object.keys(rightPaths)]);

	if (allPathVars.size > 0) {
		const pathAdded: string[] = [];
		const pathRemoved: string[] = [];
		const pathChanged: string[] = [];

		for (const v of [...allPathVars].sort()) {
			const lc = leftPaths[v];
			const rc = rightPaths[v];

			if (!lc && rc) {
				pathAdded.push(v);
			} else if (lc && !rc) {
				pathRemoved.push(v);
			} else if (lc && rc) {
				const lPre = JSON.stringify(lc.prepend || []);
				const rPre = JSON.stringify(rc.prepend || []);
				const lApp = JSON.stringify(lc.append || []);
				const rApp = JSON.stringify(rc.append || []);
				if (lPre !== rPre || lApp !== rApp) {
					pathChanged.push(v);
				}
			}
		}

		if (pathAdded.length > 0 || pathRemoved.length > 0 || pathChanged.length > 0) {
			console.log(`\n${fmt.bold("Path Variables:")}\n`);

			if (pathAdded.length > 0) {
				for (const v of pathAdded) {
					const rc = rightPaths[v];
					console.log(`  ${fmt.ok("+")} ${v}`);
					if (rc.prepend?.length) console.log(`      prepend: ${rc.prepend.join(", ")}`);
					if (rc.append?.length) console.log(`      append: ${rc.append.join(", ")}`);
				}
			}

			if (pathRemoved.length > 0) {
				for (const v of pathRemoved) {
					const lc = leftPaths[v];
					console.log(`  ${fmt.fail("-")} ${v}`);
					if (lc.prepend?.length) console.log(`      prepend: ${lc.prepend.join(", ")}`);
					if (lc.append?.length) console.log(`      append: ${lc.append.join(", ")}`);
				}
			}

			if (pathChanged.length > 0) {
				for (const v of pathChanged) {
					const lc = leftPaths[v];
					const rc = rightPaths[v];
					console.log(`  ${fmt.warn("~")} ${v}`);
					console.log(
						`    ${leftName}: prepend=[${(lc.prepend || []).join(", ")}] append=[${(lc.append || []).join(", ")}]`,
					);
					console.log(
						`    ${rightName}: prepend=[${(rc.prepend || []).join(", ")}] append=[${(rc.append || []).join(", ")}]`,
					);
				}
			}
		}
	}
}
