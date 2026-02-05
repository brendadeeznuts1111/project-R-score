# 🏗️ Core Domain

## 📋 Overview

The **Core Domain** contains fundamental business capabilities and shared domain
logic that serve as the foundation for all other domains in Fantasy42-Fire22.
This domain implements the most essential business concepts and provides the
architectural foundation for the entire system.

## 🎯 Responsibilities

- **Business Rules Validation** - Core business logic validation
- **Domain Event Management** - System-wide event handling
- **Aggregate Root Coordination** - Consistency boundary management
- **Shared Domain Services** - Cross-domain business logic
- **Fundamental Entities** - Base business entities and concepts

## 🔧 Key Components

### **Aggregate Roots**

```typescript
// Base aggregate root for all domains
export abstract class AggregateRoot {
  protected domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public clearDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
```

### **Domain Events**

```typescript
// Base domain event class
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number;

  constructor(aggregateId: string) {
    this.eventId = crypto.randomUUID();
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventVersion = 1;
  }
}
```

### **Value Objects**

```typescript
// Immutable value object base
export abstract class ValueObject {
  public abstract equals(other: ValueObject): boolean;

  protected shallowEquals(other: ValueObject): boolean {
    const keys = Object.keys(this);
    const otherKeys = Object.keys(other);

    if (keys.length !== otherKeys.length) return false;

    return keys.every(key => (this as any)[key] === (other as any)[key]);
  }
}
```

### **Domain Services**

```typescript
// Business logic that doesn't belong to entities
export interface DomainService {
  execute(): Promise<Result<void, DomainError>>;
}

// Example: Business rule validation service
export class BusinessRuleValidator implements DomainService {
  async execute(): Promise<Result<void, DomainError>> {
    // Core business rule validation logic
  }
}
```

## 📊 Core Business Concepts

### **1. Business Rules**

- **Fantasy Sports Rules** - Core fantasy sports logic
- **Betting Validation** - Betting business rule enforcement
- **Payment Rules** - Payment processing validation
- **User Eligibility** - User participation rules

### **2. Domain Primitives**

- **Money** - Currency and amount handling
- **DateTime** - Business date/time management
- **Identifiers** - Domain-specific ID generation
- **Validation** - Business rule validation

### **3. Cross-Domain Events**

- **UserRegistered** - New user registration
- **PaymentProcessed** - Payment completion
- **BetPlaced** - Betting transaction
- **TournamentStarted** - Gaming event initiation

## 🔗 Dependencies

### **Inbound Dependencies** (Domains that depend on Core)

- **Users Domain** - Uses core user concepts
- **Betting Domain** - Uses core betting primitives
- **Finance Domain** - Uses core financial concepts
- **Payments Domain** - Uses core payment primitives

### **Outbound Dependencies** (Core dependencies)

- **None** - Core domain has no dependencies (foundation layer)

## 📋 Development Guidelines

### **1. Core Domain Rules**

- **No External Dependencies** - Core cannot depend on other domains
- **Business Logic Only** - Pure business logic, no infrastructure
- **Immutability** - Value objects must be immutable
- **Validation** - All business rules validated in core

### **2. Entity Design**

```typescript
export class CoreEntity extends AggregateRoot {
  protected validateBusinessRules(): void {
    // Core business rule validation
    if (!this.isValidState()) {
      throw new BusinessRuleViolationError('Invalid entity state');
    }
  }

  protected applyDomainEvent(event: DomainEvent): void {
    this.addDomainEvent(event);
    this.mutateState(event);
  }

  private mutateState(event: DomainEvent): void {
    // Apply event to mutate entity state
    // This maintains consistency within aggregate boundary
  }
}
```

### **3. Repository Interfaces**

```typescript
// Repository interfaces defined in domain layer
export interface CoreRepository {
  save(entity: AggregateRoot): Promise<void>;
  findById(id: string): Promise<AggregateRoot | null>;
  exists(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

// Implementation provided by infrastructure layer
export class CoreRepositoryImpl implements CoreRepository {
  // Infrastructure-specific implementation
}
```

## 🧪 Testing Strategy

### **Unit Tests**

```typescript
describe('Core Domain', () => {
  describe('Business Rules', () => {
    it('should validate fantasy sports rules', () => {
      // Test core business rule validation
    });

    it('should enforce betting limits', () => {
      // Test betting validation rules
    });
  });

  describe('Domain Events', () => {
    it('should publish events on state changes', () => {
      // Test domain event publishing
    });

    it('should maintain event ordering', () => {
      // Test event ordering and consistency
    });
  });
});
```

### **Integration Tests**

```typescript
describe('Core Integration', () => {
  it('should persist aggregate state changes', () => {
    // Test aggregate persistence through repository
  });

  it('should publish domain events', () => {
    // Test event publishing through event bus
  });
});
```

## 📈 Performance Considerations

### **Optimization Strategies**

- **Aggregate Design** - Minimize aggregate size for performance
- **Event Sourcing** - Consider for complex business logic
- **Caching** - Cache frequently accessed domain objects
- **Lazy Loading** - Load related objects on demand

### **Monitoring**

- **Business Metrics** - Track core business operation success rates
- **Performance Metrics** - Monitor domain operation response times
- **Error Tracking** - Track business rule violations and errors
- **Event Processing** - Monitor domain event processing rates

## 🔐 Security Considerations

### **Business Logic Security**

- **Input Validation** - All domain inputs validated
- **Business Rule Enforcement** - Security rules enforced at domain level
- **Audit Trail** - All business operations audited
- **Access Control** - Domain-level authorization checks

### **Data Protection**

- **Encryption** - Sensitive business data encrypted
- **PII Handling** - Personal data properly handled
- **Compliance** - Business compliance rules enforced
- **Retention** - Data retention policies implemented

## 📚 Code Examples

### **Creating a New Aggregate**

```typescript
export class FantasyTeam extends AggregateRoot {
  constructor(
    public readonly id: string,
    public name: string,
    public ownerId: string,
    private players: Player[] = []
  ) {
    super();
  }

  public addPlayer(player: Player): Result<void, DomainError> {
    // Validate business rules
    if (this.players.length >= 15) {
      return Result.failure(
        new BusinessRuleError('Team cannot have more than 15 players')
      );
    }

    if (this.hasPlayer(player.id)) {
      return Result.failure(new BusinessRuleError('Player already in team'));
    }

    // Apply domain event
    const event = new PlayerAddedToTeam(this.id, player.id);
    this.addDomainEvent(event);

    // Mutate state
    this.players.push(player);

    return Result.success(void 0);
  }

  private hasPlayer(playerId: string): boolean {
    return this.players.some(p => p.id === playerId);
  }
}
```

### **Domain Event Handling**

```typescript
export class PlayerAddedToTeam extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly playerId: string
  ) {
    super(aggregateId);
    this.eventType = 'PlayerAddedToTeam';
  }
}

// Event handler
export class PlayerAddedToTeamHandler
  implements EventHandler<PlayerAddedToTeam>
{
  constructor(
    private readonly fantasyTeamRepo: FantasyTeamRepository,
    private readonly notificationService: NotificationService
  ) {}

  async handle(event: PlayerAddedToTeam): Promise<void> {
    // Update read model
    await this.fantasyTeamRepo.updatePlayerCount(event.aggregateId);

    // Send notification
    await this.notificationService.sendPlayerAddedNotification(
      event.aggregateId,
      event.playerId
    );
  }
}
```

## 🎯 CODEOWNERS

- **@fire22/core-team** - Core domain experts
- **@fire22/architects** - System architects
- **@fire22/enterprise-admins** - Executive oversight

## 📋 Related Domains

- **Users** - Uses core user concepts
- **Betting** - Uses core betting primitives
- **Finance** - Uses core financial concepts
- **Security** - Uses core security primitives

---

**🔥 Ready to build on the core foundation? The Core Domain provides the solid
foundation for all Fantasy42-Fire22 business capabilities!**

**Questions?** Contact the Core Domain CODEOWNERS! 🚀
