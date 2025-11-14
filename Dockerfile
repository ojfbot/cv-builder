# Multi-stage build for CV Builder Agent System
FROM node:20-alpine AS base

# Install tsx globally for running TypeScript
RUN npm install -g tsx

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/agent-core/package.json ./packages/agent-core/

# Install dependencies
FROM base AS deps
RUN npm ci

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
CMD ["npm", "run", "cli", "--workspace=@cv-builder/agent-core"]

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

CMD ["npm", "run", "cli", "--workspace=@cv-builder/agent-core"]
