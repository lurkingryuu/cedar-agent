.PHONY: help build build-backend build-frontend build-multiarch push-native push-multiarch up down logs clean test

# Default target
help:
	@echo "Cedar Agent Docker Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make build              - Build both backend and frontend images"
	@echo "  make build-backend      - Build backend image only"
	@echo "  make build-frontend     - Build frontend image only"
	@echo "  make build-multiarch    - Build multi-architecture images"
	@echo "  make push-native        - Build and push native architecture images"
	@echo "  make push-multiarch     - Build and push multi-architecture images"
	@echo "  make up                 - Start services with docker-compose"
	@echo "  make down               - Stop services"
	@echo "  make logs               - View service logs"
	@echo "  make clean              - Remove containers and images"
	@echo "  make test               - Run tests in containers"
	@echo ""
	@echo "Environment variables:"
	@echo "  VERSION                 - Image version tag (default: latest)"
	@echo "  DOCKER_ORG              - Docker organization (default: lurkingryuu)"
	@echo "  REGISTRY                - Docker registry (default: docker.io)"
	@echo "  CEDAR_AGENT_AUTHENTICATION - API authentication token"
	@echo ""
	@echo "Examples:"
	@echo "  make push-native                       - Build and push native arch images"
	@echo "  make push-multiarch                    - Build and push multi-arch images"
	@echo "  make push-native VERSION=v1.0.0        - Build with specific version"
	@echo "  DOCKER_ORG=myorg make push-native      - Use different org"

# Build variables
VERSION ?= latest
DOCKER_ORG ?= lurkingryuu
REGISTRY ?= docker.io
BACKEND_IMAGE = $(REGISTRY)/$(DOCKER_ORG)/cedar-agent
FRONTEND_IMAGE = $(REGISTRY)/$(DOCKER_ORG)/cedar-agent-frontend

# Build both images
build: build-backend build-frontend

# Build backend image
build-backend:
	@echo "Building backend image..."
	docker buildx build --load -t $(BACKEND_IMAGE):$(VERSION) .

# Build frontend image
build-frontend:
	@echo "Building frontend image..."
	docker buildx build --load -t $(FRONTEND_IMAGE):$(VERSION) ./frontend

# Build multi-architecture images with buildx
build-multiarch:
	@echo "Building multi-architecture images for $(BACKEND_IMAGE) and $(FRONTEND_IMAGE)..."
	@if ! docker buildx ls | grep -q multiarch; then \
		echo "Creating buildx builder..."; \
		docker buildx create --name multiarch --use --bootstrap; \
	fi
	@echo "Building and pushing backend image..."
	docker buildx build --platform linux/amd64,linux/arm64 \
		-t $(BACKEND_IMAGE):$(VERSION) \
		-t $(BACKEND_IMAGE):latest \
		--push \
		--cache-from type=registry,ref=$(BACKEND_IMAGE):buildcache \
		--cache-to type=registry,ref=$(BACKEND_IMAGE):buildcache,mode=max \
		.
	@echo "Building and pushing frontend image..."
	docker buildx build --platform linux/amd64,linux/arm64 \
		-t $(FRONTEND_IMAGE):$(VERSION) \
		-t $(FRONTEND_IMAGE):latest \
		--push \
		--cache-from type=registry,ref=$(FRONTEND_IMAGE):buildcache \
		--cache-to type=registry,ref=$(FRONTEND_IMAGE):buildcache,mode=max \
		--build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1 \
		./frontend
	@echo "Multi-architecture build complete!"

# Build and push native architecture images (faster, single platform)
push-native:
	@echo "Building and pushing native architecture images for $(BACKEND_IMAGE) and $(FRONTEND_IMAGE)..."
	@echo "Building and pushing backend image..."
	docker buildx build \
		-t $(BACKEND_IMAGE):$(VERSION) \
		-t $(BACKEND_IMAGE):latest \
		--push \
		--cache-from type=registry,ref=$(BACKEND_IMAGE):buildcache \
		--cache-to type=registry,ref=$(BACKEND_IMAGE):buildcache,mode=max \
		.
	@echo "Building and pushing frontend image..."
	docker buildx build \
		-t $(FRONTEND_IMAGE):$(VERSION) \
		-t $(FRONTEND_IMAGE):latest \
		--push \
		--cache-from type=registry,ref=$(FRONTEND_IMAGE):buildcache \
		--cache-to type=registry,ref=$(FRONTEND_IMAGE):buildcache,mode=max \
		--build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1 \
		./frontend
	@echo "Native architecture build and push complete!"

# Build and push multi-architecture images (alias for build-multiarch)
push-multiarch: build-multiarch

# Start services
up:
	@echo "Starting services..."
	docker-compose up -d

# Stop services
down:
	@echo "Stopping services..."
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Clean up
clean:
	@echo "Cleaning up..."
	docker-compose down -v
	docker rmi $(BACKEND_IMAGE):$(VERSION) $(FRONTEND_IMAGE):$(VERSION) 2>/dev/null || true

# Run tests
test:
	@echo "Running tests..."
	docker-compose run --rm backend cargo test

# Production deployment
prod-up:
	@echo "Starting production services..."
	VERSION=$(VERSION) docker-compose -f docker-compose.prod.yml up -d

prod-down:
	@echo "Stopping production services..."
	docker-compose -f docker-compose.prod.yml down

