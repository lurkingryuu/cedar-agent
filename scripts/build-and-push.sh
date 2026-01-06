#!/bin/bash
# Script to build and push multi-architecture Docker images using buildx

set -e

# Default values
VERSION=${VERSION:-latest}
DOCKER_ORG=${DOCKER_ORG:-lurkingryuu}
REGISTRY=${REGISTRY:-docker.io}
BACKEND_IMAGE="${REGISTRY}/${DOCKER_ORG}/cedar-agent"
FRONTEND_IMAGE="${REGISTRY}/${DOCKER_ORG}/cedar-agent-frontend"
PLATFORMS="linux/amd64,linux/arm64"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building and pushing multi-architecture Docker images${NC}"
echo "Registry: ${REGISTRY}"
echo "Organization: ${DOCKER_ORG}"
echo "Version: ${VERSION}"
echo "Platforms: ${PLATFORMS}"
echo ""

# Check if user is logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}Warning: Not logged in to Docker Hub. Attempting to login...${NC}"
    docker login
fi

# Create buildx builder if it doesn't exist
if ! docker buildx ls | grep -q "multiarch"; then
    echo -e "${GREEN}Creating buildx builder 'multiarch'...${NC}"
    docker buildx create --name multiarch --use --bootstrap
else
    echo -e "${GREEN}Using existing buildx builder 'multiarch'...${NC}"
    docker buildx use multiarch
fi

# Build and push backend
echo -e "${GREEN}Building and pushing backend image: ${BACKEND_IMAGE}${NC}"
docker buildx build \
    --platform ${PLATFORMS} \
    -t ${BACKEND_IMAGE}:${VERSION} \
    -t ${BACKEND_IMAGE}:latest \
    --push \
    --cache-from type=registry,ref=${BACKEND_IMAGE}:buildcache \
    --cache-to type=registry,ref=${BACKEND_IMAGE}:buildcache,mode=max \
    .

# Build and push frontend
echo -e "${GREEN}Building and pushing frontend image: ${FRONTEND_IMAGE}${NC}"
docker buildx build \
    --platform ${PLATFORMS} \
    -t ${FRONTEND_IMAGE}:${VERSION} \
    -t ${FRONTEND_IMAGE}:latest \
    --push \
    --cache-from type=registry,ref=${FRONTEND_IMAGE}:buildcache \
    --cache-to type=registry,ref=${FRONTEND_IMAGE}:buildcache,mode=max \
    --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1 \
    ./frontend

echo ""
echo -e "${GREEN}✓ Successfully built and pushed multi-architecture images!${NC}"
echo ""
echo "Backend:  ${BACKEND_IMAGE}:${VERSION}"
echo "Frontend: ${FRONTEND_IMAGE}:${VERSION}"
echo ""
echo "To pull and run:"
echo "  docker pull ${BACKEND_IMAGE}:${VERSION}"
echo "  docker pull ${FRONTEND_IMAGE}:${VERSION}"

