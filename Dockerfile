# ==============================================================================
# ALFRIANCLOUD ANDROID VPS — GATEWAY DOCKERFILE FOR RAILWAY
# ==============================================================================
# This container runs the Node.js API Gateway, WebRTC/WebSocket streaming proxy,
# APK management server, and responsive control dashboard on Railway.
#
# NOTE: Railway does not permit nested KVM (/dev/kvm) or custom binder kernel
# modules. The Android OS instance runs on a dedicated VPS and connects to this
# gateway over a secure WireGuard / Tailscale / SSH private network tunnel.
# ==============================================================================

FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy source code and build config
COPY . .

# Build Vite client assets into /app/dist
RUN npm run build

# Compile server.ts into dist/server.js using esbuild
RUN npx esbuild server.ts --bundle --platform=node --target=node22 --outfile=dist/server.js --external:vite --external:express --external:ws --external:multer --external:dotenv

# ==============================================================================
# Production Image
# ==============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install android-tools-adb for local ADB communication over private tunnels
RUN apt-get update && apt-get install -y --no-install-recommends \
    android-tools-adb \
    ca-certificates \
    curl \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and compiled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

# Create directory for temporary uploaded APKs
RUN mkdir -p /tmp/alfrian-apks && chmod 777 /tmp/alfrian-apks

# Expose Railway default PORT
EXPOSE 3000

# Health check against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the ALFRIANCLOUD Gateway
CMD ["node", "dist/server.js"]
