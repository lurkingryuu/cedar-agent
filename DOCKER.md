# Docker Setup Guide

This guide explains how to build and run Cedar Agent using Docker.

## Overview

Cedar Agent consists of two main components:
- **Backend**: Rust-based API server (port 8180)
- **Frontend**: Next.js admin dashboard (port 3000)

## Quick Start

### Using Docker Compose (Recommended)

The easiest way to run the full stack:

```bash
# Development mode (builds from source)
docker-compose up --build

# Production mode (uses pre-built images)
docker-compose -f docker-compose.prod.yml up
```

This will start both services:
- Backend API: http://localhost:8180
- Frontend Dashboard: http://localhost:3000

### Environment Variables

You can configure the services using environment variables:

```bash
# Set authentication token
export CEDAR_AGENT_AUTHENTICATION=your-secret-token

# Run with custom configuration
docker-compose up
```

Available environment variables:
- `CEDAR_AGENT_AUTHENTICATION`: Authentication token for API access
- `CEDAR_AGENT_PORT`: Backend port (default: 8180)
- `CEDAR_AGENT_LOG_LEVEL`: Log level (default: info)
- `FRONTEND_PORT`: Frontend port (default: 3000)

## Building Images

### Backend Image

```bash
# Build for current platform
docker build -t cedar-agent:latest .

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t cedar-agent:latest .
```

### Frontend Image

```bash
# Build for current platform
docker build -t cedar-agent-frontend:latest ./frontend

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t cedar-agent-frontend:latest ./frontend
```

## Running Individual Containers

### Backend Only

**Using environment variables:**

```bash
docker run -d \
  --name cedar-agent-backend \
  -p 8180:8180 \
  -e CEDAR_AGENT_PORT=8180 \
  -e CEDAR_AGENT_AUTHENTICATION=your-token \
  docker.io/lurkingryuu/cedar-agent:latest
```

**Using command-line arguments (recommended for custom configs):**

```bash
# Run with custom schema, policies, port, and log level
docker run -d \
  --name cedar-agent-backend \
  -p 8280:8280 \
  -v "$(pwd)/mysql_schemas:/app/mysql_schemas:ro" \
  docker.io/lurkingryuu/cedar-agent:latest \
  -l info \
  -s /app/mysql_schemas/schema.json \
  --policies /app/mysql_schemas/policies.json \
  --addr 0.0.0.0 \
  --port 8280
```

**Foreground mode (to see logs):**

```bash
docker run --rm \
  -p 8280:8280 \
  -v "$(pwd)/mysql_schemas:/app/mysql_schemas:ro" \
  docker.io/lurkingryuu/cedar-agent:latest \
  -l info \
  -s /app/mysql_schemas/schema.json \
  --policies /app/mysql_schemas/policies.json \
  --addr 0.0.0.0 \
  --port 8280
```

**Note**: Command-line arguments take precedence over environment variables. When mounting volumes, use absolute paths inside the container (e.g., `/app/mysql_schemas/...`).

### Frontend Only

```bash
docker run -d \
  --name cedar-agent-frontend \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1 \
  -e NEXT_PUBLIC_API_KEY=your-token \
  docker.io/lurkingryuu/cedar-agent-frontend:latest
```

**Note**: When running frontend separately, ensure `NEXT_PUBLIC_API_BASE_URL` points to an accessible backend URL (use `http://host.docker.internal:8180/v1` on Docker Desktop, or the actual host IP).

## Multi-Architecture Builds

The Dockerfiles support building for multiple architectures (linux/amd64, linux/arm64).

### Using Docker Buildx

**Using Makefile (Recommended):**

```bash
# Build and push multi-architecture images
make build-multiarch

# With specific version
make build-multiarch VERSION=v1.0.0

# With custom organization
DOCKER_ORG=myorg make build-multiarch
```

**Using the build script:**

```bash
# Build and push multi-architecture images
./scripts/build-and-push.sh

# With environment variables
VERSION=v1.0.0 DOCKER_ORG=myorg ./scripts/build-and-push.sh
```

**Manual buildx commands:**

```bash
# Create a new builder instance
docker buildx create --name multiarch --use --bootstrap

# Build and push for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t docker.io/lurkingryuu/cedar-agent:latest \
  --push \
  .
```

## CI/CD Integration

### GitHub Actions

The repository includes GitHub Actions workflows for automated builds:

- **`.github/workflows/docker-build.yml`**: Builds and pushes multi-arch images on push to main/master and tags
- **`.github/workflows/docker-build-single.yml`**: Manual workflow for building single-architecture images

### Required Secrets

Configure these secrets in your GitHub repository:

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub access token

### Image Tags

Images are automatically tagged with:
- `latest`: Latest build from main/master branch
- `v1.0.0`: Semantic version tags
- `v1.0`: Major.minor version tags
- `v1`: Major version tags
- Branch names: For feature branches

## Production Deployment

### Using Production Compose File

```bash
# Set version and registry
export VERSION=v1.0.0
export DOCKER_REGISTRY=docker.io
export DOCKER_ORG=lurkingryuu

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Resource Limits

The production compose file includes resource limits:
- Backend: 512MB memory, 2 CPUs max
- Frontend: 512MB memory, 1 CPU max

Adjust these in `docker-compose.prod.yml` based on your needs.

### Persistence

For production, consider mounting volumes for:
- Data files: `-v /path/to/data:/app/data`
- Policy files: `-v /path/to/policies:/app/policies`
- Schema files: `-v /path/to/schema:/app/schema`

## Health Checks

Both containers include health checks:

- **Backend**: Checks `/v1/healthy` endpoint
- **Frontend**: Checks root endpoint

View health status:
```bash
docker ps  # Shows health status
docker inspect --format='{{.State.Health.Status}}' cedar-agent-backend
```

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker logs cedar-agent-backend
   docker logs cedar-agent-frontend
   ```

2. Verify ports are not in use:
   ```bash
   lsof -i :8180
   lsof -i :3000
   ```

### Frontend can't connect to backend

1. Ensure both containers are on the same Docker network
2. Use service names (e.g., `backend:8180`) for internal communication
3. For external access, use `http://localhost:8180` or your host IP

### "exec format error" on x86_64 systems

If you encounter `exec format error` when running the image on an x86_64 system (even though the image manifest says amd64), this indicates a multi-architecture build issue. The binary inside the container may have been built for a different architecture.

**Solution 1: Build locally on your x86_64 VM (Recommended)**

Build the image directly on your x86_64 system:

```bash
# Build for your local platform
docker build -t cedar-agent:local .

# Run with your configuration
docker run --rm \
  -p 8280:8280 \
  -v "$(pwd)/mysql_schemas:/app/mysql_schemas:ro" \
  cedar-agent:local \
  -l info \
  -s /app/mysql_schemas/schema.json \
  --policies /app/mysql_schemas/policies.json \
  --addr 0.0.0.0 \
  --port 8280
```

**Solution 2: Force pull the correct platform**

If the image supports multi-arch, explicitly pull the amd64 variant:

```bash
# Pull specifically for linux/amd64
docker pull --platform linux/amd64 docker.io/lurkingryuu/cedar-agent:latest

# Run with platform specification
docker run --rm --platform linux/amd64 \
  -p 8280:8280 \
  -v "$(pwd)/mysql_schemas:/app/mysql_schemas:ro" \
  docker.io/lurkingryuu/cedar-agent:latest \
  -l info \
  -s /app/mysql_schemas/schema.json \
  --policies /app/mysql_schemas/policies.json \
  --addr 0.0.0.0 \
  --port 8280
```

**Solution 3: Rebuild multi-arch images**

If you're maintaining the images, rebuild them with proper cross-compilation support (the Dockerfile has been updated to support this):

```bash
# Rebuild and push multi-arch images
make build-multiarch
```

### Build fails

1. Clear Docker build cache:
   ```bash
   docker builder prune -a
   ```

2. Check Dockerfile syntax and dependencies

### Multi-arch build issues

1. Ensure buildx is installed and configured:
   ```bash
   docker buildx version
   docker buildx create --name multiarch --use
   ```

2. For ARM builds on x86, use QEMU emulation (usually automatic)

## Security Best Practices

1. **Use non-root users**: Both Dockerfiles run as non-root users
2. **Keep images updated**: Regularly update base images
3. **Scan for vulnerabilities**: Use tools like Trivy or Snyk
4. **Use secrets management**: Don't hardcode credentials
5. **Limit resources**: Use resource limits in production

## Image Sizes

Expected image sizes:
- Backend: ~50-80MB (compressed)
- Frontend: ~150-200MB (compressed)

## Support

For issues and questions:
- Check the main [README.md](README.md)
- Open an issue on GitHub
- Join the community Slack

