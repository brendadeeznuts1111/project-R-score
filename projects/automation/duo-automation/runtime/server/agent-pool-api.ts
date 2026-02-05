// server/agent-pool-api.ts
import { agentConnectionPool, AgentPoolManager, AgentConnection } from './agent-connection-pool.js';

export function setupAgentPoolAPI(app: any) {
  // Get connection pool statistics
  app.get('/api/agent-pool/stats', (req: any, res: any) => {
    try {
      const stats = agentConnectionPool.getStats();
      const connectionsByDept = agentConnectionPool.getConnectionsByDepartment();
      
      res.json({
        success: true,
        data: {
          ...stats,
          connectionsByDepartment: Object.keys(connectionsByDept).map(dept => ({
            department: dept,
            count: connectionsByDept[dept].length,
            active: connectionsByDept[dept].filter(c => c.status === 'active').length
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get all connections
  app.get('/api/agent-pool/connections', (req: any, res: any) => {
    try {
      const { department, status } = req.query;
      let connections = Array.from(agentConnectionPool.connections.values());

      // Filter by department
      if (department) {
        connections = connections.filter(c => c.department === department);
      }

      // Filter by status
      if (status) {
        connections = connections.filter(c => c.status === status);
      }

      res.json({
        success: true,
        data: connections,
        count: connections.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get specific connection
  app.get('/api/agent-pool/connections/:agentId', (req: any, res: any) => {
    try {
      const { agentId } = req.params;
      const connection = agentConnectionPool.connections.get(agentId);
      
      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          timestamp: new Date().toISOString()
        });
      }

      const metrics = AgentPoolManager.getAgentMetrics(agentId);
      
      res.json({
        success: true,
        data: {
          connection,
          metrics: metrics?.performance
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add agent to pool
  app.post('/api/agent-pool/connections', async (req: any, res: any) => {
    try {
      const agentData = req.body;
      
      // Validate required fields
      if (!agentData.id || !agentData.name || !agentData.department) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: id, name, department',
          timestamp: new Date().toISOString()
        });
      }

      const connection = await agentConnectionPool.addAgent(agentData);
      
      res.status(201).json({
        success: true,
        data: connection,
        message: 'Agent added to connection pool',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create and add new agent
  app.post('/api/agent-pool/create-agent', async (req: any, res: any) => {
    try {
      const { firstName, lastName, department, phoneType } = req.body;
      
      const connection = await AgentPoolManager.createAndAddAgent({
        firstName,
        lastName,
        department,
        phoneType
      });
      
      res.status(201).json({
        success: true,
        data: connection,
        message: 'New agent created and added to pool',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Remove agent from pool
  app.delete('/api/agent-pool/connections/:agentId', (req: any, res: any) => {
    try {
      const { agentId } = req.params;
      const removed = agentConnectionPool.removeAgent(agentId);
      
      if (!removed) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Agent removed from connection pool',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Execute request through agent
  app.post('/api/agent-pool/execute/:agentId', async (req: any, res: any) => {
    try {
      const { agentId } = req.params;
      const { url, method, headers, body, proxy } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required',
          timestamp: new Date().toISOString()
        });
      }

      const response = await agentConnectionPool.executeRequest(agentId, {
        url,
        method,
        headers,
        body,
        proxy
      });
      
      const responseData = await response.text();
      
      res.json({
        success: true,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Execute batch request
  app.post('/api/agent-pool/batch-execute', async (req: any, res: any) => {
    try {
      const { agentIds, url, method, headers, body } = req.body;
      
      if (!agentIds || !Array.isArray(agentIds) || !url) {
        return res.status(400).json({
          success: false,
          error: 'agentIds array and url are required',
          timestamp: new Date().toISOString()
        });
      }

      const results = await AgentPoolManager.executeBatchRequest(agentIds, {
        url,
        method,
        headers,
        body
      });
      
      res.json({
        success: true,
        data: results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Update pool configuration
  app.put('/api/agent-pool/config', (req: any, res: any) => {
    try {
      const config = req.body;
      agentConnectionPool.updateConfig(config);
      
      res.json({
        success: true,
        message: 'Pool configuration updated',
        data: agentConnectionPool.getStats(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test agent connection
  app.post('/api/agent-pool/test/:agentId', async (req: any, res: any) => {
    try {
      const { agentId } = req.params;
      const connection = agentConnectionPool.connections.get(agentId);
      
      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          timestamp: new Date().toISOString()
        });
      }

      const startTime = Date.now();
      const isHealthy = await agentConnectionPool.testConnection(agentId);
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: {
          agentId,
          healthy: isHealthy,
          responseTime,
          status: connection.status
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cleanup inactive agents
  app.post('/api/agent-pool/cleanup', (req: any, res: any) => {
    try {
      const { maxIdleTime = 3600000 } = req.body; // 1 hour default
      const cleaned = AgentPoolManager.cleanupInactiveAgents(maxIdleTime);
      
      res.json({
        success: true,
        data: {
          cleaned,
          remaining: agentConnectionPool.connections.size
        },
        message: `Cleaned up ${cleaned} inactive agents`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Export pool state
  app.get('/api/agent-pool/export', (req: any, res: any) => {
    try {
      const exportData = agentConnectionPool.export();
      
      res.json({
        success: true,
        data: exportData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Import pool state
  app.post('/api/agent-pool/import', (req: any, res: any) => {
    try {
      const { connections, config } = req.body;
      
      if (!connections || !Array.isArray(connections)) {
        return res.status(400).json({
          success: false,
          error: 'connections array is required',
          timestamp: new Date().toISOString()
        });
      }

      agentConnectionPool.import({ connections, config });
      
      res.json({
        success: true,
        message: `Imported ${connections.length} connections`,
        data: agentConnectionPool.getStats(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Clear all connections
  app.delete('/api/agent-pool/clear', (req: any, res: any) => {
    try {
      agentConnectionPool.clear();
      
      res.json({
        success: true,
        message: 'Connection pool cleared',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get pool health
  app.get('/api/agent-pool/health', (req: any, res: any) => {
    try {
      const stats = agentConnectionPool.getStats();
      const health = {
        status: stats.error === 0 ? 'healthy' : stats.error < stats.total * 0.1 ? 'warning' : 'critical',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ...stats
      };
      
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('✅ Agent Pool API endpoints registered');
}
