// validators/secrets-syntax.ts
import type { SecretVar, ValidationResult } from "./types/toml-secrets";

export const BUN_SECRETS_SYNTAX = {
	// VALID: ${VAR:-default} or ${VAR}
	validPattern: /^\$\{([A-Z_][A-Z0-9_]*)(?::-(.+))?\}$/,

	// CLASSIFICATION PREFIXES
	public: /^\$\{PUBLIC_[A-Z_]+\}$/,
	private: /^\$\{PRIVATE_[A-Z_]+\}$/,
	secret: /^\$\{SECRET_[A-Z_]+\}$/,
	trusted: /^\$\{TRUSTED_[A-Z_]+\}$/,

	// DANGEROUS (flagged)
	dangerous: /\$\{(PASSWORD|TOKEN|KEY|SECRET|CREDENTIAL)\b/i,
	userInput: /\$\{.*USER_INPUT.*\}/,
	requestData: /\$\{.*REQUEST.*\}/,

	// INVALID (will cause runtime errors)
	missingBrace: /\$\{[^}]+$/,
	nestedVars: /\$\{.*\$\{.*\}.*\}/, // Bun doesn't support nested ${VAR_${SUB}}
	unclosedQuote: /\$\{.*["'][^}]*\}$/,
};

export function validateSecretValue(value: string): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const extracted: SecretVar[] = [];

	// Find all ${...} references
	const matches = [...value.matchAll(/\$\{([^}]+)\}/g)];

	for (const match of matches) {
		const fullMatch = match[0];
		const inner = match[1];

		// Check for dangerous patterns
		if (BUN_SECRETS_SYNTAX.dangerous.test(fullMatch)) {
			warnings.push(`Dangerous variable name in: ${fullMatch}`);
		}

		// Check for user input patterns
		if (BUN_SECRETS_SYNTAX.userInput.test(fullMatch)) {
			errors.push(`User input in secret value: ${fullMatch}`);
		}

		// Parse variable and default
		const [varName, defaultVal] = inner.split(":-");

		if (!varName.match(/^[A-Z_][A-Z0-9_]+$/)) {
			errors.push(`Invalid variable name: ${varName}`);
		}

		if (defaultVal?.includes("${")) {
			errors.push(`Nested variables not supported: ${defaultVal}`);
		}

		extracted.push({
			name: varName,
			hasDefault: !!defaultVal,
			defaultValue: defaultVal,
			classification: classifyVariable(varName),
			isDangerous: BUN_SECRETS_SYNTAX.dangerous.test(varName),
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		variables: extracted,
		riskScore: calculateRiskScore(extracted),
	};
}

function classifyVariable(
	name: string,
): "public" | "private" | "secret" | "trusted" | "dangerous" {
	if (name.startsWith("PUBLIC_")) return "public";
	if (name.startsWith("PRIVATE_")) return "private";
	if (name.startsWith("SECRET_")) return "secret";
	if (name.startsWith("TRUSTED_")) return "trusted";
	if (BUN_SECRETS_SYNTAX.dangerous.test(name)) return "dangerous";
	return "private"; // Default classification
}

function calculateRiskScore(variables: SecretVar[]): number {
	let score = 0;

	for (const variable of variables) {
		switch (variable.classification) {
			case "dangerous":
				score += 100;
				break;
			case "secret":
				score += 50;
				break;
			case "private":
				score += 25;
				break;
			case "trusted":
				score += 10;
				break;
			case "public":
				score += 0;
				break;
		}

		if (!variable.hasDefault) {
			score += 20; // Higher risk without defaults
		}
	}

	return Math.min(score, 100); // Cap at 100
}

export function validateSecretSyntax(value: string): boolean {
	return (
		BUN_SECRETS_SYNTAX.validPattern.test(value) &&
		!BUN_SECRETS_SYNTAX.missingBrace.test(value) &&
		!BUN_SECRETS_SYNTAX.nestedVars.test(value) &&
		!BUN_SECRETS_SYNTAX.unclosedQuote.test(value)
	);
}
