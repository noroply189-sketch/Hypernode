# ==============================================================================
# ALFRIANCLOUD ANDROID VPS — ZERO-ERROR PRODUCTION DOCKERFILE FOR RAILWAY
# ==============================================================================
FROM node:22-bookworm-slim

WORKDIR /app

# Install system utilities & ADB tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    android-tools-adb \
    ca-certificates \
    curl \
    iproute2 \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Copy package configuration
COPY package*.json .npmrc* ./

# Install dependencies safely (tolerates presence or absence of lockfile)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy full application source code
COPY . .

# Build Vite client and compile server.ts to dist/server.js
RUN npm run build

# Create directory for uploaded APKs
RUN mkdir -p /tmp/alfrian-apks && chmod 777 /tmp/alfrian-apks

EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the production server
CMD ["node", "dist/server.js"]
