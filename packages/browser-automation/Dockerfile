# Browser Automation Service Dockerfile
# Based on official Playwright image with Chromium pre-installed

FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# Set working directory
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy workspace configuration from root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# Copy browser-automation package.json
COPY packages/browser-automation/package.json ./packages/browser-automation/

# Install dependencies
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# Install Playwright browsers
RUN pnpm --filter @resume-builder/browser-automation exec playwright install chromium

# Copy TypeScript configuration
COPY packages/browser-automation/tsconfig.json ./packages/browser-automation/

# Copy source code, scripts, tests, and documentation
COPY packages/browser-automation/src ./packages/browser-automation/src
COPY packages/browser-automation/scripts ./packages/browser-automation/scripts
COPY packages/browser-automation/tests ./packages/browser-automation/tests
COPY packages/browser-automation/docs ./packages/browser-automation/docs

# Build TypeScript
WORKDIR /app/packages/browser-automation
RUN pnpm run build

# Create screenshots output directory
RUN mkdir -p /app/packages/browser-automation/screenshots

# Expose API port
EXPOSE 3002

# Environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=3002
ENV HEADLESS=true
ENV BROWSER_APP_URL=http://browser-app:3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Run the server (from packages/browser-automation working directory)
CMD ["node", "dist/server.js"]
