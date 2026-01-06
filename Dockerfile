# Multi-stage build for cedar-agent backend
# Supports multiple architectures: linux/amd64, linux/arm64

# Stage 1: Build stage
# Using Rust 1.78+ to support Cargo.lock version 4
FROM --platform=$BUILDPLATFORM rust:1.85-slim-bullseye AS builder

# Install build dependencies and cross-compilation tools
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    gcc-aarch64-linux-gnu \
    gcc-x86-64-linux-gnu \
    libc6-dev-amd64-cross \
    && rm -rf /var/lib/apt/lists/*

# Set up cross-compilation targets
ARG TARGETPLATFORM
ARG TARGETARCH
ARG BUILDPLATFORM

# Determine target triple based on TARGETPLATFORM and set up linker config
RUN case ${TARGETPLATFORM} in \
    "linux/amd64") \
        echo "x86_64-unknown-linux-gnu" > /tmp/target_triple && \
        rustup target add x86_64-unknown-linux-gnu && \
        echo 'export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc' > /tmp/env_vars && \
        echo 'export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_AR=x86_64-linux-gnu-ar' >> /tmp/env_vars && \
        echo 'export PKG_CONFIG_ALLOW_CROSS=1' >> /tmp/env_vars && \
        echo 'export PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig' >> /tmp/env_vars ;; \
    "linux/arm64") \
        echo "aarch64-unknown-linux-gnu" > /tmp/target_triple && \
        rustup target add aarch64-unknown-linux-gnu && \
        echo 'export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc' > /tmp/env_vars && \
        echo 'export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_AR=aarch64-linux-gnu-ar' >> /tmp/env_vars && \
        echo 'export PKG_CONFIG_ALLOW_CROSS=1' >> /tmp/env_vars && \
        echo 'export PKG_CONFIG_PATH=/usr/lib/aarch64-linux-gnu/pkgconfig' >> /tmp/env_vars ;; \
    *) \
        rustc -vV | sed -n 's|host: ||p' > /tmp/target_triple && \
        rustup target add $(cat /tmp/target_triple) ;; \
    esac

WORKDIR /build

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock ./

# Create a dummy src directory to build dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    echo "" > src/lib.rs

ENV CARGO_TARGET_DIR=/build/target

# Build dependencies (this layer will be cached if Cargo.toml/Cargo.lock don't change)
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
    sh -c 'set -a; [ -f /tmp/env_vars ] && . /tmp/env_vars; set +a; cargo build --release --target $(cat /tmp/target_triple)' && \
    rm -rf src

# Copy actual source code
COPY src ./src

# Build the actual application
# Note: We need to touch the src files to ensure cargo rebuilds the binary
# After building, copy the binary outside the cache mount so it's available in the layer
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse \
    touch src/main.rs && \
    sh -c 'set -a; [ -f /tmp/env_vars ] && . /tmp/env_vars; set +a; \
    TARGET=$(cat /tmp/target_triple); \
    cargo build --release --target $TARGET && \
    cp /build/target/$TARGET/release/cedar-agent /build/cedar-agent && \
    ls -lh /build/cedar-agent && \
    file /build/cedar-agent || true'

# Stage 2: Runtime stage
ARG TARGETPLATFORM
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

# Copy binary from builder (using the copied location)
COPY --from=builder /build/cedar-agent /app/cedar-agent

# Change ownership to non-root user
RUN chown -R cedar:cedar /app

# Switch to non-root user
USER cedar

# Expose default port
EXPOSE 8180

# Health check (204 NoContent is success, but any HTTP response means server is up)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8180/v1/ || exit 1

# Set default environment variables
ENV ADDR=0.0.0.0
ENV PORT=8180
ENV RUST_LOG=info

# Use exec form for better signal handling
ENTRYPOINT ["/app/cedar-agent"]
