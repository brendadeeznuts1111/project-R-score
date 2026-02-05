# ShortcutRegistry API

HTTP API server for the ShortcutRegistry system with seed data initialization via headers.

## Starting the Server

```bash
# Start API server
bun run dev:api

# Start with watch mode
bun run dev:api:watch
```

The server runs on `http://localhost:3000` by default (configurable via `PORT` environment variable).

## Seed Data via Headers

All endpoints support seed data initialization via request headers:

### Headers

- `X-Seed-Data: true` - Enable seed data initialization
- `X-Seed-Mode: <mode>` - Seed mode (default, clear, test, full)
- `X-User-Id: <userId>` - User ID for seeding (optional, defaults to 'default')

### Seed Modes

- `default` - Standard seed with default shortcuts and profiles
- `clear` - Clear existing shortcuts before seeding
- `test` - Include test data in seed
- `full` - Clear shortcuts and include test data

### Response Headers

All responses include seed-related headers:

- `X-Seed-Available: true` - Indicates seed functionality is available
- `X-Seed-Header: X-Seed-Data` - Header name to use for seeding
- `X-Seed-Modes: default,clear,test,full` - Available seed modes

## Endpoints

### Shortcuts

- `GET /api/shortcuts` - List all shortcuts
- `GET /api/shortcuts/:id` - Get specific shortcut
- `POST /api/shortcuts` - Register new shortcut
- `DELETE /api/shortcuts/:id` - Unregister shortcut

### Profiles

- `GET /api/profiles` - List all profiles
- `GET /api/profiles/active` - Get active profile
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/:id/active` - Set active profile

### Conflicts

- `GET /api/conflicts?profileId=<id>` - Detect conflicts (optional profileId)

### Statistics

- `GET /api/stats/usage?days=<number>` - Get usage statistics (default: 30 days)

## Examples

### Seed Database via Header

```bash
# Seed with default mode
curl -H "X-Seed-Data: true" http://localhost:3000/api/shortcuts

# Seed with clear mode
curl -H "X-Seed-Data: true" -H "X-Seed-Mode: clear" http://localhost:3000/api/shortcuts

# Seed with test data
curl -H "X-Seed-Data: true" -H "X-Seed-Mode: test" http://localhost:3000/api/shortcuts

# Seed with custom user ID
curl -H "X-Seed-Data: true" -H "X-User-Id: myuser" http://localhost:3000/api/shortcuts
```

### Get All Shortcuts

```bash
curl http://localhost:3000/api/shortcuts
```

### Register a Shortcut

```bash
curl -X POST http://localhost:3000/api/shortcuts \
  -H "Content-Type: application/json" \
  -d '{
    "id": "file.save",
    "action": "save",
    "description": "Save file",
    "category": "general",
    "default": {
      "primary": "Ctrl+S",
      "macOS": "Cmd+S"
    },
    "enabled": true,
    "scope": "global"
  }'
```

### Create a Profile

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Profile",
    "description": "Custom profile"
  }'
```

### Detect Conflicts

```bash
curl http://localhost:3000/api/conflicts
```

### Get Usage Statistics

```bash
curl http://localhost:3000/api/stats/usage?days=7
```

## Response Format

All endpoints return JSON responses with appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Success responses include the requested data. Error responses include an `error` field with the error message.
