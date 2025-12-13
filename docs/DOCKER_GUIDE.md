# Docker Guide for CV Builder

## Overview

CV Builder uses a multi-container Docker architecture for development, testing, and production deployments. The system consists of three main services:

1. **Browser App** - React UI served with Vite
2. **API Server** - Express backend with Claude AI agents
3. **Browser Automation** - Playwright testing service for visual regression tests

## Architecture

### Service Containers

#### Browser App (`packages/browser-app/Dockerfile`)
- **Base**: node:24-alpine
- **Build**: Multi-stage (dependencies → build → production)
- **Purpose**: Production-optimized React app with Vite
- **Port**: 3000
- **Health Check**: HTTP GET / (200 OK)

#### API Server (`packages/api/Dockerfile`)
- **Base**: node:24-alpine
- **Build**: Multi-stage (dependencies → build → production)
- **Purpose**: Express server running compiled TypeScript
- **Port**: 3001
- **Health Check**: HTTP GET /health (returns `{"status":"ok"}`)
- **Dependencies**: agent-core, agent-graph (TypeScript sources)

#### Browser Automation (`packages/browser-automation/Dockerfile`)
- **Base**: mcr.microsoft.com/playwright:v1.40.0-jammy
- **Purpose**: Playwright-based visual regression testing
- **Port**: 3002
- **Health Check**: HTTP GET /health

## Quick Start

### Development (Local - No Docker)

```bash
# Run both API and browser app
pnpm dev:all

# Or run separately
pnpm dev:api    # Terminal 1: API server (port 3001)
pnpm dev        # Terminal 2: Browser app (port 3000)
```

### CI/CD Testing with Docker Compose

```bash
# Build and start all services
docker compose -f docker-compose.ci.yml up -d

# Check service health
curl http://localhost:3000              # Browser app
curl http://localhost:3001/health       # API
curl http://localhost:3002/health       # Browser automation

# View logs
docker compose -f docker-compose.ci.yml logs -f

# Run visual regression tests
pnpm --filter @cv-builder/browser-automation test:visual

# Stop all services
docker compose -f docker-compose.ci.yml down -v
```

## Docker Compose Configurations

### `docker-compose.ci.yml` (CI/CD)

Optimized for GitHub Actions and deterministic testing:

```yaml
services:
  browser-app:
    build:
      context: .
      dockerfile: packages/browser-app/Dockerfile
      target: production
      args:
        VITE_API_URL: http://api:3001/api  # Docker internal network
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 5s
      timeout: 3s
      retries: 12

  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
      target: production
    ports:
      - "3001:3001"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}  # From GitHub secrets
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]

  browser-automation:
    depends_on:
      browser-app:
        condition: service_healthy
      api:
        condition: service_healthy
    volumes:
      - ./packages/browser-automation/test-baselines:/app/test-baselines:ro
      - ./temp/screenshots:/app/temp/screenshots
```

**Key Features:**
- Health checks with proper retries
- Service dependency ordering (browser-automation waits for app + API)
- Fixed subnet (172.28.0.0/16) for deterministic networking
- Read-only baseline mounts
- Secret injection from environment

## Building Individual Services

### Browser App

```bash
# Build production image
docker build -f packages/browser-app/Dockerfile -t cv-builder-browser-app:latest --target production .

# Build with custom API URL
docker build -f packages/browser-app/Dockerfile \
  --build-arg VITE_API_URL=http://api:3001/api \
  -t cv-builder-browser-app:latest .

# Run standalone
docker run -p 3000:3000 cv-builder-browser-app:latest
```

### API Server

```bash
# Build production image
docker build -f packages/api/Dockerfile -t cv-builder-api:latest --target production .

# Run with API key
docker run -p 3001:3001 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  cv-builder-api:latest

# Test health endpoint
curl http://localhost:3001/health
```

### Browser Automation

```bash
# Build test image
docker build -f packages/browser-automation/Dockerfile -t cv-builder-automation:latest .

# Run tests (requires browser-app and API running)
docker run --network=host \
  -e BROWSER_APP_URL=http://localhost:3000 \
  -e API_URL=http://localhost:3001 \
  -v $(pwd)/packages/browser-automation/test-baselines:/app/test-baselines:ro \
  cv-builder-automation:latest
```

## Multi-Stage Build Details

### Browser App Stages

1. **base** - Node.js Alpine with pnpm
2. **dependencies** - Install workspace dependencies
3. **build** - Compile agent-core, build Vite app
4. **production** - Minimal runtime with `vite preview`

### API Server Stages

1. **base** - Node.js Alpine with pnpm
2. **dependencies** - Install workspace dependencies + copy agent sources
3. **build** - Compile TypeScript with `tsconfig.build.json`
4. **production** - Minimal runtime with `node dist/api/src/server.js`

**Important:** API's TypeScript compilation includes agent-core and agent-graph sources, resulting in `dist/api/src/` and `dist/agent-core/` directories.

## Environment Variables

### Browser App

Build-time variables (embedded in bundle):
- `VITE_API_URL` - API base URL (default: http://localhost:3001/api)

### API Server

Runtime variables:
- `ANTHROPIC_API_KEY` - Claude API key (required)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (test/production)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)

### Browser Automation

Runtime variables:
- `BROWSER_APP_URL` - Browser app URL (default: http://localhost:3000)
- `API_URL` - API URL (default: http://localhost:3001)
- `HEADLESS` - Run headless mode (default: true in CI)
- `CI` - CI environment flag

## GitHub Actions Integration

### Workflow: `.github/workflows/browser-automation-tests.yml`

```yaml
- name: Start services with Docker Compose
  run: docker compose -f docker-compose.ci.yml up -d
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

- name: Wait for services
  run: |
    timeout 60 bash -c 'until curl -sf http://localhost:3000 > /dev/null; do sleep 2; done'
    timeout 60 bash -c 'until curl -sf http://localhost:3001/health > /dev/null; do sleep 2; done'

- name: Run visual regression tests
  run: pnpm --filter @cv-builder/browser-automation test:visual

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: visual-diffs-${{ github.run_number }}
    path: temp/test-results/visual-diffs/
```

**Required GitHub Secret:**
- `ANTHROPIC_API_KEY` - Claude API key for agent operations

## Common Use Cases

### 1. Local Development Testing

```bash
# Build images locally to test CI configuration
docker compose -f docker-compose.ci.yml build

# Start services
docker compose -f docker-compose.ci.yml up

# Run visual tests
pnpm --filter @cv-builder/browser-automation test:visual

# Clean up
docker compose -f docker-compose.ci.yml down -v
```

### 2. Visual Regression Testing

```bash
# Start services in background
docker compose -f docker-compose.ci.yml up -d

# Wait for health checks
timeout 60 bash -c 'until curl -sf http://localhost:3000 > /dev/null; do sleep 2; done'

# Run tests with baseline comparison
pnpm --filter @cv-builder/browser-automation test:visual

# Update baselines if needed
pnpm --filter @cv-builder/browser-automation test:visual:update:all
```

### 3. CI/CD Pipeline Debugging

```bash
# Reproduce CI environment locally
export ANTHROPIC_API_KEY=sk-ant-...
export CI=true
export NODE_ENV=test

# Run exactly as CI does
docker compose -f docker-compose.ci.yml up -d
pnpm --filter @cv-builder/browser-automation test:comprehensive

# Check logs if failing
docker compose -f docker-compose.ci.yml logs browser-app
docker compose -f docker-compose.ci.yml logs api
```

## Networking

### Docker Compose Network (test-network)

Fixed subnet: `172.28.0.0/16`

**Service Discovery:**
- `browser-app:3000` - Accessible by other containers
- `api:3001` - Accessible by other containers
- `browser-automation:3002` - Accessible by other containers

**External Access:**
- `localhost:3000` - Browser app (host → container)
- `localhost:3001` - API (host → container)
- `localhost:3002` - Browser automation (host → container)

### Health Checks

All services implement health checks:

```bash
# Browser app
wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# API
wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Browser automation
wget --quiet --tries=1 --spider http://localhost:3002/health || exit 1
```

**Timing:**
- Interval: 5-30s
- Timeout: 3-10s
- Retries: 3-12
- Start period: 15-40s

## Troubleshooting

### Container Won't Start

```bash
# Check build logs
docker build -f packages/api/Dockerfile -t test-api .

# Check container logs
docker compose -f docker-compose.ci.yml logs api

# Interactive shell
docker run -it --entrypoint sh cv-builder-api:latest
```

### Health Check Failing

```bash
# Test health endpoint manually
curl -v http://localhost:3001/health

# Check service logs
docker compose -f docker-compose.ci.yml logs api | grep health

# Check if service is listening
docker exec <container-id> netstat -tuln | grep 3001
```

### TypeScript Compilation Errors

```bash
# Check if tsconfig.build.json exists
ls packages/api/tsconfig.build.json

# Test build locally
pnpm --filter @cv-builder/api build

# Check dist output structure
ls -R packages/api/dist/
```

### Visual Tests Failing

```bash
# Ensure baselines exist
ls packages/browser-automation/test-baselines/

# Check if services are accessible
curl http://localhost:3000
curl http://localhost:3001/health

# Run tests with verbose output
DEBUG=pw:api pnpm --filter @cv-builder/browser-automation test:visual
```

### Build Cache Issues

```bash
# Clean build all services
docker compose -f docker-compose.ci.yml build --no-cache

# Remove old images
docker image prune -a

# Clear pnpm store cache
docker builder prune
```

## Best Practices

### 1. Layer Caching

Optimize Dockerfile for faster builds:

```dockerfile
# ✅ Good - Copy package.json first (changes less frequently)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# ❌ Bad - Copy everything first
COPY . .
RUN pnpm install
```

### 2. Multi-Stage Builds

Use stages to minimize production image size:

```dockerfile
FROM base AS dependencies
# Install all dependencies

FROM dependencies AS build
# Build application

FROM base AS production
# Copy only production artifacts
```

### 3. Health Checks

Always implement health checks for service orchestration:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1
```

### 4. Secret Management

Never hardcode secrets:

```bash
# ✅ Good - Use environment variable
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# ❌ Bad - Hardcoded secret
ANTHROPIC_API_KEY=sk-ant-1234567890
```

### 5. Resource Limits

Set appropriate limits for CI:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

## Performance Optimization

### Build Time

- Use pnpm cache mount: `--mount=type=cache,target=/root/.pnpm-store`
- Copy dependencies before source code
- Use `.dockerignore` to exclude unnecessary files

### Runtime

- Use Alpine base images (smaller size)
- Multi-stage builds (production doesn't need build tools)
- Health check intervals tuned for responsiveness

### CI/CD

- Build images in parallel when possible
- Use GitHub Actions cache for Docker layers
- Set appropriate timeouts (15 min for full workflow)

## Security Considerations

1. **API Keys**: Stored in GitHub secrets, injected at runtime
2. **Read-Only Volumes**: Test baselines mounted as `:ro`
3. **Network Isolation**: Services on private network
4. **Health Checks**: Prevent deploying unhealthy containers
5. **No Root User**: Containers run as node user

## Maintenance

### Updating Base Images

```bash
# Update Node.js version in Dockerfiles
FROM node:24-alpine  # Change version here

# Update pnpm version
corepack prepare pnpm@9.15.4 --activate  # Change version here
```

### Updating Dependencies

```bash
# Update pnpm-lock.yaml
pnpm install

# Rebuild images
docker compose -f docker-compose.ci.yml build --no-cache
```

## Resources

- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Health Checks](https://docs.docker.com/reference/dockerfile/#healthcheck)
- [Node.js Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
