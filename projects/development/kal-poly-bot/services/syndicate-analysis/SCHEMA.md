# Database Schema Documentation

## Table Structure

### 1. syndicate_groups

Main table for syndicate group information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique syndicate identifier |
| name | TEXT | NOT NULL | Syndicate group name |
| members_count | INTEGER | NOT NULL DEFAULT 0 | Number of members |
| total_funds | REAL | NOT NULL DEFAULT 0.0 | Total funds available |
| created_at | INTEGER | NOT NULL | Creation timestamp |
| updated_at | INTEGER | NOT NULL | Last update timestamp |
| metadata | TEXT | | JSON metadata |

**Indexes:**
- Primary key on `id`

---

### 2. syndicate_members

Many-to-many relationship between groups and members.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| syndicate_id | TEXT | NOT NULL, FK → syndicate_groups | Syndicate reference |
| member_id | TEXT | NOT NULL | Member identifier |
| member_name | TEXT | | Member display name |
| joined_at | INTEGER | NOT NULL | Join timestamp |
| role | TEXT | DEFAULT 'member' | Member role (admin/member/viewer) |

**Indexes:**
- Unique constraint on `(syndicate_id, member_id)`
- Foreign key to `syndicate_groups(id)`

---

### 3. syndicate_bets

All bets placed by syndicates with platform/OS tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique bet identifier |
| syndicate_id | TEXT | NOT NULL, FK → syndicate_groups | Syndicate reference |
| game | TEXT | NOT NULL | Game/event identifier |
| bet_type | TEXT | NOT NULL | Type of bet |
| amount | REAL | NOT NULL | Bet amount |
| odds | REAL | NOT NULL | Betting odds |
| timestamp | INTEGER | NOT NULL | Bet timestamp |
| result | TEXT | CHECK IN ('win','loss','push','pending') | Bet result |
| platform | TEXT | | Platform (windows/macos/linux/ios/android/web) |
| os | TEXT | | Operating system |
| user_agent | TEXT | | User agent string |
| ip_address | TEXT | | IP address |

**Indexes:**
- `idx_syndicate_bets_syndicate_id` on `syndicate_id`
- `idx_syndicate_bets_timestamp` on `timestamp`
- `idx_syndicate_bets_game` on `game`
- Foreign key to `syndicate_groups(id)`

---

### 4. syndicate_patterns

Detected betting patterns per syndicate.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| syndicate_id | TEXT | NOT NULL, FK → syndicate_groups | Syndicate reference |
| pattern_type | TEXT | NOT NULL, CHECK | Pattern type identifier |
| pattern_data | TEXT | NOT NULL | JSON pattern data |
| strength | REAL | NOT NULL, CHECK (0-1) | Pattern strength (0.0-1.0) |
| confidence | REAL | NOT NULL, CHECK (0-1) | Pattern confidence (0.0-1.0) |
| last_seen | INTEGER | NOT NULL | Last detection timestamp |
| created_at | INTEGER | NOT NULL | Creation timestamp |

**Pattern Types:**
- `betting_frequency`
- `game_selection`
- `bet_type_preference`
- `real_time_frequency`
- `real_time_game_selection`

**Indexes:**
- `idx_syndicate_patterns_syndicate_id` on `syndicate_id`
- `idx_syndicate_patterns_type` on `pattern_type`
- `idx_syndicate_patterns_last_seen` on `last_seen`
- Foreign key to `syndicate_groups(id)`

---

### 5. platform_activities

Platform-specific activity tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| syndicate_id | TEXT | NOT NULL, FK → syndicate_groups | Syndicate reference |
| platform | TEXT | NOT NULL | Platform identifier |
| os | TEXT | | Operating system |
| total_bets | INTEGER | NOT NULL DEFAULT 0 | Total bets on platform |
| total_amount | REAL | NOT NULL DEFAULT 0.0 | Total amount bet on platform |
| first_seen | INTEGER | NOT NULL | First activity timestamp |
| last_seen | INTEGER | NOT NULL | Last activity timestamp |

**Indexes:**
- `idx_platform_activities_syndicate` on `syndicate_id`
- Unique constraint on `(syndicate_id, platform, os)`
- Foreign key to `syndicate_groups(id)`

---

### 6. activity_records

Detailed activity log for platform activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| platform_activity_id | INTEGER | NOT NULL, FK → platform_activities | Platform activity reference |
| timestamp | INTEGER | NOT NULL | Activity timestamp |
| amount | REAL | NOT NULL | Bet amount |
| game | TEXT | NOT NULL | Game identifier |
| bet_type | TEXT | NOT NULL | Bet type |

**Indexes:**
- Foreign key to `platform_activities(id)`

---

### 7. emerging_patterns

Cross-syndicate pattern detection.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| pattern_key | TEXT | NOT NULL UNIQUE | Unique pattern identifier |
| pattern_type | TEXT | NOT NULL | Pattern type |
| pattern_data | TEXT | NOT NULL | JSON pattern data |
| syndicate_count | INTEGER | NOT NULL DEFAULT 0 | Number of syndicates showing pattern |
| strength | REAL | NOT NULL, CHECK (0-1) | Pattern strength |
| confidence | REAL | NOT NULL, CHECK (0-1) | Pattern confidence |
| first_seen | INTEGER | NOT NULL | First detection timestamp |
| last_seen | INTEGER | NOT NULL | Last detection timestamp |
| is_active | INTEGER | NOT NULL DEFAULT 1 | Active status (0 or 1) |

**Indexes:**
- `idx_emerging_patterns_active` on `(is_active, last_seen)`
- Unique constraint on `pattern_key`

---

### 8. pattern_syndicates

Many-to-many relationship between emerging patterns and syndicates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-increment ID |
| pattern_key | TEXT | NOT NULL, FK → emerging_patterns | Pattern reference |
| syndicate_id | TEXT | NOT NULL, FK → syndicate_groups | Syndicate reference |
| detected_at | INTEGER | NOT NULL | Detection timestamp |

**Indexes:**
- Unique constraint on `(pattern_key, syndicate_id)`
- Foreign keys to `emerging_patterns(pattern_key)` and `syndicate_groups(id)`

---

## Entity Relationship Diagram

```text
┌─────────────────────┐
│  syndicate_groups   │
│  ─────────────────  │
│  id (PK)            │
│  name               │
│  members_count      │
│  total_funds        │
│  created_at         │
│  updated_at         │
└──────────┬──────────┘
           │
           │ 1:N
           ├─────────────────────────────────────────────┐
           │                                             │
           │                                             │
    ┌──────▼──────┐                            ┌────────▼────────┐
    │syndicate_   │                            │ syndicate_bets │
    │members      │                            │ ────────────── │
    │──────────── │                            │ id (PK)        │
    │id (PK)      │                            │ syndicate_id   │
    │syndicate_id │                            │ game           │
    │member_id    │                            │ bet_type       │
    │role         │                            │ amount         │
    └─────────────┘                            │ odds           │
                                               │ timestamp      │
                                               │ result         │
                                               │ platform       │
                                               │ os             │
                                               └────────────────┘
           │
           │ 1:N
           │
    ┌──────▼──────────────┐
    │ syndicate_patterns  │
    │ ─────────────────── │
    │ id (PK)             │
    │ syndicate_id        │
    │ pattern_type        │
    │ pattern_data        │
    │ strength            │
    │ confidence          │
    │ last_seen           │
    └─────────────────────┘

┌─────────────────────┐
│ platform_activities │
│ ─────────────────── │
│ id (PK)             │
│ syndicate_id        │
│ platform            │
│ os                  │
│ total_bets          │
│ total_amount        │
└──────────┬──────────┘
           │
           │ 1:N
           │
    ┌──────▼──────────────┐
    │ activity_records    │
    │ ─────────────────── │
    │ id (PK)             │
    │ platform_activity_id│
    │ timestamp           │
    │ amount              │
    │ game                │
    │ bet_type            │
    └─────────────────────┘

┌─────────────────────┐         ┌──────────────────────┐
│ emerging_patterns   │◄───N:N──┤ pattern_syndicates   │
│ ─────────────────── │         │ ──────────────────── │
│ id (PK)             │         │ id (PK)              │
│ pattern_key (UK)    │         │ pattern_key         │
│ pattern_type        │         │ syndicate_id         │
│ pattern_data        │         │ detected_at          │
│ syndicate_count     │         └──────────┬───────────┘
│ strength            │                    │
│ confidence          │                    │ N:1
│ is_active           │                    │
└─────────────────────┘                    │
                                           │
                                    ┌──────▼──────────┐
                                    │syndicate_groups  │
                                    │ (referenced)     │
                                    └──────────────────┘
```

## Data Flow

1. **Syndicate Creation** → `syndicate_groups` + `syndicate_members`
2. **Bet Recording** → `syndicate_bets` → Pattern Analysis → `syndicate_patterns`
3. **Platform Tracking** → `platform_activities` + `activity_records`
4. **Pattern Detection** → `syndicate_patterns` → Cross-analysis → `emerging_patterns` + `pattern_syndicates`

## Query Patterns

### Get Syndicate with All Related Data

```sql
SELECT 
  sg.*,
  COUNT(DISTINCT sm.member_id) as actual_members,
  COUNT(sb.id) as total_bets,
  SUM(sb.amount) as total_bet_amount
FROM syndicate_groups sg
LEFT JOIN syndicate_members sm ON sg.id = sm.syndicate_id
LEFT JOIN syndicate_bets sb ON sg.id = sb.syndicate_id
WHERE sg.id = ?
GROUP BY sg.id
```

### Get Active Emerging Patterns

```sql
SELECT 
  ep.*,
  GROUP_CONCAT(ps.syndicate_id) as syndicate_ids
FROM emerging_patterns ep
JOIN pattern_syndicates ps ON ep.pattern_key = ps.pattern_key
WHERE ep.is_active = 1
  AND ep.last_seen > ? -- Recent patterns only
GROUP BY ep.pattern_key
ORDER BY ep.strength DESC, ep.syndicate_count DESC
```

### Get Platform Distribution for Syndicate

```sql
SELECT 
  platform,
  os,
  SUM(total_bets) as bets,
  SUM(total_amount) as amount
FROM platform_activities
WHERE syndicate_id = ?
GROUP BY platform, os
ORDER BY amount DESC
```
