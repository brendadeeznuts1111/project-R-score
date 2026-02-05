#!/usr/bin/env bun

// [DOCKER][SETUP][CONTAINER][DOCKER-001][v3.0][ACTIVE]

// [DATAPIPE][CORE][DA-CO-DKR][v3.0.0][ACTIVE]

import { existsSync, readFileSync } from "fs";
import { spawn } from "child_process";

interface DockerConfig {
  imageName: string;
  containerName: string;
  ports: string[];
  volumes: string[];
  environment: Record<string, string>;
}

class DockerSetup {
  private config: DockerConfig;

  constructor() {
    this.config = {
      imageName: 'mcp-agent-governance:latest',
      containerName: 'mcp-agent-governance-dev',
      ports: ['3000:3000', '3001:3001'],
      volumes: [
        './data:/app/data',
        './logs:/app/logs',
        './dashboards:/app/dashboards',
        './config:/app/config'
      ],
      environment: {
        NODE_ENV: 'development',
        PORT: '3000',
        WS_PORT: '3001'
      }
    };
  }

  async build(): Promise<void> {
    console.log(`🏗️ Building Docker image: ${this.config.imageName}`);

    return new Promise((resolve, reject) => {
      const build = spawn('docker', ['build', '-t', this.config.imageName, '.'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      build.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Docker image built successfully`);
          resolve();
        } else {
          reject(new Error(`Docker build failed with code ${code}`));
        }
      });

      build.on('error', reject);
    });
  }

  async run(): Promise<void> {
    console.log(`🚀 Starting Docker container: ${this.config.containerName}`);

    // Stop existing container if running
    await this.stop().catch(() => {});

    const args = ['run', '-d', '--name', this.config.containerName];

    // Add ports
    this.config.ports.forEach(port => {
      args.push('-p', port);
    });

    // Add volumes
    this.config.volumes.forEach(volume => {
      args.push('-v', volume);
    });

    // Add environment variables
    Object.entries(this.config.environment).forEach(([key, value]) => {
      args.push('-e', `${key}=${value}`);
    });

    // Add image name
    args.push(this.config.imageName);

    return new Promise((resolve, reject) => {
      const run = spawn('docker', args, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      run.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Docker container started`);
          console.log(`🌐 Dashboard: http://localhost:3000`);
          console.log(`🔌 WebSocket: ws://localhost:3001`);
          resolve();
        } else {
          reject(new Error(`Docker run failed with code ${code}`));
        }
      });

      run.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    console.log(`🛑 Stopping Docker container: ${this.config.containerName}`);

    return new Promise((resolve) => {
      const stop = spawn('docker', ['stop', this.config.containerName], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      stop.on('close', () => {
        // Also remove the container
        const rm = spawn('docker', ['rm', this.config.containerName], {
          stdio: 'pipe',
          cwd: process.cwd()
        });

        rm.on('close', () => {
          console.log(`✅ Docker container stopped and removed`);
          resolve();
        });
      });
    });
  }

  async logs(): Promise<void> {
    console.log(`📋 Showing Docker container logs: ${this.config.containerName}`);

    return new Promise((resolve, reject) => {
      const logs = spawn('docker', ['logs', '-f', this.config.containerName], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      logs.on('close', resolve);
      logs.on('error', reject);
    });
  }

  async exec(command: string): Promise<void> {
    console.log(`🔧 Executing in container: ${command}`);

    const args = ['exec', '-it', this.config.containerName];
    args.push(...command.split(' '));

    return new Promise((resolve, reject) => {
      const exec = spawn('docker', args, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      exec.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Docker exec failed with code ${code}`));
        }
      });

      exec.on('error', reject);
    });
  }

  async composeUp(): Promise<void> {
    console.log(`🚀 Starting Docker Compose services`);

    return new Promise((resolve, reject) => {
      const compose = spawn('docker-compose', ['up', '-d'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      compose.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Docker Compose services started`);
          console.log(`🌐 Main App: http://localhost:3000`);
          console.log(`📊 Grafana: http://localhost:3002`);
          console.log(`📈 Prometheus: http://localhost:9090`);
          resolve();
        } else {
          reject(new Error(`Docker Compose failed with code ${code}`));
        }
      });

      compose.on('error', reject);
    });
  }

  async composeDown(): Promise<void> {
    console.log(`🛑 Stopping Docker Compose services`);

    return new Promise((resolve, reject) => {
      const compose = spawn('docker-compose', ['down'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      compose.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Docker Compose services stopped`);
          resolve();
        } else {
          reject(new Error(`Docker Compose down failed with code ${code}`));
        }
      });

      compose.on('error', reject);
    });
  }

  async status(): Promise<void> {
    console.log(`📊 Docker Status\n`);

    // Check if single container is running
    try {
      const ps = spawn('docker', ['ps', '--filter', `name=${this.config.containerName}`, '--format', 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let output = '';
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.on('close', () => {
        if (output.includes(this.config.containerName)) {
          console.log(`🐳 Single Container:`);
          console.log(output);
        } else {
          console.log(`🐳 Single Container: Not running`);
        }
      });
    } catch {
      console.log(`🐳 Single Container: Unable to check`);
    }

    // Check compose services
    try {
      const compose = spawn('docker-compose', ['ps'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let composeOutput = '';
      compose.stdout.on('data', (data) => {
        composeOutput += data.toString();
      });

      compose.on('close', () => {
        if (composeOutput.trim()) {
          console.log(`\n🐙 Compose Services:`);
          console.log(composeOutput);
        }
      });
    } catch {
      console.log(`\n🐙 Compose Services: Unable to check`);
    }
  }

  async clean(): Promise<void> {
    console.log(`🧹 Cleaning Docker resources`);

    // Stop and remove containers
    await this.stop().catch(() => {});

    // Remove dangling images
    const dangling = spawn('docker', ['image', 'prune', '-f'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    dangling.on('close', () => {
      console.log(`✅ Docker resources cleaned`);
    });
  }

  generateEnvTemplate(): string {
    return `# MCP Agent Governance Environment Variables
# Copy this to .env and fill in your values

# AI Providers (at least one required)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here

# BETS Integration
PLIVE_API_TOKEN=your_plive_api_token

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key

# Database
POSTGRES_PASSWORD=your_postgres_password

# Monitoring
GRAFANA_PASSWORD=admin_password

# Optional: Custom ports
PORT=3000
WS_PORT=3001

# Optional: File paths
OBSIDIAN_VAULT=/path/to/your/vault
SQLITE_DB_PATH=/app/data/syndicate.db
`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const docker = new DockerSetup();

  if (args.length === 0) {
    console.log(`🐳 Docker Setup for MCP Agent Governance v3.0

USAGE:
  bun docker:build          # Build Docker image
  bun docker:run             # Run container
  bun docker:stop            # Stop container
  bun docker:logs            # Show container logs
  bun docker:exec <command>  # Execute command in container
  bun docker:status          # Show container status
  bun docker:clean           # Clean Docker resources
  bun docker:compose:up      # Start full stack with compose
  bun docker:compose:down    # Stop compose stack
  bun docker:env             # Generate .env template

SINGLE CONTAINER:
  bun docker:build && bun docker:run  # Quick start
  bun docker:logs                     # Monitor logs
  bun docker:exec "bun rules:validate"  # Run commands

FULL STACK (with Redis, Postgres, Grafana):
  bun docker:compose:up               # Start all services
  bun docker:status                   # Check status
  bun docker:compose:down             # Stop all

PORTS:
  - 3000: Main web dashboard
  - 3001: WebSocket live server
  - 3002: Grafana (compose only)
  - 9090: Prometheus (compose only)
  - 5432: PostgreSQL (compose only)
  - 6379: Redis (compose only)

VOLUMES:
  - ./data → Persistent SQLite databases
  - ./logs → Application logs
  - ./dashboards → Generated reports
  - ./config → Configuration files

ENVIRONMENT:
  Run 'bun docker:env' to generate .env template
`);
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'build':
        await docker.build();
        break;

      case 'run':
        await docker.run();
        break;

      case 'stop':
        await docker.stop();
        break;

      case 'logs':
        await docker.logs();
        break;

      case 'exec':
        if (args.length < 2) {
          console.error('Usage: bun docker:exec <command>');
          process.exit(1);
        }
        const execCommand = args.slice(1).join(' ');
        await docker.exec(execCommand);
        break;

      case 'status':
        await docker.status();
        break;

      case 'clean':
        await docker.clean();
        break;

      case 'compose:up':
        await docker.composeUp();
        break;

      case 'compose:down':
        await docker.composeDown();
        break;

      case 'env':
        const envTemplate = docker.generateEnvTemplate();
        console.log(`📝 Environment Variables Template:\n`);
        console.log(envTemplate);
        console.log(`💡 Save this to .env file and customize values`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Use: bun docker --help');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
export { DockerSetup };

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}
