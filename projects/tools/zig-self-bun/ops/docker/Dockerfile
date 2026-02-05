# Dockerfile - Bun 13-byte config system
FROM oven/bun:1.3.5

WORKDIR /app

# Copy lockfile (immutable config baked in)
COPY bun.lockb .

# Copy package files
COPY package.json package.json
COPY tsconfig.json tsconfig.json

# Build with feature flags (compile-time)
ARG FEATURES=""
RUN if [ -n "$FEATURES" ]; then \
      bun build --feature $FEATURES ./src/app.ts --outdir ./dist; \
    else \
      bun build ./src/app.ts --outdir ./dist; \
    fi

# Runtime environment variables (runtime override)
ENV BUN_CONFIG_VERSION=1
ENV BUN_TERMINAL_MODE=cooked

# Expose metrics endpoint
EXPOSE 3000 9090

# Run with terminal mode (runtime)
CMD ["bun", "--terminal=raw", "./dist/app.js"]

