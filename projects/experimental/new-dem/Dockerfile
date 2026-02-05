# T3-Lattice Fractal Edge Finder - Production Dockerfile
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Install system dependencies for high-performance computing
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --production --frozen-lockfile

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 lattice

# Set ownership and permissions
RUN chown -R lattice:bunjs /app
USER lattice

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["bun", "run", "web/lattice-finder.ts"]