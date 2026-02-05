/**
 * CSS Modules Usage Examples
 * 
 * Demonstrates how to use CSS modules in TSX/JSX files with Bun's bundler.
 * 
 * Bun automatically:
 * - Detects .module.css files
 * - Transforms class names to unique identifiers
 * - Provides type-safe imports
 */

import styles from "./css-modules-example.module.css";
import otherStyles from "./other-styles.module.css";

// Example 1: Basic usage
export function BasicExample() {
	return (
		<>
			<button className={styles.button}>Red button!</button>
			<button className={otherStyles.button}>Blue button!</button>
		</>
	);
}

// Example 2: Using composed classes
export function CompositionExample() {
	return (
		<div className={styles.card}>
			<h2 className={styles.title}>Card Title</h2>
			<p className={styles.content}>Card content goes here.</p>
			<button className={styles.buttonPrimary}>Primary Action</button>
		</div>
	);
}

// Example 3: Multiple classes
export function MultipleClassesExample() {
	return (
		<button className={`${styles.button} ${styles.buttonWithIcon}`}>
			<span>Icon</span>
			<span>Button Text</span>
		</button>
	);
}

// Example 4: Conditional classes
export function ConditionalClassesExample({ isPrimary }: { isPrimary: boolean }) {
	return (
		<button
			className={
				isPrimary ? styles.buttonPrimary : styles.buttonSecondary
			}
		>
			{isPrimary ? "Primary" : "Secondary"}
		</button>
	);
}

// Example 5: Inspecting module object
export function InspectModuleExample() {
	console.log("Styles object:", styles);
	console.log("Button class:", styles.button);
	console.log("Card class:", styles.card);
	
	// Output:
	// {
	//   button: "button_123",
	//   card: "card_456",
	//   title: "title_789",
	//   ...
	// }
	
	return <div className={styles.card}>Inspect console for class names</div>;
}

// Example 6: TypeScript type safety
// Bun provides type definitions for CSS modules
export function TypeSafeExample() {
	// TypeScript knows about available class names
	const buttonClass: string = styles.button; // ✅ Valid
	// const invalidClass: string = styles.nonexistent; // ❌ Type error
	
	return <button className={styles.button}>Type-safe button</button>;
}

// Example 7: Dynamic class names
export function DynamicClassesExample({ variant }: { variant: "primary" | "secondary" }) {
	const classMap = {
		primary: styles.buttonPrimary,
		secondary: styles.buttonSecondary,
	};
	
	return <button className={classMap[variant]}>Dynamic Button</button>;
}

// Example 8: Combining with global classes
export function GlobalAndModuleExample() {
	return (
		<div className={`global-class ${styles.card}`}>
			<h2 className={styles.title}>Combined Classes</h2>
		</div>
	);
}
