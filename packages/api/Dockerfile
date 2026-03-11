# API Service Dockerfile
# Multi-stage build for production-optimized Express API

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS base

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# ===== Dependencies Stage =====
FROM base AS dependencies

# Copy all package.json files for workspace
COPY packages/api/package.json ./packages/api/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/agent-graph/package.json ./packages/agent-graph/

# Copy workspace source files (needed for file: dependencies)
COPY packages/agent-core ./packages/agent-core
COPY packages/agent-graph ./packages/agent-graph

# Install all dependencies with frozen lockfile
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# ===== Build Stage =====
FROM dependencies AS build

# Copy API source (dependencies already copied in previous stage)
COPY packages/api/src ./packages/api/src
COPY packages/api/tsconfig*.json ./packages/api/

# Build API (this will compile TypeScript)
RUN pnpm --filter @resume-builder/api build

# ===== Production Stage =====
FROM base AS production

# Install wget for health checks
RUN apk add --no-cache wget

# Copy workspace configuration (needed for pnpm to work)
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=dependencies /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=dependencies /app/packages/agent-core/node_modules ./packages/agent-core/node_modules
COPY --from=dependencies /app/packages/agent-graph/node_modules ./packages/agent-graph/node_modules

# Copy API source and tsconfig (run with tsx for TypeScript workspace imports)
COPY --from=build /app/packages/api/src ./packages/api/src
COPY --from=build /app/packages/api/tsconfig*.json ./packages/api/
COPY --from=build /app/packages/api/package.json ./packages/api/

# Copy agent-core source (needed for imports - uses TypeScript sources)
COPY --from=build /app/packages/agent-core/src ./packages/agent-core/src
COPY --from=build /app/packages/agent-core/tsconfig.json ./packages/agent-core/
COPY --from=build /app/packages/agent-core/package.json ./packages/agent-core/

# Copy agent-graph source (needed for imports - uses TypeScript sources)
COPY --from=build /app/packages/agent-graph/src ./packages/agent-graph/src
COPY --from=build /app/packages/agent-graph/tsconfig.json ./packages/agent-graph/
COPY --from=build /app/packages/agent-graph/package.json ./packages/agent-graph/

# Set working directory to api
WORKDIR /app/packages/api

# Expose port
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Run the API server with tsx (handles TypeScript workspace imports)
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
