# Multi-stage build for Next.js frontend
# Supports multiple architectures: linux/amd64, linux/arm64

# Stage 1: Dependencies
FROM --platform=$BUILDPLATFORM node:20-slim AS deps

WORKDIR /app

# Install all dependencies (needed for build)
COPY package.json package-lock.json* ./
RUN npm ci && \
    npm cache clean --force

# Stage 2: Builder
FROM --platform=$BUILDPLATFORM node:20-slim AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time environment variables (can be overridden)
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1
ARG NEXT_PUBLIC_API_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_KEY=$NEXT_PUBLIC_API_KEY

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs

# Copy necessary files from standalone build
# Next.js standalone includes everything needed, but we need to ensure public and static are accessible
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Change ownership
RUN chown -R nextjs:nextjs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Allow runtime environment variables to override build-time values
# These will be available to the Node.js server process
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "server.js"]

