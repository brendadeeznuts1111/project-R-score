# Multi-stage Docker build for Bun Proxy API
# Supports private registry integration

# Base stage with Bun
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json bun.lockb ./
COPY .npmrc* ./
COPY bunfig.toml* ./

# Install dependencies from private registry
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    if [ -f /root/.npmrc ]; then \
        cp /root/.npmrc ./.npmrc; \
    fi && \
    bun install --frozen-lockfile --production

# Development stage
FROM base AS dev
COPY package.json bun.lockb ./
COPY .npmrc* ./
COPY bunfig.toml* ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY types/ ./types/
COPY config/ ./config/
COPY server/ ./server/

# Install all dependencies
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    if [ -f /root/.npmrc ]; then \
        cp /root/.npmrc ./.npmrc; \
    fi && \
    bun install --frozen-lockfile

EXPOSE 3000
CMD ["bun", "run", "dev"]

# Builder stage
FROM base AS builder
COPY package.json bun.lockb ./
COPY .npmrc* ./
COPY bunfig.toml* ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY types/ ./types/
COPY config/ ./config/
COPY server/ ./server/

# Install dependencies
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    if [ -f /root/.npmrc ]; then \
        cp /root/.npmrc ./.npmrc; \
    fi && \
    bun install --frozen-lockfile

# Build the application
RUN bun run build

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 bun && \
    adduser --system --uid 1001 --gid 1001 bun

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy runtime files
COPY --from=builder /app/.env.example ./.env.example

# Set permissions
RUN chown -R bun:bun /app
USER bun

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun --version || exit 1

EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "run", "dist/index.js"]

# Publishing stage (for building package)
FROM base AS publisher
COPY package.json bun.lockb ./
COPY .npmrc* ./
COPY bunfig.toml* ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY types/ ./types/
COPY config/ ./config/
COPY server/ ./server/
COPY scripts/ ./scripts/

# Install dependencies
RUN --mount=type=secret,id=npm_token,target=/root/.npmrc \
    if [ -f /root/.npmrc ]; then \
        cp /root/.npmrc ./.npmrc; \
    fi && \
    bun install --frozen-lockfile

# Build and prepare package
RUN bun run build && \
    bun run prepublishOnly

# Default stage
FROM production
