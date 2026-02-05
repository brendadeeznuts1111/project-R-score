# Correlation Graph Logging

**Version**: 4.2.2.4.0.0.0  
**Last Updated**: 2025-01-15

## Overview

Comprehensive logging has been implemented throughout the Correlation Graph Dashboard to provide observability, debugging capabilities, and performance monitoring.

## Logging Levels

The implementation uses the standard logger utility (`src/utils/logger`) with the following log levels:

- **DEBUG**: Detailed diagnostic information (cache hits, performance breakdowns)
- **INFO**: General informational messages (request processing, completion)
- **WARN**: Warning messages (validation failures, invalid parameters)
- **ERROR**: Error conditions (exceptions, failures)

## Backend Logging

### API Endpoint (`src/api/routes.ts`)

#### Request Logging
- **Request ID**: Unique identifier for each request (`req-{timestamp}-{random}`)
- **Request Start**: Logs when request is received with parameters
- **Client Information**: IP address, user agent
- **Parameter Validation**: Logs validation failures with details

#### Success Logging
```
[api/correlation-graph] Request req-1234567890-abc123: Success - 
  28 nodes, 52 edges, aggregation=245.32ms, total=267.45ms
```

#### Error Logging
- Logs error messages with request ID
- Includes duration before error occurred
- Includes error stack traces (if enabled)

### Data Aggregation (`src/api/dashboard-correlation-graph.ts`)

#### Cache Logging
- **Cache Hits**: Logs when cached data is returned (with cache age)
- **Cache Misses**: Logs when cache is missed and database query is needed
- **Cache Invalidation**: Logs when cache entries are cleared

#### Database Operations
- **Database Open/Close**: Logs database connection lifecycle
- **SQL Query Performance**: Logs query execution time and row count
- **Data Processing**: Logs number of bookmakers, events processed

#### Performance Breakdown
Logs detailed performance metrics for each phase:
- SQL query execution time
- Node generation time
- Edge generation time
- Layer summary calculation time
- Statistics calculation time
- Total aggregation time

Example:
```
[correlation-graph] Performance breakdown: 
  query=123.45ms, nodes=45.67ms, edges=78.90ms, 
  layers=12.34ms, stats=5.67ms
```

#### Node/Edge Generation
- Logs count of nodes and edges generated
- Logs unique bookmakers and events processed
- Logs correlation calculations

#### Cache Management
- Logs cache invalidation operations
- Logs number of entries cleared

## Frontend Logging (`dashboard/correlation-graph.html`)

### Console Logging
All frontend logging uses `console.log`, `console.error`, etc. with `[correlation-graph]` prefix.

#### Data Loading
- **API Request**: Logs when data fetch starts
- **Fetch Performance**: Logs API fetch duration
- **Parse Performance**: Logs JSON parsing duration
- **Data Summary**: Logs node/edge/bookmaker counts
- **Total Load Time**: Logs complete load duration

#### Filter Operations
- **Filter State**: Logs current filter state when applying
- **Filter Performance**: Logs time taken to apply filters
- **Filter Results**: Logs visible nodes/edges after filtering

#### User Interactions
- **Node Clicks**: Logs when nodes are clicked
- **Background Clicks**: Logs when graph background is clicked
- **Graph Stabilization**: Logs when graph physics simulation completes

## Log Format

### Backend Log Format
```
{timestamp} [correlation-graph] [LEVEL] {message} {optional JSON data}
```

Example:
```
2025-01-15T12:34:56.789Z [correlation-graph] [INFO] Aggregating graph data for eventId=nba-lakers-warriors-2024-01-15, timeWindow=24h
```

### Frontend Log Format
```
[correlation-graph] {message}
```

Example:
```
[correlation-graph] Loading graph data: eventId=nba-lakers-warriors-2024-01-15, timeWindow=24h
```

## Performance Metrics Logged

### Backend Metrics
1. **SQL Query Time**: Time to execute database query
2. **Node Generation Time**: Time to generate correlation nodes
3. **Edge Generation Time**: Time to generate correlation edges
4. **Layer Calculation Time**: Time to calculate layer summaries
5. **Statistics Time**: Time to calculate graph statistics
6. **Total Aggregation Time**: Complete aggregation duration
7. **Cache Hit/Miss**: Cache performance indicators

### Frontend Metrics
1. **API Fetch Time**: Time to fetch data from API
2. **Parse Time**: Time to parse JSON response
3. **Filter Initialization Time**: Time to set up filters
4. **Graph Render Time**: Time to render vis.js graph
5. **Filter Apply Time**: Time to apply filters and update graph
6. **Total Load Time**: Complete page load duration

## Request Tracking

Each API request is assigned a unique request ID that is logged throughout the request lifecycle:
- Request start
- Parameter validation
- Data aggregation
- Response generation
- Error handling (if any)

This enables tracing a single request through all log entries.

## Error Logging

### Backend Errors
- **Database Errors**: Logged with full error details
- **Validation Errors**: Logged with parameter values
- **Aggregation Errors**: Logged with eventId and timeWindow context
- **Cache Errors**: Logged (if any occur)

### Frontend Errors
- **API Errors**: Logged with error message and duration
- **Render Errors**: Logged with context
- **Filter Errors**: Logged with filter state

## Debugging Tips

### Enable Debug Logging
Set `LOG_LEVEL=debug` environment variable to see detailed debug logs:
```bash
LOG_LEVEL=debug bun run dev
```

### Trace a Request
1. Find request ID in initial log entry
2. Search logs for that request ID
3. Follow the request through all phases

### Performance Analysis
1. Look for performance breakdown logs
2. Identify slow phases (query, node generation, etc.)
3. Check cache hit rates
4. Monitor filter application times

### Common Issues

#### Slow Queries
- Check SQL query time in logs
- Verify database indexes exist
- Check time_window parameter (larger = slower)

#### Cache Issues
- Check cache hit/miss logs
- Verify cache TTL (5 minutes)
- Check cache invalidation logs

#### Frontend Performance
- Check render times in console
- Monitor filter application times
- Check graph stabilization logs

## Log Retention

Logs are written to:
- **Backend**: Console/stdout (can be redirected to files)
- **Frontend**: Browser console (client-side only)

For production, consider:
- Log aggregation service (e.g., Datadog, Splunk)
- Structured logging format (JSON)
- Log rotation and retention policies

## Example Log Flow

### Successful Request
```
[INFO] Request req-123: event_id=nba-lakers-warriors-2024-01-15, time_window=24, client=192.168.1.1
[DEBUG] Cache miss for correlation-graph:nba-lakers-warriors-2024-01-15:24, querying database
[DEBUG] Opening database: ./data/research.db
[INFO] SQL query completed in 123.45ms, returned 15 rows
[DEBUG] Processed 15 rows: 3 unique bookmakers, 1 events
[DEBUG] Generated 5 nodes in 45.67ms
[DEBUG] Generated 8 edges in 78.90ms
[DEBUG] Calculated layer summaries in 12.34ms
[DEBUG] Calculated statistics in 5.67ms
[INFO] Graph aggregation complete: 5 nodes, 8 edges, 3 bookmakers, 265.89ms total
[INFO] Request req-123: Success - 5 nodes, 8 edges, aggregation=245.32ms, total=267.45ms
```

### Cached Request
```
[INFO] Request req-124: event_id=nba-lakers-warriors-2024-01-15, time_window=24, client=192.168.1.2
[DEBUG] Cache hit for correlation-graph:nba-lakers-warriors-2024-01-15:24 (age: 120s)
[INFO] Request req-124: Success - 5 nodes, 8 edges, aggregation=0.12ms, total=2.34ms
```

### Error Request
```
[INFO] Request req-125: event_id=invalid, time_window=24, client=192.168.1.3
[WARN] Request req-125: Invalid event_id format (length=7, matches=false)
[ERROR] Request req-125: Error after 1.23ms - Invalid event_id format
```

## Best Practices

1. **Use Appropriate Log Levels**: 
   - DEBUG for detailed diagnostics
   - INFO for normal operations
   - WARN for recoverable issues
   - ERROR for failures

2. **Include Context**: 
   - Request IDs
   - Event IDs
   - Performance metrics
   - Error details

3. **Performance Logging**: 
   - Log timing for all major operations
   - Include breakdowns for complex operations
   - Track cache performance

4. **Error Logging**: 
   - Include full error messages
   - Include stack traces (in debug mode)
   - Include request context

5. **Production Considerations**: 
   - Use structured logging (JSON)
   - Set appropriate log levels
   - Implement log aggregation
   - Monitor log volume
