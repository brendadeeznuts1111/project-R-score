# MCP Agent Governance - Production Docker Image
FROM oven/bun:1.3

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs/audit dashboards config

# Set permissions
RUN chmod +x scripts/*.ts bin/*

# Expose ports
EXPOSE 3000 3001 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/data || exit 1

# Default command
CMD ["bun", "run", "web:serve"]
