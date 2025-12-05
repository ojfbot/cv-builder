# Multi-stage build for CV Builder Agent System
FROM node:24-alpine AS base

# Enable Corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install tsx globally for running TypeScript
RUN pnpm add -g tsx

WORKDIR /app

# Copy package files and pnpm workspace config
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY packages/agent-core/package.json ./packages/agent-core/

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/agent-core/node_modules ./packages/agent-core/node_modules
COPY packages/agent-core ./packages/agent-core
COPY .env.local* ./.env.local 2>/dev/null || true

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=development

# Default command runs the CLI
CMD ["pnpm", "--filter", "@cv-builder/agent-core", "cli"]

# Production stage
FROM base AS production
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/agent-core/node_modules ./packages/agent-core/node_modules
COPY packages/agent-core ./packages/agent-core

# Create data directory
RUN mkdir -p /app/data

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

CMD ["pnpm", "--filter", "@cv-builder/agent-core", "cli"]
