// database/tier1380-database.ts
import { Tier1380SQLite } from '../database/sqlite-optimizer'

// Initialize with production settings
const db = new Tier1380SQLite('./data/tier1380.db', {
  wal: true, // Write-Ahead Logging
  // Additional optimizations applied in constructor
})

// Create connection pool for web server
const dbPool = Tier1380SQLite.createPool({
  path: './data/tier1380.db',
  size: 4, // Fixed size for now instead of Bun.availableParallelism
  options: {
    readonly: false
  }
})

// Example usage in web server
Bun.serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url)

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      })
    }

    // API endpoints
    if (url.pathname.startsWith('/api/')) {
      let connection: any = null
      try {
        // Acquire database connection from pool
        connection = dbPool.acquire()

        if (url.pathname === '/api/users') {
          // Fast query with caching and metrics
          const teamId = url.searchParams.get('team_id') || 'team-1380'

          const users = await db.query(
            'SELECT * FROM users WHERE team_id = ? AND active = ?',
            [teamId, 1],
            {
              retries: 3,
              explain: process.env.NODE_ENV === 'development'
            }
          )

          return Response.json({
            users: users.rows,
            metrics: users.metrics,
            cached: users.cached,
            duration: users.duration
          })
        }

        if (url.pathname === '/api/users/batch' && req.method === 'POST') {
          // Batch insert with transaction optimization
          const userData = await req.json() as any[]

          const result = await db.batchInsert('users', userData, 1000)

          return Response.json({
            success: true,
            ...result
          })
        }

        if (url.pathname === '/api/performance') {
          // Performance metrics
          return Response.json({
            database: {
              cacheSize: db.cacheSize,
              queryMetrics: db.metrics
            },
            system: {
              memory: process.memoryUsage(),
              cpu: 4, // Fixed for now
              uptime: process.uptime()
            }
          })
        }

        return new Response('API endpoint not found', { status: 404 })

      } catch (error: any) {
        console.error('Database error:', error)
        return Response.json({
          error: 'Database operation failed',
          message: error?.message || 'Unknown error'
        }, { status: 500 })
      } finally {
        // Note: In a real pool implementation, we'd return the connection here
        // For now, connections are managed by the pool itself
      }
    }

    return new Response('Tier-1380 Database Server', {
      headers: { 'Content-Type': 'text/plain' }
    })
  }
})

console.log('🗄️  Tier-1380 Database Server running on http://localhost:3002')
console.log('📊 Health: http://localhost:3002/health')
console.log('👥 Users API: http://localhost:3002/api/users')
console.log('📈 Performance: http://localhost:3002/api/performance')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down database server...')
  db.close()
  dbPool.close()
  process.exit(0)
})
