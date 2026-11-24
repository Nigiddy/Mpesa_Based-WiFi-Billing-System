# Multi-stage production Dockerfile for KIBARUANI Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies required for native modules and Prisma query engine on Alpine (musl)
RUN apk add --no-cache openssl python3 make g++

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies needed for Prisma CLI)
RUN npm ci

# Generate Prisma Client binary for linux-musl
RUN npx prisma generate

# Prune dev dependencies for a clean production package
RUN npm prune --production

# -----------------------------------------------------------------------------
# Runtime stage
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime OpenSSL required by Prisma query engine and tini for PID 1 signal management
RUN apk add --no-cache openssl tini

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user and application directories
RUN addgroup -S nodejs -g 1001 && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Copy production dependencies and generated Prisma client from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Copy application source code
COPY --chown=nodejs:nodejs index.js ./
COPY --chown=nodejs:nodejs scripts ./scripts
COPY --chown=nodejs:nodejs config ./config
COPY --chown=nodejs:nodejs routes ./routes
COPY --chown=nodejs:nodejs middleware ./middleware
COPY --chown=nodejs:nodejs services ./services
COPY --chown=nodejs:nodejs utils ./utils
COPY --chown=nodejs:nodejs validators ./validators
COPY --chown=nodejs:nodejs workers ./workers
COPY --chown=nodejs:nodejs lib ./lib
COPY --chown=nodejs:nodejs hotspot ./hotspot

USER nodejs

EXPOSE 5000

# Use tini as init process to handle SIGTERM/SIGINT and reap zombies cleanly
ENTRYPOINT ["/sbin/tini", "--"]

# Execute production starter (runs prisma migrate deploy synchronously before launching index.js)
CMD ["node", "scripts/start.js"]
