# Docker Guide for CV Builder

## Overview

The CV Builder agent system is containerized for easy deployment and isolation. The browser app can also run in a container for development.

## Architecture

### Agent System Container

The agent core runs in a lightweight Node.js Alpine container:
- **Base**: node:20-alpine
- **Purpose**: Run Claude-powered AI agents
- **Storage**: Volume-mounted data directory
- **Modes**: Interactive CLI or headless automation

### Browser App Container (Optional)

For development, the browser app can also run containerized:
- **Base**: node:20-alpine
- **Purpose**: React UI with Vite dev server
- **Ports**: 3000 (dev server)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start both services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Using Docker Directly

```bash
# Build the agent image
docker build -t cv-builder-agents .

# Run interactively
docker run -it --rm \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  cv-builder-agents

# Run headless
docker run -it --rm \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  cv-builder-agents \
  npm run cli:headless --workspace=@cv-builder/agent-core
```

## Docker Compose Services

### Agent Service

```yaml
services:
  agents:
    build: .
    volumes:
      - ./packages/agent-core:/app/packages/agent-core
      - ./data:/app/data
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

**Usage:**
```bash
docker-compose up agents
```

### Browser App Service

```yaml
services:
  browser-app:
    image: node:20-alpine
    volumes:
      - ./packages/browser-app:/app
    ports:
      - "3000:3000"
```

**Usage:**
```bash
docker-compose up browser-app
# Access at http://localhost:3000
```

## Environment Variables

Create `.env` file:

```bash
# Required for agent system
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional for browser app
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Data Persistence

### Agent Data

The `/app/data` directory is mounted as a volume:

```bash
docker run -v $(pwd)/data:/app/data cv-builder-agents
```

All agent-generated files (resumes, job analysis, etc.) are stored here.

### Browser Data

Browser app uses LocalStorage - no volume needed for development.

## Common Use Cases

### 1. Development with Hot Reload

```bash
# Start both services with code mounted
docker-compose up
```

Changes to code are automatically reflected (volume mounted).

### 2. Production Agent System

```bash
# Build production image
docker build --target production -t cv-builder-agents:prod .

# Run in production
docker run -d \
  --name cv-builder-agents \
  -v /path/to/data:/app/data \
  --env-file .env \
  --restart unless-stopped \
  cv-builder-agents:prod
```

### 3. CI/CD Pipeline

```bash
# In your CI pipeline
docker build -t cv-builder-agents:${CI_COMMIT_SHA} .
docker push registry.example.com/cv-builder-agents:${CI_COMMIT_SHA}
```

### 4. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cv-builder-agents
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: agents
        image: cv-builder-agents:latest
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: anthropic-secret
              key: api-key
        volumeMounts:
        - name: data
          mountPath: /app/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: cv-builder-data
```

## Build Stages

### Development Stage

```dockerfile
FROM base AS development
# Includes all dev dependencies
# Hot reload enabled
# tsx for running TypeScript
```

**Use:**
```bash
docker build --target development -t cv-builder-dev .
```

### Production Stage

```dockerfile
FROM base AS production
# Production optimized
# Minimal dependencies
# Non-root user
```

**Use:**
```bash
docker build --target production -t cv-builder-prod .
```

## Networking

### Docker Compose Network

Services can communicate via service names:

```yaml
networks:
  cv-builder-network:
    driver: bridge
```

**Example:** Browser app could call agent API at `http://agents:8080`

### External Access

```bash
# Expose agent API (if implemented)
docker run -p 8080:8080 cv-builder-agents

# Expose browser app
docker run -p 3000:3000 cv-builder-browser
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs <container-id>

# Interactive shell
docker run -it --entrypoint sh cv-builder-agents
```

### API Key Issues

```bash
# Verify env vars
docker run --rm cv-builder-agents env | grep ANTHROPIC

# Pass directly (not recommended for production)
docker run -e ANTHROPIC_API_KEY=sk-ant-... cv-builder-agents
```

### Volume Permission Issues

```bash
# Check ownership
docker run -v $(pwd)/data:/app/data cv-builder-agents ls -la /app/data

# Fix permissions
sudo chown -R 1001:1001 ./data
```

### Build Cache Issues

```bash
# Clean build
docker build --no-cache -t cv-builder-agents .

# Remove old images
docker image prune -a
```

## Best Practices

1. **Never commit .env files** - Use .env.example as template
2. **Use specific tags** - Avoid :latest in production
3. **Multi-stage builds** - Separate dev and prod images
4. **Health checks** - Add health check endpoints
5. **Resource limits** - Set memory/CPU limits
6. **Logging** - Configure proper log aggregation
7. **Secrets management** - Use Docker secrets or external vault

## Security Considerations

1. **API Keys**: Never hardcode, use environment variables
2. **User Permissions**: Container runs as non-root user (1001)
3. **Network Isolation**: Use internal networks when possible
4. **Image Scanning**: Scan images for vulnerabilities
5. **Updates**: Keep base images updated

## Performance Optimization

### Reduce Image Size

```dockerfile
# Use alpine base
FROM node:20-alpine

# Remove dev dependencies in production
RUN npm ci --production

# Multi-stage builds
COPY --from=builder /app/dist ./dist
```

### Layer Caching

```dockerfile
# Copy package files first
COPY package*.json ./
RUN npm ci

# Then copy source (changes frequently)
COPY . .
```

### Volume Performance

```yaml
volumes:
  # For macOS/Windows, use delegated for better performance
  - ./data:/app/data:delegated
```

## Monitoring

### Container Stats

```bash
docker stats cv-builder-agents
```

### Logs

```bash
# Follow logs
docker logs -f cv-builder-agents

# Last 100 lines
docker logs --tail 100 cv-builder-agents
```

### Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1
```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
