// Global test setup for comprehensive tests
import { beforeAll } from "bun:test";

beforeAll(() => {
    // Set up global test utilities
    global.testUtils = {
        generateMockData: (type: string) => {
            switch (type) {
                case "user":
                    return {
                        id: "test-user-1",
                        name: "Test User",
                        email: "test@example.com"
                    };
                default:
                    return { id: "test-1", type };
            }
        },
        delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
        assertEnvironment: () => {
            if (process.env.NODE_ENV !== "test") {
                throw new Error("Not in test environment");
            }
        }
    };

    global.testStartTime = Date.now();
    global.testEnvironment = "comprehensive-test";

    console.log("✅ Global test utilities initialized");
});
