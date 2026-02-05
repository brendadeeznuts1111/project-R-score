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
            console.log('⚠️ Stdin is already being read by another process');
            console.log('💡 Each process can only read from stdin once');
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
    console.log('📖 Basic Echo - Type lines and press Enter (Ctrl+C to exit):');
    console.write('> ');

    try {
        for await (const line of readStdin()) {
            if (line.trim() === 'exit') {
                console.log('👋 Goodbye!');
                break;
            }

            console.log(`📝 You typed: ${line}`);
            console.write('> ');
        }
    } catch (error) {
        console.log(`❌ Error reading stdin: ${error.message}`);
        console.log('💡 This might happen if stdin is already in use');
    }
}

/**
 * Demonstration with simulated input
 */
async function basicEchoDemo() {
    console.log('📖 Basic Echo Demo (Simulated Input):');
    console.log('This demonstrates how the echo function works with simulated input');
    console.log('');

    const simulatedInputs = ['Hello World', 'This is a test', 'Bun is awesome!', 'exit'];

    for await (const line of simulateInput(simulatedInputs)) {
        console.log(`> ${line}`);

        if (line.trim() === 'exit') {
            console.log('👋 Goodbye!');
            break;
        }

        console.log(`📝 You typed: ${line}`);
    }
}

/**
 * Simple addition calculator that reads numbers from stdin
 */
async function additionCalculator() {
    console.log('🧮 Addition Calculator');
    console.log('Enter numbers to add them to the running total');
    console.log('Type "reset" to clear total, "exit" to quit');
    console.write('Total: 0\n> ');

    let total = 0;

    try {
        for await (const line of readStdin()) {
            const input = line.trim().toLowerCase();

            if (input === 'exit') {
                console.log(`👋 Final total: ${total}`);
                break;
            }

            if (input === 'reset') {
                total = 0;
                console.log('🔄 Total reset to 0');
                console.write('Total: 0\n> ');
                continue;
            }

            const number = parseFloat(line);
            if (!isNaN(number)) {
                total += number;
                console.log(`➕ Added ${number}. New total: ${total}`);
            } else {
                console.log(`❌ Invalid number: "${line}"`);
            }

            console.write(`Total: ${total}\n> `);
        }
    } catch (error) {
        console.log(`❌ Error reading stdin: ${error.message}`);
    }
}

/**
 * Addition calculator demonstration with simulated input
 */
async function additionCalculatorDemo() {
    console.log('🧮 Addition Calculator Demo (Simulated Input):');
    console.log('This demonstrates how the calculator works with simulated input');
    console.log('');

    const simulatedInputs = ['10', '25', '15.5', 'reset', '5', '10', 'exit'];
    let total = 0;

    console.log('Total: 0');

    for await (const line of simulateInput(simulatedInputs)) {
        console.log(`> ${line}`);

        const input = line.trim().toLowerCase();

        if (input === 'exit') {
            console.log(`👋 Final total: ${total}`);
            break;
        }

        if (input === 'reset') {
            total = 0;
            console.log('🔄 Total reset to 0');
            console.log('Total: 0');
            continue;
        }

        const number = parseFloat(line);
        if (!isNaN(number)) {
            total += number;
            console.log(`➕ Added ${number}. New total: ${total}`);
        } else {
            console.log(`❌ Invalid number: "${line}"`);
        }

        console.log(`Total: ${total}`);
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
    console.log('🎯 Bun Console Stdin Reading Examples');
    console.log('='.repeat(50));

    // Run all demos
    await basicEchoDemo();
    console.log('\n' + '-'.repeat(50));
    await additionCalculatorDemo();

    console.log('\n🎉 All demo examples completed!');
    console.log('💡 To run interactive examples, use individual functions');
}
