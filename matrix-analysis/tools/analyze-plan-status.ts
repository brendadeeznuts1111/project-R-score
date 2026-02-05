#!/usr/bin/env bun
/**
 * Analyze CLI Plan Status — updates plan markdown and MCP realtime resource
 * for dynamic status tracking with live confirmation.
 *
 * Usage:
 *   bun tools/analyze-plan-status.ts                    # Read current, write MCP resource
 *   bun tools/analyze-plan-status.ts --stage=2.x --done  # Mark stage complete
 */

const PLAN_PATH = ".cursor/plans/analyze_cli_missing_features_984046c9.plan.md";
const MCP_RESOURCE_PATH = ".matrix-integration/mcp/analyze_plan_realtime.json";
const MCP_URI = "bun://analyze/plan/realtime";

export interface PlanStatusUpdate {
	stage?: string;
	completed?: string[];
	message?: string;
	timestamp?: number;
}

export interface PlanStatus {
	uri: string;
	plan: string;
	stages: Record<string, "Done" | "Pending" | "Gap" | "Deferred">;
	lastUpdated: number;
	checksum: number;
}

const STAGE_STATUS: Record<string, string> = {
	"1.1": "Done",
	"1.1.1": "Done",
	"1.2": "Done",
	"1.3": "Done",
	"1.3.1": "Gap",
	"1.4": "Done",
	"1.4.1": "Gap",
	"1.5": "Done",
	"1.6": "Done",
	"1.6.1": "Deferred",
	"1.7": "Done",
	"1.7.1": "Gap",
	"2.1": "Done",
	"2.2": "Done",
	"3.1": "Pending",
	"3.2": "Pending",
	"3.3": "Pending",
	"3.4": "Pending",
	"3.5": "Pending",
	"4.1": "Pending",
	"4.2": "Pending",
	"4.3": "Pending",
	"5.1": "Pending",
	"5.2": "Pending",
	"5.3": "Pending",
	"5.4": "Pending",
};

function getDefaultStages(): Record<string, string> {
	return { ...STAGE_STATUS };
}

export async function updateAnalyzePlanStatus(
	update?: PlanStatusUpdate,
): Promise<PlanStatus> {
	const cwd = process.cwd();
	const planPath = cwd + "/" + PLAN_PATH;
	const mcpPath = cwd + "/" + MCP_RESOURCE_PATH;

	const stages = getDefaultStages();
	if (update?.completed?.length) {
		for (const id of update.completed) {
			stages[id] = "Done";
		}
	}

	const timestamp = update?.timestamp ?? Date.now();
	const payload = {
		plan: "analyze_cli_missing_features",
		stages,
		lastUpdated: timestamp,
		message: update?.message,
	};
	const text = JSON.stringify(payload, null, 2);
	const checksum = Number(Bun.hash.wyhash(text) % 2n ** 53n);

	const status: PlanStatus = {
		uri: MCP_URI,
		plan: "analyze_cli_missing_features",
		stages: stages as PlanStatus["stages"],
		lastUpdated: timestamp,
		checksum,
	};

	const mcpPayload = {
		uri: MCP_URI,
		data: {
			...payload,
			checksum,
			doneCount: Object.values(stages).filter((s) => s === "Done").length,
			pendingCount: Object.values(stages).filter((s) => s === "Pending").length,
			gapCount: Object.values(stages).filter((s) => s === "Gap").length,
		},
		timestamp,
	};

	await Bun.write(mcpPath, JSON.stringify(mcpPayload, null, 2));

	// Update plan markdown status table and summary
	try {
		const planContent = await Bun.file(planPath).text();
		let updated = planContent;
		const tableRegex = /(\| \*\*2\.1\*\* \| Bench harness \|) (Pending|Done) (\|)/;
		const tableRegex2 = /(\| \*\*2\.2\*\* \| Bench entry[^|]*\|) (Pending|Done) (\|)/;
		if (stages["2.1"] === "Done") updated = updated.replace(tableRegex, "$1 Done $3");
		if (stages["2.2"] === "Done") updated = updated.replace(tableRegex2, "$1 Done $3");
		if (stages["2.1"] === "Done" && stages["2.2"] === "Done") {
			updated = updated.replace(
				/- \*\*2\.x:\*\* Benchmarking — harness \+ entry \(--bench or analyze-bench\.ts\); \*\*Pending\.\*\*/,
				"- **2.x:** Benchmarking — harness + entry (--bench); **Done.**",
			);
		}
		if (updated !== planContent) await Bun.write(planPath, updated);
	} catch {
		// Plan file may be missing or read-only
	}

	return status;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const stageArg = args.find((a) => a.startsWith("--stage="));
	const doneFlag = args.includes("--done");

	let update: PlanStatusUpdate | undefined;
	if (stageArg && doneFlag) {
		const stage = stageArg.slice("--stage=".length);
		update = {
			stage,
			completed: stage.includes(".") ? [stage] : [stage + ".1", stage + ".2"],
			message: `Stage ${stage} completed`,
		};
	}

	const status = await updateAnalyzePlanStatus(update);
	console.log(JSON.stringify(status, null, 2));
}

if (import.meta.main) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
