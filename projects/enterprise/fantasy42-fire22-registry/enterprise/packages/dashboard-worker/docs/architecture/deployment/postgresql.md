# PostgreSQL Configuration

Database setup and configuration for development and production environments.

## Development Setup

```bash
# Start PostgreSQL (Docker)
docker run -d --name fire22-postgres \
  -e POSTGRES_DB=fire22 \
  -e POSTGRES_USER=fire22 \
  -e POSTGRES_PASSWORD=development \
  -p 5432:5432 postgres:15

# Run migrations
bun run setup-db
```

## Connection Settings

- Max connections: 20
- Idle timeout: 30 seconds
- Acquire timeout: 60 seconds
