// Testing Infrastructure Entry Point
// Exports all testing utilities, factories, and contracts

// Data factories for consistent test data generation
export * from './factories/index';

// Contract testing utilities
export * from './contracts/index';

// Test helpers and utilities
export * from './utils/test-helpers';

// Type definitions
export * from './types/index';

// Re-export commonly used items for convenience
export {
    OddsTickFactory,
    ArbitrageOpportunityFactory,
    WebSocketMessageFactory,
    MarketDataFactory,
    PerformanceDataFactory,
    NetworkDataFactory,
    ContractTestFactory,
    TestScenarioFactory
} from './factories/index';

export {
    WebSocketContractUtils,
    APIContractUtils,
    ContractTestConfig,
    ContractTestUtils
} from './contracts/index';

export {
    DomainAssertions,
    MockWebSocket,
    MockAPIClient,
    PerformanceHelper,
    MemoryHelper,
    TestScenarioHelper,
    ValidationHelper,
    AsyncHelper
} from './utils/test-helpers';

// Default export with most commonly used utilities
export default {
    // Factories
    Factories: {
        OddsTick: OddsTickFactory,
        ArbitrageOpportunity: ArbitrageOpportunityFactory,
        WebSocketMessage: WebSocketMessageFactory,
        MarketData: MarketDataFactory,
        Performance: PerformanceDataFactory,
        Network: NetworkDataFactory,
        Contract: ContractTestFactory,
        Scenario: TestScenarioFactory
    },

    // Contract testing
    Contracts: {
        WebSocket: WebSocketContractUtils,
        API: APIContractUtils,
        Config: ContractTestConfig,
        Utils: ContractTestUtils
    },

    // Helpers
    Helpers: {
        Assertions: DomainAssertions,
        MockWebSocket,
        MockAPIClient,
        Performance: PerformanceHelper,
        Memory: MemoryHelper,
        Scenario: TestScenarioHelper,
        Validation: ValidationHelper,
        Async: AsyncHelper
    }
};
