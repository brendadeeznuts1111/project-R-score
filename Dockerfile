# Dockerfile for Bun Documentation System
FROM oven/bun:1.3.6-alpine AS builder

WORKDIR /app
COPY . .

RUN bun install --production
RUN bun build ./cli/integrated-cli.ts --outfile ./dist/cli.js --target bun --minify

FROM oven/bun:1.3.6-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts

# Create user for security
RUN addgroup -g 1001 bunuser && \
    adduser -D -u 1001 -G bunuser bunuser

USER bunuser

# Set up cache directory
RUN mkdir -p /home/bunuser/.cache/bun-docs && \
    chown -R bunuser:bunuser /home/bunuser/.cache

ENV HOME=/home/bunuser
ENV PATH="/app/dist:${PATH}"

# Expose documentation server port
EXPOSE 3000

ENTRYPOINT ["bun", "run", "cli/integrated-cli.ts"]
CMD ["serve"]
