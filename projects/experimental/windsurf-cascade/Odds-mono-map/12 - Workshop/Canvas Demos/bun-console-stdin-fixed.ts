#!/usr/bin/env bun

/**
 * Bun Console Stdin Reading Demonstration - Fixed Version
 * 
 * Focused demonstration of Bun's enhanced console capability to read
 * from process.stdin using AsyncIterable interface.
 * 
 * @author Odds Protocol Development Team
 * @version 1.1.0
 * @since 2025-11-18
 */

// =============================================================================
// STDIN READING UTILITIES
// =============================================================================

/**
 * Safe stdin reading with proper error handling
 */
async function* readStdin(): AsyncGenerator<string, void, unknown> {
    try {
        for await (const line of console) {
            yield line;
        }
    } catch (error) {
        if (error.message.includes('locked')) {
            console.info('⚠️ Stdin is already being read by another process');
            console.info('💡 Each process can only read from stdin once');
            return;
        }
        throw error;
    }
}

/**
 * Simulated stdin reading for demonstration purposes
 */
async function* simulateInput(inputs: string[]): AsyncGenerator<string, void, unknown> {
    for (const input of inputs) {
        yield input;
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate typing delay
    }
}

// =============================================================================
// BASIC STDIN READING EXAMPLES
// =============================================================================

/**
 * Basic stdin reading - echoes each line back to the user
 */
async function basicEcho() {
    console.info('📖 Basic Echo - Type lines and press Enter (Ctrl+C to exit):');
    console.write('> ');

    try {
        for await (const line of readStdin()) {
            if (line.trim() === 'exit') {
                console.info('👋 Goodbye!');
                break;
            }

            console.info(`📝 You typed: ${line}`);
            console.write('> ');
        }
    } catch (error) {
        console.info(`❌ Error reading stdin: ${error.message}`);
        console.info('💡 This might happen if stdin is already in use');
    }
}

/**
 * Demonstration with simulated input
 */
async function basicEchoDemo() {
    console.info('📖 Basic Echo Demo (Simulated Input):');
    console.info('This demonstrates how the echo function works with simulated input');
    console.info('');

    const simulatedInputs = ['Hello World', 'This is a test', 'Bun is awesome!', 'exit'];

    for await (const line of simulateInput(simulatedInputs)) {
        console.info(`> ${line}`);

        if (line.trim() === 'exit') {
            console.info('👋 Goodbye!');
            break;
        }

        console.info(`📝 You typed: ${line}`);
    }
}

/**
 * Simple addition calculator that reads numbers from stdin
 */
async function additionCalculator() {
    console.info('🧮 Addition Calculator');
    console.info('Enter numbers to add them to the running total');
    console.info('Type "reset" to clear total, "exit" to quit');
    console.write('Total: 0\n> ');

    let total = 0;

    try {
        for await (const line of readStdin()) {
            const input = line.trim().toLowerCase();

            if (input === 'exit') {
                console.info(`👋 Final total: ${total}`);
                break;
            }

            if (input === 'reset') {
                total = 0;
                console.info('🔄 Total reset to 0');
                console.write('Total: 0\n> ');
                continue;
            }

            const number = parseFloat(line);
            if (!isNaN(number)) {
                total += number;
                console.info(`➕ Added ${number}. New total: ${total}`);
            } else {
                console.info(`❌ Invalid number: "${line}"`);
            }

            console.write(`Total: ${total}\n> `);
        }
    } catch (error) {
        console.info(`❌ Error reading stdin: ${error.message}`);
    }
}

/**
 * Addition calculator demonstration with simulated input
 */
async function additionCalculatorDemo() {
    console.info('🧮 Addition Calculator Demo (Simulated Input):');
    console.info('This demonstrates how the calculator works with simulated input');
    console.info('');

    const simulatedInputs = ['10', '25', '15.5', 'reset', '5', '10', 'exit'];
    let total = 0;

    console.info('Total: 0');

    for await (const line of simulateInput(simulatedInputs)) {
        console.info(`> ${line}`);

        const input = line.trim().toLowerCase();

        if (input === 'exit') {
            console.info(`👋 Final total: ${total}`);
            break;
        }

        if (input === 'reset') {
            total = 0;
            console.info('🔄 Total reset to 0');
            console.info('Total: 0');
            continue;
        }

        const number = parseFloat(line);
        if (!isNaN(number)) {
            total += number;
            console.info(`➕ Added ${number}. New total: ${total}`);
        } else {
            console.info(`❌ Invalid number: "${line}"`);
        }

        console.info(`Total: ${total}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Export functions for programmatic use
export {
    basicEcho,
    basicEchoDemo,
    additionCalculator,
    additionCalculatorDemo,
    readStdin,
    simulateInput
};

// Run demo if executed directly
if (import.meta.main) {
    // Run demo mode automatically
    console.info('🎯 Bun Console Stdin Reading Examples');
    console.info('='.repeat(50));

    // Run all demos
    await basicEchoDemo();
    console.info('\n' + '-'.repeat(50));
    await additionCalculatorDemo();

    console.info('\n🎉 All demo examples completed!');
    console.info('💡 To run interactive examples, use individual functions');
}
