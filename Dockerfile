# ==============================================================================
# ALFRIANCLOUD ANDROID VPS — PRODUCTION DOCKERFILE FOR RAILWAY
# ==============================================================================
# Multi-stage build designed for zero-failure Railway deployments:
# - Stage 1 (builder): Installs dependencies, compiles Vite client + esbuild server
# - Stage 2 (runner): Lean production Node 22 environment with android-tools-adb
# ==============================================================================

FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build tools if native bindings need compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and .npmrc
COPY package*.json .npmrc* ./

# Install all dependencies (including devDependencies required for Vite and esbuild)
RUN npm install --no-audit --no-fund

# Copy source code and config
COPY . .

# Build client assets and compile server.ts to dist/server.js
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install android-tools-adb for secure local/tunnel ADB bridge communication
RUN apt-get update && apt-get install -y --no-install-recommends \
    android-tools-adb \
    ca-certificates \
    curl \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and .npmrc
COPY package*.json .npmrc* ./

# Install only production dependencies using npm install (resilient with/without lockfile)
RUN npm install --omit=dev --no-audit --no-fund

# Copy compiled frontend assets and bundled backend from builder
COPY --from=builder /app/dist ./dist

# Create directory for temporary uploaded APKs
RUN mkdir -p /tmp/alfrian-apks && chmod 777 /tmp/alfrian-apks

# Expose default port
EXPOSE 3000

# Health check against /health endpoint
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the ALFRIANCLOUD production server
CMD ["node", "dist/server.js"]
