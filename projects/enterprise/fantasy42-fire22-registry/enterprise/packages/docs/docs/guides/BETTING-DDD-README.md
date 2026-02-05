# Betting Platform - Domain-Driven Design Implementation

A comprehensive Domain-Driven Design (DDD) implementation for a betting platform
using Bun runtime and SQLite database.

## 🏗️ Architecture Overview

This implementation follows DDD principles with clear separation of concerns:

```
src/
├── domains/                    # Domain layer
│   ├── betting/               # Betting domain
│   │   ├── entities/          # Domain entities (Bet)
│   │   ├── value-objects/     # Value objects (OddsValue)
│   │   ├── repositories/      # Repository interfaces
│   │   ├── services/          # Domain services
│   │   └── events/            # Domain events
│   └── accounting/            # Accounting domain
│       ├── entities/          # Domain entities (LedgerEntry)
│       ├── repositories/      # Repository interfaces
│       └── services/          # Domain services
├── application/               # Application layer
│   └── use-cases/            # Use cases (PlaceBet, SettleBet)
├── interfaces/               # Interface adapters
│   └── http/                 # HTTP controllers
└── shared/                   # Shared infrastructure
    ├── infrastructure/       # Infrastructure services
    └── domain-entity.ts      # Base domain classes
```

## 🎯 Key Domain Concepts

### Betting Domain

#### Bet Entity

- Represents a customer's wager with immutable core properties
- Handles business logic for bet lifecycle (place, settle, cancel, void)
- Publishes domain events for important state changes
- Validates business rules (stake limits, settlement constraints)

#### OddsValue Value Object

- Immutable value object representing betting odds
- Provides utility methods for odds calculations
- Supports multiple odds formats (decimal, fractional, American)
- Calculates implied probabilities and potential winnings

### Accounting Domain

#### LedgerEntry Entity

- Double-entry accounting system for financial transactions
- Tracks all monetary movements with full audit trail
- Supports transaction reversal and posting workflows
- Links financial transactions to business events (bets)

## 🔧 Core Features

### Domain Services

#### BettingService

- **Place Bet**: Validates customer balance, creates bet and ledger entries
- **Settle Bet**: Handles win/loss settlement with proper accounting
- **Cancel Bet**: Processes bet cancellation with stake refund
- **Void Bet**: Handles technical issues with stake refund

### Application Use Cases

#### PlaceBetUseCase

- Validates input parameters
- Orchestrates bet placement through domain services
- Returns application-specific result format

#### SettleBetUseCase

- Validates settlement requests
- Ensures business rules compliance
- Returns detailed settlement results

### Infrastructure

#### Repository Pattern

- Abstract repository interfaces for domain independence
- Concrete SQLite implementations using Bun.SQL
- Support for complex queries and aggregations

#### Event-Driven Architecture

- Domain events for loose coupling between domains
- Event publishing and subscription system
- Audit trail and business process tracking

## 🚀 Getting Started

### Prerequisites

- Bun runtime installed
- Basic understanding of DDD principles

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd betting-platform-ddd

# Install dependencies
bun install
```

### Running the Demo

```bash
# Run the comprehensive demo
bun run scripts/betting-ddd-demo.ts
```

### Running Tests

```bash
# Run the test suite
bun test tests/betting-domain.test.ts
```

## 📋 Usage Examples

### Placing a Bet

```typescript
import { container } from './src/shared/infrastructure/container';
import { OddsValue } from './src/domains/betting/value-objects/OddsValue';

// Initialize the system
await container.initialize();

// Get the betting service
const bettingService = container.getBettingService();

// Create odds
const odds = OddsValue.create(2.5, 'Home Win', 'premier-league-001');

// Place a bet
const bet = await bettingService.placeBet('customer-123', 100, odds);

console.log(`Bet placed: ${bet.getId()}`);
console.log(`Potential win: $${bet.getPotentialWin()}`);
```

### Settling a Bet

```typescript
// Settle the bet as a win
await bettingService.settleBet(
  bet.getId(),
  BetOutcome.WON,
  'Home team won 2-1'
);

// Check the result
const settledBet = await bettingService.getBet(bet.getId());
console.log(`Bet status: ${settledBet?.getStatus()}`);
console.log(`Actual win: $${settledBet?.getActualWin()}`);
```

### Using HTTP API

```typescript
import { container } from './src/shared/infrastructure/container';
import { BetController } from './src/interfaces/http/controllers/BetController';

await container.initialize();

const betController = container.getBetController();

// Example HTTP request handling
const placeBetRequest = new Request('http://localhost/api/bets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer-123',
    stake: 100,
    oddsPrice: 2.5,
    selection: 'Home Win',
    marketId: 'premier-league-001',
  }),
});

const response = await betController.placeBet(placeBetRequest);
const result = await response.json();
console.log('Bet placed:', result.data);
```

## 🧪 Testing

The implementation includes comprehensive tests covering:

- **Entity Tests**: Bet lifecycle, business rules, validation
- **Value Object Tests**: Odds calculations, equality, formatting
- **Service Tests**: Business logic, error handling, integration
- **Use Case Tests**: Input validation, orchestration, results

### Running Specific Tests

```bash
# Run entity tests
bun test tests/betting-domain.test.ts -t "Bet Entity"

# Run service tests
bun test tests/betting-domain.test.ts -t "BettingService"

# Run all tests
bun test tests/betting-domain.test.ts
```

## 🎨 Design Patterns Used

### Domain-Driven Design Patterns

- **Entity**: Bet, LedgerEntry with identity and lifecycle
- **Value Object**: OddsValue with immutability
- **Repository**: Abstract data access interfaces
- **Domain Service**: BettingService for complex business logic
- **Domain Events**: Event publishing for loose coupling

### Clean Architecture Patterns

- **Use Cases**: Application-specific business logic
- **Interface Adapters**: HTTP controllers for external interfaces
- **Dependency Injection**: Container for managing dependencies

### Infrastructure Patterns

- **Repository Pattern**: Data access abstraction
- **Unit of Work**: Transaction management across repositories
- **Event Sourcing**: Domain event tracking

## 🔒 Business Rules Implemented

### Betting Rules

- Stake limits (minimum $1, maximum $10,000)
- Odds validation (minimum 1.01, maximum 100.0)
- Customer balance verification before bet placement
- Bet settlement constraints (cannot settle already settled bets)
- Automatic stake refund for cancelled/voided bets

### Accounting Rules

- Double-entry bookkeeping for all transactions
- Transaction posting and reversal workflows
- Balance tracking with before/after amounts
- Audit trail for all financial operations

## 📊 Database Schema

### Bets Table

```sql
CREATE TABLE bets (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  stake REAL NOT NULL,
  potential_win REAL NOT NULL,
  odds_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  outcome TEXT,
  actual_win REAL,
  market_result TEXT,
  placed_at TEXT NOT NULL,
  settled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### Ledger Entries Table

```sql
CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  entry_type TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  customer_id TEXT,
  bet_id TEXT,
  description TEXT,
  reference TEXT,
  balance_before REAL,
  balance_after REAL,
  effective_date TEXT NOT NULL,
  posted_at TEXT,
  reversed_at TEXT,
  reversal_entry_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

## 🎯 Key Benefits

1. **Separation of Concerns**: Clear boundaries between domains
2. **Testability**: Domain logic isolated from infrastructure
3. **Maintainability**: Changes localized to specific domains
4. **Business Focus**: Code organized around business concepts
5. **Flexibility**: Easy to swap implementations (databases, APIs)
6. **Event-Driven**: Loose coupling through domain events
7. **Type Safety**: Full TypeScript implementation
8. **Performance**: Optimized queries and indexing

## 🚀 Future Enhancements

- **CQRS Pattern**: Separate read/write models for better performance
- **Event Sourcing**: Complete audit trail with event replay
- **Saga Pattern**: Distributed transaction management
- **API Gateway**: Centralized API management
- **Message Queue**: Asynchronous event processing
- **Caching Layer**: Redis integration for performance
- **Multi-tenancy**: Support for multiple betting operators

## 📚 Learning Resources

- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Bun Runtime Documentation](https://bun.sh/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## 🤝 Contributing

1. Follow the established DDD patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all business rules are validated
5. Maintain separation of concerns

---

This implementation demonstrates a production-ready DDD architecture that scales
with business complexity while maintaining code quality and testability.
