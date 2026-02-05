# 🔄 @fire22/telegram-workflows

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Departments](https://img.shields.io/badge/departments-6-green.svg)](src/departments)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.2.20-f472b6.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Advanced workflow orchestration system for Fire22 Telegram bot with
department-specific flows and permission management.

## 📦 Installation

```bash
bun add @fire22/telegram-workflows
```

## 🚀 Features

- **6 Department Workflows**: Customer Service, Finance, Operations, Compliance,
  Management, Technical
- **Permission System**: Role-based access control with 23 access levels
- **Command Routing**: Intelligent command routing based on department and
  permissions
- **Workflow States**: Complete state management for multi-step workflows
- **Integration Ready**: Seamless integration with Telegram bot and queue system
- **Multilingual**: Full integration with @fire22/multilingual

## 📖 Quick Start

```typescript
import { TelegramWorkflowOrchestrator } from '@fire22/telegram-workflows';

// Initialize orchestrator
const orchestrator = new TelegramWorkflowOrchestrator(env);

// Start the orchestrator
await orchestrator.start();

// Get active workflows
const activeCount = orchestrator.getActiveWorkflows();
console.log(`Active workflows: ${activeCount}`);

// Get department list
const departments = orchestrator.getDepartmentWorkflows();
console.log(`Departments: ${departments.join(', ')}`);
```

## 🏢 Departments & Access Levels

### Customer Service Department

```typescript
CS_AGENT; // Basic support, ticket viewing
CS_SENIOR; // Ticket escalation, priority handling
CS_MANAGER; // Full department management
```

### Finance Department

```typescript
CASHIER; // Transaction limit: $5,000
SENIOR_CASHIER; // Transaction limit: $25,000
CASHIER_MANAGER; // Transaction limit: $100,000
FINANCE_DIRECTOR; // Unlimited transactions
```

### Operations Department

```typescript
OPS_ANALYST; // Queue viewing, statistics
OPS_SPECIALIST; // Queue management
QUEUE_MANAGER; // Full queue control, $100,000 limit
OPS_DIRECTOR; // Operations oversight
```

### Compliance Department

```typescript
KYC_SPECIALIST; // Document verification
COMPLIANCE_ANALYST; // Risk assessment
SENIOR_COMPLIANCE; // Investigation tools
CCO; // Chief Compliance Officer
```

### Management Department

```typescript
MANAGER; // Department management
DIRECTOR; // Multi-department access
VP; // Vice President level
C_SUITE; // C-level executive access
```

### Technical Department

```typescript
DEVELOPER; // System access
DEVOPS_ENGINEER; // Infrastructure control
SENIOR_DEVOPS; // Advanced system control
CTO; // Chief Technology Officer
```

## 🔄 Workflow Examples

### Customer Service Workflow

```typescript
/start → CS Welcome → Active Tickets → Ticket Management → Resolution
                    ↓
                    New Ticket → Type Selection → Priority → Assignment
                    ↓
                    Stats → Performance Metrics
                    ↓
                    Escalate → Senior → Manager → Director
```

### Finance Workflow

```typescript
/start → Finance Welcome → Pending Approvals → Review → Approve/Reject
                        ↓
                        Balances → Account Overview → Transactions
                        ↓
                        Daily Summary → Reports → Export
                        ↓
                        Risk Review → Flagged Transactions
```

### Operations Workflow

```typescript
/start → Ops Welcome → Queue Status → Processing → Matching → Complete
                    ↓
                    Performance → Metrics → Optimization
                    ↓
                    Alerts → System Issues → Resolution
```

## 🔧 Configuration

### Workflow Configuration

```typescript
const workflowConfig = {
  // Session management
  sessionTimeout: 1800000, // 30 minutes
  maxConcurrentWorkflows: 100,

  // Command routing
  commandTimeout: 5000, // 5 seconds
  maxRetries: 3,

  // Department settings
  departmentRouting: true,
  crossDepartmentAccess: false,

  // Escalation
  escalationTimeout: 300000, // 5 minutes
  autoEscalate: true,
};
```

### Permission Configuration

```typescript
const permissions = {
  [ACCESS_LEVELS.CS_AGENT]: {
    commands: ['/support', '/help'],
    canEscalate: false,
    canClose: false,
    transactionLimit: 0,
  },
  [ACCESS_LEVELS.CASHIER]: {
    commands: ['/balance', '/deposit', '/withdraw'],
    canEscalate: true,
    canClose: false,
    transactionLimit: 5000,
  },
  [ACCESS_LEVELS.QUEUE_MANAGER]: {
    commands: ['/queue', '/process', '/stats'],
    canEscalate: true,
    canClose: true,
    transactionLimit: 100000,
  },
};
```

## 🎯 Workflow States

### Registration Flow

```typescript
REGISTRATION_STARTED; // Initial state
EMAIL_PENDING; // Awaiting email verification
PHONE_PENDING; // Awaiting phone verification
KYC_PENDING; // KYC documents required
REGISTRATION_COMPLETED; // Successfully registered
REGISTRATION_FAILED; // Registration failed
```

### Transaction Flow

```typescript
TRANSACTION_INITIATED; // Transaction started
TRANSACTION_PENDING; // Awaiting approval
TRANSACTION_PROCESSING; // Being processed
TRANSACTION_COMPLETED; // Successfully completed
TRANSACTION_FAILED; // Transaction failed
TRANSACTION_CANCELLED; // User cancelled
```

### Support Ticket Flow

```typescript
SUPPORT_CREATED; // Ticket created
SUPPORT_ASSIGNED; // Assigned to agent
SUPPORT_IN_PROGRESS; // Being handled
SUPPORT_ESCALATED; // Escalated to senior
SUPPORT_RESOLVED; // Issue resolved
SUPPORT_CLOSED; // Ticket closed
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Test departments
bun test:departments

# Test permissions
bun test:permissions

# Test workflows
bun test:workflows

# Run benchmarks
bun run benchmark

# Interactive demo
bun run demo
```

## 📈 Performance

- **Command Routing**: < 10ms average
- **Workflow Initialization**: < 50ms
- **Permission Check**: < 1ms
- **State Transition**: < 5ms
- **Concurrent Workflows**: 1000+ supported

## 📄 API Reference

### Main Classes

#### `TelegramWorkflowOrchestrator`

Main orchestrator managing all workflows and departments.

### Methods

#### `start()`

Start the workflow orchestrator.

#### `stop()`

Stop the orchestrator and cleanup.

#### `initializeWorkflow(ctx)`

Initialize a new workflow for a user.

#### `getWorkflowContext(userId)`

Get current workflow context for a user.

#### `hasPermission(workflow, permission)`

Check if user has specific permission.

#### `executeDepartmentWorkflow(ctx, workflow, department)`

Execute department-specific workflow.

## 🔗 Dependencies

- `grammy` - Telegram bot framework
- `zod` - Schema validation
- `@fire22/telegram-bot` - Bot integration
- `@fire22/queue-system` - Queue management
- `@fire22/multilingual` - Language support

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📝 License

MIT © Fire22 Team

## 🔗 Related Packages

- [@fire22/telegram-bot](../fire22-telegram-bot) - Core bot functionality
- [@fire22/queue-system](../fire22-queue-system) - P2P queue integration
- [@fire22/multilingual](../fire22-multilingual) - Multilingual support
- [@fire22/telegram-dashboard](../fire22-telegram-dashboard) - Dashboard
  integration

## 📞 Support

For workflow issues or department configuration, please open an issue on GitHub.
