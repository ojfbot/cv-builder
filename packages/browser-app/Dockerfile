# Browser App Dockerfile
# Multi-stage build for production-optimized React application

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
COPY packages/browser-app/package.json ./packages/browser-app/
COPY packages/agent-core/package.json ./packages/agent-core/

# Install all dependencies with frozen lockfile
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# ===== Build Stage =====
FROM dependencies AS build

# Build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:3001/api

# Copy source code for agent-core (dependency - no build needed, uses TypeScript sources)
COPY packages/agent-core ./packages/agent-core

# Copy browser-app source
COPY packages/browser-app ./packages/browser-app

# Build browser-app with environment variables
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @resume-builder/browser-app build

# ===== Production Stage =====
FROM base AS production

# Install wget for health checks
RUN apk add --no-cache wget

# Copy dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/browser-app/node_modules ./packages/browser-app/node_modules

# Copy built artifacts and config
COPY --from=build /app/packages/browser-app/dist ./packages/browser-app/dist
COPY --from=build /app/packages/browser-app/package.json ./packages/browser-app/
COPY --from=build /app/packages/browser-app/vite.config.ts ./packages/browser-app/

# Copy agent-core source (needed for imports - uses TypeScript sources directly)
COPY --from=build /app/packages/agent-core/src ./packages/agent-core/src
COPY --from=build /app/packages/agent-core/package.json ./packages/agent-core/

# Set working directory to browser-app
WORKDIR /app/packages/browser-app

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Run Vite preview server
CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "3000"]
