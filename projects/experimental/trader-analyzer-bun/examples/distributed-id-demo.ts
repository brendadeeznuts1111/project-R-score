#!/usr/bin/env bun
/**
 * @fileoverview Distributed ID Demo
 * @description Demonstrates distributed ID generation and parsing
 */

import { DistributedID } from '../src/utils/distributed-id';

async function main() {
	console.log('🚀 Distributed ID Demo\n');

	// Example 1: Basic usage
	console.log('📊 Example 1: Basic ID Generation');
	const generator = new DistributedID(42); // Node ID 42

	const id1 = generator.next();
	const id2 = generator.next();
	const id3 = generator.next();

	console.log('Generated ID 1:', id1);
	console.log('Generated ID 2:', id2);
	console.log('Generated ID 3:', id3);
	console.log();

	// Example 2: Parse IDs
	console.log('📊 Example 2: Parse IDs');
	const parsed1 = generator.parse(id1);
	const parsed2 = generator.parse(id2);
	const parsed3 = generator.parse(id3);

	console.log('Parsed ID 1:', parsed1);
	console.log('Parsed ID 2:', parsed2);
	console.log('Parsed ID 3:', parsed3);
	console.log();

	// Example 3: Multiple nodes
	console.log('📊 Example 3: Multiple Nodes');
	const node1 = new DistributedID(1);
	const node2 = new DistributedID(2);
	const node3 = new DistributedID(3);

	const node1Id = node1.next();
	const node2Id = node2.next();
	const node3Id = node3.next();

	console.log('Node 1 ID:', node1Id);
	console.log('Node 2 ID:', node2Id);
	console.log('Node 3 ID:', node3Id);

	const parsedNode1 = node1.parse(node1Id);
	const parsedNode2 = node2.parse(node2Id);
	const parsedNode3 = node3.parse(node3Id);

	console.log('Node 1 parsed:', parsedNode1);
	console.log('Node 2 parsed:', parsedNode2);
	console.log('Node 3 parsed:', parsedNode3);
	console.log();

	// Example 4: High-frequency generation
	console.log('📊 Example 4: High-Frequency Generation');
	const highFreqGen = new DistributedID(100);
	const ids: string[] = [];

	for (let i = 0; i < 10; i++) {
		ids.push(highFreqGen.next());
		// Small delay to ensure different timestamps
		await Bun.sleep(1);
	}

	console.log(`Generated ${ids.length} IDs:`);
	ids.forEach((id, index) => {
		const parsed = highFreqGen.parse(id);
		console.log(`  ${index + 1}. ${id} - Node: ${parsed.nodeId}, Seq: ${parsed.sequence}, Time: ${new Date(parsed.timestamp).toISOString()}`);
	});
	console.log();

	// Example 5: Verify time ordering
	console.log('📊 Example 5: Verify Time Ordering');
	const timeOrderGen = new DistributedID(200);
	const orderedIds: string[] = [];

	for (let i = 0; i < 5; i++) {
		orderedIds.push(timeOrderGen.next());
		await Bun.sleep(10);
	}

	let isOrdered = true;
	for (let i = 1; i < orderedIds.length; i++) {
		const prev = timeOrderGen.parse(orderedIds[i - 1]);
		const curr = timeOrderGen.parse(orderedIds[i]);
		
		if (curr.timestamp < prev.timestamp) {
			isOrdered = false;
			break;
		}
	}

	console.log(`Time ordering check: ${isOrdered ? '✅ PASS' : '❌ FAIL'}`);
	console.log();

	// Example 6: Error handling
	console.log('📊 Example 6: Error Handling');
	try {
		const invalidGen = new DistributedID(2000); // Invalid node ID
	} catch (error) {
		console.log('Caught expected error:', (error as Error).message);
	}

	try {
		generator.parse('invalid-uuid-format');
	} catch (error) {
		console.log('Caught expected parse error:', (error as Error).message);
	}
	console.log();

	console.log('✅ Demo complete');
}

main().catch(console.error);
