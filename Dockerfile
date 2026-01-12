# Multi-stage build for cedar-agent backend
# Supports multiple architectures: linux/amd64, linux/arm64

# Stage 1: Build stage
# We remove --platform=$BUILDPLATFORM so that Docker runs this stage
# for the architecture we are targeting (using QEMU if necessary).
FROM rust:1.85-slim-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy src directory to build dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    echo "" > src/lib.rs

# Build dependencies (this layer will be cached if Cargo.toml/Cargo.lock don't change)
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
    cargo build --release && \
    rm -rf src

# Copy actual source code
COPY src ./src

# Build the actual application
# touch src/main.rs ensures cargo rebuilds the binary with actual source
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
    touch src/main.rs && \
    cargo build --release && \
    cp target/release/cedar-agent /build/cedar-agent

# Stage 2: Runtime stage
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    grep \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r cedar && useradd -r -g cedar cedar

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/cedar-agent /app/cedar-agent

# Change ownership to non-root user
RUN chown -R cedar:cedar /app

# Switch to non-root user
USER cedar

# Expose default port
EXPOSE 8180

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8180/v1/ || exit 1

# Set default environment variables
ENV ADDR=0.0.0.0
ENV PORT=8180
ENV RUST_LOG=info

# Use exec form for better signal handling
ENTRYPOINT ["/app/cedar-agent"]
