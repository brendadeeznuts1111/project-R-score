# Fire22 Dashboard Data Schemas

## Overview

Complete documentation of all data structures, schemas, and data models used in
the Fire22 Dashboard system.

## Table of Contents

- [KPI Data Schema](#kpi-data-schema)
- [Weekly Data Schema](#weekly-data-schema)
- [Pending Data Schema](#pending-data-schema)
- [Activity Data Schema](#activity-data-schema)
- [User Data Schema](#user-data-schema)
- [Agent Data Schema](#agent-data-schema)
- [Wager Data Schema](#wager-data-schema)
- [Transaction Data Schema](#transaction-data-schema)
- [WebSocket Data Schema](#websocket-data-schema)

---

## KPI Data Schema

### Structure

```typescript
interface KPIData {
  revenue: number; // Total revenue generated
  activePlayers: number; // Number of active players
  pending: number; // Number of pending wagers
  totalLiability: number; // Total liability exposure
}
```

### Field Descriptions

| Field          | Type   | Description                     | Example  | Required |
| -------------- | ------ | ------------------------------- | -------- | -------- |
| revenue        | number | Total revenue in currency units | 12500.50 | ✅       |
| activePlayers  | number | Count of active players         | 45       | ✅       |
| pending        | number | Count of pending wagers         | 12       | ✅       |
| totalLiability | number | Total liability exposure        | 8750.25  | ✅       |

### Data Sources

- **revenue**: Calculated from completed wagers
- **activePlayers**: User activity tracking system
- **pending**: Pending wager database queries
- **totalLiability**: Risk calculation engine

---

## Weekly Data Schema

### Structure

```typescript
interface WeeklyData {
  totalHandle: number; // Total handle volume
  totalWin: number; // Total winnings
  totalVolume: number; // Total volume processed
  totalBets: number; // Total number of bets
}
```

### Field Descriptions

| Field       | Type   | Description            | Example  | Required |
| ----------- | ------ | ---------------------- | -------- | -------- |
| totalHandle | number | Total handle volume    | 50000.00 | ✅       |
| totalWin    | number | Total winnings         | 12500.00 | ✅       |
| totalVolume | number | Total volume processed | 75000.00 | ✅       |
| totalBets   | number | Total number of bets   | 150      | ✅       |

### Data Sources

- **totalHandle**: Weekly aggregation from wager database
- **totalWin**: Weekly profit/loss calculations
- **totalVolume**: Transaction volume aggregations
- **totalBets**: Bet count aggregations

---

## Pending Data Schema

### Structure

```typescript
interface PendingData {
  totalPending: number; // Total pending items count
  pendingItems: PendingItem[]; // Array of pending items
}

interface PendingItem {
  id: string; // Wager number/ID
  customerName: string; // Customer name or ID
  amount: number; // Wager amount
  teams: string; // Team description
  time: string; // Creation time
  odds: string; // Current odds
}
```

### Field Descriptions

| Field        | Type   | Description             | Example              | Required |
| ------------ | ------ | ----------------------- | -------------------- | -------- |
| totalPending | number | Count of pending items  | 12                   | ✅       |
| pendingItems | array  | Array of pending items  | [...]                | ✅       |
| id           | string | Unique wager identifier | "WAGER_001"          | ✅       |
| customerName | string | Customer identifier     | "John Doe"           | ✅       |
| amount       | number | Wager amount            | 100.00               | ✅       |
| teams        | string | Team description        | "Lakers vs Warriors" | ✅       |
| time         | string | Creation timestamp      | "2:30 PM"            | ✅       |
| odds         | string | Current odds            | "Live"               | ✅       |

---

## Activity Data Schema

### Structure

```typescript
interface ActivityData {
  activities: Activity[]; // Array of activities
}

interface Activity {
  id: string; // Activity identifier
  type: 'pending' | 'bet'; // Activity type
  icon: string; // FontAwesome icon class
  user: string; // User identifier
  action: string; // Action description
  time: string; // Activity timestamp
  amount: number; // Amount involved
}
```

### Field Descriptions

| Field  | Type   | Description        | Example        | Required |
| ------ | ------ | ------------------ | -------------- | -------- |
| id     | string | Unique activity ID | "ACT_001"      | ✅       |
| type   | string | Activity type      | "pending"      | ✅       |
| icon   | string | FontAwesome icon   | "fas fa-clock" | ✅       |
| user   | string | User identifier    | "USER_123"     | ✅       |
| action | string | Action description | "Placed wager" | ✅       |
| time   | string | Activity time      | "2:30 PM"      | ✅       |
| amount | number | Amount involved    | 100.00         | ✅       |

---

## User Data Schema

### Structure

```typescript
interface UserData {
  id: string; // User identifier
  username: string; // Username
  email: string; // Email address
  role: UserRole; // User role
  status: UserStatus; // Account status
  createdAt: string; // Account creation date
  lastLogin: string; // Last login timestamp
}
```

### Field Descriptions

| Field     | Type   | Description    | Example                | Required |
| --------- | ------ | -------------- | ---------------------- | -------- |
| id        | string | Unique user ID | "USER_001"             | ✅       |
| username  | string | Username       | "johndoe"              | ✅       |
| email     | string | Email address  | "john@example.com"     | ✅       |
| role      | enum   | User role      | "agent"                | ✅       |
| status    | enum   | Account status | "active"               | ✅       |
| createdAt | string | Creation date  | "2024-01-15"           | ✅       |
| lastLogin | string | Last login     | "2024-01-20T10:30:00Z" | ❌       |

---

## Agent Data Schema

### Structure

```typescript
interface AgentData {
  id: string; // Agent identifier
  name: string; // Agent name
  code: string; // Agent code
  status: AgentStatus; // Agent status
  commission: number; // Commission rate
  customers: number; // Customer count
  totalVolume: number; // Total volume
}
```

### Field Descriptions

| Field       | Type   | Description     | Example      | Required |
| ----------- | ------ | --------------- | ------------ | -------- |
| id          | string | Unique agent ID | "AGENT_001"  | ✅       |
| name        | string | Agent name      | "John Smith" | ✅       |
| code        | string | Agent code      | "JS001"      | ✅       |
| status      | enum   | Agent status    | "active"     | ✅       |
| commission  | number | Commission rate | 0.05         | ✅       |
| customers   | number | Customer count  | 25           | ❌       |
| totalVolume | number | Total volume    | 50000.00     | ❌       |

---

## Wager Data Schema

### Structure

```typescript
interface WagerData {
  wager_number: string; // Wager identifier
  customer_id: string; // Customer identifier
  amount: number; // Wager amount
  description: string; // Wager description
  status: WagerStatus; // Wager status
  created_at: string; // Creation timestamp
  odds: number; // Wager odds
  potential_win: number; // Potential winnings
}
```

### Field Descriptions

| Field         | Type   | Description        | Example                | Required |
| ------------- | ------ | ------------------ | ---------------------- | -------- |
| wager_number  | string | Wager identifier   | "WAGER_001"            | ✅       |
| customer_id   | string | Customer ID        | "CUST_001"             | ✅       |
| amount        | number | Wager amount       | 100.00                 | ✅       |
| description   | string | Wager description  | "Lakers -5.5"          | ✅       |
| status        | enum   | Wager status       | "pending"              | ✅       |
| created_at    | string | Creation time      | "2024-01-20T10:30:00Z" | ✅       |
| odds          | number | Wager odds         | -110                   | ❌       |
| potential_win | number | Potential winnings | 90.91                  | ❌       |

---

## Transaction Data Schema

### Structure

```typescript
interface TransactionData {
  id: string; // Transaction ID
  type: TransactionType; // Transaction type
  amount: number; // Transaction amount
  status: TransactionStatus; // Transaction status
  timestamp: string; // Transaction timestamp
  reference: string; // Reference number
  description: string; // Transaction description
}
```

### Field Descriptions

| Field       | Type   | Description        | Example                | Required |
| ----------- | ------ | ------------------ | ---------------------- | -------- |
| id          | string | Transaction ID     | "TXN_001"              | ✅       |
| type        | enum   | Transaction type   | "deposit"              | ✅       |
| amount      | number | Transaction amount | 100.00                 | ✅       |
| status      | enum   | Transaction status | "completed"            | ✅       |
| timestamp   | string | Transaction time   | "2024-01-20T10:30:00Z" | ✅       |
| reference   | string | Reference number   | "REF_001"              | ❌       |
| description | string | Description        | "Customer deposit"     | ❌       |

---

## WebSocket Data Schema

### Structure

```typescript
interface WebSocketData {
  type: 'tick' | 'update' | 'alert'; // Data type
  timestamp: string; // ISO timestamp
  kpi: KPIData; // KPI information
  weeklyData: WeeklyData; // Weekly statistics
  pendingData: PendingData; // Pending information
  activities: Activity[]; // Activity feed
}
```

### Field Descriptions

| Field       | Type   | Description    | Example                | Required |
| ----------- | ------ | -------------- | ---------------------- | -------- |
| type        | string | Data type      | "tick"                 | ✅       |
| timestamp   | string | ISO timestamp  | "2024-01-20T10:30:00Z" | ✅       |
| kpi         | object | KPI data       | {...}                  | ✅       |
| weeklyData  | object | Weekly data    | {...}                  | ✅       |
| pendingData | object | Pending data   | {...}                  | ✅       |
| activities  | array  | Activity array | [...]                  | ✅       |

---

## Data Validation Rules

### Required Fields

- All primary identifiers (id, wager_number, etc.)
- Financial amounts (amount, revenue, etc.)
- Timestamps (created_at, timestamp, etc.)
- Status fields (status, type, etc.)

### Data Types

- **Numbers**: All monetary values, counts, and percentages
- **Strings**: Identifiers, names, descriptions, and codes
- **Dates**: ISO 8601 format for all timestamps
- **Enums**: Predefined values for status and type fields

### Data Constraints

- **Amounts**: Must be positive numbers
- **Percentages**: Must be between 0 and 1
- **Timestamps**: Must be valid ISO 8601 format
- **IDs**: Must be unique within their scope

---

## Data Flow Diagrams

### Real-Time Data Flow

```text
[Database] → [API Layer] → [WebSocket] → [Dashboard]
     ↓              ↓           ↓           ↓
  Raw Data    Processed    Real-time    Display
              Data         Updates      Updates
```

### Batch Data Flow

```text
[Source Systems] → [ETL Process] → [Data Warehouse] → [Analytics]
       ↓               ↓              ↓               ↓
   Raw Data      Transformation   Stored Data    Reports
```

---

## API Response Examples

### KPI Endpoint Response

```json
{
  "success": true,
  "data": {
    "revenue": 12500.5,
    "activePlayers": 45,
    "pending": 12,
    "totalLiability": 8750.25
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### Weekly Data Response

```json
{
  "success": true,
  "data": {
    "totalHandle": 50000.0,
    "totalWin": 12500.0,
    "totalVolume": 75000.0,
    "totalBets": 150
  },
  "period": "2024-01-13 to 2024-01-19"
}
```

---

## Database Schema References

### Related Tables

- `users` - User information and authentication
- `agents` - Agent details and commission rates
- `wagers` - Wager records and status
- `transactions` - Financial transaction history
- `activities` - User activity tracking
- `kpi_metrics` - Key performance indicators
- `weekly_stats` - Weekly aggregated statistics

### Foreign Key Relationships

- Users → Agents (many-to-one)
- Wagers → Users (many-to-one)
- Wagers → Agents (many-to-one)
- Transactions → Users (many-to-one)
- Activities → Users (many-to-one)

---

## Data Migration Notes

### Version History

- **v1.0**: Initial schema implementation
- **v1.1**: Added activity tracking
- **v1.2**: Enhanced KPI calculations
- **v2.0**: Real-time WebSocket integration

### Breaking Changes

- None in current version
- All changes are backward compatible

---

## Performance Considerations

### Data Access Patterns

- **Frequent Reads**: KPI data, pending wagers
- **Batch Updates**: Weekly statistics, daily aggregations
- **Real-time Writes**: User activities, wager status changes

### Optimization Strategies

- **Indexing**: Primary keys, foreign keys, status fields
- **Caching**: KPI data, user sessions, agent information
- **Partitioning**: Time-based partitioning for historical data

---

## Security Considerations

### Data Protection

- **PII**: Customer names, email addresses
- **Financial**: Transaction amounts, account balances
- **Sensitive**: Commission rates, profit margins

### Access Control

- **Role-based**: Different access levels for different user types
- **Data masking**: Sensitive data hidden from unauthorized users
- **Audit logging**: All data access and modifications logged

---

## Troubleshooting

### Common Issues

1. **Data Type Mismatches**: Ensure consistent data types
2. **Missing Required Fields**: Validate all required fields
3. **Timestamp Format**: Use ISO 8601 format consistently
4. **Enum Values**: Use only predefined enum values

### Debug Tools

- **Data Validation**: Built-in validation in API responses
- **Logging**: Comprehensive logging for data operations
- **Monitoring**: Real-time monitoring of data quality

---

## Future Enhancements

### Planned Features

- **Advanced Analytics**: Machine learning insights
- **Data Export**: CSV/JSON export functionality
- **Real-time Alerts**: Automated alerting system
- **Data Visualization**: Enhanced charting and graphs

### Schema Evolution

- **Backward Compatibility**: Maintain existing API contracts
- **Versioning**: API versioning for major changes
- **Migration Tools**: Automated migration scripts

---

_Last Updated: 2024-01-20_ _Version: 1.0_ _Maintainer: Fire22 Development Team_
