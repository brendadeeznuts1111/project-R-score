// __tests__/mocks/bun-secrets-mock.ts
// Mock implementation of Bun.secrets API for testing

export interface MockSecretsStore {
	[service: string]: {
		[name: string]: string;
	};
}

class BunSecretsMock {
	private store: MockSecretsStore = {};

	async get(options: {
		service: string;
		name: string;
	}): Promise<string | null> {
		return this.store[options.service]?.[options.name] || null;
	}

	async set(options: {
		service: string;
		name: string;
		value: string;
	}): Promise<void> {
		if (!this.store[options.service]) {
			this.store[options.service] = {};
		}
		this.store[options.service][options.name] = options.value;
	}

	async delete(options: { service: string; name: string }): Promise<boolean> {
		if (this.store[options.service]?.[options.name]) {
			delete this.store[options.service][options.name];
			return true;
		}
		return false;
	}

	// Test helpers
	clear(): void {
		this.store = {};
	}

	getAll(): MockSecretsStore {
		return JSON.parse(JSON.stringify(this.store)); // Deep copy
	}

	// Simulate keychain failure
	simulateFailure(): void {
		const originalGet = this.get.bind(this);
		const originalSet = this.set.bind(this);
		const originalDelete = this.delete.bind(this);

		this.get = async () => {
			throw new Error("Keychain unavailable");
		};
		this.set = async () => {
			throw new Error("Keychain access denied");
		};
		this.delete = async () => {
			throw new Error("Keychain unavailable");
		};

		// Restore after a delay (for testing recovery)
		setTimeout(() => {
			this.get = originalGet;
			this.set = originalSet;
			this.delete = originalDelete;
		}, 1000);
	}
}

// Export singleton instance
export const mockSecrets = new BunSecretsMock();

// Mock Bun.secrets globally for tests
(globalThis as any).Bun = {
	...(globalThis as any).Bun,
	secrets: mockSecrets,
};
