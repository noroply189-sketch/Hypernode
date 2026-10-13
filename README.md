# ALFRIANCLOUD ANDROID VPS — RAILWAY

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Railway](https://img.shields.io/badge/Railway-Deployment_Ready-0B0D0E?logo=railway&logoColor=white)](https://railway.com/)
[![Android](https://img.shields.io/badge/Android-13.0_(Redroid)-3DDC84?logo=android&logoColor=white)](https://github.com/remote-android/redroid-doc)

A high-performance Cloud Android Virtual Private Server (VPS) management dashboard, real-time WebRTC/Canvas remote control gateway, APK deployment pipeline, and DevOps infrastructure architecture.

---

## 1. Technical Architecture & Railway Constraint Analysis

### The Dual-Tier Solution (Gateway + Runner)
Running virtual Android at scale requires specific Linux kernel modules (`binder_linux`, `ashmem_linux`) and privileged access to mount **BinderFS** (`/dev/binder`). Shared serverless container runtimes like Railway do not provide nested KVM (`/dev/kvm`), do not permit `--privileged` Docker containers, and cannot load custom out-of-tree kernel modules.

To achieve 100% stability, security, and true 24/7 AFK persistence, ALFRIANCLOUD uses a **Split Architecture**:

```
 ┌────────────────────────────────────────────────────────┐
 │                   USER BROWSER                         │
 │  (Interactive Touch / Swipe / Keyboard / Live Stream)  │
 └───────────────────────────▲────────────────────────────┘
                             │ WebSocket & HTTPS
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │               ALFRIANCLOUD GATEWAY (RAILWAY)           │
 │  • Node.js 22 LTS API Gateway & Web Interface          │
 │  • Multi-stage Docker deployment (Dockerfile)          │
 │  • Healthcheck endpoint (/health)                      │
 │  • APK validation (ZIP magic bytes & manifest check)   │
 │  • ADB Bridge Client (android-tools-adb)               │
 └───────────────────────────▲────────────────────────────┘
                             │
            Private WireGuard / Tailscale Tunnel
            (ADB Port 5555 is NEVER exposed to 0.0.0.0)
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │           ANDROID VPS RUNNER (DEDICATED LINUX)         │
 │  • Ubuntu 22.04 LTS (Kernel 5.15+ with binder_linux)   │
 │  • Redroid 13 Container (Privileged + Persistent /data)│
 │  • Hardware / Guest GPU Acceleration                   │
 │  • Bound strictly to 127.0.0.1:5555 or wg0             │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Repository Structure

```
├── .env.example              # Environment variables blueprint
├── .gitignore                # Comprehensive Git exclusions
├── .npmrc                    # NPM configuration (legacy-peer-deps enabled)
├── Dockerfile                # Multi-stage production container for Railway
├── Procfile                  # Platform process definition
├── railway.json              # Railway deployment manifest and health check config
├── setup-android-vps.sh      # Automated bash installer for Ubuntu Linux VPS
├── docker-compose.vps.yml    # Docker Compose manifest for Redroid VPS runner
├── package.json              # Dependencies and build scripts
├── server.ts                 # Full-stack Express API, WebSocket, and ADB Gateway
├── src/
│   ├── components/
│   │   ├── Navbar.tsx            # Header, quick actions, node selector
│   │   ├── ScreenViewer.tsx      # Interactive Android canvas, touch, hardware keys
│   │   ├── ApkManager.tsx        # Drag-and-drop APK upload & package manager
│   │   ├── HardwareMonitor.tsx   # RAM, storage, battery, 24/7 AFK stability meter
│   │   ├── AdbTerminal.tsx       # Live Logcat stream and interactive ADB shell
│   │   ├── DeploymentGuide.tsx   # Interactive technical documentation & script export
│   │   └── NodeSettingsModal.tsx # VPS IP, port, and live latency tester
│   ├── server/
│   │   ├── adb-service.ts        # ADB client interface, inputs, metrics, packages
│   │   ├── apk-validator.ts      # PK\x03\x04 signature verification & size enforcement
│   │   ├── audit-service.ts      # Kernel capability, KVM, and environment auditor
│   │   └── auth-service.ts       # Rate-limiting, session tokens, and security
│   ├── App.tsx                   # Main state machine and application view
│   ├── index.css                 # Global styling and scrollbars
│   ├── main.tsx                  # React DOM entry point
│   └── types.ts                  # TypeScript interfaces
├── tsconfig.json             # TypeScript compiler configuration
└── vite.config.ts            # Vite bundler configuration
```

---

## 3. Deployment Pipeline: Railway Gateway

### Step 1: Push Code to GitHub
Ensure you push the updated `Dockerfile`, `.npmrc`, `package.json`, and `server.ts` to your repository:

```bash
git add .
git commit -m "feat: complete alfriancloud android vps railway gateway"
git push origin main
```

### Step 2: Configure Railway
1. Open your [Railway Dashboard](https://railway.com/) and link your GitHub repository.
2. Railway detects `Dockerfile` automatically via `railway.json`.
3. Set the required Environment Variables in Railway:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | Application HTTP port | `3000` (Assigned automatically) |
| `NODE_ENV` | Runtime environment | `production` |
| `ADMIN_PASSWORD` | Dashboard administrator password | `change_this_to_strong_pass` |
| `DEFAULT_ANDROID_HOST` | Private IP of your Linux VPS Runner | `10.0.0.2` (or Tailscale IP) |
| `DEFAULT_ANDROID_ADB_PORT` | Android Debug Bridge port | `5555` |
| `STREAM_MAX_FPS` | Maximum screen stream framerate | `30` |
| `SCREEN_DEFAULT_WIDTH` | Virtual display width | `720` |
| `SCREEN_DEFAULT_HEIGHT` | Virtual display height | `1280` |
| `SCREEN_DEFAULT_DPI` | Display density | `320` |

4. Railway performs the multi-stage build, runs `npm run build`, and monitors health checks at `/health`.

---

## 4. Setup: Dedicated Linux VPS Runner (Redroid)

To run the virtual Android operating system, provision an Ubuntu 22.04 LTS / 24.04 LTS instance (e.g., Hetzner, OVH, or Oracle Cloud Ampere A1):

### Method A: Automated One-Click Script
Run the verified setup script with root privileges:

```bash
sudo bash setup-android-vps.sh
```

### Method B: Manual Configuration
1. **Install Kernel Headers & Load Binder Modules**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y linux-modules-extra-$(uname -r)
   sudo modprobe binder_linux devices="binder,hwbinder,vndbinder"
   echo "binder_linux" | sudo tee -a /etc/modules-load.d/redroid.conf
   ```

2. **Harden Firewall (UFW)**:
   ```bash
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp
   # Allow ADB ONLY via WireGuard (wg0) or localhost:
   sudo ufw allow in on wg0 to any port 5555
   sudo ufw --force enable
   ```

3. **Launch Redroid with Docker Compose**:
   ```bash
   docker compose -f docker-compose.vps.yml up -d
   ```

---

## 5. Connecting Railway to your VPS Runner

**CRITICAL SECURITY RULE:** Never expose port 5555 to the public internet (`0.0.0.0/0`).

Choose one of two secure tunneling methods:

### Option A: WireGuard / Tailscale Mesh VPN (Recommended)
1. Install Tailscale on your VPS runner and in your Railway container setup.
2. Use the private Tailscale IP (e.g., `100.x.y.z`) as `DEFAULT_ANDROID_HOST` in Railway.

### Option B: SSH Reverse Tunnel
From your VPS runner:
```bash
ssh -N -R 5555:127.0.0.1:5555 user@railway-gateway-endpoint
```

---

## 6. Dashboard Capabilities

- **Interactive Canvas & Touch Mapper**: Maps browser clicks and drags to `adb shell input tap` and `adb shell input swipe` coordinates.
- **Hardware Controls**: Power button (sleep/wake), Volume Up/Down, Back (Key 4), Home (Key 3), and Recents/App Switcher (Key 187).
- **APK Installer**: Validates ZIP magic signatures (`50 4B 03 04`), inspects `AndroidManifest.xml`, enforces size limits (150MB), and installs via `pm install -r`.
- **AFK 24/7 Stability Inspector**: Evaluates process lifecycle, background wake-locks, and provides one-click whitelist commands (`dumpsys deviceidle whitelist +[pkg]`).
- **Interactive Terminal & Logcat**: Live Android system log stream with log level filtering (Info, Warning, Error) and command shortcuts.

---

## 7. APK Compatibility & Anti-Cheat Notice

- **Architecture:** Redroid uses the host architecture (typically `x86_64`). Applications containing only ARM native libraries (`lib/arm64-v8a`) require an ARM64 VPS (such as Oracle Ampere A1) or an active binary translation layer (`libndk_translation`).
- **Google Play Services (GMS):** Pure AOSP Redroid does not include proprietary Google Mobile Services. Use F-Droid, Aurora Store, or microG.
- **Kernel Anti-Cheat:** Games utilizing kernel-level anti-cheat (e.g., HoYoverse, Tencent ACE) detect containerized environments and will block execution.

---

## 8. License

Licensed under the [Apache License, Version 2.0](LICENSE).
