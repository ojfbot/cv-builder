# Browser Automation Service Dockerfile
# Based on official Playwright image with Chromium pre-installed

FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Install Node.js dependencies first (for better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Create screenshots output directory
RUN mkdir -p /app/screenshots

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

# Run the server
CMD ["node", "dist/server.js"]
