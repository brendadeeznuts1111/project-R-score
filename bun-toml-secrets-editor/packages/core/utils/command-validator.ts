/**
 * Command Validation and Suggestion Utilities
 * Provides intelligent command validation and suggestions for CLI
 */

export interface CommandSuggestion {
	command: string;
	description: string;
	category: string;
	similarity: number;
}

export interface ValidationError {
	field: string;
	value: string;
	message: string;
	suggestion?: string;
}

export class CommandValidator {
	private static readonly COMMANDS = {
		// Device Management
		"--device": {
			category: "device",
			description: "Specify device ID",
			takesValue: true,
			values: undefined,
		},
		"--list": {
			category: "device",
			description: "List all available devices",
			takesValue: false,
			values: undefined,
		},
		"--status": {
			category: "device",
			description: "Show device status",
			takesValue: false,
			values: undefined,
		},
		"--cloud-status": {
			category: "device",
			description: "Show cloud phone status",
			takesValue: false,
			values: undefined,
		},
		"--details": {
			category: "device",
			description: "Show detailed device information",
			takesValue: false,
			values: undefined,
		},

		// Device Control
		"--reset": {
			category: "control",
			description: "Reset device to factory settings",
			takesValue: false,
			values: undefined,
		},
		"--factory-reset": {
			category: "control",
			description: "Complete factory reset",
			takesValue: false,
			values: undefined,
		},
		"--enable": {
			category: "control",
			description: "Enable ADB on device",
			takesValue: false,
			values: undefined,
		},
		"--power": {
			category: "control",
			description: "Power device on/off",
			takesValue: true,
			values: ["on", "off"],
		},
		"--restart": {
			category: "control",
			description: "Restart device",
			takesValue: false,
			values: undefined,
		},

		// App Management
		"--install": {
			category: "apps",
			description: "Install application",
			takesValue: true,
			values: undefined,
		},
		"--uninstall": {
			category: "apps",
			description: "Uninstall application",
			takesValue: true,
			values: undefined,
		},
		"--apps": {
			category: "apps",
			description: "List installed applications",
			takesValue: false,
			values: undefined,
		},
		"--preinstalled": {
			category: "apps",
			description: "List preinstalled apps",
			takesValue: false,
			values: undefined,
		},
		"--batch-apps": {
			category: "apps",
			description: "Execute batch app operations",
			takesValue: false,
			values: undefined,
		},

		// Advanced Operations
		"--command": {
			category: "advanced",
			description: "Execute ADB command",
			takesValue: true,
			values: undefined,
		},
		"--screenshot": {
			category: "advanced",
			description: "Take device screenshot",
			takesValue: false,
			values: undefined,
		},
		"--upload": {
			category: "advanced",
			description: "Upload file to device",
			takesValue: true,
			values: undefined,
		},
		"--root": {
			category: "advanced",
			description: "Manage root access",
			takesValue: true,
			values: ["enable", "disable", "status"],
		},
		"--qr-scan": {
			category: "advanced",
			description: "Scan QR codes",
			takesValue: false,
			values: undefined,
		},
		"--resolution": {
			category: "advanced",
			description: "Change screen resolution",
			takesValue: true,
			values: undefined,
		},
		"--streaming": {
			category: "advanced",
			description: "Start live streaming",
			takesValue: false,
			values: undefined,
		},
		"--quality": {
			category: "advanced",
			description: "Adjust streaming quality",
			takesValue: true,
			values: ["low", "medium", "high", "ultra", "auto"],
		},
		"--route": {
			category: "advanced",
			description: "Select network route",
			takesValue: true,
			values: ["direct", "optimized", "secure", "balanced"],
		},

		// Configuration
		"--config": {
			category: "config",
			description: "Manage configuration",
			takesValue: true,
			values: ["show", "summary", "validate", "reset"],
		},
		"--patterns": {
			category: "config",
			description: "List configuration patterns",
			takesValue: false,
			values: undefined,
		},
		"--apply-pattern": {
			category: "config",
			description: "Apply configuration pattern",
			takesValue: true,
			values: undefined,
		},
		"--export-config": {
			category: "config",
			description: "Export configuration",
			takesValue: true,
			values: undefined,
		},
		"--import-config": {
			category: "config",
			description: "Import configuration",
			takesValue: true,
			values: undefined,
		},
		"--validate-config": {
			category: "config",
			description: "Validate configuration",
			takesValue: false,
			values: undefined,
		},
		"--reset-config": {
			category: "config",
			description: "Reset configuration",
			takesValue: false,
			values: undefined,
		},

		// Monitoring & Analytics
		"--monitor": {
			category: "monitoring",
			description: "Start device monitoring",
			takesValue: false,
			values: undefined,
		},
		"--analytics": {
			category: "monitoring",
			description: "Show analytics dashboard",
			takesValue: false,
			values: undefined,
		},
		"--scheduler": {
			category: "monitoring",
			description: "Show task scheduler",
			takesValue: false,
			values: undefined,
		},
		"--integrations": {
			category: "monitoring",
			description: "Show integration status",
			takesValue: false,
			values: undefined,
		},
		"--notify": {
			category: "monitoring",
			description: "Send notification",
			takesValue: true,
			values: undefined,
		},
		"--automation": {
			category: "monitoring",
			description: "Start automation",
			takesValue: false,
			values: undefined,
		},
		"--batch": {
			category: "monitoring",
			description: "Execute batch operations",
			takesValue: true,
			values: undefined,
		},

		// Team Management
		"--teams": {
			category: "team",
			description: "List teams",
			takesValue: false,
			values: undefined,
		},
		"--members": {
			category: "team",
			description: "List team members",
			takesValue: false,
			values: undefined,
		},
		"--invite": {
			category: "team",
			description: "Invite team member",
			takesValue: true,
			values: undefined,
		},
		"--groups": {
			category: "team",
			description: "List team groups",
			takesValue: false,
			values: undefined,
		},
		"--share": {
			category: "team",
			description: "Share resource",
			takesValue: true,
			values: undefined,
		},

		// Help & Utility
		"--help": {
			category: "utility",
			description: "Show help",
			takesValue: false,
			values: undefined,
		},
		"--search": {
			category: "utility",
			description: "Search commands",
			takesValue: true,
			values: undefined,
		},
		"--verbose": {
			category: "utility",
			description: "Enable verbose output",
			takesValue: false,
			values: undefined,
		},
	};

	/**
	 * Validate command line arguments
	 */
	static validate(args: string[]): ValidationError[] {
		const errors: ValidationError[] = [];
		const processedArgs = new Set<string>();

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];

			// Skip if not a flag
			if (!arg.startsWith("-")) {
				continue;
			}

			// Check if command exists
			const command =
				CommandValidator.COMMANDS[arg as keyof typeof this.COMMANDS];
			if (!command) {
				const suggestions = CommandValidator.findSimilarCommands(arg);
				errors.push({
					field: "command",
					value: arg,
					message: `Unknown command: ${arg}`,
					suggestion:
						suggestions.length > 0
							? `Did you mean: ${suggestions[0].command}?`
							: undefined,
				});
				continue;
			}

			// Check for duplicate commands
			if (processedArgs.has(arg)) {
				errors.push({
					field: "duplicate",
					value: arg,
					message: `Duplicate command: ${arg}`,
					suggestion: "Remove duplicate flags",
				});
			}
			processedArgs.add(arg);

			// Check if command requires a value
			if (command.takesValue) {
				if (i + 1 >= args.length || args[i + 1].startsWith("-")) {
					errors.push({
						field: "missing_value",
						value: arg,
						message: `Command ${arg} requires a value`,
						suggestion: `Usage: ${arg} <value>`,
					});
				} else {
					// Validate the value if constraints exist
					const value = args[i + 1];
					if (command.values && !command.values.includes(value)) {
						errors.push({
							field: "invalid_value",
							value: value,
							message: `Invalid value for ${arg}: ${value}`,
							suggestion: `Valid values: ${command.values.join(", ")}`,
						});
					}
					i++; // Skip the value in next iteration
				}
			}
		}

		return errors;
	}

	/**
	 * Find similar commands using Levenshtein distance
	 */
	static findSimilarCommands(
		input: string,
		maxResults: number = 3,
	): CommandSuggestion[] {
		const suggestions: CommandSuggestion[] = [];

		for (const [command, info] of Object.entries(CommandValidator.COMMANDS)) {
			const similarity = CommandValidator.calculateSimilarity(input, command);
			if (similarity > 0.3) {
				// Threshold for similarity
				suggestions.push({
					command,
					description: info.description,
					category: info.category,
					similarity,
				});
			}
		}

		return suggestions
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, maxResults);
	}

	/**
	 * Get commands by category
	 */
	static getCommandsByCategory(category: string): CommandSuggestion[] {
		const commands: CommandSuggestion[] = [];

		for (const [command, info] of Object.entries(CommandValidator.COMMANDS)) {
			if (info.category === category) {
				commands.push({
					command,
					description: info.description,
					category: info.category,
					similarity: 1.0,
				});
			}
		}

		return commands;
	}

	/**
	 * Get all available commands
	 */
	static getAllCommands(): CommandSuggestion[] {
		const commands: CommandSuggestion[] = [];

		for (const [command, info] of Object.entries(CommandValidator.COMMANDS)) {
			commands.push({
				command,
				description: info.description,
				category: info.category,
				similarity: 1.0,
			});
		}

		return commands;
	}

	/**
	 * Calculate similarity between two strings using Levenshtein distance
	 */
	private static calculateSimilarity(str1: string, str2: string): number {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;

		if (longer.length === 0) return 1.0;

		const distance = CommandValidator.levenshteinDistance(longer, shorter);
		return (longer.length - distance) / longer.length;
	}

	/**
	 * Calculate Levenshtein distance between two strings
	 */
	private static levenshteinDistance(str1: string, str2: string): number {
		const matrix = [];

		for (let i = 0; i <= str2.length; i++) {
			matrix[i] = [i];
		}

		for (let j = 0; j <= str1.length; j++) {
			matrix[0][j] = j;
		}

		for (let i = 1; i <= str2.length; i++) {
			for (let j = 1; j <= str1.length; j++) {
				if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1,
						matrix[i][j - 1] + 1,
						matrix[i - 1][j] + 1,
					);
				}
			}
		}

		return matrix[str2.length][str1.length];
	}

	/**
	 * Suggest commands based on context
	 */
	static suggestCommands(
		context:
			| "device"
			| "app"
			| "team"
			| "config"
			| "monitoring"
			| "all" = "all",
	): CommandSuggestion[] {
		if (context === "all") {
			return CommandValidator.getAllCommands();
		}

		return CommandValidator.getCommandsByCategory(context);
	}

	/**
	 * Validate specific command value
	 */
	static validateCommandValue(
		command: string,
		value: string,
	): ValidationError | null {
		const cmdInfo =
			CommandValidator.COMMANDS[command as keyof typeof this.COMMANDS];
		if (!cmdInfo) {
			return {
				field: "command",
				value: command,
				message: `Unknown command: ${command}`,
			};
		}

		if (cmdInfo.values && !cmdInfo.values.includes(value)) {
			return {
				field: "value",
				value: value,
				message: `Invalid value for ${command}: ${value}`,
				suggestion: `Valid values: ${cmdInfo.values.join(", ")}`,
			};
		}

		return null;
	}

	/**
	 * Get command usage information
	 */
	static getCommandUsage(command: string): string | null {
		const cmdInfo =
			CommandValidator.COMMANDS[command as keyof typeof this.COMMANDS];
		if (!cmdInfo) return null;

		let usage = command;
		if (cmdInfo.takesValue) {
			usage += " <value>";
			if (cmdInfo.values) {
				usage += ` (${cmdInfo.values.join("|")})`;
			}
		}

		return usage;
	}
}

/**
 * Utility class for command auto-completion
 */
export class CommandAutoComplete {
	/**
	 * Get auto-completion suggestions for partial input
	 */
	static getSuggestions(partialInput: string): CommandSuggestion[] {
		const suggestions: CommandSuggestion[] = [];

		for (const [command, info] of Object.entries(CommandValidator.COMMANDS)) {
			if (command.startsWith(partialInput)) {
				suggestions.push({
					command,
					description: info.description,
					category: info.category,
					similarity: 1.0,
				});
			}
		}

		return suggestions.sort((a, b) => a.command.length - b.command.length);
	}

	/**
	 * Get value suggestions for a command
	 */
	static getValueSuggestions(command: string): string[] {
		const cmdInfo =
			CommandValidator.COMMANDS[
				command as keyof (typeof CommandValidator)["COMMANDS"]
			];
		if (!cmdInfo || !cmdInfo.values) return [];

		return cmdInfo.values;
	}
}
