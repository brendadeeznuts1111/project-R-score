#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "fs";

/**
 * Setup configuration files for Surgical Precision Platform
 * Creates all necessary config files based on team size and deployment target
 */

interface SetupConfig {
  projectName: string;
  teamSize: "solo" | "small" | "full";
  deploymentTarget: "local" | "cloudflare" | "aws" | "hybrid";
  environment: "development" | "staging" | "production";
}

const setupConfiguration = (
  config: SetupConfig = {
    projectName: "surgical-precision-platform",
    teamSize: "full",
    deploymentTarget: "cloudflare",
    environment: "development",
  }
) => {
  console.log("🔧 Setting up Surgical Precision Platform configuration...");
  console.log(`📋 Project: ${config.projectName}`);
  console.log(`👥 Team Size: ${config.teamSize}`);
  console.log(`🎯 Deployment: ${config.deploymentTarget}`);
  console.log(`🌍 Environment: ${config.environment}`);

  // Ensure config directories exist
  mkdirSync("configs/team", { recursive: true });
  mkdirSync("configs/deployment", { recursive: true });
  mkdirSync("configs/environment", { recursive: true });

  // Create environment configuration
  const envConfig = generateEnvConfig(config);
  writeFileSync(".env", envConfig);
  writeFileSync(".env.template", envConfig);
  console.log("✅ Environment configuration created");

  // Create team configurations
  createTeamConfigs(config.teamSize);
  console.log("✅ Team configurations created");

  // Create deployment configurations
  createDeploymentConfigs(config.deploymentTarget);
  console.log("✅ Deployment configurations created");

  // Create development configuration
  createDevConfig(config);
  console.log("✅ Development configuration created");

  // Create bunfig.toml
  createBunfig(config);
  console.log("✅ Bun configuration created");

  console.log("🎉 Configuration setup completed!");
};

const generateEnvConfig = (config: SetupConfig): string => {
  return `# Surgical Precision Platform Environment Configuration
# Generated on: ${new Date().toISOString()}

# Project Information
PROJECT_NAME=${config.projectName}
PLATFORM_VERSION=2.1.0
ENVIRONMENT=${config.environment}

# Team Configuration
TEAM_SIZE=${config.teamSize}
ENABLE_TEAM_COORDINATION=${config.teamSize !== "solo"}

# Deployment Configuration
DEPLOYMENT_TARGET=${config.deploymentTarget}
CLOUDFLARE_ACCOUNT_ID=${config.deploymentTarget === "cloudflare" ? "your-account-id" : ""}
AWS_REGION=${config.deploymentTarget === "aws" ? "us-east-1" : ""}

# Database Configuration
DATABASE_PATH=./data/databases/
DATABASE_TYPE=sqlite
ENABLE_BACKUPS=true
BACKUP_INTERVAL=3600000

# Performance Configuration
MAX_CONCURRENT_OPERATIONS=${config.teamSize === "full" ? "2000" : config.teamSize === "small" ? "1000" : "500"}
PERFORMANCE_MODE=balanced
ENABLE_METRICS=true
METRICS_INTERVAL=30000

# Security Configuration
ENABLE_AUDIT_TRAAIL=true
SESSION_TIMEOUT=3600000
ENCRYPTION_KEY=your-encryption-key-here

# Development Configuration
LOG_LEVEL=${config.environment === "production" ? "warn" : "info"}
ENABLE_HOT_RELOAD=${config.environment === "development" ? "true" : "false"}
DEBUG_MODE=${config.environment === "development" ? "true" : "false"}

# API Configuration
API_PORT=3000
API_HOST=localhost
ENABLE_CORS=${config.environment === "development" ? "true" : "false"}

# MCP Configuration
MCP_SERVER_PORT=8787
MCP_ENABLE_CODE_SEARCH=true
MCP_ENABLE_HISTORY_CLI=true

# Matrix Service Configuration
MATRIX_SERVER_PORT=8080
MATRIX_ENABLE_INTEGRATION=true

# Zero-Collateral Operations
ENABLE_ZERO_COLLATERAL=true
RISK_ASSESSMENT_MODE=conservative
MAX_OPERATION_SIZE=10000
`;
};

const createTeamConfigs = (teamSize: string) => {
  const teamConfigs = {
    solo: {
      alice: {
        role: "Senior Architect",
        color: "#0066cc",
        responsibilities: [
          "system-design",
          "architecture",
          "performance-optimization",
        ],
        permissions: ["admin", "deploy", "configure"],
      },
    },
    small: {
      alice: {
        role: "Senior Architect",
        color: "#0066cc",
        responsibilities: [
          "system-design",
          "architecture",
          "performance-optimization",
        ],
        permissions: ["admin", "deploy", "configure"],
      },
      bob: {
        role: "Risk Analyst",
        color: "#ff9900",
        responsibilities: ["risk-analysis", "security", "compliance"],
        permissions: ["analyze", "monitor", "report"],
      },
    },
    full: {
      alice: {
        role: "Senior Architect",
        color: "#0066cc",
        responsibilities: [
          "system-design",
          "architecture",
          "performance-optimization",
        ],
        permissions: ["admin", "deploy", "configure"],
      },
      bob: {
        role: "Risk Analyst",
        color: "#ff9900",
        responsibilities: ["risk-analysis", "security", "compliance"],
        permissions: ["analyze", "monitor", "report"],
      },
      carol: {
        role: "Compliance Officer",
        color: "#9900cc",
        responsibilities: [
          "regulatory-compliance",
          "audit-trail",
          "policy-enforcement",
        ],
        permissions: ["audit", "compliance", "report"],
      },
      dave: {
        role: "Operations Lead",
        color: "#00cc66",
        responsibilities: [
          "deployment",
          "infrastructure",
          "operations-monitoring",
        ],
        permissions: ["deploy", "monitor", "maintain"],
      },
    },
  };

  const activeTeam = teamConfigs[teamSize as keyof typeof teamConfigs];

  Object.entries(activeTeam).forEach(([member, config]) => {
    const memberConfig = `# ${config.role} Configuration
# Team Member: ${member.toUpperCase()}

ROLE=${config.role}
COLOR=${config.color}
RESPONSIBILITIES=${config.responsibilities.join(",")}
PERMISSIONS=${config.permissions.join(",")}

# Workspace Configuration
WORKSPACE_COLOR=${config.color}
TERMINAL_THEME=${member}
EDITOR_THEME=surgical-precision-${member}

# Notification Preferences
ENABLE_NOTIFICATIONS=true
NOTIFICATION_LEVEL=all
ALERT_ON_FAILURE=true
ALERT_ON_SUCCESS=false
`;

    writeFileSync(`configs/team/${member}.conf`, memberConfig);
  });
};

const createDeploymentConfigs = (deploymentTarget: string) => {
  const configs = {
    local: {
      name: "Local Development",
      port: 3000,
      host: "localhost",
      ssl: false,
      database: "sqlite",
      cache: "memory",
    },
    cloudflare: {
      name: "Cloudflare Workers",
      port: 8787,
      host: "factory-wager.com",
      ssl: true,
      database: "sqlite",
      cache: "edge",
    },
    aws: {
      name: "AWS Lambda",
      port: 443,
      host: "api.amazonaws.com",
      ssl: true,
      database: "dynamodb",
      cache: "redis",
    },
    hybrid: {
      name: "Multi-Cloud",
      port: 443,
      host: "hybrid.surgical-precision.com",
      ssl: true,
      database: "sqlite",
      cache: "distributed",
    },
  };

  const config = configs[deploymentTarget as keyof typeof configs];

  const deploymentConfig = `# ${config.name} Deployment Configuration
# Generated on: ${new Date().toISOString()}

DEPLOYMENT_NAME=${config.name}
DEPLOYMENT_PORT=${config.port}
DEPLOYMENT_HOST=${config.host}
ENABLE_SSL=${config.ssl}
DATABASE_TYPE=${config.database}
CACHE_TYPE=${config.cache}

# Performance Settings
ENABLE_EDGE_CACHING=${config.cache === "edge" || config.cache === "distributed"}
ENABLE_GLOBAL_DISTRIBUTION=${deploymentTarget !== "local"}
CDN_ENDPOINT=${config.host}

# Security Settings
ENABLE_WAF=${deploymentTarget !== "local"}
ENABLE_DDoS_PROTECTION=${deploymentTarget !== "local"}
RATE_LIMITING=${deploymentTarget !== "local" ? "strict" : "disabled"}

# Monitoring
ENABLE_DISTRIBUTED_TRACING=${deploymentTarget !== "local"}
ENABLE_GLOBAL_MONITORING=${deploymentTarget !== "local"}
LOG_AGGREGATION=${deploymentTarget !== "local" ? "centralized" : "local"}
`;

  writeFileSync(
    `configs/deployment/${deploymentTarget}.conf`,
    deploymentConfig
  );
};

const createDevConfig = (config: SetupConfig) => {
  const devConfig = `# Surgical Precision Platform Development Configuration
# Generated on: ${new Date().toISOString()}

# Development Environment
NODE_ENV=${config.environment}
BUN_ENV=${config.environment}
DEBUG=${config.environment === "development" ? "*" : ""}

# Development Server
DEV_SERVER_PORT=3000
DEV_SERVER_HOST=localhost
ENABLE_HOT_RELOAD=${config.environment === "development"}
ENABLE_LIVE_RELOAD=${config.environment === "development"}

# Build Configuration
BUILD_TARGET=bun
BUILD_MODE=${config.environment === "production" ? "production" : "development"}
SOURCE_MAPS=${config.environment !== "production"}
MINIFY=${config.environment === "production"}

# Testing Configuration
TEST_TIMEOUT=30000
ENABLE_COVERAGE=${config.environment === "development"}
TEST_REPORTS=${config.environment !== "production"}
PARALLEL_TESTS=true

# Development Tools
ENABLE_ESLINT=true
ENABLE_PRETTIER=true
ENABLE_TYPE_CHECK=true
ENABLE_LINT_STAGED=${config.environment !== "production"}

# Development Database
DEV_DB_PATH=./data/databases/dev.db
ENABLE_DB_SEEDING=${config.environment === "development"}
DB_RESET_ON_START=${config.environment === "development"}

# Development Services
ENABLE_MOCK_SERVICES=${config.environment === "development"}
ENABLE_STUB_EXTERNAL_APIS=${config.environment === "development"}
ENABLE_LOCAL_AUTH=${config.environment === "development"}
`;

  writeFileSync("configs/development.conf", devConfig);
};

const createBunfig = (config: SetupConfig) => {
  const bunfig = `# Bun Configuration for Surgical Precision Platform
# Generated on: ${new Date().toISOString()}

[install]
# Cache configuration
cache = true
cache-dir = "./.bun-cache"
# Registry configuration
registry = "https://registry.npmjs.org"
# Lockfile configuration
lockfile = true
lockfile-save = true

[run]
# Script execution configuration
shell = ["bash", "-c"]
preload = ["./scripts/preload.ts"]

[build]
# Build configuration
target = "bun"
minify = ${config.environment === "production"}
sourcemap = ${config.environment !== "production"}
outdir = "./data/build-artifacts"

[test]
# Test configuration
preload = ["./scripts/test-setup.ts"]
coverage = ${config.environment === "development"}
coverageDir = "./coverage"

[debug]
# Debug configuration
port = 9229
host = "localhost"

# Environment-specific settings
${
  config.environment === "development"
    ? `
[dev]
hotReload = true
liveReload = true
`
    : ""
}

${
  config.environment === "production"
    ? `
[production]
minify = true
sourcemap = false
optimize = true
`
    : ""
}
`;

  writeFileSync("bunfig.toml", bunfig);
};

// Run configuration setup
if (import.meta.main) {
  try {
    // Parse command line arguments for configuration
    const args = process.argv.slice(2);
    const config: SetupConfig = {
      projectName: "surgical-precision-platform",
      teamSize: "full",
      deploymentTarget: "cloudflare",
      environment: "development",
    };

    // Override with command line args if provided
    args.forEach((arg, index) => {
      if (arg === "--team-size" && args[index + 1]) {
        config.teamSize = args[index + 1] as "solo" | "small" | "full";
      }
      if (arg === "--deployment" && args[index + 1]) {
        config.deploymentTarget = args[index + 1] as
          | "local"
          | "cloudflare"
          | "aws"
          | "hybrid";
      }
      if (arg === "--environment" && args[index + 1]) {
        config.environment = args[index + 1] as
          | "development"
          | "staging"
          | "production";
      }
      if (arg === "--project-name" && args[index + 1]) {
        config.projectName = args[index + 1];
      }
    });

    setupConfiguration(config);
    process.exit(0);
  } catch (error) {
    console.error("❌ Configuration setup failed:", error);
    process.exit(1);
  }
}

export { SetupConfig, setupConfiguration };
