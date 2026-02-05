# Fire22 Dashboard Task Management API Documentation

## Overview

The Fire22 Dashboard Task Management API provides comprehensive CRUD operations
for task management with real-time updates, advanced filtering, and
department-based access control.

**Base URL:** `https://dashboard-worker.nolarose1968-806.workers.dev`  
**API Version:** 1.0.0  
**Last Updated:** 2024-08-28

## Authentication

All endpoints require JWT authentication with department-specific permissions.

```http
Authorization: Bearer <jwt_token>
```

## Core Endpoints

### Tasks CRUD Operations

#### 1. Create Task

```http
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "priority": "high",
  "status": "planning",
  "progress": 0,
  "departmentId": "technology",
  "assigneeId": "john-doe",
  "reporterId": "jane-smith",
  "dueDate": "2024-09-15T23:59:59Z",
  "estimatedHours": 16,
  "storyPoints": 8,
  "tags": ["authentication", "security", "backend"]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "uuid": "task_2024_08_28_abc123def456",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system",
    "priority": "high",
    "status": "planning",
    "progress": 0,
    "departmentId": "technology",
    "assignee": {
      "id": "john-doe",
      "name": "John Doe",
      "email": "john.doe@technology.fire22",
      "role": "Senior Developer"
    },
    "reporter": {
      "id": "jane-smith",
      "name": "Jane Smith",
      "email": "jane.smith@technology.fire22",
      "role": "Tech Lead"
    },
    "department": {
      "id": "technology",
      "name": "Technology Department",
      "displayName": "Technology"
    },
    "dueDate": "2024-09-15T23:59:59Z",
    "estimatedHours": 16,
    "storyPoints": 8,
    "tags": ["authentication", "security", "backend"],
    "createdAt": "2024-08-28T10:30:00Z",
    "updatedAt": "2024-08-28T10:30:00Z"
  }
}
```

#### 2. Get Tasks (with filtering and pagination)

```http
GET /api/tasks?page=1&limit=20&department=technology&status=active&priority=high
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `department` (string): Filter by department ID
- `status` (string): Filter by status
  (planning|active|in-progress|review|completed|cancelled)
- `priority` (string): Filter by priority (low|medium|high|critical)
- `assignee` (string): Filter by assignee ID
- `reporter` (string): Filter by reporter ID
- `search` (string): Search in title and description
- `tags` (string): Comma-separated tags
- `dueAfter` (ISO date): Tasks due after this date
- `dueBefore` (ISO date): Tasks due before this date
- `sortBy` (string): Sort field (title|priority|status|dueDate|createdAt)
- `sortOrder` (string): Sort direction (asc|desc)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 123,
        "uuid": "task_2024_08_28_abc123def456",
        "title": "Implement user authentication"
        // ... full task object
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "department": "technology",
      "status": "active",
      "priority": "high"
    }
  }
}
```

#### 3. Get Single Task

```http
GET /api/tasks/{uuid}
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "uuid": "task_2024_08_28_abc123def456",
    // ... full task object with activity history
    "activities": [
      {
        "id": 1,
        "type": "created",
        "description": "Task created",
        "user": {
          "id": "jane-smith",
          "name": "Jane Smith"
        },
        "timestamp": "2024-08-28T10:30:00Z"
      }
    ]
  }
}
```

#### 4. Update Task

```http
PUT /api/tasks/{uuid}
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body (partial update):**

```json
{
  "status": "in-progress",
  "progress": 25,
  "assigneeId": "new-assignee"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    // ... updated task object
  },
  "changes": {
    "status": { "from": "planning", "to": "in-progress" },
    "progress": { "from": 0, "to": 25 },
    "assigneeId": { "from": "john-doe", "to": "new-assignee" }
  }
}
```

#### 5. Delete Task

```http
DELETE /api/tasks/{uuid}
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

### Task Comments

#### 6. Add Comment

```http
POST /api/tasks/{uuid}/comments
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "content": "Updated the authentication flow based on security review",
  "type": "comment"
}
```

#### 7. Get Comments

```http
GET /api/tasks/{uuid}/comments
Authorization: Bearer <jwt_token>
```

### Real-time Updates (Server-Sent Events)

#### 8. Task Event Stream

```http
GET /api/tasks/events
Authorization: Bearer <jwt_token>
Accept: text/event-stream
```

**Query Parameters:**

- `departments` (string): Comma-separated department IDs
- `assignees` (string): Comma-separated assignee IDs
- `eventTypes` (string): Comma-separated event types

**Event Types:**

- `task_created`: New task created
- `task_updated`: Task updated
- `task_deleted`: Task deleted
- `task_assigned`: Task assigned to user
- `task_progress`: Task progress updated
- `task_comment`: New comment added

**Event Format:**

```
event: task_updated
data: {"type":"task_updated","taskUuid":"task_2024_08_28_abc123def456","task":{...},"changes":{...},"timestamp":"2024-08-28T10:30:00Z","departmentId":"technology"}

event: heartbeat
data: {"timestamp":"2024-08-28T10:31:00Z"}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with UUID 'invalid-uuid' not found",
    "details": {
      "uuid": "invalid-uuid"
    }
  }
}
```

**Common Error Codes:**

- `TASK_NOT_FOUND` (404): Task does not exist
- `INVALID_DEPARTMENT` (400): Invalid department ID
- `UNAUTHORIZED` (401): Invalid or missing JWT token
- `FORBIDDEN` (403): Insufficient permissions
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **SSE connections**: 5 concurrent connections per user
- **Bulk operations**: 10 requests per minute per user

## Department Integration

The API integrates with the Fire22 department system:

**Supported Departments:**

- `finance` - Finance Department
- `customer-support` - Customer Support
- `compliance` - Compliance Department
- `operations` - Operations Department
- `technology` - Technology Department
- `marketing` - Marketing Department
- `management` - Management Department
- `design` - Design Team
- `security` - Security Department
- `sportsbook-operations` - Sportsbook Operations
- `communications` - Communications Department
- `team-contributors` - Team Contributors

## Design Team Integration

Special endpoints for design team collaboration:

#### 9. Design Review Request

```http
POST /api/tasks/{uuid}/design-review
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "reviewType": "ui_design" | "ux_review" | "design_system" | "accessibility",
  "priority": "low" | "medium" | "high" | "critical",
  "description": "Need design review for new authentication flow",
  "assets": ["figma_link", "prototype_url"],
  "deadline": "2024-09-01T17:00:00Z"
}
```

#### 10. Design Assets Upload

```http
POST /api/tasks/{uuid}/design-assets
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>
```

## Testing

See `/tests/api/task-management.test.ts` for comprehensive test suite.

## Examples

See `/examples/task-api-usage.ts` for implementation examples.
