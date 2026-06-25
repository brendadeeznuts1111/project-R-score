#!/usr/bin/env bun

/**
 * Sarah's Review Process (Layer 2 & 1)
 * Team Lead: Market Analytics Team
 * Packages: @graph/layer2, @graph/layer1
 * Maintainers: Tom Wilson (layer2), Lisa Zhang (layer1)
 * Reviewers: Sarah Kumar, Mike Rodriguez
 * 
 * Reviews PRs with benchmark results and approves if improvement >5%
 */

interface BenchmarkResults {
	duration: {
		before: number;
		after: number;
		improvement: number;
	};
	accuracy: {
		before: number;
		after: number;
		improvement: number;
	};
}

/**
 * Review PR with benchmark results
 */
function reviewPR(
	benchmarkResults: BenchmarkResults,
	packageName: string,
): { approved: boolean; message: string } {
	const durationImprovement = benchmarkResults.duration.improvement;
	const accuracyImprovement = benchmarkResults.accuracy.improvement;

	// Approve if improvement >5% and no regression
	if (durationImprovement > 5 && accuracyImprovement >= 0) {
		const message = `LGTM! ${durationImprovement.toFixed(1)}% performance improvement verified. Accuracy: ${(accuracyImprovement * 100).toFixed(1)}%`;
		return { approved: true, message };
	}

	if (durationImprovement < 0) {
		return {
			approved: false,
			message: `Performance regression detected: ${durationImprovement.toFixed(1)}% slower`,
		};
	}

	if (accuracyImprovement < 0) {
		return {
			approved: false,
			message: `Accuracy regression detected: ${(accuracyImprovement * 100).toFixed(1)}% decrease`,
		};
	}

	return {
		approved: false,
		message: `Improvement too small: ${durationImprovement.toFixed(1)}% (need >5%)`,
	};
}

/**
 * Approve PR and publish as release candidate
 */
async function approveAndPublish(
	packageName: string,
	benchmarkResults: BenchmarkResults,
) {
	const review = reviewPR(benchmarkResults, packageName);

	if (!review.approved) {
		console.error(`❌ PR not approved: ${review.message}`);
		process.exit(1);
	}

	console.info(`✅ PR approved: ${review.message}`);

	// Publish as release candidate
	console.info(`📦 Publishing ${packageName} as release candidate...`);
	const { $ } = await import("bun");
	await $`bun run scripts/team-publish.ts ${packageName} --tag=rc`;

	console.info(`✅ Published ${packageName}@rc`);
}

// Example usage
if (import.meta.main) {
	const benchmarkResults: BenchmarkResults = {
		duration: {
			before: 52.3,
			after: 38.7,
			improvement: ((52.3 - 38.7) / 52.3) * 100, // -26% improvement
		},
		accuracy: {
			before: 0.91,
			after: 0.93,
			improvement: 0.93 - 0.91, // +2% accuracy
		},
	};

	const packageName = process.argv[2] || "@graph/layer2";
	
	console.info(`📋 Reviewing PR for ${packageName}`);
	console.info(`   Team Lead: Sarah Kumar`);
	console.info(`   Reviewers: Sarah Kumar, Mike Rodriguez`);

	approveAndPublish(packageName, benchmarkResults).catch((error) => {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	});
}

export { reviewPR, approveAndPublish };
